"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import {
  createPlanningRowAction,
  deletePlanningRowAction,
  updatePlanningRowAction,
} from "@/features/planning/server/planning-mutation";
import { importPlanningRowsAction } from "@/features/planning/server/planning-import";
import PlanningSummaryCards from "@/features/planning/components/PlanningSummaryCards";
import PlanningTable from "@/features/planning/components/PlanningTable";
import PlanningToolbar from "@/features/planning/components/PlanningToolbar";
import PlanningOverlays from "@/features/planning/components/PlanningOverlays";
import type {
  PlanningColumn,
  PlanningPartKey,
  PlanningPartSummary,
  PlanningRow,
} from "@/features/planning/types";
import {
  defaultPart,
  getCurrentMonth,
  getPartLabel,
  isGroupColumn,
  isUpdateField,
  isVisibleColumn,
  makeEditing,
  makeEmptyForm,
  sortVisibleColumns,
} from "@/features/planning/planning-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

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

const currentMonth = getCurrentMonth();

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

function hasEditingChanges(
  current: Record<string, string> | undefined,
  initial: Record<string, string> | undefined,
  columns: PlanningColumn[],
) {
  if (!current || !initial) {
    return false;
  }

  return columns.some((column) => (current[column.field] ?? "") !== (initial[column.field] ?? ""));
}

export default function PlanningPage() {
  const { data: session } = useSession();
  const canManagePlanning = session?.user?.role === "ADMIN";
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
  const initialEditing = useMemo(() => makeEditing(rows, columns), [columns, rows]);
  const changedRowIds = useMemo(() => {
    const draftIds = new Set(draftRows.map((row) => row.id));

    if (updateColumns.length === 0) {
      return [];
    }

    return rows
      .map((row, rowIndex) =>
        primaryColumn ? String(row[primaryColumn.field]) : String(rowIndex),
      )
      .filter((id) => !draftIds.has(id))
      .filter((id) => hasEditingChanges(editing[id], initialEditing[id], updateColumns));
  }, [draftRows, editing, initialEditing, primaryColumn, rows, updateColumns]);
  const visibleColumns = useMemo(
    () =>
      sortVisibleColumns(
        columns.filter(
          (column) =>
            isVisibleColumn(column) &&
            (activePart !== "assy" || !isGroupColumn(column)) &&
            (activePart !== "camshaft" || !["ratio", "fratio"].includes(column.field.toLowerCase())),
        ),
      ),
    [activePart, columns],
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
        group: part === "assy" ? "all" : filterGroup,
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
      await createPlanningRowAction(activePart, editing[id] ?? {});
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

  async function updateChangedRows() {
    if (changedRowIds.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      await Promise.all(
        changedRowIds.map((id) =>
          updatePlanningRowAction(activePart, id, editing[id] ?? {}),
        ),
      );
      showToast(
        `${changedRowIds.length} data ${getPartLabel(activePart)} berhasil diupdate.`,
        "success",
      );
      await loadPlanning(activePart);
    } catch (updateError) {
      showToast(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update planning data",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeleteRow() {
    if (!deleteTarget) {
      return;
    }

    const { id, part } = deleteTarget;
    const partLabel = getPartLabel(part);

    try {
      await deletePlanningRowAction(part, id);
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

      const body = await importPlanningRowsAction(part, formData);

      if ("error" in body) {
        const error = new Error(body.error) as ApiError;
        error.status = body.status;
        error.conflicts = body.conflicts;
        throw error;
      }

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
      <PlanningSummaryCards parts={parts} />

      <PlanningToolbar
        activePart={activePart}
        activePartSummary={activePartSummary}
        parts={parts}
        filterMonth={filterMonth}
        currentMonth={currentMonth}
        filterShift={filterShift}
        filterGroup={filterGroup}
        setDraftRows={setDraftRows}
        setFilterMonth={setFilterMonth}
        setFilterShift={setFilterShift}
        setFilterGroup={setFilterGroup}
        setIsLoading={setIsLoading}
        selectPart={selectPart}
        openImportModal={openImportModal}
        addDraftRow={() => addDraftRow()}
        updateChangedRows={() => void updateChangedRows()}
        hasPendingUpdates={changedRowIds.length > 0}
        isSaving={isSaving}
        canManagePlanning={canManagePlanning}
      />

      <PlanningTable
        visibleColumns={visibleColumns}
        isLoading={isLoading}
        rows={rows}
        draftRows={draftRows}
        primaryColumn={primaryColumn}
        editing={editing}
        isSaving={isSaving}
        activePart={activePart}
        setEditingValue={setEditingValue}
        saveDraftRow={(id) => void saveDraftRow(id)}
        setDraftRows={setDraftRows}
        setDeleteTarget={setDeleteTarget}
        canManagePlanning={canManagePlanning}
      />

      <PlanningOverlays
        isImportModalOpen={isImportModalOpen}
        setIsImportModalOpen={setIsImportModalOpen}
        fileInputRef={fileInputRef}
        importPart={importPart}
        setImportPart={setImportPart}
        isImporting={isImporting}
        showToast={showToast}
        uploadExcel={(part, overwrite) => void uploadExcel(part, overwrite)}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        confirmDeleteRow={() => void confirmDeleteRow()}
        importConflict={importConflict}
        setImportConflict={setImportConflict}
        toast={toast}
        canManagePlanning={canManagePlanning}
      />
    </DefaultLayout>
  );
}
