"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import {
  loadDailyPlanning,
  updateDailySlotSchedule,
  updateDailySharedParameters,
  updateDailyOee,
  updateDailyTarget,
} from "@/features/daily-planning/actions";
import { startTransition, useEffect, useState } from "react";

const today = new Date().toISOString().slice(0, 10);
const parts = ["cylblock", "cylhead", "camshaft", "crankshaft"];
const partLabels: Record<string, string> = { cylblock: "Cylinder Block", cylhead: "Cylinder Head", camshaft: "Camshaft", crankshaft: "Crankshaft" };

type DailyData = Awaited<ReturnType<typeof loadDailyPlanning>>;
type DailyRow = DailyData["rows"][number];
type EditingRow = Pick<
  DailyRow,
  "start_time" | "end_time" | "prod_minutes" | "ftt" | "foee" | "fratio" | "ftotal_target"
>;

function formatPart(value: string) {
  return partLabels[value] ?? value;
}

function parseRatio(value: string) {
  const [one, two] = value.split(":").map(Number);
  return [one || 1, two || 1] as const;
}

function formatMinutesAsHours(minutes: number) {
  const hours = minutes / 60;
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} jam`;
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

function hasRowChanges(row: DailyRow, editing: EditingRow | undefined) {
  if (!editing) {
    return false;
  }

  return (
    row.start_time !== editing.start_time ||
    row.end_time !== editing.end_time ||
    Number(row.prod_minutes) !== Number(editing.prod_minutes) ||
    Number(row.ftt) !== Number(editing.ftt) ||
    Number(row.foee) !== Number(editing.foee) ||
    row.fratio !== editing.fratio ||
    Number(row.ftotal_target) !== Number(editing.ftotal_target)
  );
}

export default function DailyPlanningClient() {
  const [date, setDate] = useState(today);
  const [part, setPart] = useState("cylblock");
  const [shift, setShift] = useState("1");
  const [group, setGroup] = useState("R");
  const [data, setData] = useState<DailyData | null>(null);
  const [editing, setEditing] = useState<Record<number, EditingRow>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function refresh() {
    const nextData = await loadDailyPlanning(part, date, shift, group);
    startTransition(() => {
      setData(nextData);
      setEditing(makeEditingRows(nextData.rows));
    });
  }

  useEffect(() => {
    void (async () => {
      const nextData = await loadDailyPlanning(part, date, shift, group);
      startTransition(() => {
        setData(nextData);
        setEditing(makeEditingRows(nextData.rows));
      });
    })();
  }, [date, group, part, shift]);

  const visibleRows = data?.rows ?? [];
  const changedRows = visibleRows.filter((row) => hasRowChanges(row, editing[row.id]));
  const hasPendingUpdates = changedRows.length > 0;
  const totals = visibleRows.reduce(
    (result, row) => ({
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

  async function updateChangedRows() {
    if (changedRows.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const firstChangedShared = changedRows.find((row) => {
        const next = editing[row.id];
        return next && (Number(row.ftt) !== Number(next.ftt) || row.fratio !== next.fratio);
      });

      if (firstChangedShared) {
        const next = editing[firstChangedShared.id];
        await updateDailySharedParameters(
          part,
          date,
          shift,
          group,
          Number(next.ftt),
          next.fratio,
        );
      }

      for (const row of changedRows) {
        const next = editing[row.id];
        const [ratioOne, ratioTwo] = parseRatio(next.fratio);
        const scheduleChanged =
          row.start_time !== next.start_time ||
          row.end_time !== next.end_time ||
          Number(row.prod_minutes) !== Number(next.prod_minutes);

        if (Number(row.foee) !== Number(next.foee)) {
          await updateDailyOee(row.id, Number(next.foee));
        }

        if (scheduleChanged) {
          await updateDailySlotSchedule(
            row.id,
            next.start_time,
            next.end_time,
            Number(next.prod_minutes),
            ratioOne,
            ratioTwo,
            Number(next.ftt),
            Number(next.foee) / 100,
          );
        }

        if (Number(row.ftotal_target) !== Number(next.ftotal_target)) {
          await updateDailyTarget(
            row.id,
            Number(next.ftotal_target),
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

  return (
    <DefaultLayout>
      <section className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
        <div
          className="flex flex-col gap-4 border-b-2 border-[#e4e7ec] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
          style={{ borderBottomColor: "#84adff" }}
        >
          <div>
            <h2 className="text-base font-semibold text-[#101828]">{formatPart(part)} Detail</h2>
            <p className="mt-1 text-sm text-[#667085]">Daily planning filtered by date, shift, and group</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[160px_170px_112px_112px_auto] sm:items-end">
            <label className="block"><span className="sr-only">Date</span><input className="h-10 w-full rounded-lg border border-[#e4e7ec] px-3 text-sm font-medium text-[#344054]" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className="relative block"><span className="sr-only">Line</span><select className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white px-3 pr-10 text-sm font-medium text-[#344054]" value={part} onChange={(event) => setPart(event.target.value)}>{parts.map((item) => <option key={item} value={item}>{formatPart(item)}</option>)}</select><svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg></label>
            <label className="relative block"><span className="sr-only">Shift</span><select className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white px-3 pr-10 text-sm font-medium text-[#344054]" value={shift} onChange={(event) => setShift(event.target.value)}><option value="1">Day</option><option value="2">Night</option></select><svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg></label>
            <label className="relative block"><span className="sr-only">Group</span><select className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white px-3 pr-10 text-sm font-medium text-[#344054]" value={group} onChange={(event) => setGroup(event.target.value)}><option value="R">R</option><option value="W">W</option></select><svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg></label>
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
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[#f9fafb] text-left text-xs font-medium uppercase tracking-wide text-[#667085]"><tr><th className="px-5 py-3">Jam</th><th className="pl-0 pr-8">Menit</th><th className="pl-8">TT</th><th className="px-2">OEE</th><th className="pl-2 pr-8">Ratio</th><th className="pl-8">Total Plan</th><th className="px-2">1TR</th><th className="pl-2 pr-5">2TR</th></tr></thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {visibleRows.map((row) => {
                const current = editing[row.id] ?? row;

                return (
                  <tr key={row.id} className={row.slot_type === "ot" ? "bg-[#f3f7ff] dark:bg-[#0b367c] dark:text-white" : ""} style={row.slot_type === "ot" ? { boxShadow: "inset 4px 0 #2f80ff" } : undefined}>
                    <td className="px-5 py-3"><div className="flex items-center gap-1"><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" type="time" value={current.start_time} onChange={(event) => setEditingValue(row.id, "start_time", event.target.value)} /><span>-</span><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" type="time" value={current.end_time} onChange={(event) => setEditingValue(row.id, "end_time", event.target.value)} /></div></td><td className="pl-0 pr-8"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" type="number" value={current.prod_minutes} onChange={(event) => setEditingValue(row.id, "prod_minutes", Number(event.target.value))} /></td><td className="pl-8"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" type="number" step="0.001" value={current.ftt} onChange={(event) => setEditingValue(row.id, "ftt", Number(event.target.value))} /></td><td className="px-2"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" type="number" step="0.01" value={current.foee} onChange={(event) => setEditingValue(row.id, "foee", Number(event.target.value))} /></td><td className="pl-2 pr-8"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" value={current.fratio} onChange={(event) => setEditingValue(row.id, "fratio", event.target.value)} /></td>
                    <td className="pl-8"><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" type="number" value={current.ftotal_target} onChange={(event) => setEditingValue(row.id, "ftotal_target", Number(event.target.value))} /></td><td className="px-2 font-semibold">{row.f1tr}</td><td className="pl-2 pr-5 font-semibold">{row.f2tr}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#f9fafb] font-bold text-[#101828] dark:bg-[#162033] dark:text-[#f8fafc]">
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
                <td className="pl-2 pr-8">-</td>
                <td className="pl-8">{totals.target}</td>
                <td className="px-2">{totals.oneTr}</td>
                <td className="pl-2 pr-5">{totals.twoTr}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </DefaultLayout>
  );
}
