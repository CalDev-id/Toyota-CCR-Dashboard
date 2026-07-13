"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import { useCallback, useEffect, useMemo, useState } from "react";

type SummaryRow = {
  date: string;
  plant: string;
  shift: string;
  shift2: string;
  shop: string;
  variant: string;
  prodPlan: number;
  prodAct: number;
  otPlan: number;
  otAct: number;
  otDiff: number;
  balance: number;
  remarks: string;
  av: number;
  pe: number;
  rq: number;
  oee: number;
};

type FilterOptions = {
  shifts: string[];
  shift2s: string[];
  shops: string[];
};

type SummaryResponse = {
  rows: SummaryRow[];
  problemRows: ProblemRow[];
  filterOptions: FilterOptions;
};

type ProblemRow = {
  date: string;
  plant: string;
  shift: string;
  shift2: string;
  shop: string;
  ttMin: number;
  jam: string;
  problemAv: string;
  lsAvUnit: string;
  lsAvMin: number;
  problemPe: string;
  lsPeUnit: string;
  lsPeMin: number;
  problemRq: string;
  defectC: number;
  defectM: number;
  defectCMin: number;
  defectMMin: number;
  modifiedAt: string;
};

type Trend = {
  direction: "up" | "down" | "flat";
  value: number;
} | null;

const emptyOptions: FilterOptions = {
  shifts: [],
  shift2s: [],
  shops: [],
};

const lineOptions = [
  {
    label: "Cylinder Block",
    value: "Cylinder Block",
    aliases: ["cylinder block", "cyl block", "cylblock"],
  },
  {
    label: "Cylinder Head",
    value: "Cylinder Head",
    aliases: ["cylinder head", "cyl head", "cylhead"],
  },
  {
    label: "Camshaft",
    value: "Camshaft",
    aliases: ["camshaft", "cam shaft"],
  },
  {
    label: "Crankshaft",
    value: "Crankshaft",
    aliases: ["crankshaft", "crank shaft"],
  },
];

const defaultLine = lineOptions[0].value;

function getLineLabel(value: string) {
  return lineOptions.find((option) => option.value === value)?.label ?? value;
}

function normalizeLineName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveShopValue(line: string, shops: string[]) {
  const selectedLine = lineOptions.find((option) => option.value === line);

  if (!selectedLine) {
    return line;
  }

  const acceptedNames = [selectedLine.value, selectedLine.label, ...selectedLine.aliases].map(
    normalizeLineName,
  );
  const matchingShop = shops.find((shop) =>
    acceptedNames.includes(normalizeLineName(shop)),
  );

  return matchingShop ?? selectedLine.value;
}

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }

  return body;
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatNumberAuto(value: number, maxDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDigits,
  }).format(value);
}

