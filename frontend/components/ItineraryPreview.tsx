import type { ItineraryPlan } from "@/lib/types";

interface ItineraryPreviewProps {
  plan?: ItineraryPlan;
  onActivitySelect?: (payload: {
    date: string;
    time?: string;
    title: string;
    location?: string;
  }) => void;
}

export function ItineraryPreview({ plan, onActivitySelect }: ItineraryPreviewProps) {
  if (!plan) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-slate-500">
        生成后的旅行行程将展示在这里，包含每日安排、交通与餐饮建议。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">{plan.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{plan.overview}</p>
      </div>

      {plan.days.map(day => (
        <div
          key={day.date}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-brand">{day.date}</h3>
          <p className="text-sm text-slate-600">{day.summary}</p>
          {typeof day.estimatedCost === "number" && (
            <p className="mt-1 text-xs text-slate-500">当日预计开销：¥{day.estimatedCost}</p>
          )}
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {day.activities.map(activity => (
              <li
                key={`${activity.time}-${activity.title}`}
                className={`rounded-md bg-slate-50 p-3 transition hover:border-brand hover:bg-brand/5 ${
                  onActivitySelect ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/60" : ""
                }`}
                role={onActivitySelect ? "button" : undefined}
                tabIndex={onActivitySelect ? 0 : undefined}
                onClick={() =>
                  onActivitySelect?.({
                    date: day.date,
                    time: activity.time,
                    title: activity.title,
                    location: activity.location
                  })
                }
                onKeyDown={event => {
                  if (!onActivitySelect) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onActivitySelect({
                      date: day.date,
                      time: activity.time,
                      title: activity.title,
                      location: activity.location
                    });
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{activity.title}</span>
                  <span className="text-xs text-slate-500">{activity.time}</span>
                </div>
                <p className="mt-1 text-slate-600">{activity.description}</p>
                {activity.location && (
                  <p className="text-xs text-slate-500">地点：{activity.location}</p>
                )}
                {typeof activity.budget === "number" && (
                  <p className="text-xs text-slate-500">预算：¥{activity.budget}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
