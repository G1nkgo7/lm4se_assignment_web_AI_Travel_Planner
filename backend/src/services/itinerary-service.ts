import { z } from "zod";
import { config } from "../config";
import type { ChatMessage } from "./llm-client";
import { runChatCompletion } from "./llm-client";
import type { ItineraryActivity, ItineraryDay, ItineraryPlan, TravelPreferences } from "../types/travel";

const INTEREST_ACTIVITY_BANK: Record<
  string,
  Array<Pick<ItineraryActivity, "title" | "description" | "location">>
> = {
  美食: [
    {
      title: "地道早茶",
      description: "选择当地口碑茶楼，享用本地早餐并了解饮食文化。",
      location: "传统小吃街"
    },
    {
      title: "特色餐厅体验",
      description: "安排网红或米其林推荐餐厅，提前预约避免排队。",
      location: "城市热门餐饮区"
    }
  ],
  文化: [
    {
      title: "城市文化地标",
      description: "参观博物馆或文化展馆，了解目的地的发展故事。",
      location: "城市文化中心"
    },
    {
      title: "传统手作体验",
      description: "参加手工课堂或传统艺术体验，感受当地文化底蕴。",
      location: "艺术工坊"
    }
  ],
  亲子: [
    {
      title: "亲子互动乐园",
      description: "安排寓教于乐的互动场馆，兼顾孩子兴趣与安全。",
      location: "亲子乐园"
    },
    {
      title: "亲子美食课堂",
      description: "参与亲子烘焙或料理课程，共享互动时光。",
      location: "家庭体验馆"
    }
  ],
  自然: [
    {
      title: "郊野徒步",
      description: "前往自然风景区徒步或骑行，感受清新空气。",
      location: "郊野公园"
    },
    {
      title: "观景日落",
      description: "挑选视野开阔的山顶或海边观景点，记录日落瞬间。",
      location: "观景台"
    }
  ],
  历史: [
    {
      title: "古迹巡礼",
      description: "探索城市著名古迹，配合讲解了解历史事件。",
      location: "历史街区"
    },
    {
      title: "博物馆深度游",
      description: "预约专业导览，发掘文物背后的故事。",
      location: "重点博物馆"
    }
  ],
  冒险: [
    {
      title: "户外拓展",
      description: "组织高空丛林穿越或漂流，体验肾上腺素的刺激。",
      location: "户外拓展基地"
    },
    {
      title: "夜间探索",
      description: "参加夜行或城市夜骑活动，解锁与白天不同的城市。",
      location: "夜游路线"
    }
  ],
  艺术: [
    {
      title: "艺术展览巡礼",
      description: "挑选热门展览或艺术区，安排沉浸式观展体验。",
      location: "当代艺术馆"
    },
    {
      title: "创意工作坊",
      description: "参与陶艺、绘画或摄影课程，亲手创作旅行纪念品。",
      location: "艺术工作室"
    }
  ],
  购物: [
    {
      title: "精品商圈",
      description: "游览当地人推荐的购物街区，关注设计师品牌与手作。",
      location: "核心商圈"
    },
    {
      title: "特色市集",
      description: "逛夜市或创意市集，收集独特旅行小物。",
      location: "文创集市"
    }
  ],
  夜生活: [
    {
      title: "夜景观光",
      description: "乘坐夜游船或登高观景平台，欣赏城市灯火。",
      location: "夜景最佳观景点"
    },
    {
      title: "音乐酒吧",
      description: "挑选评价高的音乐酒吧或LIVEHOUSE，体验城市夜生活。",
      location: "音乐酒吧街"
    }
  ],
  休闲: [
    {
      title: "SPA & 放松",
      description: "安排按摩或温泉SPA，释放旅途疲惫。",
      location: "轻奢水疗中心"
    },
    {
      title: "咖啡慢时光",
      description: "挑一家精品咖啡馆，享受惬意午后时光。",
      location: "城市精品咖啡馆"
    }
  ]
};

