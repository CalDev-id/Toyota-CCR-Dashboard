import "server-only";

import type { ProductionAchievementLineKey } from "@/features/production-achievement/types";
import { prisma } from "@/lib/prisma";

const machiningLines = ["cylblock", "cylhead", "crankshaft", "camshaft"] as const;
export const LINE_STOP_DECISIONS = ["RUNNING", "LINE_STOP", "CHOKOTEI"] as const;

export type LineStopDecisionValue = (typeof LINE_STOP_DECISIONS)[number];
export type LineStopDecision = {
  lineKey: ProductionAchievementLineKey;
  sourceLastUpdatedAt: string;
  alertStartedAt: string;
  decision: LineStopDecisionValue;
  decidedByName: string;
  decidedAt: string;
};

type DecisionRow = {
  lineKey: ProductionAchievementLineKey;
  sourceLastUpdatedAt: Date | string;
  alertStartedAt: Date | string;
  decision: LineStopDecisionValue;
  decidedByName: string;
  decidedAt: Date | string;
};

export function isMachiningLine(value: string): value is (typeof machiningLines)[number] {
  return machiningLines.includes(value as (typeof machiningLines)[number]);
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function serialize(row: DecisionRow): LineStopDecision {
  return {
    lineKey: row.lineKey,
    sourceLastUpdatedAt: toDate(row.sourceLastUpdatedAt).toISOString(),
    alertStartedAt: toDate(row.alertStartedAt).toISOString(),
    decision: row.decision,
    decidedByName: row.decidedByName,
    decidedAt: toDate(row.decidedAt).toISOString(),
  };
}

async function findDecision(
  lineKey: string,
  reportDate: string,
  shift: string,
  sourceLastUpdatedAt: Date,
  alertStartedAt?: Date,
) {
  const alertWhere = alertStartedAt ? " AND alert_started_at = ?" : "";
  const values = alertStartedAt
    ? [lineKey, reportDate, shift, sourceLastUpdatedAt, alertStartedAt]
    : [lineKey, reportDate, shift, sourceLastUpdatedAt];
  const rows = await prisma.$queryRawUnsafe<DecisionRow[]>(
    `SELECT line_key AS lineKey, source_last_updated_at AS sourceLastUpdatedAt,
      alert_started_at AS alertStartedAt, decision, decided_by_name AS decidedByName,
      decided_at AS decidedAt
     FROM production_line_stop_decision
     WHERE line_key = ? AND report_date = ? AND shift = ? AND source_last_updated_at = ?${alertWhere}
     ORDER BY decided_at DESC LIMIT 1`,
    ...values,
  );

  return rows[0] ? serialize(rows[0]) : null;
}

export async function getLatestLineStopDecision(
  lineKey: string,
  reportDate: string,
  shift: string,
  sourceLastUpdatedAt: Date,
) {
  return findDecision(lineKey, reportDate, shift, sourceLastUpdatedAt);
}

export async function createLineStopDecision(input: {
  lineKey: string;
  reportDate: string;
  shift: string;
  sourceLastUpdatedAt: Date;
  alertStartedAt: Date;
  decision: LineStopDecisionValue;
  decidedByUserId: number;
  decidedByName: string;
}) {
  const latest = await getLatestLineStopDecision(
    input.lineKey,
    input.reportDate,
    input.shift,
    input.sourceLastUpdatedAt,
  );

  if (latest && latest.alertStartedAt !== input.alertStartedAt.toISOString()) {
    if (latest.decision !== "RUNNING" || input.alertStartedAt < new Date(latest.decidedAt)) {
      return latest;
    }
  }

  const decidedAt = new Date();
  await prisma.$executeRawUnsafe(
    `INSERT IGNORE INTO production_line_stop_decision
      (line_key, report_date, shift, source_last_updated_at, alert_started_at, decision,
       decided_by_user_id, decided_by_name, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.lineKey,
    input.reportDate,
    input.shift,
    input.sourceLastUpdatedAt,
    input.alertStartedAt,
    input.decision,
    input.decidedByUserId,
    input.decidedByName,
    decidedAt,
  );

  return findDecision(
    input.lineKey,
    input.reportDate,
    input.shift,
    input.sourceLastUpdatedAt,
    input.alertStartedAt,
  );
}
