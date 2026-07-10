import type {
  AnalysisGapSeriesRow as GapSeriesRow,
  AnalysisLineKey as LineKey,
  AnalysisOeeCard as OeeCard,
  AnalysisOeeSeriesRow as SeriesRow,
  AnalysisShiftSeriesRow as ShiftSeriesRow,
} from "@/features/analysis/types";
import DailyGapChart from "@/features/analysis/components/DailyGapChart";
import DailyShiftPercentChart from "@/features/analysis/components/DailyShiftPercentChart";
import { buildShiftPath, formatDayLabel, formatMonthLabel, formatNumber, formatPercent, formatUnit, getChartMinWidth, getShiftChartRows, normalizePercent } from "@/features/analysis/components/analysisChartUtils";

function ProblemBadge({ type }: { type: "AV" | "PE" }) {
  const className =
    type === "AV"
      ? "bg-[#fef3f2] text-[#b42318]"
      : "bg-[#fffaeb] text-[#b54708]";

  return (
    <span className={`grid h-5 min-w-6 place-items-center rounded px-1.5 text-[10px] font-bold ${className}`}>
      {type}
    </span>
  );
}

export function OeeLineChart({
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
          const efficiencyMinWidth = getChartMinWidth(efficiencyRows.length);

          return (
            <div key={line.key} className="flex min-w-[280px] flex-1 flex-col gap-4">
              <article className="rounded-2xl border border-[#e4e7ec] bg-white px-4 pb-4 pt-4 shadow-sm">
                  <div className="mb-2">
                    <div>
                      <h2 className="text-sm font-semibold text-[#101828]">Daily Efficiency</h2>
                      <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
                    </div>
                  </div>

                  <div className="h-[188px] overflow-x-auto overflow-y-hidden">
                    <div className="min-w-0 px-4" style={{ minWidth: efficiencyMinWidth }}>
                      <div className="relative min-w-0">
                        <svg
                          viewBox={`0 -8 ${width} ${height + 16}`}
                          className="h-[156px] w-full overflow-visible"
                          role="img"
                          aria-label={`${line.label} daily efficiency chart`}
                        >
                          {axisValues.map((value, index) => {
                            const y = height - (value / 100) * height;
                            return (
                              <line
                                key={`${value}-${index}`}
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
                            <span key={`${row.date}-${index}`} className="min-w-0 text-center">
                              {formatDayLabel(row.date)}
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
                        {formatNumber(value as number)}
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
                <div className="mt-3 grid min-h-[96px] gap-2 rounded-xl bg-[#f9fafb] p-3">
                  {[
                    ["Day", card?.note.day],
                    ["Night", card?.note.night],
                  ].map(([shiftLabel, problem]) => (
                    <div key={shiftLabel as string} className="grid min-w-0 grid-cols-[48px_32px_minmax(0,1fr)] items-center gap-2">
                      <p className="text-xs font-semibold text-[#344054]">
                        {shiftLabel}
                      </p>
                      {problem ? (
                        <>
                          <ProblemBadge type={problem.type} />
                          <p className="min-w-0 truncate text-xs font-medium text-[#344054]" title={problem.label}>
                            {problem.label}
                          </p>
                        </>
                      ) : (
                        <p className="col-span-2 text-xs font-medium text-[#98a2b3]">No problem data</p>
                      )}
                    </div>
                  ))}
                </div>
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