function normalizePercent(value: number) {
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function formatPercent(value: number) {
  return `${formatNumberAuto(normalizePercent(value))}%`;
}

function makeTrend(current: number, previous: number): Trend {
  if (!Number.isFinite(previous) || previous === 0) {
    return null;
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;

  return {
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    value: Math.abs(change),
  };
}

function TrendBadge({ trend }: { trend: Trend }) {
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

function average(rows: SummaryRow[], key: "oee" | "av" | "pe" | "rq") {
  if (rows.length === 0) {
    return 0;
  }

  return rows.reduce((total, row) => total + row[key], 0) / rows.length;
}

function averageDailyTotal(rows: SummaryRow[], key: "prodAct" | "prodPlan" | "balance") {
  const grouped = new Map<string, number>();

  for (const row of rows) {
    grouped.set(row.date, (grouped.get(row.date) ?? 0) + row[key]);
  }

  const values = Array.from(grouped.values());

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function KpiCard({
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

function OeeGauge({ value, trend }: { value: number; trend: Trend }) {
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

function ProductionPlanCard({
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

function BalanceCard({ balance }: { balance: number }) {
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

function FilterSelect({
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

export default function ProductionPage() {
  const [date, setDate] = useState(currentDate);
  const [shift, setShift] = useState("all");
  const [shift2, setShift2] = useState("all");
  const [line, setLine] = useState(defaultLine);
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<SummaryRow[]>([]);
  const [problemRows, setProblemRows] = useState<ProblemRow[]>([]);
  const [filterOptions, setFilterOptions] = useState(emptyOptions);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const shop = useMemo(
    () => resolveShopValue(line, filterOptions.shops),
    [filterOptions.shops, line],
  );

  const url = useMemo(() => {
    const params = new URLSearchParams({
      line,
      date,
      month: date.slice(0, 7) || currentMonth(),
      shift,
      shift2,
      shop,
    });
    return `/api/cylblock/summary?${params.toString()}`;
  }, [date, line, shift, shift2, shop]);

  const monthlyUrl = useMemo(() => {
    const params = new URLSearchParams({
      line,
      month: date.slice(0, 7) || currentMonth(),
      shift,
      shift2,
      shop,
    });
    return `/api/cylblock/summary?${params.toString()}`;
  }, [date, line, shift, shift2, shop]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [body, monthlyBody] = await Promise.all([
        readResponse(await fetch(url)),
        fetch(monthlyUrl)
          .then(readResponse)
          .catch(() => ({ data: { rows: [] } })),
      ]);
      const data = body.data as SummaryResponse;
      const monthlyData = monthlyBody.data as Partial<SummaryResponse>;
      setRows(data.rows);
      setMonthlyRows(monthlyData.rows ?? []);
      setProblemRows(data.problemRows ?? []);
      setFilterOptions(data.filterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load production summary",
      );
      setRows([]);
      setMonthlyRows([]);
      setProblemRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [monthlyUrl, url]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const totals = useMemo(
    () => ({
      prodPlan: rows.reduce((total, row) => total + row.prodPlan, 0),
      prodAct: rows.reduce((total, row) => total + row.prodAct, 0),
      balance: rows.reduce((total, row) => total + row.balance, 0),
      oee: average(rows, "oee"),
      av: average(rows, "av"),
      pe: average(rows, "pe"),
      rq: average(rows, "rq"),
    }),
    [rows],
  );
  const monthlyAverages = useMemo(
    () => ({
      prodPlan: averageDailyTotal(monthlyRows, "prodPlan"),
      prodAct: averageDailyTotal(monthlyRows, "prodAct"),
      balance: averageDailyTotal(monthlyRows, "balance"),
      oee: average(monthlyRows, "oee"),
      av: average(monthlyRows, "av"),
      pe: average(monthlyRows, "pe"),
      rq: average(monthlyRows, "rq"),
    }),
    [monthlyRows],
  );
  const trends = useMemo(
    () => ({
      prodAct: makeTrend(totals.prodAct, monthlyAverages.prodAct),
      oee: makeTrend(normalizePercent(totals.oee), normalizePercent(monthlyAverages.oee)),
      av: makeTrend(normalizePercent(totals.av), normalizePercent(monthlyAverages.av)),
      pe: makeTrend(normalizePercent(totals.pe), normalizePercent(monthlyAverages.pe)),
      rq: makeTrend(normalizePercent(totals.rq), normalizePercent(monthlyAverages.rq)),
    }),
    [monthlyAverages, totals],
  );
  const lineLabel = getLineLabel(line);
  const problemTotals = useMemo(
    () => ({
      avMinutes: problemRows.reduce((total, row) => total + row.lsAvMin, 0),
      peMinutes: problemRows.reduce((total, row) => total + row.lsPeMin, 0),
      rqMinutes: problemRows.reduce(
        (total, row) => total + row.defectCMin + row.defectMMin,
        0,
      ),
      defectUnits: problemRows.reduce(
        (total, row) => total + row.defectC + row.defectM,
        0,
      ),
    }),
    [problemRows],
  );

  return (
    <DefaultLayout>
      <section className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1.5 text-sm font-medium text-[#344054]">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium outline-none transition focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff]"
            />
          </label>
          <FilterSelect
            label="Line"
            value={line}
            options={lineOptions.map((option) => option.value)}
            onChange={setLine}
            includeAll={false}
          />
          <FilterSelect
            label="Shift"
            value={shift}
            options={filterOptions.shifts}
            onChange={setShift}
          />
          <FilterSelect
            label="Day / Night"
            value={shift2}
            options={filterOptions.shift2s}
            onChange={setShift2}
          />
        </div>
      </section>

      {error ? (
        <div className="mt-4 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]">
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="AV"
              value={formatPercent(totals.av)}
              caption="Availability"
              trend={trends.av}
              tone={normalizePercent(totals.av) >= 85 ? "good" : "warn"}
            />
            <KpiCard
              label="PE"
              value={formatPercent(totals.pe)}
              caption="Performance"
              trend={trends.pe}
              tone={normalizePercent(totals.pe) >= 85 ? "good" : "warn"}
            />
            <KpiCard
              label="RQ"
              value={formatPercent(totals.rq)}
              caption="Quality"
              trend={trends.rq}
              tone={normalizePercent(totals.rq) >= 85 ? "good" : "warn"}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ProductionPlanCard
              actual={totals.prodAct}
              plan={totals.prodPlan}
              trend={trends.prodAct}
            />
            <BalanceCard balance={totals.balance} />
          </div>
        </div>
        <OeeGauge value={totals.oee} trend={trends.oee} />
      </section>

      {isLoading ? (
        <div className="mt-6 grid h-40 place-items-center rounded-2xl border border-[#e4e7ec] bg-white text-sm font-medium text-[#667085]">
          Loading daily production summary...
        </div>
      ) : (
        <>
          <section className="mt-6">
            <article className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
              <div className="border-b border-[#e4e7ec] px-5 py-4">
                <h2 className="text-lg font-semibold text-[#101828]">
                  Daily Production Rows
                </h2>
                <p className="mt-1 text-sm text-[#667085]">
                  {date} daily production summary for {lineLabel}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Plant</th>
                      <th className="px-5 py-3">Shift</th>
                      <th className="px-5 py-3">Line</th>
                      <th className="px-5 py-3">Variant</th>
                      <th className="px-5 py-3 text-right">Plan</th>
                      <th className="px-5 py-3 text-right">Actual</th>
                      <th className="px-5 py-3 text-right">Balance</th>
                      <th className="px-5 py-3 text-right">OEE</th>
                      <th className="px-5 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4e7ec]">
                    {rows.length ? (
                      rows.map((row, index) => (
                        <tr
                          key={`${row.date}-${row.shift}-${row.shop}-${index}`}
                          className="hover:bg-[#f9fafb]"
                        >
                          <td className="px-5 py-4 font-medium text-[#101828]">
                            {row.date}
                          </td>
                          <td className="px-5 py-4 text-[#667085]">
                            {row.plant || "-"}
                          </td>
                          <td className="px-5 py-4 text-[#667085]">
                            {row.shift || "-"}
                          </td>
                          <td className="px-5 py-4 text-[#667085]">
                            {row.shop || "-"}
                          </td>
                          <td className="px-5 py-4 text-[#667085]">
                            {row.variant || "-"}
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-[#101828]">
                            {formatNumber(row.prodPlan)}
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-[#101828]">
                            {formatNumberAuto(row.prodAct)}
                          </td>
                          <td
                            className={`px-5 py-4 text-right font-semibold ${
                              row.balance < 0 ? "text-[#b42318]" : "text-[#027a48]"
                            }`}
                          >
                            {formatNumberAuto(row.balance)}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-[#101828]">
                            {formatPercent(row.oee)}
                          </td>
                          <td
                            className="max-w-[220px] truncate px-5 py-4 text-[#667085]"
                            title={row.remarks}
                          >
                            {row.remarks || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-5 py-12 text-center text-sm font-medium text-[#98a2b3]"
                        >
                          No data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="mt-6">
            <article className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
              <div className="border-b border-[#e4e7ec] px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#101828]">
                      Detail Problem
                    </h2>
                    <p className="mt-1 text-sm text-[#667085]">
                      AV, PE, RQ, loss time, and defect details for {date}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div className="rounded-xl bg-[#f9fafb] px-3 py-2">
                      <p className="text-xs font-medium text-[#667085]">AV loss</p>
                      <p className="mt-1 font-semibold text-[#101828]">
                        {formatNumberAuto(problemTotals.avMinutes)} min
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f9fafb] px-3 py-2">
                      <p className="text-xs font-medium text-[#667085]">PE loss</p>
                      <p className="mt-1 font-semibold text-[#101828]">
                        {formatNumberAuto(problemTotals.peMinutes)} min
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f9fafb] px-3 py-2">
                      <p className="text-xs font-medium text-[#667085]">RQ loss</p>
                      <p className="mt-1 font-semibold text-[#101828]">
                        {formatNumberAuto(problemTotals.rqMinutes)} min
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f9fafb] px-3 py-2">
                      <p className="text-xs font-medium text-[#667085]">Defect</p>
                      <p className="mt-1 font-semibold text-[#101828]">
                        {formatNumberAuto(problemTotals.defectUnits)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
                    <tr>
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3">Shift</th>
                      <th className="px-5 py-3">Problem AV</th>
                      <th className="px-5 py-3 text-right">AV Min</th>
                      <th className="px-5 py-3">Problem PE</th>
                      <th className="px-5 py-3 text-right">PE Min</th>
                      <th className="px-5 py-3">Problem RQ</th>
                      <th className="px-5 py-3 text-right">Defect</th>
                      <th className="px-5 py-3 text-right">RQ Min</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4e7ec]">
                    {problemRows.length ? (
                      problemRows.map((row, index) => (
                        <tr
                          key={`${row.date}-${row.shift}-${row.jam}-${row.shop}-${index}`}
                          className="hover:bg-[#f9fafb]"
                        >
                          <td className="px-5 py-4 font-medium text-[#101828]">
                            {row.jam || "-"}
                          </td>
                          <td className="px-5 py-4 text-[#667085]">
                            {[row.shift, row.shift2].filter(Boolean).join(" / ") || "-"}
                          </td>
                          <td
                            className="max-w-[220px] truncate px-5 py-4 text-[#667085]"
                            title={row.problemAv}
                          >
                            {row.problemAv || "-"}
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-[#101828]">
                            {formatNumberAuto(row.lsAvMin)}
                          </td>
                          <td
                            className="max-w-[220px] truncate px-5 py-4 text-[#667085]"
                            title={row.problemPe}
                          >
                            {row.problemPe || "-"}
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-[#101828]">
                            {formatNumberAuto(row.lsPeMin)}
                          </td>
                          <td
                            className="max-w-[220px] truncate px-5 py-4 text-[#667085]"
                            title={row.problemRq}
                          >
                            {row.problemRq || "-"}
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-[#101828]">
                            {formatNumberAuto(row.defectC + row.defectM)}
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-[#101828]">
                            {formatNumberAuto(row.defectCMin + row.defectMMin)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-12 text-center text-sm font-medium text-[#98a2b3]"
                        >
                          No detail problem data for this day
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </>
      )}
    </DefaultLayout>
  );
}
