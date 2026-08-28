import "server-only";

import { prisma } from "@/lib/prisma";
import { getReportPrisma } from "@/lib/report-prisma";
import * as XLSX from "xlsx";

const sheets = new Set(["CB TMC", "CB STM", "CH TMC", "CH STM", "CR TMC", "CR STM", "CA STM"]);
const requiredHeaders = ["Line", "Dest", "Module no", "Renban", "Vanning Date"] as const;

type ShipmentRow = {
  line: "CB" | "CH" | "CR" | "CAM";
  dest: string;
  moduleNo: string;
  renban: string;
  vanningDate: string;
  etdDate: string | null;
  remark: string | null;
  completedDate: string | null;
  completedProdDate: string | null;
  completedShift: string | null;
  sourceSheet: string | null;
};

export type AsakaiShipmentRow = ShipmentRow & { id: number };
export type AsakaiShipmentImportConflict = Pick<ShipmentRow, "line" | "dest" | "moduleNo" | "renban" | "vanningDate">;
export type ShipmentVanningMetrics = {
  plan: number;
  finish: number;
  remain: number;
};

export type ShipmentVanningDestination = {
  dates: string[];
  modules: Record<string, ShipmentVanningMetrics[]>;
  totalPlan: number[];
};

export type ShipmentVanning = Partial<Record<"kamigo" | "stm", ShipmentVanningDestination>>;
export type AsakaiShipmentVanning = Record<"cylblock" | "cylhead" | "crankshaft" | "camshaft", ShipmentVanning>;
export type AsakaiShipmentValueUpdate = {
  line: string;
  dest: string;
  moduleNo: string;
  renban: string;
  vanningDate: string;
  etdDate: string;
  remark: string;
  completedDate: string;
};

