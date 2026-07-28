"use client";

import ProductionAchievementClock from "@/features/production-achievement/components/ProductionAchievementClock";
import { useState } from "react";

type LoadingHeaderState = {
  date: string;
  shift: "DAY" | "NIGHT";
};

function getLoadingHeaderState(): LoadingHeaderState {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const minutes = now.getHours() * 60 + now.getMinutes();

  return {
    date,
    shift: minutes >= 7 * 60 && minutes < 19 * 60 + 30 ? "DAY" : "NIGHT",
  };
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatWeekday(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(year, month - 1, day),
  );
}

function CardSkeleton() {
  return (
    <div className="min-h-[500px] rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-[#eaecf0] dark:bg-[#273449]" />
          <div className="h-3 w-40 rounded bg-[#f2f4f7] dark:bg-[#202d40]" />
        </div>
        <div className="size-9 rounded-full bg-[#f2f4f7] dark:bg-[#202d40]" />
      </div>
      <div className="mt-4 h-36 rounded-xl bg-[#f2f4f7] dark:bg-[#202d40]" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-16 rounded-lg bg-[#f2f4f7] dark:bg-[#202d40]"
          />
        ))}
      </div>
      <div className="mt-5 h-28 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] dark:border-[#273449] dark:bg-[#162033]" />
      <div className="mt-5 h-[122px] rounded-xl border border-[#e4e7ec] bg-[#f9fafb] dark:border-[#273449] dark:bg-[#162033]" />
    </div>
  );
}

export default function ProductionAchievementLoading() {
  const [header] = useState<LoadingHeaderState>(getLoadingHeaderState);

  return (
    <div className="w-full max-w-none p-1 md:p-1 2xl:p-1">
      <section aria-label="Loading production achievement" aria-busy="true">
        <div className="mb-4 min-h-[118px] rounded-2xl border border-[#e4e7ec] bg-white px-4 py-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
          <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_auto_auto] lg:items-center">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[#101828] dark:text-[#f8fafc] md:text-3xl">
                Production Achievement ({header.shift === "DAY" ? "Day" : "Night"})
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm font-semibold text-[#667085] dark:text-[#a7b0c0]">
                <span>{formatDisplayDate(header.date)}</span>
                <span className="text-[#d0d5dd] dark:text-[#384860]">•</span>
                <span>{formatWeekday(header.date)}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[220px_220px] sm:items-end">
              <label className="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#d4dae5]">
                Date
                <input
                  className="h-10 rounded-lg border border-[#d0d5dd] bg-[#f9fafb] px-3 text-sm font-semibold text-[#667085] dark:border-[#384860] dark:bg-[#162033] dark:text-[#a7b0c0]"
                  type="date"
                  value={header.date}
                  disabled
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#d4dae5]">
                Shift
                <select
                  className="h-10 rounded-lg border border-[#d0d5dd] bg-[#f9fafb] px-3 text-sm font-semibold text-[#667085] dark:border-[#384860] dark:bg-[#162033] dark:text-[#a7b0c0]"
                  value={header.shift}
                  disabled
                >
                  <option value="DAY">Day</option>
                  <option value="NIGHT">Night</option>
                </select>
              </label>
            </div>

            <ProductionAchievementClock />
          </div>
        </div>
        <div className="grid auto-cols-[320px] grid-flow-col gap-3 overflow-hidden xl:grid-flow-row xl:grid-cols-5 xl:auto-cols-auto">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <CardSkeleton />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
