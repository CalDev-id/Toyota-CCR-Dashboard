"use server";

import { auth } from "@/auth";
import {
  getEditableColumns,
  getPlanningColumns,
  getPrimaryColumn,
  quotedColumn,
  quotedTable,
  requirePlanningPart,
} from "@/features/planning/server/planning-data";
import type { PlanningColumn, PlanningPartKey } from "@/features/planning/types";
import { getReportPrisma } from "@/lib/report-prisma";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthenticated");
  }
}

function normalizeValue(value: unknown, column: PlanningColumn) {
  if (value === undefined || value === "") {
    return column.nullable || column.defaultValue !== null ? null : "";
  }

  if (column.inputType === "number") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return value;
}

function buildPayload(
  body: Record<string, unknown>,
  columns: PlanningColumn[],
  mode: "create" | "update",
) {
  const editableColumns = getEditableColumns(columns, mode);
  const payload: Record<string, unknown> = {};

  for (const column of editableColumns) {
    if (Object.prototype.hasOwnProperty.call(body, column.field)) {
      payload[column.field] = normalizeValue(body[column.field], column);
    }
  }

  return payload;
}

export async function insertPlanningRows(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  rows: Record<string, unknown>[],
) {
  const writableColumns = getEditableColumns(columns, "create").filter((column) =>
    rows.some((row) => Object.prototype.hasOwnProperty.call(row, column.field)),
  );

  if (writableColumns.length === 0 || rows.length === 0) {
    return 0;
  }

  const fields = writableColumns.map((column) => quotedColumn(column.field)).join(", ");
  const placeholders = `(${writableColumns.map(() => "?").join(", ")})`;
  const sql = `INSERT INTO ${quotedTable(part)} (${fields}) VALUES ${rows
    .map(() => placeholders)
    .join(", ")}`;
  const values = rows.flatMap((row) =>
    writableColumns.map((column) => normalizeValue(row[column.field], column)),
  );

  await getReportPrisma().$executeRawUnsafe(sql, ...values);
  return rows.length;
}

async function updatePlanningRow(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  id: string,
  body: Record<string, unknown>,
) {
  const primary = getPrimaryColumn(columns);
  const payload = buildPayload(body, columns, "update");
  const entries = Object.entries(payload);

  if (entries.length === 0) {
    throw new Error("No editable fields provided");
  }

  const assignments = entries.map(([field]) => `${quotedColumn(field)} = ?`).join(", ");
  await getReportPrisma().$executeRawUnsafe(
    `UPDATE ${quotedTable(part)} SET ${assignments} WHERE ${quotedColumn(
      primary.field,
    )} = ?`,
    ...entries.map(([, value]) => value),
    id,
  );
}

async function deletePlanningRow(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  id: string,
) {
  const primary = getPrimaryColumn(columns);

  await getReportPrisma().$executeRawUnsafe(
    `DELETE FROM ${quotedTable(part)} WHERE ${quotedColumn(primary.field)} = ?`,
    id,
  );
}

export async function createPlanningRowAction(
  partParam: PlanningPartKey,
  body: Record<string, unknown>,
) {
  await requireSession();

  const part = requirePlanningPart(partParam);
  const columns = await getPlanningColumns(part);
  const payload = buildPayload(body, columns, "create");
  const inserted = await insertPlanningRows(part, columns, [payload]);

  revalidatePath("/planning");

  return { data: { inserted } };
}

export async function updatePlanningRowAction(
  partParam: PlanningPartKey,
  id: string,
  body: Record<string, unknown>,
) {
  await requireSession();

  const part = requirePlanningPart(partParam);
  const columns = await getPlanningColumns(part);
  await updatePlanningRow(part, columns, id, body);

  revalidatePath("/planning");

  return { data: { id } };
}

export async function deletePlanningRowAction(
  partParam: PlanningPartKey,
  id: string,
) {
  await requireSession();

  const part = requirePlanningPart(partParam);
  const columns = await getPlanningColumns(part);
  await deletePlanningRow(part, columns, id);

  revalidatePath("/planning");

  return { data: { id } };
}
