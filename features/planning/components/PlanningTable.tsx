import type { PlanningColumn, PlanningPartKey, PlanningRow } from "@/features/planning/types";
import {
  formatColumnLabel,
  formatShiftLabel,
  formatInputValue,
  groupOptions,
  isGroupColumn,
  isShiftColumn,
  isUpdateField,
  shiftOptions,
} from "@/features/planning/planning-ui";
import { Fragment } from "react";

type PlanningTableProps = {
  visibleColumns: PlanningColumn[];
  isLoading: boolean;
  rows: PlanningRow[];
  draftRows: Array<{ id: string }>;
  primaryColumn: PlanningColumn | undefined;
  editing: Record<string, Record<string, string>>;
  isSaving: boolean;
  activePart: PlanningPartKey;
  setEditingValue: (id: string, field: string, value: string) => void;
  saveDraftRow: (id: string) => void;
  setDraftRows: React.Dispatch<React.SetStateAction<Array<{ id: string }>>>;
  setDeleteTarget: React.Dispatch<React.SetStateAction<{ id: string; part: PlanningPartKey } | null>>;
};

export default function PlanningTable({
  visibleColumns,
  isLoading,
  rows,
  draftRows,
  primaryColumn,
  editing,
  isSaving,
  activePart,
  setEditingValue,
  saveDraftRow,
  setDraftRows,
  setDeleteTarget,
}: PlanningTableProps) {
  const isDateField = (column: PlanningColumn) => column.inputType === "date";
  const isRemarkField = (column: PlanningColumn) => column.field.toLowerCase() === "remark";
  const isOtField = (column: PlanningColumn) =>
    ["ot", "fot"].includes(column.field.toLowerCase());
  const isTrField = (column: PlanningColumn) =>
    ["f1tr", "f2tr"].includes(column.field.toLowerCase());
  const isCompactField = (column: PlanningColumn) =>
    ["shift", "fshift", "group", "fgroup", "tt", "ftt", "oee", "foee", "ratio", "fratio", "f1tr", "f2tr"].includes(column.field.toLowerCase());

  return (
    <section className="overflow-hidden rounded-b-2xl border border-t-0 border-[#e4e7ec] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
            <tr>
              {visibleColumns.map((column) => (
                <Fragment key={column.field}>
                  <th className="px-3 py-3">
                    {formatColumnLabel(column.field)}
                  </th>
                  {column.field.toLowerCase() === "f2tr" ? <th className="px-2 py-3 text-center">Total Plan</th> : null}
                </Fragment>
              ))}
              <th className="px-3 py-3 text-right">Actions</th>
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
                      <Fragment key={column.field}>
                      <td className="px-3 py-4">
                        {isDraft && column.isPrimary ? (
                          <span className="rounded-full bg-[#fef0c7] px-2.5 py-1 text-xs font-medium text-[#b54708]">
                            New
                          </span>
                        ) : (isDraft || isUpdateField(column)) &&
                          (isShiftColumn(column) || isGroupColumn(column)) ? (
                          <span
                            className={`relative block ${
                              isRemarkField(column)
                                ? "w-40"
                                : isDateField(column)
                                  ? "w-36"
                                  : isShiftColumn(column)
                                    ? "w-24"
                                  : isTrField(column)
                                    ? "w-20"
                                  : isOtField(column)
                                    ? "w-12"
                                  : isCompactField(column)
                                    ? "w-14"
                                    : "w-24"
                            }`}
                          >
                            <select
                              value={editing[rowId]?.[column.field] ?? ""}
                              onChange={(event) =>
                                setEditingValue(
                                  rowId,
                                  column.field,
                                  event.target.value,
                                )
                              }
                              className={`h-9 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white pl-3 pr-8 text-sm text-[#344054] outline-none focus:border-[#465fff] ${
                                isRemarkField(column)
                                  ? "min-w-40"
                                  : isDateField(column)
                                  ? "min-w-36"
                                  : isShiftColumn(column)
                                    ? "min-w-24"
                                  : isTrField(column)
                                    ? "min-w-20"
                                  : isOtField(column)
                                    ? "min-w-12"
                                  : isCompactField(column)
                                    ? "min-w-14"
                                    : ""
                              }`}
                            >
                              <option value="">Pilih</option>
                              {(isShiftColumn(column)
                                ? shiftOptions
                                : groupOptions
                              ).map((option) => (
                                <option key={option} value={option}>
                                  {isShiftColumn(column) ? formatShiftLabel(option) : option}
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
                            className={`h-9 rounded-lg border border-[#e4e7ec] px-3 text-sm text-[#344054] outline-none focus:border-[#465fff] ${
                              isRemarkField(column)
                                ? "w-40 min-w-40"
                                : isDateField(column)
                                  ? "w-36 min-w-36"
                                  : isShiftColumn(column)
                                    ? "w-24 min-w-24"
                                  : isTrField(column)
                                    ? "w-20 min-w-20"
                                  : isOtField(column)
                                    ? "w-12 min-w-12"
                                  : isCompactField(column)
                                    ? "w-14 min-w-14"
                                    : "w-24"
                            }`}
                            type={column.inputType}
                          />
                        ) : (
                          <span
                            className={`block truncate font-medium text-[#101828] ${
                              isRemarkField(column)
                                ? "min-w-40"
                                : isDateField(column)
                                  ? "min-w-36"
                                  : isShiftColumn(column)
                                    ? "min-w-24"
                                  : isTrField(column)
                                    ? "min-w-20"
                                  : isOtField(column)
                                    ? "min-w-12"
                                  : isCompactField(column)
                                    ? "min-w-14"
                                    : "min-w-24"
                            }`}
                          >
                            {isShiftColumn(column)
                              ? formatShiftLabel(row?.[column.field])
                              : formatInputValue(row?.[column.field], column)}
                          </span>
                        )}
                      </td>
                      {column.field.toLowerCase() === "f2tr" ? (
                        <td className="px-2 py-4 text-center font-semibold text-[#101828]">
                          <span className="inline-flex h-9 min-w-16 items-center justify-center text-center">
                            {Number(row?.f1tr ?? 0) + Number(row?.f2tr ?? 0)}
                          </span>
                        </td>
                      ) : null}
                      </Fragment>
                    ))}
                    <td className="px-3 py-4">
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
                        ) : null}
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
  );
}
