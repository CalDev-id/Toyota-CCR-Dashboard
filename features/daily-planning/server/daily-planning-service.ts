import { prisma } from "@/lib/prisma";
import { getReportPrisma } from "@/lib/report-prisma";
import { createHash } from "node:crypto";

type SlotTemplate = { order: number; start: string; end: string; minutes: number; type: "normal" | "ot" };
export type ManualPlanningSlotInput = { order: number; startTime: string; endTime: string; slotType: "normal" | "ot"; tt: number; oee: number; ratio: string };
type Plan = { id: number; override_tt: number | null; override_ratio: string | null; source_tt: number | null; source_oee: number | null; source_ratio: string | null; source_ot_minutes: number | null; source_signature: string | null; is_manual_plan: number; is_deleted: number };
type Slot = { id: number; slot_order: number; start_time: string; end_time: string; prod_minutes: number; slot_type: "normal" | "ot"; oee: number | null; is_oee_override: number; tt_override: number | null; ratio_override: string | null; total_target: number; one_tr: number; two_tr: number; is_schedule_override: number; is_hidden: number; remark: string | null; remark_updated_at: Date | null; remark_updated_by_name: string | null };
type HistoryDb = Pick<typeof prisma, "$executeRawUnsafe" | "$queryRawUnsafe">;
export type RamadanScheduleInput = {
  startDate: string; endDate: string;
  dayRegularStart: string; dayRegularEnd: string; dayRegularBreakOneStart: string; dayRegularBreakOneEnd: string; dayRegularBreakStart: string; dayRegularBreakEnd: string; dayRegularBreakTwoStart: string; dayRegularBreakTwoEnd: string;
  dayFridayStart: string; dayFridayEnd: string; dayFridayBreakOneStart: string; dayFridayBreakOneEnd: string; dayFridayBreakStart: string; dayFridayBreakEnd: string; dayFridayBreakTwoStart: string; dayFridayBreakTwoEnd: string;
  nightStart: string; nightEnd: string; nightBreakOneStart: string; nightBreakOneEnd: string; nightBreakTwoStart: string; nightBreakTwoEnd: string;
};
export type RamadanSchedule = RamadanScheduleInput & { isActive: boolean };
type BreakSchedule = { label: string; start: string; end: string };

const parts = new Set(["assy", "cylblock", "cylhead", "camshaft", "crankshaft"]);
const dailyOtReductionThresholdMinutes = 5 * 60;
const dailyOtReductionMinutes = 8 * 60;
const maghribBreak = { start: "18:00", end: "18:15" };
const daySlots: SlotTemplate[] = [
  { order: 1, start: "07:20", end: "08:20", minutes: 60, type: "normal" }, { order: 2, start: "08:20", end: "09:30", minutes: 70, type: "normal" }, { order: 3, start: "09:40", end: "10:40", minutes: 60, type: "normal" }, { order: 4, start: "10:40", end: "11:45", minutes: 65, type: "normal" }, { order: 5, start: "12:30", end: "14:00", minutes: 90, type: "normal" }, { order: 6, start: "14:10", end: "15:10", minutes: 60, type: "normal" }, { order: 7, start: "15:10", end: "16:00", minutes: 50, type: "normal" }, { order: 8, start: "16:30", end: "18:30", minutes: 120, type: "ot" },
];
const fridaySlots = daySlots.map((slot) => slot.order === 5 ? { ...slot, start: "13:00", end: "14:30" } : slot.order === 6 ? { ...slot, start: "14:40", end: "15:40" } : slot.order === 7 ? { ...slot, start: "15:40", end: "16:30" } : slot.order === 8 ? { ...slot, start: "17:00", end: "19:00" } : { ...slot });
const assyDaySlots = daySlots.map((slot) => slot.order === 5 ? { ...slot, start: "12:45", end: "14:00", minutes: 75 } : slot.order === 6 ? { ...slot, start: "14:10", end: "15:10" } : slot.order === 7 ? { ...slot, start: "15:10", end: "16:15", minutes: 60 } : slot.order === 8 ? { ...slot, start: "16:45", end: "18:45" } : { ...slot });
const assyFridaySlots = assyDaySlots.map((slot) => slot.order === 5 ? { ...slot, start: "13:15", end: "14:30" } : slot.order === 6 ? { ...slot, start: "14:40", end: "15:40" } : slot.order === 7 ? { ...slot, start: "15:40", end: "16:45" } : slot.order === 8 ? { ...slot, start: "17:15", end: "19:15" } : { ...slot });
const nightSlots: SlotTemplate[] = [{ order: 1, start: "20:05", end: "21:05", minutes: 60, type: "ot" }, { order: 2, start: "21:05", end: "22:00", minutes: 55, type: "normal" }, { order: 3, start: "22:10", end: "23:00", minutes: 50, type: "normal" }, { order: 4, start: "23:00", end: "00:00", minutes: 60, type: "normal" }, { order: 5, start: "00:30", end: "01:30", minutes: 60, type: "normal" }, { order: 6, start: "01:30", end: "02:30", minutes: 60, type: "normal" }, { order: 7, start: "02:40", end: "03:40", minutes: 60, type: "normal" }, { order: 8, start: "03:40", end: "04:45", minutes: 65, type: "normal" }, { order: 9, start: "05:00", end: "05:45", minutes: 45, type: "normal" }, { order: 10, start: "05:45", end: "06:15", minutes: 30, type: "ot" }];

