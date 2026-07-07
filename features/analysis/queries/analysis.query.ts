import { getReportPrisma } from "@/lib/report-prisma";
import type { AnalysisLine, RawAnalysisOeeRow } from "@/features/analysis/types";

export const analysisLines: AnalysisLine[] = [
  { key: "cylblock", label: "Cyl Block", tableName: "v_cylblock_summary" },
  { key: "cylhead", label: "Cyl Head", tableName: "v_cylhead_summary" },
  { key: "camshaft", label: "Camshaft", tableName: "v_camshaft_summary" },
  { key: "crankshaft", label: "Crankshaft", tableName: "v_crankshaft_summary" },
];

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

export async function getAnalysisLineRows(
  line: AnalysisLine,
  start: string,
  endExclusive: string,
) {
  return getReportPrisma().$queryRawUnsafe<RawAnalysisOeeRow[]>(
    `SELECT
      \`DATE\` AS date,
      SHIFT AS shift,
      AV AS av,
      PE AS pe,
      RQ AS rq,
      OEE AS oee,
      Balance AS balance,
      OT_plan AS otPlan,
      OT_act AS otAct
     FROM ${quoteIdentifier(line.tableName)}
     WHERE \`DATE\` >= ? AND \`DATE\` < ?
     ORDER BY \`DATE\` ASC, SHIFT ASC`,
    start,
    endExclusive,
  );
}
