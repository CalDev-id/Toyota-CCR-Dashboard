import { prisma } from "@/lib/prisma";
import type {
  PlanningColumn,
  PlanningPartKey,
  PlanningPartSummary,
  PlanningRow,
} from "@/lib/planning-types";

export const planningParts: Record<
  PlanningPartKey,
  { label: string; tableName: string }
> = {
  cylblock: {
    label: "Cylblock",
    tableName: "t_plan_daily_production_cylblock",
  },
  cylhead: {
    label: "Cylhead",
    tableName: "t_plan_daily_production_cylhead",
  },
  camshaft: {
    label: "Camshaft",
    tableName: "t_plan_daily_production_camshaft",
  },
  crankshaft: {
    label: "Crankshaft",
    tableName: "t_plan_daily_production_crankshaft",
  },
};

type RawColumn = {
  Field: string;
  Type: string;
  Null: string;
  Key: string;
  Default: string | number | null;
  Extra: string;
};

const dateCandidates = ["date", "fdate", "plan_date", "production_date", "tanggal"];
const shiftCandidates = ["shift", "fshift"];
const groupCandidates = ["group", "fgroup", "group_name", "grp"];

export function parsePlanningPart(value: string | null | undefined) {
  if (value && value in planningParts) {
    return value as PlanningPartKey;
  }

  return "cylblock";
}

export function requirePlanningPart(value: string) {
  if (value in planningParts) {
    return value as PlanningPartKey;
  }

  throw new Error("Invalid planning part");
}

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

export function quotedTable(part: PlanningPartKey) {
  return quoteIdentifier(planningParts[part].tableName);
}

function quotedColumn(field: string) {
  return quoteIdentifier(field);
}

function getInputType(type: string): PlanningColumn["inputType"] {
  const normalized = type.toLowerCase();

  if (normalized.includes("datetime") || normalized.includes("timestamp")) {
    return "datetime-local";
  }

  if (normalized.includes("date")) {
    return "date";
  }

  if (
    normalized.includes("int") ||
    normalized.includes("decimal") ||
    normalized.includes("double") ||
    normalized.includes("float") ||
    normalized.includes("real")
  ) {
    return "number";
  }

  return "text";
}

export async function getPlanningColumns(part: PlanningPartKey) {
  const columns = await prisma.$queryRawUnsafe<RawColumn[]>(
    `SHOW COLUMNS FROM ${quotedTable(part)}`,
  );

  return columns.map<PlanningColumn>((column) => ({
    field: column.Field,
    type: column.Type,
    nullable: column.Null === "YES",
    key: column.Key,
    defaultValue: column.Default,
    extra: column.Extra,
    isPrimary: column.Key === "PRI",
    isAutoIncrement: column.Extra.toLowerCase().includes("auto_increment"),
    inputType: getInputType(column.Type),
  }));
}

export function getPrimaryColumn(columns: PlanningColumn[]) {
  const primary = columns.find((column) => column.isPrimary);

  if (!primary) {
    throw new Error("Planning table must have a primary key for CRUD");
  }

  return primary;
}

export function getEditableColumns(columns: PlanningColumn[], mode: "create" | "update") {
  return columns.filter((column) => {
    if (column.isAutoIncrement) {
      return false;
    }

    if (mode === "update" && column.isPrimary) {
      return false;
    }

    return true;
  });
}

export async function getPlanningSummaries() {
  const entries = await Promise.all(
    Object.entries(planningParts).map(async ([key, part]) => {
      const rows = await prisma.$queryRawUnsafe<{ count: bigint | number }[]>(
        `SELECT COUNT(*) AS count FROM ${quoteIdentifier(part.tableName)}`,
      );

      return {
        key: key as PlanningPartKey,
        label: part.label,
        tableName: part.tableName,
        count: Number(rows[0]?.count ?? 0),
      } satisfies PlanningPartSummary;
    }),
  );

  return entries;
}

export async function getPlanningRows(part: PlanningPartKey, columns: PlanningColumn[]) {
  const primary = columns.find((column) => column.isPrimary);
  const orderBy = primary ? ` ORDER BY ${quotedColumn(primary.field)} DESC` : "";

  return prisma.$queryRawUnsafe<PlanningRow[]>(
    `SELECT * FROM ${quotedTable(part)}${orderBy} LIMIT 200`,
  );
}

export type PlanningFilters = {
  month: string;
  shift: string;
  group: string;
};

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

