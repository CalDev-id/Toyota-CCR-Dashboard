import type {
  AnalysisGapSeriesRow,
  AnalysisAsakaiShipmentVanning,
  AnalysisLine,
  AnalysisOeeCard,
  AnalysisOeeSeriesRow,
  AnalysisShiftSeriesRow,
  RawAnalysisProblemRow,
  RawAnalysisOeeRow,
} from "@/features/analysis/types";
import { getReportPrisma } from "@/lib/report-prisma";
import { summaryViewName } from "@/lib/report-views";
import { prisma } from "@/lib/prisma";
import {
  getMachiningAdvancedStock,
  getMachiningBalanceStock,
  getMachiningEmergencyStock,
  getMachiningModuleExportStock,
} from "@/features/asakai-stock/server/asakai-stock";
import { getAsakaiShipmentVanning } from "@/features/asakai-shipment/server/asakai-shipment";
import { getLsrAmountBaseData, getLsrAsakaiKpiData, getLsrWeeklyData } from "@/features/lsr/server/lsr";

export const analysisLines: AnalysisLine[] = [
  {
    key: "assyline",
    label: "Assy Line",
    tableName: "v_assy_summary",
    problemTableName: "v_assy_detail_problem",
    shiftMode: "single",
    sourceShift: "N",
    displayShiftLabel: "N",
  },
  {
    key: "cylblock",
    label: "Cyl Block",
    tableName: "v_cylblock_summary",
    problemTableName: "v_cylblock_detail_problem",
  },
  {
    key: "cylhead",
    label: "Cyl Head",
    tableName: "v_cylhead_summary",
    problemTableName: "v_cylhead_detail_problem",
  },
  {
    key: "crankshaft",
    label: "Crankshaft",
    tableName: "v_crankshaft_summary",
    problemTableName: "v_crankshaft_detail_problem",
  },
  {
    key: "camshaft",
    label: "Camshaft",
    tableName: "v_camshaft_summary",
    problemTableName: "v_camshaft_detail_problem",
  },
];

const monthlyPlanningTables: Record<AnalysisLine["key"], string> = {
  assyline: "t_plan_daily_production_assy",
  cylblock: "t_plan_daily_production_cylblock",
  cylhead: "t_plan_daily_production_cylhead",
  crankshaft: "t_plan_daily_production_crankshaft",
  camshaft: "t_plan_daily_production_camshaft",
};

type PlanningOtRow = { lineKey: AnalysisLine["key"]; date: string; shift: string; groupName: string; otHours: string | number | null };
type DailyPlanningWorkHoursRow = { lineKey: string; date: string; shift: string; workHours: string | number | null };
type GapPlanningData = { monthlyOt: Map<string, number>; dailyWorkHours: Map<string, number> };
type RealtimeSummaryRow = {
  date: string | Date | null;
  shift: string | null;
  shift2: string | null;
  tt: string | number | null;
  prodAct: string | number | null;
  prodRealtime: string | number | null;
};
type RealtimePlanningSlotRow = {
  lineKey: string;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  prodMinutes: string | number | null;
};
type RealtimeMetric = { oee: number | null };
type MonthlyProductionPlanRow = {
  lineKey: AnalysisLine["key"];
  date: string;
  shift: string;
  groupName: string;
  oneTr: string | number | null;
  twoTr: string | number | null;
};
type ProductionActualRow = {
  date: string | Date | null;
  shift: string | null;
  shift2: string | null;
  prodAct: string | number | null;
  prodRealtime: string | number | null;
};
type ProductionBalance = { actual: number; target: number };

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

export async function getAnalysisLineRows(
  line: AnalysisLine,
  start: string,
  endExclusive: string,
) {
  if (!line.tableName) {
    return [];
  }

  return getReportPrisma().$queryRawUnsafe<RawAnalysisOeeRow[]>(
    `SELECT
      \`DATE\` AS date,
      SHIFT AS shift,
      SHIFT2 AS shift2,
      AV AS av,
      PE AS pe,
      RQ AS rq,
      OEE AS oee,
      Balance AS balance,
      OT_plan AS otPlan,
      OT_act AS otAct,
      OT_diff AS otDiff,
      actual_work_hours AS actualWorkHours
     FROM ${quoteIdentifier(summaryViewName(line.tableName))}
     WHERE \`DATE\` >= ?
       AND \`DATE\` < ?
       AND OEE IS NOT NULL
       AND TRIM(CAST(OEE AS CHAR)) <> ''
     ORDER BY \`DATE\` ASC, SHIFT ASC`,
    start,
    endExclusive,
  );
}

