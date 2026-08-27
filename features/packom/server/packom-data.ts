import "server-only";

import type { PackomCard, PackomDashboard, PackomLineKey, PackomProblem } from "@/features/packom/types";
import { getReportPrisma } from "@/lib/report-prisma";

type PackomLineConfig = {
  key: PackomLineKey;
  label: string;
  imageSrc: string;
  view: string;
  workExpression: string;
  goodWorkCountExpression: string;
  caseUnitCountExpression: string;
  workUnitsPerPair: number;
  unitsPerCase: number;
  planningTable: string;
  detailProblemView: string;
};

type PackomAggregateRow = {
  totalPacking: string | number | null;
  good: string | number | null;
  defect: string | number | null;
  lastUpdatedTime: string | null;
};

type PackomCaseStatusRow = {
  caseNumber: string | null;
  code: string | null;
  units: string | number | null;
  latestAt: Date | string | null;
};

type PackomProblemRow = {
  problemAv: string | null;
  lsAvMin: string | number | null;
  problemPe: string | null;
  lsPeMin: string | number | null;
  problemRq: string | null;
  defectCMin: string | number | null;
  defectMMin: string | number | null;
};

type PartCodeConfig = {
  code: string;
  label: string;
};

const packomLines: PackomLineConfig[] = [
  { key: "cylblock", label: "Cylinder Block", imageSrc: "/images/block2.png", view: "v_cylblock_packom", workExpression: "no_work", goodWorkCountExpression: "COUNT(DISTINCT CASE WHEN {condition} THEN no_work END)", caseUnitCountExpression: "COUNT(DISTINCT no_work)", workUnitsPerPair: 1, unitsPerCase: 18, planningTable: "t_plan_daily_production_cylblock", detailProblemView: "v_cylblock_detail_problem" },
  { key: "cylhead", label: "Cylinder Head", imageSrc: "/images/ch.png", view: "v_cylhead_packom", workExpression: "no_work", goodWorkCountExpression: "COUNT(DISTINCT CASE WHEN {condition} THEN no_work END)", caseUnitCountExpression: "COUNT(DISTINCT no_work)", workUnitsPerPair: 1, unitsPerCase: 24, planningTable: "t_plan_daily_production_cylhead", detailProblemView: "v_cylhead_detail_problem" },
  { key: "crankshaft", label: "Crankshaft", imageSrc: "/images/crank.png", view: "v_crankshaft_packom", workExpression: "no_work", goodWorkCountExpression: "COUNT(DISTINCT CASE WHEN {condition} THEN no_work END)", caseUnitCountExpression: "COUNT(DISTINCT no_work)", workUnitsPerPair: 1, unitsPerCase: 48, planningTable: "t_plan_daily_production_crankshaft", detailProblemView: "v_crankshaft_detail_problem" },
  {
    key: "camshaft",
    label: "Camshaft",
    imageSrc: "/images/cam.png",
    view: "v_camshaft_packom",
    workExpression: "COALESCE(NULLIF(TRIM(no_work_in), ''), NULLIF(TRIM(no_work_ex), ''))",
    goodWorkCountExpression: "COUNT(DISTINCT CASE WHEN {condition} THEN NULLIF(TRIM(no_work_in), '') END) + COUNT(DISTINCT CASE WHEN {condition} THEN NULLIF(TRIM(no_work_ex), '') END)",
    caseUnitCountExpression: "COUNT(DISTINCT NULLIF(TRIM(no_work_in), '')) + COUNT(DISTINCT NULLIF(TRIM(no_work_ex), ''))",
    workUnitsPerPair: 2,
    unitsPerCase: 96,
    planningTable: "t_plan_daily_production_camshaft",
    detailProblemView: "v_camshaft_detail_problem",
  },
];

const assyPlanningTable = "t_plan_daily_production_assy";

type MonthlyPlanRow = { totalPlan: string | number | null };

