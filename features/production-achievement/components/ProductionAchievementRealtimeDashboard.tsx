"use client";

import ProductionAchievementCardView from "@/features/production-achievement/components/ProductionAchievementCardView";
import ProductionAchievementClock from "@/features/production-achievement/components/ProductionAchievementClock";
import ProductionAchievementFilters from "@/features/production-achievement/components/ProductionAchievementFilters";
import type { ProductionAchievementDashboard } from "@/features/production-achievement/types";
import { useEffect, useState } from "react";

type ProductionAchievementRealtimeDashboardProps = {
  initialDashboard: ProductionAchievementDashboard;
};

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

  async function handleFilterChange(next: { date?: string; shift?: string }) {
    const nextDate = next.date ?? dashboard.date;
    const nextShift = next.shift ?? dashboard.shift;
    const params = new URLSearchParams({ date: nextDate, shift: nextShift });

    window.history.replaceState(
      null,
      "",
      `/production-achievement?${params.toString()}`,
    );

    try {
      const nextDashboard = await fetchDashboard(nextDate, nextShift);
      setDashboard(nextDashboard);
    } catch {
      // Keep the last successful snapshot visible if a filter refresh fails.
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
    }, 15000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [dashboard.date, dashboard.shift]);

  return (
    <section>
      <div className="mb-4 grid gap-3 py-3 pl-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
        <div className="flex justify-start">
          <ProductionAchievementFilters
            date={dashboard.date}
            shift={dashboard.shift}
            onFilterChange={(next) => {
              void handleFilterChange(next);
            }}
          />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[#101828] dark:text-[#f8fafc] md:text-3xl">
            Production Achievement
          </h1>
          <p className="mt-1 text-lg font-semibold text-[#667085] dark:text-[#a7b0c0] md:text-xl">
            {dashboard.date}
          </p>
        </div>

        <div className="flex justify-start lg:justify-end">
          <ProductionAchievementClock />
        </div>
      </div>

      <div className="overflow-x-auto pb-2 [scrollbar-gutter:stable] xl:overflow-visible xl:pb-0">
        <div className="grid auto-cols-[320px] grid-flow-col gap-3 xl:grid-flow-row xl:grid-cols-5 xl:auto-cols-auto">
          {dashboard.cards.map((card) => (
            <ProductionAchievementCardView key={card.key} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