export async function getAnalysisProblemRows(
  line: AnalysisLine,
  selectedDate: string,
  endExclusive: string,
) {
  if (!line.problemTableName) {
    return [];
  }

  return getReportPrisma()
    .$queryRawUnsafe<RawAnalysisProblemRow[]>(
      `SELECT
        SHIFT2 AS shift2,
        Problem_AV AS problemAv,
        LS_AV_min AS lsAvMin,
        Problem_PE AS problemPe,
        LS_PE_min AS lsPeMin
       FROM ${quoteIdentifier(line.problemTableName)}
       WHERE \`DATE\` >= ? AND \`DATE\` < ?
       ORDER BY SHIFT2 ASC, LS_AV_min DESC, LS_PE_min DESC`,
      selectedDate,
      endExclusive,
    )
    .catch(() => []);
}

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function planningKey(lineKey: AnalysisLine["key"], date: string, shift: string, groupName = "") {
  return `${lineKey}:${date}:${shift}:${groupName}`;
}

function getDailyPlanningShift(line: AnalysisLine, row: RawAnalysisOeeRow) {
  if (line.key === "assyline") return normalizeShift(row.shift2) === "NIGHT" ? "2" : "1";
  return normalizeShift(row.shift) === "W" ? "2" : "1";
}

function getMonthlyPlanningGroup(line: AnalysisLine, row: RawAnalysisOeeRow) {
  return line.key === "assyline" ? "N" : normalizeShift(row.shift);
}

async function getMonthlyPlanningOt(start: string, endExclusive: string) {
  const rows = (await Promise.all(analysisLines.map((line) => getReportPrisma().$queryRawUnsafe<PlanningOtRow[]>(
    `SELECT
      ? AS lineKey,
      DATE_FORMAT(fdate, '%Y-%m-%d') AS date,
      CASE WHEN UPPER(TRIM(fshift)) IN ('1', 'DAY') THEN '1' WHEN UPPER(TRIM(fshift)) IN ('2', 'NIGHT') THEN '2' ELSE TRIM(fshift) END AS shift,
      UPPER(TRIM(fgroup)) AS groupName,
      MAX(fot) AS otHours
     FROM ${quoteIdentifier(monthlyPlanningTables[line.key])}
     WHERE fdate >= ? AND fdate < ?
     GROUP BY DATE_FORMAT(fdate, '%Y-%m-%d'), TRIM(fshift), UPPER(TRIM(fgroup))`,
    line.key,
    start,
    endExclusive,
  )))).flat();
  return new Map(rows.map((row) => [planningKey(row.lineKey, row.date, row.shift, row.groupName), toNumber(row.otHours)]));
}

async function getDailyPlanningWorkHours(start: string, endExclusive: string) {
  const rows = await prisma.$queryRawUnsafe<DailyPlanningWorkHoursRow[]>(
    `SELECT
      plan.line_key AS lineKey,
      DATE_FORMAT(plan.fdate, '%Y-%m-%d') AS date,
      TRIM(plan.fshift) AS shift,
      COALESCE(SUM(slot.prod_minutes), 0) / 60 AS workHours
     FROM t_daily_production_plan plan
     INNER JOIN t_daily_production_plan_slot slot ON slot.daily_plan_id = plan.id
     WHERE plan.fdate >= ? AND plan.fdate < ?
       AND plan.fgroup = 'all'
       AND plan.is_deleted = 0
       AND slot.is_hidden = 0
     GROUP BY plan.line_key, DATE_FORMAT(plan.fdate, '%Y-%m-%d'), TRIM(plan.fshift)`,
    start,
    endExclusive,
  );

  return new Map(rows.map((row) => [
    planningKey(row.lineKey === "assy" ? "assyline" : row.lineKey as AnalysisLine["key"], row.date, row.shift),
    toNumber(row.workHours),
  ]));
}

function getOtGapMetrics(line: AnalysisLine, row: RawAnalysisOeeRow, planning: GapPlanningData) {
  const date = toDateKey(row.date);
  const planningShift = getDailyPlanningShift(line, row);
  const monthlyOt = planning.monthlyOt.get(planningKey(line.key, date, planningShift, getMonthlyPlanningGroup(line, row))) ?? 0;
  const rawActualWorkHours = toNumber(row.actualWorkHours);
  const otPlan = monthlyOt;
  const whPlan = planning.dailyWorkHours.get(planningKey(line.key, date, planningShift)) ?? 0;
  // Assy memakai adjustment +0,5; line machining memakai +0,4.
  const workHoursAdjustment = line.key === "assyline" ? 0.5 : 0.4;
  const whAct = rawActualWorkHours > 0
    ? rawActualWorkHours + workHoursAdjustment
    : 0;

  if (rawActualWorkHours <= 0) {
    return { whPlan, whAct, otPlan, otAct: 0 };
  }

  return { whPlan, whAct, otPlan, otAct: monthlyOt >= 8 ? whAct : whAct - 8 };
}

function getOtGap(line: AnalysisLine, row: RawAnalysisOeeRow, planning: GapPlanningData) {
  const { otPlan, otAct } = getOtGapMetrics(line, row, planning);
  return otAct - otPlan;
}

