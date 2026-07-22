"use client";

import ProductionAchievementCardView from "@/features/production-achievement/components/ProductionAchievementCardView";
import ProductionAchievementClock from "@/features/production-achievement/components/ProductionAchievementClock";
import ProductionAchievementFilters from "@/features/production-achievement/components/ProductionAchievementFilters";
import type { ProductionAchievementDashboard } from "@/features/production-achievement/types";
import { useEffect, useRef, useState } from "react";

type ProductionAchievementRealtimeDashboardProps = {
  initialDashboard: ProductionAchievementDashboard;
};

function parseDashboardDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDashboardDate(value));
}

function formatWeekday(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(parseDashboardDate(value));
}

function formatShiftLabel(value: string) {
  return value.toUpperCase() === "NIGHT" ? "Night" : "Day";
}

async function fetchDashboard(date: string, shift: string) {
  const params = new URLSearchParams({ date, shift });
  const response = await fetch(`/api/production-achievement?${params.toString()}`, {
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Unable to refresh production achievement data");
  }

  return body.data as ProductionAchievementDashboard;
}

export default function ProductionAchievementRealtimeDashboard({
  initialDashboard,
}: ProductionAchievementRealtimeDashboardProps) {
  const [dashboard, setDashboard] =
    useState<ProductionAchievementDashboard>(initialDashboard);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const filterRequestRef = useRef(0);

  async function handleFilterChange(next: { date?: string; shift?: string }) {
    const requestId = ++filterRequestRef.current;
    const nextDate = next.date ?? dashboard.date;
    const nextShift = next.shift ?? dashboard.shift;
    const params = new URLSearchParams({ date: nextDate, shift: nextShift });

    window.history.replaceState(
      null,
      "",
      `/production-achievement?${params.toString()}`,
    );
    setIsFilterLoading(true);

    try {
      const nextDashboard = await fetchDashboard(nextDate, nextShift);

      if (requestId === filterRequestRef.current) {
        setDashboard(nextDashboard);
      }
    } catch {
      // Keep the last successful snapshot visible if a filter refresh fails.
    } finally {
      if (requestId === filterRequestRef.current) {
        setIsFilterLoading(false);
      }
    }
  }

  useEffect(() => {
    let isActive = true;

    const refreshDashboard = async () => {
      try {
        const nextDashboard = await fetchDashboard(dashboard.date, dashboard.shift);

        if (isActive) {
          setDashboard(nextDashboard);
        }
      } catch {
        // Keep the last successful snapshot visible if a refresh fails.
      }
    };

    const interval = window.setInterval(() => {
      void refreshDashboard();
    }, 30000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [dashboard.date, dashboard.shift]);

  return (
    <section>
      <div className="mb-4 min-h-[118px] rounded-2xl border border-[#e4e7ec] bg-white px-4 py-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_auto_auto] lg:items-center">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828] dark:text-[#f8fafc] md:text-3xl">
              Production Achievement ({formatShiftLabel(dashboard.shift)})
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm font-semibold text-[#667085] dark:text-[#a7b0c0]">
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
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <path d="M3 10h18" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
              </svg>
              <span>{formatDisplayDate(dashboard.date)}</span>
              <span className="text-[#d0d5dd] dark:text-[#384860]">•</span>
              <span>{formatWeekday(dashboard.date)}</span>
            </div>
          </div>

          <ProductionAchievementFilters
            date={dashboard.date}
            shift={dashboard.shift}
            onFilterChange={(next) => {
              void handleFilterChange(next);
            }}
          />

          <ProductionAchievementClock />
        </div>
      </div>

      <div className="relative">
        <div
          className={`overflow-x-auto pb-2 [scrollbar-gutter:stable] transition-opacity xl:overflow-visible xl:pb-0 ${
            isFilterLoading ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <div className="grid auto-cols-[320px] grid-flow-col gap-3 xl:grid-flow-row xl:grid-cols-5 xl:auto-cols-auto">
            {dashboard.cards.map((card) => (
              <ProductionAchievementCardView key={card.key} card={card} />
            ))}
          </div>
        </div>

        {isFilterLoading ? (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/45 backdrop-blur-[1px] dark:bg-[#101828]/45">
            <div className="flex items-center gap-2 rounded-full border border-[#d0d5dd] bg-white px-4 py-2 text-sm font-semibold text-[#344054] shadow-sm dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 animate-spin text-[#465fff]"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="3"
                />
                <path
                  d="M12 3a9 9 0 0 1 9 9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              Updating data...
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
