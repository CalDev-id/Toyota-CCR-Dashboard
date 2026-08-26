export type PackomLineKey = "cylhead" | "cylblock" | "crankshaft" | "camshaft";

export type PackomCard = {
  key: PackomLineKey;
  label: string;
  imageSrc: string;
  totalPacking: number;
  domestic: number;
  export: number;
  good: number;
  defect: number;
  defectRate: number | null;
  noteCaseCount: number;
  notes: Array<{ caseNumber: string; text: string }>;
  lastUpdatedTime: string | null;
};

export type PackomDashboard = {
  productionDate: string;
  shift: "DAY" | "NIGHT";
  isActiveProductionShift: boolean;
  cards: PackomCard[];
};
