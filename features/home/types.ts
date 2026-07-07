export type HomeLineKey = "cylblock" | "cylhead" | "camshaft" | "crankshaft";

export type HomeLineConfig = {
  key: HomeLineKey;
  label: string;
  tableName: string;
};

export type RawHomeRow = {
  date: Date | string | null;
  av: string | number | null;
  pe: string | number | null;
  rq: string | number | null;
  oee: string | number | null;
  prodPlan: string | number | null;
  prodAct: string | number | null;
  balance: string | number | null;
};

export type HomeMetricKey = "av" | "pe" | "rq" | "oee";

export type HomeMetric = {
  key: HomeMetricKey;
  label: string;
  value: number | null;
  trend: number | null;
};

export type HomeProductionDay = {
  date: string;
  plan: number;
  actual: number;
  balance: number;
};

export type HomeTarget = {
  plan: number;
  actual: number;
  balance: number;
  progress: number | null;
};

export type HomeLinePerformance = {
  key: HomeLineKey;
  label: string;
  oee: number | null;
};

export type HomeLineGap = {
  line: string;
  plan: number;
  actual: number;
  gap: number;
  status: "Achieved" | "Not Achieved";
};

export type HomeDashboard = {
  metrics: HomeMetric[];
  productionDays: HomeProductionDay[];
  target: HomeTarget;
  linePerformance: HomeLinePerformance[];
  lineGaps: HomeLineGap[];
};
