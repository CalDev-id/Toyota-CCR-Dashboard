"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LineKey = "cylblock" | "cylhead" | "camshaft" | "crankshaft";

type OeeCard = {
  key: LineKey;
  line: string;
  r: number | null;
  w: number | null;
  ave: number | null;
  monthly: number | null;
  balance: number;
  balanceMonthly: number;
  otDay: number;
  otNight: number;
  cumR: number;
  cumW: number;
  gapCumR: number;
  gapCumW: number;
};

type SeriesRow = {
  date: string;
} & Record<LineKey, number | null>;

type ShiftSeriesRow = {
  date: string;
} & Record<`${LineKey}R` | `${LineKey}W`, number | null>;

type GapSeriesRow = {
  date: string;
} & Record<`${LineKey}R` | `${LineKey}W`, number | null>;

type AnalysisResponse = {
  date: string;
  start: string;
  end: string;
  cards: OeeCard[];
  series: SeriesRow[];
  shiftSeries: ShiftSeriesRow[];
  avShiftSeries: ShiftSeriesRow[];
  peShiftSeries: ShiftSeriesRow[];
  rqShiftSeries: ShiftSeriesRow[];
  gapSeries: GapSeriesRow[];
  lines: Array<{ key: LineKey; label: string }>;
};

const lineLabels: Record<LineKey, string> = {
  cylblock: "Cyl Block",
  cylhead: "Cyl Head",
  camshaft: "Camshaft",
  crankshaft: "Crankshaft",
};

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }

  return body;
}

