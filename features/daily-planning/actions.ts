"use server";

import { auth } from "@/auth";
import { getReportPrisma } from "@/lib/report-prisma";
import { revalidatePath } from "next/cache";

type SlotTemplate = { order: number; start: string; end: string; minutes: number; type: "normal" | "ot" };
type Plan = { id: number; override_tt: number | null; override_ratio: string | null; source_tt: number | null; source_oee: number | null; source_ratio: string | null; source_ot_minutes: number | null };
type Slot = { id: number; slot_order: number; start_time: string; end_time: string; prod_minutes: number; slot_type: "normal" | "ot"; oee: number | null; is_oee_override: number; total_target: number; one_tr: number; two_tr: number; is_schedule_override: number };

const parts = new Set(["assy", "cylblock", "cylhead", "camshaft", "crankshaft"]);
const daySlots: SlotTemplate[] = [
  { order: 1, start: "07:20", end: "08:20", minutes: 60, type: "normal" }, { order: 2, start: "08:20", end: "09:30", minutes: 70, type: "normal" }, { order: 3, start: "09:40", end: "10:40", minutes: 60, type: "normal" }, { order: 4, start: "10:40", end: "11:45", minutes: 65, type: "normal" }, { order: 5, start: "12:30", end: "14:00", minutes: 90, type: "normal" }, { order: 6, start: "14:10", end: "15:10", minutes: 60, type: "normal" }, { order: 7, start: "15:10", end: "16:00", minutes: 50, type: "normal" }, { order: 8, start: "16:00", end: "18:00", minutes: 120, type: "ot" },
];
const fridaySlots = daySlots.map((slot) => slot.order === 5 ? { ...slot, start: "13:00", end: "14:30" } : slot.order === 6 ? { ...slot, start: "14:40", end: "15:40" } : slot.order === 7 ? { ...slot, start: "15:40", end: "16:30" } : slot.order === 8 ? { ...slot, start: "16:30", end: "18:30" } : { ...slot });
const nightSlots: SlotTemplate[] = [{ order: 1, start: "20:05", end: "21:05", minutes: 60, type: "ot" }, { order: 2, start: "21:05", end: "22:00", minutes: 55, type: "normal" }, { order: 3, start: "22:10", end: "23:00", minutes: 50, type: "normal" }, { order: 4, start: "23:00", end: "00:00", minutes: 60, type: "normal" }, { order: 5, start: "00:30", end: "01:30", minutes: 60, type: "normal" }, { order: 6, start: "01:30", end: "02:30", minutes: 60, type: "normal" }, { order: 7, start: "02:40", end: "03:40", minutes: 60, type: "normal" }, { order: 8, start: "03:40", end: "04:45", minutes: 65, type: "normal" }, { order: 9, start: "05:00", end: "05:45", minutes: 45, type: "normal" }, { order: 10, start: "05:45", end: "06:15", minutes: 30, type: "ot" }];

function parseRatio(value: unknown) { const [one, two] = String(value ?? "").split(":").map(Number); return [Math.max(0, one || 0), Math.max(0, two || 0)] as const; }
function split(total: number, one: number, two: number) { const first = Math.round(total * one / (one + two || 1)); return [first, total - first] as const; }
function addMinutes(time: string, minutes: number) { const [hour, minute] = time.split(":").map(Number); const total = hour * 60 + minute + minutes; return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; }
function calculateDurationMinutes(startTime: string, endTime: string) { const [startHour,startMinute] = startTime.split(":").map(Number); const [endHour,endMinute] = endTime.split(":").map(Number); if (![startHour,startMinute,endHour,endMinute].every(Number.isFinite)) return 0; const startTotal = startHour * 60 + startMinute; const endTotal = endHour * 60 + endMinute; return Math.max(0,endTotal >= startTotal ? endTotal - startTotal : endTotal + 24 * 60 - startTotal); }
function targetFor(minutes: number, tt: number, oee: number) { return tt > 0 ? Math.round(minutes / tt * oee / 100) : 0; }
async function requireUser() { if (!(await auth())?.user) throw new Error("Unauthenticated"); }
function tableFor(part: string) { if (!parts.has(part)) throw new Error("Invalid planning line"); return `t_plan_daily_production_${part}`; }
function toNullableNumber(value: unknown) { if (value === null || value === undefined || value === "") return null; const numeric = Number(value); return Number.isFinite(numeric) ? numeric : null; }
function sameNullableNumber(left: unknown, right: unknown) { const leftNumber = toNullableNumber(left); const rightNumber = toNullableNumber(right); return leftNumber === rightNumber; }
function sameNullableText(left: unknown, right: unknown) { const leftText = left === null || left === undefined ? "" : String(left); const rightText = right === null || right === undefined ? "" : String(right); return leftText === rightText; }

