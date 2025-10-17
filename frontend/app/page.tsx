"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "@/components/AuthPanel";
import { BudgetOverview } from "@/components/BudgetOverview";
import { ItineraryForm } from "@/components/ItineraryForm";
import { ItineraryPreview } from "@/components/ItineraryPreview";
import { MapPlaceholder } from "@/components/MapPlaceholder";
import { SavedPlans } from "@/components/SavedPlans";
import { deleteJSON, getJSON, postJSON } from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ItineraryPlan, StoredPlan, TravelPreferences } from "@/lib/types";

export default function HomePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [plan, setPlan] = useState<ItineraryPlan | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | undefined>();
  const [activeFocus, setActiveFocus] = useState<{ name: string; address?: string; time?: string } | null>(null);
  const [lastPreferences, setLastPreferences] = useState<TravelPreferences | null>(null);
  const [presetPreferences, setPresetPreferences] = useState<TravelPreferences | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<StoredPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const fetchPlans = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setPlansLoading(true);
    setPlansError(null);

    try {
      const data = await getJSON<StoredPlan[]>("/api/plans", { token: accessToken });
      setSavedPlans(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载云端行程失败";
      setPlansError(message);
    } finally {
      setPlansLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setSavedPlans([]);
      return;
    }

    void fetchPlans();
  }, [accessToken, fetchPlans]);

  const handleSubmit = async (preferences: TravelPreferences) => {
    setLoading(true);
    setError(null);
    setDestination(preferences.destination);
    setLastPreferences(preferences);
    setPresetPreferences(null);
    setActiveFocus(null);

    try {
      const generatedPlan = await postJSON<ItineraryPlan>("/api/itinerary", {
        preferences
      });
      setPlan(generatedPlan);
      setPlansError(null);
    } catch (err) {
      console.warn("行程生成失败，使用示例数据", err);
      setPlan(createMockPlan(preferences));
      setError("行程生成失败，已展示示例行程。");
    } finally {
      setLoading(false);
    }
  };

  const handleDestinationPreview = (value: string) => {
    setDestination(value || undefined);
    setActiveFocus(null);
  };

  const handleSavePlan = useCallback(async () => {
    if (!accessToken) {
      setPlansError("请先登录后再保存行程。");
      return;
    }

    if (!plan || !lastPreferences) {
      setPlansError("请先生成行程，再尝试保存。");
      return;
    }

    setSavingPlan(true);
    setPlansError(null);

    try {
      const saved = await postJSON<StoredPlan>(
        "/api/plans",
        { plan, preferences: lastPreferences },
        { token: accessToken }
      );

      setSavedPlans(prev => {
        const filtered = prev.filter(item => item.id !== saved.id);
        return [saved, ...filtered];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存失败";
      setPlansError(message);
    } finally {
      setSavingPlan(false);
    }
  }, [accessToken, plan, lastPreferences]);

  const handleSelectPlan = useCallback((stored: StoredPlan) => {
    setPlan(stored.plan);
    setLastPreferences(stored.preferences);
    setPresetPreferences(stored.preferences);
    setDestination(stored.preferences.destination);
    setError(null);
    setActiveFocus(null);
  }, []);

  const handleDeletePlan = useCallback(
    async (planId: string) => {
      if (!accessToken) {
        setPlansError("请先登录后再删除行程。");
        return;
      }

      try {
        await deleteJSON(`/api/plans/${planId}`, { token: accessToken });
        setSavedPlans(prev => prev.filter(item => item.id !== planId));
        setActiveFocus(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "删除失败";
        setPlansError(message);
        throw err;
      }
    },
    [accessToken]
  );

  const handleRefreshPlans = useCallback(async () => {
    if (!accessToken) {
      setPlansError("请先登录后再刷新云端行程。");
      return;
    }

    await fetchPlans();
  }, [accessToken, fetchPlans]);

  const hasActivePlan = Boolean(plan && lastPreferences);

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
          <AuthPanel supabase={supabase} session={session} />
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">旅行需求</h2>
            <p className="mb-4 text-sm text-slate-500">
              填写目的地、日期、预算、兴趣偏好，或直接使用语音描述。
            </p>
            <ItineraryForm
              onSubmit={handleSubmit}
              loading={loading}
              onDestinationBlur={handleDestinationPreview}
              initialPreferences={presetPreferences}
            />
            {error && <p className="mt-4 text-sm text-amber-600">{error}</p>}
          </div>
          <SavedPlans
            plans={savedPlans}
            loading={plansLoading}
            saving={savingPlan}
            canSave={Boolean(accessToken)}
            isAuthenticated={Boolean(accessToken)}
            error={plansError}
            hasActivePlan={hasActivePlan}
            onSave={handleSavePlan}
            onRefresh={handleRefreshPlans}
            onSelect={handleSelectPlan}
            onDelete={handleDeletePlan}
          />
        </div>

        <div className="space-y-6">
          <MapPlaceholder destination={destination ?? plan?.overview} focus={activeFocus} />
          <ItineraryPreview
            plan={plan}
            onActivitySelect={activity => {
              setActiveFocus({
                name: activity.title,
                address: activity.location,
                time: activity.time
              });
            }}
          />
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

    const activities = [
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
    ];

    const estimatedCost = activities.reduce((sum, activity) => sum + (activity.budget ?? 0), 0);

    return {
      date: formattedDate,
      summary: `${preferences.destination} 第 ${index + 1} 天行程安排`,
      activities,
      estimatedCost: estimatedCost > 0 ? estimatedCost : undefined
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
