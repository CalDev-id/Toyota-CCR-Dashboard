"use client";

import { useEffect, useState } from "react";

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function ProductionAchievementClock() {
  const [time, setTime] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(formatClock(new Date()));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-[76px] min-w-[168px] items-center justify-center gap-3 rounded-xl border border-[#e4e7ec] bg-white px-4 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-7 shrink-0 text-[#667085] dark:text-[#a7b0c0]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-semibold tabular-nums tracking-tight text-[#101828] dark:text-[#f8fafc]">
          {time}
        </div>
        <div className="mt-1 text-xs font-semibold text-[#667085] dark:text-[#a7b0c0]">
          Local Time
        </div>
      </div>
    </div>
  );
}