const DEFAULT_ACTIVITIES: Array<Pick<ItineraryActivity, "time" | "title" | "description">> = [
  {
    time: "上午",
    title: "城市晨间漫步",
    description: "在目的地市中心散步，熟悉交通与周边环境。"
  },
  {
    time: "下午",
    title: "主题体验活动",
    description: "根据兴趣安排体验课程或景点深度游。"
  },
  {
    time: "晚上",
    title: "品味当地夜色",
    description: "安排夜景拍照或夜市美食之旅，放松结束一天行程。"
  }
];

function safeParseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function calculateTripDays(preferences: TravelPreferences): { start: Date; days: number } {
  const startDate = safeParseDate(preferences.startDate) ?? new Date();
  const endDate = safeParseDate(preferences.endDate);

  if (endDate) {
    const diff = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    return { start: startDate, days: diff + 1 };
  }

  const fallbackDays = Math.max(preferences.days, 1);
  return { start: startDate, days: fallbackDays };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function buildDailyActivities(
  preferences: TravelPreferences,
  dayIndex: number,
  totalDays: number
): ItineraryActivity[] {
  const interests = preferences.interests.length > 0 ? preferences.interests : ["文化"];
  const baseActivities = [...DEFAULT_ACTIVITIES];
  const perDayBudget = totalDays > 0 && preferences.budget > 0 ? preferences.budget / totalDays : 0;

  return baseActivities.map((activity, index) => {
    if (index === 0) {
      return {
        ...activity,
        description: `${preferences.destination} 城市晨间漫步，沿途可顺路勘察交通方式与早餐店推荐。`
      };
    }

    const interestKey = interests[(dayIndex + index) % interests.length];
    const library = INTEREST_ACTIVITY_BANK[interestKey];
    const recommendation = library?.[(dayIndex + index) % (library?.length ?? 1)];

    if (!recommendation) {
      return activity;
    }

    return {
      time: activity.time,
      title: `${recommendation.title}（${interestKey}）`,
      description: recommendation.description,
      location: recommendation.location,
      budget: perDayBudget > 0 ? Math.round(perDayBudget * 0.35) : undefined
    };
  });
}

function buildItineraryDays(preferences: TravelPreferences): ItineraryDay[] {
  const { start, days } = calculateTripDays(preferences);
  const result: ItineraryDay[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const activities = buildDailyActivities(preferences, i, days);
    const estimatedCost = activities.reduce((sum, activity) => sum + (activity.budget ?? 0), 0);

    result.push({
      date: formatDate(date),
      summary: `${preferences.destination} 第 ${i + 1} 天亮点`,
      activities,
      estimatedCost: estimatedCost > 0 ? Math.round(estimatedCost) : undefined
    });
  }

  return result;
}

function createBudgetBreakdown(preferences: TravelPreferences): ItineraryPlan["expenses"] {
  const baseBudget = preferences.budget || Math.max(800, preferences.travelers * 600);
  const ratios: Record<string, number> = {
    交通: 0.25,
    住宿: 0.35,
    餐饮: 0.2,
    活动: 0.2
  };

  const adjustments: Record<string, number> = {
    交通: 0.95,
    住宿: 1.02,
    餐饮: 0.9,
    活动: 1.05
  };

  return Object.entries(ratios).map(([name, ratio]) => {
    const planned = Math.round(baseBudget * ratio);
    const delta = adjustments[name] ?? 1;
    const actual = Math.round(planned * delta);
    return { name, planned, actual };
  });
}

function enrichDailyEstimates(plan: ItineraryPlan): ItineraryPlan {
  const days = plan.days.map(day => {
    const total = day.activities.reduce((sum, activity) => sum + (activity.budget ?? 0), 0);
    const normalized = typeof day.estimatedCost === "number" && !Number.isNaN(day.estimatedCost)
      ? Math.round(day.estimatedCost)
      : undefined;
    const fallback = total > 0 ? Math.round(total) : undefined;

    return {
      ...day,
      estimatedCost: normalized ?? fallback
    };
  });

  return { ...plan, days };
}

function buildDateSequence(start: Date, length: number): string[] {
  return Array.from({ length }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatDate(date);
  });
}

