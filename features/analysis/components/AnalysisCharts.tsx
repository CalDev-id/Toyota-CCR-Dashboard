import type {
  AnalysisGapSeriesRow as GapSeriesRow,
  AnalysisLineKey as LineKey,
  AnalysisOeeCard as OeeCard,
  AnalysisOeeSeriesRow as SeriesRow,
  AnalysisShiftSeriesRow as ShiftSeriesRow,
} from "@/features/analysis/types";
import DailyGapChart from "@/features/analysis/components/DailyGapChart";
import DailyShiftPercentChart from "@/features/analysis/components/DailyShiftPercentChart";
import PercentLineCanvasChart from "@/features/analysis/components/PercentLineCanvasChart";
import { formatMonthLabel, formatNumber, formatUnit } from "@/features/analysis/components/analysisChartUtils";

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

function DailyEfficiencyChart({
  line,
  series,
  monthLabel,
}: {
  line: { key: LineKey; label: string };
  series: ShiftSeriesRow[];
  monthLabel: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white px-4 pb-4 pt-4 shadow-sm">
      <div className="mb-2">
        <div>
          <h2 className="text-sm font-semibold text-[#101828]">Daily Efficiency</h2>
          <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
        </div>
      </div>

      <PercentLineCanvasChart
        line={line}
        series={series}
        monthLabel={monthLabel}
        ariaLabel={`${line.label} daily efficiency chart`}
      />
    </article>
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
  const monthLabel = formatMonthLabel(series);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {lines.map((line) => {
          const card = cards.find((item) => item.key === line.key);
          return (
            <div key={line.key} className="flex min-w-0 flex-col gap-4">
              <DailyEfficiencyChart
                line={line}
                series={shiftSeries}
                monthLabel={monthLabel}
              />

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
                    { shiftLabel: "Day", problem: card?.note.day },
                    { shiftLabel: "Night", problem: card?.note.night },
                  ].map(({ shiftLabel, problem }) => (
                    <div key={shiftLabel} className="grid min-w-0 grid-cols-[48px_32px_minmax(0,1fr)] items-center gap-2">
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
                monthLabel={monthLabel}
              />

              <div className="px-1 py-1">
                <h3 className="text-sm font-semibold text-[#101828]">Data Line Stop</h3>
              </div>

              <DailyShiftPercentChart
                title="Daily AV"
                line={line}
                series={avShiftSeries}
                monthLabel={monthLabel}
              />

              <DailyShiftPercentChart
                title="Daily PE"
                line={line}
                series={peShiftSeries}
                monthLabel={monthLabel}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
