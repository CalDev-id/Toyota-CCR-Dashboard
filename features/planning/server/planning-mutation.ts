"use server";

import {
  getEditableColumns,
  getConflictColumns,
  getPlanningDateKey,
  getPlanningColumns,
  getPrimaryColumn,
  quotedColumn,
  quotedTable,
  requirePlanningPart,
} from "@/features/planning/server/planning-data";
import type { PlanningColumn, PlanningPartKey } from "@/features/planning/types";
import { getReportPrisma } from "@/lib/report-prisma";
import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/authorization";

async function requireSession() {
  await requireRoles("ADMIN");
}

function normalizeValue(value: unknown, column: PlanningColumn) {
  if (value === undefined || value === null || String(value).trim() === "") {
    if (column.inputType === "number" && !column.nullable) {
      return 0;
    }

    if (column.nullable) {
      return null;
    }

    return "";
  }

  if (column.inputType === "number") {
    const numberValue = Number(String(value).trim().replace(",", "."));

    if (!Number.isFinite(numberValue)) {
      throw new Error(`${column.field} harus berupa angka yang valid`);
    }

    return numberValue;
  }

  return value;
}

function findColumn(columns: PlanningColumn[], candidates: string[]) {
  return candidates
    .map((candidate) =>
      columns.find((column) => column.field.toLowerCase() === candidate.toLowerCase()),
    )
    .find(Boolean);
}

function getRatioFallback(columns: PlanningColumn[], row: Record<string, unknown>) {
  const ratioColumn = findColumn(columns, ["fratio", "ratio"]);
  const oneTrColumn = findColumn(columns, ["f1tr"]);
  const twoTrColumn = findColumn(columns, ["f2tr"]);

  if (
    !ratioColumn ||
    !oneTrColumn ||
    !twoTrColumn ||
    String(row[ratioColumn.field] ?? "").trim()
  ) {
    return null;
  }

  const oneTr = Number(String(row[oneTrColumn.field] ?? "").trim().replace(",", "."));
  const twoTr = Number(String(row[twoTrColumn.field] ?? "").trim().replace(",", "."));

  if (!Number.isFinite(oneTr) || !Number.isFinite(twoTr) || oneTr <= 0 || twoTr <= 0) {
    return null;
  }

  const precision = 1000;
  let left = Math.round(oneTr * precision);
  let right = Math.round(twoTr * precision);

  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }

  const divisor = left || 1;
  return `${Math.round(oneTr * precision) / divisor}:${Math.round(twoTr * precision) / divisor}`;
}

function buildPayload(
  part: PlanningPartKey,
  body: Record<string, unknown>,
  columns: PlanningColumn[],
  mode: "create" | "update",
) {
  const editableColumns = getEditableColumns(columns, mode);
  const payload: Record<string, unknown> = {};

  for (const column of editableColumns) {
    if (Object.prototype.hasOwnProperty.call(body, column.field)) {
      const value = body[column.field];

      if (
        (value === undefined || value === null || String(value).trim() === "") &&
        column.defaultValue !== null
      ) {
        continue;
      }

      payload[column.field] = normalizeValue(value, column);
    }
  }

  if (part === "assy") {
    const { groupColumn } = getConflictColumns(columns);
    payload[groupColumn.field] = "N";
  }

  return payload;
}

function assertRequiredInsertValues(columns: PlanningColumn[], rows: Record<string, unknown>[]) {
  const requiredColumns = getEditableColumns(columns, "create").filter(
    (column) =>
      !column.nullable && column.defaultValue === null && column.inputType !== "number",
  );

  for (const row of rows) {
    for (const column of requiredColumns) {
      const value = row[column.field];

      if (value === undefined || value === null || String(value).trim() === "") {
        throw new Error(`${column.field} wajib diisi`);
      }
    }
  }
}

function dateKey(value: unknown) {
  return getPlanningDateKey(value);
}

