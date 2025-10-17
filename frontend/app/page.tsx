"use client";

import { useState } from "react";
import { BudgetOverview } from "@/components/BudgetOverview";
import { ItineraryForm } from "@/components/ItineraryForm";
import { ItineraryPreview } from "@/components/ItineraryPreview";
import { MapPlaceholder } from "@/components/MapPlaceholder";
import { postJSON } from "@/lib/api-client";
import type { ItineraryPlan, TravelPreferences } from "@/lib/types";

export default function HomePage() {
  const [plan, setPlan] = useState<ItineraryPlan | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | undefined>();

  const handleSubmit = async (preferences: TravelPreferences) => {
    setLoading(true);
    setError(null);
    setDestination(preferences.destination);

    try {
      const generatedPlan = await postJSON<ItineraryPlan>('/api/itinerary', {
        preferences
      });
      setPlan(generatedPlan);
    } catch (err) {
      console.warn("行程生成接口暂未实现，使用示例数据", err);
      setPlan(createMockPlan(preferences));
      setError("行程生成接口暂未实现，已展示示例行程。");
    } finally {
      setLoading(false);
    }
  };

  const handleDestinationPreview = (value: string) => {
    setDestination(value || undefined);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-brand">AI Travel Planner</p>
        <h1 className="text-3xl font-bold text-slate-900">智能旅行规划师</h1>
        <p className="text-slate-600">
          通过语音与文本输入旅行需求，系统将生成个性化行程、预算分析与地图导航建议。
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">旅行需求</h2>
            <p className="mb-4 text-sm text-slate-500">
              填写目的地、日期、预算、兴趣偏好，或直接使用语音描述。
            </p>
            <ItineraryForm
              onSubmit={handleSubmit}
              loading={loading}
              onDestinationBlur={handleDestinationPreview}
            />
            {error && <p className="mt-4 text-sm text-amber-600">{error}</p>}
          </div>
        </div>

        <div className="space-y-6">
          <MapPlaceholder destination={destination ?? plan?.overview} />
          <ItineraryPreview plan={plan} />
          <BudgetOverview expenses={plan?.expenses} />
        </div>
      </section>
    </main>
  );
}

function createMockPlan(preferences: TravelPreferences): ItineraryPlan {
  const days = preferences.days || 5;
  const start = new Date(preferences.startDate || Date.now());

  const itineraryDays = Array.from({ length: days }).map((_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const formattedDate = date.toISOString().split("T")[0];

    return {
      date: formattedDate,
      summary: `${preferences.destination} 第 ${index + 1} 天行程安排`,
      activities: [
        {
          time: "上午",
          title: "文化探索",
          description: `${preferences.interests[0] || "当地特色"} 主题活动，包含导览解说。`
        },
        {
          time: "下午",
          title: "亲子互动",
          description: "适合全家参与的体验活动，可根据偏好替换。"
        },
        {
          time: "晚上",
          title: "美食推荐",
          description: "精选当地餐厅，提供预估人均消费。",
          budget: Math.round(
            preferences.budget / Math.max(days * Math.max(preferences.travelers, 1), 1)
          )
        }
      ]
    };
  });

  return {
    title: `${preferences.destination} ${days} 日行程示例`,
    overview:
      preferences.notes ||
      "可根据预算与偏好生成更精细的行程，实际结果待后端接入大模型后提供。",
    days: itineraryDays,
    expenses: [
      { name: "交通", planned: preferences.budget * 0.25, actual: preferences.budget * 0.2 },
      { name: "住宿", planned: preferences.budget * 0.35, actual: preferences.budget * 0.32 },
      { name: "餐饮", planned: preferences.budget * 0.2, actual: preferences.budget * 0.18 },
      { name: "游玩", planned: preferences.budget * 0.2, actual: preferences.budget * 0.22 }
    ]
  };
}