function getActualWorkHoursValue(row: RawAnalysisOeeRow) {
  const value = row.actualWorkHours;

  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

// Machining summary rows can contain a 1TR and 2TR variant for the same R/W
// shift. Assy uses SHIFT2 to distinguish its Day and Night shifts.
function getOtRows(line: AnalysisLine, rows: RawAnalysisOeeRow[]) {
  const selected = new Map<string, RawAnalysisOeeRow>();

  for (const row of rows) {
    const key = line.key === "assyline"
      ? `${toDateKey(row.date)}:${normalizeShift(row.shift)}:${normalizeShift(row.shift2)}`
      : `${toDateKey(row.date)}:${normalizeShift(row.shift)}`;
    const existing = selected.get(key);

    if (!existing) {
      selected.set(key, row);
      continue;
    }

    const nextActual = getActualWorkHoursValue(row);
    const currentActual = getActualWorkHoursValue(existing);

    if (nextActual !== null && (currentActual === null || nextActual > currentActual)) {
      selected.set(key, row);
    }
  }

  return Array.from(selected.values());
}

function toDateKey(value: unknown) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function getTodayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string | null) {
  const date = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getTodayKey();
  const [year, month, day] = date.split("-").map(Number);
  const endDate = new Date(Date.UTC(year, month - 1, day));
  const start = `${date.slice(0, 7)}-01`;
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const endExclusive = nextDate.toISOString().slice(0, 10);

  return {
    date,
    start,
    endExclusive,
    year,
    month,
    dayCount: endDate.getUTCDate(),
  };
}

