export type PackomLineKey = "cylhead" | "cylblock" | "crankshaft" | "camshaft";

export type PackomCard = {
  key: PackomLineKey;
  label: string;
  imageSrc: string;
  totalPacking: number;
  good: number;
  defect: number;
  defectRate: number | null;
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
};

export type PackomDashboard = {
  productionDate: string;
  shift: "DAY" | "NIGHT";
  isActiveProductionShift: boolean;
  cards: PackomCard[];
};
