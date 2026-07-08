import type {
  HomeDashboard,
  HomeLineConfig,
  HomeLineGap,
  HomeMetricKey,
  HomeTarget,
  RawHomeRow,
} from "@/features/home/types";
import { getReportPrisma } from "@/lib/report-prisma";

export const homeLineConfigs: HomeLineConfig[] = [
  { key: "cylblock", label: "Cyl Block", tableName: "v_cylblock_summary" },
  { key: "cylhead", label: "Cyl Head", tableName: "v_cylhead_summary" },
  { key: "camshaft", label: "Camshaft", tableName: "v_camshaft_summary" },
  { key: "crankshaft", label: "Crankshaft", tableName: "v_crankshaft_summary" },
];

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

export async function getHomeLineRows(
  line: HomeLineConfig,
  start: string,
  endExclusive: string,
) {
  return getReportPrisma().$queryRawUnsafe<RawHomeRow[]>(
    `SELECT
      \`DATE\` AS date,
      AV AS av,
      PE AS pe,
      RQ AS rq,
      OEE AS oee,
      Prod_plan AS prodPlan,
      Prod_act AS prodAct,
      Balance AS balance
     FROM ${quoteIdentifier(line.tableName)}
     WHERE \`DATE\` >= ? AND \`DATE\` < ?
     ORDER BY \`DATE\` ASC`,
    start,
    endExclusive,
  );
}

const metricLabels: Record<HomeMetricKey, string> = {
  av: "AV",
  pe: "PE",
  rq: "RQ",
  oee: "OEE",
};

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizePercent(value: number) {
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function toDateKey(value: unknown) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getCurrentRange() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const selectedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  const start = `${selectedDate.slice(0, 7)}-01`;
  const nextDate = new Date(year, month, date.getDate() + 1);
  const endExclusive = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(nextDate.getDate()).padStart(2, "0")}`;

  return { start, endExclusive };
}

function getPreviousMonthRange() {
  const date = new Date();
  const startDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const endDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
  const endExclusive = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;

  return { start, endExclusive };
}

function metricAverage(rows: RawHomeRow[], key: HomeMetricKey) {
  return average(rows.map((row) => normalizePercent(toNumber(row[key]))));
}

function buildMetrics(currentRows: RawHomeRow[], previousRows: RawHomeRow[] = []) {
  return (Object.keys(metricLabels) as HomeMetricKey[]).map((key) => {
    const value = metricAverage(currentRows, key);
    const previousValue = metricAverage(previousRows, key);

    return {
      key,
      label: metricLabels[key],
      value,
      trend: value !== null && previousValue !== null ? value - previousValue : null,
    };
  });
}

function buildProductionDays(rows: RawHomeRow[]) {
  const grouped = new Map<string, { plan: number; actual: number; balance: number }>();

  for (const row of rows) {
    const date = toDateKey(row.date);

    if (!date) {
      continue;
    }

    const current = grouped.get(date) ?? { plan: 0, actual: 0, balance: 0 };
    current.plan += toNumber(row.prodPlan);
    current.actual += toNumber(row.prodAct);
    current.balance += toNumber(row.balance);
    grouped.set(date, current);
  }

  return Array.from(grouped.entries()).map(([date, value]) => ({
    date,
    plan: value.plan,
    actual: value.actual,
    balance: value.balance,
  }));
}

function buildTarget(rows: RawHomeRow[]): HomeTarget {
  const plan = rows.reduce((total, row) => total + toNumber(row.prodPlan), 0);
  const actual = rows.reduce((total, row) => total + toNumber(row.prodAct), 0);
  const balance = rows.reduce((total, row) => total + toNumber(row.balance), 0);

  return {
    plan,
    actual,
    balance,
    progress: plan > 0 ? (actual / plan) * 100 : null,
  };
}

function buildLineGaps(entries: Array<{ line: HomeLineConfig; rows: RawHomeRow[] }>) {
  return entries
    .map((entry) => {
      const target = buildTarget(entry.rows);
      const gap = target.actual - target.plan;

      return {
        line: entry.line.label,
        plan: target.plan,
        actual: target.actual,
        gap,
        status: gap < 0 ? "Not Achieved" : "Achieved",
      } satisfies HomeLineGap;
    })
    .sort((a, b) => a.gap - b.gap);
}

export async function getHomeDashboard(): Promise<HomeDashboard> {
  const currentRange = getCurrentRange();
  const previousRange = getPreviousMonthRange();
  const entries = await Promise.all(
    homeLineConfigs.map(async (line) => ({
      line,
      rows: await getHomeLineRows(line, currentRange.start, currentRange.endExclusive),
      previousRows: await getHomeLineRows(
        line,
        previousRange.start,
        previousRange.endExclusive,
      ),
    })),
  );
  const currentRows = entries[0]?.rows ?? [];
  const previousRows = entries[0]?.previousRows ?? [];
  const linePerformance = entries.map((entry) => ({
    key: entry.line.key,
    label: entry.line.label,
    oee: metricAverage(entry.rows, "oee"),
  }));

  return {
    metrics: buildMetrics(currentRows, previousRows),
    productionDays: buildProductionDays(currentRows),
    target: buildTarget(currentRows),
    linePerformance,
    lineGaps: buildLineGaps(entries),
  };
}
