export type ProductionSummaryLineKey =
  | "assy"
  | "cylblock"
  | "cylhead"
  | "camshaft"
  | "crankshaft";

export type ProductionSummaryLine = {
  summaryView: string;
  detailProblemView: string;
};

export type ProductionSummaryFilters = {
  line: ProductionSummaryLineKey;
  month: string;
  date: string;
  shift: string;
  shift2: string;
  shop: string;
};

export type RawProductionSummaryRow = {
  date: Date | string | null;
  plant: string | null;
  shift: string | null;
  shift2: string | null;
  shop: string | null;
  effStd: string | number | null;
  tt: string | null;
  variant: string | null;
  prodPlan: string | number | null;
  prodAct: string | number | null;
  otPlan: string | number | null;
  otAct: string | number | null;
  otDiff: string | number | null;
  balance: string | number | null;
  remarks: string | null;
  av: string | number | null;
  pe: string | number | null;
  rq: string | number | null;
  oee: string | number | null;
  modifiedAt: Date | string | null;
};

export type RawProductionProblemRow = {
  date: Date | string | null;
  plant: string | null;
  shift: string | null;
  shift2: string | null;
  shop: string | null;
  ttMin: string | number | null;
  jam: string | null;
  problemAv: string | null;
  lsAvUnit: string | null;
  lsAvMin: string | number | null;
  problemPe: string | null;
  lsPeUnit: string | null;
  lsPeMin: string | number | null;
  problemRq: string | null;
  defectC: string | number | null;
  defectM: string | number | null;
  defectCMin: string | number | null;
  defectMMin: string | number | null;
  modifiedAt: Date | string | null;
};

export type ProductionSummaryRow = {
  date: string;
  plant: string;
  shift: string;
  shift2: string;
  shop: string;
  effStd: number;
  tt: string;
  variant: string;
  prodPlan: number;
  prodAct: number;
  otPlan: number;
  otAct: number;
  otDiff: number;
  balance: number;
  remarks: string;
  av: number;
  pe: number;
  rq: number;
  oee: number;
  modifiedAt: string;
};

export type ProductionProblemRow = {
  date: string;
  plant: string;
  shift: string;
  shift2: string;
  shop: string;
  ttMin: number;
  jam: string;
  problemAv: string;
  lsAvUnit: string;
  lsAvMin: number;
  problemPe: string;
  lsPeUnit: string;
  lsPeMin: number;
  problemRq: string;
  defectC: number;
  defectM: number;
  defectCMin: number;
  defectMMin: number;
  modifiedAt: string;
};

export type ProductionFilterOptions = {
  shifts: string[];
  shift2s: string[];
  shops: string[];
};

export type ProductionSummaryResponse = {
  rows: ProductionSummaryRow[];
  problemRows: ProductionProblemRow[];
  filterOptions: ProductionFilterOptions;
};

export type ProductionTrend = {
  direction: "up" | "down" | "flat";
  value: number;
} | null;
