"use server";

import { requireRoles } from "@/lib/authorization";
import { deleteAsakaiShipments, getAsakaiShipment, importAsakaiShipment, updateAsakaiShipmentValues, type AsakaiShipmentValueUpdate } from "@/features/asakai-shipment/server/asakai-shipment";
import { revalidatePath } from "next/cache";

async function requireShipmentAccess() { await requireRoles("ADMIN", "CCR_OPERATION", "CCR_GROUP_LEADER"); }
export async function getAsakaiShipmentAction(month: string) { await requireShipmentAccess(); return getAsakaiShipment(month); }
export async function importAsakaiShipmentAction(formData: FormData) {
  await requireShipmentAccess();
  const file = formData.get("file");
  if (!(file instanceof File)) return { status: 400 as const, error: "Pilih file Excel terlebih dahulu" };
  try {
    const result = await importAsakaiShipment(file, formData.get("confirmChanges") === "true");
    if ("conflicts" in result) return { status: 409 as const, ...result };
    revalidatePath("/analysis/input-data/shipment"); revalidatePath("/analysis");
    return { status: 200 as const, ...result };
  } catch (error) { return { status: 400 as const, error: error instanceof Error ? error.message : "Gagal mengimport data shipment." }; }
}
export async function deleteAsakaiShipmentsAction(ids: number[]) { await requireShipmentAccess(); await deleteAsakaiShipments(ids); revalidatePath("/analysis/input-data/shipment"); }
export async function updateAsakaiShipmentValuesAction(updates: Array<{ id: number; values: AsakaiShipmentValueUpdate }>) {
  await requireShipmentAccess();
  const result = await updateAsakaiShipmentValues(updates);
  revalidatePath("/analysis/input-data/shipment"); revalidatePath("/analysis");
  return result;
}
