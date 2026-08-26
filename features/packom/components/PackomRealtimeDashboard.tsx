"use client";

import type { PackomCard, PackomDashboard } from "@/features/packom/types";
import ProductionAchievementClock from "@/features/production-achievement/components/ProductionAchievementClock";
import ProductionAchievementFilters from "@/features/production-achievement/components/ProductionAchievementFilters";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "-";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value * 100)}%`;
}

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
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(parseDashboardDate(value));
}

function PackomCardView({ card }: { card: PackomCard }) {
  return (
    <article className="flex h-full min-h-[500px] flex-col rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">{card.label}</h2>
          <p className="mt-1 text-xs font-medium text-[#667085] dark:text-[#a7b0c0]">Last updated: {card.lastUpdatedTime ?? "-"}</p>
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${card.lastUpdatedTime ? "bg-[#ecfdf3] text-[#039855] dark:bg-[#062b1b] dark:text-[#75e0a7]" : "bg-[#f2f4f7] text-[#667085] dark:bg-[#273449] dark:text-[#a7b0c0]"}`} aria-label={card.lastUpdatedTime ? "Data available" : "No data"}>
          <span className="size-2.5 rounded-full bg-current" />
        </span>
      </div>

      <div className="mt-4 grid h-36 place-items-center rounded-xl bg-[#f9fafb] dark:bg-[#162033]">
        <Image src={card.imageSrc} alt={`${card.label} production part`} width={220} height={150} className="max-h-32 w-auto max-w-[88%] object-contain" />
      </div>
      <div className="mt-4 grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Total Packing" value={formatNumber(card.totalPacking)} valueSizeClassName="text-2xl" />
          <MetricTile label="Defect Rate" value={formatPercent(card.defectRate)} valueClassName={card.defect > 0 ? "text-[#b42318]" : "text-[#027a48]"} valueSizeClassName="text-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Good" value={formatNumber(card.good)} valueClassName="text-[#027a48]" />
          <MetricTile label="Defect" value={formatNumber(card.defect)} valueClassName={card.defect > 0 ? "text-[#b42318]" : undefined} />
        </div>
      </div>
      <div className="mt-5 min-h-[122px] flex-1 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] px-3 py-3 dark:border-[#273449] dark:bg-[#162033]">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-[#a7b0c0]">Part Breakdown</p>
        {card.partBreakdown.length ? (
          <ol className="mt-2 space-y-1.5">
            {card.partBreakdown.map((part) => (
              <li key={part.code} className="flex items-center gap-2 text-sm font-medium text-[#344054] dark:text-[#d4dae5]">
                <span className={`grid min-w-8 place-items-center rounded px-1.5 py-0.5 text-xs font-bold ${part.isUnknown ? "bg-[#fffaeb] text-[#b54708] dark:bg-[#3a2604] dark:text-[#fdb022]" : "bg-[#ecf3ff] text-[#465fff] dark:bg-[#14245a] dark:text-[#8da2ff]"}`}>{part.code}</span>
                <span className="min-w-0 flex-1 truncate" title={part.label}>{part.label}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatNumber(part.count)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-8 text-center text-sm font-medium text-[#344054] dark:text-[#d4dae5]">No part code data</p>
        )}
      </div>
      <div className={`mt-3 min-h-[94px] rounded-xl border px-3 py-3 ${card.anomalyCaseCount ? "border-[#fecdca] bg-[#fffbfa] dark:border-[#7a271a] dark:bg-[#3b1111]" : "border-[#e4e7ec] bg-[#f9fafb] dark:border-[#273449] dark:bg-[#162033]"}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${card.anomalyCaseCount ? "text-[#b42318] dark:text-[#fda29b]" : "text-[#667085] dark:text-[#a7b0c0]"}`}>Case Status</p>
        {card.incompleteCaseCount === 0 && card.anomalyCaseCount === 0 ? (
          <p className="mt-5 text-center text-sm font-medium text-[#344054] dark:text-[#d4dae5]">All cases complete</p>
        ) : (
          <div className="mt-2 space-y-1.5 text-sm font-medium text-[#344054] dark:text-[#d4dae5]">
            {card.incompleteCases.map((item) => <p key={`progress-${item.caseNumber}`}><span className="font-semibold text-[#b54708] dark:text-[#fdb022]">In progress</span> · {item.caseNumber} · {formatNumber(item.units)} / {formatNumber(item.capacity)}</p>)}
            {card.anomalyCases.map((item) => <p key={`anomaly-${item.caseNumber}`}><span className="font-semibold text-[#b42318] dark:text-[#fda29b]">Anomaly</span> · {item.caseNumber} · {formatNumber(item.units)} / {formatNumber(item.capacity)}</p>)}
            {card.incompleteCaseCount > card.incompleteCases.length ? <p className="text-xs text-[#667085] dark:text-[#a7b0c0]">+{formatNumber(card.incompleteCaseCount - card.incompleteCases.length)} more in progress</p> : null}
            {card.anomalyCaseCount > card.anomalyCases.length ? <p className="text-xs text-[#b42318] dark:text-[#fda29b]">+{formatNumber(card.anomalyCaseCount - card.anomalyCases.length)} more anomalies</p> : null}
          </div>
        )}
      </div>
    </article>
  );
}

function MetricTile({ label, value, detail, valueClassName = "text-[#101828] dark:text-[#f8fafc]", valueSizeClassName = "text-xl" }: { label: string; value: string; detail?: string; valueClassName?: string; valueSizeClassName?: string }) {
  return (
    <div className="flex min-h-[76px] flex-col justify-between rounded-lg bg-[#f9fafb] px-3 py-2.5 dark:bg-[#162033]">
      <p className="text-xs font-semibold text-[#667085] dark:text-[#a7b0c0]">{label}</p>
      <p className={`mt-1 text-right font-semibold leading-none tabular-nums ${valueSizeClassName} ${valueClassName}`}>{value}</p>
      {detail ? <p className="mt-1 text-right text-xs font-semibold text-[#667085] dark:text-[#a7b0c0]">{detail}</p> : null}
    </div>
  );
}

export default function PackomRealtimeDashboard({ initialDashboard }: { initialDashboard: PackomDashboard }) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [selectedFilter, setSelectedFilter] = useState<{ date: string; shift: PackomDashboard["shift"] }>({
    date: initialDashboard.productionDate,
    shift: initialDashboard.shift,
  });
  const selectedFilterRef = useRef(selectedFilter);

  async function loadDashboard(filter: { date: string; shift: PackomDashboard["shift"] }) {
    const params = new URLSearchParams(filter);
    const response = await fetch(`/api/packom?${params}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Unable to refresh packom data");
    return body.data as PackomDashboard;
  }

  async function handleFilterChange(next: { date?: string; shift?: string }) {
    const filter = {
      date: next.date ?? selectedFilterRef.current.date,
      shift: next.shift === "DAY" || next.shift === "NIGHT" ? next.shift : selectedFilterRef.current.shift,
    };
    if (filter.date === selectedFilterRef.current.date && filter.shift === selectedFilterRef.current.shift) return;
    selectedFilterRef.current = filter;
    setSelectedFilter(filter);
    window.history.replaceState(null, "", `/packom?${new URLSearchParams(filter)}`);

    try {
      setDashboard(await loadDashboard(filter));
    } catch {
      // Preserve the last successful snapshot while the report source is unavailable.
    }
  }

  useEffect(() => {
    if (!dashboard.isActiveProductionShift) return;
    let active = true;
    const refresh = async () => {
      try {
        const nextDashboard = await loadDashboard(selectedFilterRef.current);
        if (active) setDashboard(nextDashboard);
      } catch {
        // Preserve the last successfully loaded snapshot while the report source is unavailable.
      }
    };
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [dashboard.isActiveProductionShift]);

  return (
    <section className="w-full max-w-none p-1 md:p-1 2xl:p-1">
      <header className="mb-4 min-h-[118px] rounded-2xl border border-[#e4e7ec] bg-white px-4 py-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_auto_auto] lg:items-center">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828] dark:text-[#f8fafc] md:text-3xl">Production Achievement Packom</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm font-semibold text-[#667085] dark:text-[#a7b0c0]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <path d="M3 10h18" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
              </svg>
              <span>{formatDisplayDate(selectedFilter.date)}</span>
              <span className="text-[#d0d5dd] dark:text-[#384860]">•</span>
              <span>{formatWeekday(selectedFilter.date)}</span>
            </div>
          </div>
          <ProductionAchievementFilters
            date={selectedFilter.date}
            shift={selectedFilter.shift}
            onFilterChange={(next) => void handleFilterChange(next)}
          />
          <ProductionAchievementClock />
        </div>
      </header>
      <div className="grid items-stretch gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {dashboard.cards.map((card) => <PackomCardView key={card.key} card={card} />)}
      </div>
    </section>
  );
}
