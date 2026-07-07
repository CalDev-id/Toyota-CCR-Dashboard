"use server";

import { auth } from "@/auth";
import {
  buildPayload,
  deletePlanningRow,
  findExistingBatches,
  getPlanningColumns,
  insertPlanningRows,
  replaceExistingBatches,
  requirePlanningPart,
  updatePlanningRow,
} from "@/features/planning/services/planning.service";
import type { PlanningPartKey } from "@/features/planning/types";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthenticated");
  }
}

export async function createPlanningRowAction(
  partParam: PlanningPartKey,
  body: Record<string, unknown>,
) {
  await requireSession();

  const part = requirePlanningPart(partParam);
  const columns = await getPlanningColumns(part);
  const payload = buildPayload(body, columns, "create");
  const inserted = await insertPlanningRows(part, columns, [payload]);

  revalidatePath("/planning");

  return { data: { inserted } };
}

export async function updatePlanningRowAction(
  partParam: PlanningPartKey,
  id: string,
  body: Record<string, unknown>,
) {
  await requireSession();

  const part = requirePlanningPart(partParam);
  const columns = await getPlanningColumns(part);
  await updatePlanningRow(part, columns, id, body);

  revalidatePath("/planning");

  return { data: { id } };
}

export async function deletePlanningRowAction(
  partParam: PlanningPartKey,
  id: string,
) {
  await requireSession();

  const part = requirePlanningPart(partParam);
  const columns = await getPlanningColumns(part);
  await deletePlanningRow(part, columns, id);

  revalidatePath("/planning");

  return { data: { id } };
}

export async function importPlanningRowsAction(
  partParam: PlanningPartKey,
  formData: FormData,
) {
  await requireSession();

  const part = requirePlanningPart(partParam);
  const file = formData.get("file");
  const overwrite = formData.get("overwrite") === "true";

  if (!(file instanceof File)) {
    throw new Error("Excel file is required");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Excel file must contain at least one sheet");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: "" },
  );

  if (rows.length === 0) {
    throw new Error("Excel sheet does not contain rows");
  }

  const columns = await getPlanningColumns(part);
  const conflicts = await findExistingBatches(part, columns, rows);

  if (conflicts.length > 0 && !overwrite) {
    return {
      error: "Import conflicts with existing date, shift, and group data",
      status: 409,
      conflicts,
    };
  }

  if (overwrite) {
    await replaceExistingBatches(part, columns, rows);
  }

  const inserted = await insertPlanningRows(part, columns, rows);

  revalidatePath("/planning");

  return { data: { inserted, overwritten: overwrite, conflicts } };
}
