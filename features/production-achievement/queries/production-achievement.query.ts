import { getReportPrisma } from "@/lib/report-prisma";
import type {
  ProductionAchievementLineConfig,
  RawProductionAchievementProblemRow,
  RawProductionAchievementSummaryRow,
} from "@/features/production-achievement/types";

export const productionAchievementLineConfigs: ProductionAchievementLineConfig[] = [
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
    key: "crankshaft",
    label: "Crankshaft",
    summaryView: "v_crankshaft_summary",
    detailProblemView: "v_crankshaft_detail_problem",
    imageSrc: "/images/crank.png",
  },
  {
    key: "camshaft",
    label: "Camshaft",
    summaryView: "v_camshaft_summary",
    detailProblemView: "v_camshaft_detail_problem",
    imageSrc: "/images/cam.png",
  },
];

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

export function buildDateShiftWhere(date: string, shift: string) {
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

export async function getProductionAchievementSummaryRows(
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

export async function getProductionAchievementProblemRows(
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
