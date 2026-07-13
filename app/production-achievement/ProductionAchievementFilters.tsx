"use client";

import { useRouter } from "next/navigation";

type ProductionAchievementFiltersProps = {
  date: string;
  shift: string;
};

export default function ProductionAchievementFilters({
  date,
  shift,
}: ProductionAchievementFiltersProps) {
  const router = useRouter();

  function updateFilter(next: { date?: string; shift?: string }) {
    const params = new URLSearchParams();
    params.set("date", next.date ?? date);
    params.set("shift", next.shift ?? shift);
    router.replace(`/production-achievement?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#d4dae5]">
        Date
        <input
          className="h-10 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm font-medium text-[#101828] outline-none transition focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff] dark:border-[#384860] dark:bg-[#111827] dark:text-[#f8fafc] dark:focus:ring-[#14245a]"
          name="date"
          type="date"
          value={date}
          onChange={(event) => updateFilter({ date: event.target.value })}
        />
      </label>

      <label className="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#d4dae5]">
        Shift
        <span className="relative">
          <select
            className="h-10 w-full appearance-none rounded-lg border border-[#d0d5dd] bg-white py-0 pl-3 pr-10 text-sm font-medium text-[#101828] outline-none transition focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff] dark:border-[#384860] dark:bg-[#111827] dark:text-[#f8fafc] dark:focus:ring-[#14245a]"
            name="shift"
            value={shift}
            onChange={(event) => updateFilter({ shift: event.target.value })}
          >
            <option value="all">All Shift</option>
            <option value="R">R</option>
            <option value="W">W</option>
          </select>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667085] dark:text-[#a7b0c0]"
          >
            <path
              d="m5 7.5 5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
          </svg>
        </span>
      </label>
    </div>
  );
}
