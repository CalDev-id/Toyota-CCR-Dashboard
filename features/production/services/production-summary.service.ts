import {
  getProductionFilterOptionRows,
  getProductionProblemRows,
  getProductionSummaryRows,
  productionSummaryLines,
} from "@/features/production/queries/production-summary.query";
import type {
  ProductionProblemRow,
  ProductionSummaryFilters,
  ProductionSummaryRow,
  RawProductionProblemRow,
  RawProductionSummaryRow,
} from "@/features/production/types";

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

function toDateTime(value: unknown) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function getCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseSummaryLine(value: string | null) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (normalized.includes("cylhead") || normalized.includes("cylinderhead")) {
    return "cylhead";
  }

  if (normalized.includes("camshaft")) {
    return "camshaft";
  }

  if (normalized.includes("crankshaft")) {
    return "crankshaft";
  }

  return "cylblock";
}

function getMonthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Month filter must use YYYY-MM format");
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endDate = new Date(Date.UTC(year, monthNumber, 1));
  const end = endDate.toISOString().slice(0, 10);

  return { start, end };
}

export function parseProductionSummaryFilters(url: URL): ProductionSummaryFilters {
  const date = url.searchParams.get("date") ?? "";

  return {
    line: parseSummaryLine(url.searchParams.get("line")),
    month: url.searchParams.get("month") || date.slice(0, 7) || getCurrentMonth(),
    date,
    shift: url.searchParams.get("shift") || "all",
    shift2: url.searchParams.get("shift2") || "all",
    shop: url.searchParams.get("shop") || "all",
  };
}

export function buildProductionSummaryWhere(filters: ProductionSummaryFilters) {
  const conditions = filters.date
    ? ["`DATE` = ?"]
    : ["`DATE` >= ?", "`DATE` < ?"];
  const values: unknown[] = filters.date ? [filters.date] : [];

  if (!filters.date) {
    const { start, end } = getMonthRange(filters.month);
    values.push(start, end);
  }

  if (filters.shift !== "all") {
    conditions.push("SHIFT = ?");
    values.push(filters.shift);
  }

  if (filters.shift2 !== "all") {
    conditions.push("SHIFT2 = ?");
    values.push(filters.shift2);
  }

  if (filters.shop !== "all") {
    conditions.push("SHOP = ?");
    values.push(filters.shop);
  }

  return { where: ` WHERE ${conditions.join(" AND ")}`, values };
}

function buildProblemWhere(filters: ProductionSummaryFilters) {
  const { where, values } = buildProductionSummaryWhere(filters);

  return { where, values };
}

function normalizeSummaryRow(row: RawProductionSummaryRow): ProductionSummaryRow {
  return {
    date: toDateKey(row.date),
    plant: row.plant ?? "",
    shift: row.shift ?? "",
    shift2: row.shift2 ?? "",
    shop: row.shop ?? "",
    effStd: toNumber(row.effStd),
    tt: row.tt ?? "",
    variant: row.variant ?? "",
    prodPlan: toNumber(row.prodPlan),
    prodAct: toNumber(row.prodAct),
    otPlan: toNumber(row.otPlan),
    otAct: toNumber(row.otAct),
    otDiff: toNumber(row.otDiff),
    balance: toNumber(row.balance),
    remarks: row.remarks ?? "",
    av: toNumber(row.av),
    pe: toNumber(row.pe),
    rq: toNumber(row.rq),
    oee: toNumber(row.oee),
    modifiedAt: toDateTime(row.modifiedAt),
  };
}

function normalizeProblemRow(row: RawProductionProblemRow): ProductionProblemRow {
  return {
    date: toDateKey(row.date),
    plant: row.plant ?? "",
    shift: row.shift ?? "",
    shift2: row.shift2 ?? "",
    shop: row.shop ?? "",
    ttMin: toNumber(row.ttMin),
    jam: row.jam ?? "",
    problemAv: row.problemAv ?? "",
    lsAvUnit: row.lsAvUnit ?? "",
    lsAvMin: toNumber(row.lsAvMin),
    problemPe: row.problemPe ?? "",
    lsPeUnit: row.lsPeUnit ?? "",
    lsPeMin: toNumber(row.lsPeMin),
    problemRq: row.problemRq ?? "",
    defectC: toNumber(row.defectC),
    defectM: toNumber(row.defectM),
    defectCMin: toNumber(row.defectCMin),
    defectMMin: toNumber(row.defectMMin),
    modifiedAt: toDateTime(row.modifiedAt),
  };
}

function normalizeFilterOptions(
  rows: Array<{
    shift: string | null;
    shift2: string | null;
    shop: string | null;
  }>,
) {
  const unique = (values: Array<string | null>) =>
    Array.from(
      new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
    );

  return {
    shifts: unique(rows.map((row) => row.shift)),
    shift2s: unique(rows.map((row) => row.shift2)),
    shops: unique(rows.map((row) => row.shop)),
  };
}

async function getSummaryFilterOptions(filters: ProductionSummaryFilters) {
  const { start, end } = getMonthRange(filters.month);
  const rows = await getProductionFilterOptionRows(filters.line, start, end);

  return normalizeFilterOptions(rows);
}

export async function getProductionSummary(filters: ProductionSummaryFilters) {
  const line = productionSummaryLines[filters.line];
  const { where, values } = buildProductionSummaryWhere(filters);
  const problemWhere = buildProblemWhere(filters);
  const rows = await getProductionSummaryRows(line, where, values);
  const problemRows = await getProductionProblemRows(
    line,
    problemWhere.where,
    problemWhere.values,
  ).catch(() => []);

  return {
    rows: rows.map(normalizeSummaryRow),
    problemRows: problemRows.map(normalizeProblemRow),
    filterOptions: await getSummaryFilterOptions(filters),
  };
}