function parseRatio(value: unknown) { const [one, two] = String(value ?? "").split(":").map(Number); return [Math.max(0, one || 0), Math.max(0, two || 0)] as const; }
function split(total: number, one: number, two: number) { const first = Math.round(total * one / (one + two || 1)); return [first, total - first] as const; }
function splitTarget(part: string, total: number, one: number, two: number) { return part === "camshaft" ? [total, total] as const : split(total, one, two); }
function addMinutes(time: string, minutes: number) { const [hour, minute] = time.split(":").map(Number); const total = ((hour * 60 + minute + minutes) % (24 * 60) + (24 * 60)) % (24 * 60); return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; }
function calculateDurationMinutes(startTime: string, endTime: string) { const [startHour,startMinute] = startTime.split(":").map(Number); const [endHour,endMinute] = endTime.split(":").map(Number); if (![startHour,startMinute,endHour,endMinute].every(Number.isFinite)) return 0; const startTotal = startHour * 60 + startMinute; const endTotal = endHour * 60 + endMinute; return Math.max(0,endTotal >= startTotal ? endTotal - startTotal : endTotal + 24 * 60 - startTotal); }
function toMinutes(time: string) { const [hour, minute] = time.split(":").map(Number); return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0; }
function formatMinutes(total: number) { const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60); return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`; }
function dayOtEndTime(startTime: string, productiveMinutes: number) {
  const breakStart = toMinutes(maghribBreak.start);
  const breakEnd = toMinutes(maghribBreak.end);
  let cursor = toMinutes(startTime);
  let remaining = Math.max(0, productiveMinutes);

  // A shift that begins during Maghrib starts producing after the break.
  if (cursor >= breakStart && cursor < breakEnd) cursor = breakEnd;
  if (cursor < breakStart) {
    const minutesUntilBreak = breakStart - cursor;
    if (remaining <= minutesUntilBreak) return formatMinutes(cursor + remaining);
    remaining -= minutesUntilBreak;
    cursor = breakEnd;
  }

  return formatMinutes(cursor + remaining);
}
function splitsForMaghrib(startTime: string, endTime: string) {
  const breakStart = toMinutes(maghribBreak.start);
  return toMinutes(startTime) < breakStart && toMinutes(endTime) > breakStart;
}
function dayOtSlots(order: number, startTime: string, productiveMinutes: number): SlotTemplate[] {
  const breakStart = toMinutes(maghribBreak.start);
  const breakEnd = toMinutes(maghribBreak.end);
  const startMinutes = toMinutes(startTime);
  const resolvedStartTime = startMinutes >= breakStart && startMinutes < breakEnd ? maghribBreak.end : startTime;
  const endTime = dayOtEndTime(resolvedStartTime, productiveMinutes);
  if (!splitsForMaghrib(resolvedStartTime, endTime)) return [{ order, start: resolvedStartTime, end: endTime, minutes: productiveMinutes, type: "ot" }];

  const beforeMinutes = breakStart - toMinutes(resolvedStartTime);
  return [
    { order, start: resolvedStartTime, end: maghribBreak.start, minutes: beforeMinutes, type: "ot" },
    { order: order + 1, start: maghribBreak.end, end: endTime, minutes: productiveMinutes - beforeMinutes, type: "ot" },
  ];
}
function targetFor(minutes: number, tt: number, oee: number) { return tt > 0 ? Math.round(minutes / tt * oee / 100) : 0; }
function dailyOtMinutesFromMonthly(monthlyOtMinutes: number) { return monthlyOtMinutes > dailyOtReductionThresholdMinutes ? Math.max(0, monthlyOtMinutes - dailyOtReductionMinutes) : monthlyOtMinutes; }
function targetsForSlots(part: string, shift: string, slots: Array<{ key: number; minutes: number; oee: number }>, tt: number) { if (part !== "assy" || shift !== "1" || tt <= 0) return new Map(slots.map((slot) => [slot.key, targetFor(slot.minutes, tt, slot.oee)])); let accumulatedTarget = 0; let roundedTarget = 0; return new Map(slots.map((slot) => { accumulatedTarget += slot.minutes / tt * slot.oee / 100; const nextRoundedTarget = Math.round(accumulatedTarget); const target = nextRoundedTarget - roundedTarget; roundedTarget = nextRoundedTarget; return [slot.key, target] as const; })); }
function tableFor(part: string) { if (!parts.has(part)) throw new Error("Invalid planning line"); return `t_plan_daily_production_${part}`; }
function toNullableNumber(value: unknown) { if (value === null || value === undefined || value === "") return null; const numeric = Number(value); return Number.isFinite(numeric) ? numeric : null; }
function shiftAliases(value: string) {
  return value === "1" ? ["1", "Day", "DAY", "day"] : value === "2" ? ["2", "Night", "NIGHT", "night"] : [value];
}

const ramadanDefaults: RamadanSchedule = {
  isActive: false, startDate: "", endDate: "",
  dayRegularStart: "07:20", dayRegularEnd: "15:50", dayRegularBreakOneStart: "09:30", dayRegularBreakOneEnd: "09:40", dayRegularBreakStart: "12:00", dayRegularBreakEnd: "12:35", dayRegularBreakTwoStart: "14:00", dayRegularBreakTwoEnd: "14:10",
  dayFridayStart: "07:20", dayFridayEnd: "16:15", dayFridayBreakOneStart: "09:30", dayFridayBreakOneEnd: "09:40", dayFridayBreakStart: "12:00", dayFridayBreakEnd: "13:00", dayFridayBreakTwoStart: "14:30", dayFridayBreakTwoEnd: "14:40",
  nightStart: "20:30", nightEnd: "05:50", nightBreakOneStart: "00:00", nightBreakOneEnd: "00:20", nightBreakTwoStart: "04:00", nightBreakTwoEnd: "05:00",
};
const ramadanColumns = "is_active,DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date,DATE_FORMAT(day_regular_start,'%H:%i') AS day_regular_start,DATE_FORMAT(day_regular_end,'%H:%i') AS day_regular_end,DATE_FORMAT(day_regular_break_one_start,'%H:%i') AS day_regular_break_one_start,DATE_FORMAT(day_regular_break_one_end,'%H:%i') AS day_regular_break_one_end,DATE_FORMAT(day_regular_break_start,'%H:%i') AS day_regular_break_start,DATE_FORMAT(day_regular_break_end,'%H:%i') AS day_regular_break_end,DATE_FORMAT(day_regular_break_two_start,'%H:%i') AS day_regular_break_two_start,DATE_FORMAT(day_regular_break_two_end,'%H:%i') AS day_regular_break_two_end,DATE_FORMAT(day_friday_start,'%H:%i') AS day_friday_start,DATE_FORMAT(day_friday_end,'%H:%i') AS day_friday_end,DATE_FORMAT(day_friday_break_one_start,'%H:%i') AS day_friday_break_one_start,DATE_FORMAT(day_friday_break_one_end,'%H:%i') AS day_friday_break_one_end,DATE_FORMAT(day_friday_break_start,'%H:%i') AS day_friday_break_start,DATE_FORMAT(day_friday_break_end,'%H:%i') AS day_friday_break_end,DATE_FORMAT(day_friday_break_two_start,'%H:%i') AS day_friday_break_two_start,DATE_FORMAT(day_friday_break_two_end,'%H:%i') AS day_friday_break_two_end,DATE_FORMAT(night_start,'%H:%i') AS night_start,DATE_FORMAT(night_end,'%H:%i') AS night_end,DATE_FORMAT(night_break_one_start,'%H:%i') AS night_break_one_start,DATE_FORMAT(night_break_one_end,'%H:%i') AS night_break_one_end,DATE_FORMAT(night_break_two_start,'%H:%i') AS night_break_two_start,DATE_FORMAT(night_break_two_end,'%H:%i') AS night_break_two_end";
function asRamadanSchedule(row?: Record<string, unknown>): RamadanSchedule {
  if (!row) return ramadanDefaults;
  const normalizeLegacyDayStart = (value: unknown) => String(value) === "07:15" ? "07:20" : String(value);
  return { isActive: Boolean(row.is_active), startDate: String(row.start_date ?? ""), endDate: String(row.end_date ?? ""), dayRegularStart: normalizeLegacyDayStart(row.day_regular_start), dayRegularEnd: String(row.day_regular_end), dayRegularBreakOneStart: String(row.day_regular_break_one_start), dayRegularBreakOneEnd: String(row.day_regular_break_one_end), dayRegularBreakStart: String(row.day_regular_break_start), dayRegularBreakEnd: String(row.day_regular_break_end), dayRegularBreakTwoStart: String(row.day_regular_break_two_start), dayRegularBreakTwoEnd: String(row.day_regular_break_two_end), dayFridayStart: normalizeLegacyDayStart(row.day_friday_start), dayFridayEnd: String(row.day_friday_end), dayFridayBreakOneStart: String(row.day_friday_break_one_start), dayFridayBreakOneEnd: String(row.day_friday_break_one_end), dayFridayBreakStart: String(row.day_friday_break_start), dayFridayBreakEnd: String(row.day_friday_break_end), dayFridayBreakTwoStart: String(row.day_friday_break_two_start), dayFridayBreakTwoEnd: String(row.day_friday_break_two_end), nightStart: String(row.night_start), nightEnd: String(row.night_end), nightBreakOneStart: String(row.night_break_one_start), nightBreakOneEnd: String(row.night_break_one_end), nightBreakTwoStart: String(row.night_break_two_start), nightBreakTwoEnd: String(row.night_break_two_end) };
}
function isRamadanDate(schedule: RamadanSchedule, date: string) { return schedule.isActive && Boolean(schedule.startDate) && Boolean(schedule.endDate) && date >= schedule.startDate && date <= schedule.endDate; }
function slotsFromSessions(sessions: Array<{ start: string; end: string }>) {
  const slots: SlotTemplate[] = []; let order = 1;
  for (const session of sessions) {
    let cursor = session.start;
    let remaining = calculateDurationMinutes(session.start, session.end);
    while (remaining > 0) {
      const minutes = Math.min(60, remaining);
      if (remaining <= 30 && slots.at(-1)?.end === cursor) {
        const previous = slots.at(-1)!;
        previous.end = addMinutes(previous.end, minutes);
        previous.minutes += minutes;
      } else {
        slots.push({ order: order++, start: cursor, end: addMinutes(cursor, minutes), minutes, type: "normal" });
      }
      cursor = addMinutes(cursor, minutes);
      remaining -= minutes;
    }
  }
  return slots;
}
function ramadanTemplate(part: string, date: string, shift: string, schedule: RamadanSchedule) {
  if (shift === "2") return slotsFromSessions([{ start: schedule.nightStart, end: schedule.nightBreakOneStart }, { start: schedule.nightBreakOneEnd, end: schedule.nightBreakTwoStart }, { start: schedule.nightBreakTwoEnd, end: schedule.nightEnd }]);
  const friday = new Date(`${date}T00:00:00`).getDay() === 5;
  const end = part === "assy" ? (friday ? "16:10" : "15:45") : friday ? schedule.dayFridayEnd : schedule.dayRegularEnd;
  return slotsFromSessions([{ start: friday ? schedule.dayFridayStart : schedule.dayRegularStart, end: friday ? schedule.dayFridayBreakOneStart : schedule.dayRegularBreakOneStart }, { start: friday ? schedule.dayFridayBreakOneEnd : schedule.dayRegularBreakOneEnd, end: friday ? schedule.dayFridayBreakStart : schedule.dayRegularBreakStart }, { start: friday ? schedule.dayFridayBreakEnd : schedule.dayRegularBreakEnd, end: friday ? schedule.dayFridayBreakTwoStart : schedule.dayRegularBreakTwoStart }, { start: friday ? schedule.dayFridayBreakTwoEnd : schedule.dayRegularBreakTwoEnd, end }]);
}
function ramadanBreaks(date: string, shift: string, schedule: RamadanSchedule): BreakSchedule[] {
  if (!isRamadanDate(schedule, date)) return [];
  if (shift === "2") return [{ label: "Istirahat 1", start: schedule.nightBreakOneStart, end: schedule.nightBreakOneEnd }, { label: "Istirahat 2", start: schedule.nightBreakTwoStart, end: schedule.nightBreakTwoEnd }];
  const friday = new Date(`${date}T00:00:00`).getDay() === 5;
  return [{ label: "Istirahat 1", start: friday ? schedule.dayFridayBreakOneStart : schedule.dayRegularBreakOneStart, end: friday ? schedule.dayFridayBreakOneEnd : schedule.dayRegularBreakOneEnd }, { label: "Istirahat makan", start: friday ? schedule.dayFridayBreakStart : schedule.dayRegularBreakStart, end: friday ? schedule.dayFridayBreakEnd : schedule.dayRegularBreakEnd }, { label: "Istirahat 2", start: friday ? schedule.dayFridayBreakTwoStart : schedule.dayRegularBreakTwoStart, end: friday ? schedule.dayFridayBreakTwoEnd : schedule.dayRegularBreakTwoEnd }];
}
export async function getRamadanScheduleData() {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT ${ramadanColumns} FROM t_daily_ramadan_schedule WHERE id=1 LIMIT 1`);
  return asRamadanSchedule(rows[0]);
}

