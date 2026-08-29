import "server-only";

import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const lsrHeaders = ["DATE", "SHIFT", "SHIFT2", "SHOP", "PART NO.", "REASON", "PART NAME", "QTY", "Price /unit", "Total Price"] as const;
const targetHeaders = ["Date", "Shop", "Target_Daily", "Target_Cumm."] as const;

export type LsrRecord = {
  id: number; date: string; shift: string; shift2: string; shop: string; partNo: string; reason: string; partName: string;
  qty: number | string; pricePerUnit: number | string; totalPrice: number | string;
};
export type LsrTarget = { id: number; date: string; shop: string; targetDaily: number | string | null; targetCumm: number | string | null };
export type LsrRecordValueUpdate = { partName: string; qty: string; pricePerUnit: string; totalPrice: string };
export type LsrTargetValueUpdate = { targetDaily: string; targetCumm: string };
type IncomingRecord = Omit<LsrRecord, "id">;
type IncomingTarget = Omit<LsrTarget, "id">;
export type LsrImportConflict = { type: "LSR" | "Target"; date: string; label: string };
export type LsrAsakaiLineKey = "CB" | "CH" | "CR" | "CA";
export type LsrAsakaiFilter = { line: LsrAsakaiLineKey; shop: string; partNos: string[]; selectedPartNos: string[] };
export type LsrWeeklyData = Record<LsrAsakaiLineKey, { weekly: number[]; total: number }>;
export type LsrAsakaiKpiData = Record<LsrAsakaiLineKey, {
  r: number;
  w: number;
  totalDMinusOne: number;
  monthTotal: number;
  allowance: number | null;
}>;
export type LsrAmountBaseData = Record<LsrAsakaiLineKey, {
  daily: Array<{ date: string; amount: number }>;
  targetDaily: number | null;
  chartMax: number;
}>;
const asakaiLines: Array<{ line: LsrAsakaiLineKey; shop: string; targetShop: string; defaults: string[] }> = [
  { line: "CB", shop: "Cyl. Block", targetShop: "Cyl. Block", defaults: ["114110C060", "114110C090"] }, { line: "CH", shop: "Cyl. Head", targetShop: "Cyl. Head", defaults: ["111110C031", "111110C041", "111110C080", "111110C090", "111110C100", "111110C110", "111110C120"] }, { line: "CR", shop: "Crank Shaft", targetShop: "Crank Shaft", defaults: ["134110C022", "134110C030"] }, { line: "CA", shop: "Cam. Shaft", targetShop: "Cam Shaft", defaults: ["135110C011", "135120C030"] },
];

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
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const indonesia = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (indonesia) return `${indonesia[3]}-${indonesia[2].padStart(2, "0")}-${indonesia[1].padStart(2, "0")}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : formatDate(parsed);
}

function parseNumber(value: unknown, nullable = false): number | null {
  if (value === "" || value === null || value === undefined) return nullable ? null : null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const source = String(value).trim().replace(/\s/g, "");
  const normalized = source.includes(",") && source.includes(".")
    ? source.replace(/\./g, "").replace(",", ".")
    : source.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown) { return String(value ?? "").trim(); }
function recordKey(row: Pick<IncomingRecord, "date" | "shift" | "shift2" | "shop" | "partNo" | "reason">) { return [row.date, row.shift, row.shift2, row.shop, row.partNo, row.reason].join("||"); }
function targetKey(row: Pick<IncomingTarget, "date" | "shop">) { return `${row.date}||${row.shop}`; }

function sheetWithName(workbook: XLSX.WorkBook, wanted: string) {
  const name = workbook.SheetNames.find((item) => item.trim().toLowerCase() === wanted.toLowerCase());
  if (!name) throw new Error(`Excel harus memiliki sheet bernama ${wanted}`);
  return { name, sheet: workbook.Sheets[name] };
}

function indexedRows(sheet: XLSX.WorkSheet, sheetName: string, headers: readonly string[]) {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  const headerRowIndex = rows.findIndex((row) => {
    const values = new Set(row.map((value) => text(value)));
    return headers.every((header) => values.has(header));
  });
  if (headerRowIndex < 0) throw new Error(`Sheet ${sheetName} tidak memiliki kolom: ${headers.join(", ")}`);
  const indices = new Map(rows[headerRowIndex].map((value, index) => [text(value), index]));
  return { rows, headerRowIndex, cell: (row: unknown[], header: string) => row[indices.get(header) ?? -1] };
}

async function parseWorkbook(file: File, month: string) {
  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true });
  const lsrSheet = sheetWithName(workbook, "LSR");
  const targetSheet = sheetWithName(workbook, "Target");
  const records: IncomingRecord[] = [];
  const targets: IncomingTarget[] = [];
  const lsr = indexedRows(lsrSheet.sheet, lsrSheet.name, lsrHeaders);
  lsr.rows.slice(lsr.headerRowIndex + 1).forEach((row, index) => {
    if (row.every((value) => text(value) === "")) return;
    const line = lsr.headerRowIndex + index + 2;
    const date = parseDate(lsr.cell(row, "DATE"));
    if (!date) throw new Error(`Sheet ${lsrSheet.name}, baris ${line} memiliki tanggal yang tidak valid`);
    if (!date.startsWith(`${month}-`)) return;
    const shift = text(lsr.cell(row, "SHIFT")); const shift2 = text(lsr.cell(row, "SHIFT2")); const shop = text(lsr.cell(row, "SHOP"));
    const partNo = text(lsr.cell(row, "PART NO.")); const reason = text(lsr.cell(row, "REASON")); const partName = text(lsr.cell(row, "PART NAME"));
    const qty = parseNumber(lsr.cell(row, "QTY")); const pricePerUnit = parseNumber(lsr.cell(row, "Price /unit")); const totalPrice = parseNumber(lsr.cell(row, "Total Price"));
    if (!shift || !shift2 || !shop || !partNo || !reason || !partName || qty === null || pricePerUnit === null || totalPrice === null) throw new Error(`Sheet ${lsrSheet.name}, baris ${line} memiliki data LSR yang tidak valid atau belum lengkap`);
    records.push({ date, shift, shift2, shop, partNo, reason, partName, qty, pricePerUnit, totalPrice });
  });
  const target = indexedRows(targetSheet.sheet, targetSheet.name, targetHeaders);
  target.rows.slice(target.headerRowIndex + 1).forEach((row, index) => {
    if (row.every((value) => text(value) === "")) return;
    const line = target.headerRowIndex + index + 2; const date = parseDate(target.cell(row, "Date"));
    if (!date) throw new Error(`Sheet ${targetSheet.name}, baris ${line} memiliki tanggal yang tidak valid`);
    const shop = text(target.cell(row, "Shop"));
    const dailyCell = target.cell(row, "Target_Daily"); const cummCell = target.cell(row, "Target_Cumm.");
    const targetDaily = parseNumber(dailyCell, true); const targetCumm = parseNumber(cummCell, true);
    if (!shop || (text(dailyCell) && targetDaily === null) || (text(cummCell) && targetCumm === null)) throw new Error(`Sheet ${targetSheet.name}, baris ${line} memiliki data Target yang tidak valid`);
    targets.push({ date, shop, targetDaily, targetCumm });
  });
  if (!records.length) throw new Error(`Sheet ${lsrSheet.name} tidak memiliki data untuk bulan ${month}`);
  if (!targets.length) throw new Error(`Sheet ${targetSheet.name} tidak memiliki data valid`);
  for (const [label, rows, key] of [["LSR", records, recordKey], ["Target", targets, targetKey]] as const) {
    const keys = new Set<string>();
    for (const row of rows) { const value = key(row as never); if (keys.has(value)) throw new Error(`Excel berisi data ${label} duplikat: ${value.replaceAll("||", " / ")}`); keys.add(value); }
  }
  return { records, targets };
}

function sameNumber(a: unknown, b: unknown) {
  if (a === null || a === undefined || a === "") return b === null || b === undefined || b === "";
  if (b === null || b === undefined || b === "") return false;
  return Number(a) === Number(b);
}
function recordChanged(existing: LsrRecord, incoming: IncomingRecord) { return existing.partName !== incoming.partName || !sameNumber(existing.qty, incoming.qty) || !sameNumber(existing.pricePerUnit, incoming.pricePerUnit) || !sameNumber(existing.totalPrice, incoming.totalPrice); }
function targetChanged(existing: LsrTarget, incoming: IncomingTarget) { return !sameNumber(existing.targetDaily, incoming.targetDaily) || !sameNumber(existing.targetCumm, incoming.targetCumm); }

function bounds(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Pilih bulan yang valid");
  const [year, monthNumber] = month.split("-").map(Number);
  return { start: `${month}-01`, end: new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10) };
}

export async function getLsrData(date: string, targetMonth: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Pilih tanggal LSR yang valid");
  const { start, end } = bounds(targetMonth);
  const [records, targets] = await Promise.all([
    prisma.$queryRawUnsafe<LsrRecord[]>("SELECT CAST(id AS DOUBLE) AS id, DATE_FORMAT(date, '%Y-%m-%d') AS date, shift, shift2, shop, part_no AS partNo, reason, part_name AS partName, qty, price_per_unit AS pricePerUnit, total_price AS totalPrice FROM lsr_records WHERE date = ? ORDER BY id DESC", date),
    prisma.$queryRawUnsafe<LsrTarget[]>("SELECT CAST(id AS DOUBLE) AS id, DATE_FORMAT(date, '%Y-%m-%d') AS date, shop, target_daily AS targetDaily, target_cumm AS targetCumm FROM lsr_targets WHERE date >= ? AND date < ? ORDER BY date DESC, id DESC", start, end),
  ]);
  return {
    records: records.map((row) => ({ ...row, qty: String(row.qty), pricePerUnit: String(row.pricePerUnit), totalPrice: String(row.totalPrice) })),
    targets: targets.map((row) => ({ ...row, targetDaily: row.targetDaily === null ? null : String(row.targetDaily), targetCumm: row.targetCumm === null ? null : String(row.targetCumm) })),
  };
}

export async function importLsr(file: File, month: string, confirmChanges: boolean) {
  bounds(month);
  const { records, targets } = await parseWorkbook(file, month);
  const [existingRecords, existingTargets] = await Promise.all([
    prisma.$queryRawUnsafe<LsrRecord[]>("SELECT CAST(id AS DOUBLE) AS id, DATE_FORMAT(date, '%Y-%m-%d') AS date, shift, shift2, shop, part_no AS partNo, reason, part_name AS partName, qty, price_per_unit AS pricePerUnit, total_price AS totalPrice FROM lsr_records"),
    prisma.$queryRawUnsafe<LsrTarget[]>("SELECT CAST(id AS DOUBLE) AS id, DATE_FORMAT(date, '%Y-%m-%d') AS date, shop, target_daily AS targetDaily, target_cumm AS targetCumm FROM lsr_targets"),
  ]);
  const recordMap = new Map(existingRecords.map((row) => [recordKey(row), row])); const targetMap = new Map(existingTargets.map((row) => [targetKey(row), row]));
  const conflicts: LsrImportConflict[] = [
    ...records.filter((row) => { const existing = recordMap.get(recordKey(row)); return existing && recordChanged(existing, row); }).map((row) => ({ type: "LSR" as const, date: row.date, label: `${row.shop} · ${row.partNo} · ${row.reason}` })),
    ...targets.filter((row) => { const existing = targetMap.get(targetKey(row)); return existing && targetChanged(existing, row); }).map((row) => ({ type: "Target" as const, date: row.date, label: row.shop })),
  ];
  if (conflicts.length && !confirmChanges) return { conflicts, changed: conflicts.length };
  let inserted = 0; let updated = 0; let skipped = 0;
  await prisma.$transaction(async (db) => {
    for (const row of records) {
      const existing = recordMap.get(recordKey(row));
      if (!existing) { await db.$executeRawUnsafe("INSERT INTO lsr_records (date, shift, shift2, shop, part_no, reason, part_name, qty, price_per_unit, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", row.date, row.shift, row.shift2, row.shop, row.partNo, row.reason, row.partName, row.qty, row.pricePerUnit, row.totalPrice); inserted++; }
      else if (recordChanged(existing, row)) { await db.$executeRawUnsafe("UPDATE lsr_records SET part_name=?, qty=?, price_per_unit=?, total_price=? WHERE id=?", row.partName, row.qty, row.pricePerUnit, row.totalPrice, existing.id); updated++; } else skipped++;
    }
    for (const row of targets) {
      const existing = targetMap.get(targetKey(row));
      if (!existing) { await db.$executeRawUnsafe("INSERT INTO lsr_targets (date, shop, target_daily, target_cumm) VALUES (?, ?, ?, ?)", row.date, row.shop, row.targetDaily, row.targetCumm); inserted++; }
      else if (targetChanged(existing, row)) { await db.$executeRawUnsafe("UPDATE lsr_targets SET target_daily=?, target_cumm=? WHERE id=?", row.targetDaily, row.targetCumm, existing.id); updated++; } else skipped++;
    }
  });
  return { inserted, updated, skipped };
}

export async function updateLsrRecords(updates: Array<{ id: number; values: LsrRecordValueUpdate }>) {
  if (!updates.length) return;
  await prisma.$transaction(updates.map(({ id, values }) => {
    const partName = values.partName.trim(); const qty = parseNumber(values.qty); const pricePerUnit = parseNumber(values.pricePerUnit); const totalPrice = parseNumber(values.totalPrice);
    if (!partName || qty === null || pricePerUnit === null || totalPrice === null) throw new Error("Part Name, Qty, Price /unit, dan Total Price harus valid");
    return prisma.$executeRawUnsafe("UPDATE lsr_records SET part_name=?, qty=?, price_per_unit=?, total_price=? WHERE id=?", partName, qty, pricePerUnit, totalPrice, id);
  }));
}

export async function updateLsrTargets(updates: Array<{ id: number; values: LsrTargetValueUpdate }>) {
  if (!updates.length) return;
  await prisma.$transaction(updates.map(({ id, values }) => {
    const daily = parseNumber(values.targetDaily, true); const cumm = parseNumber(values.targetCumm, true);
    if ((values.targetDaily.trim() && daily === null) || (values.targetCumm.trim() && cumm === null)) throw new Error("Target Daily dan Target Cumm. harus berupa angka atau kosong");
    return prisma.$executeRawUnsafe("UPDATE lsr_targets SET target_daily=?, target_cumm=? WHERE id=?", daily, cumm, id);
  }));
}

export async function deleteLsrRecords(ids: number[]) { if (ids.length) await prisma.$transaction(ids.map((id) => prisma.$executeRawUnsafe("DELETE FROM lsr_records WHERE id=?", id))); }
export async function deleteLsrTargets(ids: number[]) { if (ids.length) await prisma.$transaction(ids.map((id) => prisma.$executeRawUnsafe("DELETE FROM lsr_targets WHERE id=?", id))); }

export async function getLsrAsakaiFilters(): Promise<LsrAsakaiFilter[]> {
  const [parts, selected] = await Promise.all([prisma.$queryRawUnsafe<Array<{ shop: string; partNo: string }>>("SELECT DISTINCT shop, part_no AS partNo FROM lsr_records ORDER BY shop, part_no"), prisma.$queryRawUnsafe<Array<{ line: LsrAsakaiLineKey; partNo: string }>>("SELECT line_key AS line, part_no AS partNo FROM lsr_asakai_part_filters")]);
  return asakaiLines.map((config) => ({ line: config.line, shop: config.shop, partNos: parts.filter((row) => row.shop === config.shop).map((row) => row.partNo), selectedPartNos: selected.filter((row) => row.line === config.line).map((row) => row.partNo).length ? selected.filter((row) => row.line === config.line).map((row) => row.partNo) : config.defaults }));
}
export async function saveLsrAsakaiFilters(filters: Array<{ line: LsrAsakaiLineKey; partNos: string[] }>) { await prisma.$transaction(async (db) => { await db.$executeRawUnsafe("DELETE FROM lsr_asakai_part_filters"); for (const filter of filters) for (const partNo of filter.partNos) await db.$executeRawUnsafe("INSERT INTO lsr_asakai_part_filters (line_key, part_no) VALUES (?, ?)", filter.line, partNo); }); }
export async function getLsrWeeklyData(month: string): Promise<LsrWeeklyData> {
  const { start, end } = bounds(month); const filters = await getLsrAsakaiFilters(); const days = new Date(`${month}-01T00:00:00`).getDay(); const weekCount = Math.ceil((days + new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()) / 7);
  const result = Object.fromEntries(asakaiLines.map((line) => [line.line, { weekly: Array.from({ length: weekCount }, () => 0), total: 0 }])) as LsrWeeklyData;
  for (const filter of filters) { if (!filter.selectedPartNos.length) continue; const rows = await prisma.$queryRawUnsafe<Array<{ date: string; qty: string | number }>>( `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, qty FROM lsr_records WHERE shop=? AND date>=? AND date<? AND part_no IN (${filter.selectedPartNos.map(() => "?").join(",")})`, filter.shop, start, end, ...filter.selectedPartNos); for (const row of rows) { const day = Number(row.date.slice(-2)); const week = Math.floor((days + day - 1) / 7); result[filter.line].weekly[week] += Number(row.qty); result[filter.line].total += Number(row.qty); } }
  return result;
}

export async function getLsrAsakaiKpiData(date: string): Promise<LsrAsakaiKpiData> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Pilih tanggal Asakai yang valid");
  const { start, end } = bounds(date.slice(0, 7));
  const dMinusOne = new Date(`${date}T00:00:00Z`);
  dMinusOne.setUTCDate(dMinusOne.getUTCDate() - 1);
  const kpiDate = dMinusOne.toISOString().slice(0, 10);
  const result = Object.fromEntries(asakaiLines.map((line) => [line.line, {
    r: 0, w: 0, totalDMinusOne: 0, monthTotal: 0, allowance: null,
  }])) as LsrAsakaiKpiData;

  await Promise.all(asakaiLines.map(async (line) => {
    const [amounts] = await prisma.$queryRawUnsafe<Array<{ r: number | string | null; w: number | string | null; monthTotal: number | string | null }>>(
      `SELECT
        COALESCE(SUM(CASE WHEN date = ? AND UPPER(TRIM(shift2)) = 'R' THEN total_price ELSE 0 END), 0) AS r,
        COALESCE(SUM(CASE WHEN date = ? AND UPPER(TRIM(shift2)) = 'W' THEN total_price ELSE 0 END), 0) AS w,
        COALESCE(SUM(total_price), 0) AS monthTotal
       FROM lsr_records
       WHERE shop = ?
         AND date >= ? AND date <= ?
         AND UPPER(TRIM(reason)) <> 'D'`,
      kpiDate,
      kpiDate,
      line.shop,
      start,
      kpiDate,
    );
    const r = Number(amounts?.r ?? 0) / 1_000_000;
    const w = Number(amounts?.w ?? 0) / 1_000_000;
    result[line.line].r = r;
    result[line.line].w = w;
    result[line.line].totalDMinusOne = r + w;
    result[line.line].monthTotal = Number(amounts?.monthTotal ?? 0) / 1_000_000;

    const [target] = await prisma.$queryRawUnsafe<Array<{ targetCumm: number | string }>>(
      `SELECT target_cumm AS targetCumm
       FROM lsr_targets
       WHERE shop = ? AND date >= ? AND date < ? AND target_cumm IS NOT NULL
       ORDER BY date DESC, id DESC
       LIMIT 1`,
      line.targetShop,
      start,
      end,
    );
    result[line.line].allowance = target ? Number(target.targetCumm) : null;
  }));

  return result;
}

export async function getLsrAmountBaseData(date: string): Promise<LsrAmountBaseData> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Pilih tanggal Asakai yang valid");
  const { start } = bounds(date.slice(0, 7));
  const dayCount = Number(date.slice(-2));
  const dates = Array.from({ length: dayCount }, (_, index) => `${date.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`);
  const result = Object.fromEntries(asakaiLines.map((line) => [line.line, {
    daily: dates.map((day) => ({ date: day, amount: 0 })),
    targetDaily: null,
    chartMax: 20,
  }])) as LsrAmountBaseData;

  await Promise.all(asakaiLines.map(async (line) => {
    const [amountRows, targetRows] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ date: string; amount: number | string }>>(
        `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, COALESCE(SUM(total_price), 0) / 1000000 AS amount
         FROM lsr_records
         WHERE shop = ?
           AND date >= ? AND date <= ?
           AND UPPER(TRIM(reason)) <> 'D'
         GROUP BY date
         ORDER BY date`,
        line.shop,
        start,
        date,
      ),
      prisma.$queryRawUnsafe<Array<{ targetDaily: number | string }>>(
        `SELECT target_daily AS targetDaily
         FROM lsr_targets
         WHERE shop = ? AND date = ? AND target_daily IS NOT NULL
         ORDER BY id DESC
         LIMIT 1`,
        line.targetShop,
        date,
      ),
    ]);
    const amountsByDate = new Map(amountRows.map((row) => [row.date, Number(row.amount)]));
    const daily = result[line.line].daily.map((row) => ({ ...row, amount: amountsByDate.get(row.date) ?? 0 }));
    const highestAmount = Math.max(0, ...daily.map((row) => row.amount));
    const chartMax = line.line === "CA"
      ? Math.max(1, Math.ceil(highestAmount))
      : Math.max(10, Math.ceil(highestAmount / 10) * 10);
    result[line.line] = {
      daily,
      targetDaily: targetRows[0] ? Math.trunc(Number(targetRows[0].targetDaily)) / 1_000_000 : null,
      chartMax,
    };
  }));

  return result;
}
