import type { AnalysisLineKey as LineKey, AnalysisShiftSeriesRow as ShiftSeriesRow } from "@/features/analysis/types";
import PercentLineCanvasChart from "@/features/analysis/components/PercentLineCanvasChart";

export default function DailyShiftPercentChart({
  title,
  line,
  series,
  monthLabel,
}: {
  title: string;
  line: { key: LineKey; label: string };
  series: ShiftSeriesRow[];
  monthLabel: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white px-4 pb-4 pt-4 shadow-sm">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-[#101828]">{title}</h2>
        <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
      </div>

      <PercentLineCanvasChart
        line={line}
        series={series}
        monthLabel={monthLabel}
        ariaLabel={`${line.label} ${title} chart`}
      />
    </article>
  );
}
