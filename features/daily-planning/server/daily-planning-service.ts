import { prisma } from "@/lib/prisma";
import { getReportPrisma } from "@/lib/report-prisma";

type SlotTemplate = { order: number; start: string; end: string; minutes: number; type: "normal" | "ot" };
type Plan = { id: number; override_tt: number | null; override_ratio: string | null; source_tt: number | null; source_oee: number | null; source_ratio: string | null; source_ot_minutes: number | null };
type Slot = { id: number; slot_order: number; start_time: string; end_time: string; prod_minutes: number; slot_type: "normal" | "ot"; oee: number | null; is_oee_override: number; total_target: number; one_tr: number; two_tr: number; is_schedule_override: number; remark: string | null; remark_updated_at: Date | null; remark_updated_by_name: string | null };

const parts = new Set(["assy", "cylblock", "cylhead", "camshaft", "crankshaft"]);
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
function targetsForSlots(part: string, shift: string, slots: Array<{ key: number; minutes: number; oee: number }>, tt: number) { if (part !== "assy" || shift !== "1" || tt <= 0) return new Map(slots.map((slot) => [slot.key, targetFor(slot.minutes, tt, slot.oee)])); let accumulatedTarget = 0; let roundedTarget = 0; return new Map(slots.map((slot) => { accumulatedTarget += slot.minutes / tt * slot.oee / 100; const nextRoundedTarget = Math.round(accumulatedTarget); const target = nextRoundedTarget - roundedTarget; roundedTarget = nextRoundedTarget; return [slot.key, target] as const; })); }
function tableFor(part: string) { if (!parts.has(part)) throw new Error("Invalid planning line"); return `t_plan_daily_production_${part}`; }
function toNullableNumber(value: unknown) { if (value === null || value === undefined || value === "") return null; const numeric = Number(value); return Number.isFinite(numeric) ? numeric : null; }
function sameNullableNumber(left: unknown, right: unknown) { const leftNumber = toNullableNumber(left); const rightNumber = toNullableNumber(right); return leftNumber === rightNumber; }
function sameNullableText(left: unknown, right: unknown) { const leftText = left === null || left === undefined ? "" : String(left); const rightText = right === null || right === undefined ? "" : String(right); return leftText === rightText; }
function shiftAliases(value: string) {
  return value === "1" ? ["1", "Day", "DAY", "day"] : value === "2" ? ["2", "Night", "NIGHT", "night"] : [value];
}

async function getPlanContext(part: string, date: string, shift: string) {
  const reportDb = getReportPrisma(); const db = prisma; const table = tableFor(part);
  const planGroup = "all";
  const shifts = shiftAliases(shift);
  const source = await reportDb.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ftt, foee, fratio, fot FROM \`${table}\` WHERE DATE(fdate)=? AND TRIM(fshift) IN (${shifts.map(() => "?").join(",")}) ORDER BY TRIM(fgroup) ASC LIMIT 1`,
    date,
    ...shifts,
  );

  if (source.length === 0) {
    return { hasMonthlyData: false as const, db, plan: null, tt: 0, ratio: "", monthlyOee: 0, otMinutes: 0 };
  }

  const sourceRatio = String(source[0]?.fratio ?? "").trim();
  const monthlyTt = toNullableNumber(source[0]?.ftt);
  const monthlyRatio = part === "camshaft" ? "" : sourceRatio;
  const monthlyOee = toNullableNumber(source[0]?.foee);
  const otMinutes = Math.max(0, Math.round(Number(source[0]?.fot ?? 0) * 60));

  await db.$executeRawUnsafe("INSERT IGNORE INTO t_daily_production_plan (line_key,fdate,fshift,fgroup) VALUES (?,?,?,?)", part,date,shift,planGroup);
  const plans = await db.$queryRawUnsafe<Plan[]>("SELECT id,override_tt,override_ratio,source_tt,source_oee,source_ratio,source_ot_minutes FROM t_daily_production_plan WHERE line_key=? AND fdate=? AND fshift=? AND fgroup=? LIMIT 1", part,date,shift,planGroup);
  const plan = plans[0]; if (!plan) throw new Error("Unable to create daily plan");
  const monthlyChanged = !sameNullableNumber(plan.source_tt, monthlyTt) || !sameNullableNumber(plan.source_oee, monthlyOee) || !sameNullableText(plan.source_ratio, monthlyRatio) || Number(plan.source_ot_minutes ?? 0) !== otMinutes;

  if (monthlyChanged) {
    await db.$executeRawUnsafe("UPDATE t_daily_production_plan SET override_tt=NULL,override_ratio=NULL,source_tt=?,source_oee=?,source_ratio=?,source_ot_minutes=? WHERE id=?", monthlyTt, monthlyOee, monthlyRatio, otMinutes, plan.id);
    await db.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET is_oee_override=0,oee=NULL,is_schedule_override=CASE WHEN slot_type='ot' AND is_schedule_override=1 THEN 1 ELSE 0 END WHERE daily_plan_id=?", plan.id);
    plan.override_tt = null; plan.override_ratio = null;
  }

  const tt = toNullableNumber(plan.override_tt) ?? monthlyTt;
  const ratio = plan.override_ratio ?? monthlyRatio;
  return { hasMonthlyData: true as const, db, plan, tt, ratio, monthlyOee, otMinutes };
}

