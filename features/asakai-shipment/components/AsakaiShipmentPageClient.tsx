"use client";

import { deleteAsakaiShipmentsAction, getAsakaiShipmentAction, importAsakaiShipmentAction, updateAsakaiShipmentValuesAction } from "@/features/asakai-shipment/actions";
import type { AsakaiShipmentImportConflict, AsakaiShipmentRow, AsakaiShipmentValueUpdate } from "@/features/asakai-shipment/server/asakai-shipment";
import { useCallback, useEffect, useState } from "react";

function currentMonth() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; }
function toEditValues(row: AsakaiShipmentRow): AsakaiShipmentValueUpdate {
  return { line: row.line, dest: row.dest, moduleNo: row.moduleNo, renban: row.renban, vanningDate: row.vanningDate, etdDate: row.etdDate ?? "", remark: row.remark ?? "", completedDate: row.completedDate ?? "" };
}
function inputClassName(key: keyof AsakaiShipmentValueUpdate) {
  if (key === "line") return "w-16";
  if (key === "vanningDate" || key === "etdDate") return "w-32";
  if (key === "remark" || key === "completedDate") return "w-28";
  return "w-28";
}

const columns: Array<{ key: keyof AsakaiShipmentRow; label: string }> = [
  { key: "line", label: "Line" }, { key: "dest", label: "Dest" }, { key: "moduleNo", label: "Module no" },
  { key: "renban", label: "Renban" }, { key: "vanningDate", label: "Vanning Date" }, { key: "etdDate", label: "ETD Date" },
  { key: "remark", label: "Remark" }, { key: "completedDate", label: "Completed Date" },
];
const shipmentSheets = ["CB TMC", "CB STM", "CH TMC", "CH STM", "CR TMC", "CR STM", "CA STM"];

