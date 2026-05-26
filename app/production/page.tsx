"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

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
  filterOptions: FilterOptions;
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

function previousMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
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
      <span className="text-xs font-medium text-[#98a2b3]">No last month data</span>
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
      {symbol} {formatNumberAuto(trend.value)}% vs last month
    </span>
  );
}

function average(rows: SummaryRow[], key: "oee" | "av" | "pe" | "rq") {
  if (rows.length === 0) {
    return 0;
  }

  return rows.reduce((total, row) => total + row[key], 0) / rows.length;
}

function groupByDate(rows: SummaryRow[]) {
  const grouped = new Map<
    string,
    {
      date: string;
      prodPlan: number;
      prodAct: number;
      oee: number;
      av: number;
      pe: number;
      rq: number;
      count: number;
    }
  >();

  for (const row of rows) {
    const item =
      grouped.get(row.date) ??
      {
        date: row.date,
        prodPlan: 0,
        prodAct: 0,
        oee: 0,
        av: 0,
        pe: 0,
        rq: 0,
        count: 0,
      };
    item.prodPlan += row.prodPlan;
    item.prodAct += row.prodAct;
    item.oee += row.oee;
    item.av += row.av;
    item.pe += row.pe;
    item.rq += row.rq;
    item.count += 1;
    grouped.set(row.date, item);
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    oee: item.count ? item.oee / item.count : 0,
    av: item.count ? item.av / item.count : 0,
    pe: item.count ? item.pe / item.count : 0,
    rq: item.count ? item.rq / item.count : 0,
  }));
}

