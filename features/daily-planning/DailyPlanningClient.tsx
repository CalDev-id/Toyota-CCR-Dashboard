"use client";

import {
  deleteDailyManualOt,
  getManualDailyPlanningDraft,
  loadDailyPlanning,
  saveManualDailyPlanning,
  saveDailyOt,
  updateDailySlotSchedule,
  updateDailySlotParameters,
  updateDailyOee,
  updateDailySlotRemark,
  updateDailyTarget,
} from "@/features/daily-planning/actions";
import { Fragment, startTransition, useEffect, useState } from "react";

const today = new Date().toISOString().slice(0, 10);
const parts = ["assy", "cylblock", "cylhead", "camshaft", "crankshaft"];
const partLabels: Record<string, string> = { assy: "Assy", cylblock: "Cylinder Block", cylhead: "Cylinder Head", camshaft: "Camshaft", crankshaft: "Crankshaft" };

type DailyData = Awaited<ReturnType<typeof loadDailyPlanning>>;
type DailyRow = DailyData["rows"][number];
type EditingRow = Pick<DailyRow, "start_time" | "end_time" | "fratio" | "remark"> & {
  prod_minutes: number | string;
  ftt: number | string;
  foee: number | string;
  ftotal_target: number | string;
};
type DailyTotals = { minutes: number; target: number; oneTr: number; twoTr: number };
type BreakSchedule = { label: string; start: string; end: string };
type DraftTemplate = Awaited<ReturnType<typeof getManualDailyPlanningDraft>>[number];
type Toast = { message: string; type: "error" | "success" };
const maghribBreak: BreakSchedule = { label: "Istirahat Salat Maghrib", start: "18:00", end: "18:15" };

function formatPart(value: string) {
  return partLabels[value] ?? value;
}

function parseRatio(value: string) {
  const [one, two] = value.split(":").map(Number);
  return [one || 1, two || 1] as const;
}

function parseDecimal(value: unknown) {
  const numeric = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
}

function calculateRowPlan(
  savedRow: DailyRow,
  row: Pick<EditingRow, "prod_minutes" | "ftt" | "foee" | "fratio" | "ftotal_target">,
  isCamshaft: boolean,
) {
  const minutes = parseDecimal(row.prod_minutes);
  const tt = parseDecimal(row.ftt);
  const oee = parseDecimal(row.foee);
  const isManualTarget = savedRow.is_schedule_override || parseDecimal(row.ftotal_target) !== parseDecimal(savedRow.ftotal_target);
  const inputsAffectingTargetChanged =
    minutes !== parseDecimal(savedRow.prod_minutes) ||
    tt !== parseDecimal(savedRow.ftt) ||
    oee !== parseDecimal(savedRow.foee);
  // Retain the server's existing target (including Assy's cumulative rounding)
  // until an input affecting this slot's target is actually edited.
  const target = isManualTarget
    ? parseDecimal(row.ftotal_target)
    : inputsAffectingTargetChanged && tt > 0
      ? Math.round((minutes / tt) * (oee / 100))
      : parseDecimal(savedRow.ftotal_target);

  if (isCamshaft) {
    return { target, oneTr: target, twoTr: target };
  }

  const [ratioOne, ratioTwo] = parseRatio(String(row.fratio));
  const oneTr = Math.round((target * ratioOne) / (ratioOne + ratioTwo || 1));
  return { target, oneTr, twoTr: target - oneTr };
}

