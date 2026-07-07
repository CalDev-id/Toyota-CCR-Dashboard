import type { PlanningColumn, PlanningPartKey, PlanningRow } from "@/features/planning/types";

export const defaultPart: PlanningPartKey = "cylblock";

export function getCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const partIcons: Record<PlanningPartKey, string> = {
  cylblock: "CB",
  cylhead: "CH",
  camshaft: "CA",
  crankshaft: "CR",
};

export const partLabels: Record<PlanningPartKey, string> = {
  cylblock: "Cylblock",
  cylhead: "Cylhead",
  camshaft: "Camshaft",
  crankshaft: "Crankshaft",
};

export const importLineOptions: Array<{ key: PlanningPartKey; label: string }> = [
  { key: "cylblock", label: "Cylinder block" },
  { key: "cylhead", label: "Cylinder head" },
  { key: "camshaft", label: "Camshaft" },
  { key: "crankshaft", label: "Crankshaft" },
];

export const shiftOptions = ["1", "2"];
export const groupOptions = ["R", "W"];

export function formatInputValue(value: unknown, column: PlanningColumn) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (column.inputType === "date") {
    return text.slice(0, 10);
  }

  if (column.inputType === "datetime-local") {
    return text.slice(0, 16);
  }

  return text;
}

export function isCreateField(column: PlanningColumn) {
  return !column.isAutoIncrement;
}

export function isUpdateField(column: PlanningColumn) {
  return !column.isAutoIncrement && !column.isPrimary;
}

export function isVisibleColumn(column: PlanningColumn) {
  const field = column.field.toLowerCase();
  return field !== "fid" && field !== "fdatetime_modified";
}

export function isShiftColumn(column: PlanningColumn) {
  return column.field.toLowerCase() === "shift" || column.field.toLowerCase() === "fshift";
}

export function isGroupColumn(column: PlanningColumn) {
  return column.field.toLowerCase() === "group" || column.field.toLowerCase() === "fgroup";
}

export function getPartLabel(part: PlanningPartKey) {
  return partLabels[part];
}

export function formatColumnLabel(field: string) {
  return /^f/i.test(field) ? field.slice(1) : field;
}

export function makeEmptyForm(columns: PlanningColumn[]) {
  return Object.fromEntries(
    columns.filter(isCreateField).map((column) => [column.field, ""]),
  ) as Record<string, string>;
}

export function makeEditing(rows: PlanningRow[], columns: PlanningColumn[]) {
  return Object.fromEntries(
    rows.map((row) => [
      String(row[columns.find((column) => column.isPrimary)?.field ?? ""]),
      Object.fromEntries(
        columns
          .filter(isUpdateField)
          .map((column) => [column.field, formatInputValue(row[column.field], column)]),
      ),
    ]),
  ) as Record<string, Record<string, string>>;
}
