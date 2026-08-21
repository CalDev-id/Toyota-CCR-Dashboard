"use server";

import { requireRoles } from "@/lib/authorization";
import {
  getAsakaiStock,
  importAsakaiStock,
  deleteAsakaiStock,
  updateAsakaiStockValues,
  type AsakaiStockValueUpdate,
} from "@/features/asakai-stock/server/asakai-stock";
import { revalidatePath } from "next/cache";

async function requireStockAccess() {
  await requireRoles("ADMIN", "CCR_OPERATION", "CCR_GROUP_LEADER");
}

export async function getAsakaiStockAction(month: string) {
  await requireStockAccess();
  return getAsakaiStock(month);
}

export async function importAsakaiStockAction(formData: FormData) {
  await requireStockAccess();
  const file = formData.get("file");
  const month = String(formData.get("month") ?? "");
  const confirmChanges = formData.get("confirmChanges") === "true";

  if (!(file instanceof File)) throw new Error("Pilih file Excel terlebih dahulu");

  const result = await importAsakaiStock(file, month, confirmChanges);
  if ("conflicts" in result) return { status: 409 as const, ...result };

  revalidatePath("/analysis/input-data/stock");
  return { status: 200 as const, ...result };
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