const partCodes: Record<PackomLineKey, PartCodeConfig[]> = {
  cylblock: [
    { code: "K1", label: "Cyl Block 1TR (STM)" },
    { code: "CD", label: "Cyl Block 1TR (Kamigo)" },
    { code: "K2", label: "Cyl Block 2TR (STM)" },
    { code: "CB", label: "Cyl Block 2TR (Kamigo)" },
  ],
  crankshaft: [
    { code: "K3", label: "Crankshaft 1TR (STM)" },
    { code: "K4", label: "Crankshaft 2TR (STM)" },
    { code: "CS", label: "Crankshaft 1TR (Kamigo)" },
    { code: "CT", label: "Crankshaft 2TR (Kamigo)" },
  ],
  camshaft: [
    { code: "K5", label: "Cam Shaft TR-KA No. 1 & No. 2" },
  ],
  cylhead: [
    { code: "K6", label: "Cyl Head 1TR-KA LA (STM)" },
    { code: "K7", label: "Cyl Head 2TR-KA WA (STM)" },
    { code: "K8", label: "Cyl Head 2TR-KA LA (STM)" },
    { code: "KJ", label: "Cyl Head 1TR-K WIAI L/PIPE" },
    { code: "KR", label: "Cyl Head 2TR-K WIAI L/PIPE" },
    { code: "HC", label: "Cyl Head 1TR-KA WA (Kamigo)" },
    { code: "HD", label: "Cyl Head 2TR-KA WA (Kamigo)" },
    { code: "HF", label: "Cyl Head 2TR LA (Kamigo)" },
    { code: "HE", label: "Cyl Head 2TR WA (Kamigo)" },
  ],
};

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function buildProblems(rows: PackomProblemRow[]): PackomProblem[] {
  return rows
    .flatMap((item) => [
      { label: item.problemAv ?? "", value: toNumber(item.lsAvMin), unit: "min" as const, type: "AV" as const },
      { label: item.problemPe ?? "", value: toNumber(item.lsPeMin), unit: "min" as const, type: "PE" as const },
      { label: item.problemRq ?? "", value: toNumber(item.defectCMin) + toNumber(item.defectMMin), unit: "min" as const, type: "RQ" as const },
    ])
    .filter((problem) => problem.label.trim() && problem.value > 0)
    .map((problem) => ({ ...problem, label: problem.label.trim().replace(/\s+/g, " ") }))
    .sort((left, right) => right.value - left.value);
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getActiveShift() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isDay = minutes >= 7 * 60 + 15 && minutes < 20 * 60;
  const shift = isDay ? "DAY" : "NIGHT";

  if (shift === "NIGHT" && minutes < 7 * 60 + 15) now.setDate(now.getDate() - 1);

  return { productionDate: getDateKey(now), shift, shiftValue: isDay ? "1" : "2" } as const;
}

function shiftAliases(shift: string) {
  return shift === "DAY" ? ["1", "Day", "DAY", "day"] : ["2", "Night", "NIGHT", "night"];
}

function previousProductionShift(productionDate: string, shift: "DAY" | "NIGHT") {
  if (shift === "NIGHT") {
    return { productionDate, shiftValue: "1" } as const;
  }

  const [year, month, day] = productionDate.split("-").map(Number);
  const previousDate = new Date(Date.UTC(year, month - 1, day - 1));
  return { productionDate: previousDate.toISOString().slice(0, 10), shiftValue: "2" } as const;
}

function caseKey(caseNumber: string | null) {
  return String(caseNumber ?? "").trim().toUpperCase();
}

function isSpdCase(caseNumber: string | null) {
  return caseKey(caseNumber).startsWith("SPD");
}

function getCaseStatusRows(line: PackomLineConfig, productionDate: string, shiftValue: string) {
  const eventAt = shiftValue === "2"
    ? "DATE_ADD(TIMESTAMP(prod_date, ftime), INTERVAL IF(TIME(ftime) < '07:15:00', 1, 0) DAY)"
    : "TIMESTAMP(prod_date, ftime)";

  return getReportPrisma().$queryRawUnsafe<PackomCaseStatusRow[]>(
    `SELECT
       TRIM(COALESCE(no_case, '')) AS caseNumber,
       UPPER(LEFT(TRIM(COALESCE(no_case, '')), 2)) AS code,
       (${line.caseUnitCountExpression}) / ${line.workUnitsPerPair} AS units,
       MAX(${eventAt}) AS latestAt
     FROM ${quoteIdentifier(line.view)}
     WHERE prod_date = ?
       AND TRIM(CAST(shift AS CHAR)) = ?
       AND TRIM(COALESCE(no_case, '')) <> ''
     GROUP BY TRIM(COALESCE(no_case, ''))`,
    productionDate,
    shiftValue,
  );
}