async function recordDailyPlanningHistory(
  db: HistoryDb,
  dailyPlanId: number,
  action: string,
  details: Record<string, unknown>,
  userId: number,
  slotId: number | null = null,
) {
  await db.$executeRawUnsafe(
    "INSERT INTO t_daily_production_plan_history (daily_plan_id,slot_id,action,details,created_by) VALUES (?,?,?,?,?)",
    dailyPlanId,
    slotId,
    action,
    JSON.stringify(details),
    userId,
  );
}

async function recordSlotHistory(id: number, action: string, details: Record<string, unknown>, userId: number) {
  const slots = await prisma.$queryRawUnsafe<Array<{ daily_plan_id: number; start_time: string; end_time: string; slot_type: string }>>(
    "SELECT daily_plan_id,TIME_FORMAT(start_time,'%H:%i') AS start_time,TIME_FORMAT(end_time,'%H:%i') AS end_time,slot_type FROM t_daily_production_plan_slot WHERE id=? LIMIT 1",
    id,
  );
  const slot = slots[0];
  if (slot) await recordDailyPlanningHistory(prisma, slot.daily_plan_id, action, { ...details, slot: { startTime: slot.start_time, endTime: slot.end_time, type: slot.slot_type } }, userId, id);
}

async function getPlanContext(part: string, date: string, shift: string) {
  const reportDb = getReportPrisma(); const db = prisma; const table = tableFor(part);
  const planGroup = "all";
  const shifts = shiftAliases(shift);
  const plans = await db.$queryRawUnsafe<Plan[]>("SELECT id,override_tt,override_ratio,source_tt,source_oee,source_ratio,source_ot_minutes,source_signature,is_manual_plan,is_deleted FROM t_daily_production_plan WHERE line_key=? AND fdate=? AND fshift=? AND fgroup=? LIMIT 1", part,date,shift,planGroup);
  const existingPlan = plans[0];
  if (existingPlan?.is_deleted) return { hasMonthlyData: false as const, canCreatePlanning: true, isManualPlan: false, isDeleted: true, db, plan: existingPlan, tt: 0, ratio: "", monthlyOee: 0, otMinutes: 0 };
  if (existingPlan?.is_manual_plan) return { hasMonthlyData: true as const, canCreatePlanning: false, isManualPlan: true, isDeleted: false, db, plan: existingPlan, tt: 0, ratio: "", monthlyOee: 0, otMinutes: 0 };
  const source = await reportDb.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT fgroup,ftt,foee,fratio,fot,f1tr,f2tr FROM \`${table}\` WHERE DATE(fdate)=? AND TRIM(fshift) IN (${shifts.map(() => "?").join(",")}) ORDER BY TRIM(fgroup) ASC`,
    date,
    ...shifts,
  );

  if (source.length === 0) {
    return { hasMonthlyData: false as const, canCreatePlanning: true, isManualPlan: false, isDeleted: false, db, plan: null, tt: 0, ratio: "", monthlyOee: 0, otMinutes: 0 };
  }

  const monthlyTotal = source.reduce(
    (total, row) => total + Number(row.f1tr ?? 0) + Number(row.f2tr ?? 0),
    0,
  );
  if (monthlyTotal === 0) {
    return { hasMonthlyData: false as const, canCreatePlanning: true, isManualPlan: false, isDeleted: false, db, plan: null, tt: 0, ratio: "", monthlyOee: 0, otMinutes: 0 };
  }

  const sourceRatio = String(source[0]?.fratio ?? "").trim();
  const monthlyTt = toNullableNumber(source[0]?.ftt);
  const monthlyRatio = part === "camshaft" ? "" : sourceRatio;
  const monthlyOee = toNullableNumber(source[0]?.foee);
  const monthlyOtMinutes = Math.max(0, Math.round(Number(source[0]?.fot ?? 0) * 60));
  const otMinutes = dailyOtMinutesFromMonthly(monthlyOtMinutes);
  const monthlySignature = createHash("sha256")
    .update(JSON.stringify(source.map((row) => Object.values(row).map((value) => String(value ?? "")))))
    .digest("hex");

  await db.$executeRawUnsafe("INSERT IGNORE INTO t_daily_production_plan (line_key,fdate,fshift,fgroup) VALUES (?,?,?,?)", part,date,shift,planGroup);
  const syncedPlans = await db.$queryRawUnsafe<Plan[]>("SELECT id,override_tt,override_ratio,source_tt,source_oee,source_ratio,source_ot_minutes,source_signature,is_manual_plan,is_deleted FROM t_daily_production_plan WHERE line_key=? AND fdate=? AND fshift=? AND fgroup=? LIMIT 1", part,date,shift,planGroup);
  const plan = syncedPlans[0]; if (!plan) throw new Error("Unable to create daily plan");
  const monthlyChanged = Boolean(plan.is_manual_plan) || plan.source_signature !== monthlySignature;

  if (monthlyChanged) {
    await db.$executeRawUnsafe("UPDATE t_daily_production_plan SET is_manual_plan=0,override_tt=NULL,override_ratio=NULL,source_tt=?,source_oee=?,source_ratio=?,source_ot_minutes=?,source_signature=? WHERE id=?", monthlyTt, monthlyOee,monthlyRatio,monthlyOtMinutes,monthlySignature,plan.id);
    await db.$executeRawUnsafe("DELETE FROM t_daily_production_plan_slot WHERE daily_plan_id=?", plan.id);
    plan.override_tt = null; plan.override_ratio = null;
  }

  const tt = toNullableNumber(plan.override_tt) ?? monthlyTt;
  const ratio = plan.override_ratio ?? monthlyRatio;
  return { hasMonthlyData: true as const, canCreatePlanning: false, isManualPlan: false, isDeleted: false, db, plan, tt, ratio, monthlyOee, otMinutes };
}