function getRangeDays(year: number, month: number, dayCount: number) {
  return Array.from({ length: dayCount }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${year}-${String(month).padStart(2, "0")}-${day}`;
  });
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function normalizeShift(value: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

function getPrimaryShift(line: AnalysisLine) {
  return normalizeShift(line.sourceShift ?? "R");
}

function getSecondaryShift(line: AnalysisLine) {
  return line.shiftMode === "single" ? null : "W";
}

function sumAverageByGroup(
  rows: RawAnalysisOeeRow[],
  getGroupKey: (row: RawAnalysisOeeRow) => string,
  getValue: (row: RawAnalysisOeeRow) => number,
) {
  const grouped = new Map<string, number[]>();

  for (const row of rows) {
    const groupKey = getGroupKey(row);

    if (!groupKey) {
      continue;
    }

    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), getValue(row)]);
  }

  return Array.from(grouped.values()).reduce((total, values) => {
    return total + (average(values) ?? 0);
  }, 0);
}

function buildProblemNote(rows: RawAnalysisProblemRow[]) {
  const grouped = {
    day: [] as Array<{ label: string; value: number; type: "AV" | "PE" }>,
    night: [] as Array<{ label: string; value: number; type: "AV" | "PE" }>,
  };

  for (const row of rows) {
    const shift2 = normalizeShift(row.shift2);
    const target = shift2 === "DAY" ? grouped.day : shift2 === "NIGHT" ? grouped.night : null;

    if (!target) {
      continue;
    }

    const avValue = toNumber(row.lsAvMin);
    const peValue = toNumber(row.lsPeMin);
    const avLabel = String(row.problemAv ?? "").trim();
    const peLabel = String(row.problemPe ?? "").trim();

    if (avLabel && avValue > 0) {
      target.push({ label: avLabel, value: avValue, type: "AV" });
    }

    if (peLabel && peValue > 0) {
      target.push({ label: peLabel, value: peValue, type: "PE" });
    }
  }

  return {
    day: grouped.day.sort((a, b) => b.value - a.value)[0] ?? null,
    night: grouped.night.sort((a, b) => b.value - a.value)[0] ?? null,
  };
}

function buildCard(
  line: AnalysisLine,
  rows: RawAnalysisOeeRow[],
  problemRows: RawAnalysisProblemRow[],
  selectedDate: string,
  planning: GapPlanningData,
): AnalysisOeeCard {
  const selectedRows = rows.filter((row) => toDateKey(row.date) === selectedDate);
  const otRows = getOtRows(line, rows);
  const selectedOtRows = otRows.filter((row) => toDateKey(row.date) === selectedDate);
  const primaryShift = getPrimaryShift(line);
  const secondaryShift = getSecondaryShift(line);
  const selectedRRows = selectedRows.filter((row) => normalizeShift(row.shift) === primaryShift);
  const selectedWRows = secondaryShift
    ? selectedRows.filter((row) => normalizeShift(row.shift) === secondaryShift)
    : [];
  const selectedDayRows = selectedOtRows.filter((row) => normalizeShift(row.shift2) === "DAY");
  const selectedNightRows = selectedOtRows.filter((row) => normalizeShift(row.shift2) === "NIGHT");
  const dailyR = average(selectedRRows.map((row) => toNumber(row.oee)));
  const dailyW = average(selectedWRows.map((row) => toNumber(row.oee)));
  const dailyAverage = average([dailyR, dailyW].filter((value) => value !== null));
  const allValues = rows.map((row) => toNumber(row.oee));
  const monthlyRRows = otRows.filter((row) => normalizeShift(row.shift) === primaryShift);
  const monthlyWRows = secondaryShift
    ? otRows.filter((row) => normalizeShift(row.shift) === secondaryShift)
    : [];
  const balanceDivisor = line.key === "camshaft" ? 2 : 1;

  return {
    key: line.key,
    line: line.label,
    r: dailyR,
    w: dailyW,
    ave: dailyAverage,
    monthly: average(allValues),
    balance:
      selectedRows.reduce((total, row) => total + toNumber(row.balance), 0) /
      balanceDivisor,
    balanceMonthly:
      rows.reduce((total, row) => total + toNumber(row.balance), 0) / balanceDivisor,
    balanceActual: null,
    balancePlan: null,
    balanceMonthlyActual: null,
    balanceMonthlyPlan: null,
    otDay: selectedDayRows.reduce((total, row) => total + getOtGapMetrics(line, row, planning).otAct, 0),
    otNight: selectedNightRows.reduce((total, row) => total + getOtGapMetrics(line, row, planning).otAct, 0),
    cumR: sumAverageByGroup(
      monthlyRRows,
      (row) => `${toDateKey(row.date)}:${normalizeShift(row.shift)}`,
      (row) => getOtGapMetrics(line, row, planning).otAct,
    ),
    cumW: sumAverageByGroup(
      monthlyWRows,
      (row) => `${toDateKey(row.date)}:${normalizeShift(row.shift)}`,
      (row) => getOtGapMetrics(line, row, planning).otAct,
    ),
    gapCumR: sumAverageByGroup(
      monthlyRRows,
      (row) => `${toDateKey(row.date)}:${normalizeShift(row.shift)}`,
      (row) => getOtGap(line, row, planning),
    ),
    gapCumW: sumAverageByGroup(
      monthlyWRows,
      (row) => `${toDateKey(row.date)}:${normalizeShift(row.shift)}`,
      (row) => getOtGap(line, row, planning),
    ),
    note: buildProblemNote(problemRows),
  };
}

function buildDailyAverage(rows: RawAnalysisOeeRow[], key: "oee" | "av" | "pe" | "rq") {
  const grouped = new Map<string, number[]>();

  for (const row of rows) {
    const date = toDateKey(row.date);

    if (!date) {
      continue;
    }

    grouped.set(date, [...(grouped.get(date) ?? []), toNumber(row[key])]);
  }

  return new Map(
    Array.from(grouped.entries()).map(([date, values]) => [date, average(values)]),
  );
}

function buildDailyShiftAverage(
  line: AnalysisLine,
  rows: RawAnalysisOeeRow[],
  key: "oee" | "av" | "pe" | "rq",
) {
  const grouped = new Map<string, { r: number[]; w: number[] }>();
  const primaryShift = getPrimaryShift(line);
  const secondaryShift = getSecondaryShift(line);

  for (const row of rows) {
    const date = toDateKey(row.date);

    if (!date) {
      continue;
    }

    const current = grouped.get(date) ?? { r: [], w: [] };

    if (normalizeShift(row.shift) === primaryShift) {
      current.r.push(toNumber(row[key]));
    }

    if (secondaryShift && normalizeShift(row.shift) === secondaryShift) {
      current.w.push(toNumber(row[key]));
    }

    grouped.set(date, current);
  }

  return new Map(
    Array.from(grouped.entries()).map(([date, values]) => [
      date,
      {
        r: average(values.r),
        w: average(values.w),
      },
    ]),
  );
}

function buildDailyGap(line: AnalysisLine, rows: RawAnalysisOeeRow[], planning: GapPlanningData) {
  const grouped = new Map<string, { r: Array<{ gap: number; whPlan: number; whAct: number; otPlan: number; otAct: number }>; w: Array<{ gap: number; whPlan: number; whAct: number; otPlan: number; otAct: number }> }>();
  const primaryShift = getPrimaryShift(line);
  const secondaryShift = getSecondaryShift(line);

  for (const row of getOtRows(line, rows)) {
    const date = toDateKey(row.date);

    if (!date) {
      continue;
    }

    const current = grouped.get(date) ?? { r: [], w: [] };
    const metrics = getOtGapMetrics(line, row, planning);
    const value = { gap: metrics.otAct - metrics.otPlan, ...metrics };

    if (normalizeShift(row.shift) === primaryShift) {
      current.r.push(value);
    }

    if (secondaryShift && normalizeShift(row.shift) === secondaryShift) {
      current.w.push(value);
    }

    grouped.set(date, current);
  }

  return new Map(
    Array.from(grouped.entries()).map(([date, value]) => [
      date,
      {
        r: value.r.length ? { gap: average(value.r.map((item) => item.gap)) ?? 0, whPlan: average(value.r.map((item) => item.whPlan)) ?? 0, whAct: average(value.r.map((item) => item.whAct)) ?? 0, otPlan: average(value.r.map((item) => item.otPlan)) ?? 0, otAct: average(value.r.map((item) => item.otAct)) ?? 0 } : null,
        w: value.w.length ? { gap: average(value.w.map((item) => item.gap)) ?? 0, whPlan: average(value.w.map((item) => item.whPlan)) ?? 0, whAct: average(value.w.map((item) => item.whAct)) ?? 0, otPlan: average(value.w.map((item) => item.otPlan)) ?? 0, otAct: average(value.w.map((item) => item.otAct)) ?? 0 } : null,
      },
    ]),
  );
}

function planningShiftName(value: string | null) {
  const shift = normalizeShift(value);
  return shift === "2" || shift === "NIGHT" ? "NIGHT" : "DAY";
}

function productionBalanceKey(lineKey: AnalysisLine["key"], date: string, groupName: string, shiftName: string) {
  return `${lineKey}:${date}:${groupName}:${shiftName}`;
}

async function getMonthlyProductionBalances(
  start: string,
  endExclusive: string,
  source: "manual" | "realtime",
) {
  const [plans, actualEntries] = await Promise.all([
    (await Promise.all(analysisLines.map((line) => getReportPrisma().$queryRawUnsafe<MonthlyProductionPlanRow[]>(
      `SELECT
        ? AS lineKey,
        DATE_FORMAT(fdate, '%Y-%m-%d') AS date,
        TRIM(fshift) AS shift,
        UPPER(TRIM(fgroup)) AS groupName,
        SUM(COALESCE(f1tr, 0)) AS oneTr,
        SUM(COALESCE(f2tr, 0)) AS twoTr
       FROM ${quoteIdentifier(monthlyPlanningTables[line.key])}
       WHERE fdate >= ? AND fdate < ?
       GROUP BY DATE_FORMAT(fdate, '%Y-%m-%d'), TRIM(fshift), UPPER(TRIM(fgroup))`,
      line.key,
      start,
      endExclusive,
    )))).flat(),
    Promise.all(analysisLines.map(async (line) => ({
      line,
      rows: await getReportPrisma().$queryRawUnsafe<ProductionActualRow[]>(
        `SELECT
          \`DATE\` AS date,
          SHIFT AS shift,
          SHIFT2 AS shift2,
          Prod_act AS prodAct,
          ${line.key === "assyline" ? "NULL" : "Prod_realtime"} AS prodRealtime
         FROM ${quoteIdentifier(summaryViewName(line.tableName ?? ""))}
         WHERE \`DATE\` >= ? AND \`DATE\` < ?`,
        start,
        endExclusive,
      ),
    }))),
  ]);
  const planByKey = new Map<string, number>();
  const actualByKey = new Map<string, number>();

  for (const plan of plans) {
    const key = productionBalanceKey(
      plan.lineKey,
      plan.date,
      normalizeShift(plan.groupName),
      planningShiftName(plan.shift),
    );
    const target = toNumber(plan.oneTr) + toNumber(plan.twoTr);
    planByKey.set(key, target);
  }

  for (const { line, rows } of actualEntries) {
    for (const row of rows) {
      const date = toDateKey(row.date);
      if (!date) continue;
      const groupName = line.key === "assyline" ? "N" : normalizeShift(row.shift);
      const key = productionBalanceKey(line.key, date, groupName, planningShiftName(row.shift2));
      const actual = source === "manual" || line.key === "assyline"
        ? toNumber(row.prodAct)
        : toNumber(row.prodRealtime);
      actualByKey.set(key, (actualByKey.get(key) ?? 0) + actual);
    }
  }

  const balances = new Map<string, ProductionBalance>();
  for (const [key, target] of planByKey) {
    const lineKey = key.split(":", 1)[0] as AnalysisLine["key"];
    const actual = actualByKey.get(key) ?? 0;
    const normalizedActual = lineKey === "camshaft" ? Math.round(actual / 2) : actual;
    const normalizedTarget = lineKey === "camshaft" ? Math.round(target / 2) : target;
    const [line, date] = key.split(":");
    const dailyKey = `${line}:${date}`;
    const current = balances.get(dailyKey) ?? { actual: 0, target: 0 };
    balances.set(dailyKey, {
      actual: current.actual + normalizedActual,
      target: current.target + normalizedTarget,
    });
  }

  return balances;
}

