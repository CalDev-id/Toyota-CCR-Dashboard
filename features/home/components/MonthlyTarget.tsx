import type { HomeTarget } from "@/features/home/types";
import { formatNumber, formatPercent } from "@/features/home/utils";

export default function MonthlyTarget({ target }: { target: HomeTarget }) {
  const targetProgress = target.progress;
  const progressDisplay = formatPercent(targetProgress);

  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#101828]">Monthly Target</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Production target completed this month
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            (targetProgress ?? 0) >= 100
              ? "bg-[#ecfdf3] text-[#039855]"
              : "bg-[#fef3f2] text-[#d92d20]"
          }`}
        >
          {progressDisplay}
        </span>
      </div>

      <div
        className="mx-auto mt-8 grid size-52 place-items-center rounded-full p-[18px]"
        style={{
          background: `conic-gradient(#465fff ${Math.min(
            Math.max(targetProgress ?? 0, 0),
            100,
          )}%, #ecf3ff 0)`,
        }}
      >
        <div className="grid size-36 place-items-center rounded-full bg-white text-center">
          <div>
            <p className="text-3xl font-semibold text-[#101828]">{progressDisplay}</p>
            <p className="mt-1 text-xs font-medium text-[#667085]">Progress</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 divide-x divide-[#e4e7ec] rounded-2xl bg-[#f9fafb] p-4 text-center">
        {[
          ["Plan", formatNumber(target.plan)],
          ["Actual", formatNumber(target.actual)],
          ["Balance", formatNumber(target.balance)],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-medium text-[#667085]">{label}</p>
            <p className="mt-1 text-sm font-semibold text-[#101828]">{value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
