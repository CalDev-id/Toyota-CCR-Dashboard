"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import {
  addDailyOt,
  deleteDailyManualOt,
  loadDailyPlanning,
  updateDailySlotSchedule,
  updateDailySharedParameters,
  updateDailyOee,
  updateDailyTarget,
} from "@/features/daily-planning/actions";
import { startTransition, useEffect, useState } from "react";

const today = new Date().toISOString().slice(0, 10);
const parts = ["assy", "cylblock", "cylhead", "camshaft", "crankshaft"];
const partLabels: Record<string, string> = { assy: "Assy", cylblock: "Cylinder Block", cylhead: "Cylinder Head", camshaft: "Camshaft", crankshaft: "Crankshaft" };

type DailyData = Awaited<ReturnType<typeof loadDailyPlanning>>;
type DailyRow = DailyData["rows"][number];
type EditingRow = Pick<DailyRow, "start_time" | "end_time" | "fratio"> & {
  prod_minutes: number | string;
  ftt: number | string;
  foee: number | string;
  ftotal_target: number | string;
};
type DailyTotals = { minutes: number; target: number; oneTr: number; twoTr: number };

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

function formatMinutesAsHours(minutes: number) {
  const hours = minutes / 60;
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} jam`;
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
    parseDecimal(row.ftotal_target) !== parseDecimal(editing.ftotal_target)
  );
}

export default function DailyPlanningClient() {
  const [date, setDate] = useState(today);
  const [part, setPart] = useState("cylblock");
  const [shift, setShift] = useState("1");
  const [data, setData] = useState<DailyData | null>(null);
  const [editing, setEditing] = useState<Record<number, EditingRow>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isOtActionPending, setIsOtActionPending] = useState(false);
  const [isChoosingNightOtPosition, setIsChoosingNightOtPosition] = useState(false);

  async function refresh() {
    const nextData = await loadDailyPlanning(part, date, shift);
    startTransition(() => {
      setData(nextData);
      setEditing(makeEditingRows(nextData.rows));
    });
  }

  useEffect(() => {
    void (async () => {
      const nextData = await loadDailyPlanning(part, date, shift);
      startTransition(() => {
        setData(nextData);
        setEditing(makeEditingRows(nextData.rows));
      });
    })();
  }, [date, part, shift]);

  const visibleRows = data?.rows ?? [];
  const isCamshaft = part === "camshaft";
  const emptyMessage = data && !data.hasMonthlyData ? data.message : "Tidak ada data daily planning.";
  const changedRows = visibleRows.filter((row: DailyRow) => hasRowChanges(row, editing[row.id], isCamshaft));
  const hasPendingUpdates = changedRows.length > 0;
  const otRows = visibleRows.filter((row) => row.slot_type === "ot");
  const canAddOt = Boolean(data?.hasMonthlyData) && (shift === "1" ? otRows.length === 0 : otRows.length < 2);
  const totals = visibleRows.reduce(
    (result: DailyTotals, row: DailyRow) => ({
      minutes: result.minutes + Number(editing[row.id]?.prod_minutes ?? row.prod_minutes),
      target: result.target + Number(editing[row.id]?.ftotal_target ?? row.ftotal_target),
      oneTr: result.oneTr + row.f1tr,
      twoTr: result.twoTr + row.f2tr,
    }),
    { minutes: 0, target: 0, oneTr: 0, twoTr: 0 },
  );

  function setEditingValue<T extends keyof EditingRow>(id: number, field: T, value: EditingRow[T]) {
    setEditing((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }));
  }

  function setEditingTimeValue(id: number, field: "start_time" | "end_time", value: string) {
    setEditing((current) => {
      const row = current[id];
      const next = {
        ...row,
        [field]: value,
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
    if (changedRows.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const firstChangedShared = changedRows.find((row: DailyRow) => {
        const next = editing[row.id];
        return next && (parseDecimal(row.ftt) !== parseDecimal(next.ftt) || (!isCamshaft && row.fratio !== next.fratio));
      });

      if (firstChangedShared) {
        const next = editing[firstChangedShared.id];
        await updateDailySharedParameters(
          part,
          date,
          shift,
          parseDecimal(next.ftt),
          next.fratio,
        );
      }

      for (const row of changedRows) {
        const next = editing[row.id];
        const [ratioOne, ratioTwo] = parseRatio(next.fratio);
        const scheduleChanged =
          row.start_time !== next.start_time ||
          row.end_time !== next.end_time ||
          parseDecimal(row.prod_minutes) !== parseDecimal(next.prod_minutes);

        if (parseDecimal(row.foee) !== parseDecimal(next.foee)) {
          await updateDailyOee(row.id, parseDecimal(next.foee));
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
      }

      await refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddOt(position?: "start" | "end") {
    setIsOtActionPending(true);

    try {
      await addDailyOt(part, date, shift, position);
      await refresh();
      setIsChoosingNightOtPosition(false);
    } finally {
      setIsOtActionPending(false);
    }
  }

  async function handleDeleteManualOt(id: number) {
    setIsOtActionPending(true);

    try {
      await deleteDailyManualOt(id);
      await refresh();
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
    <DefaultLayout>
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
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#12b76a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#039855] disabled:cursor-not-allowed disabled:opacity-60"
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
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#2f80ff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#175cd3] disabled:cursor-not-allowed disabled:opacity-60"
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
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[#f9fafb] text-left text-xs font-medium uppercase tracking-wide text-[#667085]"><tr><th className="px-5 py-3">Jam</th><th className="pl-0 pr-8">Menit</th><th className="pl-8">TT</th><th className="px-2">OEE</th>{!isCamshaft ? <th className="pl-2 pr-8">Ratio</th> : null}<th className="pl-8">Total Plan</th><th className="px-2">{isCamshaft ? "01" : "1TR"}</th><th className="pl-2 pr-5">{isCamshaft ? "02" : "2TR"}</th></tr></thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {visibleRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-medium text-[#667085]" colSpan={isCamshaft ? 7 : 8}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : visibleRows.map((row: DailyRow) => {
                const current = editing[row.id] ?? row;

                return (
                  <tr key={row.id} className={row.slot_type === "ot" ? "bg-[#f3f7ff] dark:bg-[#0b367c] dark:text-white" : ""} style={row.slot_type === "ot" ? { boxShadow: "inset 4px 0 #2f80ff" } : undefined}>
                    <td className="px-5 py-3"><div className="flex items-center gap-1"><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" type="time" value={current.start_time} onChange={(event) => setEditingTimeValue(row.id, "start_time", event.target.value)} /><span>-</span><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" type="time" value={current.end_time} onChange={(event) => setEditingTimeValue(row.id, "end_time", event.target.value)} />{row.slot_type === "ot" && row.is_schedule_override ? <button aria-label="Hapus OT manual" className="ml-1 grid size-8 place-items-center rounded-md text-[#b42318] transition hover:bg-[#fef3f2] disabled:opacity-60" disabled={isOtActionPending} title="Hapus OT manual" type="button" onClick={() => void handleDeleteManualOt(row.id)}><svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg></button> : null}</div></td><td className="pl-0 pr-8"><span className="inline-flex h-9 min-w-16 items-center font-semibold text-[#101828]">{current.prod_minutes}</span></td><td className="pl-8"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" inputMode="decimal" value={current.ftt} onChange={(event) => setEditingValue(row.id, "ftt", event.target.value)} /></td><td className="px-2"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" inputMode="decimal" value={current.foee} onChange={(event) => setEditingValue(row.id, "foee", event.target.value)} /></td>{!isCamshaft ? <td className="pl-2 pr-8"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" value={current.fratio} onChange={(event) => setEditingValue(row.id, "fratio", event.target.value)} /></td> : null}
                    <td className="pl-8"><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" inputMode="numeric" value={current.ftotal_target} onChange={(event) => setEditingValue(row.id, "ftotal_target", event.target.value)} /></td><td className="px-2 font-semibold">{row.f1tr}</td><td className="pl-2 pr-5 font-semibold">{row.f2tr}</td>
                  </tr>
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
                <td className="pl-8">-</td>
                <td className="px-2">-</td>
                {!isCamshaft ? <td className="pl-2 pr-8">-</td> : null}
                <td className="pl-8">{totals.target}</td>
                <td className="px-2">{totals.oneTr}</td>
                <td className="pl-2 pr-5">{totals.twoTr}</td>
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
    </DefaultLayout>
  );
}
