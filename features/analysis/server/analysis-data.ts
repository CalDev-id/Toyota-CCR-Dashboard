import type {
  AnalysisGapSeriesRow,
  AnalysisLine,
  AnalysisOeeCard,
  AnalysisOeeSeriesRow,
  AnalysisShiftSeriesRow,
  RawAnalysisProblemRow,
  RawAnalysisOeeRow,
} from "@/features/analysis/types";
import { getReportPrisma } from "@/lib/report-prisma";
import { summaryViewName } from "@/lib/report-views";

export const analysisLines: AnalysisLine[] = [
  {
    key: "assyline",
    label: "Assy Line",
    tableName: summaryViewName("v_assy_summary"),
    problemTableName: "v_assy_detail_problem",
    shiftMode: "single",
    sourceShift: "N",
    displayShiftLabel: "N",
  },
  {
    key: "cylblock",
    label: "Cyl Block",
    tableName: summaryViewName("v_cylblock_summary"),
    problemTableName: "v_cylblock_detail_problem",
  },
  {
    key: "cylhead",
    label: "Cyl Head",
    tableName: summaryViewName("v_cylhead_summary"),
    problemTableName: "v_cylhead_detail_problem",
  },
  {
    key: "crankshaft",
    label: "Crankshaft",
    tableName: summaryViewName("v_crankshaft_summary"),
    problemTableName: "v_crankshaft_detail_problem",
  },
  {
    key: "camshaft",
    label: "Camshaft",
    tableName: summaryViewName("v_camshaft_summary"),
    problemTableName: "v_camshaft_detail_problem",
  },
];

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
      OT_diff AS otDiff
     FROM ${quoteIdentifier(line.tableName)}
     WHERE \`DATE\` >= ? AND \`DATE\` < ?
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

function getEffectiveOtPlan(line: AnalysisLine, row: RawAnalysisOeeRow) {
  const otPlan = toNumber(row.otPlan);

  if (otPlan >= 8) {
    return otPlan - 8;
  }

  return otPlan;
}

function getOtGap(line: AnalysisLine, row: RawAnalysisOeeRow) {
  return toNumber(row.otAct) - getEffectiveOtPlan(line, row);
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

function sumAverageOtByGroup(
  rows: RawAnalysisOeeRow[],
  getGroupKey: (row: RawAnalysisOeeRow) => string,
) {
  const grouped = new Map<string, number[]>();

  for (const row of rows) {
    const groupKey = getGroupKey(row);

    if (!groupKey) {
      continue;
    }

    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), toNumber(row.otAct)]);
  }

  return Array.from(grouped.values()).reduce((total, values) => {
    return total + (average(values) ?? 0);
  }, 0);
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
): AnalysisOeeCard {
  const selectedRows = rows.filter((row) => toDateKey(row.date) === selectedDate);
  const primaryShift = getPrimaryShift(line);
  const secondaryShift = getSecondaryShift(line);
  const selectedRRows = selectedRows.filter((row) => normalizeShift(row.shift) === primaryShift);
  const selectedWRows = secondaryShift
    ? selectedRows.filter((row) => normalizeShift(row.shift) === secondaryShift)
    : [];
  const selectedDayRows = selectedRows.filter((row) => normalizeShift(row.shift2) === "DAY");
  const selectedNightRows = selectedRows.filter((row) => normalizeShift(row.shift2) === "NIGHT");
  const dailyR = average(selectedRRows.map((row) => toNumber(row.oee)));
  const dailyW = average(selectedWRows.map((row) => toNumber(row.oee)));
  const dailyAverage = average([dailyR, dailyW].filter((value) => value !== null));
  const allValues = rows.map((row) => toNumber(row.oee));
  const monthlyRRows = rows.filter((row) => normalizeShift(row.shift) === primaryShift);
  const monthlyWRows = secondaryShift
    ? rows.filter((row) => normalizeShift(row.shift) === secondaryShift)
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
    otDay: sumAverageOtByGroup(
      selectedDayRows,
      (row) => `${toDateKey(row.date)}:${normalizeShift(row.shift2)}`,
    ),
    otNight: sumAverageOtByGroup(
      selectedNightRows,
      (row) => `${toDateKey(row.date)}:${normalizeShift(row.shift2)}`,
    ),
    cumR: sumAverageOtByGroup(
      monthlyRRows,
      (row) => `${toDateKey(row.date)}:${normalizeShift(row.shift)}`,
    ),
    cumW: sumAverageOtByGroup(
      monthlyWRows,
      (row) => `${toDateKey(row.date)}:${normalizeShift(row.shift)}`,
    ),
    gapCumR: sumAverageByGroup(
      monthlyRRows,
      (row) => `${toDateKey(row.date)}:${normalizeShift(row.shift)}`,
      (row) => getOtGap(line, row),
    ),
    gapCumW: sumAverageByGroup(
      monthlyWRows,
      (row) => `${toDateKey(row.date)}:${normalizeShift(row.shift)}`,
      (row) => getOtGap(line, row),
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

function buildDailyGap(line: AnalysisLine, rows: RawAnalysisOeeRow[]) {
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
      current.r.push(getOtGap(line, row));
    }

    if (secondaryShift && normalizeShift(row.shift) === secondaryShift) {
      current.w.push(getOtGap(line, row));
    }

    grouped.set(date, current);
  }

  return new Map(
    Array.from(grouped.entries()).map(([date, value]) => [
      date,
      {
        r: average(value.r) ?? 0,
        w: average(value.w) ?? 0,
      },
    ]),
  );
}

export async function getAnalysisOee(dateParam: string | null) {
  const range = parseDate(dateParam);
  const days = getRangeDays(range.year, range.month, range.dayCount);
  const entries = await Promise.all(
    analysisLines.map(async (line) => {
      const [rows, problemRows] = await Promise.all([
        getAnalysisLineRows(line, range.start, range.endExclusive),
        getAnalysisProblemRows(line, range.date, range.endExclusive),
      ]);

      return { line, rows, problemRows };
    }),
  );
  const cards = entries.map((entry) =>
    buildCard(entry.line, entry.rows, entry.problemRows, range.date),
  );
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
    entries.map((entry) => [entry.line.key, buildDailyGap(entry.line, entry.rows)]),
  );
  const series = days.map((date) => {
    const row = { date } as AnalysisOeeSeriesRow;

    for (const line of analysisLines) {
      row[line.key] = dailyByLine.get(line.key)?.get(date) ?? null;
    }

    return row;
  });
  const gapSeries = days.map((date) => {
    const row = { date } as AnalysisGapSeriesRow;

    for (const line of analysisLines) {
      const values = gapByLine.get(line.key)?.get(date);
      row[`${line.key}R`] = values?.r ?? null;
      row[`${line.key}W`] = values?.w ?? null;
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
    lines: analysisLines.map(({ key, label, shiftMode, displayShiftLabel }) => ({
      key,
      label,
      shiftMode,
      displayShiftLabel,
    })),
  };
}
