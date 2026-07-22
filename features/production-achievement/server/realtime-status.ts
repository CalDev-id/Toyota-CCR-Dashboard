import { createHash } from "node:crypto";

import type { ProductionAchievementLineKey } from "@/features/production-achievement/types";
import { prisma } from "@/lib/prisma";
import { getReportPrisma } from "@/lib/report-prisma";
import { summaryViewName } from "@/lib/report-views";

const trackedLines = ["cylblock", "cylhead", "crankshaft", "camshaft"] as const;

const summaryViews: Record<(typeof trackedLines)[number], string> = {
  cylblock: "v_cylblock_summary",
  cylhead: "v_cylhead_summary",
  crankshaft: "v_crankshaft_summary",
  camshaft: "v_camshaft_summary",
};

type SourceRow = {
  shift: string | null;
  shop: string | null;
  variant: string | null;
  prodRealtime: string | number | null;
};

type StatusRow = {
  lineKey: string;
  lastChangedAt: Date | string;
};

export type ProductionRealtimeStatus = Partial<
  Record<ProductionAchievementLineKey, string>
>;

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getActiveProductionContext(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isDay = minutes >= 7 * 60 && minutes < 19 * 60 + 30;
  const reportDate = new Date(now);

  if (!isDay && minutes < 7 * 60) {
    reportDate.setDate(reportDate.getDate() - 1);
  }

  return { reportDate: dateKey(reportDate), shift: isDay ? "DAY" : "NIGHT" };
}

function sourceSignature(rows: SourceRow[]) {
  const snapshot = rows.map((row) => [
    String(row.shift ?? "").trim(),
    String(row.shop ?? "").trim(),
    String(row.variant ?? "").trim(),
    String(row.prodRealtime ?? "").trim(),
  ]);

  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

async function trackLine(
  lineKey: (typeof trackedLines)[number],
  reportDate: string,
  shift: string,
  checkedAt: Date,
) {
  const view = quoteIdentifier(summaryViewName(summaryViews[lineKey]));
  const rows = await getReportPrisma().$queryRawUnsafe<SourceRow[]>(
    `SELECT SHIFT AS shift, SHOP AS shop, Variant AS variant, Prod_realtime AS prodRealtime
     FROM ${view}
     WHERE \`DATE\` = ? AND SHIFT2 = ?
     ORDER BY SHIFT ASC, SHOP ASC, Variant ASC`,
    reportDate,
    shift,
  );
  const signature = sourceSignature(rows);

  await prisma.$executeRawUnsafe(
    `INSERT INTO production_realtime_status
      (line_key, report_date, shift, last_changed_at, checked_at, source_signature)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       last_changed_at = IF(source_signature <> VALUES(source_signature), VALUES(last_changed_at), last_changed_at),
       checked_at = VALUES(checked_at),
       source_signature = VALUES(source_signature)`,
    lineKey,
    reportDate,
    shift,
    checkedAt,
    checkedAt,
    signature,
  );
}

export async function trackActiveProductionRealtimeStatus() {
  const { reportDate, shift } = getActiveProductionContext();
  const checkedAt = new Date();

  await Promise.all(
    trackedLines.map((lineKey) => trackLine(lineKey, reportDate, shift, checkedAt)),
  );
}

export async function getProductionRealtimeStatus(
  reportDate: string,
  shift: string,
): Promise<ProductionRealtimeStatus> {
  const rows = await prisma.$queryRawUnsafe<StatusRow[]>(
    `SELECT line_key AS lineKey, last_changed_at AS lastChangedAt
     FROM production_realtime_status
     WHERE report_date = ? AND shift = ?`,
    reportDate,
    shift,
  );

  return rows.reduce<ProductionRealtimeStatus>((status, row) => {
    const timestamp = row.lastChangedAt instanceof Date
      ? row.lastChangedAt
      : new Date(row.lastChangedAt);

    status[row.lineKey as ProductionAchievementLineKey] = timestamp.toISOString();
    return status;
  }, {});
}
