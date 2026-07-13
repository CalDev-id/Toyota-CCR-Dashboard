import type { AnalysisGapSeriesRow as GapSeriesRow, AnalysisLineKey as LineKey } from "@/features/analysis/types";
import { formatDayLabel, formatNumber, getChartMinWidth } from "@/features/analysis/components/analysisChartUtils";

export default function DailyGapChart({ series, lineKey }: { series: GapSeriesRow[]; lineKey: LineKey }) {
  const chartRows = series.filter(
    (row) => row[`${lineKey}R`] !== null || row[`${lineKey}W`] !== null,
  );
  const hasSparseRows = chartRows.length > 0 && chartRows.length <= 7;
  const maxValue =
    Math.max(
      1,
      ...chartRows.flatMap((row) => [
        Math.abs(row[`${lineKey}R`] ?? 0),
        Math.abs(row[`${lineKey}W`] ?? 0),
      ]),
    ) * 1.15;
  const chartMinWidth = getChartMinWidth(chartRows.length);

  return (
    <div>
      <div className="overflow-x-auto overflow-y-hidden">
        <div className="px-4" style={{ minWidth: chartMinWidth }}>
          <div className="relative mt-5 h-56">
            <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-[#98a2b3]" />
            <div
              className={`flex h-full items-stretch gap-2 ${
                hasSparseRows ? "justify-around" : ""
              }`}
            >
              {chartRows.map((row) => {
                const rValue = row[`${lineKey}R`] ?? 0;
                const wValue = row[`${lineKey}W`] ?? 0;
                const bars = [
                  { key: "r", value: rValue, color: "#f04438", width: "62%", zIndex: 1 },
                  { key: "w", value: wValue, color: "#ffffff", width: "62%", zIndex: 2 },
                ];

                return (
                  <div
                    key={row.date}
                    className={`flex flex-col ${
                      hasSparseRows ? "w-6 flex-none sm:w-7" : "min-w-0 flex-1"
                    }`}
                  >
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

          <div
            className={`mt-2 flex gap-2 text-[10px] font-medium text-[#667085] ${
              hasSparseRows ? "justify-around" : "justify-between"
            }`}
          >
            {chartRows.map((row, index) => (
              <span
                key={`${row.date}-${index}`}
                className={`min-w-0 text-center ${hasSparseRows ? "w-6 flex-none sm:w-7" : ""}`}
              >
                {formatDayLabel(row.date)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
