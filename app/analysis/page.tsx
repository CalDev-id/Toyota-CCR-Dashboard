"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import { useCallback, useEffect, useMemo, useState } from "react";

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

type GapSeriesRow = {
  date: string;
} & Record<`${LineKey}R` | `${LineKey}W`, number>;

type AnalysisResponse = {
  date: string;
  start: string;
  end: string;
  cards: OeeCard[];
  series: SeriesRow[];
  gapSeries: GapSeriesRow[];
  lines: Array<{ key: LineKey; label: string }>;
};

const lineColors: Record<LineKey, string> = {
  cylblock: "#465fff",
  cylhead: "#12b76a",
  camshaft: "#f79009",
  crankshaft: "#7a5af8",
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

  return normalizePercent(value) >= 85 ? "text-[#027a48]" : "text-[#b42318]";
}

function buildPath(series: SeriesRow[], key: LineKey, width: number, height: number) {
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

function getPointPosition(
  series: SeriesRow[],
  key: LineKey,
  index: number,
  width: number,
  height: number,
) {
  const value = series[index]?.[key];

  if (value === null || value === undefined) {
    return null;
  }

  return {
    x: series.length > 1 ? (index / (series.length - 1)) * width : 0,
    y: height - (Math.min(Math.max(normalizePercent(value), 0), 100) / 100) * height,
    value,
  };
}

function DailyGapChart({ series, lineKey }: { series: GapSeriesRow[]; lineKey: LineKey }) {
  const maxValue =
    Math.max(
      1,
      ...series.flatMap((row) => [
        Math.abs(row[`${lineKey}R`]),
        Math.abs(row[`${lineKey}W`]),
      ]),
    ) * 1.15;

  return (
    <div>
      <div className="relative mt-5 h-56">
        <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-[#98a2b3]" />
        <div className="flex h-full items-stretch gap-2">
          {series.map((row) => {
            const rValue = row[`${lineKey}R`];
            const wValue = row[`${lineKey}W`];
            const bars = [
              { key: "r", value: rValue, color: "#f04438", width: "72%", zIndex: 1 },
              { key: "w", value: wValue, color: "#ffffff", width: "52%", zIndex: 2 },
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
                        className="absolute left-1/2 -translate-x-1/2 rounded-sm border border-[#d0d5dd]"
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
        {series.map((row, index) => (
          <span
            key={row.date}
            className={index % Math.ceil(series.length / 8 || 1) === 0 ? "" : "hidden"}
          >
            {row.date.slice(8, 10)}
          </span>
        ))}
      </div>
    </div>
  );
}

function OeeSummaryCard({ card }: { card: OeeCard }) {
  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#101828]">{card.line}</h2>
          <p className="mt-1 text-xs font-medium text-[#667085]">OEE summary</p>
        </div>
        <span
          className="h-2.5 w-8 rounded-full"
          style={{ backgroundColor: lineColors[card.key] }}
        />
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

function OeeLineChart({
  series,
  gapSeries,
  lines,
  cards,
}: {
  series: SeriesRow[];
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

          return (
            <div key={line.key} className="flex min-w-[280px] flex-1 flex-col gap-4">
              <article className="rounded-2xl border border-[#e4e7ec] bg-white px-4 pb-6 pt-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-[#101828]">Daily Efficiency</h2>
                      <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
                    </div>
                    <span
                      className="h-2.5 w-8 rounded-full"
                      style={{ backgroundColor: lineColors[line.key] }}
                    />
                  </div>

                  <div className="h-[220px]">
                    <div className="min-w-0 px-1">
                      <div className="relative min-w-0">
                        <svg
                          viewBox={`0 -18 ${width} ${height + 36}`}
                          className="h-[184px] w-full overflow-visible"
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

                          <path
                            d={buildPath(series, line.key, width, height)}
                            fill="none"
                            stroke={lineColors[line.key]}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                          />

                          {series.map((row, index) => {
                            const point = getPointPosition(series, line.key, index, width, height);

                            if (!point) {
                              return null;
                            }

                            const isOdd = index % 2 === 1;
                            const textY = point.y + (isOdd ? 21 : -12);

                            return (
                              <g key={row.date}>
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r="4"
                                  fill="#ffffff"
                                  stroke={lineColors[line.key]}
                                  strokeWidth="2.5"
                                />
                                <text
                                  x={point.x}
                                  y={textY}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="#344054"
                                  fontSize="27"
                                  fontWeight="700"
                                  paintOrder="stroke"
                                  stroke="#f9fafb"
                                  strokeWidth="7"
                                >
                                  {formatPercent(point.value)}
                                </text>
                              </g>
                            );
                          })}
                        </svg>

                        <div className="mt-1 flex justify-between text-[10px] font-medium text-[#667085]">
                          {series.map((row, index) => (
                            <span
                              key={row.date}
                              className={
                                index % Math.ceil(series.length / 8 || 1) === 0
                                  ? ""
                                  : "hidden"
                              }
                            >
                              {row.date.slice(8, 10)}
                            </span>
                          ))}
                        </div>
                        {monthLabel ? (
                          <p className="mt-3 text-center text-[10px] font-semibold text-[#667085]">
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

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-4 rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#101828]">OEE Analysis</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Line comparison from the first day of the month to selected date
          </p>
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-[#344054] md:w-56">
          Tanggal
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium outline-none transition focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff]"
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