function buildPlanningFilterWhere(columns: PlanningColumn[], filters: PlanningFilters) {
  const { dateColumn, shiftColumn, groupColumn } = getConflictColumns(columns);
  const { start, end } = getMonthRange(filters.month);
  const conditions = [
    `${quotedColumn(dateColumn.field)} >= ?`,
    `${quotedColumn(dateColumn.field)} < ?`,
  ];
  const values: unknown[] = [start, end];

  if (filters.shift !== "all") {
    conditions.push(`${quotedColumn(shiftColumn.field)} = ?`);
    values.push(filters.shift);
  }

  if (filters.group !== "all") {
    conditions.push(`${quotedColumn(groupColumn.field)} = ?`);
    values.push(filters.group);
  }

  return {
    where: ` WHERE ${conditions.join(" AND ")}`,
    values,
    columns: { dateColumn, shiftColumn, groupColumn },
  };
}

export async function getFilteredPlanningRows(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  filters: PlanningFilters,
) {
  const primary = columns.find((column) => column.isPrimary);
  const {
    where,
    values,
    columns: { dateColumn, shiftColumn, groupColumn },
  } = buildPlanningFilterWhere(columns, filters);
  const orderBy = ` ORDER BY ${quotedColumn(dateColumn.field)} ASC, ${quotedColumn(
    shiftColumn.field,
  )} ASC, ${quotedColumn(groupColumn.field)} ASC${
    primary ? `, ${quotedColumn(primary.field)} ASC` : ""
  }`;

  return prisma.$queryRawUnsafe<PlanningRow[]>(
    `SELECT * FROM ${quotedTable(part)}${where}${orderBy} LIMIT 200`,
    ...values,
  );
}

export async function getPlanningFilterOptions(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  month: string,
) {
  const { dateColumn, shiftColumn, groupColumn } = getConflictColumns(columns);
  const { start, end } = getMonthRange(month);
  const rows = await prisma.$queryRawUnsafe<Record<string, string | number | null>[]>(
    `SELECT DISTINCT ${quotedColumn(shiftColumn.field)} AS shift_value, ${quotedColumn(
      groupColumn.field,
    )} AS group_value FROM ${quotedTable(part)} WHERE ${quotedColumn(
      dateColumn.field,
    )} >= ? AND ${quotedColumn(dateColumn.field)} < ? ORDER BY ${quotedColumn(
      shiftColumn.field,
    )}, ${quotedColumn(groupColumn.field)}`,
    start,
    end,
  );

  return {
    shifts: Array.from(
      new Set(
        rows
          .map((row) => String(row.shift_value ?? "").trim())
          .filter(Boolean),
      ),
    ),
    groups: Array.from(
      new Set(
        rows
          .map((row) => String(row.group_value ?? "").trim())
          .filter(Boolean),
      ),
    ),
  };
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

export function buildPayload(
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

  await prisma.$executeRawUnsafe(sql, ...values);
  return rows.length;
}

export async function updatePlanningRow(
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
  await prisma.$executeRawUnsafe(
    `UPDATE ${quotedTable(part)} SET ${assignments} WHERE ${quotedColumn(
      primary.field,
    )} = ?`,
    ...entries.map(([, value]) => value),
    id,
  );
}

export async function deletePlanningRow(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  id: string,
) {
  const primary = getPrimaryColumn(columns);

  await prisma.$executeRawUnsafe(
    `DELETE FROM ${quotedTable(part)} WHERE ${quotedColumn(primary.field)} = ?`,
    id,
  );
}

function findColumn(columns: PlanningColumn[], candidates: string[]) {
  return candidates
    .map((candidate) =>
      columns.find((column) => column.field.toLowerCase() === candidate.toLowerCase()),
    )
    .find(Boolean);
}

export function getConflictColumns(columns: PlanningColumn[]) {
  const dateColumn = findColumn(columns, dateCandidates);
  const shiftColumn = findColumn(columns, shiftCandidates);
  const groupColumn = findColumn(columns, groupCandidates);

  if (!dateColumn || !shiftColumn || !groupColumn) {
    throw new Error("Unable to detect date, shift, and group columns for import");
  }

  return { dateColumn, shiftColumn, groupColumn };
}

function dateKey(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? "").slice(0, 10);
}

export function getBatchKeys(rows: Record<string, unknown>[], columns: PlanningColumn[]) {
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

export async function findExistingBatches(
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
    const result = await prisma.$queryRawUnsafe<{ count: bigint | number }[]>(
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

export async function replaceExistingBatches(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  rows: Record<string, unknown>[],
) {
  const {
    columns: { dateColumn, shiftColumn, groupColumn },
    keys,
  } = getBatchKeys(rows, columns);

  for (const key of keys) {
    await prisma.$executeRawUnsafe(
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
