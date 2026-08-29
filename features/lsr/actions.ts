"use server";

import { requireRoles } from "@/lib/authorization";
import { deleteLsrRecords, deleteLsrTargets, getLsrAsakaiFilters, getLsrData, importLsr, saveLsrAsakaiFilters, updateLsrRecords, updateLsrTargets, type LsrAsakaiLineKey, type LsrRecordValueUpdate, type LsrTargetValueUpdate } from "@/features/lsr/server/lsr";
import { revalidatePath } from "next/cache";

async function requireLsrAccess() { await requireRoles("ADMIN", "CCR_OPERATION", "CCR_GROUP_LEADER"); }
export async function getLsrDataAction(date: string, targetMonth: string) { await requireLsrAccess(); return getLsrData(date, targetMonth); }
export async function importLsrAction(formData: FormData) {
  await requireLsrAccess();
  const file = formData.get("file");
  if (!(file instanceof File)) return { status: 400 as const, error: "Pilih file Excel terlebih dahulu" };
  try {
    const result = await importLsr(file, String(formData.get("month") ?? ""), formData.get("confirmChanges") === "true");
    if ("conflicts" in result) return { status: 409 as const, ...result };
    revalidatePath("/analysis/input-data/lsr"); revalidatePath("/analysis");
    return { status: 200 as const, ...result };
  } catch (error) { return { status: 400 as const, error: error instanceof Error ? error.message : "Gagal mengimport data LSR." }; }
}
export async function updateLsrRecordsAction(updates: Array<{ id: number; values: LsrRecordValueUpdate }>) { await requireLsrAccess(); await updateLsrRecords(updates); revalidatePath("/analysis/input-data/lsr"); }
export async function updateLsrTargetsAction(updates: Array<{ id: number; values: LsrTargetValueUpdate }>) { await requireLsrAccess(); await updateLsrTargets(updates); revalidatePath("/analysis/input-data/lsr"); }
export async function deleteLsrRecordsAction(ids: number[]) { await requireLsrAccess(); await deleteLsrRecords(ids); revalidatePath("/analysis/input-data/lsr"); }
export async function deleteLsrTargetsAction(ids: number[]) { await requireLsrAccess(); await deleteLsrTargets(ids); revalidatePath("/analysis/input-data/lsr"); }
export async function getLsrAsakaiFiltersAction() { await requireLsrAccess(); return getLsrAsakaiFilters(); }
export async function saveLsrAsakaiFiltersAction(filters: Array<{ line: LsrAsakaiLineKey; partNos: string[] }>) { await requireLsrAccess(); await saveLsrAsakaiFilters(filters); revalidatePath("/analysis/input-data/lsr"); revalidatePath("/analysis"); }
