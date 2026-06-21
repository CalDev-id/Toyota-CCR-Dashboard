import DefaultLayout from "@/components/layouts/DefaultLayout";
import { getHomeDashboard } from "@/lib/home-server";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatTrend(value: number | null) {
  if (value === null) {
    return "-";
  }

  const sign = value >= 0 ? "+" : "";

  return `${sign}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function getStatusClass(status: string) {
  if (status === "Achieved") {
    return "bg-[#ecfdf3] text-[#039855]";
  }

  return "bg-[#fef3f2] text-[#d92d20]";
}

function formatDayLabel(date: string) {
  return String(Number(date.slice(8, 10)));
}

function getNiceMax(value: number) {
  if (value <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const rounded = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return rounded * magnitude;
}

export default async function Home() {
  const dashboard = await getHomeDashboard();
  const maxProduction = Math.max(
    1,
    ...dashboard.productionDays.map((item) => item.actual),
  );
  const productionMax = getNiceMax(maxProduction);
  const productionAxis = [productionMax, productionMax * 0.75, productionMax * 0.5, productionMax * 0.25, 0];
  const targetProgress = dashboard.target.progress;
  const progressDisplay = formatPercent(targetProgress);

  return (
    <DefaultLayout>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((item) => {
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

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
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
            {dashboard.productionDays.length ? (
              <>
                <div className="flex h-56 flex-col justify-between text-right text-[10px] font-medium text-[#667085]">
                  {productionAxis.map((value, index) => (
                    <span key={`${value}-${index}`}>{formatNumber(value)}</span>
                  ))}
                </div>
                <div className="flex min-w-0 items-end gap-3 overflow-x-auto overflow-y-visible">
                  {dashboard.productionDays.map((item, index) => (
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
                                : index === dashboard.productionDays.length - 1
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
              ["Plan", formatNumber(dashboard.target.plan)],
              ["Actual", formatNumber(dashboard.target.actual)],
              ["Balance", formatNumber(dashboard.target.balance)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium text-[#667085]">{label}</p>
                <p className="mt-1 text-sm font-semibold text-[#101828]">{value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#101828]">Line Performance</h2>
          <p className="mt-1 text-sm text-[#667085]">OEE average this month by line</p>

          <div className="mt-6 space-y-5">
            {dashboard.linePerformance.map((item) => {
              const progress = Math.min(Math.max(item.oee ?? 0, 0), 100);

              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#344054]">{item.label}</span>
                    <span className="font-semibold text-[#101828]">
                      {formatPercent(item.oee)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f2f4f7]">
                    <div
                      className={`h-full rounded-full ${
                        progress >= 90 ? "bg-[#12b76a]" : "bg-[#f04438]"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
          <div className="border-b border-[#e4e7ec] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#101828]">Plan vs Actual Gap</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Lines with the largest production shortfall this month
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[560px] text-left text-sm">
              <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="w-[24%] px-5 py-3">Line</th>
                  <th className="w-[19%] px-5 py-3 text-right">Plan</th>
                  <th className="w-[19%] px-5 py-3 text-right">Actual</th>
                  <th className="w-[19%] px-5 py-3 text-right">Gap</th>
                  <th className="w-[19%] px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {dashboard.lineGaps.map((item) => (
                  <tr key={item.line}>
                    <td className="px-5 py-4 font-medium text-[#101828]">{item.line}</td>
                    <td className="px-5 py-4 text-right text-[#667085]">{formatNumber(item.plan)}</td>
                    <td className="px-5 py-4 text-right text-[#667085]">{formatNumber(item.actual)}</td>
                    <td className="px-5 py-4 text-right font-medium text-[#101828]">{formatNumber(item.gap)}</td>
                    <td className="px-5 py-4 text-right">
                      <span className={`inline-flex justify-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </DefaultLayout>
  );
}
