import "server-only";

import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const requiredHeaders = [
  "Date",
  "Line",
  "Type",
  "Unit/Module",
  "Module_Code",
  "Target_Day",
  "Target_Module",
  "Act_Module",
  "Actual_Stock_Unit_ES_PackComp_New",
  "Act_Local",
  "Actual_Stock_Unit_ADV_New",
  "Balance_Stock_ADV_New",
] as const;

const importSheetName = "Input_Act_Stock";

type StockRow = {
  date: string;
  line: string;
  type: string;
  unitModule: number;
  moduleCode: string | null;
  targetDay: number | null;
  targetModule: number | null;
  actModule: number | null;
  actualStockUnitEsPackcompNew: number | null;
  actLocal: number | null;
  actualStockUnitAdv: number | null;
  balanceStockAdvNew: number | null;
};

export type AsakaiStockValueUpdate = {
  moduleCode: string;
  targetDay: string;
  targetModule: string;
  actModule: string;
  actualStockUnitEsPackcompNew: string;
  actLocal: string;
  actualStockUnitAdv: string;
  balanceStockAdvNew: string;
};

export type AsakaiStockRow = StockRow & { id: number };

export type AsakaiStockImportConflict = Pick<StockRow, "date" | "line" | "type">;

export type EmergencyStockMetrics = {
  balancePallet: number;
  targetPallet: number;
  actPallet: number;
  actUnit: number;
  actDay: number;
};

type EmergencyStockGroup = "cb1" | "cb2" | "ch1" | "ch2" | "cr1" | "cr2" | "cam1" | "cam2";

export type MachiningEmergencyStock = Record<EmergencyStockGroup, {
  total: EmergencyStockMetrics;
  local: EmergencyStockMetrics;
  export: EmergencyStockMetrics;
}>;

export type MachiningModuleExportStock = Record<EmergencyStockGroup, {
  total: EmergencyStockMetrics;
  modules: Record<string, EmergencyStockMetrics>;
}>;

type AdvancedStockGroup = "cylBlock" | "cylHead" | "crankshaft" | "camshaft";

export type MachiningAdvancedStock = Record<AdvancedStockGroup, {
  actualUnit: number;
  balanceUnit: number;
}>;

type MachiningBalanceStockGroup = "cylblock" | "cylhead" | "crankshaft" | "camshaft";

export type MachiningBalanceStock = Record<MachiningBalanceStockGroup, {
  emergency: number | null;
  exportModule: number | null;
}>;

type DatabaseStockRow = StockRow & { id: number };

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDate(value);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const text = String(value ?? "").trim();
  const indonesiaDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (indonesiaDate) {
    return `${indonesiaDate[3]}-${indonesiaDate[2].padStart(2, "0")}-${indonesiaDate[1].padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : formatDate(parsed);
}

function numberOrNull(value: unknown, header: string) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(parsed)) throw new Error(`${header} must be a number`);
  return parsed;
}

function textOrNull(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function keyFor(row: Pick<StockRow, "date" | "line" | "type" | "unitModule">) {
  return `${row.date}||${row.line}||${row.type}||${row.unitModule}`;
}

function hasChanged(existing: DatabaseStockRow, incoming: StockRow) {
  return (
    existing.moduleCode !== incoming.moduleCode ||
    existing.targetDay !== incoming.targetDay ||
    existing.targetModule !== incoming.targetModule ||
    existing.actModule !== incoming.actModule ||
    existing.actualStockUnitEsPackcompNew !== incoming.actualStockUnitEsPackcompNew ||
    existing.actLocal !== incoming.actLocal ||
    existing.actualStockUnitAdv !== incoming.actualStockUnitAdv ||
    existing.balanceStockAdvNew !== incoming.balanceStockAdvNew
  );
}

function dateRangeBounds(start: string, end: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    throw new Error("Pilih rentang tanggal yang valid");
  }
  const endDate = new Date(`${end}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return { start, end: endDate.toISOString().slice(0, 10) };
}

