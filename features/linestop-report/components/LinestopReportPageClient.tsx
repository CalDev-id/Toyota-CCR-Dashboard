"use client";

import { createLinestopMachineAction, deleteLinestopMachineAction, loadLinestopMachinesAction, loadLinestopReportAction, updateLinestopMachineAction } from "@/features/linestop-report/actions";
import { useCallback, useEffect, useState } from "react";

type LineKey = "assy" | "cylblock" | "cylhead" | "crankshaft" | "camshaft";
type Machine = { id: number; lineKey: LineKey; machineName: string };
type Summary = { key: LineKey; label: string; unmappedMinutes: number; rows: Array<{ machineName: string; minutes: number }>; unmappedRows: Array<{ machineName: string; minutes: number }> };
const lines: Array<{ key: LineKey; label: string }> = [{ key: "assy", label: "Assy" }, { key: "cylblock", label: "Cylinder Block" }, { key: "cylhead", label: "Cylinder Head" }, { key: "crankshaft", label: "Crankshaft" }, { key: "camshaft", label: "Camshaft" }];
function currentMonth() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function formatMinutes(value: number) { return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value); }

export default function LinestopReportPageClient({ viewerRole }: { viewerRole: string }) {
  const canManage = viewerRole === "ADMIN" || viewerRole === "CCR_GROUP_LEADER";
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Machine | "new" | "manage" | null>(null);
  const [unmappedLine, setUnmappedLine] = useState<Summary | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [report, library] = await Promise.all([loadLinestopReportAction(month), loadLinestopMachinesAction()]);
      setSummary(report); setMachines(library);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal memuat linestop report."); }
    finally { setLoading(false); }
  }, [month]);
  useEffect(() => { const timeout = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timeout); }, [load]);

  async function saveMachine(values: { lineKey: LineKey; machineName: string }) {
    setSaving(true);
    try {
      if (editor === "new") await createLinestopMachineAction(values);
      else if (editor && typeof editor === "object") await updateLinestopMachineAction({ ...values, id: editor.id });
      setEditor(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menyimpan master mesin."); }
    finally { setSaving(false); }
  }

  async function deleteMachine(machine: Machine) {
    if (!window.confirm(`Hapus master ${machine.machineName}?`)) return;
    setSaving(true);
    try { await deleteLinestopMachineAction(machine.id); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menghapus master mesin."); }
    finally { setSaving(false); }
  }

  return <div className="space-y-5">
    <section className="rounded-xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">Linestop Report</h1><p className="mt-1 text-sm text-[#667085] dark:text-[#a7b0c0]">Summary AV dan PE per mesin untuk seluruh shift dalam satu bulan.</p></div>
        <div className="flex gap-2"><input aria-label="Bulan report" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-10 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]" />{canManage ? <button type="button" onClick={() => setEditor("manage")} className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white hover:bg-[#3641f5]">Kelola master</button> : null}</div>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]">{error}</p> : null}
    </section>
    {loading ? <section className="rounded-xl border border-[#e4e7ec] bg-white px-5 py-12 text-center text-sm text-[#667085] shadow-sm dark:border-[#273449] dark:bg-[#111827]">Memuat linestop report...</section> : <div className="grid gap-5 xl:grid-cols-2">{summary.map((line) => <section key={line.key} className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-sm dark:border-[#273449] dark:bg-[#111827]"><header className="flex items-center justify-between border-b border-[#e4e7ec] px-5 py-4 dark:border-[#273449]"><div><h2 className="font-semibold text-[#101828] dark:text-[#f8fafc]">{line.label}</h2><p className="mt-0.5 text-xs text-[#667085] dark:text-[#a7b0c0]">{line.rows.length} mesin tercocokkan</p></div>{line.unmappedRows.length ? <button type="button" onClick={() => setUnmappedLine(line)} className="h-8 rounded-lg border border-[#fecdca] px-3 text-xs font-semibold text-[#b42318] hover:bg-[#fef3f2]">{line.unmappedRows.length} Belum terkategori</button> : null}</header><div className="max-h-96 overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-[#f9fafb] text-xs uppercase tracking-wide text-[#667085] dark:bg-[#162033]"><tr><th className="px-5 py-3 font-semibold">Mesin</th><th className="px-5 py-3 text-right font-semibold">Menit</th></tr></thead><tbody className="divide-y divide-[#eaecf0] dark:divide-[#273449]">{line.rows.length ? line.rows.map((row, index) => <tr key={row.machineName} className="text-[#344054] dark:text-[#d4dae5]"><td className="px-5 py-3"><span className="mr-3 inline-block w-5 text-xs text-[#98a2b3]">{index + 1}</span>{row.machineName}</td><td className="px-5 py-3 text-right font-semibold">{formatMinutes(row.minutes)} min</td></tr>) : <tr><td colSpan={2} className="px-5 py-8 text-center text-[#667085]">Belum ada problem yang cocok.</td></tr>}</tbody></table></div></section>)}</div>}
    {editor ? <MachineModal editor={editor} machines={machines} saving={saving} onClose={() => setEditor(null)} onSave={saveMachine} onEdit={(machine) => setEditor(machine)} onDelete={deleteMachine} onNew={() => setEditor("new")} /> : null}
    {unmappedLine ? <UnmappedModal line={unmappedLine} onClose={() => setUnmappedLine(null)} /> : null}
  </div>;
}

function UnmappedModal({ line, onClose }: { line: Summary; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 p-4" role="dialog" aria-modal="true"><section className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl dark:bg-[#111827]"><div className="flex items-center justify-between border-b border-[#e4e7ec] px-6 py-4 dark:border-[#273449]"><div><h2 className="font-semibold text-[#101828] dark:text-[#f8fafc]">Problem belum terkategori · {line.label}</h2><p className="mt-1 text-sm text-[#667085] dark:text-[#a7b0c0]">Total {formatMinutes(line.unmappedMinutes)} min dari AV dan PE.</p></div><button type="button" onClick={onClose} className="text-sm text-[#667085]">Tutup</button></div><div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-[#f9fafb] text-xs uppercase tracking-wide text-[#667085] dark:bg-[#162033]"><tr><th className="px-6 py-3 font-semibold">Teks problem</th><th className="px-6 py-3 text-right font-semibold">Menit</th></tr></thead><tbody className="divide-y divide-[#eaecf0] dark:divide-[#273449]">{line.unmappedRows.map((row) => <tr key={row.machineName} className="align-top text-[#344054] dark:text-[#d4dae5]"><td className="px-6 py-3">{row.machineName}</td><td className="whitespace-nowrap px-6 py-3 text-right font-semibold">{formatMinutes(row.minutes)} min</td></tr>)}</tbody></table></div></section></div>;
}

function MachineModal({ editor, machines, saving, onClose, onSave, onEdit, onDelete, onNew }: { editor: Machine | "new" | "manage"; machines: Machine[]; saving: boolean; onClose: () => void; onSave: (values: { lineKey: LineKey; machineName: string }) => void; onEdit: (machine: Machine) => void; onDelete: (machine: Machine) => void; onNew: () => void }) {
  const [lineKey, setLineKey] = useState<LineKey>(typeof editor === "object" ? editor.lineKey : "assy");
  const [machineName, setMachineName] = useState(typeof editor === "object" ? editor.machineName : "");
  const [filterLine, setFilterLine] = useState<LineKey>("assy");
  const isNew = editor === "new";
  const list = <div className="space-y-1">{machines.filter((machine) => machine.lineKey === filterLine).map((machine) => <div key={machine.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[#f2f4f7] dark:hover:bg-[#162033]"><span>{lines.find((line) => line.key === machine.lineKey)?.label} · {machine.machineName}</span><span className="flex shrink-0 gap-2"><button type="button" onClick={() => onEdit(machine)} className="font-semibold text-[#465fff]">Edit</button><button type="button" disabled={saving} onClick={() => onDelete(machine)} className="font-semibold text-[#d92d20] disabled:opacity-50">Hapus</button></span></div>)}</div>;
  const form = <form onSubmit={(event) => { event.preventDefault(); onSave({ lineKey, machineName }); }} className="space-y-4 p-6"><label className="block text-sm font-medium text-[#344054] dark:text-[#d4dae5]">Line<select value={lineKey} onChange={(event) => setLineKey(event.target.value as LineKey)} className="mt-1 h-10 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]">{lines.map((line) => <option key={line.key} value={line.key}>{line.label}</option>)}</select></label><label className="block text-sm font-medium text-[#344054] dark:text-[#d4dae5]">Nama mesin<input autoFocus required value={machineName} onChange={(event) => setMachineName(event.target.value)} placeholder="Contoh: ISPS 027" className="mt-1 h-10 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]" /></label><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054]">Batal</button><button disabled={saving} className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan"}</button></div></form>;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 p-4" role="dialog" aria-modal="true"><section className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-[#111827]"><div className="flex items-center justify-between border-b border-[#e4e7ec] px-6 py-4 dark:border-[#273449]"><h2 className="font-semibold text-[#101828] dark:text-[#f8fafc]">{isNew ? "Tambah master mesin" : "Kelola master mesin"}</h2><button type="button" onClick={onClose} className="text-sm text-[#667085]">Tutup</button></div>{editor === "manage" ? <div className="overflow-auto p-6"><div className="mb-4 flex flex-wrap gap-2"><button type="button" onClick={onNew} className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white">Tambah mesin</button><select aria-label="Filter line master" value={filterLine} onChange={(event) => setFilterLine(event.target.value as LineKey)} className="h-10 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]">{lines.map((line) => <option key={line.key} value={line.key}>{line.label}</option>)}</select></div>{list}</div> : form}</section></div>;
}
