"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import type {
  PlanningColumn,
  PlanningPartKey,
  PlanningPartSummary,
  PlanningRow,
} from "@/lib/planning-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlanningResponse = {
  parts: PlanningPartSummary[];
  activePart: PlanningPartKey;
  activeLabel: string;
  filters: {
    month: string;
    shift: string;
    group: string;
  };
  filterOptions: {
    shifts: string[];
    groups: string[];
  };
  columns: PlanningColumn[];
  rows: PlanningRow[];
};

type ApiError = Error & {
  status?: number;
  conflicts?: Array<{ date: string; shift: string; group: string }>;
};

type Toast = {
  message: string;
  type: "success" | "error";
};

const defaultPart: PlanningPartKey = "cylblock";
function getCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const currentMonth = getCurrentMonth();
const partIcons: Record<PlanningPartKey, string> = {
  cylblock: "CB",
  cylhead: "CH",
  camshaft: "CA",
  crankshaft: "CR",
};

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body.error ?? "Request failed") as ApiError;
    error.status = response.status;
    error.conflicts = body.conflicts;
    throw error;
  }

  return body;
}

function formatInputValue(value: unknown, column: PlanningColumn) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (column.inputType === "date") {
    return text.slice(0, 10);
  }

  if (column.inputType === "datetime-local") {
    return text.slice(0, 16);
  }

  return text;
}

function isCreateField(column: PlanningColumn) {
  return !column.isAutoIncrement;
}

function isUpdateField(column: PlanningColumn) {
  return !column.isAutoIncrement && !column.isPrimary;
}

function isVisibleColumn(column: PlanningColumn) {
  const field = column.field.toLowerCase();
  return field !== "fid" && field !== "fdatetime_modified";
}

function formatColumnLabel(field: string) {
  return /^f/i.test(field) ? field.slice(1) : field;
}

function makeEmptyForm(columns: PlanningColumn[]) {
  return Object.fromEntries(
    columns.filter(isCreateField).map((column) => [column.field, ""]),
  ) as Record<string, string>;
}

function makeEditing(rows: PlanningRow[], columns: PlanningColumn[]) {
  return Object.fromEntries(
    rows.map((row) => [
      String(row[columns.find((column) => column.isPrimary)?.field ?? ""]),
      Object.fromEntries(
        columns
          .filter(isUpdateField)
          .map((column) => [column.field, formatInputValue(row[column.field], column)]),
      ),
    ]),
  ) as Record<string, Record<string, string>>;
}