function KpiCard({
  label,
  value,
  caption,
  tone = "neutral",
  className = "",
  trend = null,
}: {
  label: string;
  value: string;
  caption: string;
  tone?: "neutral" | "good" | "warn";
  className?: string;
  trend?: Trend;
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
      <div className="mt-4">
        <TrendBadge trend={trend} />
      </div>
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
          <p className="text-xs font-medium text-[#667085]">Last Mo.</p>
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

function MetricBars({ rows }: { rows: ReturnType<typeof groupByDate> }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    row: ReturnType<typeof groupByDate>[number];
    x: number;
    y: number;
  } | null>(null);
  const maxVolume = Math.max(
    ...rows.map((row) => Math.max(row.prodPlan, row.prodAct)),
    1,
  );
  const axisValues = [maxVolume, maxVolume * 0.75, maxVolume * 0.5, maxVolume * 0.25, 0].map(
    Math.round,
  );

  function showTooltip(
    row: ReturnType<typeof groupByDate>[number],
    event: MouseEvent<HTMLDivElement>,
  ) {
    const rect = chartRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setTooltip({
      row,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  return (
    <div className="mt-6">
      <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#101828]">Plan vs Actual</h2>
            <p className="mt-1 text-sm text-[#667085]">Daily production volume</p>
          </div>
          <div className="flex items-center gap-5 text-xs font-medium text-[#667085]">
            <span className="inline-flex items-center gap-2.5">
              <span className="h-2.5 w-7 rounded-full bg-[#465fff]" />
              Plan
            </span>
            <span className="inline-flex items-center gap-2.5">
              <span className="h-2.5 w-7 rounded-full bg-[#12b76a]" />
              Actual
            </span>
          </div>
        </div>
        <div
          ref={chartRef}
          className="relative mt-6 grid h-64 grid-cols-[56px_1fr] rounded-2xl bg-[#f9fafb] p-4"
          onMouseLeave={() => setTooltip(null)}
        >
          {tooltip ? (
            <div
              className="pointer-events-none absolute z-[999] w-max rounded-lg border border-[#e4e7ec] bg-white px-3 py-2 text-left text-xs font-medium text-[#344054] shadow-xl"
              style={{
                left: tooltip.x,
                top: tooltip.y - 12,
                transform: "translate(-50%, -100%)",
              }}
            >
              <p className="font-semibold text-[#101828]">{tooltip.row.date}</p>
              <p className="mt-1">Plan: {formatNumberAuto(tooltip.row.prodPlan)}</p>
              <p>Actual: {formatNumberAuto(tooltip.row.prodAct)}</p>
            </div>
          ) : null}
          <div className="flex h-full flex-col justify-between pr-3 text-right text-[10px] font-semibold text-[#98a2b3]">
            {axisValues.map((value, index) => (
              <span key={`${value}-${index}`}>{formatNumberAuto(value)}</span>
            ))}
          </div>
          {rows.length ? (
            <div className="flex min-w-0 items-end gap-3 overflow-x-auto overflow-y-visible pt-12">
              {rows.map((row) => (
                <div
                  key={row.date}
                  className="group flex min-w-14 flex-1 flex-col items-center gap-2"
                  onMouseMove={(event) => showTooltip(row, event)}
                >
                  <div className="relative flex h-48 w-full items-end justify-center gap-1.5">
                    <div
                      className="w-4 rounded-t bg-[#465fff]"
                      style={{
                        height: `${Math.max((row.prodPlan / maxVolume) * 100, 2)}%`,
                      }}
                    />
                    <div
                      className="w-4 rounded-t bg-[#12b76a]"
                      style={{
                        height: `${Math.max((row.prodAct / maxVolume) * 100, 2)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[#667085]">
                    {row.date.slice(8, 10)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid h-full w-full place-items-center text-sm font-medium text-[#98a2b3]">
              No data
              </div>
          )}
        </div>
      </article>
    </div>
  );
}

export default function ProductionPage() {
  const [month, setMonth] = useState(currentMonth);
  const [shift, setShift] = useState("all");
  const [shift2, setShift2] = useState("all");
  const [line, setLine] = useState(defaultLine);
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [previousRows, setPreviousRows] = useState<SummaryRow[]>([]);
  const [filterOptions, setFilterOptions] = useState(emptyOptions);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const shop = useMemo(
    () => resolveShopValue(line, filterOptions.shops),
    [filterOptions.shops, line],
  );

  const url = useMemo(() => {
    const params = new URLSearchParams({ month, shift, shift2, shop });
    return `/api/cylblock/summary?${params.toString()}`;
  }, [month, shift, shift2, shop]);

  const previousUrl = useMemo(() => {
    const params = new URLSearchParams({
      month: previousMonth(month),
      shift,
      shift2,
      shop,
    });
    return `/api/cylblock/summary?${params.toString()}`;
  }, [month, shift, shift2, shop]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [body, previousBody] = await Promise.all([
        readResponse(await fetch(url)),
        fetch(previousUrl)
          .then(readResponse)
          .catch(() => ({ data: { rows: [] } })),
      ]);
      const data = body.data as SummaryResponse;
      const previousData = previousBody.data as Partial<SummaryResponse>;
      setRows(data.rows);
      setPreviousRows(previousData.rows ?? []);
      setFilterOptions(data.filterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load production summary",
      );
      setRows([]);
      setPreviousRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [previousUrl, url]);

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
  const previousTotals = useMemo(
    () => ({
      prodPlan: previousRows.reduce((total, row) => total + row.prodPlan, 0),
      prodAct: previousRows.reduce((total, row) => total + row.prodAct, 0),
      balance: previousRows.reduce((total, row) => total + row.balance, 0),
      oee: average(previousRows, "oee"),
      av: average(previousRows, "av"),
      pe: average(previousRows, "pe"),
      rq: average(previousRows, "rq"),
    }),
    [previousRows],
  );
  const trends = useMemo(
    () => ({
      prodAct: makeTrend(totals.prodAct, previousTotals.prodAct),
      balance: makeTrend(totals.balance, previousTotals.balance),
      oee: makeTrend(normalizePercent(totals.oee), normalizePercent(previousTotals.oee)),
      av: makeTrend(normalizePercent(totals.av), normalizePercent(previousTotals.av)),
      pe: makeTrend(normalizePercent(totals.pe), normalizePercent(previousTotals.pe)),
      rq: makeTrend(normalizePercent(totals.rq), normalizePercent(previousTotals.rq)),
    }),
    [previousTotals, totals],
  );
  const dailyRows = useMemo(() => groupByDate(rows), [rows]);
  const lineLabel = getLineLabel(line);

  return (
    <DefaultLayout>
      {error ? (
        <div className="mb-4 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <KpiCard
            label="Production"
            value={`${formatNumberAuto(totals.prodAct)} / ${formatNumber(
              totals.prodPlan,
            )}`}
            caption="Actual vs plan units"
            className="xl:col-span-2"
            trend={trends.prodAct}
            tone={
              totals.prodAct >= totals.prodPlan && totals.prodPlan > 0
                ? "good"
                : "neutral"
            }
          />
          <KpiCard
            label="Balance"
            value={formatNumberAuto(totals.balance)}
            caption="Total plan balance"
            trend={trends.balance}
            tone={totals.balance < 0 ? "warn" : "good"}
          />
        </div>
        <OeeGauge value={totals.oee} trend={trends.oee} />
      </section>

      {isLoading ? (
        <div className="mt-6 grid h-40 place-items-center rounded-2xl border border-[#e4e7ec] bg-white text-sm font-medium text-[#667085]">
          Loading daily production summary...
        </div>
      ) : (
        <>
          <MetricBars rows={dailyRows} />

          <section className="mt-6 rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1.5 text-sm font-medium text-[#344054]">
                Month
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
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

          <section className="mt-6">
            <article className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
              <div className="border-b border-[#e4e7ec] px-5 py-4">
                <h2 className="text-lg font-semibold text-[#101828]">
                  Daily Production Rows
                </h2>
                <p className="mt-1 text-sm text-[#667085]">
                  Daily production summary for {lineLabel}
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
        </>
      )}
    </DefaultLayout>
  );
}
