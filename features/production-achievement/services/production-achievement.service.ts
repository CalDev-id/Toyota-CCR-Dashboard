import {
  getProductionAchievementProblemRows,
  getProductionAchievementSummaryRows,
  productionAchievementLineConfigs,
} from "@/features/production-achievement/queries/production-achievement.query";
import type {
  ProductionAchievementCard,
  ProductionAchievementDashboard,
  ProductionAchievementLineConfig,
  ProductionAchievementProblem,
  ProductionAchievementVariant,
  RawProductionAchievementProblemRow,
  RawProductionAchievementSummaryRow,
} from "@/features/production-achievement/types";

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getTodayKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function normalizeDate(value: string | null | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getTodayKey();
}

function normalizeShift(value: string | null | undefined) {
  const normalized = String(value ?? "all").trim().toUpperCase();

  return normalized === "R" || normalized === "W" ? normalized : "all";
}

function getProblemCandidates(row: RawProductionAchievementProblemRow[]) {
  return row.flatMap((item) => {
    const defectUnits = toNumber(item.defectC) + toNumber(item.defectM);
    const rqMinutes = toNumber(item.defectCMin) + toNumber(item.defectMMin);

    return [
      {
        label: item.problemAv ?? "",
        value: toNumber(item.lsAvMin),
        unit: "min" as const,
        type: "AV" as const,
      },
      {
        label: item.problemPe ?? "",
        value: toNumber(item.lsPeMin),
        unit: "min" as const,
        type: "PE" as const,
      },
      {
        label: item.problemRq ?? "",
        value: rqMinutes > 0 ? rqMinutes : defectUnits,
        unit: rqMinutes > 0 ? ("min" as const) : ("unit" as const),
        type: "RQ" as const,
      },
    ];
  });
}

function buildProblem(rows: RawProductionAchievementProblemRow[]): ProductionAchievementProblem | null {
  const problem = getProblemCandidates(rows)
    .filter((item) => item.label.trim() && item.value > 0)
    .sort((a, b) => b.value - a.value)[0];

  return problem ?? null;
}

function buildProblems(line: ProductionAchievementLineConfig, rows: RawProductionAchievementProblemRow[]) {
  if (line.key === "cylblock") {
    return rows
      .flatMap((item) => [
        {
          label: item.problemAv ?? "",
          value: toNumber(item.lsAvMin),
          unit: "min" as const,
          type: "AV" as const,
        },
        {
          label: item.problemPe ?? "",
          value: toNumber(item.lsPeMin),
          unit: "min" as const,
          type: "PE" as const,
        },
      ])
      .filter((item) => item.label.trim() && item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }

  const problem = buildProblem(rows);

  return problem ? [problem] : [];
}

function buildStopTime(rows: RawProductionAchievementProblemRow[]) {
  return rows.reduce(
    (total, row) => total + toNumber(row.lsAvMin) + toNumber(row.lsPeMin),
    0,
  );
}

function buildVariants(rows: RawProductionAchievementSummaryRow[]) {
  const grouped = new Map<string, ProductionAchievementVariant>();

  for (const row of rows) {
    const name = String(row.variant ?? "").trim();

    if (!name) {
      continue;
    }

    const current = grouped.get(name) ?? {
      name,
      prodPlan: 0,
      prodAct: 0,
      balance: 0,
    };
    current.prodPlan += toNumber(row.prodPlan);
    current.prodAct += toNumber(row.prodAct);
    current.balance += toNumber(row.balance);
    grouped.set(name, current);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}

function buildLineCard(
  line: ProductionAchievementLineConfig,
  summaryRows: RawProductionAchievementSummaryRow[],
  problemRows: RawProductionAchievementProblemRow[],
): ProductionAchievementCard {
  return {
    key: line.key,
    label: line.label,
    imageSrc: line.imageSrc,
    prodPlan: summaryRows.reduce((total, row) => total + toNumber(row.prodPlan), 0),
    prodAct: summaryRows.reduce((total, row) => total + toNumber(row.prodAct), 0),
    oee: average(summaryRows.map((row) => toNumber(row.oee))),
    tt: summaryRows.find((row) => String(row.tt ?? "").trim())?.tt ?? "",
    oeeTarget: 90,
    balance: summaryRows.reduce((total, row) => total + toNumber(row.balance), 0),
    stopTime: buildStopTime(problemRows),
    problems: buildProblems(line, problemRows),
    variants: line.key === "cylblock" ? buildVariants(summaryRows) : [],
  };
}

function buildAssyCard() {
  return {
    key: "assy",
    label: "Assy",
    imageSrc: "/images/2tr.png",
    prodPlan: 0,
    prodAct: 0,
    oee: null,
    tt: "",
    oeeTarget: null,
    balance: 0,
    stopTime: 0,
    problems: [],
    variants: [],
  } satisfies ProductionAchievementCard;
}

export async function getProductionAchievementDashboard(filters?: {
  date?: string | null;
  shift?: string | null;
}): Promise<ProductionAchievementDashboard> {
  const date = normalizeDate(filters?.date);
  const shift = normalizeShift(filters?.shift);
  const lineCards = await Promise.all(
    productionAchievementLineConfigs.map(async (line) => {
      const [summaryRows, problemRows] = await Promise.all([
        getProductionAchievementSummaryRows(line, date, shift),
        getProductionAchievementProblemRows(line, date, shift),
      ]);

      return buildLineCard(line, summaryRows, problemRows);
    }),
  );

  return {
    date,
    shift,
    cards: [buildAssyCard(), ...lineCards],
  };
}