function parseRows(file: File, startDate: string, endDate: string) {
  return file.arrayBuffer().then((arrayBuffer) => {
    // Keep Excel dates as serial numbers. Converting them to JavaScript Dates makes
    // their calendar day depend on the server timezone.
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
    const sheetName = workbook.SheetNames.find((name) => name.trim() === importSheetName);
    if (!sheetName) throw new Error(`Excel must contain a sheet named ${importSheetName}`);

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
    if (rows.length === 0) throw new Error("Excel sheet does not contain rows");

    const headers = new Set(Object.keys(rows[0] ?? {}));
    const missingHeaders = requiredHeaders.filter((header) => !headers.has(header));
    if (missingHeaders.length) throw new Error(`Excel is missing required columns: ${missingHeaders.join(", ")}`);

    const { start, end } = dateRangeBounds(startDate, endDate);
    const parsedRows = rows.map((row, index): StockRow => {
      const date = parseDate(row.Date);
      const line = String(row.Line ?? "").trim();
      const type = String(row.Type ?? "").trim();
      const unitModule = numberOrNull(row["Unit/Module"], "Unit/Module");

      if (!date || !line || !type || unitModule === null) {
        throw new Error(`Baris ${index + 2} membutuhkan Date, Line, Type, dan Unit/Module`);
      }

      return {
        date,
        line,
        type,
        unitModule,
        moduleCode: textOrNull(row.Module_Code),
        targetDay: numberOrNull(row.Target_Day, "Target_Day"),
        targetModule: numberOrNull(row.Target_Module, "Target_Module"),
        actModule: numberOrNull(row.Act_Module, "Act_Module"),
        actualStockUnitEsPackcompNew: numberOrNull(row.Actual_Stock_Unit_ES_PackComp_New, "Actual_Stock_Unit_ES_PackComp_New"),
        actLocal: numberOrNull(row.Act_Local, "Act_Local"),
        actualStockUnitAdv: numberOrNull(row.Actual_Stock_Unit_ADV_New, "Actual_Stock_Unit_ADV_New"),
        balanceStockAdvNew: numberOrNull(row.Balance_Stock_ADV_New, "Balance_Stock_ADV_New"),
      };
    }).filter((row) => row.date >= start && row.date < end);

    if (parsedRows.length === 0) throw new Error(`Tidak ada data untuk rentang ${startDate} sampai ${endDate}`);

    const keys = new Set<string>();
    for (const row of parsedRows) {
      const key = keyFor(row);
      if (keys.has(key)) throw new Error(`Excel contains duplicate stock data for ${row.date} (${row.line} / ${row.type})`);
      keys.add(key);
    }

    return parsedRows;
  });
}

async function getExistingRowsInRange(start: string, end: string) {
  return prisma.$queryRawUnsafe<DatabaseStockRow[]>(
    `SELECT CAST(id AS DOUBLE) AS id, DATE_FORMAT(\`date\`, '%Y-%m-%d') AS date, line, type, CAST(unit_module AS DOUBLE) AS unitModule,
      module_code AS moduleCode, CAST(target_day AS DOUBLE) AS targetDay, CAST(target_module AS DOUBLE) AS targetModule,
      CAST(act_module AS DOUBLE) AS actModule, CAST(actual_stock_unit_es_packcomp_new AS DOUBLE) AS actualStockUnitEsPackcompNew,
      CAST(act_local AS DOUBLE) AS actLocal, CAST(actual_stock_unit_adv AS DOUBLE) AS actualStockUnitAdv,
      CAST(balance_stock_adv_new AS DOUBLE) AS balanceStockAdvNew
     FROM asakai_stock WHERE \`date\` >= ? AND \`date\` < ?`,
    start,
    end,
  );
}

type StockDatabase = Pick<typeof prisma, "$executeRawUnsafe">;

