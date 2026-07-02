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
    <span className="grid min-h-[48px] place-items-center rounded-lg border border-[#e4e7ec] bg-white px-3.5 text-lg font-semibold tabular-nums tracking-tight text-[#101828] dark:border-[#273449] dark:bg-[#111827] dark:text-[#f8fafc]">
      {time}
    </span>
  );
}
