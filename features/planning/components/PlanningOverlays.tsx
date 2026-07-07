import type { PlanningPartKey } from "@/features/planning/types";
import { getPartLabel, importLineOptions } from "@/features/planning/planning-ui";

type Toast = {
  message: string;
  type: "success" | "error";
};

type ImportConflict = {
  part: PlanningPartKey;
  conflicts: Array<{ date: string; shift: string; group: string }>;
};

type PlanningOverlaysProps = {
  isImportModalOpen: boolean;
  setIsImportModalOpen: (value: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importPart: PlanningPartKey | "";
  setImportPart: React.Dispatch<React.SetStateAction<PlanningPartKey | "">>;
  isImporting: boolean;
  showToast: (message: string, type: Toast["type"]) => void;
  uploadExcel: (part: PlanningPartKey, overwrite?: boolean) => void;
  deleteTarget: { id: string; part: PlanningPartKey } | null;
  setDeleteTarget: React.Dispatch<React.SetStateAction<{ id: string; part: PlanningPartKey } | null>>;
  confirmDeleteRow: () => void;
  importConflict: ImportConflict | null;
  setImportConflict: React.Dispatch<React.SetStateAction<ImportConflict | null>>;
  toast: Toast | null;
};

export default function PlanningOverlays({
  isImportModalOpen,
  setIsImportModalOpen,
  fileInputRef,
  importPart,
  setImportPart,
  isImporting,
  showToast,
  uploadExcel,
  deleteTarget,
  setDeleteTarget,
  confirmDeleteRow,
  importConflict,
  setImportConflict,
  toast,
}: PlanningOverlaysProps) {
  return (
    <>
      {isImportModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/40 px-4 py-6">
          <section className="max-h-[calc(100vh-48px)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#101828]">
                  Import plan daily production
                </h2>
                <p className="mt-1 text-sm text-[#667085]">
                  Upload Excel berdasarkan line yang dipilih.
                </p>
              </div>
              <button
                className="grid size-9 place-items-center rounded-lg border border-[#e4e7ec] text-[#667085] transition hover:bg-[#f9fafb]"
                type="button"
                aria-label="Close import modal"
                onClick={() => setIsImportModalOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </div>
      
            <div className="mt-5 rounded-xl border border-[#d6e4ff] bg-[#f5f8ff] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-[#101828]">Format import</p>
                <a
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[#b2ccff] bg-white px-3 text-sm font-semibold text-[#344054] transition hover:bg-[#eff4ff]"
                  href="/template_import_plan.xlsx"
                  download
                >
                  Download format
                </a>
              </div>
              <ul className="mt-4 grid gap-2 text-sm text-[#344054] sm:grid-cols-2">
                {[
                  "Format tanggal YYYY-MM-DD",
                  "Shift hanya 1/2",
                  "Group hanya R/W",
                  "1TR dan 2TR wajib angka",
                  "OT boleh decimal",
                  "Jika data sudah ada maka akan update",
                ].map((rule) => (
                  <li key={rule} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-xs font-semibold text-[#039855]">
                      ✓
                    </span>
                    <span className="leading-5">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
      
            <label className="mt-4 block text-sm font-medium text-[#344054]">
              File Excel
              <input
                ref={fileInputRef}
                className="mt-1 block h-11 w-full cursor-pointer rounded-lg border border-[#e4e7ec] bg-white text-sm text-[#667085] outline-none file:h-full file:border-0 file:border-r file:border-[#e4e7ec] file:bg-[#f9fafb] file:px-4 file:text-sm file:font-semibold file:text-[#344054] hover:file:bg-[#f2f4f7] focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                type="file"
                accept=".xlsx,.xls"
              />
            </label>
      
            <label className="mt-4 block text-sm font-medium text-[#344054]">
              Line
              <span className="relative mt-1 block">
                <select
                  className="h-11 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white pl-3 pr-10 text-sm text-[#344054] outline-none focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                  value={importPart}
                  onChange={(event) =>
                    setImportPart(event.target.value as PlanningPartKey | "")
                  }
                >
                  <option value="">Pilih</option>
                  {importLineOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
            </label>
      
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-[#e4e7ec] px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
                type="button"
                onClick={() => setIsImportModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white transition hover:bg-[#3648d9] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isImporting}
                type="button"
                onClick={() => {
                  if (!importPart) {
                    showToast("Pilih line terlebih dahulu.", "error");
                    return;
                  }
      
                  void uploadExcel(importPart, false);
                }}
              >
                {isImporting ? "Importing..." : "Import"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/40 px-4">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#fef3f2] text-[#d92d20]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                  <path
                    d="M12 8v5M12 16.5h.01M10.3 4.9 3.7 16.6A2.2 2.2 0 0 0 5.6 20h12.8a2.2 2.2 0 0 0 1.9-3.4L13.7 4.9a2 2 0 0 0-3.4 0Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[#101828]">
                  Hapus data {getPartLabel(deleteTarget.part)}?
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#667085]">
                  Data yang sudah dihapus tidak bisa dikembalikan. Pastikan data
                  ini memang sudah tidak dibutuhkan.
                </p>
              </div>
            </div>
      
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-[#e4e7ec] px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-lg bg-[#d92d20] px-4 text-sm font-semibold text-white transition hover:bg-[#b42318]"
                type="button"
                onClick={() => void confirmDeleteRow()}
              >
                Hapus
              </button>
            </div>
          </section>
        </div>
      ) : null}
      
      {importConflict ? (
        <div className="fixed inset-0 z-[55] grid place-items-center bg-[#101828]/40 px-4">
          <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#fffaeb] text-[#b54708]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                  <path
                    d="M12 8v5M12 16.5h.01M10.3 4.9 3.7 16.6A2.2 2.2 0 0 0 5.6 20h12.8a2.2 2.2 0 0 0 1.9-3.4L13.7 4.9a2 2 0 0 0-3.4 0Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[#101828]">
                  Data {getPartLabel(importConflict.part)} sudah ada
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#667085]">
                  Beberapa kombinasi tanggal, shift, dan group sudah tersimpan.
                  Jika dilanjutkan, data lama akan diupdate memakai file terbaru.
                </p>
              </div>
            </div>
      
            <div className="mt-5 rounded-xl border border-[#fedf89] bg-[#fffaeb] p-4">
              <p className="text-sm font-semibold text-[#93370d]">
                Data yang bentrok
              </p>
              <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-white">
                {importConflict.conflicts.slice(0, 8).map((conflict) => (
                  <div
                    key={`${conflict.date}-${conflict.shift}-${conflict.group}`}
                    className="grid grid-cols-3 gap-2 border-b border-[#fef0c7] px-3 py-2 text-sm last:border-b-0"
                  >
                    <span className="font-medium text-[#101828]">
                      {conflict.date}
                    </span>
                    <span className="text-[#667085]">Shift {conflict.shift}</span>
                    <span className="text-[#667085]">Group {conflict.group}</span>
                  </div>
                ))}
              </div>
              {importConflict.conflicts.length > 8 ? (
                <p className="mt-2 text-xs font-medium text-[#b54708]">
                  +{importConflict.conflicts.length - 8} data lainnya
                </p>
              ) : null}
            </div>
      
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-[#e4e7ec] px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
                type="button"
                onClick={() => setImportConflict(null)}
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-lg bg-[#b54708] px-4 text-sm font-semibold text-white transition hover:bg-[#93370d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isImporting}
                type="button"
                onClick={() => {
                  const part = importConflict.part;
                  setImportConflict(null);
                  void uploadExcel(part, true);
                }}
              >
                {isImporting ? "Updating..." : "Update data lama"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      
      {toast ? (
        <div className="fixed bottom-5 right-5 z-[60] w-[min(360px,calc(100vw-40px))]">
          <section
            className={`rounded-xl border bg-white p-4 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-[#abefc6] text-[#027a48]"
                : "border-[#fecdca] text-[#b42318]"
            }`}
            role="status"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  toast.type === "success"
                    ? "bg-[#ecfdf3] text-[#039855]"
                    : "bg-[#fef3f2] text-[#d92d20]"
                }`}
              >
                {toast.type === "success" ? "✓" : "!"}
              </span>
              <p className="min-w-0 break-words font-medium">{toast.message}</p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
