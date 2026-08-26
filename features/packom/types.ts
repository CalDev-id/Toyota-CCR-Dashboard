export type PackomLineKey = "cylhead" | "cylblock" | "crankshaft" | "camshaft";

export type PackomProblem = {
  label: string;
  value: number;
  unit: "min";
  type: "AV" | "PE" | "RQ";
};

export type PackomCard = {
  key: PackomLineKey;
  label: string;
  imageSrc: string;
  totalPacking: number;
  plan: number;
  good: number;
  defect: number;
  partBreakdown: Array<{
    code: string;
    label: string;
    count: number;
    isUnknown: boolean;
  }>;
  incompleteCases: Array<{
    caseNumber: string;
    units: number;
    capacity: number;
  }>;
  anomalyCases: Array<{
    caseNumber: string;
    units: number;
    capacity: number;
  }>;
  incompleteCaseCount: number;
  anomalyCaseCount: number;
  lastUpdatedTime: string | null;
  problems: PackomProblem[];
};

export type PackomDashboard = {
  productionDate: string;
  shift: "DAY" | "NIGHT";
  isActiveProductionShift: boolean;
  cards: PackomCard[];
};
