import "server-only";

import type { PackomCard, PackomDashboard, PackomLineKey } from "@/features/packom/types";
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

type PartCodeConfig = {
  code: string;
  label: string;
};

const packomLines: PackomLineConfig[] = [
  { key: "cylblock", label: "Cylinder Block", imageSrc: "/images/block2.png", view: "v_cylblock_packom", workExpression: "no_work", goodWorkCountExpression: "COUNT(DISTINCT CASE WHEN {condition} THEN no_work END)", caseUnitCountExpression: "COUNT(DISTINCT no_work)", workUnitsPerPair: 1, unitsPerCase: 18 },
  { key: "cylhead", label: "Cylinder Head", imageSrc: "/images/ch.png", view: "v_cylhead_packom", workExpression: "no_work", goodWorkCountExpression: "COUNT(DISTINCT CASE WHEN {condition} THEN no_work END)", caseUnitCountExpression: "COUNT(DISTINCT no_work)", workUnitsPerPair: 1, unitsPerCase: 24 },
  { key: "crankshaft", label: "Crankshaft", imageSrc: "/images/crank.png", view: "v_crankshaft_packom", workExpression: "no_work", goodWorkCountExpression: "COUNT(DISTINCT CASE WHEN {condition} THEN no_work END)", caseUnitCountExpression: "COUNT(DISTINCT no_work)", workUnitsPerPair: 1, unitsPerCase: 48 },
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
  },
];

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

async function getLineCard(
  line: PackomLineConfig,
  productionDate: string,
  shiftValue: string,
): Promise<PackomCard> {
  const hasWork = `TRIM(COALESCE(${line.workExpression}, '')) <> ''`;
  const isGood = "TRIM(COALESCE(defect_type, '')) IN ('', '-') OR UPPER(TRIM(defect_type)) IN ('NO DEFECT', 'NO DEFFECT')";
  const goodWorkCount = line.goodWorkCountExpression.replaceAll("{condition}", `${hasWork} AND (${isGood})`);
  const defectWorkCount = line.goodWorkCountExpression.replaceAll("{condition}", `${hasWork} AND NOT (${isGood})`);
  const eventAt = shiftValue === "2"
    ? "DATE_ADD(TIMESTAMP(prod_date, ftime), INTERVAL IF(TIME(ftime) < '07:15:00', 1, 0) DAY)"
    : "TIMESTAMP(prod_date, ftime)";
  const rows = await getReportPrisma().$queryRawUnsafe<PackomAggregateRow[]>(
    `SELECT
      (${goodWorkCount}) / ${line.workUnitsPerPair} AS good,
      (${defectWorkCount}) / ${line.workUnitsPerPair} AS defect,
      DATE_FORMAT(MAX(${eventAt}), '%H:%i') AS lastUpdatedTime
    FROM ${quoteIdentifier(line.view)}
    WHERE prod_date = ? AND TRIM(CAST(shift AS CHAR)) = ?`,
    productionDate,
    shiftValue,
  );
  const caseStatusRows = await getReportPrisma().$queryRawUnsafe<PackomCaseStatusRow[]>(
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
  const row = rows[0];
  const good = toNumber(row?.good);
  const defect = toNumber(row?.defect);
  const completeCases = caseStatusRows.filter((item) => toNumber(item.units) === line.unitsPerCase);
  const incompleteCases = caseStatusRows
    .filter((item) => toNumber(item.units) < line.unitsPerCase)
    .sort((left, right) => new Date(String(right.latestAt)).getTime() - new Date(String(left.latestAt)).getTime());
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
  const knownCodes = partCodes[line.key];
  const knownCodeSet = new Set(knownCodes.map((item) => item.code));
  const partBreakdown = [
    ...knownCodes.flatMap((item) => {
      const count = countsByCode.get(item.code) ?? 0;
      return count > 0 ? [{ ...item, count, isUnknown: false }] : [];
    }),
    ...[...countsByCode.entries()]
      .filter(([code]) => !knownCodeSet.has(code))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([code, count]) => ({ code, label: `Unknown part [${code}]`, count, isUnknown: true })),
  ];

  return {
    key: line.key,
    label: line.label,
    imageSrc: line.imageSrc,
    totalPacking: completeCases.length,
    good,
    defect,
    defectRate: good + defect > 0 ? defect / (good + defect) : null,
    partBreakdown,
    incompleteCases: incompleteCases.slice(0, 3).flatMap((item) => {
      const caseNumber = item.caseNumber?.trim();
      return caseNumber ? [{ caseNumber, units: toNumber(item.units), capacity: line.unitsPerCase }] : [];
    }),
    anomalyCases: anomalyCases.slice(0, 3).flatMap((item) => {
      const caseNumber = item.caseNumber?.trim();
      return caseNumber ? [{ caseNumber, units: toNumber(item.units), capacity: line.unitsPerCase }] : [];
    }),
    incompleteCaseCount: incompleteCases.length,
    anomalyCaseCount: anomalyCases.length,
    lastUpdatedTime: row?.lastUpdatedTime?.trim() || null,
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
  const cards = await Promise.all(
    packomLines.map((line) => getLineCard(line, productionDate, shiftValue)),
  );

  return {
    productionDate,
    shift,
    isActiveProductionShift: productionDate === activeShift.productionDate && shift === activeShift.shift,
    cards,
  };
}
