import type { ItineraryPlan, TravelPreferences } from "../types/travel";

export function createMockItinerary(preferences: TravelPreferences): ItineraryPlan {
  const days = preferences.days || 5;
  const start = preferences.startDate ? new Date(preferences.startDate) : new Date();

  const itineraryDays = Array.from({ length: days }).map((_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const formattedDate = date.toISOString().split("T")[0];

    return {
      date: formattedDate,
      summary: `${preferences.destination} 第 ${index + 1} 天行程重点`,
      activities: [
        {
          time: "上午",
          title: "城市漫游",
          description: `探索 ${preferences.destination} 的代表性景点，体验当地文化。`
        },
        {
          time: "下午",
          title: "特色体验",
          description: `${preferences.interests[0] ?? "特色活动"} 主题推荐，含预约提示。`
        },
        {
          time: "晚上",
          title: "餐饮推荐",
          description: "预订热门餐厅，附人均消费与排队建议。",
          budget: Math.round(preferences.budget / Math.max(days, 1))
        }
      ]
    };
  });

  return {
    title: `${preferences.destination} ${days} 日行程草案`,
    overview:
      preferences.notes ?? "当前为占位行程，后续将由大模型生成定制内容。",
    days: itineraryDays,
    expenses: [
      { name: "交通", planned: preferences.budget * 0.25, actual: preferences.budget * 0.22 },
      { name: "住宿", planned: preferences.budget * 0.35, actual: preferences.budget * 0.33 },
      { name: "餐饮", planned: preferences.budget * 0.2, actual: preferences.budget * 0.18 },
      { name: "活动", planned: preferences.budget * 0.2, actual: preferences.budget * 0.21 }
    ]
  };
}
