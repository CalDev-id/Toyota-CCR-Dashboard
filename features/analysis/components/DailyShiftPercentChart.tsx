import type { AnalysisLineKey as LineKey, AnalysisShiftSeriesRow as ShiftSeriesRow } from "@/features/analysis/types";
import { buildShiftPath, formatDayLabel, formatPercent, getChartMinWidth, getShiftChartRows, normalizePercent } from "@/features/analysis/components/analysisChartUtils";

export default function DailyShiftPercentChart({
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
  const chartMinWidth = getChartMinWidth(chartRows.length);

  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white px-4 pb-4 pt-4 shadow-sm">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-[#101828]">{title}</h2>
        <p className="mt-0.5 text-xs font-medium text-[#667085]">{line.label}</p>
      </div>

      <div className="h-[188px] overflow-x-auto overflow-y-hidden">
        <div className="min-w-0 px-4" style={{ minWidth: chartMinWidth }}>
          <div className="relative min-w-0">
            <svg
              viewBox={`0 -8 ${width} ${height + 16}`}
              className="h-[156px] w-full overflow-visible"
              role="img"
              aria-label={`${line.label} ${title} chart`}
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
  );
}
