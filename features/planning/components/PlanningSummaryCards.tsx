import type { PlanningPartSummary } from "@/features/planning/types";
import { partIcons } from "@/features/planning/planning-ui";

export default function PlanningSummaryCards({ parts }: { parts: PlanningPartSummary[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {parts.length === 0
        ? [
            { key: "cylblock" as const, label: "Cylblock" },
            { key: "cylhead" as const, label: "Cylhead" },
            { key: "camshaft" as const, label: "Camshaft" },
            { key: "crankshaft" as const, label: "Crankshaft" },
          ].map((part) => (
            <article
              key={part.key}
              className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-[#f2f4f7] text-sm font-semibold text-[#344054]">
                  {partIcons[part.key]}
                </div>
                <p className="text-sm font-semibold text-[#101828]">
                  {part.label}
                </p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#f9fafb] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                    1TR
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#101828]">-</p>
                </div>
                <div className="rounded-xl bg-[#f9fafb] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                    2TR
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#101828]">-</p>
                </div>
              </div>
            </article>
          ))
        : parts.map((part) => {
            const partTotal = part.oneTrTotal + part.twoTrTotal;
            const oneTrPercentage =
              partTotal > 0 ? Math.round((part.oneTrTotal / partTotal) * 100) : 0;
            const twoTrPercentage =
              partTotal > 0 ? Math.round((part.twoTrTotal / partTotal) * 100) : 0;
    
            return (
              <article
                key={part.key}
                className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f2f4f7] text-sm font-semibold text-[#344054]">
                    {partIcons[part.key]}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#101828]">
                      {part.label}
                    </p>
                    <p className="mt-0.5 text-xs text-[#667085]">
                      Monthly planning
                    </p>
                  </div>
                </div>
    
                <div className="mt-5 rounded-xl bg-[#f9fafb] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                    Total Plan
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-[#101828]">
                    {partTotal.toLocaleString()}
                  </p>
                </div>
    
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f9fafb] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                        1TR
                      </p>
                      <span className="text-xs font-semibold text-[#039855]">
                        {oneTrPercentage}%
                      </span>
                    </div>
                    <p className="mt-1 text-xl font-semibold text-[#101828]">
                      {part.oneTrTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f9fafb] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                        2TR
                      </p>
                      <span className="text-xs font-semibold text-[#465fff]">
                        {twoTrPercentage}%
                      </span>
                    </div>
                    <p className="mt-1 text-xl font-semibold text-[#101828]">
                      {part.twoTrTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
    </section>
  );
}
