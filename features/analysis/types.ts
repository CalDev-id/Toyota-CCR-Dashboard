export type AnalysisLineKey = "assyline" | "cylblock" | "cylhead" | "camshaft" | "crankshaft";

export type AnalysisLine = {
  key: AnalysisLineKey;
  label: string;
  tableName?: string;
  problemTableName?: string;
  shiftMode?: "single" | "dual";
  sourceShift?: string;
  displayShiftLabel?: string;
};

export type RawAnalysisOeeRow = {
  date: Date | string | null;
  shift: string | null;
  shift2: string | null;
  av: string | number | null;
  pe: string | number | null;
  rq: string | number | null;
  oee: string | number | null;
  balance: string | number | null;
  otPlan: string | number | null;
  otAct: string | number | null;
  otDiff: string | number | null;
};

export type RawAnalysisProblemRow = {
  shift2: string | null;
  problemAv: string | null;
  lsAvMin: string | number | null;
  problemPe: string | null;
  lsPeMin: string | number | null;
};

export type AnalysisProblemNoteItem = {
  label: string;
  value: number;
  type: "AV" | "PE";
};

export type AnalysisProblemNote = {
  day: AnalysisProblemNoteItem | null;
  night: AnalysisProblemNoteItem | null;
};

export type AnalysisOeeCard = {
  key: AnalysisLineKey;
  line: string;
  r: number | null;
  w: number | null;
  ave: number | null;
  monthly: number | null;
  balance: number;
  balanceMonthly: number;
  otDay: number;
  otNight: number;
  cumR: number;
  cumW: number;
  gapCumR: number;
  gapCumW: number;
  note: AnalysisProblemNote;
};

export type AnalysisOeeSeriesRow = {
  date: string;
} & Record<AnalysisLineKey, number | null>;

export type AnalysisShiftSeriesRow = {
  date: string;
} & Record<`${AnalysisLineKey}R` | `${AnalysisLineKey}W`, number | null>;

export type AnalysisGapSeriesRow = {
  date: string;
} & Record<`${AnalysisLineKey}R` | `${AnalysisLineKey}W`, number | null>;

export type AnalysisEmergencyStockMetrics = {
  balancePallet: number;
  targetPallet: number;
  actPallet: number;
  actUnit: number;
  actDay: number;
};

export type AnalysisMachiningEmergencyStock = Record<
  "cb1" | "cb2" | "ch1" | "ch2" | "cr1" | "cr2" | "cam1" | "cam2",
{
  total: AnalysisEmergencyStockMetrics;
  local: AnalysisEmergencyStockMetrics;
  export: AnalysisEmergencyStockMetrics;
}>;

export type AnalysisMachiningModuleExportStock = Record<
  "cb1" | "cb2" | "ch1" | "ch2" | "cr1" | "cr2" | "cam1" | "cam2",
{
  total: AnalysisEmergencyStockMetrics;
  modules: Record<string, AnalysisEmergencyStockMetrics>;
}>;

export type AnalysisMachiningAdvancedStock = Record<
  "cylBlock" | "cylHead" | "crankshaft" | "camshaft",
{
  actualUnit: number;
  balanceUnit: number;
}>;

export type AnalysisMachiningBalanceStock = Record<
  "cylblock" | "cylhead" | "crankshaft" | "camshaft",
  {
    emergency: number | null;
    exportModule: number | null;
  }
>;

export type AnalysisShipmentVanningMetrics = {
  plan: number;
  finish: number;
  remain: number;
};

export type AnalysisShipmentVanningDestination = {
  dates: string[];
  modules: Record<string, AnalysisShipmentVanningMetrics[]>;
  totalPlan: number[];
};

export type AnalysisShipmentVanning = Partial<Record<"kamigo" | "stm", AnalysisShipmentVanningDestination>>;
export type AnalysisAsakaiShipmentVanning = Record<Exclude<AnalysisLineKey, "assyline">, AnalysisShipmentVanning>;

export type AnalysisResponse = {
  date: string;
  start: string;
  end: string;
  cards: AnalysisOeeCard[];
  series: AnalysisOeeSeriesRow[];
  shiftSeries: AnalysisShiftSeriesRow[];
  avSeries: AnalysisOeeSeriesRow[];
  avShiftSeries: AnalysisShiftSeriesRow[];
  peSeries: AnalysisOeeSeriesRow[];
  peShiftSeries: AnalysisShiftSeriesRow[];
  rqSeries: AnalysisOeeSeriesRow[];
  rqShiftSeries: AnalysisShiftSeriesRow[];
  gapSeries: AnalysisGapSeriesRow[];
  machiningEmergencyStock: AnalysisMachiningEmergencyStock;
  machiningModuleExportStock: AnalysisMachiningModuleExportStock;
  machiningAdvancedStock: AnalysisMachiningAdvancedStock;
  machiningBalanceStock: AnalysisMachiningBalanceStock;
  shipmentVanning: AnalysisAsakaiShipmentVanning;
  lines: Array<{
    key: AnalysisLineKey;
    label: string;
    shiftMode?: "single" | "dual";
    displayShiftLabel?: string;
  }>;
};
