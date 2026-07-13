export type ProductionAchievementLineKey =
  | "cylblock"
  | "cylhead"
  | "camshaft"
  | "crankshaft";

export type ProductionAchievementLineConfig = {
  key: ProductionAchievementLineKey;
  label: string;
  summaryView: string;
  detailProblemView: string;
  imageSrc: string;
};

export type RawProductionAchievementSummaryRow = {
  variant: string | null;
  tt: string | null;
  prodPlan: string | number | null;
  prodAct: string | number | null;
  balance: string | number | null;
  oee: string | number | null;
};

export type RawProductionAchievementProblemRow = {
  problemAv: string | null;
  lsAvMin: string | number | null;
  problemPe: string | null;
  lsPeMin: string | number | null;
  problemRq: string | null;
  defectC: string | number | null;
  defectM: string | number | null;
  defectCMin: string | number | null;
  defectMMin: string | number | null;
};

export type ProductionAchievementVariant = {
  name: string;
  prodPlan: number;
  prodAct: number;
  balance: number;
};

export type ProductionAchievementProblem = {
  label: string;
  value: number;
  unit: "min" | "unit" | "";
  type?: "AV" | "PE" | "RQ";
};

export type ProductionAchievementCard = {
  key: "assy" | ProductionAchievementLineKey;
  label: string;
  imageSrc: string;
  prodPlan: number;
  prodAct: number;
  oee: number | null;
  tt: string;
  oeeTarget: number | null;
  balance: number;
  stopTime: number;
  problems: ProductionAchievementProblem[];
  variants: ProductionAchievementVariant[];
};

export type ProductionAchievementDashboard = {
  date: string;
  shift: string;
  cards: ProductionAchievementCard[];
};
