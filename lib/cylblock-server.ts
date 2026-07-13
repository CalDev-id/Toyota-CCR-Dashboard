import { getReportPrisma } from "@/lib/report-prisma";

export type CylblockFilters = {
  line: SummaryLineKey;
  month: string;
  date: string;
  shift: string;
  shift2: string;
  shop: string;
};

type SummaryLineKey = "cylblock" | "cylhead" | "camshaft" | "crankshaft";

const summaryLines: Record<
  SummaryLineKey,
  { summaryView: string; detailProblemView: string }
> = {
  cylblock: {
    summaryView: "v_cylblock_summary",
    detailProblemView: "v_cylblock_detail_problem",
  },
  cylhead: {
    summaryView: "v_cylhead_summary",
    detailProblemView: "v_cylhead_detail_problem",
  },
  camshaft: {
    summaryView: "v_camshaft_summary",
    detailProblemView: "v_camshaft_detail_problem",
  },
  crankshaft: {
    summaryView: "v_crankshaft_summary",
    detailProblemView: "v_crankshaft_detail_problem",
  },
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

type RawProblemRow = {
  date: Date | string | null;
  plant: string | null;
  shift: string | null;
  shift2: string | null;
  shop: string | null;
  ttMin: string | number | null;
  jam: string | null;
  problemAv: string | null;
  lsAvUnit: string | null;
  lsAvMin: string | number | null;
  problemPe: string | null;
  lsPeUnit: string | null;
  lsPeMin: string | number | null;
  problemRq: string | null;
  defectC: string | number | null;
  defectM: string | number | null;
  defectCMin: string | number | null;
  defectMMin: string | number | null;
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

export type CylblockProblemRow = {
  date: string;
  plant: string;
  shift: string;
  shift2: string;
  shop: string;
  ttMin: number;
  jam: string;
  problemAv: string;
  lsAvUnit: string;
  lsAvMin: number;
  problemPe: string;
  lsPeUnit: string;
  lsPeMin: number;
  problemRq: string;
  defectC: number;
  defectM: number;
  defectCMin: number;
  defectMMin: number;
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

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
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

export function parseCylblockFilters(url: URL): CylblockFilters {
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

function buildSummaryWhere(filters: CylblockFilters) {
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

function buildProblemWhere(filters: CylblockFilters) {
  const { where, values } = buildSummaryWhere(filters);

  return { where, values };
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

function normalizeProblemRow(row: RawProblemRow): CylblockProblemRow {
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

async function getSummaryFilterOptions(filters: CylblockFilters) {
  const line = summaryLines[filters.line];
  const { start, end } = getMonthRange(filters.month);
  const rows = await getReportPrisma().$queryRawUnsafe<
    Array<{
      shift: string | null;
      shift2: string | null;
      shop: string | null;
    }>
  >(
    `SELECT DISTINCT SHIFT AS shift, SHIFT2 AS shift2, SHOP AS shop FROM ${quoteIdentifier(
      line.summaryView,
    )} WHERE \`DATE\` >= ? AND \`DATE\` < ? ORDER BY SHIFT, SHIFT2, SHOP`,
    start,
    end,
  );

  return normalizeFilterOptions(rows);
}

export async function getCylblockSummary(filters: CylblockFilters) {
  const line = summaryLines[filters.line];
  const { where, values } = buildSummaryWhere(filters);
  const problemWhere = buildProblemWhere(filters);
  const rows = await getReportPrisma().$queryRawUnsafe<RawSummaryRow[]>(
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
    FROM ${quoteIdentifier(line.summaryView)}${where}
    ORDER BY \`DATE\` ASC, SHIFT ASC, SHOP ASC
    LIMIT 500`,
    ...values,
  );
  const problemRows = await getReportPrisma()
    .$queryRawUnsafe<RawProblemRow[]>(
      `SELECT
        \`DATE\` AS date,
        PLANT AS plant,
        SHIFT AS shift,
        SHIFT2 AS shift2,
        SHOP AS shop,
        TT_min AS ttMin,
        JAM AS jam,
        Problem_AV AS problemAv,
        LS_AV_Unit AS lsAvUnit,
        LS_AV_min AS lsAvMin,
        Problem_PE AS problemPe,
        LS_PE_Unit AS lsPeUnit,
        LS_PE_min AS lsPeMin,
        Problem_RQ AS problemRq,
        Defect_C AS defectC,
        Defect_M AS defectM,
        Defect_C_min AS defectCMin,
        Defect_M_min AS defectMMin,
        fdate_modified AS modifiedAt
      FROM ${quoteIdentifier(line.detailProblemView)}${problemWhere.where}
      ORDER BY \`DATE\` ASC, SHIFT ASC, JAM ASC, SHOP ASC
      LIMIT 300`,
      ...problemWhere.values,
    )
    .catch(() => []);

  return {
    rows: rows.map(normalizeSummaryRow),
    problemRows: problemRows.map(normalizeProblemRow),
    filterOptions: await getSummaryFilterOptions(filters),
  };
}