export default function PlanningPage() {
  const [activePart, setActivePart] = useState<PlanningPartKey>(defaultPart);
  const [parts, setParts] = useState<PlanningPartSummary[]>([]);
  const [columns, setColumns] = useState<PlanningColumn[]>([]);
  const [rows, setRows] = useState<PlanningRow[]>([]);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterShift, setFilterShift] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterOptions, setFilterOptions] = useState<{
    shifts: string[];
    groups: string[];
  }>({ shifts: [], groups: [] });
  const [draftRows, setDraftRows] = useState<Array<{ id: string }>>([]);
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manuallyLoadedPartRef = useRef<PlanningPartKey | null>(null);

  const primaryColumn = useMemo(
    () => columns.find((column) => column.isPrimary),
    [columns],
  );
  const updateColumns = useMemo(() => columns.filter(isUpdateField), [columns]);
  const visibleColumns = useMemo(
    () => columns.filter(isVisibleColumn),
    [columns],
  );
  const activePartSummary = useMemo(
    () => parts.find((part) => part.key === activePart),
    [activePart, parts],
  );

  const buildPlanningUrl = useCallback(
    (part: PlanningPartKey) => {
      const params = new URLSearchParams({
        part,
        month: filterMonth,
        shift: filterShift,
        group: filterGroup,
      });

      return `/api/planning?${params.toString()}`;
    },
    [filterGroup, filterMonth, filterShift],
  );

  function showToast(message: string, type: Toast["type"]) {
    setToast({ message, type });
  }

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function loadPlanning(part: PlanningPartKey) {
    setIsLoading(true);

    try {
      const body = await readResponse(await fetch(buildPlanningUrl(part)));
      const data = body.data as PlanningResponse;
      setParts(data.parts);
      setColumns(data.columns);
      setRows(data.rows);
      setFilterOptions(data.filterOptions);
      setEditing(makeEditing(data.rows, data.columns));
    } catch (loadError) {
      showToast(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load planning data",
        "error",
      );
      setRows([]);
      setColumns([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (manuallyLoadedPartRef.current === activePart) {
      manuallyLoadedPartRef.current = null;
      return;
    }

    let isActive = true;

    fetch(buildPlanningUrl(activePart))
      .then(readResponse)
      .then((body) => {
        if (!isActive) {
          return;
        }

        const data = body.data as PlanningResponse;
        setParts(data.parts);
        setColumns(data.columns);
        setRows(data.rows);
        setFilterOptions(data.filterOptions);
        setEditing(makeEditing(data.rows, data.columns));
        setToast(null);
      })
      .catch((loadError: unknown) => {
        if (!isActive) {
          return;
        }

        showToast(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load planning data",
          "error",
        );
        setRows([]);
        setColumns([]);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activePart, buildPlanningUrl]);

  function addDraftRow(sourceColumns = columns) {
    const id = `draft-${Date.now()}`;
    setDraftRows((current) => [{ id }, ...current]);
    setEditing((current) => ({
      ...current,
      [id]: makeEmptyForm(sourceColumns),
    }));
  }

  function openImportModal() {
    setIsImportModalOpen(true);
  }

  function selectPart(part: PlanningPartKey) {
    if (part === activePart) {
      return;
    }

    setDraftRows([]);
    setIsLoading(true);
    setActivePart(part);
    setFilterShift("all");
    setFilterGroup("all");
  }

  async function saveDraftRow(id: string) {
    setIsSaving(true);

    try {
      await readResponse(
        await fetch(`/api/planning/${activePart}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing[id] ?? {}),
        }),
      );
      showToast("Planning row created.", "success");
      setDraftRows((current) => current.filter((row) => row.id !== id));
      await loadPlanning(activePart);
    } catch (createError) {
      showToast(
        createError instanceof Error
          ? createError.message
          : "Unable to create planning data",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateRow(id: string) {
    try {
      await readResponse(
        await fetch(`/api/planning/${activePart}/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing[id] ?? {}),
        }),
      );
      showToast("Planning row updated.", "success");
      await loadPlanning(activePart);
    } catch (updateError) {
      showToast(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update planning data",
        "error",
      );
    }
  }

  async function deleteRow(id: string) {
    try {
      await readResponse(
        await fetch(`/api/planning/${activePart}/${encodeURIComponent(id)}`, {
          method: "DELETE",
        }),
      );
      showToast("Planning row deleted.", "success");
      await loadPlanning(activePart);
    } catch (deleteError) {
      showToast(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete planning data",
        "error",
      );
    }
  }

  async function uploadExcel(part: PlanningPartKey, overwrite = false) {
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      showToast("Choose an Excel file first.", "error");
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("overwrite", String(overwrite));

      const response = await fetch(`/api/planning/${part}/import`, {
        method: "POST",
        body: formData,
      });

      const body = await readResponse(response);
      showToast(`Imported ${body.data.inserted} rows.`, "success");
      setIsImportModalOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (part === activePart) {
        await loadPlanning(activePart);
      } else {
        setIsLoading(true);
        setActivePart(part);
      }
    } catch (importError) {
      const apiError = importError as ApiError;

      if (apiError.status === 409 && apiError.conflicts?.length) {
        const preview = apiError.conflicts
          .slice(0, 5)
          .map((conflict) => `${conflict.date} / ${conflict.shift} / ${conflict.group}`)
          .join("\n");
        const shouldOverwrite = window.confirm(
          `Data untuk date, shift, dan group berikut sudah ada:\n${preview}\n\nTimpa data lama dengan file terbaru?`,
        );

        if (shouldOverwrite) {
          await uploadExcel(part, true);
          return;
        }
      } else {
        showToast(
          importError instanceof Error
            ? importError.message
            : "Unable to import planning data",
          "error",
        );
      }
    } finally {
      setIsImporting(false);
    }
  }

  function setEditingValue(id: string, field: string, value: string) {
    setEditing((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }));
  }

  return (
    <DefaultLayout>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {parts.length === 0
          ? ["Cylblock", "Cylhead", "Camshaft", "Crankshaft"].map((label) => (
              <article
                key={label}
                className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-[#f2f4f7] text-sm font-semibold text-[#344054]">
                    {label.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold text-[#101828]">{label}</p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f9fafb] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                      1TR
                    </p>
                    <p className="mt-1 text-xl font-semibold text-[#101828]">-</p>
                  </div>
                  <div className="rounded-xl bg-[#f9fafb] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                      2TR
                    </p>
                    <p className="mt-1 text-xl font-semibold text-[#101828]">-</p>
                  </div>
                </div>
              </article>
            ))
          : parts.map((part) => (
              <button
                key={part.key}
                className={`rounded-2xl border p-5 text-left shadow-sm transition ${
                  activePart === part.key
                    ? "border-[#465fff] bg-[#f5f8ff] ring-4 ring-[#ecf3ff]"
                    : "border-[#e4e7ec] bg-white hover:bg-[#f9fafb]"
                }`}
                type="button"
                onClick={() => selectPart(part.key)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`grid size-11 place-items-center rounded-xl text-sm font-semibold ${
                      activePart === part.key
                        ? "bg-[#465fff] text-white"
                        : "bg-[#f2f4f7] text-[#344054]"
                    }`}
                  >
                    {partIcons[part.key]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#101828]">
                      {part.label}
                    </p>
                    <p className="mt-0.5 text-xs text-[#667085]">
                      Monthly planning
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3 shadow-[inset_0_0_0_1px_#e4e7ec]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                      1TR
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[#101828]">
                      {part.oneTrTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-[inset_0_0_0_1px_#e4e7ec]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                      2TR
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[#101828]">
                      {part.twoTrTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
      </section>

      <div className="mt-6 border-b-2 border-[#465fff]">
        <div className="flex gap-3 overflow-x-auto">
          {parts.map((part) => (
            <button
              key={part.key}
              className={`min-w-[132px] rounded-t-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                activePart === part.key
                  ? "border-[#465fff] bg-[#465fff] text-white shadow-sm"
                  : "border-[#e4e7ec] bg-[#f9fafb] text-[#98a2b3] hover:bg-[#f2f4f7] hover:text-[#667085]"
              }`}
              type="button"
              onClick={() => selectPart(part.key)}
            >
              {part.label}
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-b-2xl border border-t-0 border-[#e4e7ec] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#e4e7ec] px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="block w-full text-xs font-semibold uppercase tracking-wide text-[#667085] sm:w-40">
              Month
              <input
                className="mt-1 h-10 w-full rounded-lg border border-[#e4e7ec] px-3 text-sm font-medium normal-case tracking-normal text-[#344054] outline-none focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                type="month"
                value={filterMonth}
                onChange={(event) => {
                  setDraftRows([]);
                  setFilterMonth(event.target.value || currentMonth);
                  setFilterShift("all");
                  setFilterGroup("all");
                  setIsLoading(true);
                }}
              />
            </label>

            <label className="block w-full text-xs font-semibold uppercase tracking-wide text-[#667085] sm:w-28">
              Shift
              <span className="relative mt-1 block">
                <select
                  className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white pl-3 pr-10 text-sm font-medium normal-case tracking-normal text-[#344054] outline-none focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                  value={filterShift}
                  onChange={(event) => {
                    setDraftRows([]);
                    setFilterShift(event.target.value);
                    setIsLoading(true);
                  }}
                >
                  <option value="all">All</option>
                  {filterOptions.shifts.map((shift) => (
                    <option key={shift} value={shift}>
                      {shift}
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

            <label className="block w-full text-xs font-semibold uppercase tracking-wide text-[#667085] sm:w-28">
              Group
              <span className="relative mt-1 block">
                <select
                  className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white pl-3 pr-10 text-sm font-medium normal-case tracking-normal text-[#344054] outline-none focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                  value={filterGroup}
                  onChange={(event) => {
                    setDraftRows([]);
                    setFilterGroup(event.target.value);
                    setIsLoading(true);
                  }}
                >
                  <option value="all">All</option>
                  {filterOptions.groups.map((group) => (
                    <option key={group} value={group}>
                      {group}
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
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <button
              className="h-10 rounded-lg border border-[#e4e7ec] px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
              type="button"
              onClick={openImportModal}
            >
              Import Excel
            </button>
            <button
              className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white transition hover:bg-[#3648d9]"
              type="button"
              onClick={() => addDraftRow()}
            >
              Add Row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
              <tr>
                {visibleColumns.map((column) => (
                  <th key={column.field} className="px-5 py-3">
                    {formatColumnLabel(column.field)}
                  </th>
                ))}
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {isLoading ? (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-[#667085]"
                    colSpan={visibleColumns.length + 1}
                  >
                    Loading planning data...
                  </td>
                </tr>
              ) : rows.length === 0 && draftRows.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-[#667085]"
                    colSpan={visibleColumns.length + 1}
                  >
                    No planning data found.
                  </td>
                </tr>
              ) : (
                [
                  ...draftRows.map((draft) => ({ row: null, rowId: draft.id })),
                  ...rows.map((row, rowIndex) => ({
                    row,
                    rowId: primaryColumn
                      ? String(row[primaryColumn.field])
                      : String(rowIndex),
                  })),
                ].map(({ row, rowId }) => {
                  const isDraft = row === null;

                  return (
                    <tr
                      key={rowId}
                      className={`align-top ${isDraft ? "bg-[#fffcf5]" : ""}`}
                    >
                      {visibleColumns.map((column) => (
                        <td key={column.field} className="px-5 py-4">
                          {isDraft && column.isPrimary ? (
                            <span className="rounded-full bg-[#fef0c7] px-2.5 py-1 text-xs font-medium text-[#b54708]">
                              New
                            </span>
                          ) : isDraft || isUpdateField(column) ? (
                            <input
                              value={editing[rowId]?.[column.field] ?? ""}
                              onChange={(event) =>
                                setEditingValue(
                                  rowId,
                                  column.field,
                                  event.target.value,
                                )
                              }
                              className="h-10 w-40 rounded-lg border border-[#e4e7ec] px-3 text-sm text-[#344054] outline-none focus:border-[#465fff]"
                              type={column.inputType}
                            />
                          ) : (
                            <span className="block min-w-24 truncate font-medium text-[#101828]">
                              {formatInputValue(row?.[column.field], column)}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {isDraft ? (
                            <button
                              className="h-10 rounded-lg bg-[#465fff] px-3 text-sm font-semibold text-white transition hover:bg-[#3648d9] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={isSaving}
                              type="button"
                              onClick={() => void saveDraftRow(rowId)}
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              className="h-10 rounded-lg bg-[#465fff] px-3 text-sm font-semibold text-white transition hover:bg-[#3648d9] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={!primaryColumn || updateColumns.length === 0}
                              type="button"
                              onClick={() => void updateRow(rowId)}
                            >
                              Update
                            </button>
                          )}
                          <button
                            className="h-10 rounded-lg border border-[#fecdca] px-3 text-sm font-semibold text-[#d92d20] transition hover:bg-[#fef3f2] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!isDraft && !primaryColumn}
                            type="button"
                            onClick={() => {
                              if (isDraft) {
                                setDraftRows((current) =>
                                  current.filter((draft) => draft.id !== rowId),
                                );
                                return;
                              }

                              void deleteRow(rowId);
                            }}
                          >
                            {isDraft ? "Cancel" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isImportModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/40 px-4">
          <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#101828]">
                  Import Excel
                </h2>
                <p className="mt-1 text-sm text-[#667085]">
                  Upload file untuk {activePartSummary?.label ?? activePart}.
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

            <input
              ref={fileInputRef}
              className="mt-5 h-11 w-full rounded-lg border border-[#e4e7ec] px-3 py-2 text-sm text-[#344054] file:mr-3 file:rounded-md file:border-0 file:bg-[#f2f4f7] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#344054]"
              type="file"
              accept=".xlsx,.xls"
            />

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
                onClick={() => void uploadExcel(activePart, false)}
              >
                {isImporting ? "Importing..." : "Import"}
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
    </DefaultLayout>
  );
}
