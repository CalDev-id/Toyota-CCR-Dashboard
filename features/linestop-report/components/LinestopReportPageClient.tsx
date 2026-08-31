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
  const [allRowsLine, setAllRowsLine] = useState<Summary | null>(null);
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

  async function updateMachine(machine: Machine, values: { lineKey: LineKey; machineName: string }) {
    setSaving(true);
    try { await updateLinestopMachineAction({ id: machine.id, ...values }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal memperbarui master mesin."); throw cause; }
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
    {loading ? <section className="rounded-xl border border-[#e4e7ec] bg-white px-5 py-12 text-center text-sm text-[#667085] shadow-sm dark:border-[#273449] dark:bg-[#111827]">Memuat linestop report...</section> : <div className="space-y-5">{summary.map((line) => <ParetoCard key={line.key} line={line} onShowAll={() => setAllRowsLine(line)} onShowUnmapped={() => setUnmappedLine(line)} />)}</div>}
    {editor ? <MachineModal editor={editor} machines={machines} saving={saving} onClose={() => setEditor(null)} onSave={saveMachine} onUpdate={updateMachine} onDelete={deleteMachine} onNew={() => setEditor("new")} /> : null}
    {unmappedLine ? <UnmappedModal line={unmappedLine} onClose={() => setUnmappedLine(null)} /> : null}
    {allRowsLine ? <AllRowsModal line={allRowsLine} onClose={() => setAllRowsLine(null)} /> : null}
  </div>;
}

function ParetoCard({ line, onShowAll, onShowUnmapped }: { line: Summary; onShowAll: () => void; onShowUnmapped: () => void }) {
  const topRows = line.rows.slice(0, 10);
  const maximum = Math.max(...topRows.map((row) => row.minutes), 1);
  const total = line.rows.reduce((sum, row) => sum + row.minutes, 0);
  return <section className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-sm dark:border-[#273449] dark:bg-[#111827]"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7ec] px-5 py-4 dark:border-[#273449]"><div><h2 className="font-semibold text-[#101828] dark:text-[#f8fafc]">Pareto Problem Mach Line {line.label}</h2><p className="mt-0.5 text-xs text-[#667085] dark:text-[#a7b0c0]">Top 10 dari {line.rows.length} mesin · Total {formatMinutes(total)} menit</p></div><div className="flex gap-2">{line.unmappedRows.length ? <button type="button" onClick={onShowUnmapped} className="h-8 rounded-lg border border-[#fecdca] px-3 text-xs font-semibold text-[#b42318] hover:bg-[#fef3f2]">{line.unmappedRows.length} Belum terkategori</button> : null}{line.rows.length > 10 ? <button type="button" onClick={onShowAll} className="h-8 rounded-lg border border-[#b2c0ff] px-3 text-xs font-semibold text-[#465fff] hover:bg-[#eef4ff] dark:hover:bg-[#253264]">Lihat semua</button> : null}</div></header>{topRows.length ? <div className="grid lg:grid-cols-[minmax(19rem,0.75fr)_minmax(0,1.6fr)]"><div className="overflow-x-auto border-b border-[#e4e7ec] lg:border-b-0 lg:border-r dark:border-[#273449]"><table className="min-w-full text-left text-sm"><thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[#667085] dark:bg-[#162033]"><tr><th className="w-14 px-4 py-3 text-right font-semibold">No.</th><th className="px-4 py-3 font-semibold">Problem</th><th className="px-4 py-3 text-right font-semibold">Waktu</th></tr></thead><tbody className="divide-y divide-[#eaecf0] dark:divide-[#273449]">{topRows.map((row, index) => <tr key={row.machineName} className="text-[#344054] dark:text-[#d4dae5]"><td className="px-4 py-2.5 text-right text-[#98a2b3]">{index + 1}</td><td className="px-4 py-2.5 font-medium">{row.machineName}</td><td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">{formatMinutes(row.minutes)} min</td></tr>)}</tbody></table></div><div className="min-w-0 p-5"><div className="flex h-80 items-end gap-2 border-b border-l border-[#d0d5dd] px-3 pt-8 dark:border-[#384860]">{topRows.map((row) => <div key={row.machineName} className="flex h-full min-w-0 flex-1 flex-col justify-end"><div className="mb-1 text-center text-xs font-semibold text-[#475467] dark:text-[#d4dae5]">{formatMinutes(row.minutes)}</div><div className="mx-auto w-[72%] min-w-4 rounded-t bg-[#5487c2] transition-opacity hover:opacity-80" style={{ height: `${Math.max((row.minutes / maximum) * 78, 2)}%` }} title={`${row.machineName}: ${formatMinutes(row.minutes)} min`} /></div>)}</div><div className="flex gap-2 px-3 pt-2">{topRows.map((row) => <div key={row.machineName} title={row.machineName} className="min-w-0 flex-1 text-center text-[10px] font-medium leading-tight text-[#667085] dark:text-[#a7b0c0]"><span className="line-clamp-2">{row.machineName}</span></div>)}</div><p className="mt-4 text-center text-xs font-semibold uppercase tracking-wide text-[#667085]">Problem</p></div></div> : <p className="px-5 py-12 text-center text-sm text-[#667085]">Belum ada problem yang cocok.</p>}</section>;
}

function AllRowsModal({ line, onClose }: { line: Summary; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 p-4" role="dialog" aria-modal="true"><section className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-[#111827]"><header className="flex items-center justify-between border-b border-[#e4e7ec] px-6 py-4 dark:border-[#273449]"><div><h2 className="font-semibold text-[#101828] dark:text-[#f8fafc]">Semua problem · {line.label}</h2><p className="mt-1 text-sm text-[#667085] dark:text-[#a7b0c0]">{line.rows.length} mesin tercocokkan, diurutkan dari waktu terbesar.</p></div><button type="button" onClick={onClose} className="text-sm text-[#667085]">Tutup</button></header><div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-[#f9fafb] text-xs uppercase tracking-wide text-[#667085] dark:bg-[#162033]"><tr><th className="w-16 px-6 py-3 text-right font-semibold">No.</th><th className="px-6 py-3 font-semibold">Problem</th><th className="px-6 py-3 text-right font-semibold">Waktu</th></tr></thead><tbody className="divide-y divide-[#eaecf0] dark:divide-[#273449]">{line.rows.map((row, index) => <tr key={row.machineName} className="text-[#344054] dark:text-[#d4dae5]"><td className="px-6 py-3 text-right text-[#98a2b3]">{index + 1}</td><td className="px-6 py-3 font-medium">{row.machineName}</td><td className="whitespace-nowrap px-6 py-3 text-right font-semibold">{formatMinutes(row.minutes)} min</td></tr>)}</tbody></table></div></section></div>;
}

function UnmappedModal({ line, onClose }: { line: Summary; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 p-4" role="dialog" aria-modal="true"><section className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl dark:bg-[#111827]"><div className="flex items-center justify-between border-b border-[#e4e7ec] px-6 py-4 dark:border-[#273449]"><div><h2 className="font-semibold text-[#101828] dark:text-[#f8fafc]">Problem belum terkategori · {line.label}</h2><p className="mt-1 text-sm text-[#667085] dark:text-[#a7b0c0]">Total {formatMinutes(line.unmappedMinutes)} min dari AV dan PE.</p></div><button type="button" onClick={onClose} className="text-sm text-[#667085]">Tutup</button></div><div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-[#f9fafb] text-xs uppercase tracking-wide text-[#667085] dark:bg-[#162033]"><tr><th className="px-6 py-3 font-semibold">Teks problem</th><th className="px-6 py-3 text-right font-semibold">Menit</th></tr></thead><tbody className="divide-y divide-[#eaecf0] dark:divide-[#273449]">{line.unmappedRows.map((row) => <tr key={row.machineName} className="align-top text-[#344054] dark:text-[#d4dae5]"><td className="px-6 py-3">{row.machineName}</td><td className="whitespace-nowrap px-6 py-3 text-right font-semibold">{formatMinutes(row.minutes)} min</td></tr>)}</tbody></table></div></section></div>;
}

function MachineModal({ editor, machines, saving, onClose, onSave, onUpdate, onDelete, onNew }: { editor: Machine | "new" | "manage"; machines: Machine[]; saving: boolean; onClose: () => void; onSave: (values: { lineKey: LineKey; machineName: string }) => void; onUpdate: (machine: Machine, values: { lineKey: LineKey; machineName: string }) => Promise<void>; onDelete: (machine: Machine) => void; onNew: () => void }) {
  const [lineKey, setLineKey] = useState<LineKey>(typeof editor === "object" ? editor.lineKey : "assy");
  const [machineName, setMachineName] = useState(typeof editor === "object" ? editor.machineName : "");
  const [filterLine, setFilterLine] = useState<LineKey>("assy");
  const [editing, setEditing] = useState<Machine | null>(null);
  const [editName, setEditName] = useState("");
  const isNew = editor === "new";
  const filteredMachines = machines.filter((machine) => machine.lineKey === filterLine);
  const startEditing = (machine: Machine) => { setEditing(machine); setEditName(machine.machineName); };
  const list = <div className="overflow-hidden rounded-xl border border-[#e4e7ec] dark:border-[#273449]"><div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] border-b border-[#e4e7ec] bg-[#f8fafc] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085] dark:border-[#273449] dark:bg-[#162033]"><span>No.</span><span>Master mesin</span><span>Aksi</span></div>{filteredMachines.map((machine, index) => { const active = editing?.id === machine.id; return <div key={machine.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center border-b border-[#eaecf0] px-4 py-3 last:border-b-0 dark:border-[#273449]"><span className="text-sm text-[#98a2b3]">{String(index + 1).padStart(2, "0")}</span>{active ? <div className="min-w-0 pr-3"><input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} className="h-10 w-full min-w-0 rounded-lg border border-[#465fff] bg-white px-3 text-sm dark:bg-[#162033]" /></div> : <span className="min-w-0 truncate pr-3 text-sm font-medium text-[#344054] dark:text-[#e4e7ec]">{machine.machineName}</span>}<span className="flex gap-2">{active ? <><button type="button" disabled={saving || !editName.trim()} onClick={() => void onUpdate(machine, { lineKey: machine.lineKey, machineName: editName.trim() }).then(() => setEditing(null)).catch(() => undefined)} className="h-8 rounded-lg border border-[#b2c0ff] px-3 text-xs font-semibold text-[#465fff]">Simpan</button><button type="button" onClick={() => setEditing(null)} className="h-8 rounded-lg border border-[#d0d5dd] px-3 text-xs font-semibold text-[#475467] dark:text-[#cbd5e1]">Batal</button></> : <><button type="button" onClick={() => startEditing(machine)} className="h-8 rounded-lg border border-[#b2c0ff] px-3 text-xs font-semibold text-[#465fff]">Edit</button><button type="button" disabled={saving} onClick={() => onDelete(machine)} className="h-8 rounded-lg border border-[#fecdca] px-3 text-xs font-semibold text-[#d92d20]">Hapus</button></>}</span></div>; })}</div>;
  const form = <form onSubmit={(event) => { event.preventDefault(); onSave({ lineKey, machineName }); }} className="space-y-4 p-6"><label className="block text-sm font-medium text-[#344054] dark:text-[#d4dae5]">Line<select value={lineKey} onChange={(event) => setLineKey(event.target.value as LineKey)} className="mt-1 h-10 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]">{lines.map((line) => <option key={line.key} value={line.key}>{line.label}</option>)}</select></label><label className="block text-sm font-medium text-[#344054] dark:text-[#d4dae5]">Nama mesin<input autoFocus required value={machineName} onChange={(event) => setMachineName(event.target.value)} placeholder="Contoh: ISPS 027" className="mt-1 h-10 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]" /></label><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054]">Batal</button><button disabled={saving} className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan"}</button></div></form>;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/55 p-4" role="dialog" aria-modal="true"><section className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#111827]"><div className="flex items-start justify-between border-b border-[#e4e7ec] bg-[#f8fafc] px-6 py-5 dark:border-[#273449] dark:bg-[#162033]"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef4ff] text-[#465fff] dark:bg-[#253264]"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg></span><div><h2 className="text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">{isNew ? "Tambah master mesin" : "Kelola master mesin"}</h2><p className="mt-1 text-sm text-[#667085] dark:text-[#a7b0c0]">{isNew ? "Tambahkan mesin baru ke master linestop." : "Atur daftar mesin yang dipakai untuk kategorisasi linestop."}</p></div></div><button type="button" onClick={onClose} aria-label="Tutup" className="grid size-9 place-items-center rounded-lg text-[#667085] hover:bg-[#eaecf0] dark:text-[#a7b0c0] dark:hover:bg-[#273449]"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>{editor === "manage" ? <div className="overflow-auto p-6"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-4"><LineSelect value={filterLine} onChange={(value) => { setFilterLine(value); setEditing(null); }} /><div><p className="font-semibold text-[#344054] dark:text-[#e4e7ec]">{lines.find((line) => line.key === filterLine)?.label}</p><p className="text-sm text-[#667085] dark:text-[#98a2b3]">{filteredMachines.length} master mesin</p></div></div><button type="button" onClick={onNew} className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white shadow-sm"><span className="mr-2 text-lg">+</span>Tambah mesin</button></div>{list}</div> : form}</section></div>;
}

function LineSelect({ value, onChange }: { value: LineKey; onChange: (value: LineKey) => void }) {
  return <span className="relative inline-block"><select value={value} onChange={(event) => onChange(event.target.value as LineKey)} className="h-10 appearance-none rounded-lg border border-[#d0d5dd] bg-white py-0 pl-3 pr-11 text-sm dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]">{lines.map((line) => <option key={line.key} value={line.key}>{line.label}</option>)}</select><svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#667085]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg></span>;
}