function getTemplate(part: string, date: string, shift: string, otMinutes: number) {
  const isFriday = new Date(`${date}T00:00:00`).getDay() === 5;
  const base = shift === "1" ? (part === "assy" ? (isFriday ? assyFridaySlots : assyDaySlots) : (isFriday ? fridaySlots : daySlots)) : nightSlots;
  return base.flatMap((slot) => { if (slot.type === "normal") return [slot]; if (shift === "1") { const minutes = otMinutes; return minutes ? dayOtSlots(slot.order, slot.start, minutes) : []; } const minutes = slot.order === 1 ? Math.min(otMinutes, 60) : Math.min(Math.max(otMinutes - 60, 0), 30); return minutes ? [{ ...slot, minutes, end: addMinutes(slot.start, minutes) }] : []; });
}

export async function loadDailyPlanningData(part: string, date: string, shift: string) {
  const context = await getPlanContext(part,date,shift); const { db, plan, tt, ratio, monthlyOee, otMinutes } = context;
  if (!context.hasMonthlyData || !plan) {
    return {
      group: "all",
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

  const existing = await getDailyPlanSlots(plan.id);
  const template = getTemplate(part,date,shift,otMinutes);
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
    const oeeForTarget = existingSlot?.is_oee_override ? Number(existingSlot.oee) : (monthlyOee ?? 0);
    const target = templateTargets.get(slot.order) ?? targetFor(slot.minutes, tt ?? 0, oeeForTarget);
    const [oneTr,twoTr] = splitTarget(part,target,ratioOne,ratioTwo);

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

  const slots = await getDailyPlanSlots(plan.id);
  const rowTargets = targetsForSlots(part, shift, slots.map((slot: Slot) => ({ key: Number(slot.slot_order), minutes: Number(slot.prod_minutes), oee: slot.is_oee_override ? Number(slot.oee) : (monthlyOee ?? 0) })), tt ?? 0);
  const rows = slots.map((slot: Slot) => { const oee = slot.is_oee_override ? Number(slot.oee) : monthlyOee; const calculatedTarget = rowTargets.get(Number(slot.slot_order)) ?? targetFor(Number(slot.prod_minutes),tt ?? 0,oee ?? 0); const target = slot.is_schedule_override ? Number(slot.total_target) : calculatedTarget; const [oneTr,twoTr] = splitTarget(part,target,ratioOne,ratioTwo); return { ...slot, oee: Number(slot.oee ?? 0), ftt: tt ?? "", foee: oee ?? "", fratio: part === "camshaft" ? "" : ratio, ftotal_target:target, f1tr:oneTr, f2tr:twoTr }; });
  return { group: "all", tt, oee: monthlyOee, ratio, ratioOne, ratioTwo, hasMonthlyData: true, message: "", rows };
}

export async function updateDailyTargetData(part: string, id: number, target: number, ratioOne: number, ratioTwo: number, userId: number) { const [oneTr,twoTr] = splitTarget(part,Math.max(0,target),ratioOne,ratioTwo); await prisma.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET total_target=?,one_tr=?,two_tr=?,is_schedule_override=1,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=?",target,oneTr,twoTr,userId,id); }
export async function updateDailyOeeData(id: number, oee: number, userId: number) { if (oee <= 0) throw new Error("OEE harus valid"); await prisma.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET oee=?,is_oee_override=1,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=?",oee,userId,id); }
export async function updateDailySharedParametersData(part: string,date: string,shift: string,tt: number,ratio: string,userId: number) { const [one,two] = parseRatio(ratio); if (tt<=0 || (part !== "camshaft" && one+two<=0)) throw new Error(part === "camshaft" ? "TT harus valid" : "TT dan Ratio harus valid"); const { db,plan,hasMonthlyData } = await getPlanContext(part,date,shift); if (!hasMonthlyData || !plan) throw new Error("Data monthly untuk tanggal ini belum diisi."); if (part === "camshaft") { await db.$executeRawUnsafe("UPDATE t_daily_production_plan SET override_tt=?,override_ratio=NULL WHERE id=?",tt,plan.id); } else { await db.$executeRawUnsafe("UPDATE t_daily_production_plan SET override_tt=?,override_ratio=? WHERE id=?",tt,`${one}:${two}`,plan.id); } await db.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE daily_plan_id=?",userId,plan.id); }
export async function updateDailySlotScheduleData(part: string,id: number,startTime: string,endTime: string,_minutes: number,ratioOne: number,ratioTwo: number,tt: number,oee: number,userId: number) {
  const slot = await prisma.$queryRawUnsafe<Array<{ fshift: string; slot_type: string; daily_plan_id: number; slot_order: number }>>("SELECT p.fshift,s.slot_type,s.daily_plan_id,s.slot_order FROM t_daily_production_plan_slot s JOIN t_daily_production_plan p ON p.id=s.daily_plan_id WHERE s.id=? LIMIT 1", id);
  if (!slot[0]) throw new Error("Slot tidak ditemukan");
  const isDayOt = String(slot[0].fshift) === "1" && slot[0].slot_type === "ot";
  const minutes = calculateDurationMinutes(startTime,endTime);
  const segments = isDayOt ? dayOtSlots(Number(slot[0].slot_order), startTime, minutes) : [{ order: Number(slot[0].slot_order), start: startTime, end: endTime, minutes, type: slot[0].slot_type as "normal" | "ot" }];

  if (isDayOt && segments.length > 1) {
    await prisma.$executeRawUnsafe("DELETE FROM t_daily_production_plan_slot WHERE daily_plan_id=? AND slot_type='ot' AND id<>?", slot[0].daily_plan_id, id);
  }

  for (const [index, segment] of segments.entries()) {
    const target = targetFor(segment.minutes,tt,oee*100);
    const [oneTr,twoTr] = splitTarget(part,target,ratioOne,ratioTwo);
    if (index === 0) {
      await prisma.$executeRawUnsafe("UPDATE t_daily_production_plan_slot SET slot_order=?,start_time=?,end_time=?,prod_minutes=?,total_target=?,one_tr=?,two_tr=?,is_schedule_override=1,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=?",segment.order,segment.start,segment.end,segment.minutes,target,oneTr,twoTr,userId,id);
      continue;
    }
    await prisma.$executeRawUnsafe("INSERT INTO t_daily_production_plan_slot (daily_plan_id,slot_order,start_time,end_time,prod_minutes,slot_type,total_target,one_tr,two_tr,is_schedule_override,remark_updated_by,remark_updated_at) VALUES (?,?,?,?,?,?,?,?,?,1,?,CURRENT_TIMESTAMP)",slot[0].daily_plan_id,segment.order,segment.start,segment.end,segment.minutes,"ot",target,oneTr,twoTr,userId);
  }
}

export async function updateDailySlotRemarkData(id: number, remark: string, userId: number) {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Slot tidak valid");
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("User tidak valid");
  if (remark.length > 500) throw new Error("Remark maksimal 500 karakter");

  await prisma.$executeRawUnsafe(
    "UPDATE t_daily_production_plan_slot SET remark=?,remark_updated_by=?,remark_updated_at=CURRENT_TIMESTAMP WHERE id=? AND NOT (remark <=> ?)",
    remark || null,
    userId,
    id,
    remark || null,
  );
}

type OtPosition = "start" | "end";

async function getDailyPlanSlots(planId: number) {
  return prisma.$queryRawUnsafe<Slot[]>("SELECT s.id,s.slot_order,TIME_FORMAT(s.start_time,'%H:%i') AS start_time,TIME_FORMAT(s.end_time,'%H:%i') AS end_time,s.prod_minutes,s.slot_type,s.oee,s.is_oee_override,s.total_target,s.one_tr,s.two_tr,s.is_schedule_override,s.remark,s.remark_updated_at,u.name AS remark_updated_by_name FROM t_daily_production_plan_slot s LEFT JOIN `User` u ON u.id=s.remark_updated_by WHERE s.daily_plan_id=? ORDER BY s.slot_order", planId);
}

export async function addDailyOtData(part: string, date: string, shift: string, requestedPosition?: OtPosition, userId?: number) {
  if (shift !== "1" && shift !== "2") throw new Error("Shift tidak valid");
  await loadDailyPlanningData(part, date, shift);
  const context = await getPlanContext(part, date, shift);
  const { db, plan, tt, ratio, monthlyOee } = context;

  if (!context.hasMonthlyData || !plan) throw new Error("Data monthly untuk tanggal ini belum diisi.");

  const slots = await getDailyPlanSlots(plan.id);
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
}

export async function deleteDailyManualOtData(id: number) {
  const result = await prisma.$executeRawUnsafe(
    "DELETE FROM t_daily_production_plan_slot WHERE id=? AND slot_type='ot' AND is_schedule_override=1",
    id,
  );

  if (result === 0) throw new Error("Hanya OT manual yang dapat dihapus.");
}