const sourceByLine = {
  CB: { view: "v_cylblock_packom", target: 18, workColumns: ["no_work"] },
  CH: { view: "v_cylhead_packom", target: 24, workColumns: ["no_work"] },
  CR: { view: "v_crankshaft_packom", target: 48, workColumns: ["no_work"] },
  CAM: { view: "v_camshaft_packom", target: 96, workColumns: ["no_work_in", "no_work_ex"] },
} as const;

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatDate(value);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const text = String(value ?? "").trim();
  if (/^\d{8}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  const indonesiaDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (indonesiaDate) return `${indonesiaDate[3]}-${indonesiaDate[2].padStart(2, "0")}-${indonesiaDate[1].padStart(2, "0")}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : formatDate(parsed);
}

function textOrNull(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeLine(value: unknown): ShipmentRow["line"] | null {
  const line = String(value ?? "").trim().toUpperCase();
  if (line === "CA" || line === "CAM" || line === "CS") return "CAM";
  return line === "CB" || line === "CH" || line === "CR" ? line : null;
}

function keyFor(row: Pick<ShipmentRow, "line" | "dest" | "moduleNo" | "renban" | "vanningDate">) {
  return [row.line, row.dest, row.moduleNo, row.renban, row.vanningDate].join("||");
}

function hasChanged(existing: ShipmentRow, incoming: ShipmentRow) {
  return existing.etdDate !== incoming.etdDate || existing.remark !== incoming.remark || existing.completedDate !== incoming.completedDate || existing.sourceSheet !== incoming.sourceSheet;
}

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

async function parseRows(file: File) {
  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
  const matchedSheets = workbook.SheetNames.filter((name) => sheets.has(name.trim()));
  if (!matchedSheets.length) throw new Error("Excel harus memiliki minimal satu sheet shipment yang didukung");

  const parsedRows: ShipmentRow[] = [];
  for (const sheetName of matchedSheets) {
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
    const headerRowIndex = sheetRows.findIndex((cells) => {
      const headers = new Set(cells.map((cell) => String(cell ?? "").trim()));
      return requiredHeaders.every((header) => headers.has(header));
    });
    if (headerRowIndex === -1) throw new Error(`Sheet ${sheetName} tidak memiliki kolom: ${requiredHeaders.join(", ")}`);
    const headerRow = sheetRows[headerRowIndex];
    const columnIndex = new Map(headerRow.map((header, index) => [String(header ?? "").trim(), index]));
    const headers = new Set(columnIndex.keys());
    const missing = requiredHeaders.filter((header) => !headers.has(header));
    if (missing.length) throw new Error(`Sheet ${sheetName} tidak memiliki kolom: ${missing.join(", ")}`);
    const cell = (row: unknown[], header: string) => row[columnIndex.get(header) ?? -1];
    const remarkIndex = columnIndex.get("Remark") ?? -1;
    const completedDateIndex = columnIndex.get("completed_date") ?? columnIndex.get("Completed Date") ?? columnIndex.get("Complete date") ?? remarkIndex + 1;
    sheetRows.slice(headerRowIndex + 1).forEach((row, index) => {
      if (row.every((value) => String(value ?? "").trim() === "")) return;
      const line = normalizeLine(cell(row, "Line"));
      const dest = String(cell(row, "Dest") ?? "").trim();
      const moduleNo = String(cell(row, "Module no") ?? "").trim();
      const renban = String(cell(row, "Renban") ?? "").trim();
      const vanningDate = parseDate(cell(row, "Vanning Date"));
      if (!line && !dest && !moduleNo && !renban && !vanningDate) return;
      if (!line || !dest || !moduleNo || !renban || !vanningDate) {
        throw new Error(`Sheet ${sheetName}, baris ${headerRowIndex + index + 2} membutuhkan Line, Dest, Module no, Renban, dan Vanning Date yang valid`);
      }
      const etdDateValue = cell(row, "ETD Date");
      const parsedEtdDate = etdDateValue === "" || etdDateValue === null || etdDateValue === undefined ? "" : parseDate(etdDateValue);
      const etdDate = parsedEtdDate || null;
      parsedRows.push({
        line, dest, moduleNo, renban, vanningDate, etdDate,
        remark: textOrNull(cell(row, "Remark")), completedDate: textOrNull(row[completedDateIndex]),
        completedProdDate: null, completedShift: null, sourceSheet: sheetName.trim(),
      });
    });
  }
  if (!parsedRows.length) throw new Error("Tidak ada data shipment valid pada sheet yang didukung");
  const keys = new Set<string>();
  for (const row of parsedRows) {
    const key = keyFor(row);
    if (keys.has(key)) throw new Error(`Excel berisi shipment duplikat untuk ${row.moduleNo}`);
    keys.add(key);
  }
  return parsedRows;
}

async function getRows(start?: string, end?: string) {
  const where = start && end ? "WHERE vanning_date >= ? AND vanning_date < ?" : "";
  const params = start && end ? [start, end] : [];
  return prisma.$queryRawUnsafe<AsakaiShipmentRow[]>(
    `SELECT CAST(id AS DOUBLE) AS id, line, dest, module_no AS moduleNo, renban,
       DATE_FORMAT(vanning_date, '%Y-%m-%d') AS vanningDate, DATE_FORMAT(etd_date, '%Y-%m-%d') AS etdDate,
       remark, completed_date AS completedDate, DATE_FORMAT(completed_prod_date, '%Y-%m-%d') AS completedProdDate, completed_shift AS completedShift, source_sheet AS sourceSheet
     FROM asakai_shipment ${where} ORDER BY vanning_date ASC, id ASC`, ...params,
  );
}

function monthBounds(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Pilih bulan yang valid");
  const [year, monthNumber] = month.split("-").map(Number);
  return { start: `${month}-01`, end: new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10) };
}

function emptyShipmentVanningDestination(moduleCodes: readonly string[]): ShipmentVanningDestination {
  return {
    dates: [],
    modules: Object.fromEntries(moduleCodes.map((code) => [code, []])),
    totalPlan: [],
  };
}

const shipmentVanningConfigs = [
  { lineKey: "cylblock", line: "CB", key: "kamigo", sourceSheet: "CB TMC", moduleCodes: ["CB", "CD"] },
  { lineKey: "cylblock", line: "CB", key: "stm", sourceSheet: "CB STM", moduleCodes: ["K1", "K2"] },
  { lineKey: "cylhead", line: "CH", key: "kamigo", sourceSheet: "CH TMC", moduleCodes: ["HC", "HD", "HE", "HF"] },
  { lineKey: "cylhead", line: "CH", key: "stm", sourceSheet: "CH STM", moduleCodes: ["K6", "K7", "K8"] },
  { lineKey: "crankshaft", line: "CR", key: "kamigo", sourceSheet: "CR TMC", moduleCodes: ["CS", "CT"] },
  { lineKey: "crankshaft", line: "CR", key: "stm", sourceSheet: "CR STM", moduleCodes: ["K3", "K4"] },
  { lineKey: "camshaft", line: "CAM", key: "stm", sourceSheet: "CA STM", moduleCodes: ["K5"] },
] as const;

export async function getAsakaiShipmentVanning(startDate: string): Promise<AsakaiShipmentVanning> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error("Tanggal Asakai Board tidak valid");

  const result: AsakaiShipmentVanning = { cylblock: {}, cylhead: {}, crankshaft: {}, camshaft: {} };

  await Promise.all(shipmentVanningConfigs.map(async ({ lineKey, line, key, sourceSheet, moduleCodes }) => {
    const dateRows = await prisma.$queryRawUnsafe<Array<{ vanningDate: string }>>(
      `SELECT DISTINCT DATE_FORMAT(vanning_date, '%Y-%m-%d') AS vanningDate
       FROM asakai_shipment
       WHERE line = ? AND source_sheet = ? AND vanning_date >= ?
         AND (${moduleCodes.map(() => "UPPER(TRIM(module_no)) LIKE ?").join(" OR ")})
       ORDER BY vanning_date ASC
       LIMIT 5`,
      line,
      sourceSheet,
      startDate,
      ...moduleCodes.map((code) => `${code}%`),
    );
    const dates = dateRows.map((row) => row.vanningDate);
    const destination = emptyShipmentVanningDestination(moduleCodes);
    result[lineKey][key] = destination;
    destination.dates = dates;
    if (!dates.length) return;

    const placeholders = dates.map(() => "?").join(", ");
    const rows = await prisma.$queryRawUnsafe<Array<{ moduleNo: string; vanningDate: string; remark: string | null }>>(
      `SELECT module_no AS moduleNo, DATE_FORMAT(vanning_date, '%Y-%m-%d') AS vanningDate, remark
       FROM asakai_shipment
       WHERE line = ? AND source_sheet = ? AND vanning_date IN (${placeholders})`,
      line,
      sourceSheet,
      ...dates,
    );
    const byDate = new Map(dates.map((date) => [date, new Map(moduleCodes.map((code) => [code, { plan: 0, finish: 0 }]))]));

    for (const row of rows) {
      const moduleCode = moduleCodes.find((code) => row.moduleNo.trim().toUpperCase().startsWith(code));
      const metrics = moduleCode ? byDate.get(row.vanningDate)?.get(moduleCode) : undefined;
      if (!metrics) continue;
      metrics.plan += 1;
      if (row.remark?.trim().toUpperCase() === "COMPLETE") metrics.finish += 1;
    }

    for (const code of moduleCodes) {
      destination.modules[code] = dates.map((date) => {
        const metrics = byDate.get(date)?.get(code) ?? { plan: 0, finish: 0 };
        return { ...metrics, remain: metrics.plan - metrics.finish };
      });
    }
    destination.totalPlan = dates.map((_, index) => moduleCodes.reduce((total, code) => total + (destination.modules[code][index]?.plan ?? 0), 0));
  }));

  return result;
}

export async function reconcileAsakaiShipment(month: string) {
  const bounds = monthBounds(month);
  const pending = (await getRows(bounds.start, bounds.end)).filter((row) => !/^completed?$/i.test(row.remark ?? ""));
  if (!pending.length) return 0;

  const shipmentsBySource = new Map<string, AsakaiShipmentRow[]>();
  for (const shipment of pending) {
    const key = `${shipment.line}||${shipment.vanningDate.slice(0, 4)}`;
    shipmentsBySource.set(key, [...(shipmentsBySource.get(key) ?? []), shipment]);
  }

  let completed = 0;
  for (const [sourceKey, shipments] of shipmentsBySource) {
    const [line, year] = sourceKey.split("||") as [ShipmentRow["line"], string];
    const config = sourceByLine[line];
    const columns = config.workColumns.map((column) => `TRIM(COALESCE(${column}, '')) AS ${column}`).join(", ");
    const recordsByModule = new Map<string, Array<{ prodDate: string; shift: string | null; values: string[] }>>();
    const moduleNumbers = [...new Set(shipments.map((shipment) => shipment.moduleNo))];
    const yearStart = `${year}-01-01`;
    const yearEnd = `${Number(year) + 1}-01-01`;

    for (let start = 0; start < moduleNumbers.length; start += 500) {
      const moduleChunk = moduleNumbers.slice(start, start + 500);
      const placeholders = moduleChunk.map(() => "?").join(", ");
      const records = await getReportPrisma().$queryRawUnsafe<Array<{ caseNumber: string; prodDate: string; ftime: string | null; shift: string | null; no_work?: string; no_work_in?: string; no_work_ex?: string }>>(
        `SELECT TRIM(COALESCE(no_case, '')) AS caseNumber, DATE_FORMAT(prod_date, '%Y-%m-%d') AS prodDate, ftime, shift, ${columns}
         FROM ${quoteIdentifier(config.view)}
         WHERE prod_date >= ? AND prod_date < ? AND no_case IN (${placeholders})
         ORDER BY prod_date ASC, ftime ASC`, yearStart, yearEnd, ...moduleChunk,
      );
      for (const record of records) {
        const moduleNo = String(record.caseNumber ?? "").trim();
        if (!moduleNo) continue;
        const values = config.workColumns.map((column) => String(record[column as keyof typeof record] ?? "").trim()).filter(Boolean);
        recordsByModule.set(moduleNo, [...(recordsByModule.get(moduleNo) ?? []), { prodDate: record.prodDate, shift: record.shift, values }]);
      }
    }

    for (const shipment of shipments) {
      const units = new Map<string, { prodDate: string; shift: string | null }>();
      for (const record of recordsByModule.get(shipment.moduleNo) ?? []) {
        for (const value of record.values) if (!units.has(value)) units.set(value, record);
      }
      const required = shipment.line === "CAM" ? config.target * 2 : config.target;
      const lastUnit = [...units.values()][required - 1];
      if (!lastUnit) continue;
      const shift = String(lastUnit.shift ?? "").trim().toUpperCase();
      const shiftCode = shift === "1" || shift === "DAY" || shift === "D" ? "D" : "N";
      const completedDate = `${lastUnit.prodDate.slice(-2)}${shiftCode}`;
      await prisma.$executeRawUnsafe(
        "UPDATE asakai_shipment SET remark='Complete', completed_date=?, completed_prod_date=?, completed_shift=? WHERE id=? AND (remark IS NULL OR TRIM(remark) = '')",
        completedDate, lastUnit.prodDate, shiftCode, shipment.id,
      );
      completed += 1;
    }
  }
  return completed;
}

export async function getAsakaiShipment(month: string) {
  const bounds = monthBounds(month);
  await reconcileAsakaiShipment(month);
  return getRows(bounds.start, bounds.end);
}

export async function importAsakaiShipment(file: File, confirmChanges: boolean) {
  const incomingRows = await parseRows(file);
  const existingByKey = new Map((await getRows()).map((row) => [keyFor(row), row]));
  const changes = incomingRows.filter((row) => {
    const existing = existingByKey.get(keyFor(row));
    return existing && hasChanged(existing, row);
  });
  if (changes.length && !confirmChanges) return { conflicts: changes.map(({ line, dest, moduleNo, renban, vanningDate }) => ({ line, dest, moduleNo, renban, vanningDate })), changed: changes.length };
  let inserted = 0; let updated = 0; let skipped = 0;
  await prisma.$transaction(async (transaction) => {
    for (const row of incomingRows) {
      const existing = existingByKey.get(keyFor(row));
      if (!existing) {
        await transaction.$executeRawUnsafe("INSERT INTO asakai_shipment (line, dest, module_no, renban, vanning_date, etd_date, remark, completed_date, source_sheet) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", row.line, row.dest, row.moduleNo, row.renban, row.vanningDate, row.etdDate, row.remark, row.completedDate, row.sourceSheet);
        inserted += 1;
      } else if (hasChanged(existing, row)) {
        await transaction.$executeRawUnsafe("UPDATE asakai_shipment SET etd_date=?, remark=?, completed_date=?, completed_prod_date=NULL, completed_shift=NULL, source_sheet=? WHERE id=?", row.etdDate, row.remark, row.completedDate, row.sourceSheet, existing.id);
        updated += 1;
      } else skipped += 1;
    }
  });
  const months = [...new Set(incomingRows.map((row) => row.vanningDate.slice(0, 7)))];
  const reconciled = (await Promise.all(months.map((month) => reconcileAsakaiShipment(month)))).reduce((total, value) => total + value, 0);
  return { inserted, updated, skipped, reconciled };
}

export async function deleteAsakaiShipments(ids: number[]) {
  if (!ids.length) return;
  await prisma.$transaction(ids.map((id) => prisma.$executeRawUnsafe("DELETE FROM asakai_shipment WHERE id=?", id)));
}

export async function updateAsakaiShipmentValues(updates: Array<{ id: number; values: AsakaiShipmentValueUpdate }>) {
  const existingById = new Map((await getRows()).map((row) => [row.id, row]));
  let updated = 0;
  const errors: Array<{ id: number; message: string }> = [];

  for (const update of updates) {
    const existing = existingById.get(update.id);
    if (!existing) { errors.push({ id: update.id, message: "Data shipment tidak ditemukan" }); continue; }
    const line = normalizeLine(update.values.line);
    const dest = update.values.dest.trim();
    const moduleNo = update.values.moduleNo.trim();
    const renban = update.values.renban.trim();
    const vanningDate = parseDate(update.values.vanningDate);
    const etdInput = update.values.etdDate.trim();
    const etdDate = etdInput ? parseDate(etdInput) : null;
    if (!line || !dest || !moduleNo || !renban || !vanningDate || (etdInput && !etdDate)) {
      errors.push({ id: update.id, message: "Line, Dest, Module no, Renban, Vanning Date, dan ETD Date harus valid" });
      continue;
    }
    const remark = textOrNull(update.values.remark);
    const completedDate = textOrNull(update.values.completedDate);
    try {
      if (!remark) {
        await prisma.$executeRawUnsafe(
          "UPDATE asakai_shipment SET line=?, dest=?, module_no=?, renban=?, vanning_date=?, etd_date=?, remark=NULL, completed_date=NULL, completed_prod_date=NULL, completed_shift=NULL WHERE id=?",
          line, dest, moduleNo, renban, vanningDate, etdDate, update.id,
        );
      } else {
        await prisma.$executeRawUnsafe(
          "UPDATE asakai_shipment SET line=?, dest=?, module_no=?, renban=?, vanning_date=?, etd_date=?, remark=?, completed_date=? WHERE id=?",
          line, dest, moduleNo, renban, vanningDate, etdDate, remark, completedDate, update.id,
        );
      }
      updated += 1;
    } catch (error) {
      const message = error instanceof Error && /duplicate|unique/i.test(error.message)
        ? "Key shipment bentrok dengan data lain"
        : "Gagal menyimpan perubahan";
      errors.push({ id: update.id, message });
    }
  }

  return { updated, errors };
}
