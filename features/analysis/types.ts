export type AnalysisLineKey = "cylblock" | "cylhead" | "camshaft" | "crankshaft";

export type AnalysisLine = {
  key: AnalysisLineKey;
  label: string;
  tableName: string;
};

export type RawAnalysisOeeRow = {
  date: Date | string | null;
  shift: string | null;
  av: string | number | null;
  pe: string | number | null;
  rq: string | number | null;
  oee: string | number | null;
  balance: string | number | null;
  otPlan: string | number | null;
  otAct: string | number | null;
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
  lines: Array<{ key: AnalysisLineKey; label: string }>;
};
