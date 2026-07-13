import { useEffect, useRef, useState } from "react";
import type { AnalysisLineKey as LineKey, AnalysisShiftSeriesRow as ShiftSeriesRow } from "@/features/analysis/types";
import { formatDayLabel, formatPercent, getShiftChartRows, normalizePercent } from "@/features/analysis/components/analysisChartUtils";

const CHART_HEIGHT = 176;
const PLOT_TOP = 28;
const PLOT_BOTTOM = 44;
const POINT_GAP = 25;
const SIDE_PADDING = 20;
const TARGET_LINE_PADDING_X = 20;
const GRID_COLOR = "rgba(71, 89, 114, 0.42)";
const TARGET_COLOR = "#f8fafc";
const RED_LINE_COLOR = "#ff3b30";
const RED_LABEL_COLOR = "#ff3b30";
const WHITE_LINE_COLOR = "#eef4ff";
const WHITE_LABEL_COLOR = "#aab6c9";
const LABEL_OUTLINE_COLOR = "#101827";

type ChartPoint = {
  x: number;
  y: number;
  value: number;
  index: number;
  shift: "R" | "W";
};

function getContentWidth(rowCount: number) {
  return SIDE_PADDING * 2 + Math.max(rowCount - 1, 0) * POINT_GAP;
}

function getPointX(index: number) {
  return SIDE_PADDING + index * POINT_GAP;
}

function getPointY(value: number, plotHeight: number) {
  const percent = Math.min(Math.max(normalizePercent(value), 0), 100);
  return PLOT_TOP + plotHeight - (percent / 100) * plotHeight;
}

function drawRoundedLine(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();
}

export default function PercentLineCanvasChart({
  line,
  series,
  monthLabel,
  ariaLabel,
}: {
  line: { key: LineKey; label: string };
  series: ShiftSeriesRow[];
  monthLabel: string;
  ariaLabel: string;
}) {
  const rows = getShiftChartRows(series, line.key);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const canvasWidth = Math.max(viewportWidth, getContentWidth(rows.length));
  const rowDateKey = rows.map((row) => row.date).join("|");

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) {
      return;
    }

    const updateViewportWidth = () => {
      setViewportWidth(scroller.clientWidth);
    };

    updateViewportWidth();

    const observer = new ResizeObserver(updateViewportWidth);
    observer.observe(scroller);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) {
      scroller.scrollLeft = 0;
    }
  }, [rowDateKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * ratio;
    canvas.height = CHART_HEIGHT * ratio;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${CHART_HEIGHT}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, CHART_HEIGHT);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.font = "700 9.5px Arial, sans-serif";

    const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
    const axisValues = [100, 75, 50, 25, 0];

    axisValues.forEach((value) => {
      const y = PLOT_TOP + plotHeight - (value / 100) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const targetY = PLOT_TOP + plotHeight - 0.9 * plotHeight;
    ctx.beginPath();
    ctx.setLineDash([8, 5]);
    ctx.moveTo(TARGET_LINE_PADDING_X, targetY);
    ctx.lineTo(Math.max(TARGET_LINE_PADDING_X, canvasWidth - TARGET_LINE_PADDING_X), targetY);
    ctx.strokeStyle = TARGET_COLOR;
    ctx.lineWidth = 0.75;
    ctx.shadowColor = "rgba(255,255,255,0.85)";
    ctx.shadowBlur = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    const labelPoints: ChartPoint[] = [];

    (["R", "W"] as const).forEach((shift) => {
      const color = shift === "R" ? RED_LINE_COLOR : WHITE_LINE_COLOR;
      const points = rows
        .map((row, index) => {
          const value = row[`${line.key}${shift}`];
          return value === null
            ? null
            : { x: getPointX(index), y: getPointY(value, plotHeight), value, index, shift };
        })
        .filter((point): point is ChartPoint => point !== null);

      ctx.strokeStyle = color;
      ctx.lineWidth = 0.9;
      drawRoundedLine(ctx, points);
      labelPoints.push(...points);

      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = "#111827";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.85;
        ctx.stroke();
      });
    });

    labelPoints.forEach((point) => {
      const isOdd = point.index % 2 === 1;
      const textY = point.y + (point.shift === "R" ? (isOdd ? 8 : -5) : (isOdd ? 13 : -10));
      ctx.font = "700 9.5px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 2.25;
      ctx.strokeStyle = LABEL_OUTLINE_COLOR;
      ctx.strokeText(formatPercent(point.value), point.x, textY);
      ctx.fillStyle = point.shift === "R" ? RED_LABEL_COLOR : WHITE_LABEL_COLOR;
      ctx.fillText(formatPercent(point.value), point.x, textY);
    });

    rows.forEach((row, index) => {
      ctx.font = "500 11px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = WHITE_LABEL_COLOR;
      ctx.fillText(formatDayLabel(row.date), getPointX(index), CHART_HEIGHT - 14);
    });
  }, [canvasWidth, line.key, rows]);

  return (
    <>
      <div ref={scrollRef} className="h-[188px] overflow-x-auto overflow-y-hidden">
        <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
      </div>
      {monthLabel ? (
        <p className="mt-1 text-center text-[10px] font-semibold text-[#667085]">
          {monthLabel}
        </p>
      ) : null}
    </>
  );
}