function formatMinutesAsHours(minutes: number) {
  const hours = minutes / 60;
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} jam`;
}

function formatRemarkAudit(value: Date | string | null, userName: string | null) {
  if (!value) return "Audit remark belum tersedia";
  const timestamp = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return userName ? `Terakhir diubah oleh ${userName} pada ${timestamp}` : `Terakhir diubah pada ${timestamp}`;
}

function getBreakSchedule(date: string, part: string, shift: string): BreakSchedule[] {
  if (shift === "2") {
    return [
      { label: "Istirahat 1", start: "22:00", end: "22:10" },
      { label: "Istirahat makan", start: "00:00", end: "00:30" },
      { label: "Istirahat 2", start: "02:30", end: "02:40" },
      { label: "Istirahat Salat Subuh", start: "04:45", end: "05:00" },
    ];
  }

  const isFriday = new Date(`${date}T00:00:00`).getDay() === 5;
  const mealEnd = isFriday ? (part === "assy" ? "13:15" : "13:00") : part === "assy" ? "12:45" : "12:30";

  return [
    { label: "Istirahat 1", start: "09:30", end: "09:40" },
    { label: "Istirahat makan", start: "11:45", end: mealEnd },
    { label: "Istirahat 2", start: isFriday ? "14:30" : "14:00", end: isFriday ? "14:40" : "14:10" },
  ];
}

function calculateDurationMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if (
    !Number.isFinite(startHour) ||
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endHour) ||
    !Number.isFinite(endMinute)
  ) {
    return 0;
  }

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  const duration = endTotal >= startTotal ? endTotal - startTotal : endTotal + 24 * 60 - startTotal;

  return Math.max(0, duration);
}

function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = ((hour * 60 + minute + minutes) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function makeDraftRow(id: number, slot: DraftTemplate): DailyRow {
  return {
    id,
    slot_order: slot.order,
    start_time: slot.start,
    end_time: slot.end,
    prod_minutes: slot.minutes,
    slot_type: slot.type,
    oee: 0,
    is_oee_override: 1,
    total_target: 0,
    one_tr: 0,
    two_tr: 0,
    is_schedule_override: slot.type === "ot" ? 1 : 0,
    is_hidden: 0,
    remark: null,
    remark_updated_at: null,
    remark_updated_by_name: null,
    ftt: "",
    foee: "",
    fratio: "",
    ftotal_target: 0,
    f1tr: 0,
    f2tr: 0,
  };
}

function makeEditingRows(rows: DailyRow[]) {
  return Object.fromEntries(
    rows.map((row) => [
      row.id,
      {
        start_time: row.start_time,
        end_time: row.end_time,
        prod_minutes: row.prod_minutes,
        ftt: row.ftt,
        foee: row.foee,
        fratio: row.fratio,
        remark: row.remark ?? "",
        ftotal_target: row.ftotal_target,
      },
    ]),
  ) as Record<number, EditingRow>;
}

function hasRowChanges(row: DailyRow, editing: EditingRow | undefined, isCamshaft: boolean) {
  if (!editing) {
    return false;
  }

  return (
    row.start_time !== editing.start_time ||
    row.end_time !== editing.end_time ||
    parseDecimal(row.prod_minutes) !== parseDecimal(editing.prod_minutes) ||
    parseDecimal(row.ftt) !== parseDecimal(editing.ftt) ||
    parseDecimal(row.foee) !== parseDecimal(editing.foee) ||
    (!isCamshaft && row.fratio !== editing.fratio) ||
    (row.remark ?? "") !== editing.remark ||
    parseDecimal(row.ftotal_target) !== parseDecimal(editing.ftotal_target)
  );
}

export default function DailyPlanningClient() {
  const [date, setDate] = useState(today);
  const [part, setPart] = useState("cylblock");
  const [shift, setShift] = useState("1");
  const [data, setData] = useState<DailyData | null>(null);
  const [draftRows, setDraftRows] = useState<DailyRow[] | null>(null);
  const [pendingOtRows, setPendingOtRows] = useState<DailyRow[]>([]);
  const [editing, setEditing] = useState<Record<number, EditingRow>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingPlanning, setIsCreatingPlanning] = useState(false);
  const [isOtActionPending, setIsOtActionPending] = useState(false);
  const [isChoosingNightOtPosition, setIsChoosingNightOtPosition] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string, type: Toast["type"]) {
    setToast({ message, type });
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function refresh() {
    const nextData = await loadDailyPlanning(part, date, shift);
    startTransition(() => {
      setData(nextData);
      setDraftRows(null);
      setPendingOtRows([]);
      setEditing(makeEditingRows(nextData.rows));
    });
  }

  useEffect(() => {
    void (async () => {
      const nextData = await loadDailyPlanning(part, date, shift);
      startTransition(() => {
        setData(nextData);
        setDraftRows(null);
        setPendingOtRows([]);
        setEditing(makeEditingRows(nextData.rows));
      });
    })();
  }, [date, part, shift]);

  const isDrafting = draftRows !== null;
  const persistedRows = data?.rows ?? [];
  const visibleRows = draftRows ?? [...persistedRows, ...pendingOtRows].sort((left, right) => left.slot_order - right.slot_order);
  const isCamshaft = part === "camshaft";
  const breakSchedule = getBreakSchedule(date, part, shift);
  const emptyMessage = data && !data.hasMonthlyData ? data.message : "Tidak ada data daily planning.";
  const changedRows = persistedRows.filter((row: DailyRow) => hasRowChanges(row, editing[row.id], isCamshaft));
  const hasPendingUpdates = changedRows.length > 0 || pendingOtRows.length > 0;
  const otRows = visibleRows.filter((row) => row.slot_type === "ot");
  const canAddOt = (Boolean(data?.hasMonthlyData) || isDrafting) && (shift === "1" ? otRows.length === 0 : otRows.length < 2);
  const totals = visibleRows.reduce((result: DailyTotals, row: DailyRow) => {
    const current = editing[row.id] ?? row;
    const calculated = calculateRowPlan(row, current, isCamshaft);

    return {
      minutes: result.minutes + parseDecimal(current.prod_minutes),
      target: result.target + calculated.target,
      oneTr: result.oneTr + calculated.oneTr,
      twoTr: result.twoTr + calculated.twoTr,
    };
  }, { minutes: 0, target: 0, oneTr: 0, twoTr: 0 });

  function setEditingValue<T extends keyof EditingRow>(id: number, field: T, value: EditingRow[T]) {
    setEditing((current) => ({
      ...(isDrafting && (field === "ftt" || field === "foee" || field === "fratio")
        ? Object.fromEntries(
            visibleRows.map((row) => [
              row.id,
              { ...current[row.id], [field]: value },
            ]),
          )
        : {
            ...current,
            [id]: {
              ...current[id],
              [field]: value,
            },
          }),
    }));
  }

  function setEditingTimeValue(id: number, field: "start_time" | "end_time", value: string) {
    setEditing((current) => {
      const row = current[id];
      const dailyRow = visibleRows.find((item) => item.id === id);
      const isDayOt = shift === "1" && dailyRow?.slot_type === "ot";
      const isDuringMaghrib = value >= maghribBreak.start && value < maghribBreak.end;
      const normalizedValue = isDayOt && isDuringMaghrib
        ? field === "start_time" ? maghribBreak.end : maghribBreak.start
        : value;
      const next = {
        ...row,
        [field]: normalizedValue,
      };

      return {
        ...current,
        [id]: {
          ...next,
          prod_minutes: calculateDurationMinutes(next.start_time, next.end_time),
        },
      };
    });
  }

  async function updateChangedRows() {
    if (changedRows.length === 0 && pendingOtRows.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      for (const row of changedRows) {
        const next = editing[row.id];
        const [ratioOne, ratioTwo] = parseRatio(next.fratio);
        const parametersChanged =
          parseDecimal(row.ftt) !== parseDecimal(next.ftt) ||
          (!isCamshaft && row.fratio !== next.fratio);
        const scheduleChanged =
          row.start_time !== next.start_time ||
          row.end_time !== next.end_time ||
          parseDecimal(row.prod_minutes) !== parseDecimal(next.prod_minutes);

        if (parseDecimal(row.foee) !== parseDecimal(next.foee)) {
          await updateDailyOee(row.id, parseDecimal(next.foee));
        }

        if (parametersChanged) {
          await updateDailySlotParameters(part, row.id, parseDecimal(next.ftt), next.fratio);
        }

        if (scheduleChanged) {
          await updateDailySlotSchedule(
            part,
            row.id,
            next.start_time,
            next.end_time,
            parseDecimal(next.prod_minutes),
            ratioOne,
            ratioTwo,
            parseDecimal(next.ftt),
            parseDecimal(next.foee) / 100,
          );
        }

        if (parseDecimal(row.ftotal_target) !== parseDecimal(next.ftotal_target)) {
          await updateDailyTarget(
            part,
            row.id,
            parseDecimal(next.ftotal_target),
            ratioOne,
            ratioTwo,
          );
        }

        if ((row.remark ?? "") !== next.remark) {
          await updateDailySlotRemark(row.id, next.remark ?? "");
        }
      }

      for (const row of pendingOtRows) {
        const next = editing[row.id] ?? row;
        await saveDailyOt(part, date, shift, {
          order: row.slot_order,
          startTime: next.start_time,
          endTime: next.end_time,
          slotType: "ot",
          tt: parseDecimal(next.ftt),
          oee: parseDecimal(next.foee),
          ratio: next.fratio,
        });
      }

      await refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Daily planning gagal diupdate.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddOt(position?: "start" | "end") {
    setIsOtActionPending(true);

    try {
      if (isDrafting || data?.hasMonthlyData) {
        const normalRows = visibleRows.filter((row) => row.slot_type === "normal");
        const firstNormal = normalRows[0];
        const lastNormal = normalRows[normalRows.length - 1];
        if (!firstNormal || !lastNormal) throw new Error("Jadwal shift belum lengkap.");

        const isNightStart = shift === "2" && position === "start";
        const minutes = shift === "2" && !isNightStart ? 30 : 60;
        const order = shift === "1" ? 8 : isNightStart ? 1 : 10;
        const start = isNightStart
          ? addMinutes(firstNormal.start_time, -minutes)
          : addMinutes(lastNormal.end_time, shift === "1" ? 30 : 0);
        const slot: DraftTemplate = {
          order,
          start,
          end: addMinutes(start, minutes),
          minutes,
          type: "ot",
        };
        const row = makeDraftRow(-100 - order, slot);
        if (isDrafting) {
          setDraftRows((current) => [...(current ?? []), row].sort((left, right) => left.slot_order - right.slot_order));
        } else {
          setPendingOtRows((current) => [...current, row].sort((left, right) => left.slot_order - right.slot_order));
        }
        setEditing((current) => {
          const firstNormal = visibleRows.find((item) => item.slot_type === "normal");
          const sharedValues = firstNormal ? current[firstNormal.id] : undefined;

          return {
            ...current,
            [row.id]: {
              ...makeEditingRows([row])[row.id],
              ftt: sharedValues?.ftt ?? "",
              foee: sharedValues?.foee ?? "",
              fratio: sharedValues?.fratio ?? "",
            },
          };
        });
        setIsChoosingNightOtPosition(false);
        return;
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "OT gagal ditambahkan.", "error");
    } finally {
      setIsOtActionPending(false);
    }
  }

  async function handleCreatePlanning() {
    setIsCreatingPlanning(true);

    try {
      const template = await getManualDailyPlanningDraft(part, date, shift);
      const rows = template.map((slot) => makeDraftRow(-slot.order, slot));
      setDraftRows(rows);
      setEditing(makeEditingRows(rows));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Draft daily planning gagal dibuat.", "error");
    } finally {
      setIsCreatingPlanning(false);
    }
  }

  async function saveDraftPlanning() {
    setIsSaving(true);

    try {
      await saveManualDailyPlanning(
        part,
        date,
        shift,
        visibleRows.map((row) => {
          const current = editing[row.id] ?? row;
          return {
            order: row.slot_order,
            startTime: current.start_time,
            endTime: current.end_time,
            slotType: row.slot_type,
            tt: parseDecimal(current.ftt),
            oee: parseDecimal(current.foee),
            ratio: current.fratio,
          };
        }),
      );
      setDraftRows(null);
      await refresh();
      showToast("Daily planning berhasil disimpan.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Daily planning gagal disimpan.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteManualOt(id: number) {
    setIsOtActionPending(true);

    try {
      const isPendingOt = pendingOtRows.some((row) => row.id === id);
      if (isDrafting || isPendingOt) {
        if (isDrafting) {
          setDraftRows((current) => current?.filter((row) => row.id !== id) ?? null);
        } else {
          setPendingOtRows((current) => current.filter((row) => row.id !== id));
        }
        setEditing((current) => {
          const remaining = { ...current };
          delete remaining[id];
          return remaining;
        });
        return;
      }

      await deleteDailyManualOt(id);
      await refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "OT gagal dihapus.", "error");
    } finally {
      setIsOtActionPending(false);
    }
  }

  async function handleDeleteZeroMinuteSlot(row: DailyRow) {
    const current = editing[row.id] ?? row;
    if (parseDecimal(current.prod_minutes) !== 0) return;

    setIsOtActionPending(true);

    try {
      const isPendingOt = pendingOtRows.some((item) => item.id === row.id);
      if (isDrafting || isPendingOt) {
        if (isDrafting) {
          setDraftRows((items) => items?.filter((item) => item.id !== row.id) ?? null);
        } else {
          setPendingOtRows((items) => items.filter((item) => item.id !== row.id));
        }
        setEditing((items) => {
          const next = { ...items };
          delete next[row.id];
          return next;
        });
        return;
      }

      const [ratioOne, ratioTwo] = parseRatio(current.fratio);
      await updateDailySlotSchedule(
        part,
        row.id,
        current.start_time,
        current.end_time,
        0,
        ratioOne,
        ratioTwo,
        parseDecimal(current.ftt),
        parseDecimal(current.foee) / 100,
      );
      await refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Slot 0 menit gagal dihapus.", "error");
    } finally {
      setIsOtActionPending(false);
    }
  }

  function handleAddOtClick() {
    if (shift === "2" && otRows.length === 0) {
      setIsChoosingNightOtPosition(true);
      return;
    }

    void handleAddOt();
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
        <div
          className="flex flex-col gap-4 border-b-2 border-[#e4e7ec] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
          style={{ borderBottomColor: "#84adff" }}
        >
          <div>
            <h2 className="text-base font-semibold text-[#101828]">{formatPart(part)} Detail</h2>
            <p className="mt-1 text-sm text-[#667085]">Daily planning filtered by date and shift</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[160px_170px_112px_auto_auto] sm:items-end">
            <label className="block"><span className="sr-only">Date</span><input className="h-10 w-full rounded-lg border border-[#e4e7ec] px-3 text-sm font-medium text-[#344054]" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className="relative block"><span className="sr-only">Line</span><select className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white px-3 pr-10 text-sm font-medium text-[#344054]" value={part} onChange={(event) => setPart(event.target.value)}>{parts.map((item) => <option key={item} value={item}>{formatPart(item)}</option>)}</select><svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg></label>
            <label className="relative block"><span className="sr-only">Shift</span><select className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white px-3 pr-10 text-sm font-medium text-[#344054]" value={shift} onChange={(event) => setShift(event.target.value)}><option value="1">Day</option><option value="2">Night</option></select><svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg></label>
            {isDrafting ? <button
              className="order-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#12b76a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#039855] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="button"
              onClick={() => void saveDraftPlanning()}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Save
            </button> : data?.canCreatePlanning ? <button
              className="order-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#2f80ff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#175cd3] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreatingPlanning}
              type="button"
              onClick={() => void handleCreatePlanning()}
            >
              {isCreatingPlanning ? "Membuat..." : "Create Planning"}
            </button> : <button
              className="order-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#12b76a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#039855] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!hasPendingUpdates || isSaving}
              type="button"
              onClick={() => void updateChangedRows()}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Update
            </button>}
            {!data?.canCreatePlanning || isDrafting ? <button
              className="order-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-none transition hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#3b82f6] dark:hover:bg-[#3b82f6]"
              disabled={!canAddOt || isOtActionPending}
              type="button"
              onClick={handleAddOtClick}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Tambah OT
            </button> : null}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="bg-[#f9fafb] text-left text-xs font-medium uppercase tracking-wide text-[#667085]"><tr><th className="px-5 py-3">Jam</th><th className="pl-0 pr-8">Menit</th><th className="pl-8">TT</th><th className="px-2">OEE</th>{!isCamshaft ? <th className="pl-2 pr-8">Ratio</th> : null}<th className="pl-8">Total Plan</th><th className="px-2">{isCamshaft ? "01" : "1TR"}</th><th className="pl-2 pr-5">{isCamshaft ? "02" : "2TR"}</th><th className="px-3 py-3 normal-case">Remark</th></tr></thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {visibleRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-medium text-[#667085]" colSpan={isCamshaft ? 8 : 9}>
                    <div className="flex flex-col items-center gap-3">
                      <span>{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              ) : visibleRows.map((row: DailyRow, index) => {
                const current = editing[row.id] ?? row;
                const calculated = calculateRowPlan(row, current, isCamshaft);
                const displayedTarget = calculated.target;
                const displayedOneTr = calculated.oneTr;
                const displayedTwoTr = calculated.twoTr;
                const isZeroMinuteSlot = parseDecimal(current.prod_minutes) === 0;
                const scheduledBreaks = breakSchedule.filter((breakItem) => breakItem.end === current.start_time);
                const previousRow = visibleRows[index - 1];
                const followsMaghrib = row.slot_type === "ot" && shift === "1" && current.start_time === maghribBreak.end && previousRow?.slot_type === "ot" && previousRow.end_time === maghribBreak.start;
                const breaksBeforeRow = followsMaghrib
                  ? [...scheduledBreaks, maghribBreak]
                  : scheduledBreaks;

                return (
                  <Fragment key={row.id}>
                    {breaksBeforeRow.map((breakItem) => (
                      <tr key={`${breakItem.label}-${breakItem.start}`} className="bg-[#fff8e8] text-[#8a5b00] dark:bg-[#1e293b] dark:text-[#bfdbfe]">
                        <td className="px-5 py-2.5 font-semibold"><div className="w-[212px] text-center"><span>{breakItem.start} - {breakItem.end}</span></div></td>
                        <td />
                        <td className="px-0 py-2.5 text-center text-sm font-semibold" colSpan={isCamshaft ? 2 : 3}>{breakItem.label}</td>
                        <td colSpan={3} />
                        <td />
                      </tr>
                    ))}
                  <tr className={row.slot_type === "ot" ? "bg-[#f3f7ff] dark:bg-[#0b367c] dark:text-white" : ""} style={row.slot_type === "ot" ? { boxShadow: "inset 4px 0 #2f80ff" } : undefined}>
                    <td className="px-5 py-3"><div className="flex items-center gap-1"><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" type="time" value={current.start_time} onChange={(event) => setEditingTimeValue(row.id, "start_time", event.target.value)} /><span>-</span><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" type="time" value={current.end_time} onChange={(event) => setEditingTimeValue(row.id, "end_time", event.target.value)} />{isZeroMinuteSlot ? <button aria-label="Hapus slot 0 menit" className="ml-1 grid size-8 place-items-center rounded-md text-[#b42318] transition hover:bg-[#fef3f2] disabled:opacity-60" disabled={isOtActionPending} title="Hapus slot 0 menit" type="button" onClick={() => void handleDeleteZeroMinuteSlot(row)}><svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg></button> : row.slot_type === "ot" && row.is_schedule_override ? <button aria-label="Hapus OT manual" className="ml-1 grid size-8 place-items-center rounded-md text-[#b42318] transition hover:bg-[#fef3f2] disabled:opacity-60" disabled={isOtActionPending} title="Hapus OT manual" type="button" onClick={() => void handleDeleteManualOt(row.id)}><svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg></button> : null}</div></td><td className="pl-0 pr-8"><span className="inline-flex h-9 min-w-16 items-center font-semibold text-[#101828]">{current.prod_minutes}</span></td><td className="pl-8"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" inputMode="decimal" value={current.ftt} onChange={(event) => setEditingValue(row.id, "ftt", event.target.value)} /></td><td className="px-2"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" inputMode="decimal" value={current.foee} onChange={(event) => setEditingValue(row.id, "foee", event.target.value)} /></td>{!isCamshaft ? <td className="pl-2 pr-8"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" value={current.fratio} onChange={(event) => setEditingValue(row.id, "fratio", event.target.value)} /></td> : null}
                    <td className="pl-8"><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" inputMode="numeric" value={displayedTarget} onChange={(event) => setEditingValue(row.id, "ftotal_target", event.target.value)} /></td><td className="px-2 font-semibold">{displayedOneTr}</td><td className="pl-2 pr-5 font-semibold">{displayedTwoTr}</td><td className="px-3 py-3"><div className="flex min-w-56 items-center gap-1"><input aria-label={`Remark ${current.start_time} sampai ${current.end_time}`} className="h-9 min-w-0 flex-1 rounded-lg border border-[#e4e7ec] px-2" maxLength={500} placeholder="Tambah remark" value={current.remark ?? ""} onChange={(event) => setEditingValue(row.id, "remark", event.target.value)} /><span aria-label={formatRemarkAudit(row.remark_updated_at, row.remark_updated_by_name)} className="group relative grid size-7 shrink-0 cursor-help place-items-center rounded-full text-[#667085] outline-none hover:bg-[#f2f4f7] focus:bg-[#f2f4f7]" tabIndex={0}><svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M14 11v5" /></svg><span role="tooltip" className="invisible absolute bottom-full right-0 z-20 mb-2 w-56 rounded-lg bg-[#101828] px-3 py-2 text-xs font-medium normal-case leading-5 text-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">{formatRemarkAudit(row.remark_updated_at, row.remark_updated_by_name)}</span></span></div></td>
                  </tr>
                  </Fragment>
                );
              })}
            </tbody>
            {visibleRows.length > 0 ? <tfoot className="bg-[#f9fafb] font-bold text-[#101828] dark:bg-[#162033] dark:text-[#f8fafc]">
              <tr>
                <td className="px-5 py-3">Total</td>
                <td className="pl-0 pr-8">
                  <div className="flex items-center gap-2">
                    <span>{totals.minutes}</span>
                    <span className="text-xs font-medium text-[#667085] dark:text-[#a7b0c0]">
                      ({formatMinutesAsHours(totals.minutes)})
                    </span>
                  </div>
                </td>
                <td className="pl-8" />
                <td className="px-2" />
                {!isCamshaft ? <td className="pl-2 pr-8" /> : null}
                <td className="pl-8">{totals.target}</td>
                <td className="px-2">{totals.oneTr}</td>
                <td className="pl-2 pr-5">{totals.twoTr}</td>
                <td className="px-3" />
              </tr>
            </tfoot> : null}
          </table>
        </div>
      </section>
      {isChoosingNightOtPosition ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="night-ot-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-[#111827]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="night-ot-title" className="text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">Tambah OT Night</h3>
                <p className="mt-1 text-sm text-[#667085] dark:text-[#a7b0c0]">Pilih posisi OT Night.</p>
              </div>
              <button aria-label="Tutup" className="grid size-8 place-items-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] dark:text-[#a7b0c0] dark:hover:bg-[#1f2937]" type="button" onClick={() => setIsChoosingNightOtPosition(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="rounded-xl border border-[#b2ddff] bg-[#f0f9ff] px-3 py-4 text-left transition hover:border-[#2f80ff] hover:bg-[#e0f2fe] disabled:opacity-60 dark:border-[#175cd3] dark:bg-[#102a43] dark:hover:border-[#53b1fd] dark:hover:bg-[#123554]" disabled={isOtActionPending} type="button" onClick={() => void handleAddOt("start")}>
                <span className="block text-sm font-semibold text-[#175cd3] dark:text-[#84caff]">OT Awal</span>
                <span className="mt-1 block text-xs text-[#667085] dark:text-[#b2ddff]">Sebelum slot normal pertama · 60 menit</span>
              </button>
              <button className="rounded-xl border border-[#abefc6] bg-[#ecfdf3] px-3 py-4 text-left transition hover:border-[#12b76a] hover:bg-[#dcfae6] disabled:opacity-60 dark:border-[#027a48] dark:bg-[#062b1b] dark:hover:border-[#32d583] dark:hover:bg-[#0b3b27]" disabled={isOtActionPending} type="button" onClick={() => void handleAddOt("end")}>
                <span className="block text-sm font-semibold text-[#027a48] dark:text-[#75e0a7]">OT Akhir</span>
                <span className="mt-1 block text-xs text-[#667085] dark:text-[#abefc6]">Setelah slot normal terakhir · 30 menit</span>
              </button>
            </div>
            <button className="mt-5 h-10 w-full rounded-lg border border-[#d0d5dd] text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb] dark:border-[#384860] dark:text-[#d4dae5] dark:hover:bg-[#1f2937]" disabled={isOtActionPending} type="button" onClick={() => setIsChoosingNightOtPosition(false)}>Batal</button>
          </div>
        </div>
      ) : null}
      {toast ? (
        <div className="fixed bottom-5 right-5 z-[60] w-[min(360px,calc(100vw-40px))]">
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-[#abefc6] bg-[#ecfdf3] text-[#027a48]"
                : "border-[#fecdca] bg-[#fef3f2] text-[#b42318]"
            }`}
            role="alert"
          >
            <p className="min-w-0 break-words font-medium">{toast.message}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