async function getPlanContext(part: string, date: string, shift: string, group: string) {
  const db = getReportPrisma(); const table = tableFor(part);
  const planGroup = part === "assy" ? "all" : group;
  const source = part === "assy"
    ? await db.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT ftt, foee, fratio, fot FROM \`${table}\` WHERE fdate=? AND fshift=? LIMIT 1`, date, shift)
    : await db.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT ftt, foee, fratio, fot FROM \`${table}\` WHERE fdate=? AND fshift=? AND fgroup=? LIMIT 1`, date, shift, group);

  // Monthly Planning is the master:
  // - if the monthly row does not exist, Daily Planning shows an empty-state message;
  // - if TT/OEE/Ratio exist but are blank, Daily keeps them blank instead of defaulting;
  // - when monthly values change, daily overrides are reset on the next load;
  // - manual Daily Planning edits stay in Daily Planning only.
  if (source.length === 0) {
    return { hasMonthlyData: false as const, db, plan: null, tt: 0, ratio: "", monthlyOee: 0, otMinutes: 0 };
  }
  const sourceRatio = String(source[0]?.fratio ?? "").trim();
  const monthlyTt = toNullableNumber(source[0]?.ftt); const monthlyRatio = sourceRatio; const monthlyOee = toNullableNumber(source[0]?.foee); const otMinutes = Math.max(0, Math.round(Number(source[0]?.fot ?? 0) * 60));
  await db.$executeRawUnsafe("INSERT IGNORE INTO t_daily_production_plan (line_key,fdate,fshift,fgroup) VALUES (?,?,?,?)", part,date,shift,planGroup);
  const plans = await db.$queryRawUnsafe<Plan[]>("SELECT id,override_tt,override_ratio,source_tt,source_oee,source_ratio,source_ot_minutes FROM t_daily_production_plan WHERE line_key=? AND fdate=? AND fshift=? AND fgroup=? LIMIT 1", part,date,shift,planGroup);
  const plan = plans[0]; if (!plan) throw new Error("Unable to create daily plan");
  const monthlyChanged = !sameNullableNumber(plan.source_tt, monthlyTt) || !sameNullableNumber(plan.source_oee, monthlyOee) || !sameNullableText(plan.source_ratio, monthlyRatio) || Number(plan.source_ot_minutes ?? 0) !== otMinutes;
  if (monthlyChanged) {
    await db.$executeRawUnsafe("UPDATE t_daily_production_plan SET override_tt=NULL,override_ratio=NULL,source_tt=?,source_oee=?,source_ratio=?,source_ot_minutes=? WHERE id=?", monthlyTt, monthlyOee, monthlyRatio, otMinutes, plan.id);
    await db.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET is_oee_override=0,oee=NULL,is_schedule_override=0 WHERE daily_plan_id=?", plan.id);
    plan.override_tt = null; plan.override_ratio = null;
  }
  const tt = toNullableNumber(plan.override_tt) ?? monthlyTt; const ratio = plan.override_ratio ?? monthlyRatio;
  return { hasMonthlyData: true as const, db, plan, tt, ratio, monthlyOee, otMinutes };
}

function getTemplate(date: string, shift: string, otMinutes: number) {
  const base = shift === "1" ? (new Date(`${date}T00:00:00`).getDay() === 5 ? fridaySlots : daySlots) : nightSlots;
  return base.flatMap((slot) => { if (slot.type === "normal") return [slot]; if (shift === "1") { const minutes = Math.min(otMinutes, slot.minutes); return minutes ? [{ ...slot, minutes, end: addMinutes(slot.start, minutes) }] : []; } const minutes = slot.order === 1 ? Math.min(otMinutes, 60) : Math.min(Math.max(otMinutes - 60, 0), 30); return minutes ? [{ ...slot, minutes, end: addMinutes(slot.start, minutes) }] : []; });
}