export default function AsakaiShipmentPageClient() {
  const [month, setMonth] = useState(currentMonth);
  const [sheet, setSheet] = useState("CB TMC");
  const [sort, setSort] = useState<{ key: "vanningDate" | "remark"; direction: "asc" | "desc" }>({ key: "vanningDate", direction: "asc" });
  const [rows, setRows] = useState<AsakaiShipmentRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number[] | null>(null);
  const [conflicts, setConflicts] = useState<AsakaiShipmentImportConflict[] | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingValues, setEditingValues] = useState<Record<number, AsakaiShipmentValueUpdate>>({});
  const [initialValues, setInitialValues] = useState<Record<number, AsakaiShipmentValueUpdate>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const shipmentRows = await getAsakaiShipmentAction(month);
      const values = Object.fromEntries(shipmentRows.map((row) => [row.id, toEditValues(row)]));
      setRows(shipmentRows); setEditingValues(values); setInitialValues(values); setSelectedIds(new Set());
    }
    catch (error) { setToast({ type: "error", message: error instanceof Error ? error.message : "Gagal memuat data shipment." }); }
    finally { setIsLoading(false); }
  }, [month]);
  useEffect(() => { const timeout = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timeout); }, [load]);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(null), 5000); return () => window.clearTimeout(timeout); }, [toast]);

  async function importFile(confirmChanges = false) {
    if (!file) { setToast({ type: "error", message: "Pilih file Excel terlebih dahulu." }); return; }
    setIsImporting(true);
    try {
      const formData = new FormData(); formData.set("file", file); formData.set("confirmChanges", String(confirmChanges));
      const result = await importAsakaiShipmentAction(formData);
      if ("error" in result) { setToast({ type: "error", message: result.error ?? "Gagal mengimport data shipment." }); return; }
      if ("conflicts" in result) { setConflicts(result.conflicts ?? []); setIsImportOpen(false); return; }
      setToast({ type: "success", message: `Import selesai: ${result.inserted} baru, ${result.updated} diperbarui, ${result.skipped} sama dilewati, ${result.reconciled} menjadi Complete.` });
      setConflicts(null); setFile(null); setIsImportOpen(false); await load();
    } catch (error) { setToast({ type: "error", message: error instanceof Error ? error.message : "Gagal mengimport data shipment." }); }
    finally { setIsImporting(false); }
  }

  async function deleteRows() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try { await deleteAsakaiShipmentsAction(deleteTarget); setToast({ type: "success", message: `${deleteTarget.length} data shipment berhasil dihapus.` }); setDeleteTarget(null); await load(); }
    catch (error) { setToast({ type: "error", message: error instanceof Error ? error.message : "Gagal menghapus data shipment." }); }
    finally { setIsDeleting(false); }
  }
  async function saveEdits() {
    const updates = rows.flatMap((row) => {
      const values = editingValues[row.id]; const initial = initialValues[row.id];
      return !values || !initial || JSON.stringify(values) === JSON.stringify(initial) ? [] : [{ id: row.id, values }];
    });
    if (!updates.length) { setToast({ type: "error", message: "Belum ada perubahan data shipment." }); return; }
    setIsSaving(true);
    try {
      const result = await updateAsakaiShipmentValuesAction(updates);
      const errors = result.errors.map((error) => `${rows.find((row) => row.id === error.id)?.moduleNo ?? error.id}: ${error.message}`);
      setToast({ type: errors.length ? "error" : "success", message: errors.length ? `${result.updated} data disimpan. ${errors.join("; ")}` : `${result.updated} data shipment berhasil diperbarui.` });
      await load();
    } catch (error) { setToast({ type: "error", message: error instanceof Error ? error.message : "Gagal memperbarui data shipment." }); }
    finally { setIsSaving(false); }
  }
  const visibleRows = rows
    .filter((row) => row.sourceSheet === sheet)
    .sort((first, second) => {
      const firstValue = String(first[sort.key] ?? "");
      const secondValue = String(second[sort.key] ?? "");
      const comparison = firstValue.localeCompare(secondValue, "id");
      if (comparison !== 0) return sort.direction === "asc" ? comparison : -comparison;
      return first.vanningDate.localeCompare(second.vanningDate);
    });
  const allSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.id));
  const hasPendingUpdates = rows.some((row) => JSON.stringify(editingValues[row.id]) !== JSON.stringify(initialValues[row.id]));
  function toggle(id: number, checked: boolean) { setSelectedIds((current) => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; }); }

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-sm dark:border-[#273449] dark:bg-[#111827]">
      <div className="flex flex-col gap-4 border-b border-[#e4e7ec] px-5 py-4 sm:flex-row sm:items-end sm:justify-between dark:border-[#273449]">
        <div><h1 className="font-semibold text-[#101828] dark:text-[#f8fafc]">Data Shipment</h1><p className="mt-1 text-sm text-[#667085] dark:text-[#a7b0c0]">Upload shipment bulanan dan pantau status Complete otomatis.</p></div>
        <div className="flex flex-wrap gap-2"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-10 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm dark:border-[#384860] dark:bg-[#162033]" />
          <div className="relative">
            <select value={sheet} onChange={(event) => setSheet(event.target.value)} className="h-10 appearance-none rounded-lg border border-[#d0d5dd] bg-white py-0 pl-3 pr-10 text-sm font-medium text-[#344054] dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]">{shipmentSheets.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
          </div>
          <button type="button" onClick={() => setIsImportOpen(true)} className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white hover:bg-[#3641f5]">Import Data Shipment</button>
          <button type="button" disabled={!hasPendingUpdates || isSaving} onClick={() => void saveEdits()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#12b76a] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#039855] disabled:cursor-not-allowed disabled:opacity-60"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"><path d="M20 6 9 17l-5-5" /></svg>{isSaving ? "Mengupdate..." : "Update"}</button>
          <button type="button" aria-label="Hapus data terpilih" title="Hapus data terpilih" disabled={!selectedIds.size || isDeleting} onClick={() => setDeleteTarget([...selectedIds])} className="inline-flex size-10 items-center justify-center rounded-lg border border-[#fecdca] text-[#d92d20] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#7a271a]"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"><path d="M3 6h18M9 6V4h6v2m-8 0 1 14h8l1-14M10 10v6m4-6v6" /></svg></button>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[#667085] dark:bg-[#162033]"><tr>
        <th className="px-4 py-3"><input aria-label="Pilih semua" type="checkbox" checked={allSelected} onChange={(event) => { const checked = event.target.checked; setSelectedIds((current) => { const next = new Set(current); for (const row of visibleRows) { if (checked) next.add(row.id); else next.delete(row.id); } return next; }); }} /></th>
        {columns.map((column) => {
          const isSortable = column.key === "vanningDate" || column.key === "remark";
          const isActive = isSortable && sort.key === column.key;
          return <th key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold">{isSortable ? <button type="button" onClick={() => setSort((current) => ({ key: column.key as "vanningDate" | "remark", direction: current.key === column.key && current.direction === "asc" ? "desc" : "asc" }))} className="inline-flex items-center gap-1.5 hover:text-[#344054] dark:hover:text-[#f8fafc]">{column.label}<span className={isActive ? "text-[#465fff]" : "text-[#98a2b3]"}>{isActive ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</span></button> : column.label}</th>;
        })}</tr></thead>
        <tbody className="divide-y divide-[#eaecf0] dark:divide-[#273449]">{isLoading ? <tr><td colSpan={9} className="px-4 py-8 text-center text-[#667085]">Memuat data...</td></tr> : !visibleRows.length ? <tr><td colSpan={9} className="px-4 py-8 text-center text-[#667085]">Belum ada data shipment pada filter ini.</td></tr> : visibleRows.map((row) => <tr key={row.id} className="text-[#344054] odd:bg-white even:bg-[#edf2f7] dark:text-[#d4dae5] dark:odd:bg-[#111827] dark:even:bg-[#162033]"><td className="px-4 py-3"><input aria-label={`Pilih ${row.moduleNo}`} type="checkbox" checked={selectedIds.has(row.id)} onChange={(event) => toggle(row.id, event.target.checked)} /></td>{columns.map((column) => { const key = column.key as keyof AsakaiShipmentValueUpdate; return <td key={column.key} className="whitespace-nowrap px-4 py-3"><input type={key === "vanningDate" || key === "etdDate" ? "date" : "text"} value={editingValues[row.id]?.[key] ?? toEditValues(row)[key]} onChange={(event) => setEditingValues((current) => ({ ...current, [row.id]: { ...(current[row.id] ?? toEditValues(row)), [key]: event.target.value } }))} className={`h-9 ${inputClassName(key)} rounded-lg border border-[#d0d5dd] bg-white px-2 text-sm text-[#344054] outline-none focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff] dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]`} /></td>; })}</tr>)}</tbody>
      </table></div>
    </section>
    {toast ? <div role="status" className={`fixed bottom-5 right-5 z-[60] rounded-xl border bg-white px-4 py-3 text-sm font-medium shadow-lg ${toast.type === "success" ? "border-[#abefc6] text-[#027a48]" : "border-[#fecdca] text-[#b42318]"}`}>{toast.message}</div> : null}
    {isImportOpen ? <Modal title="Import Data Shipment">
      <p className="text-sm text-[#667085] dark:text-[#a7b0c0]">Sheet yang diproses: CB TMC, CB STM, CH TMC, CH STM, CR TMC, CR STM, dan CA STM.</p>
      <label className="mt-5 block text-sm font-medium text-[#344054] dark:text-[#d4dae5]">
        File Excel
        <input
          type="file"
          accept=".xlsx,.xls,.xlsb"
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
          className="mt-1 block h-11 w-full cursor-pointer rounded-lg border border-[#e4e7ec] bg-white text-sm text-[#667085] outline-none file:h-full file:border-0 file:border-r file:border-[#e4e7ec] file:bg-[#f9fafb] file:px-4 file:text-sm file:font-semibold file:text-[#344054] focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff] dark:border-[#384860] dark:bg-[#162033] dark:text-[#a7b0c0]"
        />
      </label>
      <ModalButtons loading={isImporting} onCancel={() => { setIsImportOpen(false); setFile(null); }} onConfirm={() => void importFile()} confirmLabel="Import" />
    </Modal> : null}
    {conflicts ? <Modal title="Data shipment berubah"><p className="text-sm text-[#667085] dark:text-[#a7b0c0]">Data existing berikut akan diperbarui dari file Excel.</p><div className="mt-4 max-h-44 overflow-auto rounded-lg border text-sm">{conflicts.map((row) => <p key={`${row.line}-${row.moduleNo}-${row.vanningDate}`} className="border-b px-3 py-2 last:border-0">{row.line} · {row.moduleNo} · {row.renban} · {row.vanningDate}</p>)}</div><ModalButtons loading={isImporting} onCancel={() => setConflicts(null)} onConfirm={() => void importFile(true)} confirmLabel="Update data" /></Modal> : null}
    {deleteTarget ? <Modal title="Hapus data shipment"><p className="text-sm text-[#667085] dark:text-[#a7b0c0]">{deleteTarget.length} data shipment akan dihapus permanen.</p><ModalButtons loading={isDeleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteRows()} confirmLabel="Hapus" danger /></Modal> : null}
  </div>;
}

function Modal({ title, children }: { title: string; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 p-4" role="dialog" aria-modal="true"><section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#111827]"><h2 className="text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">{title}</h2><div className="mt-2">{children}</div></section></div>; }
function ModalButtons({ loading, onCancel, onConfirm, confirmLabel, danger = false }: { loading: boolean; onCancel: () => void; onConfirm: () => void; confirmLabel: string; danger?: boolean }) { return <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={loading} onClick={onCancel} className="h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054] dark:border-[#384860] dark:text-[#d4dae5]">Batal</button><button type="button" disabled={loading} onClick={onConfirm} className={`h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60 ${danger ? "bg-[#d92d20]" : "bg-[#465fff]"}`}>{loading ? "Memproses..." : confirmLabel}</button></div>; }