async function assertUniquePlanningBatch(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  row: Record<string, unknown>,
) {
  const { dateColumn, shiftColumn, groupColumn } = getConflictColumns(columns);
  const date = dateKey(row[dateColumn.field]);
  const shift = String(row[shiftColumn.field] ?? "").trim();
  const group = String(row[groupColumn.field] ?? "").trim();

  if (!date || !shift || !group) {
    return;
  }

  const existing = await getReportPrisma().$queryRawUnsafe<
    Array<{ count: bigint | number }>
  >(
    `SELECT COUNT(*) AS count FROM ${quotedTable(part)} WHERE DATE(${quotedColumn(
      dateColumn.field,
    )}) = ? AND ${quotedColumn(shiftColumn.field)} = ? AND ${quotedColumn(
      groupColumn.field,
    )} = ?`,
    date,
    shift,
    group,
  );

  if (Number(existing[0]?.count ?? 0) > 0) {
    throw new Error(
      `Planning data already exists for date ${date}, shift ${shift}, group ${group}`,
    );
  }
}

export async function insertPlanningRows(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  rows: Record<string, unknown>[],
  options: { skipDuplicateCheck?: boolean } = {},
) {
  await requireSession();
  const normalizedRows =
    part === "assy"
      ? rows.map((row) => {
          const { groupColumn } = getConflictColumns(columns);

          return { ...row, [groupColumn.field]: "N" };
        })
      : rows;
  const rowsWithRatio = normalizedRows.map((row) => {
    const ratio = getRatioFallback(columns, row);

    if (!ratio) {
      return row;
    }

    const ratioColumn = findColumn(columns, ["fratio", "ratio"]);
    return { ...row, [ratioColumn!.field]: ratio };
  });
  assertRequiredInsertValues(columns, rowsWithRatio);
  const writableColumns = getEditableColumns(columns, "create").filter((column) =>
    rowsWithRatio.some((row) => Object.prototype.hasOwnProperty.call(row, column.field)) ||
    (!column.nullable && column.defaultValue === null && column.inputType === "number"),
  );

  if (writableColumns.length === 0 || rowsWithRatio.length === 0) {
    return 0;
  }

  if (!options.skipDuplicateCheck) {
    for (const row of rowsWithRatio) {
      await assertUniquePlanningBatch(part, columns, row);
    }
  }

  const fields = writableColumns.map((column) => quotedColumn(column.field)).join(", ");
  const placeholders = `(${writableColumns.map(() => "?").join(", ")})`;
  const sql = `INSERT INTO ${quotedTable(part)} (${fields}) VALUES ${normalizedRows
    .map(() => placeholders)
    .join(", ")}`;
  const values = rowsWithRatio.flatMap((row) =>
    writableColumns.map((column) => normalizeValue(row[column.field], column)),
  );

  await getReportPrisma().$executeRawUnsafe(sql, ...values);
  return rowsWithRatio.length;
}

async function updatePlanningRow(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  id: string,
  body: Record<string, unknown>,
) {
  const primary = getPrimaryColumn(columns);
  const payload = buildPayload(part, body, columns, "update");
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
  const payload = buildPayload(part, body, columns, "create");
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

export async function deletePlanningRowsAction(
  partParam: PlanningPartKey,
  ids: string[],
) {
  await requireSession();

  const part = requirePlanningPart(partParam);
  const uniqueIds = [...new Set(ids.map(String).filter(Boolean))];
  if (uniqueIds.length === 0) throw new Error("No planning data selected");

  const columns = await getPlanningColumns(part);
  const primary = getPrimaryColumn(columns);
  await getReportPrisma().$transaction(async (transaction) => {
    for (const id of uniqueIds) {
      await transaction.$executeRawUnsafe(
        `DELETE FROM ${quotedTable(part)} WHERE ${quotedColumn(primary.field)} = ?`,
        id,
      );
    }
  });

  revalidatePath("/planning");
  return { data: { deleted: uniqueIds.length } };
}
