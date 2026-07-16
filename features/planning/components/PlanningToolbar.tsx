import type { PlanningPartKey, PlanningPartSummary } from "@/features/planning/types";
import { groupOptions, shiftOptions } from "@/features/planning/planning-ui";

type PlanningToolbarProps = {
  activePart: PlanningPartKey;
  activePartSummary: PlanningPartSummary | undefined;
  parts: PlanningPartSummary[];
  filterMonth: string;
  currentMonth: string;
  filterShift: string;
  filterGroup: string;
  setDraftRows: React.Dispatch<React.SetStateAction<Array<{ id: string }>>>;
  setFilterMonth: (value: string) => void;
  setFilterShift: (value: string) => void;
  setFilterGroup: (value: string) => void;
  setIsLoading: (value: boolean) => void;
  selectPart: (part: PlanningPartKey) => void;
  openImportModal: () => void;
  addDraftRow: () => void;
  updateChangedRows: () => void;
  hasPendingUpdates: boolean;
  isSaving: boolean;
};

export default function PlanningToolbar({
  activePart,
  activePartSummary,
  parts,
  filterMonth,
  currentMonth,
  filterShift,
  filterGroup,
  setDraftRows,
  setFilterMonth,
  setFilterShift,
  setFilterGroup,
  setIsLoading,
  selectPart,
  openImportModal,
  addDraftRow,
  updateChangedRows,
  hasPendingUpdates,
  isSaving,
}: PlanningToolbarProps) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto lg:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-white px-4 text-sm font-semibold text-[#344054] shadow-sm ring-1 ring-inset ring-[#e4e7ec] transition hover:bg-[#f9fafb]"
            type="button"
            onClick={openImportModal}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            >
              <path d="M12 3v12" />
              <path d="m7 8 5-5 5 5" />
              <path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
            </svg>
            Import Excel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#465fff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3648d9]"
            type="button"
            onClick={() => addDraftRow()}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add Row
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#12b76a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#039855] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasPendingUpdates || isSaving}
            type="button"
            onClick={updateChangedRows}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Update
          </button>
        </div>
      </div>

      <div
        className="rounded-t-2xl border border-b-2 border-[#e4e7ec] bg-white px-5 py-5 shadow-sm"
        style={{ borderBottomColor: "#84adff" }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#101828]">
              {activePartSummary?.label ?? "Planning"} Detail
            </h2>
            <p className="mt-1 text-sm text-[#667085]">
              Monthly planning filtered by period, shift, and group
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[160px_150px_96px_96px]">
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
              <span className="sr-only">Line</span>
              <span className="relative block">
                <select
                  className="h-10 w-full appearance-none rounded-lg border border-[#e4e7ec] bg-white pl-3 pr-10 text-sm font-medium normal-case tracking-normal text-[#344054] outline-none focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                  value={activePart}
                  onChange={(event) => selectPart(event.target.value as PlanningPartKey)}
                >
                  {parts.map((part) => (
                    <option key={part.key} value={part.key}>
                      {part.label}
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
      </div>
    </section>
  );
}
