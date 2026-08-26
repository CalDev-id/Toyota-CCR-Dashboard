import "server-only";

import type { PackomCard, PackomDashboard, PackomLineKey } from "@/features/packom/types";
import { getReportPrisma } from "@/lib/report-prisma";

type PackomLineConfig = {
  key: PackomLineKey;
  label: string;
  imageSrc: string;
  view: string;
  destinationExpression: string;
  noteExpression: string;
  workExpression: string;
  workUnitsPerPair: number;
};

type PackomAggregateRow = {
  totalPacking: string | number | null;
  domestic: string | number | null;
  export: string | number | null;
  good: string | number | null;
  defect: string | number | null;
  noteCaseCount: string | number | null;
  lastUpdatedTime: string | null;
};

type PackomNoteRow = {
  caseNumber: string | null;
  note: string | null;
};

const packomLines: PackomLineConfig[] = [
  { key: "cylblock", label: "Cylinder Block", imageSrc: "/images/block2.png", view: "v_cylblock_packom", destinationExpression: "destination", noteExpression: "note", workExpression: "no_work", workUnitsPerPair: 1 },
  { key: "cylhead", label: "Cylinder Head", imageSrc: "/images/ch.png", view: "v_cylhead_packom", destinationExpression: "destination", noteExpression: "note", workExpression: "no_work", workUnitsPerPair: 1 },
  { key: "crankshaft", label: "Crankshaft", imageSrc: "/images/crank.png", view: "v_crankshaft_packom", destinationExpression: "destination", noteExpression: "note", workExpression: "no_work", workUnitsPerPair: 1 },
  {
    key: "camshaft",
    label: "Camshaft",
    imageSrc: "/images/cam.png",
    view: "v_camshaft_packom",
    destinationExpression: "COALESCE(NULLIF(TRIM(destination_in), ''), NULLIF(TRIM(destination_ex), ''))",
    noteExpression: "COALESCE(NULLIF(TRIM(note_in), ''), NULLIF(TRIM(note_ex), ''))",
    workExpression: "COALESCE(NULLIF(TRIM(no_work_in), ''), NULLIF(TRIM(no_work_ex), ''))",
    workUnitsPerPair: 2,
  },
];

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
  const destination = `UPPER(TRIM(COALESCE(${line.destinationExpression}, '')))`;
  const hasNote = `TRIM(COALESCE(${line.noteExpression}, '')) <> ''`;
  const hasWork = `TRIM(COALESCE(${line.workExpression}, '')) <> ''`;
  const isGood = "TRIM(COALESCE(defect_type, '')) IN ('', '-') OR UPPER(TRIM(defect_type)) IN ('NO DEFECT', 'NO DEFFECT')";
  const eventAt = shiftValue === "2"
    ? "DATE_ADD(TIMESTAMP(prod_date, ftime), INTERVAL IF(TIME(ftime) < '07:15:00', 1, 0) DAY)"
    : "TIMESTAMP(prod_date, ftime)";
  const rows = await getReportPrisma().$queryRawUnsafe<PackomAggregateRow[]>(
    `SELECT
      COUNT(DISTINCT NULLIF(TRIM(COALESCE(no_case, '')), '')) AS totalPacking,
      COUNT(DISTINCT CASE WHEN ${destination} = 'D' THEN NULLIF(TRIM(COALESCE(no_case, '')), '') END) AS domestic,
      COUNT(DISTINCT CASE WHEN ${destination} = 'E' THEN NULLIF(TRIM(COALESCE(no_case, '')), '') END) AS export,
      COALESCE(SUM(CASE WHEN ${hasWork} AND (${isGood}) THEN 1 ELSE 0 END), 0) / ${line.workUnitsPerPair} AS good,
      COALESCE(SUM(CASE WHEN ${hasWork} AND NOT (${isGood}) THEN 1 ELSE 0 END), 0) / ${line.workUnitsPerPair} AS defect,
      COUNT(DISTINCT CASE WHEN ${hasNote} AND TRIM(COALESCE(no_case, '')) <> '' THEN no_case END) AS noteCaseCount,
      DATE_FORMAT(MAX(${eventAt}), '%H:%i') AS lastUpdatedTime
    FROM ${quoteIdentifier(line.view)}
    WHERE prod_date = ? AND TRIM(CAST(shift AS CHAR)) = ?`,
    productionDate,
    shiftValue,
  );
  const noteRows = await getReportPrisma().$queryRawUnsafe<PackomNoteRow[]>(
    `SELECT
       TRIM(COALESCE(no_case, '')) AS caseNumber,
       TRIM(COALESCE(${line.noteExpression}, '')) AS note
     FROM ${quoteIdentifier(line.view)}
     WHERE prod_date = ?
       AND TRIM(CAST(shift AS CHAR)) = ?
       AND ${hasNote}
       AND TRIM(COALESCE(no_case, '')) <> ''
     GROUP BY TRIM(COALESCE(no_case, '')), TRIM(COALESCE(${line.noteExpression}, ''))
     ORDER BY MAX(${eventAt}) DESC
     LIMIT 3`,
    productionDate,
    shiftValue,
  );
  const row = rows[0];
  const totalPacking = toNumber(row?.totalPacking);
  const good = toNumber(row?.good);
  const defect = toNumber(row?.defect);

  return {
    key: line.key,
    label: line.label,
    imageSrc: line.imageSrc,
    totalPacking,
    domestic: toNumber(row?.domestic),
    export: toNumber(row?.export),
    good,
    defect,
    defectRate: good + defect > 0 ? defect / (good + defect) : null,
    noteCaseCount: toNumber(row?.noteCaseCount),
    notes: noteRows.flatMap((item) => {
      const caseNumber = item.caseNumber?.trim();
      const text = item.note?.trim();
      return caseNumber && text ? [{ caseNumber, text }] : [];
    }),
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
