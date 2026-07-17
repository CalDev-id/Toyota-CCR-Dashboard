"use server";

import { auth } from "@/auth";
import {
  getConflictColumns,
  getPlanningColumns,
  quotedColumn,
  quotedTable,
  requirePlanningPart,
} from "@/features/planning/server/planning-data";
import { insertPlanningRows } from "@/features/planning/server/planning-mutation";
import type { PlanningColumn, PlanningPartKey } from "@/features/planning/types";
import { getReportPrisma } from "@/lib/report-prisma";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthenticated");
  }
}

function dateKey(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? "").slice(0, 10);
}

function getBatchKeys(rows: Record<string, unknown>[], columns: PlanningColumn[]) {
  const { dateColumn, shiftColumn, groupColumn } = getConflictColumns(columns);
  const keys = new Map<string, { date: string; shift: string; group: string }>();

  for (const row of rows) {
    const date = dateKey(row[dateColumn.field]);
    const shift = String(row[shiftColumn.field] ?? "").trim();
    const group = String(row[groupColumn.field] ?? "").trim();

    if (date && shift && group) {
      keys.set(`${date}||${shift}||${group}`, { date, shift, group });
    }
  }

  return {
    columns: { dateColumn, shiftColumn, groupColumn },
    keys: Array.from(keys.values()),
  };
}

async function findExistingBatches(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  rows: Record<string, unknown>[],
) {
  const {
    columns: { dateColumn, shiftColumn, groupColumn },
    keys,
  } = getBatchKeys(rows, columns);
  const existing: { date: string; shift: string; group: string }[] = [];

  for (const key of keys) {
    const result = await getReportPrisma().$queryRawUnsafe<{ count: bigint | number }[]>(
      `SELECT COUNT(*) AS count FROM ${quotedTable(part)} WHERE DATE(${quotedColumn(
        dateColumn.field,
      )}) = ? AND ${quotedColumn(shiftColumn.field)} = ? AND ${quotedColumn(
        groupColumn.field,
      )} = ?`,
      key.date,
      key.shift,
      key.group,
    );

    if (Number(result[0]?.count ?? 0) > 0) {
      existing.push(key);
    }
  }

  return existing;
}

async function replaceExistingBatches(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  rows: Record<string, unknown>[],
) {
  const {
    columns: { dateColumn, shiftColumn, groupColumn },
    keys,
  } = getBatchKeys(rows, columns);

  for (const key of keys) {
    await getReportPrisma().$executeRawUnsafe(
      `DELETE FROM ${quotedTable(part)} WHERE DATE(${quotedColumn(
        dateColumn.field,
      )}) = ? AND ${quotedColumn(shiftColumn.field)} = ? AND ${quotedColumn(
        groupColumn.field,
      )} = ?`,
      key.date,
      key.shift,
      key.group,
    );
  }
}

function normalizeImportRows(part: PlanningPartKey, columns: PlanningColumn[], rows: Record<string, unknown>[]) {
  if (part !== "assy") {
    return rows;
  }

  const { groupColumn } = getConflictColumns(columns);

  return rows.map((row) => ({ ...row, [groupColumn.field]: "N" }));
}

export async function importPlanningRowsAction(
  partParam: PlanningPartKey,
  formData: FormData,
) {
  await requireSession();

  const part = requirePlanningPart(partParam);
  const file = formData.get("file");
  const overwrite = formData.get("overwrite") === "true";

  if (!(file instanceof File)) {
    throw new Error("Excel file is required");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Excel file must contain at least one sheet");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: "" },
  );

  if (rows.length === 0) {
    throw new Error("Excel sheet does not contain rows");
  }

  const columns = await getPlanningColumns(part);
  const normalizedRows = normalizeImportRows(part, columns, rows);
  const conflicts = await findExistingBatches(part, columns, normalizedRows);

  if (conflicts.length > 0 && !overwrite) {
    return {
      error: "Import conflicts with existing date, shift, and group data",
      status: 409,
      conflicts,
    };
  }

  if (overwrite) {
    await replaceExistingBatches(part, columns, normalizedRows);
  }

  const inserted = await insertPlanningRows(part, columns, normalizedRows);

  revalidatePath("/planning");

  return { data: { inserted, overwritten: overwrite, conflicts } };
}
