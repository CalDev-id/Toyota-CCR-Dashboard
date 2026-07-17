import type {
  ProductionAchievementCard,
  ProductionAchievementDashboard,
  ProductionAchievementLineConfig,
  ProductionAchievementProblem,
  ProductionAchievementVariant,
  RawProductionAchievementProblemRow,
  RawProductionAchievementSummaryRow,
} from "@/features/production-achievement/types";
import { getReportPrisma } from "@/lib/report-prisma";
import { summaryViewName } from "@/lib/report-views";

const productionAchievementLineConfigs: ProductionAchievementLineConfig[] = [
  {
    key: "assy",
    label: "Assy",
    summaryView: summaryViewName("v_assy_summary"),
    detailProblemView: "v_assy_detail_problem",
    imageSrc: "/images/2tr.png",
  },
  {
    key: "cylblock",
    label: "Cylinder Block",
    summaryView: summaryViewName("v_cylblock_summary"),
    detailProblemView: "v_cylblock_detail_problem",
    imageSrc: "/images/cb.png",
  },
  {
    key: "cylhead",
    label: "Cylinder Head",
    summaryView: summaryViewName("v_cylhead_summary"),
    detailProblemView: "v_cylhead_detail_problem",
    imageSrc: "/images/ch.png",
  },
  {
    key: "crankshaft",
    label: "Crankshaft",
    summaryView: summaryViewName("v_crankshaft_summary"),
    detailProblemView: "v_crankshaft_detail_problem",
    imageSrc: "/images/crank.png",
  },
  {
    key: "camshaft",
    label: "Camshaft",
    summaryView: summaryViewName("v_camshaft_summary"),
    detailProblemView: "v_camshaft_detail_problem",
    imageSrc: "/images/cam.png",
  },
];

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

function buildDateShiftWhere(date: string, shift: string) {
  if (shift === "all") {
    return {
      where: "WHERE `DATE` = ?",
      values: [date],
    };
  }

  return {
    where: "WHERE `DATE` = ? AND SHIFT2 = ?",
    values: [date, shift],
  };
}

async function getProductionAchievementSummaryRows(
  line: ProductionAchievementLineConfig,
  date: string,
  shift: string,
) {
  const { where, values } = buildDateShiftWhere(date, shift);

  return getReportPrisma().$queryRawUnsafe<RawProductionAchievementSummaryRow[]>(
    `SELECT
      Variant AS variant,
      TT AS tt,
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

async function getProductionAchievementProblemRows(
  line: ProductionAchievementLineConfig,
  date: string,
  shift: string,
) {
  const { where, values } = buildDateShiftWhere(date, shift);

  return getReportPrisma()
    .$queryRawUnsafe<RawProductionAchievementProblemRow[]>(
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

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toPlainString(value: unknown) {
  return String(value ?? "");
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

  return normalized === "DAY" || normalized === "NIGHT" ? normalized : "all";
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

function buildProblems(
  line: ProductionAchievementLineConfig,
  rows: RawProductionAchievementProblemRow[],
) {
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

function buildVariantName(line: ProductionAchievementLineConfig, value: string | null) {
  const name = String(value ?? "").trim();

  if (line.key !== "camshaft") {
    return name;
  }

  if (name === "1TR") {
    return "01";
  }

  if (name === "2TR") {
    return "02";
  }

  return name;
}

function buildVariants(
  line: ProductionAchievementLineConfig,
  rows: RawProductionAchievementSummaryRow[],
) {
  const grouped = new Map<string, ProductionAchievementVariant>();

  for (const row of rows) {
    const name = buildVariantName(line, row.variant);

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
  const balanceDivisor = line.key === "camshaft" ? 2 : 1;
  const pairDivisor = line.key === "camshaft" ? 2 : 1;

  return {
    key: line.key,
    label: line.label,
    imageSrc: line.imageSrc,
    prodPlan:
      summaryRows.reduce((total, row) => total + toNumber(row.prodPlan), 0) /
      pairDivisor,
    prodAct:
      summaryRows.reduce((total, row) => total + toNumber(row.prodAct), 0) /
      pairDivisor,
    oee: average(summaryRows.map((row) => toNumber(row.oee))),
    tt: toPlainString(summaryRows.find((row) => String(row.tt ?? "").trim())?.tt),
    oeeTarget: 90,
    balance:
      summaryRows.reduce((total, row) => total + toNumber(row.balance), 0) /
      balanceDivisor,
    stopTime: buildStopTime(problemRows),
    problems: buildProblems(line, problemRows),
    variants: buildVariants(line, summaryRows),
  };
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
    cards: lineCards,
  };
}
