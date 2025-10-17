import type { ExpenseCategory } from "@/lib/types";

interface BudgetOverviewProps {
  expenses?: ExpenseCategory[];
}

export function BudgetOverview({ expenses }: BudgetOverviewProps) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-slate-500">
        预算估算与实际花费对比将显示在这里，可按类别展示差异。
      </div>
    );
  }

  const totalPlanned = expenses.reduce((sum, item) => sum + item.planned, 0);
  const totalActual = expenses.reduce((sum, item) => sum + item.actual, 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800">费用概览</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-slate-500">预计总预算</p>
          <p className="text-2xl font-semibold text-brand">¥{totalPlanned}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">当前累计开销</p>
          <p className="text-2xl font-semibold text-amber-600">¥{totalActual}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-3 text-sm text-slate-700">
        {expenses.map(item => (
          <li key={item.name} className="flex items-center justify-between">
            <span className="font-medium">{item.name}</span>
            <span>
              ¥{item.actual} / ¥{item.planned}
              <span className="ml-2 text-xs text-slate-500">
                {(() => {
                  if (item.planned <= 0) {
                    return item.actual > 0 ? "超出预算" : "--";
                  }
                  const diffPercent = ((item.actual - item.planned) / item.planned) * 100;
                  return `${Math.round(diffPercent)}%`;
                })()}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