function getTemplate(part: string, date: string, shift: string, otMinutes: number) {
  const isFriday = new Date(`${date}T00:00:00`).getDay() === 5;
  const base = shift === "1" ? (part === "assy" ? (isFriday ? assyFridaySlots : assyDaySlots) : (isFriday ? fridaySlots : daySlots)) : nightSlots;
  return base.flatMap((slot) => { if (slot.type === "normal") return [slot]; if (shift === "1") { const minutes = otMinutes; return minutes ? dayOtSlots(slot.order, slot.start, minutes) : []; } const minutes = slot.order === 1 ? Math.min(otMinutes, 60) : Math.min(Math.max(otMinutes - 60, 0), 30); return minutes ? [{ ...slot, minutes, end: addMinutes(slot.start, minutes) }] : []; });
}

export async function getManualDailyPlanningTemplate(part: string, date: string, shift: string) {
  if (shift !== "1" && shift !== "2") throw new Error("Shift tidak valid");
  tableFor(part);
  const schedule = await getRamadanScheduleData();
  return (isRamadanDate(schedule, date) ? ramadanTemplate(part, date, shift, schedule) : getTemplate(part, date, shift, 0)).filter((slot) => slot.type === "normal");
}

export async function saveManualDailyPlanningData(
  part: string,
  date: string,
  shift: string,
  slots: ManualPlanningSlotInput[],
  userId: number,
) {
  if (shift !== "1" && shift !== "2") throw new Error("Shift tidak valid");

  const context = await getPlanContext(part, date, shift);
  if (context.isManualPlan) throw new Error("Daily planning sudah disimpan.");
  if (!context.canCreatePlanning) throw new Error("Daily planning manual hanya dapat dibuat saat monthly belum ada atau total monthly plan adalah 0.");
  if (slots.length === 0) throw new Error("Slot daily planning belum tersedia.");

  const db = context.db;
  const planGroup = "all";
  const activeSlots = slots.filter((slot) =>
    !(slot.slotType === "ot" && calculateDurationMinutes(slot.startTime, slot.endTime) === 0),
  );
  const normalSlots = activeSlots.filter((slot) => slot.slotType === "normal");
  const slotOrders = new Set<number>();

  for (const slot of activeSlots) {
    const minutes = calculateDurationMinutes(slot.startTime, slot.endTime);
    const [ratioOne, ratioTwo] = parseRatio(slot.ratio);
    if (!Number.isInteger(slot.order) || slot.order <= 0 || slotOrders.has(slot.order)) throw new Error("Urutan slot tidak valid.");
    if (!Number.isFinite(slot.tt) || slot.tt <= 0) throw new Error("TT wajib diisi dan harus lebih dari 0.");
    if (!Number.isFinite(slot.oee) || slot.oee <= 0) throw new Error("OEE wajib diisi dan harus lebih dari 0.");
    if (minutes <= 0) throw new Error("Jam slot tidak valid.");
    if (part !== "camshaft" && ratioOne + ratioTwo <= 0) throw new Error("Ratio wajib diisi dan harus valid.");
    slotOrders.add(slot.order);
  }

  if (normalSlots.length === 0) throw new Error("Minimal satu slot normal wajib tersedia.");

  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      "INSERT IGNORE INTO t_daily_production_plan (line_key,fdate,fshift,fgroup) VALUES (?,?,?,?)",
      part,
      date,
      shift,
      planGroup,
    );
    const plans = await tx.$queryRawUnsafe<Array<{ id: number; is_manual_plan: number }>>(
      "SELECT id,is_manual_plan FROM t_daily_production_plan WHERE line_key=? AND fdate=? AND fshift=? AND fgroup=? LIMIT 1",
      part,
      date,
      shift,
      planGroup,
    );
    const plan = plans[0];
    if (!plan) throw new Error("Unable to create daily plan");
    if (plan.is_manual_plan) throw new Error("Daily planning sudah disimpan.");

    await tx.$executeRawUnsafe("UPDATE t_daily_production_plan SET is_manual_plan=1,is_deleted=0,deleted_at=NULL,deleted_by=NULL,override_tt=NULL,override_ratio=NULL,source_tt=NULL,source_oee=NULL,source_ratio=NULL,source_ot_minutes=0,source_signature=NULL WHERE id=?", plan.id);
    await tx.$executeRawUnsafe("DELETE FROM t_daily_production_plan_slot WHERE daily_plan_id=?", plan.id);

    for (const slot of activeSlots) {
      const minutes = calculateDurationMinutes(slot.startTime, slot.endTime);
      const [ratioOne, ratioTwo] = parseRatio(slot.ratio);
      const target = targetFor(minutes, slot.tt, slot.oee);
      const [oneTr, twoTr] = splitTarget(part, target, ratioOne, ratioTwo);
      await tx.$executeRawUnsafe(
        "INSERT INTO t_daily_production_plan_slot (daily_plan_id,slot_order,start_time,end_time,prod_minutes,slot_type,oee,is_oee_override,tt_override,ratio_override,total_target,one_tr,two_tr,is_schedule_override) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        plan.id,
        slot.order,
        slot.startTime,
        slot.endTime,
        minutes,
        slot.slotType,
        slot.oee,
        1,
        slot.tt,
        part === "camshaft" ? null : slot.ratio,
        target,
        oneTr,
        twoTr,
        slot.slotType === "ot" ? 1 : 0,
      );
    }
    await recordDailyPlanningHistory(tx, plan.id, "PLAN_CREATED", { slotCount: activeSlots.length, isManualPlan: true }, userId);
  });
}

