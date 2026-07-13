import type { HomeMetric } from "@/features/home/types";
import { formatPercent, formatTrend } from "@/features/home/utils";

export default function HomeMetricCards({ metrics }: { metrics: HomeMetric[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => {
        const isPositive = (item.trend ?? 0) >= 0;

        return (
          <article
            key={item.label}
            className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="grid size-11 place-items-center rounded-xl bg-[#f2f4f7] text-[#344054]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                  <path
                    d="M4 17.5 9.25 12l3.5 3.5L20 7.5M20 7.5h-5.5M20 7.5V13"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  item.trend === null
                    ? "bg-[#f2f4f7] text-[#667085]"
                    : isPositive
                      ? "bg-[#ecfdf3] text-[#039855]"
                      : "bg-[#fef3f2] text-[#d92d20]"
                }`}
              >
                {item.trend === null
                  ? "No prior data"
                  : `${isPositive ? "↑" : "↓"} ${formatTrend(item.trend)}`}
              </span>
            </div>
            <p className="mt-5 text-sm font-medium text-[#667085]">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-[#101828]">
              {formatPercent(item.value)}
            </p>
            <p className="mt-1 text-sm text-[#667085]">Average this month</p>
          </article>
        );
      })}
    </section>
  );
}
