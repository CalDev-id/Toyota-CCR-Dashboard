"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function HomeMonthFilter({ month }: { month: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center">
      <input
        aria-label="Filter bulan Home"
        type="month"
        value={month}
        disabled={isPending}
        onChange={(event) => {
          const nextMonth = event.target.value;
          if (!nextMonth) return;

          startTransition(() => {
            router.replace(`/?month=${encodeURIComponent(nextMonth)}`);
          });
        }}
        className="h-10 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm font-semibold text-[#344054] outline-none transition focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff] disabled:cursor-wait disabled:opacity-70 dark:border-[#384860] dark:bg-[#111827] dark:text-[#f8fafc] dark:focus:ring-[#14245a]"
      />
    </label>
  );
}