function normalizePercent(value: number) {
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function formatNumber(value: number, maxDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDigits,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${formatNumber(normalizePercent(value))}%`;
}

function formatUnit(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonthLabel(series: SeriesRow[]) {
  const dateKey = series[Math.floor(series.length / 2)]?.date ?? series[0]?.date;

  if (!dateKey) {
    return "";
  }

  const [year, month] = dateKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function metricTone(value: number | null) {
  if (value === null) {
    return "text-[#98a2b3]";
  }

  return normalizePercent(value) >= 90 ? "text-[#027a48]" : "text-[#b42318]";
}

function meetsOeeTarget(value: number | null) {
  return value !== null && normalizePercent(value) >= 90;
}

function getShiftChartRows(series: ShiftSeriesRow[], key: LineKey) {
  return series.filter((row) => row[`${key}R`] !== null || row[`${key}W`] !== null);
}

function buildShiftPath(
  series: ShiftSeriesRow[],
  key: `${LineKey}R` | `${LineKey}W`,
  width: number,
  height: number,
) {
  const points = series
    .map((row, index) => {
      const value = row[key];

      if (value === null) {
        return null;
      }

      const x = series.length > 1 ? (index / (series.length - 1)) * width : 0;
      const y = height - (Math.min(Math.max(normalizePercent(value), 0), 100) / 100) * height;
      return `${x},${y}`;
    })
    .filter(Boolean);

  return points.length ? `M ${points.join(" L ")}` : "";
}

function DailyGapChart({ series, lineKey }: { series: GapSeriesRow[]; lineKey: LineKey }) {
  const chartRows = series.filter(
    (row) => row[`${lineKey}R`] !== null || row[`${lineKey}W`] !== null,
  );
  const maxValue =
    Math.max(
      1,
      ...chartRows.flatMap((row) => [
        Math.abs(row[`${lineKey}R`] ?? 0),
        Math.abs(row[`${lineKey}W`] ?? 0),
      ]),
    ) * 1.15;

  return (
    <div>
      <div className="relative mt-5 h-56">
        <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-[#98a2b3]" />
        <div className="flex h-full items-stretch gap-2">
          {chartRows.map((row) => {
            const rValue = row[`${lineKey}R`] ?? 0;
            const wValue = row[`${lineKey}W`] ?? 0;
            const bars = [
              { key: "r", value: rValue, color: "#f04438", width: "62%", zIndex: 1 },
              { key: "w", value: wValue, color: "#ffffff", width: "62%", zIndex: 2 },
            ];

            return (
              <div key={row.date} className="flex min-w-0 flex-1 flex-col">
                <div className="relative h-full">
                  {bars.map((bar) => {
                    const height = Math.min((Math.abs(bar.value) / maxValue) * 50, 50);
                    const isPositive = bar.value >= 0;

                    return (
                      <div
                        key={bar.key}
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                          backgroundColor: bar.color,
                          height: `${Math.max(height, bar.value === 0 ? 0 : 7)}%`,
                          top: isPositive ? `${50 - height}%` : "50%",
                          width: bar.width,
                          zIndex: bar.zIndex,
                        }}
                      >
                        {bar.value !== 0 ? (
                          <span
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-[#101828]"
                            style={{
                              top: isPositive ? "3px" : "auto",
                              bottom: isPositive ? "auto" : "3px",
                              WebkitTextStroke: "0.35px #101828",
                            }}
                          >
                            {formatNumber(bar.value, 1)}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[10px] font-medium text-[#667085]">
        {chartRows.map((row, index) => (
          <span
            key={row.date}
            className={index % Math.ceil(chartRows.length / 8 || 1) === 0 ? "" : "hidden"}
          >
            {row.date.slice(8, 10)}
          </span>
        ))}
      </div>
    </div>
  );
}

function OeeSummaryCard({ card }: { card: OeeCard }) {
  const isTargetMet = meetsOeeTarget(card.ave);

  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#101828]">{card.line}</h2>
          <p className="mt-1 text-xs font-medium text-[#667085]">OEE summary</p>
        </div>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            isTargetMet ? "bg-[#ecfdf3] text-[#039855]" : "bg-[#fef3f2] text-[#d92d20]"
          }`}
          aria-label={isTargetMet ? "Average OEE target met" : "Average OEE below target"}
          title={isTargetMet ? "Ave >= 90%" : "Ave < 90%"}
        >
          {isTargetMet ? (
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 10.5l3.2 3.2L15.5 6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l8 8M14 6l-8 8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.4"
              />
            </svg>
          )}
        </span>
      </div>

      <div className="mt-5 flex flex-nowrap items-stretch gap-2">
        {[
          ["R", card.r],
          ["W", card.w],
          ["Ave", card.ave],
          ["Monthly", card.monthly],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 flex-1 rounded-xl bg-[#f9fafb] p-2.5">
            <p className="text-xs font-medium text-[#667085]">{label}</p>
            <p className={`mt-1 whitespace-nowrap text-[clamp(0.7rem,0.9vw,0.875rem)] font-semibold ${metricTone(value as number | null)}`}>
              {formatPercent(value as number | null)}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function DailyShiftPercentChart({
  title,
  line,
  series,
  width,
  height,
  axisValues,
  monthLabel,
}: {
  title: string;
  line: { key: LineKey; label: string };
  series: ShiftSeriesRow[];
  width: number;
  height: number;
  axisValues: number[];
  monthLabel: string;
}) {
  const chartRows = getShiftChartRows(series, line.key);
  const targetY = height - 0.9 * height;

  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white px-4 pb-4 pt-4 shadow-sm">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-[#101828]">{title}</h2>
        <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
      </div>

      <div className="h-[188px]">
        <div className="min-w-0 px-1">
          <div className="relative min-w-0">
            <svg
              viewBox={`0 -8 ${width} ${height + 16}`}
              className="h-[156px] w-full overflow-visible"
              role="img"
              aria-label={`${line.label} ${title} chart`}
            >
              {axisValues.map((value) => {
                const y = height - (value / 100) * height;
                return (
                  <line
                    key={value}
                    x1="0"
                    x2={width}
                    y1={y}
                    y2={y}
                    stroke="#e4e7ec"
                    strokeWidth="1"
                  />
                );
              })}

              <line
                x1="0"
                x2={width}
                y1={targetY}
                y2={targetY}
                stroke="currentColor"
                strokeDasharray="18 12"
                strokeLinecap="round"
                strokeWidth="4"
                className="text-[#101828] dark:text-white"
                style={{ filter: "drop-shadow(0 0 2px rgba(255,255,255,0.85))" }}
              />

              <path
                d={buildShiftPath(chartRows, `${line.key}R`, width, height)}
                fill="none"
                stroke="#f04438"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />

              <path
                d={buildShiftPath(chartRows, `${line.key}W`, width, height)}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                className="stroke-[#344054] dark:stroke-white"
                style={{ filter: "drop-shadow(0 0 1px rgba(16,24,40,0.6))" }}
              />

              {(["R", "W"] as const).flatMap((shift) => chartRows.map((row, index) => {
                const value = row[`${line.key}${shift}`];

                if (value === null) {
                  return null;
                }

                const x = chartRows.length > 1 ? (index / (chartRows.length - 1)) * width : 0;
                const y = height - (Math.min(Math.max(normalizePercent(value), 0), 100) / 100) * height;
                const isOdd = index % 2 === 1;
                const textY = y + (shift === "R" ? (isOdd ? 21 : -12) : (isOdd ? 38 : -29));
                const color = shift === "R" ? "#f04438" : "#344054";

                return (
                  <g key={`${row.date}-${shift}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#ffffff"
                      stroke={color}
                      strokeWidth="2.5"
                    />
                    <text
                      x={x}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={shift === "R" ? "#b42318" : "#344054"}
                      fontSize="27"
                      fontWeight="700"
                      paintOrder="stroke"
                      stroke="#f9fafb"
                      strokeWidth="7"
                    >
                      {formatPercent(value)}
                    </text>
                  </g>
                );
              }))}
            </svg>

            <div className="flex justify-between text-[10px] font-medium text-[#667085]">
              {chartRows.map((row, index) => (
                <span
                  key={row.date}
                  className={index % Math.ceil(chartRows.length / 8 || 1) === 0 ? "" : "hidden"}
                >
                  {row.date.slice(8, 10)}
                </span>
              ))}
            </div>
            {monthLabel ? (
              <p className="mt-1 text-center text-[10px] font-semibold text-[#667085]">
                {monthLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function OeeLineChart({
  series,
  shiftSeries,
  avShiftSeries,
  peShiftSeries,
  rqShiftSeries,
  gapSeries,
  lines,
  cards,
}: {
  series: SeriesRow[];
  shiftSeries: ShiftSeriesRow[];
  avShiftSeries: ShiftSeriesRow[];
  peShiftSeries: ShiftSeriesRow[];
  rqShiftSeries: ShiftSeriesRow[];
  gapSeries: GapSeriesRow[];
  lines: Array<{ key: LineKey; label: string }>;
  cards: OeeCard[];
}) {
  const width = 960;
  const height = 260;
  const axisValues = [100, 75, 50, 25, 0];
  const monthLabel = formatMonthLabel(series);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        {lines.map((line) => {
          const card = cards.find((item) => item.key === line.key);
          const efficiencyRows = getShiftChartRows(shiftSeries, line.key);

          return (
            <div key={line.key} className="flex min-w-[280px] flex-1 flex-col gap-4">
              <article className="rounded-2xl border border-[#e4e7ec] bg-white px-4 pb-4 pt-4 shadow-sm">
                  <div className="mb-2">
                    <div>
                      <h2 className="text-sm font-semibold text-[#101828]">Daily Efficiency</h2>
                      <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
                    </div>
                  </div>

                  <div className="h-[188px]">
                    <div className="min-w-0 px-1">
                      <div className="relative min-w-0">
                        <svg
                          viewBox={`0 -8 ${width} ${height + 16}`}
                          className="h-[156px] w-full overflow-visible"
                          role="img"
                          aria-label={`${line.label} daily efficiency chart`}
                        >
                          {axisValues.map((value) => {
                            const y = height - (value / 100) * height;
                            return (
                              <line
                                key={value}
                                x1="0"
                                x2={width}
                                y1={y}
                                y2={y}
                                stroke="#e4e7ec"
                                strokeWidth="1"
                              />
                            );
                          })}

                          <line
                            x1="0"
                            x2={width}
                            y1={height - 0.9 * height}
                            y2={height - 0.9 * height}
                            stroke="currentColor"
                            strokeDasharray="18 12"
                            strokeLinecap="round"
                            strokeWidth="4"
                            className="text-[#101828] dark:text-white"
                            style={{ filter: "drop-shadow(0 0 2px rgba(255,255,255,0.85))" }}
                          />

                          <path
                            d={buildShiftPath(efficiencyRows, `${line.key}R`, width, height)}
                            fill="none"
                            stroke="#f04438"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                          />

                          <path
                            d={buildShiftPath(efficiencyRows, `${line.key}W`, width, height)}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            className="stroke-[#344054] dark:stroke-white"
                            style={{ filter: "drop-shadow(0 0 1px rgba(16,24,40,0.6))" }}
                          />

                          {(["R", "W"] as const).flatMap((shift) => efficiencyRows.map((row, index) => {
                            const value = row[`${line.key}${shift}`];

                            if (value === null) {
                              return null;
                            }

                            const x = efficiencyRows.length > 1 ? (index / (efficiencyRows.length - 1)) * width : 0;
                            const y = height - (Math.min(Math.max(normalizePercent(value), 0), 100) / 100) * height;
                            const isOdd = index % 2 === 1;
                            const textY = y + (shift === "R" ? (isOdd ? 21 : -12) : (isOdd ? 38 : -29));
                            const color = shift === "R" ? "#f04438" : "#344054";

                            return (
                              <g key={`${row.date}-${shift}`}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="#ffffff"
                                  stroke={color}
                                  strokeWidth="2.5"
                                />
                                <text
                                  x={x}
                                  y={textY}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill={shift === "R" ? "#b42318" : "#344054"}
                                  fontSize="27"
                                  fontWeight="700"
                                  paintOrder="stroke"
                                  stroke="#f9fafb"
                                  strokeWidth="7"
                                >
                                  {formatPercent(value)}
                                </text>
                              </g>
                            );
                          }))}
                        </svg>

                        <div className="flex justify-between text-[10px] font-medium text-[#667085]">
                          {efficiencyRows.map((row, index) => (
                            <span
                              key={row.date}
                              className={
                                index % Math.ceil(efficiencyRows.length / 8 || 1) === 0
                                  ? ""
                                  : "hidden"
                              }
                            >
                              {row.date.slice(8, 10)}
                            </span>
                          ))}
                        </div>
                        {monthLabel ? (
                          <p className="mt-1 text-center text-[10px] font-semibold text-[#667085]">
                            {monthLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

              </article>

              <article className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#101828]">
                  Production Achievement
                </h3>
                <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
                <div className="mt-3 flex gap-3">
                  {[
                    ["Balance(Unit)", card?.balance ?? 0],
                    ["Balance Monthly (Unit)", card?.balanceMonthly ?? 0],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0 flex-1 rounded-xl bg-[#f9fafb] p-3">
                      <p className="text-[10px] font-medium text-[#667085]">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-[#101828]">
                        {formatUnit(value as number)}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#101828]">Prod. Over Time</h3>
                <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
                <div className="mt-3 flex gap-2">
                  {[
                    ["OT Day", card?.otDay ?? 0],
                    ["OT Night", card?.otNight ?? 0],
                    ["Cum. R", card?.cumR ?? 0],
                    ["Cum. W", card?.cumW ?? 0],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0 flex-1 rounded-xl bg-[#f9fafb] p-2.5">
                      <p className="text-[10px] font-medium text-[#667085]">{label}</p>
                      <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[#101828]">
                        {formatUnit(value as number)}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#101828]">
                      Daily Gap OT Getsudo vs CCR
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
                  </div>
                  <div className="flex gap-4 text-right text-xs font-semibold">
                    <div>
                      <p className="text-[#f04438]">Cum. R</p>
                      <p className="mt-1 text-[#b42318]">{formatNumber(card?.gapCumR ?? 0, 1)}</p>
                    </div>
                    <div>
                      <p className="text-[#667085]">Cum. W</p>
                      <p className="mt-1 text-[#344054]">{formatNumber(card?.gapCumW ?? 0, 1)}</p>
                    </div>
                  </div>
                </div>
                <DailyGapChart series={gapSeries} lineKey={line.key} />
              </article>

              <article className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#101828]">Note</h3>
                <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
                <div className="mt-3 min-h-[96px] rounded-xl bg-[#f9fafb]" />
              </article>

              <DailyShiftPercentChart
                title="Data RQ"
                line={line}
                series={rqShiftSeries}
                width={width}
                height={height}
                axisValues={axisValues}
                monthLabel={monthLabel}
              />

              <div className="px-1 py-1">
                <h3 className="text-sm font-semibold text-[#101828]">Data Line Stop</h3>
              </div>

              <DailyShiftPercentChart
                title="Daily AV"
                line={line}
                series={avShiftSeries}
                width={width}
                height={height}
                axisValues={axisValues}
                monthLabel={monthLabel}
              />

              <DailyShiftPercentChart
                title="Daily PE"
                line={line}
                series={peShiftSeries}
                width={width}
                height={height}
                axisValues={axisValues}
                monthLabel={monthLabel}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const [date, setDate] = useState(todayKey);
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ date });
      const body = await readResponse(
        await fetch(`/api/analysis/oee?${params.toString()}`),
      );
      setData(body.data as AnalysisResponse);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load OEE analysis",
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const lines = useMemo(
    () =>
      data?.lines ??
      (Object.entries(lineLabels).map(([key, label]) => ({
        key: key as LineKey,
        label,
      })) satisfies Array<{ key: LineKey; label: string }>),
    [data?.lines],
  );

  function openDatePicker() {
    dateInputRef.current?.showPicker?.();
    dateInputRef.current?.focus();
  }

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-4 rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#101828]">Production Analysis</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Line comparison from the first day of the month to selected date
          </p>
        </div>
        <label
          className="grid cursor-pointer gap-1.5 text-sm font-medium text-[#344054] md:w-56"
          onClick={openDatePicker}
        >
          Tanggal
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 cursor-pointer rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium outline-none transition focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff]"
          />
        </label>
      </section>

      {error ? (
        <div className="mt-4 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 grid h-40 place-items-center rounded-2xl border border-[#e4e7ec] bg-white text-sm font-medium text-[#667085]">
          Loading OEE analysis...
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data?.cards.length ? (
              data.cards.map((card) => <OeeSummaryCard key={card.key} card={card} />)
            ) : (
              <div className="col-span-full grid h-40 place-items-center rounded-2xl border border-[#e4e7ec] bg-white text-sm font-medium text-[#98a2b3]">
                No data
              </div>
            )}
          </section>

          <section className="mt-6">
            <OeeLineChart
              series={data?.series ?? []}
              shiftSeries={data?.shiftSeries ?? []}
              avShiftSeries={data?.avShiftSeries ?? []}
              peShiftSeries={data?.peShiftSeries ?? []}
              rqShiftSeries={data?.rqShiftSeries ?? []}
              gapSeries={data?.gapSeries ?? []}
              lines={lines}
              cards={data?.cards ?? []}
            />
          </section>
        </>
      )}
    </DefaultLayout>
  );
}
