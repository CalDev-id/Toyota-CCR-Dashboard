"use server";

import { getCurrentUserRole, requireRoles } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { createLinestopMachine, deleteLinestopMachine, getLinestopMachines, getLinestopReport, updateLinestopMachine } from "@/features/linestop-report/server/linestop-report";

async function requireReportAccess() {
  const role = await getCurrentUserRole();
  if (!role) throw new Error("Unauthenticated");
}
async function requireManager() { await requireRoles("ADMIN", "CCR_OPERATION", "CCR_GROUP_LEADER"); }
export async function loadLinestopReportAction(month: string) { await requireReportAccess(); return getLinestopReport(month); }
export async function loadLinestopMachinesAction() { await requireReportAccess(); return getLinestopMachines(); }
export async function createLinestopMachineAction(input: { lineKey: string; machineName: string }) { await requireManager(); await createLinestopMachine(input); revalidatePath("/production-achievement/linestop-report"); }
export async function updateLinestopMachineAction(input: { id: number; lineKey: string; machineName: string }) { await requireManager(); await updateLinestopMachine(input); revalidatePath("/production-achievement/linestop-report"); }
export async function deleteLinestopMachineAction(id: number) { await requireManager(); await deleteLinestopMachine(id); revalidatePath("/production-achievement/linestop-report"); }
