import type {
  AnalysisLineKey as LineKey,
  AnalysisOeeSeriesRow as SeriesRow,
  AnalysisShiftSeriesRow as ShiftSeriesRow,
} from "@/features/analysis/types";

export function normalizePercent(value: number) {
  return Math.abs(value) <= 1 ? value * 100 : value;
}

export function formatNumber(value: number, maxDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDigits,
  }).format(value);
}

export function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${formatNumber(normalizePercent(value))}%`;
}

export function formatDayLabel(date: string) {
  return String(Number(date.slice(8, 10)));
}
// ini buat ngubah perbesar atau perkecil ukuran chart 
export function getChartMinWidth(rowCount: number) {
  return `max(100%, ${rowCount * 23}px)`;
}

export function formatUnit(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMonthLabel(series: SeriesRow[]) {
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

export function metricTone(value: number | null) {
  if (value === null) {
    return "text-[#98a2b3]";
  }

  return normalizePercent(value) >= 90 ? "text-[#027a48]" : "text-[#b42318]";
}

export function meetsOeeTarget(value: number | null) {
  return value !== null && normalizePercent(value) >= 90;
}

export function getShiftChartRows(series: ShiftSeriesRow[], key: LineKey) {
  return series.filter((row) => row[`${key}R`] !== null || row[`${key}W`] !== null);
}

export function buildShiftPath(
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
