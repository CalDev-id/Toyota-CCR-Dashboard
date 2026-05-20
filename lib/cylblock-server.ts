import { prisma } from "@/lib/prisma";

export type CylblockFilters = {
  month: string;
  shift: string;
  shift2: string;
  shop: string;
};

type RawSummaryRow = {
  date: Date | string | null;
  plant: string | null;
  shift: string | null;
  shift2: string | null;
  shop: string | null;
  effStd: string | number | null;
  tt: string | null;
  variant: string | null;
  prodPlan: string | number | null;
  prodAct: string | number | null;
  otPlan: string | number | null;
  otAct: string | number | null;
  otDiff: string | number | null;
  balance: string | number | null;
  remarks: string | null;
  av: string | number | null;
  pe: string | number | null;
  rq: string | number | null;
  oee: string | number | null;
  modifiedAt: Date | string | null;
};

export type CylblockSummaryRow = {
  date: string;
  plant: string;
  shift: string;
  shift2: string;
  shop: string;
  effStd: number;
  tt: string;
  variant: string;
  prodPlan: number;
  prodAct: number;
  otPlan: number;
  otAct: number;
  otDiff: number;
  balance: number;
  remarks: string;
  av: number;
  pe: number;
  rq: number;
  oee: number;
  modifiedAt: string;
};

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

export function parseCylblockFilters(url: URL): CylblockFilters {
  return {
    month: url.searchParams.get("month") || getCurrentMonth(),
    shift: url.searchParams.get("shift") || "all",
    shift2: url.searchParams.get("shift2") || "all",
    shop: url.searchParams.get("shop") || "all",
  };
}

function buildSummaryWhere(filters: CylblockFilters) {
  const { start, end } = getMonthRange(filters.month);
  const conditions = ["`DATE` >= ?", "`DATE` < ?"];
  const values: unknown[] = [start, end];

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

function normalizeSummaryRow(row: RawSummaryRow): CylblockSummaryRow {
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

async function getSummaryFilterOptions(filters: CylblockFilters) {
  const { start, end } = getMonthRange(filters.month);
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      shift: string | null;
      shift2: string | null;
      shop: string | null;
    }>
  >(
    "SELECT DISTINCT SHIFT AS shift, SHIFT2 AS shift2, SHOP AS shop FROM v_cylblock_summary WHERE `DATE` >= ? AND `DATE` < ? ORDER BY SHIFT, SHIFT2, SHOP",
    start,
    end,
  );

  return normalizeFilterOptions(rows);
}

export async function getCylblockSummary(filters: CylblockFilters) {
  const { where, values } = buildSummaryWhere(filters);
  const rows = await prisma.$queryRawUnsafe<RawSummaryRow[]>(
    `SELECT
      \`DATE\` AS date,
      PLANT AS plant,
      SHIFT AS shift,
      SHIFT2 AS shift2,
      SHOP AS shop,
      Eff_std AS effStd,
      TT AS tt,
      Variant AS variant,
      Prod_plan AS prodPlan,
      Prod_act AS prodAct,
      OT_plan AS otPlan,
      OT_act AS otAct,
      OT_diff AS otDiff,
      Balance AS balance,
      Remarks AS remarks,
      AV AS av,
      PE AS pe,
      RQ AS rq,
      OEE AS oee,
      fdate_modified AS modifiedAt
    FROM v_cylblock_summary${where}
    ORDER BY \`DATE\` ASC, SHIFT ASC, SHOP ASC
    LIMIT 500`,
    ...values,
  );

  return {
    rows: rows.map(normalizeSummaryRow),
    filterOptions: await getSummaryFilterOptions(filters),
  };
}
