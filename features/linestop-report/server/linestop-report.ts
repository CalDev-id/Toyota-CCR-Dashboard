import "server-only";

import { prisma } from "@/lib/prisma";
import { getReportPrisma } from "@/lib/report-prisma";
import type { ProductionAchievementLineKey } from "@/features/production-achievement/types";

export const LINESTOP_LINES: Array<{ key: ProductionAchievementLineKey; label: string; view: string }> = [
  { key: "assy", label: "Assy", view: "v_assy_detail_problem" },
  { key: "cylblock", label: "Cylinder Block", view: "v_cylblock_detail_problem" },
  { key: "cylhead", label: "Cylinder Head", view: "v_cylhead_detail_problem" },
  { key: "crankshaft", label: "Crankshaft", view: "v_crankshaft_detail_problem" },
  { key: "camshaft", label: "Camshaft", view: "v_camshaft_detail_problem" },
];

export type LinestopMachine = { id: number; lineKey: ProductionAchievementLineKey; machineName: string };
export type LinestopSummaryRow = { machineName: string; minutes: number };
export type LinestopLineSummary = { key: ProductionAchievementLineKey; label: string; rows: LinestopSummaryRow[]; unmappedMinutes: number; unmappedRows: LinestopSummaryRow[] };

type DatabaseMachineRow = { id: number; lineKey: ProductionAchievementLineKey; machineName: string; normalizedName: string };
type ProblemRow = { problemAv: unknown; lsAvMin: unknown; problemPe: unknown; lsPeMin: unknown };

export function normalizeMachineName(value: string) {
  const uppercase = value.toUpperCase();
  const machineCode = uppercase.match(/\b([A-Z]{2,5})\s*[-._/]?\s*(\d{3})\b/);
  return machineCode ? `${machineCode[1]}${machineCode[2]}` : uppercase.replace(/[^A-Z0-9]+/g, "");
}
function toMinutes(value: unknown) { const parsed = Number(String(value ?? "").replace(",", ".")); return Number.isFinite(parsed) ? parsed : 0; }
function monthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Bulan tidak valid");
  const [year, value] = month.split("-").map(Number);
  return { start: `${month}-01`, end: `${year + (value === 12 ? 1 : 0)}-${String(value === 12 ? 1 : value + 1).padStart(2, "0")}-01` };
}

export async function getLinestopMachines() {
  const rows = await prisma.$queryRawUnsafe<DatabaseMachineRow[]>("SELECT id, line_key AS lineKey, machine_name AS machineName, normalized_name AS normalizedName FROM linestop_db ORDER BY line_key, machine_name");
  return rows.map((row) => ({ id: Number(row.id), lineKey: row.lineKey, machineName: row.machineName }));
}

function findMachine(problem: unknown, machines: DatabaseMachineRow[]) {
  const normalizedProblem = normalizeMachineName(String(problem ?? ""));
  if (!normalizedProblem) return null;
  return machines.reduce<{ row: DatabaseMachineRow; index: number } | null>((best, row) => {
    const normalizedName = normalizeMachineName(row.machineName);
    const index = normalizedProblem.indexOf(normalizedName);
    if (index < 0) return best;
    if (!best || index < best.index || (index === best.index && normalizedName.length > normalizeMachineName(best.row.machineName).length)) return { row, index };
    return best;
  }, null)?.row ?? null;
}

export async function getLinestopReport(month: string): Promise<LinestopLineSummary[]> {
  const { start, end } = monthBounds(month);
  const masterRows = await prisma.$queryRawUnsafe<DatabaseMachineRow[]>("SELECT id, line_key AS lineKey, machine_name AS machineName, normalized_name AS normalizedName FROM linestop_db");
  return Promise.all(LINESTOP_LINES.map(async (line) => {
    const machines = masterRows.filter((row) => row.lineKey === line.key);
    const rows = await getReportPrisma().$queryRawUnsafe<ProblemRow[]>(`SELECT Problem_AV AS problemAv, LS_AV_min AS lsAvMin, Problem_PE AS problemPe, LS_PE_min AS lsPeMin FROM \`${line.view}\` WHERE \`DATE\` >= ? AND \`DATE\` < ?`, start, end);
    const totals = new Map<string, number>(); const unmapped = new Map<string, number>(); let unmappedMinutes = 0;
    for (const row of rows) for (const [problem, minutes] of [[row.problemAv, row.lsAvMin], [row.problemPe, row.lsPeMin]] as const) {
      const value = toMinutes(minutes); if (!String(problem ?? "").trim() || value <= 0) continue;
      const machine = findMachine(problem, machines);
      if (!machine) { const text = String(problem).trim(); unmappedMinutes += value; unmapped.set(text, (unmapped.get(text) ?? 0) + value); }
      else totals.set(machine.machineName, (totals.get(machine.machineName) ?? 0) + value);
    }
    return { key: line.key, label: line.label, unmappedMinutes, rows: [...totals].map(([machineName, minutes]) => ({ machineName, minutes })).sort((a, b) => b.minutes - a.minutes || a.machineName.localeCompare(b.machineName)), unmappedRows: [...unmapped].map(([machineName, minutes]) => ({ machineName, minutes })).sort((a, b) => b.minutes - a.minutes || a.machineName.localeCompare(b.machineName)) };
  }));
}

function validateMachine(lineKey: string, machineName: string) {
  if (!LINESTOP_LINES.some((line) => line.key === lineKey)) throw new Error("Line tidak valid");
  const normalizedName = normalizeMachineName(machineName);
  if (!normalizedName || machineName.trim().length > 191) throw new Error("Nama mesin tidak valid");
  return { lineKey: lineKey as ProductionAchievementLineKey, machineName: machineName.trim().toUpperCase(), normalizedName };
}

export async function createLinestopMachine(input: { lineKey: string; machineName: string }) {
  const value = validateMachine(input.lineKey, input.machineName);
  await prisma.$executeRawUnsafe("INSERT INTO linestop_db (line_key, machine_name, normalized_name) VALUES (?, ?, ?)", value.lineKey, value.machineName, value.normalizedName);
}
export async function updateLinestopMachine(input: { id: number; lineKey: string; machineName: string }) {
  if (!Number.isInteger(input.id) || input.id <= 0) throw new Error("ID mesin tidak valid");
  const value = validateMachine(input.lineKey, input.machineName);
  await prisma.$executeRawUnsafe("UPDATE linestop_db SET line_key = ?, machine_name = ?, normalized_name = ? WHERE id = ?", value.lineKey, value.machineName, value.normalizedName, input.id);
}

export async function deleteLinestopMachine(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new Error("ID mesin tidak valid");
  await prisma.$executeRawUnsafe("DELETE FROM linestop_db WHERE id = ?", id);
}
