"use server";

import { auth } from "@/auth";
import {
  loadDailyPlanningData,
  updateDailyOeeData,
  updateDailySharedParametersData,
  updateDailySlotScheduleData,
  updateDailyTargetData,
} from "@/features/daily-planning/server/daily-planning-service";
import { revalidatePath } from "next/cache";

async function requireUser() {
  if (!(await auth())?.user) {
    throw new Error("Unauthenticated");
  }
}

export async function loadDailyPlanning(part: string, date: string, shift: string) {
  await requireUser();
  return loadDailyPlanningData(part, date, shift);
}

export async function updateDailyTarget(
  id: number,
  target: number,
  ratioOne: number,
  ratioTwo: number,
) {
  await requireUser();
  await updateDailyTargetData(id, target, ratioOne, ratioTwo);
  revalidatePath("/daily-planning");
}

export async function updateDailyOee(id: number, oee: number) {
  await requireUser();
  await updateDailyOeeData(id, oee);
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
  await updateDailySharedParametersData(part, date, shift, tt, ratio);
  revalidatePath("/daily-planning");
}

export async function updateDailySlotSchedule(
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
    id,
    startTime,
    endTime,
    minutes,
    ratioOne,
    ratioTwo,
    tt,
    oee,
  );
  revalidatePath("/daily-planning");
}
