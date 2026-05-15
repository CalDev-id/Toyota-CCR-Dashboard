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

const defaultPart: PlanningPartKey = "cylblock";
function getCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const currentMonth = getCurrentMonth();
const fallbackParts: PlanningPartSummary[] = [
  {
    key: "cylblock",
    label: "Cylblock",
    tableName: "t_plan_daily_production_cylblock",
    count: 0,
  },
  {
    key: "cylhead",
    label: "Cylhead",
    tableName: "t_plan_daily_production_cylhead",
    count: 0,
  },
  {
    key: "camshaft",
    label: "Camshaft",
    tableName: "t_plan_daily_production_camshaft",
    count: 0,
  },
  {
    key: "crankshaft",
    label: "Crankshaft",
    tableName: "t_plan_daily_production_crankshaft",
    count: 0,
  },
];

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
  const [modalPart, setModalPart] = useState<PlanningPartKey>(defaultPart);
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
  const selectableParts = parts.length > 0 ? parts : fallbackParts;

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

  async function loadPlanning(part: PlanningPartKey) {
    setIsLoading(true);
    setError(null);

    try {
      const body = await readResponse(await fetch(buildPlanningUrl(part)));
      const data = body.data as PlanningResponse;
      setParts(data.parts);
      setColumns(data.columns);
      setRows(data.rows);
      setFilterOptions(data.filterOptions);
      setEditing(makeEditing(data.rows, data.columns));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load planning data",
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
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load planning data",
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
    setModalPart(activePart);
    setIsImportModalOpen(true);
  }

  function selectPart(part: PlanningPartKey) {
    if (part === activePart) {
      return;
    }

    setIsLoading(true);
    setActivePart(part);
    setFilterShift("all");
    setFilterGroup("all");
  }

  async function saveDraftRow(id: string) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await readResponse(
        await fetch(`/api/planning/${activePart}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing[id] ?? {}),
        }),
      );
      setMessage("Planning row created.");
      setDraftRows((current) => current.filter((row) => row.id !== id));
      await loadPlanning(activePart);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create planning data",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateRow(id: string) {
    setError(null);
    setMessage(null);

    try {
      await readResponse(
        await fetch(`/api/planning/${activePart}/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing[id] ?? {}),
        }),
      );
      setMessage("Planning row updated.");
      await loadPlanning(activePart);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update planning data",
      );
    }
  }

  async function deleteRow(id: string) {
    setError(null);
    setMessage(null);

    try {
      await readResponse(
        await fetch(`/api/planning/${activePart}/${encodeURIComponent(id)}`, {
          method: "DELETE",
        }),
      );
      setMessage("Planning row deleted.");
      await loadPlanning(activePart);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete planning data",
      );
    }
  }

  async function uploadExcel(part: PlanningPartKey, overwrite = false) {
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setError("Choose an Excel file first.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("overwrite", String(overwrite));

      const response = await fetch(`/api/planning/${part}/import`, {
        method: "POST",
        body: formData,
      });

      const body = await readResponse(response);
      setMessage(`Imported ${body.data.inserted} rows.`);
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
        setError(
          importError instanceof Error
            ? importError.message
            : "Unable to import planning data",
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
      {error ? (
        <section className="mb-6 rounded-2xl border border-[#fecdca] bg-[#fef3f2] p-5 text-sm text-[#b42318]">
          <h2 className="font-semibold text-[#912018]">Planning request failed</h2>
          <p className="mt-1 break-words text-xs text-[#d92d20]">{error}</p>
        </section>
      ) : null}

      {message ? (
        <section className="mb-6 rounded-2xl border border-[#abefc6] bg-[#ecfdf3] p-5 text-sm font-medium text-[#027a48]">
          {message}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {parts.length === 0
          ? ["Cylblock", "Cylhead", "Camshaft", "Crankshaft"].map((label) => (
              <article
                key={label}
                className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-[#667085]">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-[#101828]">-</p>
              </article>
            ))
          : parts.map((part) => (
              <button
                key={part.key}
                className={`rounded-2xl border p-5 text-left shadow-sm transition ${
                  activePart === part.key
                    ? "border-[#465fff] bg-[#ecf3ff]"
                    : "border-[#e4e7ec] bg-white hover:bg-[#f9fafb]"
                }`}
                type="button"
                onClick={() => selectPart(part.key)}
              >
                <p className="text-sm font-medium text-[#667085]">{part.label}</p>
                <p className="mt-3 text-3xl font-semibold text-[#101828]">
                  {part.count.toLocaleString()}
                </p>
                <p className="mt-1 truncate text-xs text-[#667085]">{part.tableName}</p>
              </button>
            ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#e4e7ec] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#101828]">Planning Detail</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Showing up to 200 rows from the selected table
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {parts.map((part) => (
              <button
                key={part.key}
                className={`h-10 rounded-lg px-3 text-sm font-medium transition ${
                  activePart === part.key
                    ? "bg-[#465fff] text-white"
                    : "border border-[#e4e7ec] text-[#344054] hover:bg-[#f9fafb]"
                }`}
                type="button"
                onClick={() => selectPart(part.key)}
              >
                {part.label}
              </button>
            ))}
          </div>
        </div>

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
                  Choose the part table and upload one Excel file.
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {selectableParts.map((part) => (
                <button
                  key={part.key}
                  className={`rounded-xl border p-4 text-left transition ${
                    modalPart === part.key
                      ? "border-[#465fff] bg-[#ecf3ff]"
                      : "border-[#e4e7ec] hover:bg-[#f9fafb]"
                  }`}
                  type="button"
                  onClick={() => setModalPart(part.key)}
                >
                  <p className="text-sm font-semibold text-[#101828]">
                    {part.label}
                  </p>
                  <p className="mt-1 text-xs text-[#667085]">{part.tableName}</p>
                </button>
              ))}
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
                onClick={() => void uploadExcel(modalPart, false)}
              >
                {isImporting ? "Importing..." : "Import"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </DefaultLayout>
  );
}
