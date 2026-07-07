export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function formatTrend(value: number | null) {
  if (value === null) {
    return "-";
  }

  const sign = value >= 0 ? "+" : "";

  return `${sign}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function getStatusClass(status: string) {
  if (status === "Achieved") {
    return "bg-[#ecfdf3] text-[#039855]";
  }

  return "bg-[#fef3f2] text-[#d92d20]";
}

export function formatDayLabel(date: string) {
  return String(Number(date.slice(8, 10)));
}

export function getNiceMax(value: number) {
  if (value <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const rounded = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return rounded * magnitude;
}