async function insertRow(database: StockDatabase, row: StockRow) {
  await database.$executeRawUnsafe(
    `INSERT INTO asakai_stock (\`date\`, line, type, unit_module, module_code, target_day, target_module, act_module,
      actual_stock_unit_es_packcomp_new, act_local, actual_stock_unit_adv, balance_stock_adv_new)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.date, row.line, row.type, row.unitModule, row.moduleCode, row.targetDay, row.targetModule,
    row.actModule, row.actualStockUnitEsPackcompNew, row.actLocal, row.actualStockUnitAdv, row.balanceStockAdvNew,
  );
}

async function updateRow(database: StockDatabase, id: number, row: StockRow) {
  await database.$executeRawUnsafe(
    `UPDATE asakai_stock SET module_code=?, target_day=?, target_module=?, act_module=?,
      actual_stock_unit_es_packcomp_new=?, act_local=?, actual_stock_unit_adv=?, balance_stock_adv_new=? WHERE id=?`,
    row.moduleCode, row.targetDay, row.targetModule, row.actModule, row.actualStockUnitEsPackcompNew,
    row.actLocal, row.actualStockUnitAdv, row.balanceStockAdvNew, id,
  );
}

export async function getAsakaiStock(start: string, end: string): Promise<AsakaiStockRow[]> {
  const bounds = dateRangeBounds(start, end);
  return getExistingRowsInRange(bounds.start, bounds.end);
}

type EmergencyStockRow = {
  line: string;
  type: string;
  unitModule: number;
  targetDay: number | null;
  targetModule: number | null;
  actModule: number | null;
  actLocal: number | null;
};

type ModuleExportStockRow = Omit<EmergencyStockRow, "actLocal" | "actModule"> & {
  moduleCode: string;
  actualUnit: number | null;
};

type AdvancedStockRow = {
  line: string;
  type: string;
  moduleCode: string | null;
  actualUnit: number | null;
  balanceUnit: number | null;
};

type BalanceStockRow = {
  line: string;
  unitModule: number | null;
  moduleCode: string | null;
  targetModule: number | null;
  actModule: number | null;
  actLocal: number | null;
  actualUnit: number | null;
};

function emptyEmergencyStockMetrics(): EmergencyStockMetrics {
  return { balancePallet: 0, targetPallet: 0, actPallet: 0, actUnit: 0, actDay: 0 };
}

function buildEmergencyStockMetrics(
  actPallet: number,
  targetPallet: number,
  actUnit: number,
  actDayDenominator: number,
): EmergencyStockMetrics {
  return {
    balancePallet: actPallet - targetPallet,
    targetPallet,
    actPallet,
    actUnit,
    actDay: actUnit === 0 || !Number.isFinite(actDayDenominator) || actDayDenominator <= 0 ? 0 : actUnit / actDayDenominator,
  };
}

function buildEmergencyStockGroup(rows: EmergencyStockRow[]): {
  total: EmergencyStockMetrics;
  local: EmergencyStockMetrics;
  export: EmergencyStockMetrics;
} {
  if (rows.length === 0) {
    return {
      total: emptyEmergencyStockMetrics(),
      local: emptyEmergencyStockMetrics(),
      export: emptyEmergencyStockMetrics(),
    };
  }

  const totals = rows.reduce((current, row) => {
    const unitModule = Number(row.unitModule) || 0;
    const targetDay = Number(row.targetDay) || 0;
    const targetPallet = Number(row.targetModule) || 0;
    const localActPallet = Number(row.actLocal) || 0;
    const exportActPallet = Number(row.actModule) || 0;

    return {
      targetPallet: current.targetPallet + targetPallet,
      localActPallet: current.localActPallet + localActPallet,
      exportActPallet: current.exportActPallet + exportActPallet,
      localActUnit: current.localActUnit + localActPallet * unitModule,
      exportActUnit: current.exportActUnit + exportActPallet * unitModule,
      actDayDenominator: current.actDayDenominator + (targetDay > 0 ? targetPallet * unitModule / targetDay : 0),
    };
  }, {
    targetPallet: 0,
    localActPallet: 0,
    exportActPallet: 0,
    localActUnit: 0,
    exportActUnit: 0,
    actDayDenominator: 0,
  });

  return {
    local: buildEmergencyStockMetrics(totals.localActPallet, 0, totals.localActUnit, totals.actDayDenominator),
    export: buildEmergencyStockMetrics(totals.exportActPallet, totals.targetPallet, totals.exportActUnit, totals.actDayDenominator),
    total: buildEmergencyStockMetrics(
      totals.localActPallet + totals.exportActPallet,
      totals.targetPallet,
      totals.localActUnit + totals.exportActUnit,
      totals.actDayDenominator,
    ),
  };
}

const machiningEmergencyStockGroups: Array<{
  key: EmergencyStockGroup;
  matches: (row: Pick<EmergencyStockRow, "line" | "type">) => boolean;
}> = [
  { key: "cb1", matches: (row) => row.line === "CYL. BLOCK" && row.type.trim().startsWith("1 TR") },
  { key: "cb2", matches: (row) => row.line === "CYL. BLOCK" && row.type.trim().startsWith("2 TR") },
  { key: "ch1", matches: (row) => row.line === "CYL. HEAD" && row.type.trim().startsWith("1 TR") },
  { key: "ch2", matches: (row) => row.line === "CYL. HEAD" && row.type.trim().startsWith("2 TR") },
  { key: "cr1", matches: (row) => row.line === "CRANKSHAFT" && row.type.trim().startsWith("1 TR") },
  { key: "cr2", matches: (row) => row.line === "CRANKSHAFT" && row.type.trim().startsWith("2 TR") },
  { key: "cam1", matches: (row) => row.line === "CAMSHAFT" && row.type.trim().startsWith("No.1 & No.2") },
  { key: "cam2", matches: (row) => row.line === "CAMSHAFT" && row.type.trim().startsWith("No.1 & No.2") },
];

export async function getMachiningEmergencyStock(date: string): Promise<MachiningEmergencyStock> {
  const rows = await prisma.$queryRawUnsafe<EmergencyStockRow[]>(
    `SELECT line, type, CAST(unit_module AS DOUBLE) AS unitModule, CAST(target_day AS DOUBLE) AS targetDay,
      CAST(target_module AS DOUBLE) AS targetModule, CAST(act_module AS DOUBLE) AS actModule,
      CAST(act_local AS DOUBLE) AS actLocal
     FROM asakai_stock
     WHERE \`date\` = ?
       AND line IN ('CYL. BLOCK', 'CYL. HEAD', 'CRANKSHAFT', 'CAMSHAFT')
       AND (module_code IS NULL OR TRIM(module_code) = '')
    `,
    date,
  );

  return Object.fromEntries(
    machiningEmergencyStockGroups.map(({ key, matches }) => [key, buildEmergencyStockGroup(rows.filter(matches))]),
  ) as MachiningEmergencyStock;
}

