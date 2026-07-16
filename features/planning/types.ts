export type PlanningPartKey =
  | "assy"
  | "cylblock"
  | "cylhead"
  | "camshaft"
  | "crankshaft";

export type PlanningColumn = {
  field: string;
  type: string;
  nullable: boolean;
  key: string;
  defaultValue: string | number | null;
  extra: string;
  isPrimary: boolean;
  isAutoIncrement: boolean;
  inputType: "date" | "datetime-local" | "number" | "text";
};

export type PlanningPartSummary = {
  key: PlanningPartKey;
  label: string;
  tableName: string;
  count: number;
  oneTrTotal: number;
  twoTrTotal: number;
  ratioText: string | null;
  oneTrRatioPercentage: number | null;
  twoTrRatioPercentage: number | null;
};

export type PlanningRow = Record<string, string | number | boolean | null>;