export async function loadDailyPlanningData(part: string, date: string, shift: string) {
  const context = await getPlanContext(part,date,shift); const { db, plan, tt, ratio, monthlyOee, otMinutes } = context;
  const ramadanSchedule = await getRamadanScheduleData();
  const breaks = ramadanBreaks(date, shift, ramadanSchedule);
  if (!context.hasMonthlyData || !plan) {
    return {
      group: "all",
      tt: 0,
      oee: 0,
      ratio: "",
      ratioOne: 1,
      ratioTwo: 1,
      hasMonthlyData: false,
      canCreatePlanning: context.canCreatePlanning,
      message: context.isDeleted
        ? "Daily planning telah dihapus. Buat planning baru jika diperlukan."
        : context.canCreatePlanning
        ? "Total monthly plan untuk tanggal ini adalah 0. Buat daily planning untuk menampilkan jam normal."
        : "Data monthly untuk tanggal ini belum diisi.",
      rows: [], breaks,
    };
  }

  const existing = await getDailyPlanSlots(plan.id);
  if (context.isManualPlan) {
    const rows = existing.filter((slot) => !slot.is_hidden).map((slot: Slot) => {
      const { tt_override, ratio_override, ...serializableSlot } = slot;
      const hasOeeOverride = Boolean(slot.is_oee_override);
      const slotTt = toNullableNumber(tt_override);
      const slotRatio = part === "camshaft" ? "" : (ratio_override ?? "");

      return {
        ...serializableSlot,
        oee: hasOeeOverride ? Number(slot.oee ?? 0) : 0,
        ftt: slotTt ?? "",
        foee: hasOeeOverride ? Number(slot.oee ?? 0) : "",
        fratio: slotRatio,
        ftotal_target: Number(slot.total_target),
        f1tr: Number(slot.one_tr),
        f2tr: Number(slot.two_tr),
      };
    });

    return { group: "all", tt: 0, oee: 0, ratio: "", ratioOne: 1, ratioTwo: 1, hasMonthlyData: true, canCreatePlanning: false, message: "", rows, breaks };
  }
  const template = isRamadanDate(ramadanSchedule, date) ? ramadanTemplate(part, date, shift, ramadanSchedule) : getTemplate(part,date,shift,otMinutes);
  const [ratioOne, ratioTwo] = parseRatio(ratio);
  const templateTargets = targetsForSlots(part, shift, template.map((slot) => {
    const existingSlot = existing.find((row: Slot) => Number(row.slot_order) === slot.order);
    return { key: slot.order, minutes: slot.minutes, oee: existingSlot?.is_oee_override ? Number(existingSlot.oee) : (monthlyOee ?? 0) };
  }), tt ?? 0);
  const templateOrders = new Set(template.map((slot) => slot.order));
  const staleSlots = existing.filter((row: Slot) => !templateOrders.has(Number(row.slot_order)) && !(row.slot_type === "ot" && row.is_schedule_override));

  if (staleSlots.length > 0) {
    await db.$executeRawUnsafe(
      `DELETE FROM t_daily_production_plan_slot WHERE id IN (${staleSlots.map(() => "?").join(",")})`,
      ...staleSlots.map((row: Slot) => row.id),
    );
  }

  for (const slot of template) {
    const existingSlot = existing.find((row: Slot) => Number(row.slot_order) === slot.order);
    if (existingSlot?.is_hidden) {
      continue;
    }
    const oeeForTarget = existingSlot?.is_oee_override ? Number(existingSlot.oee) : (monthlyOee ?? 0);
    const slotTtOverride = toNullableNumber(existingSlot?.tt_override);
    const slotRatioOverride = existingSlot?.ratio_override;
    // Preserve the established template calculation unless this specific slot
    // has an explicit parameter override.
    const target = slotTtOverride === null
      ? (templateTargets.get(slot.order) ?? targetFor(slot.minutes, tt ?? 0, oeeForTarget))
      : targetFor(slot.minutes, slotTtOverride, oeeForTarget);
    const [slotRatioOne,slotRatioTwo] = parseRatio(part === "camshaft" ? "" : (slotRatioOverride ?? ratio));
    const [oneTr,twoTr] = splitTarget(part,target,slotRatioOne,slotRatioTwo);

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

  if (part === "camshaft") {
    await db.$executeRawUnsafe(
      "UPDATE t_daily_production_plan_slot SET one_tr=total_target,two_tr=total_target WHERE daily_plan_id=? AND (one_tr<>total_target OR two_tr<>total_target)",
      plan.id,
    );
  }

  const slots = (await getDailyPlanSlots(plan.id)).filter((slot) => !slot.is_hidden);
  const rows = slots.map((slot: Slot) => { const { tt_override, ratio_override, ...serializableSlot } = slot; const oee = slot.is_oee_override ? Number(slot.oee) : monthlyOee; const slotTt = toNullableNumber(tt_override) ?? tt ?? 0; const slotRatio = part === "camshaft" ? "" : (ratio_override ?? ratio); const [slotRatioOne,slotRatioTwo] = parseRatio(slotRatio); const calculatedTarget = targetFor(Number(slot.prod_minutes),slotTt,oee ?? 0); const target = slot.is_schedule_override ? Number(slot.total_target) : calculatedTarget; const [oneTr,twoTr] = splitTarget(part,target,slotRatioOne,slotRatioTwo); return { ...serializableSlot, oee: Number(slot.oee ?? 0), ftt: slotTt || "", foee: oee ?? "", fratio: slotRatio, ftotal_target:target, f1tr:oneTr, f2tr:twoTr }; });
  return { group: "all", tt, oee: monthlyOee, ratio, ratioOne, ratioTwo, hasMonthlyData: true, canCreatePlanning: false, message: "", rows, breaks };
}

export async function updateDailyTargetData(part: string, id: number, target: number, ratioOne: number, ratioTwo: number, userId: number) { const previous = await prisma.$queryRawUnsafe<Array<{ total_target: number; one_tr: number; two_tr: number }>>("SELECT total_target,one_tr,two_tr FROM t_daily_production_plan_slot WHERE id=? LIMIT 1", id); if (!previous[0]) throw new Error("Slot tidak ditemukan"); const [oneTr,twoTr] = splitTarget(part,Math.max(0,target),ratioOne,ratioTwo); await prisma.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET total_target=?,one_tr=?,two_tr=?,is_schedule_override=1,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=?",target,oneTr,twoTr,userId,id); await recordSlotHistory(id, "TARGET_UPDATED", { before: previous[0], after: { total_target: target, one_tr: oneTr, two_tr: twoTr } }, userId); }
export async function updateDailyOeeData(id: number, oee: number, userId: number) { if (oee <= 0) throw new Error("OEE harus valid"); const previous = await prisma.$queryRawUnsafe<Array<{ oee: number | null }>>("SELECT oee FROM t_daily_production_plan_slot WHERE id=? LIMIT 1", id); if (!previous[0]) throw new Error("Slot tidak ditemukan"); await prisma.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET oee=?,is_oee_override=1,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=?",oee,userId,id); await recordSlotHistory(id, "OEE_UPDATED", { before: previous[0].oee, after: oee }, userId); }
export async function updateDailySlotParametersData(part: string, id: number, tt: number, ratio: string, userId: number) { const [one,two] = parseRatio(ratio); if (tt <= 0 || (part !== "camshaft" && one + two <= 0)) throw new Error(part === "camshaft" ? "TT harus valid" : "TT dan Ratio harus valid"); const slots = await prisma.$queryRawUnsafe<Array<{ prod_minutes: number; oee: number | null; is_oee_override: number; source_oee: number | null; tt_override: number | null; ratio_override: string | null; override_tt: number | null; source_tt: number | null; override_ratio: string | null; source_ratio: string | null }>>("SELECT s.prod_minutes,s.oee,s.is_oee_override,s.tt_override,s.ratio_override,p.source_oee,p.override_tt,p.source_tt,p.override_ratio,p.source_ratio FROM t_daily_production_plan_slot s JOIN t_daily_production_plan p ON p.id=s.daily_plan_id WHERE s.id=? LIMIT 1",id); const slot = slots[0]; if (!slot) throw new Error("Slot tidak ditemukan"); const oee = slot.is_oee_override ? Number(slot.oee) : Number(slot.source_oee); const target = targetFor(Number(slot.prod_minutes),tt,oee); const [oneTr,twoTr] = splitTarget(part,target,one,two); const savedRatio = part === "camshaft" ? null : `${one}:${two}`; const previousTt = slot.tt_override ?? slot.override_tt ?? slot.source_tt; const previousRatio = part === "camshaft" ? null : (slot.ratio_override ?? slot.override_ratio ?? slot.source_ratio); const ttChanged = Number(previousTt) !== tt; const ratioChanged = previousRatio !== savedRatio; const action = ttChanged && ratioChanged ? "PARAMETERS_UPDATED" : ttChanged ? "TT_UPDATED" : "RATIO_UPDATED"; const details = ttChanged && ratioChanged ? { before: { tt: previousTt, ratio: previousRatio }, after: { tt, ratio: savedRatio } } : ttChanged ? { before: previousTt, after: tt } : { before: previousRatio, after: savedRatio }; await prisma.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET tt_override=?,ratio_override=?,total_target=?,one_tr=?,two_tr=?,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=?",tt,savedRatio,target,oneTr,twoTr,userId,id); if (ttChanged || ratioChanged) await recordSlotHistory(id, action, details, userId); }
export async function updateDailySharedParametersData(part: string,date: string,shift: string,tt: number,ratio: string,userId: number) { const [one,two] = parseRatio(ratio); if (tt<=0 || (part !== "camshaft" && one+two<=0)) throw new Error(part === "camshaft" ? "TT harus valid" : "TT dan Ratio harus valid"); const { db,plan,hasMonthlyData } = await getPlanContext(part,date,shift); if (!hasMonthlyData || !plan) throw new Error("Data monthly untuk tanggal ini belum diisi."); const savedRatio = part === "camshaft" ? null : `${one}:${two}`; const previousTt = plan.override_tt ?? plan.source_tt; const previousRatio = part === "camshaft" ? null : (plan.override_ratio ?? plan.source_ratio); await db.$transaction(async (tx) => { if (part === "camshaft") { await tx.$executeRawUnsafe("UPDATE t_daily_production_plan SET override_tt=?,override_ratio=NULL WHERE id=?",tt,plan.id); } else { await tx.$executeRawUnsafe("UPDATE t_daily_production_plan SET override_tt=?,override_ratio=? WHERE id=?",tt,savedRatio,plan.id); } await tx.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE daily_plan_id=?",userId,plan.id); await recordDailyPlanningHistory(tx, plan.id, "SHARED_PARAMETERS_UPDATED", { before: { tt: previousTt, ratio: previousRatio }, after: { tt, ratio: savedRatio } }, userId); }); }
export async function updateDailySlotScheduleData(part: string,id: number,startTime: string,endTime: string,_minutes: number,ratioOne: number,ratioTwo: number,tt: number,oee: number,userId: number) {
  const slot = await prisma.$queryRawUnsafe<Array<{ fshift: string; slot_type: string; daily_plan_id: number; slot_order: number; tt_override: number | null; ratio_override: string | null; start_time: string; end_time: string; prod_minutes: number }>>("SELECT p.fshift,s.slot_type,s.daily_plan_id,s.slot_order,s.tt_override,s.ratio_override,TIME_FORMAT(s.start_time,'%H:%i') AS start_time,TIME_FORMAT(s.end_time,'%H:%i') AS end_time,s.prod_minutes FROM t_daily_production_plan_slot s JOIN t_daily_production_plan p ON p.id=s.daily_plan_id WHERE s.id=? LIMIT 1", id);
  if (!slot[0]) throw new Error("Slot tidak ditemukan");
  const isDayOt = String(slot[0].fshift) === "1" && slot[0].slot_type === "ot";
  const minutes = calculateDurationMinutes(startTime,endTime);
  if (minutes === 0) {
    await prisma.$executeRawUnsafe(
      "UPDATE t_daily_production_plan_slot SET is_hidden=1,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=?",
      userId,
      id,
    );
    await recordSlotHistory(id, "SLOT_HIDDEN", { before: { startTime: slot[0].start_time, endTime: slot[0].end_time, minutes: slot[0].prod_minutes }, after: null }, userId);
    return;
  }
  const segments = isDayOt ? dayOtSlots(Number(slot[0].slot_order), startTime, minutes) : [{ order: Number(slot[0].slot_order), start: startTime, end: endTime, minutes, type: slot[0].slot_type as "normal" | "ot" }];

  await prisma.$transaction(async (tx) => {
    if (isDayOt && segments.length > 1) {
      await tx.$executeRawUnsafe("DELETE FROM t_daily_production_plan_slot WHERE daily_plan_id=? AND slot_type='ot' AND id<>?", slot[0].daily_plan_id, id);
    }

    for (const [index, segment] of segments.entries()) {
      const target = targetFor(segment.minutes,tt,oee*100);
      const [oneTr,twoTr] = splitTarget(part,target,ratioOne,ratioTwo);
      if (index === 0) {
        await tx.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET is_hidden=0,slot_order=?,start_time=?,end_time=?,prod_minutes=?,total_target=?,one_tr=?,two_tr=?,is_schedule_override=1,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=?",segment.order,segment.start,segment.end,segment.minutes,target,oneTr,twoTr,userId,id);
        continue;
      }
      await tx.$executeRawUnsafe("INSERT INTO t_daily_production_plan_slot (daily_plan_id,slot_order,start_time,end_time,prod_minutes,slot_type,tt_override,ratio_override,total_target,one_tr,two_tr,is_schedule_override,remark_updated_by,remark_updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,CURRENT_TIMESTAMP)",slot[0].daily_plan_id,segment.order,segment.start,segment.end,segment.minutes,"ot",slot[0].tt_override,slot[0].ratio_override,target,oneTr,twoTr,userId);
    }
  });
  await recordSlotHistory(id, "SCHEDULE_UPDATED", { before: { startTime: slot[0].start_time, endTime: slot[0].end_time, minutes: slot[0].prod_minutes }, after: { startTime, endTime, minutes } }, userId);
}

export async function updateDailySlotRemarkData(id: number, remark: string, userId: number) {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Slot tidak valid");
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("User tidak valid");
  if (remark.length > 500) throw new Error("Remark maksimal 500 karakter");

  const previous = await prisma.$queryRawUnsafe<Array<{ remark: string | null }>>("SELECT remark FROM t_daily_production_plan_slot WHERE id=? LIMIT 1", id);
  await prisma.$executeRawUnsafe(
    "UPDATE t_daily_production_plan_slot SET remark=?,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=? AND NOT (remark <=> ?)",
    remark || null,
    userId,
    id,
    remark || null,
  );
  await recordSlotHistory(id, "REMARK_UPDATED", { before: previous[0]?.remark ?? null, after: remark || null }, userId);
}

type OtPosition = "start" | "end";

async function getDailyPlanSlots(planId: number) {
  return prisma.$queryRawUnsafe<Slot[]>("SELECT s.id,s.slot_order,TIME_FORMAT(s.start_time,'%H:%i') AS start_time,TIME_FORMAT(s.end_time,'%H:%i') AS end_time,s.prod_minutes,s.slot_type,s.oee,s.is_oee_override,s.tt_override,s.ratio_override,s.total_target,s.one_tr,s.two_tr,s.is_schedule_override,s.is_hidden,s.remark,s.remark_updated_at,u.name AS remark_updated_by_name FROM t_daily_production_plan_slot s LEFT JOIN `User` u ON u.id=s.remark_updated_by WHERE s.daily_plan_id=? ORDER BY s.slot_order", planId);
}

export async function addDailyOtData(part: string, date: string, shift: string, requestedPosition?: OtPosition, userId?: number) {
  if (shift !== "1" && shift !== "2") throw new Error("Shift tidak valid");
  await loadDailyPlanningData(part, date, shift);
  const context = await getPlanContext(part, date, shift);
  const { db, plan, tt, ratio, monthlyOee } = context;

  if (!context.hasMonthlyData || !plan) throw new Error("Data monthly untuk tanggal ini belum diisi.");

  const slots = (await getDailyPlanSlots(plan.id)).filter((slot) => !slot.is_hidden);
  const otSlots = slots.filter((slot) => slot.slot_type === "ot");
  const normalSlots = slots.filter((slot) => slot.slot_type === "normal");
  const firstNormal = normalSlots[0];
  const lastNormal = normalSlots[normalSlots.length - 1];

  if (!firstNormal || !lastNormal) throw new Error("Jadwal shift belum lengkap.");

  let slotOrder: number;
  let position: OtPosition;

  if (shift === "1") {
    if (otSlots.length > 0) throw new Error("Shift Day sudah memiliki OT.");
    slotOrder = 8;
    position = "end";
  } else {
    if (otSlots.length >= 2) throw new Error("Shift Night sudah memiliki OT awal dan akhir.");

    const hasStartOt = otSlots.some((slot) => Number(slot.slot_order) === 1);
    const hasEndOt = otSlots.some((slot) => Number(slot.slot_order) === 10);

    if (otSlots.length === 0) {
      if (requestedPosition !== "start" && requestedPosition !== "end") throw new Error("Pilih posisi OT Night.");
      position = requestedPosition;
    } else {
      position = hasStartOt ? "end" : hasEndOt ? "start" : requestedPosition ?? "end";
    }

    slotOrder = position === "start" ? 1 : 10;

    if (slots.some((slot) => Number(slot.slot_order) === slotOrder)) {
      throw new Error("Posisi OT tersebut sudah terisi.");
    }
  }

  const otMinutes = shift === "2" && position === "end" ? 30 : 60;
  const startTime = position === "start" ? addMinutes(firstNormal.start_time, -otMinutes) : addMinutes(lastNormal.end_time, shift === "1" ? 30 : 0);
  const endTime = position === "start" ? firstNormal.start_time : shift === "1" ? dayOtEndTime(startTime, otMinutes) : addMinutes(startTime, otMinutes);
  const [ratioOne, ratioTwo] = parseRatio(ratio);
  const target = targetFor(otMinutes, tt ?? 0, monthlyOee ?? 0);
  const [oneTr, twoTr] = splitTarget(part, target, ratioOne, ratioTwo);

  await db.$executeRawUnsafe(
    "INSERT INTO t_daily_production_plan_slot (daily_plan_id,slot_order,start_time,end_time,prod_minutes,slot_type,total_target,one_tr,two_tr,is_schedule_override,remark_updated_by,remark_updated_at) VALUES (?,?,?,?,?,?,?,?,?,1,?,CURRENT_TIMESTAMP)",
    plan.id,
    slotOrder,
    startTime,
    endTime,
    otMinutes,
    "ot",
    target,
    oneTr,
    twoTr,
    userId ?? null,
  );
  if (userId) await recordDailyPlanningHistory(db, plan.id, "OT_ADDED", { before: null, after: { startTime, endTime, minutes: otMinutes, position } }, userId);
}

export async function saveDailyOtData(
  part: string,
  date: string,
  shift: string,
  slot: ManualPlanningSlotInput,
  userId: number,
) {
  if (slot.slotType !== "ot") throw new Error("Slot OT tidak valid.");
  const context = await getPlanContext(part, date, shift);
  if (!context.hasMonthlyData || !context.plan) throw new Error("Daily planning belum tersedia.");

  const minutes = calculateDurationMinutes(slot.startTime, slot.endTime);
  const [ratioOne, ratioTwo] = parseRatio(slot.ratio);
  if (!Number.isInteger(slot.order) || slot.order <= 0) throw new Error("Urutan slot OT tidak valid.");
  if (minutes <= 0) throw new Error("Jam OT harus valid.");
  if (!Number.isFinite(slot.tt) || slot.tt <= 0) throw new Error("TT OT wajib diisi dan harus lebih dari 0.");
  if (!Number.isFinite(slot.oee) || slot.oee <= 0) throw new Error("OEE OT wajib diisi dan harus lebih dari 0.");
  if (part !== "camshaft" && ratioOne + ratioTwo <= 0) throw new Error("Ratio OT wajib diisi dan harus valid.");

  const existing = await getDailyPlanSlots(context.plan.id);
  if (existing.some((item) => item.slot_order === slot.order && !item.is_hidden)) {
    throw new Error("Posisi OT tersebut sudah terisi.");
  }

  const target = targetFor(minutes, slot.tt, slot.oee);
  const [oneTr, twoTr] = splitTarget(part, target, ratioOne, ratioTwo);
  const hiddenSlot = existing.find((item) => item.slot_order === slot.order && item.is_hidden);

  if (hiddenSlot) {
    await context.db.$executeRawUnsafe(
      "UPDATE t_daily_production_plan_slot SET is_hidden=0,start_time=?,end_time=?,prod_minutes=?,slot_type='ot',oee=?,is_oee_override=1,tt_override=?,ratio_override=?,total_target=?,one_tr=?,two_tr=?,is_schedule_override=1,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=?",
      slot.startTime,
      slot.endTime,
      minutes,
      slot.oee,
      slot.tt,
      part === "camshaft" ? null : slot.ratio,
      target,
      oneTr,
      twoTr,
      userId,
      hiddenSlot.id,
    );
    await recordDailyPlanningHistory(context.db, context.plan.id, "OT_ADDED", { before: null, after: { startTime: slot.startTime, endTime: slot.endTime, minutes, restored: true } }, userId, hiddenSlot.id);
    return;
  }

  await context.db.$executeRawUnsafe(
    "INSERT INTO t_daily_production_plan_slot (daily_plan_id,slot_order,start_time,end_time,prod_minutes,slot_type,oee,is_oee_override,tt_override,ratio_override,total_target,one_tr,two_tr,is_schedule_override,remark_updated_by,remark_updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)",
    context.plan.id,
    slot.order,
    slot.startTime,
    slot.endTime,
    minutes,
    "ot",
    slot.oee,
    1,
    slot.tt,
    part === "camshaft" ? null : slot.ratio,
    target,
    oneTr,
    twoTr,
    1,
    userId,
  );
  await recordDailyPlanningHistory(context.db, context.plan.id, "OT_ADDED", { before: null, after: { startTime: slot.startTime, endTime: slot.endTime, minutes } }, userId);
}

export async function deleteDailyOtData(id: number, userId: number) {
  const previous = await prisma.$queryRawUnsafe<Array<{ start_time: string; end_time: string; prod_minutes: number }>>("SELECT TIME_FORMAT(start_time,'%H:%i') AS start_time,TIME_FORMAT(end_time,'%H:%i') AS end_time,prod_minutes FROM t_daily_production_plan_slot WHERE id=? AND slot_type='ot' LIMIT 1", id);
  const result = await prisma.$executeRawUnsafe(
    "UPDATE t_daily_production_plan_slot SET is_hidden=1,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=? AND slot_type='ot'",
    userId,
    id,
  );

  if (result === 0) throw new Error("Slot OT tidak ditemukan.");
  await recordSlotHistory(id, "OT_DELETED", { before: previous[0] ?? null, after: null }, userId);
}

export async function getDailyPlanningHistoryData(part: string, date: string, shift: string) {
  const plans = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    "SELECT id FROM t_daily_production_plan WHERE line_key=? AND fdate=? AND fshift=? AND fgroup='all' LIMIT 1",
    part,
    date,
    shift,
  );
  if (!plans[0]) return [];
  return prisma.$queryRawUnsafe<Array<{ id: number; action: string; details: string | null; created_at: string; created_by_name: string | null }>>(
    "SELECT h.id,h.action,h.details,DATE_FORMAT(h.created_at,'%Y-%m-%d %H:%i:%s') AS created_at,u.name AS created_by_name FROM t_daily_production_plan_history h LEFT JOIN `User` u ON u.id=h.created_by WHERE h.daily_plan_id=? ORDER BY h.created_at DESC,h.id DESC",
    plans[0].id,
  );
}

export async function deleteDailyPlanningData(part: string, date: string, shift: string, userId: number) {
  const plans = await prisma.$queryRawUnsafe<Array<{ id: number; slot_count: number }>>(
    "SELECT plan.id,COUNT(slot.id) AS slot_count FROM t_daily_production_plan plan LEFT JOIN t_daily_production_plan_slot slot ON slot.daily_plan_id=plan.id AND slot.is_hidden=0 WHERE plan.line_key=? AND plan.fdate=? AND plan.fshift=? AND plan.fgroup='all' AND plan.is_deleted=0 GROUP BY plan.id LIMIT 1",
    part,
    date,
    shift,
  );
  const plan = plans[0];
  if (!plan) throw new Error("Daily planning aktif tidak ditemukan.");

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      "UPDATE t_daily_production_plan SET is_deleted=1,deleted_at=CURRENT_TIMESTAMP,deleted_by=? WHERE id=?",
      userId,
      plan.id,
    );
    await recordDailyPlanningHistory(tx, plan.id, "DAILY_PLANNING_DELETED", { line: part, date, shift, slotCount: Number(plan.slot_count) }, userId);
  });
}

function validateRamadanSchedule(input: RamadanScheduleInput) {
  if (!input.startDate || !input.endDate || input.startDate > input.endDate) throw new Error("Periode Ramadan tidak valid.");
  const times = Object.values(input).filter((value) => typeof value === "string" && value.includes(":"));
  if (times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time)))) throw new Error("Format jam Ramadan tidak valid.");
}

