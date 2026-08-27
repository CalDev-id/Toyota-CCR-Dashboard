"use client";

import {
  getAsakaiStockAction,
  importAsakaiStockAction,
  updateAsakaiStockValuesAction,
  deleteAsakaiStocksAction,
} from "@/features/asakai-stock/actions";
import type { AsakaiStockImportConflict, AsakaiStockRow, AsakaiStockValueUpdate } from "@/features/asakai-stock/server/asakai-stock";
import { useEffect, useRef, useState } from "react";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatValue(value: string | number | null) {
  return value ?? "-";
}

function monthEndDate(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}`;
}

function currentMonthEnd() {
  return monthEndDate(currentMonth());
}

function formatDateRange(start: string, end: string) {
  const format = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${format.format(new Date(`${start}T00:00:00`))} – ${format.format(new Date(`${end}T00:00:00`))}`;
}

function calendarDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1).getDay();
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return [...Array(firstDay).fill(null), ...Array.from({ length: lastDay }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`)];
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const columns: Array<{ key: keyof AsakaiStockRow; label: string }> = [
  { key: "date", label: "Date" },
  { key: "line", label: "Line" },
  { key: "type", label: "Type" },
  { key: "unitModule", label: "Unit/Module" },
  { key: "moduleCode", label: "Module Code" },
  { key: "targetDay", label: "Target Day" },
  { key: "targetModule", label: "Target Module" },
  { key: "actModule", label: "Act Module" },
  { key: "actualStockUnitEsPackcompNew", label: "Actual Stock Unit ES PackComp New" },
  { key: "actLocal", label: "Act Local" },
  { key: "actualStockUnitAdv", label: "Actual [Unit]" },
  { key: "balanceStockAdvNew", label: "Balance [Unit]" },
];

type SortKey = "date";

const editableKeys = new Set<keyof AsakaiStockValueUpdate>([
  "moduleCode",
  "targetDay",
  "targetModule",
  "actModule",
  "actualStockUnitEsPackcompNew",
  "actLocal",
  "actualStockUnitAdv",
  "balanceStockAdvNew",
]);

function toEditValues(row: AsakaiStockRow): AsakaiStockValueUpdate {
  return {
    moduleCode: row.moduleCode ?? "",
    targetDay: row.targetDay?.toString() ?? "",
    targetModule: row.targetModule?.toString() ?? "",
    actModule: row.actModule?.toString() ?? "",
    actualStockUnitEsPackcompNew: row.actualStockUnitEsPackcompNew?.toString() ?? "",
    actLocal: row.actLocal?.toString() ?? "",
    actualStockUnitAdv: row.actualStockUnitAdv?.toString() ?? "",
    balanceStockAdvNew: row.balanceStockAdvNew?.toString() ?? "",
  };
}

function inputClassName(key: keyof AsakaiStockValueUpdate) {
  if (key === "moduleCode") return "w-24";
  return "w-20";
}

function SelectionCheckbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="group grid size-5 cursor-pointer place-items-center rounded-md border border-[#98a2b3] bg-white shadow-sm transition hover:border-[#465fff] has-[:checked]:border-[#465fff] has-[:checked]:bg-[#465fff] dark:border-[#667085] dark:bg-[#162033]">
      <input type="checkbox" aria-label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
      <svg viewBox="0 0 16 16" aria-hidden="true" className="hidden size-3 text-white group-has-[:checked]:block" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
        <path d="m3 8 3 3 7-7" />
      </svg>
    </label>
  );
}

export default function AsakaiStockPageClient() {
  const [rangeStart, setRangeStart] = useState(() => `${currentMonth()}-01`);
  const [rangeEnd, setRangeEnd] = useState(currentMonthEnd);
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<AsakaiStockRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importConflicts, setImportConflicts] = useState<AsakaiStockImportConflict[] | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingValues, setEditingValues] = useState<Record<number, AsakaiStockValueUpdate>>({});
  const [initialValues, setInitialValues] = useState<Record<number, AsakaiStockValueUpdate>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<number[] | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "date", direction: "desc" });
  const today = todayDate();

  async function loadStock(start: string, end: string) {
    setIsLoading(true);
    try {
      const stockRows = await getAsakaiStockAction(start, end);
      const values = Object.fromEntries(stockRows.map((row) => [row.id, toEditValues(row)]));
      setRows(stockRows);
      setEditingValues(values);
      setInitialValues(values);
      setSelectedIds(new Set());
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Gagal memuat data stock." });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadStock(rangeStart, rangeEnd), 0);
    return () => window.clearTimeout(timeout);
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!isRangeOpen) return;

    function closeWhenClickingOutside(event: PointerEvent) {
      if (!calendarRef.current?.contains(event.target as Node)) setIsRangeOpen(false);
    }

    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () => document.removeEventListener("pointerdown", closeWhenClickingOutside);
  }, [isRangeOpen]);

  async function importFile(confirmChanges = false) {
    if (!selectedFile) {
      setToast({ type: "error", message: "Pilih file Excel terlebih dahulu." });
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("startDate", rangeStart);
      formData.set("endDate", rangeEnd);
      formData.set("confirmChanges", String(confirmChanges));
      const result = await importAsakaiStockAction(formData);

      if ("error" in result) {
        setToast({ type: "error", message: result.error ?? "Gagal mengimport data stock." });
        return;
      }

      if ("conflicts" in result) {
        setImportConflicts(result.conflicts ?? []);
        setIsImportModalOpen(false);
        return;
      }

      setToast({
        type: "success",
        message: `Import selesai: ${result.inserted} baru, ${result.updated} diperbarui, ${result.skipped} sama dan dilewati.`,
      });
      setImportConflicts(null);
      setSelectedFile(null);
      setIsImportModalOpen(false);
      await loadStock(rangeStart, rangeEnd);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Gagal mengimport data stock." });
    } finally {
      setIsImporting(false);
    }
  }

  async function saveEdits() {
    const updates = rows.flatMap((row) => {
      const values = editingValues[row.id];
      const initial = initialValues[row.id];
      if (!values || !initial || JSON.stringify(values) === JSON.stringify(initial)) return [];
      return [{ id: row.id, values }];
    });

    if (updates.length === 0) {
      setToast({ type: "error", message: "Belum ada perubahan data stock." });
      return;
    }

    setIsSaving(true);
    try {
      await updateAsakaiStockValuesAction(updates);
      setToast({ type: "success", message: `${updates.length} data stock berhasil diperbarui.` });
      await loadStock(rangeStart, rangeEnd);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Gagal memperbarui data stock." });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRows() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAsakaiStocksAction(deleteTarget);
      setToast({ type: "success", message: `${deleteTarget.length} data stock berhasil dihapus.` });
      setDeleteTarget(null);
      await loadStock(rangeStart, rangeEnd);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Gagal menghapus data stock." });
    } finally {
      setIsDeleting(false);
    }
  }

  const hasPendingUpdates = rows.some((row) => {
    const values = editingValues[row.id];
    const initial = initialValues[row.id];
    return Boolean(values && initial && JSON.stringify(values) !== JSON.stringify(initial));
  });

  const sortedRows = rows
    .filter((row) => row.date >= rangeStart && row.date <= rangeEnd)
    .sort((first, second) => {
      const firstValue = first[sort.key];
      const secondValue = second[sort.key];
      const comparison = String(firstValue ?? "").localeCompare(String(secondValue ?? ""), "id");
      return sort.direction === "asc" ? comparison : -comparison;
    });
  const allVisibleSelected = sortedRows.length > 0 && sortedRows.every((row) => selectedIds.has(row.id));

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-sm dark:border-[#273449] dark:bg-[#111827]">
        <div className="flex flex-col gap-4 border-b border-[#e4e7ec] px-5 py-4 sm:flex-row sm:items-end sm:justify-between dark:border-[#273449]">
          <div>
            <h1 className="font-semibold text-[#101828] dark:text-[#f8fafc]">Data Stock Asakai</h1>
            <p className="mt-1 text-sm text-[#667085] dark:text-[#a7b0c0]">{formatDateRange(rangeStart, rangeEnd)}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div ref={calendarRef} className="relative">
              <button
                type="button"
                aria-label="Pilih rentang tanggal"
                title="Pilih rentang tanggal"
                onClick={() => {
                  setIsRangeOpen((open) => !open);
                  setCalendarMonth(rangeStart.slice(0, 7));
                  setPendingStart(null);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm font-semibold text-[#344054] dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 10h18" />
                </svg>
                <span>{formatDateRange(rangeStart, rangeEnd)}</span>
              </button>
              {isRangeOpen ? (
                <div className="absolute right-0 top-12 z-20 w-72 rounded-xl border border-[#e4e7ec] bg-white p-4 shadow-lg dark:border-[#384860] dark:bg-[#162033]">
                  <div className="mb-3 flex items-center justify-between"><button type="button" onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}>‹</button><span className="text-sm font-semibold">{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${calendarMonth}-01T00:00:00`))}</span><button type="button" onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}>›</button></div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#667085]">{["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"].map((day) => <span key={day}>{day}</span>)}</div>
                  <div className="mt-1 grid grid-cols-7 gap-1">{calendarDays(calendarMonth).map((date, index) => date ? <button key={date} type="button" onClick={() => { if (!pendingStart) { setPendingStart(date); return; } const [start, end] = pendingStart <= date ? [pendingStart, date] : [date, pendingStart]; setRangeStart(start); setRangeEnd(end); setPendingStart(null); setIsRangeOpen(false); }} className={`aspect-square rounded-md text-xs hover:bg-[#ecf3ff] ${date === pendingStart ? "bg-[#fdb022] font-semibold text-[#344054]" : date === rangeStart || date === rangeEnd ? "bg-[#465fff] font-semibold text-white" : date > rangeStart && date < rangeEnd ? "bg-[#ecf3ff] text-[#3641f5]" : "text-[#344054] dark:text-[#d4dae5]"} ${date === today ? "ring-2 ring-[#12b76a] ring-offset-1 dark:ring-offset-[#162033]" : ""}`}>{Number(date.slice(-2))}</button> : <span key={`empty-${index}`} />)}</div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white transition hover:bg-[#3641f5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Import Data Stock
            </button>
            <button
              type="button"
              disabled={!hasPendingUpdates || isSaving}
              onClick={() => void saveEdits()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#12b76a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#039855] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {isSaving ? "Mengupdate..." : "Update"}
            </button>
            <button
              type="button"
              aria-label="Hapus data terpilih"
              title="Hapus data terpilih"
              disabled={selectedIds.size === 0 || isDeleting}
              onClick={() => setDeleteTarget([...selectedIds])}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-[#fecdca] text-[#d92d20] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#7a271a]"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"><path d="M3 6h18M9 6V4h6v2m-8 0 1 14h8l1-14M10 10v6m4-6v6" /></svg>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[#667085] dark:bg-[#162033] dark:text-[#a7b0c0]">
              <tr>
                <th className="w-12 px-4 py-3"><SelectionCheckbox label="Pilih semua data yang tampil" checked={allVisibleSelected} onChange={(checked) => setSelectedIds((current) => { const next = new Set(current); for (const row of sortedRows) { if (checked) next.add(row.id); else next.delete(row.id); } return next; })} /></th>
                {columns.map((column) => {
                  const isSortable = column.key === "date";
                  const isActive = isSortable && sort.key === column.key;
                  return (
                    <th key={column.key} aria-sort={isActive ? (sort.direction === "asc" ? "ascending" : "descending") : undefined} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {isSortable ? (
                        <button type="button" onClick={() => toggleSort(column.key as SortKey)} className="inline-flex items-center gap-1.5 text-left hover:text-[#344054] dark:hover:text-[#f8fafc]">
                          {column.label}
                          {isActive ? (
                            <svg viewBox="0 0 20 20" aria-hidden="true" className={`size-3.5 text-[#465fff] dark:text-[#a6b6ff] ${sort.direction === "desc" ? "rotate-180" : ""}`}>
                              <path d="M10 4v12m0-12L6 8m4-4 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                            </svg>
                          ) : null}
                        </button>
                      ) : column.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaecf0] dark:divide-[#273449]">
              {isLoading ? (
                <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-[#667085]">Memuat data...</td></tr>
              ) : sortedRows.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-[#667085]">Belum ada data stock untuk rentang tanggal ini.</td></tr>
              ) : sortedRows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={`text-[#344054] transition-colors duration-150 dark:text-[#d4dae5] ${
                    rowIndex % 2 === 0
                      ? "bg-white hover:bg-[#dbeafe] dark:bg-[#111827] dark:hover:bg-[#1d3a66]"
                      : "bg-[#edf2f7] hover:bg-[#dbeafe] dark:bg-[#162033] dark:hover:bg-[#1d3a66]"
                  }`}
                >
                  <td className="px-4 py-3"><SelectionCheckbox label={`Pilih data ${row.date} ${row.line} ${row.type}`} checked={selectedIds.has(row.id)} onChange={(checked) => setSelectedIds((current) => { const next = new Set(current); if (checked) next.add(row.id); else next.delete(row.id); return next; })} /></td>
                  {columns.map((column) => {
                    const key = column.key as keyof AsakaiStockValueUpdate;
                    const isEditing = editableKeys.has(key);
                    return (
                      <td key={column.key} className="whitespace-nowrap px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editingValues[row.id]?.[key] ?? toEditValues(row)[key]}
                            onChange={(event) => setEditingValues((current) => ({
                              ...current,
                              [row.id]: {
                                ...(current[row.id] ?? toEditValues(row)),
                                [key]: event.target.value,
                              },
                            }))}
                            className={`h-9 ${inputClassName(key)} rounded-lg border border-[#d0d5dd] bg-white px-2 text-sm text-[#344054] outline-none focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff] dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]`}
                            inputMode={key === "moduleCode" ? "text" : "decimal"}
                          />
                        ) : formatValue(row[column.key] as string | number | null)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isImportModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="stock-import-title">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#111827]">
            <h2 id="stock-import-title" className="text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">Import Data Stock</h2>
            <p className="mt-2 text-sm text-[#667085] dark:text-[#a7b0c0]">Hanya data dalam rentang {formatDateRange(rangeStart, rangeEnd)} yang akan diimport.</p>
            <label className="mt-5 block text-sm font-medium text-[#344054] dark:text-[#d4dae5]">
              File Excel
              <input
                type="file"
                accept=".xlsx,.xls,.xlsb"
                onChange={(event) => setSelectedFile(event.currentTarget.files?.[0] ?? null)}
                className="mt-1 block h-11 w-full cursor-pointer rounded-lg border border-[#e4e7ec] bg-white text-sm text-[#667085] outline-none file:h-full file:border-0 file:border-r file:border-[#e4e7ec] file:bg-[#f9fafb] file:px-4 file:text-sm file:font-semibold file:text-[#344054] focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff] dark:border-[#384860] dark:bg-[#162033] dark:text-[#a7b0c0]"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedFile(null);
                }}
                className="h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054] dark:border-[#384860] dark:text-[#d4dae5]"
              >
                Batal
              </button>
              <button type="button" disabled={isImporting} onClick={() => void importFile()} className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white disabled:opacity-60">
                {isImporting ? "Mengimport..." : "Import"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {importConflicts ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="stock-conflict-title">
          <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-[#111827]">
            <h2 id="stock-conflict-title" className="text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">Data stock berubah</h2>
            <p className="mt-2 text-sm text-[#667085] dark:text-[#a7b0c0]">Data existing akan di-update dengan data terbaru dari file Excel.</p>
            <div className="mt-5 rounded-xl border border-[#fedf89] bg-[#fffaeb] p-4 dark:border-[#7a5d16] dark:bg-[#342400]">
              <p className="text-sm font-semibold text-[#93370d] dark:text-[#fdb022]">Data yang bentrok</p>
              <div className="mt-3 max-h-44 overflow-y-auto rounded-lg bg-white dark:bg-[#111827]">
                {importConflicts.map((conflict, index) => (
                  <div key={`${conflict.date}-${conflict.line}-${conflict.type}-${index}`} className="grid grid-cols-3 gap-2 border-b border-[#fef0c7] px-3 py-2 text-sm last:border-b-0 dark:border-[#7a5d16]">
                    <span className="font-medium text-[#101828] dark:text-[#f8fafc]">{conflict.date}</span>
                    <span className="text-[#667085] dark:text-[#a7b0c0]">{conflict.line}</span>
                    <span className="text-[#667085] dark:text-[#a7b0c0]">{conflict.type}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={isImporting} onClick={() => setImportConflicts(null)} className="h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054] dark:border-[#384860] dark:text-[#d4dae5]">Batal</button>
              <button type="button" disabled={isImporting} onClick={() => void importFile(true)} className="h-10 rounded-lg bg-[#b54708] px-4 text-sm font-semibold text-white disabled:opacity-60">{isImporting ? "Memperbarui..." : "Update data"}</button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-stock-title">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#111827]">
            <h2 id="delete-stock-title" className="text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">Hapus data stock?</h2>
            <p className="mt-2 text-sm text-[#667085] dark:text-[#a7b0c0]">{deleteTarget.length} data stock terpilih akan dihapus permanen.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={isDeleting} onClick={() => setDeleteTarget(null)} className="h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054] dark:border-[#384860] dark:text-[#d4dae5]">Batal</button>
              <button type="button" disabled={isDeleting} onClick={() => void deleteRows()} className="h-10 rounded-lg bg-[#d92d20] px-4 text-sm font-semibold text-white hover:bg-[#b42318] disabled:opacity-60">{isDeleting ? "Menghapus..." : "Hapus"}</button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? <div className={`fixed bottom-5 right-5 z-[60] rounded-xl border bg-white px-4 py-3 text-sm font-medium shadow-lg ${toast.type === "success" ? "border-[#abefc6] text-[#027a48]" : "border-[#fecdca] text-[#b42318]"}`} role="status">{toast.message}</div> : null}
    </div>
  );
}
