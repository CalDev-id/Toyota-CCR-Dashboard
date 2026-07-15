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

function formatPart(value: string) {
  return partLabels[value] ?? value;
}

function parseRatio(value: string) {
  const [one, two] = value.split(":").map(Number);
  return [one || 1, two || 1] as const;
}

export default function DailyPlanningClient() {
  const [date, setDate] = useState(today);
  const [part, setPart] = useState("cylblock");
  const [shift, setShift] = useState("1");
  const [group, setGroup] = useState("R");
  const [data, setData] = useState<DailyData | null>(null);

  async function refresh() {
    const nextData = await loadDailyPlanning(part, date, shift, group);
    startTransition(() => setData(nextData));
  }

  async function saveSlot(row: DailyRow, changes: Partial<Pick<DailyRow, "start_time" | "end_time" | "prod_minutes" | "ftt" | "foee" | "fratio">>) {
    const next = { ...row, ...changes };
    const [ratioOne, ratioTwo] = parseRatio(next.fratio);
    await updateDailySlotSchedule(row.id, next.start_time, next.end_time, Number(next.prod_minutes), ratioOne, ratioTwo, Number(next.ftt), Number(next.foee) / 100);
    await refresh();
  }

  async function saveSharedParameters(tt: number, ratio: string) {
    await updateDailySharedParameters(part, date, shift, group, tt, ratio);
    await refresh();
  }

  useEffect(() => {
    void (async () => {
      const nextData = await loadDailyPlanning(part, date, shift, group);
      startTransition(() => setData(nextData));
    })();
  }, [date, group, part, shift]);

  const visibleRows = data?.rows ?? [];
  const totals = visibleRows.reduce(
    (result, row) => ({
      minutes: result.minutes + row.prod_minutes,
      target: result.target + row.ftotal_target,
      oneTr: result.oneTr + row.f1tr,
      twoTr: result.twoTr + row.f2tr,
    }),
    { minutes: 0, target: 0, oneTr: 0, twoTr: 0 },
  );

  return (
    <DefaultLayout>
      <section className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#e4e7ec] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#101828]">{formatPart(part)} Detail</h2>
            <p className="mt-1 text-sm text-[#667085]">Daily planning filtered by date, shift, and group</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[160px_170px_112px_112px]">
            <label className="block"><span className="sr-only">Date</span><input className="h-10 w-full rounded-lg border border-[#e4e7ec] px-3 text-sm font-medium text-[#344054]" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className="relative block"><span className="sr-only">Line</span><select className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white px-3 pr-10 text-sm font-medium text-[#344054]" value={part} onChange={(event) => setPart(event.target.value)}>{parts.map((item) => <option key={item} value={item}>{formatPart(item)}</option>)}</select><svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg></label>
            <label className="relative block"><span className="sr-only">Shift</span><select className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white px-3 pr-10 text-sm font-medium text-[#344054]" value={shift} onChange={(event) => setShift(event.target.value)}><option value="1">Day</option><option value="2">Night</option></select><svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg></label>
            <label className="relative block"><span className="sr-only">Group</span><select className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white px-3 pr-10 text-sm font-medium text-[#344054]" value={group} onChange={(event) => setGroup(event.target.value)}><option value="R">R</option><option value="W">W</option></select><svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg></label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[#f9fafb] text-left text-xs font-medium uppercase tracking-wide text-[#667085]"><tr><th className="px-5 py-3">Jam</th><th className="pl-0 pr-8">Menit</th><th className="pl-8">TT</th><th className="px-2">OEE</th><th className="pl-2 pr-8">Ratio</th><th className="pl-8">Total Target</th><th className="px-2">1TR</th><th className="pl-2 pr-5">2TR</th></tr></thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {visibleRows.map((row) => <tr key={row.id} className={row.slot_type === "ot" ? "bg-[#fffaeb]" : ""}>
                <td className="px-5 py-3"><div className="flex items-center gap-1"><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" type="time" defaultValue={row.start_time} onBlur={(event) => void saveSlot(row, { start_time: event.target.value })} /><span>-</span><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" type="time" defaultValue={row.end_time} onBlur={(event) => void saveSlot(row, { end_time: event.target.value })} /></div></td><td className="pl-0 pr-8"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" type="number" defaultValue={row.prod_minutes} onBlur={(event) => void saveSlot(row, { prod_minutes: Number(event.target.value) })} /></td><td className="pl-8"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" type="number" step="0.001" defaultValue={row.ftt} onBlur={(event) => void saveSharedParameters(Number(event.target.value), row.fratio)} /></td><td className="px-2"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" type="number" step="0.01" defaultValue={row.foee} onBlur={async (event) => { await updateDailyOee(row.id, Number(event.target.value)); await refresh(); }} /></td><td className="pl-2 pr-8"><input className="h-9 w-20 rounded-lg border border-[#e4e7ec] px-2" defaultValue={row.fratio} onBlur={(event) => void saveSharedParameters(row.ftt, event.target.value)} /></td>
                <td className="pl-8"><input className="h-9 w-24 rounded-lg border border-[#e4e7ec] px-2" type="number" defaultValue={row.ftotal_target} onBlur={async (event) => { const [one, two] = parseRatio(row.fratio); await updateDailyTarget(row.id, Number(event.target.value), one, two); await refresh(); }} /></td><td className="px-2 font-semibold">{row.f1tr}</td><td className="pl-2 pr-5 font-semibold">{row.f2tr}</td>
              </tr>)}
            </tbody>
            <tfoot className="border-t-2 border-[#98a2b3] bg-[#f2f4f7] font-bold text-[#101828]">
              <tr>
                <td className="px-5 py-3">Total</td>
                <td className="pl-0 pr-8">{totals.minutes}</td>
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
