import type {
  ProductionAchievementCard,
  ProductionAchievementDashboard,
  ProductionAchievementLineConfig,
  ProductionAchievementVariant,
  RawProductionAchievementProblemRow,
  RawProductionAchievementSummaryRow,
} from "@/features/production-achievement/types";
import { loadDailyPlanningData } from "@/features/daily-planning/server/daily-planning-service";
import {
  getProductionRealtimeStatus,
  trackProductionRealtimeStatus,
  type ProductionRealtimeStatus,
} from "@/features/production-achievement/server/realtime-status";
import { prisma } from "@/lib/prisma";
import { getReportPrisma } from "@/lib/report-prisma";
import { summaryViewName } from "@/lib/report-views";

const productionAchievementLineConfigs: ProductionAchievementLineConfig[] = [
  {
    key: "assy",
    label: "Assy",
    summaryView: "v_assy_summary",
    detailProblemView: "v_assy_detail_problem",
    imageSrc: "/images/2tr.png",
  },
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

const monthlyPlanningTables: Record<
  ProductionAchievementLineConfig["key"],
  string
> = {
  assy: "t_plan_daily_production_assy",
  cylblock: "t_plan_daily_production_cylblock",
  cylhead: "t_plan_daily_production_cylhead",
  crankshaft: "t_plan_daily_production_crankshaft",
  camshaft: "t_plan_daily_production_camshaft",
};

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

function productionAchievementActExpression(line: ProductionAchievementLineConfig) {
  if (line.key === "assy") {
    return quoteIdentifier("Prod_act");
  }

  return quoteIdentifier("Prod_realtime");
}

function getProductionAchievementShiftValue(shift: string) {
  if (shift === "DAY") {
    return "1";
  }

  if (shift === "NIGHT") {
    return "2";
  }

  return null;
}

function shiftAliases(value: string) {
  return value === "DAY"
    ? ["1", "Day", "DAY", "day"]
    : value === "NIGHT"
      ? ["2", "Night", "NIGHT", "night"]
      : [value];
}

async function getMonthlyPlanningParameters(
  line: ProductionAchievementLineConfig,
  date: string,
  shift: string,
) {
  const shifts = shiftAliases(shift);
  const rows = await getReportPrisma().$queryRawUnsafe<
    Array<{ tt: unknown; oeeTarget: unknown; otPlan: unknown }>
  >(
    `SELECT ftt AS tt, foee AS oeeTarget, fot AS otPlan FROM ${quoteIdentifier(
      monthlyPlanningTables[line.key],
    )} WHERE DATE(fdate)=? AND TRIM(fshift) IN (${shifts
      .map(() => "?")
      .join(",")}) ORDER BY TRIM(fgroup) ASC LIMIT 1`,
    date,
    ...shifts,
  );

  return {
    tt: toPlainString(rows[0]?.tt),
    oeeTarget: toNumber(rows[0]?.oeeTarget),
    otPlan: toNumber(rows[0]?.otPlan),
  };
}

async function getProductionAchievementSummaryRows(
  line: ProductionAchievementLineConfig,
  date: string,
  shift: string,
) {
  const { where, values } = buildDateShiftWhere(date, shift);
  const actExpression = productionAchievementActExpression(line);
  const summaryView = summaryViewName(line.summaryView);
  const sql = `SELECT
      SHOP AS shop,
      Variant AS variant,
      TT AS tt,
      Prod_plan AS prodPlan,
      ${actExpression} AS prodAct,
      Balance AS balance,
      OEE AS oee,
      OT_act AS otAct
    FROM ${quoteIdentifier(summaryView)}
    ${where}
    ORDER BY SHIFT ASC, SHOP ASC, Variant ASC`;

  try {
    return await getReportPrisma().$queryRawUnsafe<RawProductionAchievementSummaryRow[]>(
      sql,
      ...values,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (line.key === "assy" || !message.includes("Prod_realtime")) {
      throw error;
    }

    return getReportPrisma().$queryRawUnsafe<RawProductionAchievementSummaryRow[]>(
      `SELECT
      SHOP AS shop,
      Variant AS variant,
      TT AS tt,
      Prod_plan AS prodPlan,
      NULL AS prodAct,
      Balance AS balance,
      OEE AS oee,
      NULL AS otAct
    FROM ${quoteIdentifier(summaryView)}
    ${where}
    ORDER BY SHIFT ASC, SHOP ASC, Variant ASC`,
      ...values,
    );
  }
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
  const text = String(value ?? "").trim();
  const normalized =
    text.includes(",") && text.includes(".")
      ? text.replaceAll(".", "").replace(",", ".")
      : text.replace(",", ".");
  const numeric = Number(normalized || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toPlainString(value: unknown) {
  return String(value ?? "");
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTodayKey() {
  return getDateKey(new Date());
}

function parseTimeMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

function getCurrentTimeMinutes() {
  const date = new Date();

  return date.getHours() * 60 + date.getMinutes();
}

function normalizeDate(value: string | null | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : getActiveProductionDateKey();
}

function normalizeShift(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();

  return normalized === "DAY" || normalized === "NIGHT"
    ? normalized
    : getActiveShiftLabel();
}

function getActiveShiftLabel() {
  const current = getCurrentTimeMinutes();
  const dayStart = parseTimeMinutes("07:00");
  const nightStart = parseTimeMinutes("19:30");

  return current >= dayStart && current < nightStart ? "DAY" : "NIGHT";
}

function getActiveProductionDateKey() {
  const date = new Date();

  if (getActiveShiftLabel() === "NIGHT" && getCurrentTimeMinutes() < 7 * 60) {
    date.setDate(date.getDate() - 1);
  }

  return getDateKey(date);
}

function getActiveShiftValue() {
  return getActiveShiftLabel() === "DAY" ? "1" : "2";
}

function isToday(date: string) {
  return date === getTodayKey();
}

type RawDailyPlanningSlotRow = {
  lineKey: string;
  shiftValue: string;
  slotOrder: string | number | null;
  startTime: string;
  endTime: string;
  prodMinutes: string | number | null;
  totalTarget: string | number | null;
  oneTr: string | number | null;
  twoTr: string | number | null;
  tt: string | number | null;
};

type DailyPlanningPlanOverride = {
  prodPlan: number;
  variants: Map<string, number>;
  tt: number;
  workHoursMinutes: number;
};

function getLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function getSlotDateBounds(date: string, slot: RawDailyPlanningSlotRow) {
  const start = getLocalDate(date);
  const [startHour, startMinute] = slot.startTime.split(":").map(Number);
  const [endHour, endMinute] = slot.endTime.split(":").map(Number);

  start.setHours(startHour, startMinute, 0, 0);

  const end = getLocalDate(date);
  end.setHours(endHour, endMinute, 0, 0);

  if (slot.shiftValue === "2" && startHour < 12) {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  }

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

function getPlanningSlotProgress(
  date: string,
  slot: RawDailyPlanningSlotRow,
  now: Date,
) {
  const { start, end } = getSlotDateBounds(date, slot);
  const duration = end.getTime() - start.getTime();

  if (duration <= 0 || now <= start) {
    return 0;
  }

  if (now >= end) {
    return 1;
  }

  return (now.getTime() - start.getTime()) / duration;
}

function getPlanningWorkHoursMinutes(
  date: string,
  slots: RawDailyPlanningSlotRow[],
  now: Date,
) {
  return slots.reduce(
    (total, slot) =>
      total + toNumber(slot.prodMinutes) * getPlanningSlotProgress(date, slot, now),
    0,
  );
}

async function getDailyPlanningPlanOverrides(date: string, shift: string) {
  const requestedShift = getProductionAchievementShiftValue(shift);
  const shiftValues = requestedShift
    ? [requestedShift]
    : isToday(date)
      ? [getActiveShiftValue()]
      : ["1", "2"];
  await Promise.all(
    productionAchievementLineConfigs.map((line) =>
      Promise.all(
        shiftValues.map((shiftValue) =>
          loadDailyPlanningData(line.key, date, shiftValue).catch(() => null),
        ),
      ),
    ),
  );

  const rows = await prisma.$queryRawUnsafe<RawDailyPlanningSlotRow[]>(
    `
    SELECT
      plan.line_key AS lineKey,
      plan.fshift AS shiftValue,
      slot.slot_order AS slotOrder,
      TIME_FORMAT(slot.start_time, '%H:%i') AS startTime,
      TIME_FORMAT(slot.end_time, '%H:%i') AS endTime,
      slot.prod_minutes AS prodMinutes,
      slot.total_target AS totalTarget,
      slot.one_tr AS oneTr,
      slot.two_tr AS twoTr,
      COALESCE(plan.override_tt, plan.source_tt) AS tt
    FROM t_daily_production_plan_slot slot
    INNER JOIN t_daily_production_plan plan ON plan.id = slot.daily_plan_id
    WHERE plan.fdate = ?
      AND plan.fshift IN (${shiftValues.map(() => "?").join(",")})
      AND (
        plan.fgroup = 'all'
        OR NOT EXISTS (
          SELECT 1
          FROM t_daily_production_plan all_plan
          WHERE all_plan.line_key = plan.line_key
            AND all_plan.fdate = plan.fdate
            AND all_plan.fshift = plan.fshift
            AND all_plan.fgroup = 'all'
        )
      )
    ORDER BY plan.line_key ASC, slot.slot_order ASC
  `,
    date,
    ...shiftValues,
  );
  const overrides = new Map<string, DailyPlanningPlanOverride>();
  const groupedRows = new Map<string, RawDailyPlanningSlotRow[]>();

  for (const row of rows) {
    const key = `${row.lineKey}-${row.shiftValue}`;
    groupedRows.set(key, [...(groupedRows.get(key) ?? []), row]);
  }

  function addPlanningRow(row: RawDailyPlanningSlotRow, progress: number) {
    const current = overrides.get(row.lineKey) ?? {
      prodPlan: 0,
      variants: new Map<string, number>(),
      tt: toNumber(row.tt),
      workHoursMinutes: 0,
    };
    const oneTr = toNumber(row.oneTr);
    const twoTr = toNumber(row.twoTr);

    current.prodPlan += toNumber(row.totalTarget) * progress;
    current.variants.set("1TR", (current.variants.get("1TR") ?? 0) + oneTr * progress);
    current.variants.set("2TR", (current.variants.get("2TR") ?? 0) + twoTr * progress);
    overrides.set(row.lineKey, current);
  }

  for (const rowsInShift of groupedRows.values()) {
    const sortedRows = rowsInShift.sort(
      (a, b) => Number(a.slotOrder ?? 0) - Number(b.slotOrder ?? 0),
    );

    const firstRow = sortedRows[0];

    if (!firstRow) {
      continue;
    }

    const now = new Date();

    for (const row of sortedRows) {
      addPlanningRow(row, getPlanningSlotProgress(date, row, now));
    }

    const current = overrides.get(firstRow.lineKey);
    if (current) {
      current.workHoursMinutes += getPlanningWorkHoursMinutes(date, sortedRows, now);
    }
  }

  return overrides;
}

function buildProblems(rows: RawProductionAchievementProblemRow[]) {
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

  if (name === "1TR" || name === "01") {
    return "IN";
  }

  if (name === "2TR" || name === "02") {
    return "EX";
  }

  return name;
}

function buildVariants(
  line: ProductionAchievementLineConfig,
  rows: RawProductionAchievementSummaryRow[],
  planOverride?: DailyPlanningPlanOverride,
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
    current.prodAct += toNumber(row.prodAct);
    current.prodPlan += 0;
    current.balance = current.prodAct - current.prodPlan;
    grouped.set(name, current);
  }

  if (planOverride) {
    for (const [variant, plan] of planOverride.variants.entries()) {
      const name = buildVariantName(line, variant);
      const current = grouped.get(name) ?? {
        name,
        prodPlan: 0,
        prodAct: 0,
        balance: 0,
      };

      current.prodPlan = plan;
      current.balance = current.prodAct - current.prodPlan;
      grouped.set(name, current);
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (line.key === "camshaft") {
      return (a.name === "IN" ? 0 : a.name === "EX" ? 1 : 2) -
        (b.name === "IN" ? 0 : b.name === "EX" ? 1 : 2);
    }

    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

function buildLineCard(
  line: ProductionAchievementLineConfig,
  summaryRows: RawProductionAchievementSummaryRow[],
  problemRows: RawProductionAchievementProblemRow[],
  monthlyParameters: { tt: string; oeeTarget: number; otPlan: number },
  planOverride?: DailyPlanningPlanOverride,
  lastUpdatedAt: string | null = null,
): ProductionAchievementCard {
  const pairDivisor = line.key === "camshaft" ? 2 : 1;
  const prodPlan = planOverride?.prodPlan ?? 0;
  const prodAct =
    summaryRows.reduce((total, row) => total + toNumber(row.prodAct), 0) /
    pairDivisor;
  const otAct = summaryRows.length
    ? summaryRows.reduce((total, row) => total + toNumber(row.otAct), 0) /
      summaryRows.length
    : 0;
  const effectiveTt =
    planOverride?.tt ||
    toNumber(monthlyParameters.tt) ||
    toNumber(summaryRows.find((row) => String(row.tt ?? "").trim())?.tt);
  const actualTt = toPlainString(
    summaryRows.find((row) => String(row.tt ?? "").trim())?.tt,
  );
  const actualTtValue = toNumber(actualTt);
  const workHoursMinutes = planOverride?.workHoursMinutes ?? 0;
  const oee =
    actualTtValue > 0 && workHoursMinutes > 0
      ? (prodAct * actualTtValue * 100) / workHoursMinutes
      : null;

  return {
    key: line.key,
    label: line.label,
    imageSrc: line.imageSrc,
    prodPlan,
    prodAct,
    oee,
    ttAct: actualTt,
    ttPlan: effectiveTt ? toPlainString(effectiveTt) : "",
    oeeTarget: monthlyParameters.oeeTarget || (line.key === "camshaft" ? 93 : 90),
    otAct,
    otPlan: monthlyParameters.otPlan,
    balance: prodAct - prodPlan,
    lastUpdatedAt,
    stopTime: buildStopTime(problemRows),
    problems: buildProblems(problemRows),
    variants: buildVariants(line, summaryRows, planOverride),
  };
}

export async function getProductionAchievementDashboard(filters?: {
  date?: string | null;
  shift?: string | null;
}): Promise<ProductionAchievementDashboard> {
  const date = normalizeDate(filters?.date);
  const shift = normalizeShift(filters?.shift);
  const planOverrides = await getDailyPlanningPlanOverrides(date, shift);
  const lineData = await Promise.all(
    productionAchievementLineConfigs.map(async (line) => {
      const [summaryRows, problemRows, monthlyParameters] = await Promise.all([
        getProductionAchievementSummaryRows(line, date, shift),
        getProductionAchievementProblemRows(line, date, shift),
        getMonthlyPlanningParameters(line, date, shift).catch(() => ({
          tt: "",
          oeeTarget: 0,
          otPlan: 0,
        })),
      ]);

      return { line, summaryRows, problemRows, monthlyParameters };
    }),
  );

  await Promise.all(
    lineData.map(({ line, summaryRows }) =>
      trackProductionRealtimeStatus(line.key, date, shift, summaryRows),
    ),
  ).catch(() => {
    // Keep the dashboard available if the app status table is unavailable.
  });

  const realtimeStatuses: ProductionRealtimeStatus = await getProductionRealtimeStatus(
    date,
    shift,
  ).catch(() => ({}));
  const lineCards = lineData.map(
    ({ line, summaryRows, problemRows, monthlyParameters }) =>
      buildLineCard(
        line,
        summaryRows,
        problemRows,
        monthlyParameters,
        planOverrides.get(line.key),
        realtimeStatuses[line.key] ?? null,
      ),
  );

  return {
    date,
    shift,
    cards: lineCards,
  };
}
