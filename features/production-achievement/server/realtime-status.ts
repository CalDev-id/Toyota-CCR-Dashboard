import { createHash } from "node:crypto";

import type {
  ProductionAchievementLineKey,
  RawProductionAchievementSummaryRow,
} from "@/features/production-achievement/types";
import { prisma } from "@/lib/prisma";

const trackedLines = ["assy", "cylblock", "cylhead", "crankshaft", "camshaft"] as const;

type StatusRow = {
  lineKey: string;
  lastChangedAt: Date | string;
};

export type ProductionRealtimeStatus = Partial<
  Record<ProductionAchievementLineKey, string>
>;

function sourceSignature(rows: RawProductionAchievementSummaryRow[]) {
  const snapshot = rows.map((row) => [
    String(row.shop ?? "").trim(),
    String(row.variant ?? "").trim(),
    String(row.prodAct ?? "").trim(),
  ]);

  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function isTrackedLine(
  lineKey: ProductionAchievementLineKey,
): lineKey is (typeof trackedLines)[number] {
  return trackedLines.includes(lineKey as (typeof trackedLines)[number]);
}

export async function trackProductionRealtimeStatus(
  lineKey: ProductionAchievementLineKey,
  reportDate: string,
  shift: string,
  rows: RawProductionAchievementSummaryRow[],
  shiftStartedAt: Date,
) {
  if (!isTrackedLine(lineKey)) {
    return;
  }

  const checkedAt = new Date();
  const signature = sourceSignature(rows);

  await prisma.$executeRawUnsafe(
    `INSERT INTO production_realtime_status
      (line_key, report_date, shift, last_changed_at, checked_at, source_signature)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       last_changed_at = IF(last_changed_at < ? OR source_signature <> VALUES(source_signature), VALUES(last_changed_at), last_changed_at),
       checked_at = VALUES(checked_at),
       source_signature = VALUES(source_signature)`,
    lineKey,
    reportDate,
    shift,
    checkedAt,
    checkedAt,
    signature,
    shiftStartedAt,
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
