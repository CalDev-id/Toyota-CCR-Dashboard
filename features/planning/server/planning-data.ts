import type {
  PlanningColumn,
  PlanningPartKey,
  PlanningPartSummary,
  PlanningRow,
} from "@/features/planning/types";
import { getReportPrisma } from "@/lib/report-prisma";

export const planningParts: Record<
  PlanningPartKey,
  { label: string; tableName: string }
> = {
  assy: {
    label: "Assy",
    tableName: "t_plan_daily_production_assy",
  },
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

export type PlanningFilters = {
  month: string;
  shift: string;
  group: string;
};

const dateCandidates = ["date", "fdate", "plan_date", "production_date", "tanggal"];
const shiftCandidates = ["shift", "fshift"];
const groupCandidates = ["group", "fgroup", "group_name", "grp"];

function parseRatioPercentage(value: unknown) {
  const [one, two] = String(value ?? "")
    .split(":")
    .map((part) => Number(part.trim()));

  if (!Number.isFinite(one) || !Number.isFinite(two) || one + two <= 0) {
    return { oneTrRatioPercentage: null, twoTrRatioPercentage: null };
  }

  return {
    oneTrRatioPercentage: Math.round((one / (one + two)) * 100),
    twoTrRatioPercentage: Math.round((two / (one + two)) * 100),
  };
}

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

export function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

export function quotedTable(part: PlanningPartKey) {
  return quoteIdentifier(planningParts[part].tableName);
}

export function quotedColumn(field: string) {
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
  const columns = await getReportPrisma().$queryRawUnsafe<RawColumn[]>(
    `SHOW COLUMNS FROM ${quotedTable(part)}`,
  );

  return columns.map<PlanningColumn>((column: RawColumn) => ({
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

function findColumnByName(columns: PlanningColumn[], name: string) {
  return columns.find((column) => column.field.toLowerCase() === name.toLowerCase());
}

export function getMonthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Month filter must use YYYY-MM format");
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endDate = new Date(Date.UTC(year, monthNumber, 1));
  const end = endDate.toISOString().slice(0, 10);

  return { start, end };
}

function getTodayKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getPlanningOrderStartDate(month: string) {
  const today = getTodayKey();

  return today.startsWith(`${month}-`) ? today : `${month}-01`;
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

export async function getPlanningSummaries(month: string) {
  const entries = await Promise.all(
    Object.entries(planningParts).map(async ([key, part]) => {
      const partKey = key as PlanningPartKey;
      const columns = await getPlanningColumns(partKey);
      const dateColumn = getConflictColumns(columns).dateColumn;
      const oneTrColumn = findColumnByName(columns, "f1tr");
      const twoTrColumn = findColumnByName(columns, "f2tr");
      const ratioColumn = findColumn(columns, ["fratio", "ratio"]);
      const { start, end } = getMonthRange(month);
      const rows = await getReportPrisma().$queryRawUnsafe<
        {
          count: bigint | number;
          one_tr_total: string | number | null;
          two_tr_total: string | number | null;
          ratio_text: string | number | null;
        }[]
      >(
        `SELECT COUNT(*) AS count, ${
          oneTrColumn ? `COALESCE(SUM(${quotedColumn(oneTrColumn.field)}), 0)` : "0"
        } AS one_tr_total, ${
          twoTrColumn ? `COALESCE(SUM(${quotedColumn(twoTrColumn.field)}), 0)` : "0"
        } AS two_tr_total, ${
          ratioColumn
            ? `(SELECT ${quotedColumn(ratioColumn.field)} FROM ${quoteIdentifier(
                part.tableName,
              )} WHERE ${quotedColumn(dateColumn.field)} >= ? AND ${quotedColumn(
                dateColumn.field,
              )} < ? AND ${quotedColumn(ratioColumn.field)} IS NOT NULL AND ${quotedColumn(
                ratioColumn.field,
              )} <> '' ORDER BY ${quotedColumn(dateColumn.field)} DESC LIMIT 1)`
            : "NULL"
        } AS ratio_text FROM ${quoteIdentifier(part.tableName)} WHERE ${quotedColumn(
          dateColumn.field,
        )} >= ? AND ${quotedColumn(dateColumn.field)} < ?`,
        ...(ratioColumn ? [start, end] : []),
        start,
        end,
      );
      const ratioText =
        rows[0]?.ratio_text === null || rows[0]?.ratio_text === undefined
          ? null
          : String(rows[0].ratio_text);
      const { oneTrRatioPercentage, twoTrRatioPercentage } = parseRatioPercentage(ratioText);

      return {
        key: partKey,
        label: part.label,
        tableName: part.tableName,
        count: Number(rows[0]?.count ?? 0),
        oneTrTotal: Number(rows[0]?.one_tr_total ?? 0),
        twoTrTotal: Number(rows[0]?.two_tr_total ?? 0),
        ratioText,
        oneTrRatioPercentage,
        twoTrRatioPercentage,
      } satisfies PlanningPartSummary;
    }),
  );

  return entries;
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
  const dateField = quotedColumn(dateColumn.field);
  const orderStartDate = getPlanningOrderStartDate(filters.month);
  const orderBy = ` ORDER BY CASE WHEN ${dateField} >= ? THEN ${dateField} ELSE DATE_ADD(${dateField}, INTERVAL 1 MONTH) END ASC, ${quotedColumn(
    shiftColumn.field,
  )} ASC, ${quotedColumn(groupColumn.field)} ASC${
    primary ? `, ${quotedColumn(primary.field)} ASC` : ""
  }`;

  const rows = await getReportPrisma().$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${quotedTable(part)}${where}${orderBy} LIMIT 200`,
    ...values,
    orderStartDate,
  );

  return rows.map((row: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]: [string, unknown]) => [
        key,
        typeof value === "bigint" ? value.toString() : value,
      ]),
    ),
  ) as PlanningRow[];
}

export async function getPlanningFilterOptions(
  part: PlanningPartKey,
  columns: PlanningColumn[],
  month: string,
) {
  const { dateColumn, shiftColumn, groupColumn } = getConflictColumns(columns);
  const { start, end } = getMonthRange(month);
  const rows = await getReportPrisma().$queryRawUnsafe<Record<string, string | number | null>[]>(
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
          .map((row: Record<string, string | number | null>) => String(row.shift_value ?? "").trim())
          .filter(Boolean),
      ),
    ),
    groups: Array.from(
      new Set(
        rows
          .map((row: Record<string, string | number | null>) => String(row.group_value ?? "").trim())
          .filter(Boolean),
      ),
    ),
  };
}
