import type { HomeProductionDay } from "@/features/home/types";
import { formatDayLabel, formatNumber, getNiceMax } from "@/features/home/utils";

export default function MonthlyProductionTrend({
  productionDays,
}: {
  productionDays: HomeProductionDay[];
}) {
  const maxProduction = Math.max(1, ...productionDays.map((item) => item.actual));
  const productionMax = getNiceMax(maxProduction);
  const productionAxis = [
    productionMax,
    productionMax * 0.75,
    productionMax * 0.5,
    productionMax * 0.25,
    0,
  ];

  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#101828]">
            Monthly Production Trend
          </h2>
          <p className="mt-1 text-sm text-[#667085]">
            Actual production volume by day
          </p>
        </div>
        <button className="h-10 rounded-lg border border-[#e4e7ec] px-4 text-sm font-medium text-[#344054]">
          Export
        </button>
      </div>

      <div className="mt-7 grid h-72 grid-cols-[38px_1fr] gap-2 rounded-2xl bg-[#f9fafb] px-3 py-5">
        {productionDays.length ? (
          <>
            <div className="flex h-56 flex-col justify-between text-right text-[10px] font-medium text-[#667085]">
              {productionAxis.map((value, index) => (
                <span key={`${value}-${index}`}>{formatNumber(value)}</span>
              ))}
            </div>
            <div className="flex min-w-0 items-end gap-3 overflow-x-auto overflow-y-visible">
              {productionDays.map((item, index) => (
                <div key={item.date} className="flex min-w-8 flex-1 flex-col items-center gap-3">
                  <div className="flex h-56 w-full items-end">
                    <div
                      className="group relative w-full rounded-t-lg bg-[#465fff]"
                      style={{ height: `${Math.max((item.actual / productionMax) * 100, 3)}%` }}
                    >
                      <div
                        className={`pointer-events-none absolute top-[calc(100%-14rem+0.5rem)] z-20 hidden w-36 rounded-lg border border-[#e4e7ec] bg-white p-3 text-left text-xs shadow-lg group-hover:block ${
                          index === 0
                            ? "left-0"
                            : index === productionDays.length - 1
                              ? "right-0"
                              : "left-1/2 -translate-x-1/2"
                        }`}
                      >
                        <p className="font-semibold text-[#101828]">{item.date}</p>
                        <p className="mt-2 text-[#667085]">Plan: {formatNumber(item.plan)}</p>
                        <p className="mt-1 text-[#667085]">Actual: {formatNumber(item.actual)}</p>
                        <p className="mt-1 text-[#667085]">Balance: {formatNumber(item.balance)}</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#667085]">
                    {formatDayLabel(item.date)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="col-span-2 grid h-full w-full place-items-center text-sm font-medium text-[#98a2b3]">
            No production data this month
          </div>
        )}
      </div>
    </article>
  );
}