type RamadanPlan = { id: number; line_key: string; fdate: string; fshift: string; source_tt: number | null; override_tt: number | null; source_oee: number | null; source_ratio: string | null; override_ratio: string | null };
async function replacePlanWithTemplate(tx: HistoryDb, plan: RamadanPlan, template: SlotTemplate[], userId: number, action: string) {
  const previousSlots = await tx.$queryRawUnsafe<Slot[]>("SELECT id,slot_order,TIME_FORMAT(start_time,'%H:%i') AS start_time,TIME_FORMAT(end_time,'%H:%i') AS end_time,prod_minutes,slot_type,oee,is_oee_override,tt_override,ratio_override,total_target,one_tr,two_tr,is_schedule_override,is_hidden,remark,remark_updated_at,NULL AS remark_updated_by_name FROM t_daily_production_plan_slot WHERE daily_plan_id=? ORDER BY slot_order", plan.id);
  const fallbackTt = Number(plan.override_tt ?? plan.source_tt ?? 0);
  const fallbackOee = Number(plan.source_oee ?? 0);
  const fallbackRatio = plan.line_key === "camshaft" ? "" : String(plan.override_ratio ?? plan.source_ratio ?? "");
  await tx.$executeRawUnsafe("DELETE FROM t_daily_production_plan_slot WHERE daily_plan_id=?", plan.id);
  for (const slot of template) {
    const previous = previousSlots.find((item) => Number(item.slot_order) === slot.order && item.slot_type === "normal");
    const tt = Number(previous?.tt_override ?? fallbackTt);
    const oee = previous?.is_oee_override ? Number(previous.oee ?? 0) : fallbackOee;
    const ratio = plan.line_key === "camshaft" ? null : (previous?.ratio_override ?? fallbackRatio);
    const target = previous?.is_schedule_override ? Number(previous.total_target) : targetFor(slot.minutes, tt, oee);
    const [one, two] = parseRatio(ratio);
    const [oneTr, twoTr] = splitTarget(plan.line_key, target, one, two);
    await tx.$executeRawUnsafe(
      "INSERT INTO t_daily_production_plan_slot (daily_plan_id,slot_order,start_time,end_time,prod_minutes,slot_type,oee,is_oee_override,tt_override,ratio_override,total_target,one_tr,two_tr,is_schedule_override,is_hidden,remark,remark_updated_at,remark_updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)",
      plan.id, slot.order, slot.start, slot.end, slot.minutes, "normal", previous?.oee ?? null, previous?.is_oee_override ?? 0, previous?.tt_override ?? null, ratio, target, oneTr, twoTr, previous?.is_schedule_override ?? 0, 0, previous?.remark ?? null, previous?.remark_updated_at ?? null,
    );
  }
  await recordDailyPlanningHistory(tx, plan.id, action, { date: plan.fdate, shift: plan.fshift, slotCount: template.length }, userId);
}

