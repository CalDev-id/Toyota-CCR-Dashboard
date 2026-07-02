import { getReportPrisma } from "@/lib/report-prisma";

type LineKey = "cylblock" | "cylhead" | "camshaft" | "crankshaft";

type LineConfig = {
  key: LineKey;
  label: string;
  summaryView: string;
  detailProblemView: string;
  imageSrc: string;
};

type RawSummaryRow = {
  variant: string | null;
  prodPlan: string | number | null;
  prodAct: string | number | null;
  balance: string | number | null;
  oee: string | number | null;
};

type RawProblemRow = {
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
  key: "assy" | LineKey;
  label: string;
  imageSrc: string;
  prodPlan: number;
  prodAct: number;
  oee: number | null;
  balance: number;
  problems: ProductionAchievementProblem[];
  variants: ProductionAchievementVariant[];
};

export type ProductionAchievementDashboard = {
  date: string;
  shift: string;
  cards: ProductionAchievementCard[];
};

const lineConfigs: LineConfig[] = [
  {
    key: "cylblock",
    label: "Cylinder Block",
    summaryView: "v_cylblock_summary",
    detailProblemView: "v_cylblock_detail_problem",
    imageSrc: "/images/cb.png",
  },
  {
    key: "cylhead",
    label: "Cylinder Head",
    summaryView: "v_cylhead_summary",
    detailProblemView: "v_cylhead_detail_problem",
    imageSrc: "/images/ch.png",
  },
  {
    key: "camshaft",
    label: "Camshaft",
    summaryView: "v_camshaft_summary",
    detailProblemView: "v_camshaft_detail_problem",
    imageSrc: "/images/cam.png",
  },
  {
    key: "crankshaft",
    label: "Crankshaft",
    summaryView: "v_crankshaft_summary",
    detailProblemView: "v_crankshaft_detail_problem",
    imageSrc: "/images/crank.png",
  },
];

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

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

function buildDateShiftWhere(date: string, shift: string) {
  if (shift === "all") {
    return {
      where: "WHERE `DATE` = ?",
      values: [date],
    };
  }

  return {
    where: "WHERE `DATE` = ? AND SHIFT = ?",
    values: [date, shift],
  };
}

async function getSummaryRows(line: LineConfig, date: string, shift: string) {
  const { where, values } = buildDateShiftWhere(date, shift);

  return getReportPrisma().$queryRawUnsafe<RawSummaryRow[]>(
    `SELECT
      Variant AS variant,
      Prod_plan AS prodPlan,
      Prod_act AS prodAct,
      Balance AS balance,
      OEE AS oee
    FROM ${quoteIdentifier(line.summaryView)}
    ${where}
    ORDER BY SHIFT ASC, SHOP ASC, Variant ASC`,
    ...values,
  );
}

async function getProblemRows(line: LineConfig, date: string, shift: string) {
  const { where, values } = buildDateShiftWhere(date, shift);

  return getReportPrisma()
    .$queryRawUnsafe<RawProblemRow[]>(
      `SELECT
        Problem_AV AS problemAv,
        LS_AV_min AS lsAvMin,
        Problem_PE AS problemPe,
        LS_PE_min AS lsPeMin,
        Problem_RQ AS problemRq,
        Defect_C AS defectC,
        Defect_M AS defectM,
        Defect_C_min AS defectCMin,
        Defect_M_min AS defectMMin
      FROM ${quoteIdentifier(line.detailProblemView)}
      ${where}
      ORDER BY \`DATE\` ASC, SHIFT ASC, JAM ASC, SHOP ASC
      LIMIT 300`,
      ...values,
    )
    .catch(() => []);
}

function getProblemCandidates(row: RawProblemRow[]) {
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

function buildProblem(rows: RawProblemRow[]): ProductionAchievementProblem | null {
  const problem = getProblemCandidates(rows)
    .filter((item) => item.label.trim() && item.value > 0)
    .sort((a, b) => b.value - a.value)[0];

  return problem ?? null;
}

function buildProblems(line: LineConfig, rows: RawProblemRow[]) {
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

function buildVariants(rows: RawSummaryRow[]) {
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
  line: LineConfig,
  summaryRows: RawSummaryRow[],
  problemRows: RawProblemRow[],
): ProductionAchievementCard {
  return {
    key: line.key,
    label: line.label,
    imageSrc: line.imageSrc,
    prodPlan: summaryRows.reduce((total, row) => total + toNumber(row.prodPlan), 0),
    prodAct: summaryRows.reduce((total, row) => total + toNumber(row.prodAct), 0),
    oee: average(summaryRows.map((row) => toNumber(row.oee))),
    balance: summaryRows.reduce((total, row) => total + toNumber(row.balance), 0),
    problems: buildProblems(line, problemRows),
    variants: line.key === "cylblock" ? buildVariants(summaryRows) : [],
  };
}

function buildAssyCard() {
  return {
    key: "assy",
    label: "Assy",
    imageSrc: "/images/tr.png",
    prodPlan: 0,
    prodAct: 0,
    oee: null,
    balance: 0,
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
    lineConfigs.map(async (line) => {
      const [summaryRows, problemRows] = await Promise.all([
        getSummaryRows(line, date, shift),
        getProblemRows(line, date, shift),
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
