import { getReportPrisma } from "@/lib/report-prisma";
import type { HomeLineConfig, RawHomeRow } from "@/features/home/types";

export const homeLineConfigs: HomeLineConfig[] = [
  { key: "cylblock", label: "Cyl Block", tableName: "v_cylblock_summary" },
  { key: "cylhead", label: "Cyl Head", tableName: "v_cylhead_summary" },
  { key: "camshaft", label: "Camshaft", tableName: "v_camshaft_summary" },
  { key: "crankshaft", label: "Crankshaft", tableName: "v_crankshaft_summary" },
];

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

export async function getHomeLineRows(
  line: HomeLineConfig,
  start: string,
  endExclusive: string,
) {
  return getReportPrisma().$queryRawUnsafe<RawHomeRow[]>(
    `SELECT
      \`DATE\` AS date,
      AV AS av,
      PE AS pe,
      RQ AS rq,
      OEE AS oee,
      Prod_plan AS prodPlan,
      Prod_act AS prodAct,
      Balance AS balance
     FROM ${quoteIdentifier(line.tableName)}
     WHERE \`DATE\` >= ? AND \`DATE\` < ?
     ORDER BY \`DATE\` ASC`,
    start,
    endExclusive,
  );
}