function applyMonthlyProductionBalances(
  cards: AnalysisOeeCard[],
  dates: string[],
  selectedDate: string,
  balances: Map<string, ProductionBalance>,
) {
  return cards.map((card) => {
    const selected = balances.get(`${card.key}:${selectedDate}`);
    const monthly = dates
      .map((date) => balances.get(`${card.key}:${date}`))
      .filter((value): value is ProductionBalance => value !== undefined);
    const monthlyActual = monthly.reduce((total, value) => total + value.actual, 0);
    const monthlyTarget = monthly.reduce((total, value) => total + value.target, 0);

    return {
      ...card,
      balance: selected ? selected.actual - selected.target : null,
      balanceMonthly: monthly.length
        ? monthlyActual - monthlyTarget
        : null,
      balanceActual: selected?.actual ?? null,
      balancePlan: selected?.target ?? null,
      balanceMonthlyActual: monthly.length ? monthlyActual : null,
      balanceMonthlyPlan: monthly.length ? monthlyTarget : null,
    };
  });
}

function getRealtimeSlotProgress(date: string, slot: RealtimePlanningSlotRow, now: Date) {
  const [year, month, day] = date.split("-").map(Number);
  const [startHour, startMinute] = slot.startTime.split(":").map(Number);
  const [endHour, endMinute] = slot.endTime.split(":").map(Number);
  const start = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
  const end = new Date(year, month - 1, day, endHour, endMinute, 0, 0);

  if (slot.shift === "2" && startHour < 12) {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  }

  if (end <= start) end.setDate(end.getDate() + 1);
  if (now <= start) return 0;
  if (now >= end) return 1;
  return (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
}

function getRealtimeBoardShift(line: AnalysisLine, row: RealtimeSummaryRow) {
  if (line.key === "assyline") {
    return normalizeShift(row.shift2) === "NIGHT" ? "W" : "R";
  }

  return normalizeShift(row.shift) === "W" ? "W" : "R";
}

async function getRealtimeBoardMetrics(start: string, endExclusive: string) {
  const [summaryEntries, planningSlots] = await Promise.all([
    Promise.all(analysisLines.map(async (line) => ({
      line,
      rows: await getReportPrisma().$queryRawUnsafe<RealtimeSummaryRow[]>(
        `SELECT
          \`DATE\` AS date,
          SHIFT AS shift,
          SHIFT2 AS shift2,
          TT AS tt,
          Prod_act AS prodAct,
          ${line.key === "assyline" ? "NULL" : "Prod_realtime"} AS prodRealtime
         FROM ${quoteIdentifier(summaryViewName(line.tableName ?? ""))}
         WHERE \`DATE\` >= ? AND \`DATE\` < ?
         ORDER BY \`DATE\` ASC, SHIFT ASC`,
        start,
        endExclusive,
      ),
    }))),
    prisma.$queryRawUnsafe<RealtimePlanningSlotRow[]>(
      `SELECT
        plan.line_key AS lineKey,
        DATE_FORMAT(plan.fdate, '%Y-%m-%d') AS date,
        TRIM(plan.fshift) AS shift,
        TIME_FORMAT(slot.start_time, '%H:%i') AS startTime,
        TIME_FORMAT(slot.end_time, '%H:%i') AS endTime,
        slot.prod_minutes AS prodMinutes
       FROM t_daily_production_plan_slot slot
       INNER JOIN t_daily_production_plan plan ON plan.id = slot.daily_plan_id
       WHERE plan.fdate >= ? AND plan.fdate < ?
         AND plan.is_deleted = 0 AND slot.is_hidden = 0 AND slot.prod_minutes > 0
         AND (plan.fgroup = 'all' OR NOT EXISTS (
           SELECT 1 FROM t_daily_production_plan all_plan
           WHERE all_plan.line_key = plan.line_key AND all_plan.fdate = plan.fdate
             AND all_plan.fshift = plan.fshift AND all_plan.fgroup = 'all'
         ))
       ORDER BY plan.line_key ASC, plan.fdate ASC, plan.fshift ASC, slot.slot_order ASC`,
      start,
      endExclusive,
    ),
  ]);
  const actuals = new Map<string, { production: number; tt: number | null; hasRows: boolean }>();
  const plans = new Map<string, { workMinutes: number }>();
  const now = new Date();

  for (const { line, rows } of summaryEntries) {
    for (const row of rows) {
      const date = toDateKey(row.date);
      if (!date) continue;
      const shift = getRealtimeBoardShift(line, row);
      const key = `${line.key}:${date}:${shift}`;
      const current = actuals.get(key) ?? { production: 0, tt: null, hasRows: false };
      current.production += toNumber(line.key === "assyline" ? row.prodAct : row.prodRealtime);
      const tt = toNumber(row.tt);
      if (current.tt === null && tt > 0) current.tt = tt;
      current.hasRows = true;
      actuals.set(key, current);
    }
  }

  for (const slot of planningSlots) {
    const lineKey = slot.lineKey === "assy" ? "assyline" : slot.lineKey;
    if (!analysisLines.some((line) => line.key === lineKey)) continue;
    const shift = slot.shift === "2" ? "W" : "R";
    const key = `${lineKey}:${slot.date}:${shift}`;
    const current = plans.get(key) ?? { workMinutes: 0 };
    const progress = getRealtimeSlotProgress(slot.date, slot, now);
    current.workMinutes += toNumber(slot.prodMinutes) * progress;
    plans.set(key, current);
  }

  const metrics = new Map<string, RealtimeMetric>();
  for (const [key, actual] of actuals) {
    const plan = plans.get(key);
    if (!plan || actual.tt === null || plan.workMinutes <= 0) {
      metrics.set(key, { oee: null });
      continue;
    }

    const lineKey = key.split(":", 1)[0];
    const production = lineKey === "camshaft" ? actual.production / 2 : actual.production;
    metrics.set(key, {
      oee: (production * actual.tt * 100) / plan.workMinutes,
    });
  }

  return metrics;
}

export async function getAnalysisOeeRealtime(dateParam: string | null) {
  const base = await getManualAnalysisOee(dateParam);
  const endExclusive = new Date(`${base.date}T12:00:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const rangeEnd = `${endExclusive.getFullYear()}-${String(endExclusive.getMonth() + 1).padStart(2, "0")}-${String(endExclusive.getDate()).padStart(2, "0")}`;
  const [realtimeMetrics, realtimeBalances] = await Promise.all([
    getRealtimeBoardMetrics(base.start, rangeEnd),
    getMonthlyProductionBalances(base.start, rangeEnd, "realtime"),
  ]);
  const dailyByLine = new Map<string, Map<string, { r: RealtimeMetric | null; w: RealtimeMetric | null }>>();

  for (const line of analysisLines) {
    const byDate = new Map<string, { r: RealtimeMetric | null; w: RealtimeMetric | null }>();
    for (const row of base.shiftSeries) {
      byDate.set(row.date, {
        r: realtimeMetrics.get(`${line.key}:${row.date}:R`) ?? null,
        w: realtimeMetrics.get(`${line.key}:${row.date}:W`) ?? null,
      });
    }
    dailyByLine.set(line.key, byDate);
  }

  const cards = base.cards.map((card) => {
    const values = dailyByLine.get(card.key);
    const selected = values?.get(base.date) ?? { r: null, w: null };
    const dailyOee = card.key === "assyline"
      ? average([selected.r?.oee, selected.w?.oee].filter((value): value is number => value !== null && value !== undefined))
      : null;
    const monthlyDailyOee = Array.from(values?.values() ?? []).map((item) =>
      card.key === "assyline"
        ? average([item.r?.oee, item.w?.oee].filter((value): value is number => value !== null && value !== undefined))
        : average([item.r?.oee, item.w?.oee].filter((value): value is number => value !== null && value !== undefined)),
    ).filter((value): value is number => value !== null);
    return {
      ...card,
      r: card.key === "assyline" ? dailyOee : selected.r?.oee ?? null,
      w: card.key === "assyline" ? null : selected.w?.oee ?? null,
      ave: card.key === "assyline" ? dailyOee : average([selected.r?.oee, selected.w?.oee].filter((value): value is number => value !== null && value !== undefined)),
      monthly: average(monthlyDailyOee),
    };
  });

  const shiftSeries = base.shiftSeries.map((row) => {
    const next = { ...row };
    for (const line of analysisLines) {
      const values = dailyByLine.get(line.key)?.get(row.date);
      if (line.key === "assyline") {
        next[`${line.key}R`] = average([values?.r?.oee, values?.w?.oee].filter((value): value is number => value !== null && value !== undefined));
        next[`${line.key}W`] = null;
      } else {
        next[`${line.key}R`] = values?.r?.oee ?? null;
        next[`${line.key}W`] = values?.w?.oee ?? null;
      }
    }
    return next;
  });

  return {
    ...base,
    cards: applyMonthlyProductionBalances(cards, base.shiftSeries.map((row) => row.date), base.date, realtimeBalances),
    shiftSeries,
  };
}

async function getManualAnalysisOee(dateParam: string | null) {
  const range = parseDate(dateParam);
  const days = getRangeDays(range.year, range.month, range.dayCount);
  const [entries, machiningEmergencyStock, machiningModuleExportStock, machiningAdvancedStock, machiningBalanceStock, shipmentVanning, monthlyOt, dailyWorkHours, monthlyProductionBalances] = await Promise.all([
    Promise.all(
    analysisLines.map(async (line) => {
      const [rows, problemRows] = await Promise.all([
        getAnalysisLineRows(line, range.start, range.endExclusive),
        getAnalysisProblemRows(line, range.date, range.endExclusive),
      ]);

      return { line, rows, problemRows };
    }),
    ),
    getMachiningEmergencyStock(range.date),
    getMachiningModuleExportStock(range.date),
    getMachiningAdvancedStock(range.date),
    getMachiningBalanceStock(range.date),
    getAsakaiShipmentVanning(range.date),
    getMonthlyPlanningOt(range.start, range.endExclusive),
    getDailyPlanningWorkHours(range.start, range.endExclusive),
    getMonthlyProductionBalances(range.start, range.endExclusive, "manual"),
  ]);
  const gapPlanning = { monthlyOt, dailyWorkHours };
  const baseCards = entries.map((entry) =>
    buildCard(entry.line, entry.rows, entry.problemRows, range.date, gapPlanning),
  );
  const cards = applyMonthlyProductionBalances(baseCards, days, range.date, monthlyProductionBalances);
  const dailyByLine = new Map(
    entries.map((entry) => [entry.line.key, buildDailyAverage(entry.rows, "oee")]),
  );
  const dailyShiftByLine = new Map(
    entries.map((entry) => [
      entry.line.key,
      buildDailyShiftAverage(entry.line, entry.rows, "oee"),
    ]),
  );
  const avByLine = new Map(
    entries.map((entry) => [entry.line.key, buildDailyAverage(entry.rows, "av")]),
  );
  const avShiftByLine = new Map(
    entries.map((entry) => [
      entry.line.key,
      buildDailyShiftAverage(entry.line, entry.rows, "av"),
    ]),
  );
  const peByLine = new Map(
    entries.map((entry) => [entry.line.key, buildDailyAverage(entry.rows, "pe")]),
  );
  const peShiftByLine = new Map(
    entries.map((entry) => [
      entry.line.key,
      buildDailyShiftAverage(entry.line, entry.rows, "pe"),
    ]),
  );
  const rqByLine = new Map(
    entries.map((entry) => [entry.line.key, buildDailyAverage(entry.rows, "rq")]),
  );
  const rqShiftByLine = new Map(
    entries.map((entry) => [
      entry.line.key,
      buildDailyShiftAverage(entry.line, entry.rows, "rq"),
    ]),
  );
  const gapByLine = new Map(
    entries.map((entry) => [entry.line.key, buildDailyGap(entry.line, entry.rows, gapPlanning)]),
  );
  const series = days.map((date) => {
    const row = { date } as AnalysisOeeSeriesRow;

    for (const line of analysisLines) {
      row[line.key] = dailyByLine.get(line.key)?.get(date) ?? null;
    }

    return row;
  });
  const gapSeries = days.map((date) => {
    const row = { date, gapDetails: {} } as AnalysisGapSeriesRow;

    for (const line of analysisLines) {
      const values = gapByLine.get(line.key)?.get(date);
      row[`${line.key}R`] = values?.r?.gap ?? null;
      row[`${line.key}W`] = values?.w?.gap ?? null;
      if (values?.r) row.gapDetails[`${line.key}R`] = { whPlan: values.r.whPlan, whAct: values.r.whAct, otPlan: values.r.otPlan, otAct: values.r.otAct };
      if (values?.w) row.gapDetails[`${line.key}W`] = { whPlan: values.w.whPlan, whAct: values.w.whAct, otPlan: values.w.otPlan, otAct: values.w.otAct };
    }

    return row;
  });
  const shiftSeries = days.map((date) => {
    const row = { date } as AnalysisShiftSeriesRow;

    for (const line of analysisLines) {
      const values = dailyShiftByLine.get(line.key)?.get(date);
      row[`${line.key}R`] = values?.r ?? null;
      row[`${line.key}W`] = values?.w ?? null;
    }

    return row;
  });
  const rqShiftSeries = days.map((date) => {
    const row = { date } as AnalysisShiftSeriesRow;

    for (const line of analysisLines) {
      const values = rqShiftByLine.get(line.key)?.get(date);
      row[`${line.key}R`] = values?.r ?? null;
      row[`${line.key}W`] = values?.w ?? null;
    }

    return row;
  });
  const avShiftSeries = days.map((date) => {
    const row = { date } as AnalysisShiftSeriesRow;

    for (const line of analysisLines) {
      const values = avShiftByLine.get(line.key)?.get(date);
      row[`${line.key}R`] = values?.r ?? null;
      row[`${line.key}W`] = values?.w ?? null;
    }

    return row;
  });
  const peShiftSeries = days.map((date) => {
    const row = { date } as AnalysisShiftSeriesRow;

    for (const line of analysisLines) {
      const values = peShiftByLine.get(line.key)?.get(date);
      row[`${line.key}R`] = values?.r ?? null;
      row[`${line.key}W`] = values?.w ?? null;
    }

    return row;
  });
  const rqSeries = days.map((date) => {
    const row = { date } as AnalysisOeeSeriesRow;

    for (const line of analysisLines) {
      row[line.key] = rqByLine.get(line.key)?.get(date) ?? null;
    }

    return row;
  });
  const avSeries = days.map((date) => {
    const row = { date } as AnalysisOeeSeriesRow;

    for (const line of analysisLines) {
      row[line.key] = avByLine.get(line.key)?.get(date) ?? null;
    }

    return row;
  });
  const peSeries = days.map((date) => {
    const row = { date } as AnalysisOeeSeriesRow;

    for (const line of analysisLines) {
      row[line.key] = peByLine.get(line.key)?.get(date) ?? null;
    }

    return row;
  });

  const [lsrWeekly, lsrKpi, lsrAmountBase] = await Promise.all([
    getLsrWeeklyData(range.date.slice(0, 7)),
    getLsrAsakaiKpiData(range.date),
    getLsrAmountBaseData(range.date),
  ]);
  return {
    date: range.date,
    start: range.start,
    end: range.date,
    cards,
    series,
    shiftSeries,
    gapSeries,
    avSeries,
    avShiftSeries,
    peSeries,
    peShiftSeries,
    rqSeries,
    rqShiftSeries,
    machiningEmergencyStock,
    machiningModuleExportStock,
    machiningAdvancedStock,
    machiningBalanceStock,
    shipmentVanning: shipmentVanning as AnalysisAsakaiShipmentVanning,
    lsrWeekly,
    lsrKpi,
    lsrAmountBase,
    lines: analysisLines.map(({ key, label, shiftMode, displayShiftLabel }) => ({
      key,
      label,
      shiftMode,
      displayShiftLabel,
    })),
  };

}

export async function getAnalysisOee(
  dateParam: string | null,
  mode: "manual" | "realtime" = "manual",
) {
  return mode === "realtime"
    ? getAnalysisOeeRealtime(dateParam)
    : getManualAnalysisOee(dateParam);
}
