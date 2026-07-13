import type { ProductionTrend as Trend } from "@/features/production/types";

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatNumberAuto(value: number, maxDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDigits,
  }).format(value);
}

export function normalizePercent(value: number) {
  return Math.abs(value) <= 1 ? value * 100 : value;
}

export function formatPercent(value: number) {
  return `${formatNumberAuto(normalizePercent(value))}%`;
}

export function TrendBadge({ trend }: { trend: Trend }) {
  if (!trend) {
    return (
      <span className="text-xs font-medium text-[#98a2b3]">No monthly avg</span>
    );
  }

  const trendClass =
    trend.direction === "up"
      ? "bg-[#ecfdf3] text-[#027a48]"
      : trend.direction === "down"
        ? "bg-[#fef3f2] text-[#b42318]"
        : "bg-[#f2f4f7] text-[#344054]";
  const symbol =
    trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "■";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${trendClass}`}>
      {symbol} {formatNumberAuto(trend.value)}% vs monthly avg
    </span>
  );
}

export function KpiCard({
  label,
  value,
  caption,
  tone = "neutral",
  className = "",
  trend = null,
  showTrend = true,
}: {
  label: string;
  value: string;
  caption: string;
  tone?: "neutral" | "good" | "warn";
  className?: string;
  trend?: Trend;
  showTrend?: boolean;
}) {
  const toneClass =
    tone === "good"
      ? "bg-[#ecfdf3] text-[#027a48]"
      : tone === "warn"
        ? "bg-[#fef3f2] text-[#b42318]"
        : "bg-[#f2f4f7] text-[#344054]";

  return (
    <article
      className={`rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#101828]">{label}</p>
          <p className="mt-1 text-xs font-medium text-[#667085]">{caption}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
          {tone === "good" ? "OK" : tone === "warn" ? "Watch" : "Info"}
        </span>
      </div>
      <p
        className="mt-5 text-2xl font-semibold tracking-tight text-[#101828]"
      >
        {value}
      </p>
      {showTrend ? (
        <div className="mt-4">
          <TrendBadge trend={trend} />
        </div>
      ) : null}
    </article>
  );
}

export function OeeGauge({ value, trend }: { value: number; trend: Trend }) {
  const percent = Math.min(Math.max(normalizePercent(value), 0), 100);
  const tone = trend?.direction === "down" ? "warn" : "good";
  const color = tone === "good" ? "#12b76a" : "#f79009";

  return (
    <article className="flex min-h-[332px] flex-col justify-between rounded-2xl border border-[#e4e7ec] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#101828]">OEE</h2>
          <p className="mt-1 text-sm font-medium text-[#667085]">
            Overall equipment effectiveness
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            tone === "good"
              ? "bg-[#ecfdf3] text-[#027a48]"
              : "bg-[#fef3f2] text-[#b42318]"
          }`}
        >
          {tone === "good" ? "OK" : "Watch"}
        </span>
      </div>

      <div className="grid flex-1 place-items-center py-6">
        <div
          className="grid size-48 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${percent * 3.6}deg, #f2f4f7 0deg)`,
          }}
        >
          <div className="grid size-36 place-items-center rounded-full bg-white text-center shadow-sm">
            <div>
              <p className="text-4xl font-semibold tracking-tight text-[#101828]">
                {formatPercent(value)}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase text-[#667085]">
                Average
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#f9fafb] p-3 text-center">
        <div>
          <p className="text-xs font-medium text-[#667085]">Month Avg</p>
          <p
            className={`mt-1 text-sm font-semibold ${
              trend?.direction === "up"
                ? "text-[#027a48]"
                : trend?.direction === "down"
                  ? "text-[#b42318]"
                  : "text-[#101828]"
            }`}
          >
            {trend
              ? `${trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "■"} ${formatNumberAuto(trend.value)}%`
              : "-"}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ProductionPlanCard({
  actual,
  plan,
  trend,
}: {
  actual: number;
  plan: number;
  trend: Trend;
}) {
  const progress = plan > 0 ? Math.min(Math.max((actual / plan) * 100, 0), 120) : 0;
  const isAchieved = plan > 0 && actual >= plan;

  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#101828]">Production</h2>
          <p className="mt-1 text-xs font-medium text-[#667085]">
            Actual vs plan units
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isAchieved ? "bg-[#ecfdf3] text-[#027a48]" : "bg-[#f2f4f7] text-[#344054]"
          }`}
        >
          {isAchieved ? "OK" : "Info"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#f9fafb] p-3">
          <p className="text-xs font-medium text-[#667085]">Actual</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[#101828]">
            {formatNumberAuto(actual)}
          </p>
        </div>
        <div className="rounded-xl bg-[#f9fafb] p-3">
          <p className="text-xs font-medium text-[#667085]">Plan</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[#101828]">
            {formatNumber(plan)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-[#eef2f6]">
          <div
            className={`h-full rounded-full ${
              isAchieved ? "bg-[#12b76a]" : "bg-[#465fff]"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[#667085]">
            {formatNumberAuto(progress)}% achieved
          </span>
          <TrendBadge trend={trend} />
        </div>
      </div>
    </article>
  );
}

export function BalanceCard({ balance }: { balance: number }) {
  const isBehind = balance < 0;
  const balanceLabel = isBehind ? "Behind plan" : "Ahead / on plan";
  const absBalance = Math.abs(balance);
  const helperText = isBehind
    ? "Needs recovery in the next production window."
    : "No recovery action needed for this selection.";

  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#101828]">Balance</h2>
          <p className="mt-1 text-xs font-medium text-[#667085]">
            Production gap to plan
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isBehind ? "bg-[#fef3f2] text-[#b42318]" : "bg-[#ecfdf3] text-[#027a48]"
          }`}
        >
          {isBehind ? "Watch" : "OK"}
        </span>
      </div>

      <div className="mt-5 rounded-xl bg-[#f9fafb] p-4">
        <p className="text-xs font-medium text-[#667085]">{balanceLabel}</p>
        <p
          className={`mt-1 text-3xl font-semibold tracking-tight ${
            isBehind ? "text-[#b42318]" : "text-[#027a48]"
          }`}
        >
          {isBehind ? "-" : "+"}
          {formatNumberAuto(absBalance)}
        </p>
        <p className="mt-1 text-xs font-medium text-[#667085]">units</p>
      </div>

      <div className="mt-4 rounded-xl border border-[#e4e7ec] px-3 py-3">
        <p className="text-xs font-medium text-[#667085]">Action status</p>
        <p className="mt-1 text-sm font-semibold text-[#101828]">{helperText}</p>
      </div>
    </article>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  includeAll = true,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  includeAll?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-[#344054]">
      {label}
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-[#d0d5dd] bg-white py-0 pl-3 pr-10 text-sm font-medium text-[#101828] outline-none transition focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff]"
        >
          {includeAll ? <option value="all">All</option> : null}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]"
        >
          <path
            d="m5 7.5 5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      </span>
    </label>
  );
}
