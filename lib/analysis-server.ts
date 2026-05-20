import { prisma } from "@/lib/prisma";

type AnalysisLineKey = "cylblock" | "cylhead" | "camshaft" | "crankshaft";

type AnalysisLine = {
  key: AnalysisLineKey;
  label: string;
  tableName: string;
};

type RawOeeRow = {
  date: Date | string | null;
  shift: string | null;
  oee: string | number | null;
  balance: string | number | null;
  otPlan: string | number | null;
  otAct: string | number | null;
};

export type AnalysisOeeCard = {
  key: AnalysisLineKey;
  line: string;
  r: number | null;
  w: number | null;
  ave: number | null;
  monthly: number | null;
  balance: number;
  balanceMonthly: number;
  otDay: number;
  otNight: number;
  cumR: number;
  cumW: number;
  gapCumR: number;
  gapCumW: number;
};

export type AnalysisOeeSeriesRow = {
  date: string;
} & Record<AnalysisLineKey, number | null>;

export type AnalysisGapSeriesRow = {
  date: string;
} & Record<`${AnalysisLineKey}R` | `${AnalysisLineKey}W`, number>;

const analysisLines: AnalysisLine[] = [
  { key: "cylblock", label: "Cyl Block", tableName: "v_cylblock_summary" },
  { key: "cylhead", label: "Cyl Head", tableName: "v_cylblock_summary" },
  { key: "camshaft", label: "Camshaft", tableName: "v_cylblock_summary" },
  { key: "crankshaft", label: "Crankshaft", tableName: "v_cylblock_summary" },
];

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
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

function getTodayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string | null) {
  const date = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getTodayKey();
  const [year, month, day] = date.split("-").map(Number);
  const endDate = new Date(Date.UTC(year, month - 1, day));
  const start = `${date.slice(0, 7)}-01`;
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const endExclusive = nextDate.toISOString().slice(0, 10);

  return {
    date,
    start,
    endExclusive,
    year,
    month,
    dayCount: endDate.getUTCDate(),
  };
}

function getRangeDays(year: number, month: number, dayCount: number) {
  return Array.from({ length: dayCount }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${year}-${String(month).padStart(2, "0")}-${day}`;
  });
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function normalizeShift(value: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

async function getLineRows(line: AnalysisLine, start: string, endExclusive: string) {
  return prisma.$queryRawUnsafe<RawOeeRow[]>(
    `SELECT
      \`DATE\` AS date,
      SHIFT AS shift,
      OEE AS oee,
      Balance AS balance,
      OT_plan AS otPlan,
      OT_act AS otAct
     FROM ${quoteIdentifier(line.tableName)}
     WHERE \`DATE\` >= ? AND \`DATE\` < ?
     ORDER BY \`DATE\` ASC, SHIFT ASC`,
    start,
    endExclusive,
  );
}

function buildCard(line: AnalysisLine, rows: RawOeeRow[], selectedDate: string): AnalysisOeeCard {
  const rValues = rows
    .filter((row) => normalizeShift(row.shift) === "R")
    .map((row) => toNumber(row.oee));
  const wValues = rows
    .filter((row) => normalizeShift(row.shift) === "W")
    .map((row) => toNumber(row.oee));
  const allValues = rows.map((row) => toNumber(row.oee));
  const selectedRows = rows.filter((row) => toDateKey(row.date) === selectedDate);
  const selectedRRows = selectedRows.filter((row) => normalizeShift(row.shift) === "R");
  const selectedWRows = selectedRows.filter((row) => normalizeShift(row.shift) === "W");
  const monthlyRRows = rows.filter((row) => normalizeShift(row.shift) === "R");
  const monthlyWRows = rows.filter((row) => normalizeShift(row.shift) === "W");
  const dailyGap = buildDailyGap(rows);

  return {
    key: line.key,
    line: line.label,
    r: average(rValues),
    w: average(wValues),
    ave: average(allValues),
    monthly: average(allValues),
    balance: selectedRows.reduce((total, row) => total + toNumber(row.balance), 0),
    balanceMonthly: rows.reduce((total, row) => total + toNumber(row.balance), 0),
    otDay: selectedRRows.reduce((total, row) => total + toNumber(row.otAct), 0),
    otNight: selectedWRows.reduce((total, row) => total + toNumber(row.otAct), 0),
    cumR: monthlyRRows.reduce((total, row) => total + toNumber(row.otAct), 0),
    cumW: monthlyWRows.reduce((total, row) => total + toNumber(row.otAct), 0),
    gapCumR: Array.from(dailyGap.values()).reduce((total, value) => total + value.r, 0),
    gapCumW: Array.from(dailyGap.values()).reduce((total, value) => total + value.w, 0),
  };
}

function buildDailyAverage(rows: RawOeeRow[]) {
  const grouped = new Map<string, number[]>();

  for (const row of rows) {
    const date = toDateKey(row.date);

    if (!date) {
      continue;
    }

    grouped.set(date, [...(grouped.get(date) ?? []), toNumber(row.oee)]);
  }

  return new Map(
    Array.from(grouped.entries()).map(([date, values]) => [date, average(values)]),
  );
}

function buildDailyGap(rows: RawOeeRow[]) {
  const grouped = new Map<
    string,
    {
      r: { plan: number; actual: number };
      w: { plan: number; actual: number };
    }
  >();

  for (const row of rows) {
    const date = toDateKey(row.date);

    if (!date) {
      continue;
    }

    const current = grouped.get(date) ?? {
      r: { plan: 0, actual: 0 },
      w: { plan: 0, actual: 0 },
    };

    if (normalizeShift(row.shift) === "R") {
      current.r.plan = Math.max(current.r.plan, toNumber(row.otPlan));
      current.r.actual += toNumber(row.otAct);
    }

    if (normalizeShift(row.shift) === "W") {
      current.w.plan = Math.max(current.w.plan, toNumber(row.otPlan));
      current.w.actual += toNumber(row.otAct);
    }

    grouped.set(date, current);
  }

  return new Map(
    Array.from(grouped.entries()).map(([date, value]) => [
      date,
      {
        r: value.r.actual - value.r.plan,
        w: value.w.actual - value.w.plan,
      },
    ]),
  );
}

export async function getAnalysisOee(dateParam: string | null) {
  const range = parseDate(dateParam);
  const days = getRangeDays(range.year, range.month, range.dayCount);
  const entries = await Promise.all(
    analysisLines.map(async (line) => ({
      line,
      rows: await getLineRows(line, range.start, range.endExclusive),
    })),
  );
  const cards = entries.map((entry) => buildCard(entry.line, entry.rows, range.date));
  const dailyByLine = new Map(
    entries.map((entry) => [entry.line.key, buildDailyAverage(entry.rows)]),
  );
  const gapByLine = new Map(
    entries.map((entry) => [entry.line.key, buildDailyGap(entry.rows)]),
  );
  const series = days.map((date) => {
    const row = { date } as AnalysisOeeSeriesRow;

    for (const line of analysisLines) {
      row[line.key] = dailyByLine.get(line.key)?.get(date) ?? null;
    }

    return row;
  });
  const gapSeries = days.map((date) => {
    const row = { date } as AnalysisGapSeriesRow;

    for (const line of analysisLines) {
      const values = gapByLine.get(line.key)?.get(date);
      row[`${line.key}R`] = values?.r ?? 0;
      row[`${line.key}W`] = values?.w ?? 0;
    }

    return row;
  });

  return {
    date: range.date,
    start: range.start,
    end: range.date,
    cards,
    series,
    gapSeries,
    lines: analysisLines.map(({ key, label }) => ({ key, label })),
  };
}