async function rewriteRamadanPlans(tx: HistoryDb, schedule: RamadanSchedule, userId: number, action: string, useRamadan: boolean) {
  const plans = await tx.$queryRawUnsafe<RamadanPlan[]>("SELECT id,line_key,DATE_FORMAT(fdate,'%Y-%m-%d') AS fdate,fshift,source_tt,override_tt,source_oee,source_ratio,override_ratio FROM t_daily_production_plan WHERE is_deleted=0 AND fdate BETWEEN ? AND ?", schedule.startDate, schedule.endDate);
  for (const plan of plans) {
    const template = useRamadan ? ramadanTemplate(plan.line_key, plan.fdate, plan.fshift, schedule) : getTemplate(plan.line_key, plan.fdate, plan.fshift, 0).filter((slot) => slot.type === "normal");
    await replacePlanWithTemplate(tx, plan, template, userId, action);
  }
  return plans.length;
}

export async function applyRamadanScheduleData(input: RamadanScheduleInput, userId: number) {
  validateRamadanSchedule(input);
  return prisma.$transaction(async (tx) => {
    const schedule: RamadanSchedule = { ...input, isActive: true };
    await tx.$executeRawUnsafe("UPDATE t_daily_ramadan_schedule SET is_active=1,start_date=?,end_date=?,day_regular_start=?,day_regular_end=?,day_regular_break_one_start=?,day_regular_break_one_end=?,day_regular_break_start=?,day_regular_break_end=?,day_regular_break_two_start=?,day_regular_break_two_end=?,day_friday_start=?,day_friday_end=?,day_friday_break_one_start=?,day_friday_break_one_end=?,day_friday_break_start=?,day_friday_break_end=?,day_friday_break_two_start=?,day_friday_break_two_end=?,night_start=?,night_end=?,night_break_one_start=?,night_break_one_end=?,night_break_two_start=?,night_break_two_end=?,updated_by=? WHERE id=1", input.startDate,input.endDate,input.dayRegularStart,input.dayRegularEnd,input.dayRegularBreakOneStart,input.dayRegularBreakOneEnd,input.dayRegularBreakStart,input.dayRegularBreakEnd,input.dayRegularBreakTwoStart,input.dayRegularBreakTwoEnd,input.dayFridayStart,input.dayFridayEnd,input.dayFridayBreakOneStart,input.dayFridayBreakOneEnd,input.dayFridayBreakStart,input.dayFridayBreakEnd,input.dayFridayBreakTwoStart,input.dayFridayBreakTwoEnd,input.nightStart,input.nightEnd,input.nightBreakOneStart,input.nightBreakOneEnd,input.nightBreakTwoStart,input.nightBreakTwoEnd,userId);
    const count = await rewriteRamadanPlans(tx, schedule, userId, "RAMADAN_SCHEDULE_APPLIED", true);
    return { count };
  });
}

export async function deactivateRamadanScheduleData(userId: number) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT ${ramadanColumns} FROM t_daily_ramadan_schedule WHERE id=1 LIMIT 1`);
    const schedule = asRamadanSchedule(rows[0]);
    if (!schedule.isActive || !schedule.startDate || !schedule.endDate) return { count: 0 };
    const count = await rewriteRamadanPlans(tx, schedule, userId, "RAMADAN_SCHEDULE_REMOVED", false);
    await tx.$executeRawUnsafe("UPDATE t_daily_ramadan_schedule SET is_active=0,updated_by=? WHERE id=1", userId);
    return { count };
  });
}
