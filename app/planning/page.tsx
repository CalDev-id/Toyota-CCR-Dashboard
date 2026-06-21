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

type ImportConflict = {
  part: PlanningPartKey;
  conflicts: Array<{ date: string; shift: string; group: string }>;
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
const partLabels: Record<PlanningPartKey, string> = {
  cylblock: "Cylblock",
  cylhead: "Cylhead",
  camshaft: "Camshaft",
  crankshaft: "Crankshaft",
};

const importLineOptions: Array<{ key: PlanningPartKey; label: string }> = [
  { key: "cylblock", label: "Cylinder block" },
  { key: "cylhead", label: "Cylinder head" },
  { key: "camshaft", label: "Camshaft" },
  { key: "crankshaft", label: "Crankshaft" },
];
const shiftOptions = ["1", "2"];
const groupOptions = ["R", "W"];

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

function isShiftColumn(column: PlanningColumn) {
  return column.field.toLowerCase() === "shift" || column.field.toLowerCase() === "fshift";
}

function isGroupColumn(column: PlanningColumn) {
  return column.field.toLowerCase() === "group" || column.field.toLowerCase() === "fgroup";
}

function getPartLabel(part: PlanningPartKey) {
  return partLabels[part];
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
  const [draftRows, setDraftRows] = useState<Array<{ id: string }>>([]);
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPart, setImportPart] = useState<PlanningPartKey | "">("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    part: PlanningPartKey;
  } | null>(null);
  const [importConflict, setImportConflict] = useState<ImportConflict | null>(null);
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
      showToast(`Data ${getPartLabel(activePart)} berhasil diinput.`, "success");
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
      showToast(`Data ${getPartLabel(activePart)} berhasil diupdate.`, "success");
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

  async function confirmDeleteRow() {
    if (!deleteTarget) {
      return;
    }

    const { id, part } = deleteTarget;
    const partLabel = getPartLabel(part);

    try {
      await readResponse(
        await fetch(`/api/planning/${part}/${encodeURIComponent(id)}`, {
          method: "DELETE",
        }),
      );
      showToast(`Data ${partLabel} berhasil dihapus.`, "success");
      setDeleteTarget(null);
      if (part === activePart) {
        await loadPlanning(activePart);
      }
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

    if (!part) {
      showToast("Pilih line terlebih dahulu.", "error");
      return;
    }

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
      showToast(
        `Data ${getPartLabel(part)} berhasil diimport (${body.data.inserted} rows).`,
        "success",
      );
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
        setImportConflict({ part, conflicts: apiError.conflicts });
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
          ? [
              { key: "cylblock" as const, label: "Cylblock" },
              { key: "cylhead" as const, label: "Cylhead" },
              { key: "camshaft" as const, label: "Camshaft" },
              { key: "crankshaft" as const, label: "Crankshaft" },
            ].map((part) => (
              <article
                key={part.key}
                className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-[#f2f4f7] text-sm font-semibold text-[#344054]">
                    {partIcons[part.key]}
                  </div>
                  <p className="text-sm font-semibold text-[#101828]">
                    {part.label}
                  </p>
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
          : parts.map((part) => {
              const partTotal = part.oneTrTotal + part.twoTrTotal;
              const oneTrPercentage =
                partTotal > 0 ? Math.round((part.oneTrTotal / partTotal) * 100) : 0;
              const twoTrPercentage =
                partTotal > 0 ? Math.round((part.twoTrTotal / partTotal) * 100) : 0;

              return (
                <article
                  key={part.key}
                  className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f2f4f7] text-sm font-semibold text-[#344054]">
                      {partIcons[part.key]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#101828]">
                        {part.label}
                      </p>
                      <p className="mt-0.5 text-xs text-[#667085]">
                        Monthly planning
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl bg-[#f9fafb] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                      Total Plan
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-[#101828]">
                      {partTotal.toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#f9fafb] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                          1TR
                        </p>
                        <span className="text-xs font-semibold text-[#039855]">
                          {oneTrPercentage}%
                        </span>
                      </div>
                      <p className="mt-1 text-xl font-semibold text-[#101828]">
                        {part.oneTrTotal.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f9fafb] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                          2TR
                        </p>
                        <span className="text-xs font-semibold text-[#465fff]">
                          {twoTrPercentage}%
                        </span>
                      </div>
                      <p className="mt-1 text-xl font-semibold text-[#101828]">
                        {part.twoTrTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
      </section>

      <section className="mt-6 rounded-t-2xl border border-b-0 border-[#e4e7ec] bg-white px-5 pt-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#101828]">
              {activePartSummary?.label ?? "Planning"} Detail
            </h2>
            <p className="mt-1 text-sm text-[#667085]">
              Monthly planning filtered by period, shift, and group
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[160px_96px_96px]">
            <label className="block">
              <span className="sr-only">Month</span>
              <input
                className="h-10 w-full rounded-lg border border-[#e4e7ec] px-3 text-sm font-medium text-[#344054] outline-none focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
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

            <label className="block">
              <span className="sr-only">Shift</span>
              <span className="relative block">
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
                  {shiftOptions.map((shift) => (
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

            <label className="block">
              <span className="sr-only">Group</span>
              <span className="relative block">
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
                  {groupOptions.map((group) => (
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
        </div>

      <div className="mt-5 border-b-2 border-[#84adff]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex gap-3 overflow-x-auto">
            {parts.map((part) => (
              <button
                key={part.key}
                className={`min-w-[132px] rounded-t-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  activePart === part.key
                    ? "border-[#465fff] bg-[#465fff] text-white shadow-sm"
                    : "border-[#d0d5dd] bg-[#f2f4f7] text-[#667085] shadow-sm hover:bg-[#eaecf0] hover:text-[#344054]"
                }`}
                type="button"
                onClick={() => selectPart(part.key)}
              >
                {part.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 pb-2 sm:flex-row lg:justify-end">
            <button
              className="h-9 rounded-lg border border-[#e4e7ec] bg-white px-4 text-sm font-semibold text-[#344054] shadow-sm transition hover:bg-[#f9fafb]"
              type="button"
              onClick={openImportModal}
            >
              Import Excel
            </button>
            <button
              className="h-9 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3648d9]"
              type="button"
              onClick={() => addDraftRow()}
            >
              Add Row
            </button>
          </div>
        </div>
      </div>
      </section>

      <section className="overflow-hidden rounded-b-2xl border border-t-0 border-[#e4e7ec] bg-white shadow-sm">
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
                          ) : (isDraft || isUpdateField(column)) &&
                            (isShiftColumn(column) || isGroupColumn(column)) ? (
                            <span className="relative block w-40">
                              <select
                                value={editing[rowId]?.[column.field] ?? ""}
                                onChange={(event) =>
                                  setEditingValue(
                                    rowId,
                                    column.field,
                                    event.target.value,
                                  )
                                }
                                className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white pl-3 pr-9 text-sm text-[#344054] outline-none focus:border-[#465fff]"
                              >
                                <option value="">Pilih</option>
                                {(isShiftColumn(column)
                                  ? shiftOptions
                                  : groupOptions
                                ).map((option) => (
                                  <option key={option} value={option}>
                                    {option}
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

                              setDeleteTarget({ id: rowId, part: activePart });
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
    </DefaultLayout>
  );
}