function buildModuleExportMetrics(rows: ModuleExportStockRow[]): EmergencyStockMetrics {
  const totals = rows.reduce((current, row) => {
    const unitModule = Number(row.unitModule) || 0;
    const targetDay = Number(row.targetDay) || 0;
    const targetPallet = Number(row.targetModule) || 0;
    const actUnit = Number(row.actualUnit) || 0;
    const actPallet = unitModule > 0 ? actUnit / unitModule : 0;

    return {
      targetPallet: current.targetPallet + targetPallet,
      actPallet: current.actPallet + actPallet,
      actUnit: current.actUnit + actUnit,
      actDayDenominator: current.actDayDenominator + (targetDay > 0 ? targetPallet * unitModule / targetDay : 0),
    };
  }, {
    targetPallet: 0,
    actPallet: 0,
    actUnit: 0,
    actDayDenominator: 0,
  });

  return buildEmergencyStockMetrics(
    totals.actPallet,
    totals.targetPallet,
    totals.actUnit,
    totals.actDayDenominator,
  );
}

export async function getMachiningModuleExportStock(date: string): Promise<MachiningModuleExportStock> {
  const rows = await prisma.$queryRawUnsafe<ModuleExportStockRow[]>(
    `SELECT line, type, module_code AS moduleCode, CAST(unit_module AS DOUBLE) AS unitModule,
      CAST(target_day AS DOUBLE) AS targetDay, CAST(target_module AS DOUBLE) AS targetModule,
      CAST(actual_stock_unit_es_packcomp_new AS DOUBLE) AS actualUnit
     FROM asakai_stock
     WHERE \`date\` = ?
       AND line IN ('CYL. BLOCK', 'CYL. HEAD', 'CRANKSHAFT', 'CAMSHAFT')
       AND module_code IS NOT NULL
       AND TRIM(module_code) <> ''`,
    date,
  );

  return Object.fromEntries(
    machiningEmergencyStockGroups.map(({ key, matches }) => {
      const groupRows = rows.filter(matches);
      const moduleCodes = [...new Set(groupRows.map((row) => row.moduleCode))].sort((left, right) => left.localeCompare(right));

      return [key, {
        total: buildModuleExportMetrics(groupRows),
        modules: Object.fromEntries(
          moduleCodes.map((moduleCode) => [moduleCode, buildModuleExportMetrics(groupRows.filter((row) => row.moduleCode === moduleCode))]),
        ),
      }];
    }),
  ) as MachiningModuleExportStock;
}

