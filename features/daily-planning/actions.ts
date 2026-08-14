"use server";

import {
  deleteDailyOtData,
  deleteDailyPlanningData,
  getDailyPlanningHistoryData,
  loadDailyPlanningData,
  getManualDailyPlanningTemplate,
  type ManualPlanningSlotInput,
  saveManualDailyPlanningData,
  saveDailyOtData,
  updateDailyOeeData,
  updateDailySharedParametersData,
  updateDailySlotParametersData,
  updateDailySlotScheduleData,
  updateDailySlotRemarkData,
  updateDailyTargetData,
} from "@/features/daily-planning/server/daily-planning-service";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/authorization";

async function requireUser() {
  await requireRoles("ADMIN", "CCR_OPERATION", "CCR_GROUP_LEADER");
}

async function getCurrentUserId() {
  const userId = Number((await auth())?.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("User tidak valid");
  return userId;
}

export async function loadDailyPlanning(part: string, date: string, shift: string) {
  await requireUser();
  return loadDailyPlanningData(part, date, shift);
}

export async function loadDailyPlanningHistory(part: string, date: string, shift: string) {
  await requireUser();
  return getDailyPlanningHistoryData(part, date, shift);
}

export async function getManualDailyPlanningDraft(part: string, date: string, shift: string) {
  await requireUser();
  return getManualDailyPlanningTemplate(part, date, shift);
}

export async function saveManualDailyPlanning(
  part: string,
  date: string,
  shift: string,
  slots: ManualPlanningSlotInput[],
) {
  await requireUser();
  await saveManualDailyPlanningData(part, date, shift, slots, await getCurrentUserId());
  revalidatePath("/daily-planning");
}

export async function updateDailyTarget(
  part: string,
  id: number,
  target: number,
  ratioOne: number,
  ratioTwo: number,
) {
  await requireUser();
  await updateDailyTargetData(part, Number(id), target, ratioOne, ratioTwo, await getCurrentUserId());
  revalidatePath("/daily-planning");
}

export async function updateDailyOee(id: number, oee: number) {
  await requireUser();
  await updateDailyOeeData(Number(id), oee, await getCurrentUserId());
  revalidatePath("/daily-planning");
}

export async function updateDailySlotRemark(id: number, remark: string) {
  await requireUser();
  await updateDailySlotRemarkData(Number(id), String(remark ?? "").trim(), await getCurrentUserId());
  revalidatePath("/daily-planning");
}

export async function updateDailySharedParameters(
  part: string,
  date: string,
  shift: string,
  tt: number,
  ratio: string,
) {
  await requireUser();
  await updateDailySharedParametersData(part, date, shift, tt, ratio, await getCurrentUserId());
  revalidatePath("/daily-planning");
}

export async function updateDailySlotParameters(
  part: string,
  id: number,
  tt: number,
  ratio: string,
) {
  await requireUser();
  await updateDailySlotParametersData(part, Number(id), tt, ratio, await getCurrentUserId());
  revalidatePath("/daily-planning");
}

export async function updateDailySlotSchedule(
  part: string,
  id: number,
  startTime: string,
  endTime: string,
  minutes: number,
  ratioOne: number,
  ratioTwo: number,
  tt: number,
  oee: number,
) {
  await requireUser();
  await updateDailySlotScheduleData(
    part,
    id,
    startTime,
    endTime,
    minutes,
    ratioOne,
    ratioTwo,
    tt,
    oee,
    await getCurrentUserId(),
  );
  revalidatePath("/daily-planning");
}

export async function saveDailyOt(
  part: string,
  date: string,
  shift: string,
  slot: ManualPlanningSlotInput,
) {
  await requireUser();
  await saveDailyOtData(part, date, shift, slot, await getCurrentUserId());
  revalidatePath("/daily-planning");
}

export async function deleteDailyOt(id: number) {
  await requireUser();
  await deleteDailyOtData(id, await getCurrentUserId());
  revalidatePath("/daily-planning");
}

export async function deleteDailyPlanning(part: string, date: string, shift: string) {
  await requireRoles("ADMIN");
  await deleteDailyPlanningData(part, date, shift, await getCurrentUserId());
  revalidatePath("/daily-planning");
  revalidatePath("/production-achievement");
}
