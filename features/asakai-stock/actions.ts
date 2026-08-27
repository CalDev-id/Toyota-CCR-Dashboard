"use server";

import { requireRoles } from "@/lib/authorization";
import {
  getAsakaiStock,
  importAsakaiStock,
  deleteAsakaiStock,
  deleteAsakaiStocks,
  updateAsakaiStockValues,
  type AsakaiStockValueUpdate,
} from "@/features/asakai-stock/server/asakai-stock";
import { revalidatePath } from "next/cache";

async function requireStockAccess() {
  await requireRoles("ADMIN", "CCR_OPERATION", "CCR_GROUP_LEADER");
}

export async function getAsakaiStockAction(start: string, end: string) {
  await requireStockAccess();
  return getAsakaiStock(start, end);
}

export async function importAsakaiStockAction(formData: FormData) {
  await requireStockAccess();
  const file = formData.get("file");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const confirmChanges = formData.get("confirmChanges") === "true";

  if (!(file instanceof File)) return { status: 400 as const, error: "Pilih file Excel terlebih dahulu" };

  try {
    const result = await importAsakaiStock(file, startDate, endDate, confirmChanges);
    if ("conflicts" in result) return { status: 409 as const, ...result };

    revalidatePath("/analysis/input-data/stock");
    return { status: 200 as const, ...result };
  } catch (error) {
    console.error("Asakai stock Excel import failed", error);
    return {
      status: 400 as const,
      error: error instanceof Error ? error.message : "Gagal mengimport data stock.",
    };
  }
}

export async function updateAsakaiStockValuesAction(updates: Array<{ id: number; values: AsakaiStockValueUpdate }>) {
  await requireStockAccess();
  await updateAsakaiStockValues(updates);
  revalidatePath("/analysis/input-data/stock");
}

export async function deleteAsakaiStockAction(id: number) {
  await requireStockAccess();
  await deleteAsakaiStock(id);
  revalidatePath("/analysis/input-data/stock");
}

export async function deleteAsakaiStocksAction(ids: number[]) {
  await requireStockAccess();
  await deleteAsakaiStocks(ids);
  revalidatePath("/analysis/input-data/stock");
}