const machiningBalanceStockLines: Array<{ key: MachiningBalanceStockGroup; line: string }> = [
  { key: "cylblock", line: "CYL. BLOCK" },
  { key: "cylhead", line: "CYL. HEAD" },
  { key: "crankshaft", line: "CRANKSHAFT" },
  { key: "camshaft", line: "CAMSHAFT" },
];

function buildBalanceStockUnit(rows: BalanceStockRow[], category: "emergency" | "exportModule") {
  const sourceRows = rows.filter((row) => category === "emergency"
    ? !row.moduleCode?.trim()
    : Boolean(row.moduleCode?.trim()));
  const unitModule = sourceRows
    .map((row) => Number(row.unitModule) || 0)
    .filter((unit) => unit > 0)
    .sort((left, right) => left - right)[0];

  if (!unitModule) return null;

  const balancePallet = sourceRows.reduce((total, row) => {
    const targetModule = Number(row.targetModule) || 0;

    if (category === "emergency") {
      return total + (Number(row.actLocal) || 0) + (Number(row.actModule) || 0) - targetModule;
    }

    const rowUnitModule = Number(row.unitModule) || 0;
    const actModule = rowUnitModule > 0 ? (Number(row.actualUnit) || 0) / rowUnitModule : 0;
    return total + actModule - targetModule;
  }, 0);

  return balancePallet * unitModule;
}

export async function getMachiningBalanceStock(date: string): Promise<MachiningBalanceStock> {
  const rows = await prisma.$queryRawUnsafe<BalanceStockRow[]>(
    `SELECT line, CAST(unit_module AS DOUBLE) AS unitModule, module_code AS moduleCode,
      CAST(target_module AS DOUBLE) AS targetModule, CAST(act_module AS DOUBLE) AS actModule,
      CAST(act_local AS DOUBLE) AS actLocal,
      CAST(actual_stock_unit_es_packcomp_new AS DOUBLE) AS actualUnit
     FROM asakai_stock
     WHERE \`date\` = ?
       AND line IN ('CYL. BLOCK', 'CYL. HEAD', 'CRANKSHAFT', 'CAMSHAFT')`,
    date,
  );

  return Object.fromEntries(
    machiningBalanceStockLines.map(({ key, line }) => {
      const lineRows = rows.filter((row) => row.line === line);
      return [key, {
        emergency: buildBalanceStockUnit(lineRows, "emergency"),
        exportModule: buildBalanceStockUnit(lineRows, "exportModule"),
      }];
    }),
  ) as MachiningBalanceStock;
}

const machiningAdvancedStockGroups: Array<{
  key: AdvancedStockGroup;
  matches: (row: AdvancedStockRow) => boolean;
}> = [
  {
    key: "cylBlock",
    matches: (row) => row.line === "CYL. BLOCK" && /^2\s*TR\b/i.test(row.type.trim()) && /STM/i.test(row.type) && row.moduleCode?.trim().toUpperCase() === "K2",
  },
  {
    key: "cylHead",
    matches: (row) => row.line === "CYL. HEAD" && /^2\s*TR\b/i.test(row.type.trim()) && /STM/i.test(row.type) && row.moduleCode?.trim().toUpperCase() === "K7",
  },
  {
    key: "crankshaft",
    matches: (row) => row.line === "CRANKSHAFT" && /^2\s*TR\b/i.test(row.type.trim()) && /STM/i.test(row.type) && row.moduleCode?.trim().toUpperCase() === "K4",
  },
  {
    key: "camshaft",
    matches: (row) => row.line === "CAMSHAFT" && row.type.trim().startsWith("No.1 & No.2") && row.moduleCode?.trim().toUpperCase() === "K5",
  },
];

