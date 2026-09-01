import { useEffect, useRef, useState } from "react";
import type { AnalysisGapSeriesRow as GapSeriesRow, AnalysisLineKey as LineKey } from "@/features/analysis/types";
import { formatDayLabel, formatNumber, getChartMinWidth } from "@/features/analysis/components/analysisChartUtils";

export default function DailyGapChart({
  series,
  lineKey,
  singleShift = false,
}: {
  series: GapSeriesRow[];
  lineKey: LineKey;
  singleShift?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; shift: string; whPlan: number; whAct: number; otPlan: number; otAct: number } | null>(null);
  const chartRows = series.filter(
    (row) =>
      singleShift ? row[`${lineKey}R`] !== null : row[`${lineKey}R`] !== null || row[`${lineKey}W`] !== null,
  );
  const rowDateKey = chartRows.map((row) => row.date).join("|");
  const hasSparseRows = chartRows.length > 0 && chartRows.length <= 7;
  const scaleFloor = 4;
  const maxValue =
    Math.max(
      scaleFloor,
      ...chartRows.flatMap((row) => [
        Math.abs(row[`${lineKey}R`] ?? 0),
        Math.abs(row[`${lineKey}W`] ?? 0),
      ]),
    ) * 1.15;
  const chartMinWidth = getChartMinWidth(chartRows.length);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      scroller.scrollLeft = scroller.scrollWidth;
    });

    return () => cancelAnimationFrame(frame);
  }, [rowDateKey]);

  return (
    <div className="mt-3 flex flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="px-4 pb-2" style={{ minWidth: chartMinWidth }}>
          <div className="relative h-28">
            <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-[#98a2b3]" />
            <div
              className={`flex h-full items-stretch gap-2 ${
                hasSparseRows ? "justify-around" : ""
              }`}
            >
              {chartRows.map((row) => {
                const rValue = row[`${lineKey}R`] ?? 0;
                const wValue = row[`${lineKey}W`] ?? 0;
                const bars = singleShift
                  ? [{ key: "r", value: rValue, color: "#f04438", width: "62%", zIndex: 1 }]
                  : [
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
                        const displayedValue = formatNumber(bar.value, 1);
                        const isZero = displayedValue === "0" || displayedValue === "-0";
                        if (isZero) {
                          return null;
                        }

                        const height = Math.min((Math.abs(bar.value) / maxValue) * 50, 50);
                        const isPositive = bar.value >= 0;
                        const visibleHeight = Math.max(height, 5);
                        const detail = row.gapDetails[`${lineKey}${bar.key.toUpperCase()}` as `${LineKey}R` | `${LineKey}W`];

                        return (
                          <div
                            key={bar.key}
                            className={`absolute left-1/2 cursor-help -translate-x-1/2 ${
                              bar.key === "w" ? "ring-1 ring-inset ring-[#d0d5dd] dark:ring-0" : ""
                            }`}
                            onMouseEnter={(event) => {
                              if (detail) setTooltip({ x: event.clientX, y: event.clientY, date: row.date, shift: singleShift ? "N" : bar.key.toUpperCase(), ...detail });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                            style={{
                              backgroundColor: bar.color,
                              height: `${visibleHeight}%`,
                              top: isPositive ? `${50 - visibleHeight}%` : "50%",
                              width: bar.width,
                              zIndex: bar.zIndex,
                            }}
                          />
                        );
                      })}
                      {bars.map((bar) => {
                        const displayedValue = formatNumber(bar.value, 1);
                        if (displayedValue === "0" || displayedValue === "-0") {
                          return null;
                        }

                        const height = Math.min((Math.abs(bar.value) / maxValue) * 50, 50);
                        const isPositive = bar.value >= 0;
                        const edgeOffset = Math.max(height, 5);

                        return (
                          <span
                            key={`${bar.key}-label`}
                            className={`absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold ${
                              bar.key === "r"
                                ? "text-[#b42318] dark:text-[#ff6b61]"
                                : "text-[#344054] dark:text-[#d6e4ff]"
                            }`}
                            style={{
                              top: isPositive ? `${50 - edgeOffset}%` : `${50 + edgeOffset}%`,
                              transform: `translate(-50%, ${isPositive ? "-100%" : "0"})`,
                              WebkitTextStroke: "0.3px #ffffff",
                            }}
                          >
                            {displayedValue}
                          </span>
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
      {tooltip ? (
        <div role="tooltip" className="pointer-events-none fixed z-[100] min-w-36 rounded-lg bg-[#101828] px-3 py-2 text-xs text-white shadow-xl dark:bg-[#f8fafc] dark:text-[#101828]" style={{ left: tooltip.x, top: tooltip.y - 8, transform: "translate(-50%, -100%)" }}>
          <p className="font-semibold">{formatDayLabel(tooltip.date)} · Shift {tooltip.shift}</p>
          <p className="mt-1">WH Plan: <span className="font-semibold">{formatNumber(tooltip.whPlan, 1)} jam</span></p>
          <p>WH Act: <span className="font-semibold">{formatNumber(tooltip.whAct, 1)} jam</span></p>
          <p className="mt-1">OT Plan: <span className="font-semibold">{formatNumber(tooltip.otPlan, 1)} jam</span></p>
          <p>OT Act: <span className="font-semibold">{formatNumber(tooltip.otAct, 1)} jam</span></p>
        </div>
      ) : null}
    </div>
  );
}