async function getMonthlyPlanTotal(table: string, productionDate: string, shift: string) {
  const shifts = shiftAliases(shift);
  const rows = await getReportPrisma().$queryRawUnsafe<MonthlyPlanRow[]>(
    `SELECT COALESCE(f1tr, 0) + COALESCE(f2tr, 0) AS totalPlan
     FROM ${quoteIdentifier(table)}
     WHERE DATE(fdate) = ?
       AND TRIM(fshift) IN (${shifts.map(() => "?").join(",")})
     ORDER BY TRIM(fgroup) ASC
     LIMIT 1`,
    productionDate,
    ...shifts,
  );
  return toNumber(rows[0]?.totalPlan);
}

async function getLineCard(
  line: PackomLineConfig,
  productionDate: string,
  shiftValue: string,
  shift: "DAY" | "NIGHT",
  assyPlanTotal: number,
): Promise<PackomCard> {
  const hasWork = `TRIM(COALESCE(${line.workExpression}, '')) <> ''`;
  const isGood = "TRIM(COALESCE(defect_type, '')) IN ('', '-') OR UPPER(TRIM(defect_type)) IN ('NO DEFECT', 'NO DEFFECT')";
  const goodWorkCount = line.goodWorkCountExpression.replaceAll("{condition}", `${hasWork} AND (${isGood})`);
  const defectWorkCount = line.goodWorkCountExpression.replaceAll("{condition}", `${hasWork} AND NOT (${isGood})`);
  const eventAt = shiftValue === "2"
    ? "DATE_ADD(TIMESTAMP(prod_date, ftime), INTERVAL IF(TIME(ftime) < '07:15:00', 1, 0) DAY)"
    : "TIMESTAMP(prod_date, ftime)";
  const reportPrisma = getReportPrisma();
  const rowsPromise = reportPrisma.$queryRawUnsafe<PackomAggregateRow[]>(
    `SELECT
      (${goodWorkCount}) / ${line.workUnitsPerPair} AS good,
      (${defectWorkCount}) / ${line.workUnitsPerPair} AS defect,
      DATE_FORMAT(MAX(${eventAt}), '%H:%i') AS lastUpdatedTime
    FROM ${quoteIdentifier(line.view)}
    WHERE prod_date = ? AND TRIM(CAST(shift AS CHAR)) = ?`,
    productionDate,
    shiftValue,
  );
  const previousShift = previousProductionShift(productionDate, shift);
  const caseStatusRowsPromise = getCaseStatusRows(line, productionDate, shiftValue);
  const previousCaseStatusRowsPromise = getCaseStatusRows(line, previousShift.productionDate, previousShift.shiftValue);
  const problemRowsPromise = reportPrisma.$queryRawUnsafe<PackomProblemRow[]>(
    `SELECT
       Problem_AV AS problemAv,
       LS_AV_min AS lsAvMin,
       Problem_PE AS problemPe,
       LS_PE_min AS lsPeMin,
       Problem_RQ AS problemRq,
       Defect_C_min AS defectCMin,
       Defect_M_min AS defectMMin
     FROM ${quoteIdentifier(line.detailProblemView)}
     WHERE \`DATE\` = ? AND SHIFT2 = ?
     ORDER BY \`DATE\` ASC, SHIFT ASC, JAM ASC, SHOP ASC`,
    productionDate,
    shift,
  );
  const [rows, caseStatusRows, previousCaseStatusRows, problemRows] = await Promise.all([
    rowsPromise,
    caseStatusRowsPromise,
    previousCaseStatusRowsPromise,
    problemRowsPromise,
  ]);
  const row = rows[0];
  const linePlanTotal = await getMonthlyPlanTotal(line.planningTable, productionDate, shift);
  const good = toNumber(row?.good);
  const defect = toNumber(row?.defect);
  const completeCases = caseStatusRows.filter((item) => toNumber(item.units) === line.unitsPerCase);
  const incompleteCases = caseStatusRows
    .filter((item) => toNumber(item.units) < line.unitsPerCase)
    .sort((left, right) => new Date(String(right.latestAt)).getTime() - new Date(String(left.latestAt)).getTime());
  const currentCaseKeys = new Set(caseStatusRows.map((item) => caseKey(item.caseNumber)).filter(Boolean));
  const carriedIncompleteCases = previousCaseStatusRows
    .filter((item) => toNumber(item.units) < line.unitsPerCase)
    .filter((item) => !isSpdCase(item.caseNumber))
    .filter((item) => !currentCaseKeys.has(caseKey(item.caseNumber)))
    .sort((left, right) => new Date(String(right.latestAt)).getTime() - new Date(String(left.latestAt)).getTime());
  const visibleIncompleteCases = [...incompleteCases, ...carriedIncompleteCases];
  const carriedCaseKeys = new Set(carriedIncompleteCases.map((item) => caseKey(item.caseNumber)));
  const anomalyCases = caseStatusRows
    .filter((item) => toNumber(item.units) > line.unitsPerCase)
    .sort((left, right) => new Date(String(right.latestAt)).getTime() - new Date(String(left.latestAt)).getTime());
  const partBreakdownRows = completeCases.reduce<Map<string, number>>((counts, item) => {
    const code = item.code?.trim().toUpperCase();
    if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    return counts;
  }, new Map());
  const countsByCode = new Map(
    partBreakdownRows,
  );
  const caseNumbersByCode = completeCases.reduce<Map<string, string[]>>((cases, item) => {
    const code = item.code?.trim().toUpperCase();
    const caseNumber = item.caseNumber?.trim();
    if (code && caseNumber) cases.set(code, [...(cases.get(code) ?? []), caseNumber]);
    return cases;
  }, new Map());
  const knownCodes = partCodes[line.key];
  const knownCodeSet = new Set(knownCodes.map((item) => item.code));
  const partBreakdown = [
    ...knownCodes.flatMap((item) => {
      const count = countsByCode.get(item.code) ?? 0;
      return count > 0 ? [{ ...item, count, caseNumbers: (caseNumbersByCode.get(item.code) ?? []).sort(), isUnknown: false }] : [];
    }),
    ...[...countsByCode.entries()]
      .filter(([code]) => !knownCodeSet.has(code))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([code, count]) => ({ code, label: `Unknown part [${code}]`, count, caseNumbers: (caseNumbersByCode.get(code) ?? []).sort(), isUnknown: true })),
  ];

  return {
    key: line.key,
    label: line.label,
    imageSrc: line.imageSrc,
    totalPacking: completeCases.length,
    plan: Math.floor(Math.max(0, linePlanTotal - assyPlanTotal) / line.unitsPerCase),
    good,
    defect,
    partBreakdown,
    incompleteCases: visibleIncompleteCases.slice(0, 3).flatMap((item) => {
      const caseNumber = item.caseNumber?.trim();
      return caseNumber ? [{ caseNumber, units: toNumber(item.units), capacity: line.unitsPerCase, fromPreviousShift: carriedCaseKeys.has(caseKey(caseNumber)) }] : [];
    }),
    anomalyCases: anomalyCases.slice(0, 3).flatMap((item) => {
      const caseNumber = item.caseNumber?.trim();
      return caseNumber ? [{ caseNumber, units: toNumber(item.units), capacity: line.unitsPerCase }] : [];
    }),
    incompleteCaseCount: visibleIncompleteCases.length,
    anomalyCaseCount: anomalyCases.length,
    lastUpdatedTime: row?.lastUpdatedTime?.trim() || null,
    problems: buildProblems(problemRows),
  };
}

function normalizeDate(value: string | null | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function normalizeShift(value: string | null | undefined, fallback: "DAY" | "NIGHT") {
  const shift = String(value ?? "").trim().toUpperCase();
  return shift === "DAY" || shift === "NIGHT" ? shift : fallback;
}

export async function getPackomDashboard(filters?: {
  date?: string | null;
  shift?: string | null;
}): Promise<PackomDashboard> {
  const activeShift = getActiveShift();
  const productionDate = normalizeDate(filters?.date, activeShift.productionDate);
  const shift = normalizeShift(filters?.shift, activeShift.shift);
  const shiftValue = shift === "DAY" ? "1" : "2";
  const assyPlanTotal = await getMonthlyPlanTotal(assyPlanningTable, productionDate, shift);
  const cards = await Promise.all(
    packomLines.map((line) => getLineCard(line, productionDate, shiftValue, shift, assyPlanTotal)),
  );

  return {
    productionDate,
    shift,
    isActiveProductionShift: productionDate === activeShift.productionDate && shift === activeShift.shift,
    cards,
  };
}