export async function getMachiningAdvancedStock(date: string): Promise<MachiningAdvancedStock> {
  const rows = await prisma.$queryRawUnsafe<AdvancedStockRow[]>(
    `SELECT line, type, module_code AS moduleCode,
      CAST(actual_stock_unit_adv AS DOUBLE) AS actualUnit,
      CAST(balance_stock_adv_new AS DOUBLE) AS balanceUnit
     FROM asakai_stock
     WHERE \`date\` = ?
       AND line IN ('CYL. BLOCK', 'CYL. HEAD', 'CRANKSHAFT', 'CAMSHAFT')`,
    date,
  );

  return Object.fromEntries(
    machiningAdvancedStockGroups.map(({ key, matches }) => {
      const totals = rows.filter(matches).reduce((current, row) => ({
        actualUnit: current.actualUnit + (Number(row.actualUnit) || 0),
        balanceUnit: current.balanceUnit + (Number(row.balanceUnit) || 0),
      }), { actualUnit: 0, balanceUnit: 0 });

      return [key, totals];
    }),
  ) as MachiningAdvancedStock;
}

async function updateAsakaiStockValuesWithDatabase(
  database: StockDatabase,
  id: number,
  values: AsakaiStockValueUpdate,
) {
  const stockId = Number(id);
  if (!Number.isSafeInteger(stockId) || stockId < 1) throw new Error("Data stock tidak valid");

  const result = await database.$executeRawUnsafe(
    `UPDATE asakai_stock SET module_code=?, target_day=?, target_module=?, act_module=?,
      actual_stock_unit_es_packcomp_new=?, act_local=?, actual_stock_unit_adv=?, balance_stock_adv_new=? WHERE id=?`,
    textOrNull(values.moduleCode),
    numberOrNull(values.targetDay, "Target Day"),
    numberOrNull(values.targetModule, "Target Module"),
    numberOrNull(values.actModule, "Act Module"),
    numberOrNull(values.actualStockUnitEsPackcompNew, "Actual Stock Unit ES PackComp New"),
    numberOrNull(values.actLocal, "Act Local"),
    numberOrNull(values.actualStockUnitAdv, "Actual Stock Unit ADV"),
    numberOrNull(values.balanceStockAdvNew, "Balance Stock ADV New"),
    stockId,
  );

  if (result === 0) throw new Error("Data stock tidak ditemukan");
}

export async function updateAsakaiStockValues(updates: Array<{ id: number; values: AsakaiStockValueUpdate }>) {
  if (updates.length === 0) return;
  await prisma.$transaction(async (transaction) => {
    for (const update of updates) {
      await updateAsakaiStockValuesWithDatabase(transaction, update.id, update.values);
    }
  });
}

export async function deleteAsakaiStock(id: number) {
  const stockId = Number(id);
  if (!Number.isSafeInteger(stockId) || stockId < 1) throw new Error("Data stock tidak valid");
  const result = await prisma.$executeRawUnsafe("DELETE FROM asakai_stock WHERE id=?", stockId);
  if (result === 0) throw new Error("Data stock tidak ditemukan");
}

export async function deleteAsakaiStocks(ids: number[]) {
  const stockIds = [...new Set(ids.map(Number))];
  if (stockIds.length === 0 || stockIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    throw new Error("Data stock tidak valid");
  }

  await prisma.$transaction(async (transaction) => {
    for (const id of stockIds) {
      const result = await transaction.$executeRawUnsafe("DELETE FROM asakai_stock WHERE id=?", id);
      if (result === 0) throw new Error("Data stock tidak ditemukan");
    }
  });
}

export async function importAsakaiStock(file: File, startDate: string, endDate: string, confirmChanges: boolean) {
  const incomingRows = await parseRows(file, startDate, endDate);
  const bounds = dateRangeBounds(startDate, endDate);
  const existingByKey = new Map((await getExistingRowsInRange(bounds.start, bounds.end)).map((row) => [keyFor(row), row]));
  const changes = incomingRows.filter((row) => {
    const existing = existingByKey.get(keyFor(row));
    return existing && hasChanged(existing, row);
  });

  if (changes.length && !confirmChanges) {
    return {
      conflicts: changes.map(({ date, line, type }) => ({ date, line, type })),
      changed: changes.length,
    };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  await prisma.$transaction(async (transaction) => {
    for (const row of incomingRows) {
      const existing = existingByKey.get(keyFor(row));
      if (!existing) {
        await insertRow(transaction, row);
        inserted += 1;
      } else if (hasChanged(existing, row)) {
        await updateRow(transaction, existing.id, row);
        updated += 1;
      } else {
        skipped += 1;
      }
    }
  });

  return { inserted, updated, skipped };
}