export const itineraryPlanSchema = z.object({
  title: z.string().min(1),
  overview: z.string().min(1),
  days: z
    .array(
      z.object({
        date: z.string().min(1),
        summary: z.string().min(1),
        activities: z
          .array(
            z.object({
              time: z.string().min(1),
              title: z.string().min(1),
              description: z.string().min(1),
              location: z.string().optional(),
              budget: z.coerce.number().min(0).optional()
            })
          )
          .min(1),
        estimatedCost: z.coerce.number().min(0).optional()
      })
    )
    .min(1),
  expenses: z
    .array(
      z.object({
        name: z.string().min(1),
        planned: z.coerce.number().min(0),
        actual: z.coerce.number().min(0)
      })
    )
    .min(1)
});

function shouldUseLLM(): boolean {
  return config.llm.provider !== "mock" && Boolean(config.llm.apiKey);
}

function stripMarkdownFence(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("```")) {
    const match = /```(?:json)?([\s\S]*?)```/i.exec(trimmed);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return trimmed;
}

function buildLLMMessages(preferences: TravelPreferences): ChatMessage[] {
  const { start, days } = calculateTripDays(preferences);
  const dateSequence = buildDateSequence(start, days);
  const totalBudget = preferences.budget > 0 ? preferences.budget : preferences.travelers * 600;

  const systemPrompt = [
    "You are an experienced Chinese travel consultant.",
    "Return thoughtful multi-day itineraries tailored to the traveller's goals.",
    "Only reply with valid JSON matching the specified schema; do not include markdown fences or commentary.",
    "Costs should be realistic for a Chinese traveller and can be approximations.",
    "For each day include an estimatedCost field that sums the key expenses for that day.",
    "Dates must use YYYY-MM-DD format from the provided sequence."
  ].join(" ");

  const userPayload = {
    preferences: {
      destination: preferences.destination,
      startDate: preferences.startDate ?? dateSequence[0],
      endDate: preferences.endDate ?? dateSequence[dateSequence.length - 1],
      days,
      travelers: preferences.travelers,
      budget: totalBudget,
      interests: preferences.interests,
      notes: preferences.notes ?? ""
    },
    dateSequence,
    requirements: {
      jsonSchema: {
        title: "string",
        overview: "string",
        days: [
          {
            date: "YYYY-MM-DD",
            summary: "string",
            activities: [
              {
                time: "string",
                title: "string",
                description: "string",
                location: "string?",
                budget: "number?"
              }
            ],
            estimatedCost: "number?"
          }
        ],
        expenses: [
          {
            name: "string",
            planned: "number",
            actual: "number"
          }
        ]
      },
      budgetGuidance: {
        totalBudget,
        categories: ["交通", "住宿", "餐饮", "活动"],
        currency: "CNY"
      },
      narrativeTone: "Use concise Chinese suitable for travellers; highlight unique experiences."
    }
  };

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `根据以下旅行偏好生成行程规划，请仅返回JSON：\n${JSON.stringify(userPayload)}`
    }
  ];
}

function generateFallbackItinerary(preferences: TravelPreferences): ItineraryPlan {
  const days = buildItineraryDays(preferences);
  const expenses = createBudgetBreakdown(preferences);

  const overviewParts = [
    `${preferences.destination} 行程重点围绕 ${preferences.interests.join("、") || "通用体验"} 展开，行程涵盖经典景点与个性化体验。`,
    "请根据实时交通、天气和门票情况微调每日安排。",
    preferences.notes ? `补充需求：${preferences.notes}` : ""
  ].filter(Boolean);

  return enrichDailyEstimates({
    title: `${preferences.destination} ${days.length} 日行程规划`,
    overview: overviewParts.join(" "),
    days,
    expenses
  });
}

export async function generateItinerary(preferences: TravelPreferences): Promise<ItineraryPlan> {
  if (!shouldUseLLM()) {
    return generateFallbackItinerary(preferences);
  }

  try {
    const messages = buildLLMMessages(preferences);
    const raw = await runChatCompletion(messages);
    const jsonString = stripMarkdownFence(raw);
    const parsed = JSON.parse(jsonString);
    const plan = itineraryPlanSchema.parse(parsed);
    return enrichDailyEstimates(plan);
  } catch (error) {
    console.error("LLM 行程生成失败，使用本地备选方案", error);
    return generateFallbackItinerary(preferences);
  }
}
