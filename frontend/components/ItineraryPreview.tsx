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

const ACCENT_CLASSES = ["from-brand/15", "from-amber-200/40", "from-emerald-200/30"];

export function ItineraryPreview({ plan, onActivitySelect }: ItineraryPreviewProps) {
  if (!plan) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
        生成后的旅行行程将展示在这里，包含每日安排、交通与餐饮建议。
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 border-b border-slate-100 bg-gradient-to-r from-brand/10 via-white to-white p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-brand">ITINERARY</p>
        <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{plan.title}</h2>
        <p className="text-sm text-slate-600">{plan.overview}</p>
      </div>
      <div className="max-h-[560px] space-y-4 overflow-y-auto p-6 pr-3">
        {plan.days.map((day, index) => {
          const activityKeyBase = `${day.date}-${index}`;
          const accentClass = ACCENT_CLASSES[index % ACCENT_CLASSES.length];

          return (
            <article
              key={day.date}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div
                className={`border-b border-slate-100 bg-gradient-to-r ${accentClass} to-transparent px-5 py-4`}
              >
                <span className="inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-brand">
                  Day {index + 1}
                </span>
                <div className="mt-3">
                  <h3 className="text-lg font-semibold text-slate-900">{day.summary}</h3>
                  <p className="text-xs text-slate-500">{day.date}</p>
                </div>
              </div>
              <div className="space-y-3 p-5 text-sm text-slate-700">
                {typeof day.estimatedCost === "number" && (
                  <p className="text-xs text-slate-500">当日预计开销：¥{day.estimatedCost}</p>
                )}
                <ul className="space-y-3">
                  {day.activities.map(activity => {
                    const activityKey = `${activityKeyBase}-${activity.time}-${activity.title}`;
                    const clickable = Boolean(onActivitySelect);

                    return (
                      <li key={activityKey}>
                        <button
                          type="button"
                          className={`group w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand hover:bg-brand/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${
                            clickable ? "cursor-pointer" : "cursor-default"
                          }`}
                          onClick={() =>
                            onActivitySelect?.({
                              date: day.date,
                              time: activity.time,
                              title: activity.title,
                              location: activity.location
                            })
                          }
                          disabled={!clickable}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-base font-semibold text-slate-800">
                              {activity.title}
                            </span>
                            <span className="text-xs text-slate-500">{activity.time}</span>
                          </div>
                          <p className="mt-2 text-slate-600">{activity.description}</p>
                          {activity.location ? (
                            <p className="mt-2 text-xs text-slate-500">地点：{activity.location}</p>
                          ) : null}
                          {typeof activity.budget === "number" ? (
                            <p className="mt-1 text-xs text-slate-500">预算：¥{activity.budget}</p>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