export async function loadDailyPlanning(part: string, date: string, shift: string, group: string) {
  await requireUser(); const context = await getPlanContext(part,date,shift,group); const { db, plan, tt, ratio, monthlyOee, otMinutes } = context;
  if (!context.hasMonthlyData || !plan) {
    return {
      group,
      tt: 0,
      oee: 0,
      ratio: "",
      ratioOne: 1,
      ratioTwo: 1,
      hasMonthlyData: false,
      message: "Data monthly untuk tanggal ini belum diisi.",
      rows: [],
    };
  }
  const existing = await db.$queryRawUnsafe<Slot[]>("SELECT id,slot_order,TIME_FORMAT(start_time,'%H:%i') AS start_time,TIME_FORMAT(end_time,'%H:%i') AS end_time,prod_minutes,slot_type,oee,is_oee_override,total_target,one_tr,two_tr,is_schedule_override FROM t_daily_production_plan_slot WHERE daily_plan_id=? ORDER BY slot_order", plan.id);
  const template = getTemplate(date,shift,otMinutes);
  const [ratioOne, ratioTwo] = parseRatio(ratio);
  const templateOrders = new Set(template.map((slot) => slot.order));
  const staleSlots = existing.filter((row) => !templateOrders.has(Number(row.slot_order)));

  if (staleSlots.length > 0) {
    await db.$executeRawUnsafe(
      `DELETE FROM t_daily_production_plan_slot WHERE id IN (${staleSlots.map(() => "?").join(",")})`,
      ...staleSlots.map((row) => row.id),
    );
  }

  for (const slot of template) {
    const existingSlot = existing.find((row) => Number(row.slot_order) === slot.order);
    const oeeForTarget = existingSlot?.is_oee_override ? Number(existingSlot.oee) : (monthlyOee ?? 0);
    const target = targetFor(slot.minutes, tt ?? 0, oeeForTarget);
    const [oneTr,twoTr] = split(target,ratioOne,ratioTwo);

    if (!existingSlot) {
      await db.$executeRawUnsafe("INSERT INTO t_daily_production_plan_slot (daily_plan_id,slot_order,start_time,end_time,prod_minutes,slot_type,total_target,one_tr,two_tr) VALUES (?,?,?,?,?,?,?,?,?)",plan.id,slot.order,slot.start,slot.end,slot.minutes,slot.type,target,oneTr,twoTr);
      continue;
    }

    if (!existingSlot.is_schedule_override) {
      await db.$executeRawUnsafe(
        "UPDATE t_daily_production_plan_slot SET start_time=?,end_time=?,prod_minutes=?,slot_type=?,total_target=?,one_tr=?,two_tr=? WHERE id=?",
        slot.start,
        slot.end,
        slot.minutes,
        slot.type,
        target,
        oneTr,
        twoTr,
        existingSlot.id,
      );
    }
  }
  const slots = await db.$queryRawUnsafe<Slot[]>("SELECT id,slot_order,TIME_FORMAT(start_time,'%H:%i') AS start_time,TIME_FORMAT(end_time,'%H:%i') AS end_time,prod_minutes,slot_type,oee,is_oee_override,total_target,one_tr,two_tr,is_schedule_override FROM t_daily_production_plan_slot WHERE daily_plan_id=? ORDER BY slot_order", plan.id);
  const rows = slots.map((slot) => { const oee = slot.is_oee_override ? Number(slot.oee) : monthlyOee; const target = slot.is_schedule_override ? Number(slot.total_target) : targetFor(Number(slot.prod_minutes),tt ?? 0,oee ?? 0); const [oneTr,twoTr] = slot.is_schedule_override ? [Number(slot.one_tr),Number(slot.two_tr)] : split(target,ratioOne,ratioTwo); return { ...slot, oee: Number(slot.oee ?? 0), ftt: tt ?? "", foee: oee ?? "", fratio: ratio, ftotal_target:target, f1tr:oneTr, f2tr:twoTr }; });
  return { group, tt, oee: monthlyOee, ratio, ratioOne, ratioTwo, hasMonthlyData: true, message: "", rows };
}

export async function updateDailyTarget(id: number, target: number, ratioOne: number, ratioTwo: number) { await requireUser(); const [oneTr,twoTr] = split(Math.max(0,target),ratioOne,ratioTwo); await getReportPrisma().$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET total_target=?,one_tr=?,two_tr=?,is_schedule_override=1 WHERE id=?",target,oneTr,twoTr,id); revalidatePath("/daily-planning"); }
export async function updateDailyOee(id: number, oee: number) { await requireUser(); if (oee <= 0) throw new Error("OEE harus valid"); await getReportPrisma().$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET oee=?,is_oee_override=1 WHERE id=?",oee,id); revalidatePath("/daily-planning"); }
export async function updateDailySharedParameters(part: string,date: string,shift: string,group: string,tt: number,ratio: string) { await requireUser(); const [one,two] = parseRatio(ratio); if (tt<=0 || one+two<=0) throw new Error("TT dan Ratio harus valid"); const { db,plan,hasMonthlyData } = await getPlanContext(part,date,shift,group); if (!hasMonthlyData || !plan) throw new Error("Data monthly untuk tanggal ini belum diisi."); await db.$executeRawUnsafe("UPDATE t_daily_production_plan SET override_tt=?,override_ratio=? WHERE id=?",tt,`${one}:${two}`,plan.id); revalidatePath("/daily-planning"); }
export async function updateDailySlotSchedule(id: number,startTime: string,endTime: string,_minutes: number,ratioOne: number,ratioTwo: number,tt: number,oee: number) { await requireUser(); const minutes = calculateDurationMinutes(startTime,endTime); const target=targetFor(minutes,tt,oee*100); const [oneTr,twoTr]=split(target,ratioOne,ratioTwo); await getReportPrisma().$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET start_time=?,end_time=?,prod_minutes=?,total_target=?,one_tr=?,two_tr=?,is_schedule_override=1 WHERE id=?",startTime,endTime,minutes,target,oneTr,twoTr,id); revalidatePath("/daily-planning"); }
