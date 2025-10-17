"use client";

import { useState } from "react";
import type { StoredPlan } from "@/lib/types";

interface SavedPlansProps {
  plans: StoredPlan[];
  loading: boolean;
  saving: boolean;
  canSave: boolean;
  isAuthenticated: boolean;
  error?: string | null;
  hasActivePlan: boolean;
  onSave: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSelect: (plan: StoredPlan) => void;
  onDelete: (planId: string) => Promise<void>;
}

export function SavedPlans({
  plans,
  loading,
  saving,
  canSave,
  isAuthenticated,
  error,
  hasActivePlan,
  onSave,
  onRefresh,
  onSelect,
  onDelete
}: SavedPlansProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">云端行程</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            disabled={loading || !isAuthenticated}
            onClick={async () => {
              await onRefresh();
            }}
          >
            刷新
          </button>
          <button
            type="button"
            className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand/90 disabled:bg-slate-300"
            disabled={!isAuthenticated || !canSave || saving || !hasActivePlan}
            onClick={async () => {
              await onSave();
            }}
          >
            {saving ? "保存中..." : "保存行程"}
          </button>
        </div>
      </div>
      {!isAuthenticated ? (
        <p className="mt-3 text-xs text-slate-500">登录后可将行程同步到云端，随时随地访问。</p>
      ) : plans.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">暂无保存的行程，生成后点击“保存行程”即可存档。</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {plans.map(plan => (
            <li key={plan.id} className="rounded-md border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-700">{plan.title}</p>
                  <p className="text-xs text-slate-400">{new Date(plan.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                    onClick={() => onSelect(plan)}
                  >
                    查看
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    disabled={deletingId === plan.id}
                    onClick={async () => {
                      setDeletingId(plan.id);
                      try {
                        await onDelete(plan.id);
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-3 text-xs text-amber-600">{error}</p>}
    </div>
  );
}
