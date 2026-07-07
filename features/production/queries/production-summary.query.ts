import { getReportPrisma } from "@/lib/report-prisma";
import type {
  ProductionSummaryLine,
  ProductionSummaryLineKey,
  RawProductionProblemRow,
  RawProductionSummaryRow,
} from "@/features/production/types";

export const productionSummaryLines: Record<
  ProductionSummaryLineKey,
  ProductionSummaryLine
> = {
  cylblock: {
    summaryView: "v_cylblock_summary",
    detailProblemView: "v_cylblock_detail_problem",
  },
  cylhead: {
    summaryView: "v_cylhead_summary",
    detailProblemView: "v_cylhead_detail_problem",
  },
  camshaft: {
    summaryView: "v_camshaft_summary",
    detailProblemView: "v_camshaft_detail_problem",
  },
  crankshaft: {
    summaryView: "v_crankshaft_summary",
    detailProblemView: "v_crankshaft_detail_problem",
  },
};

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

export async function getProductionFilterOptionRows(
  lineKey: ProductionSummaryLineKey,
  start: string,
  end: string,
) {
  const line = productionSummaryLines[lineKey];

  return getReportPrisma().$queryRawUnsafe<
    Array<{
      shift: string | null;
      shift2: string | null;
      shop: string | null;
    }>
  >(
    `SELECT DISTINCT SHIFT AS shift, SHIFT2 AS shift2, SHOP AS shop FROM ${quoteIdentifier(
      line.summaryView,
    )} WHERE \`DATE\` >= ? AND \`DATE\` < ? ORDER BY SHIFT, SHIFT2, SHOP`,
    start,
    end,
  );
}

export async function getProductionSummaryRows(
  line: ProductionSummaryLine,
  where: string,
  values: unknown[],
) {
  return getReportPrisma().$queryRawUnsafe<RawProductionSummaryRow[]>(
    `SELECT
      \`DATE\` AS date,
      PLANT AS plant,
      SHIFT AS shift,
      SHIFT2 AS shift2,
      SHOP AS shop,
      Eff_std AS effStd,
      TT AS tt,
      Variant AS variant,
      Prod_plan AS prodPlan,
      Prod_act AS prodAct,
      OT_plan AS otPlan,
      OT_act AS otAct,
      OT_diff AS otDiff,
      Balance AS balance,
      Remarks AS remarks,
      AV AS av,
      PE AS pe,
      RQ AS rq,
      OEE AS oee,
      fdate_modified AS modifiedAt
    FROM ${quoteIdentifier(line.summaryView)}${where}
    ORDER BY \`DATE\` ASC, SHIFT ASC, SHOP ASC
    LIMIT 500`,
    ...values,
  );
}

export async function getProductionProblemRows(
  line: ProductionSummaryLine,
  where: string,
  values: unknown[],
) {
  return getReportPrisma().$queryRawUnsafe<RawProductionProblemRow[]>(
    `SELECT
      \`DATE\` AS date,
      PLANT AS plant,
      SHIFT AS shift,
      SHIFT2 AS shift2,
      SHOP AS shop,
      TT_min AS ttMin,
      JAM AS jam,
      Problem_AV AS problemAv,
      LS_AV_Unit AS lsAvUnit,
      LS_AV_min AS lsAvMin,
      Problem_PE AS problemPe,
      LS_PE_Unit AS lsPeUnit,
      LS_PE_min AS lsPeMin,
      Problem_RQ AS problemRq,
      Defect_C AS defectC,
      Defect_M AS defectM,
      Defect_C_min AS defectCMin,
      Defect_M_min AS defectMMin,
      fdate_modified AS modifiedAt
    FROM ${quoteIdentifier(line.detailProblemView)}${where}
    ORDER BY \`DATE\` ASC, SHIFT ASC, JAM ASC, SHOP ASC
    LIMIT 300`,
    ...values,
  );
}
