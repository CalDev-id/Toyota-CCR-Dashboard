"use client";

import type { PackomCard, PackomDashboard } from "@/features/packom/types";
import ProductionAchievementClock from "@/features/production-achievement/components/ProductionAchievementClock";
import ProductionAchievementFilters from "@/features/production-achievement/components/ProductionAchievementFilters";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function isSpdCase(caseNumber: string) {
  return caseNumber.trim().toUpperCase().startsWith("SPD");
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
  const planLineLabel: Record<PackomCard["key"], string> = {
    cylblock: "Plan Block",
    cylhead: "Plan Head",
    crankshaft: "Plan Crank",
    camshaft: "Plan Cam",
  };
  const partColumnCount = Math.min(3, Math.max(1, card.partBreakdown.length));
  const partColumns = Array.from({ length: partColumnCount }, () => [] as typeof card.partBreakdown);
  const partGridClass = partColumnCount === 1 ? "grid-cols-1" : partColumnCount === 2 ? "grid-cols-2" : "grid-cols-3";
  card.partBreakdown.forEach((part, index) => partColumns[index % partColumns.length].push(part));

  return (
    <article className="flex h-fit flex-col rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
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
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricTile
          label="Plan"
          value={formatNumber(card.plan)}
          tooltip={<div className="flex items-center gap-1 whitespace-nowrap"><span className="shrink-0">Plan =</span><div className="text-center"><p>{planLineLabel[card.key]} ({formatNumber(card.planLineTotal)}) − Plan Assy ({formatNumber(card.planAssyTotal)})</p><p className="mt-0.5 border-t border-[#98a2b3] pt-0.5">Kapasitas per modul ({formatNumber(card.unitsPerModule)})</p></div></div>}
          tooltipClassName="w-fit max-w-[calc(100vw-2rem)] text-[11px] leading-4"
          valueClassName="text-[#465fff] dark:text-[#8da2ff]"
          valueSizeClassName="text-3xl"
        />
        <MetricTile
          label="Act Modul"
          value={formatNumber(card.totalPacking)}
          tooltip={<div className="space-y-1.5"><div className="flex items-center justify-between gap-6"><span>Act Prod</span><span className="font-semibold tabular-nums">{formatNumber(card.realtimeProduction)}</span></div>{card.key === "camshaft" ? null : <><div className="flex items-center justify-between gap-6 text-[#d0d5dd]"><span>1TR</span><span className="tabular-nums">{formatNumber(card.realtimeProductionByVariant.oneTr)}</span></div><div className="flex items-center justify-between gap-6 text-[#d0d5dd]"><span>2TR</span><span className="tabular-nums">{formatNumber(card.realtimeProductionByVariant.twoTr)}</span></div></>}</div>}
          tooltipClassName="w-44"
          valueSizeClassName="text-3xl"
        />
      </div>
      <div className="order-2 mt-3">
        {card.partBreakdown.length ? (
          <div className={`grid ${partGridClass} overflow-hidden rounded-xl border border-[#e4e7ec] text-xs dark:border-[#273449]`}>
            {partColumns.map((parts, columnIndex) => (
              <div key={columnIndex} className={columnIndex ? "border-l border-[#e4e7ec] dark:border-[#273449]" : ""}>
                {parts.map((part, index) => (
                  <section key={part.code} className={index ? "border-t border-[#e4e7ec] dark:border-[#273449]" : ""}>
                    <div className="flex items-center justify-between gap-2 bg-[#f9fafb] px-3 py-2 font-semibold dark:bg-[#162033]">
                      <span className={part.isUnknown ? "text-[#b54708] dark:text-[#fdb022]" : "text-[#101828] dark:text-[#f8fafc]"}>{part.code}</span>
                      <span className="text-[#667085] dark:text-[#a7b0c0]">{formatNumber(part.count)}</span>
                    </div>
                    <ul className="divide-y divide-[#eaecf0] dark:divide-[#273449]">
                      {part.caseNumbers.map((caseNumber) => <li key={caseNumber} className="truncate px-3 py-2 font-medium text-[#667085] dark:text-[#a7b0c0]" title={caseNumber}>{caseNumber}</li>)}
                    </ul>
                  </section>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[122px] place-items-center rounded-xl border border-dashed border-[#d0d5dd] px-3 py-4 text-center text-xs font-medium text-[#98a2b3] dark:border-[#384860] dark:text-[#7f8a9d]">No part code data</div>
        )}
      </div>
      {card.incompleteCaseCount > 0 || card.anomalyCaseCount > 0 ? (
        <div className={`order-1 mt-5 border-l-4 py-2 pl-3 pr-3 ${card.anomalyCaseCount ? "border-[#f04438] bg-[#fffbfa] dark:bg-[#2d1215]" : "border-[#fdb022] bg-[#fffaeb] dark:bg-[#342400]"}`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs font-semibold uppercase tracking-wide ${card.anomalyCaseCount ? "text-[#b42318] dark:text-[#fda29b]" : "text-[#b54708] dark:text-[#fdb022]"}`}>Case Status</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${card.anomalyCaseCount ? "bg-[#fee4e2] text-[#b42318] dark:bg-[#5d1919] dark:text-[#fda29b]" : "bg-[#fef0c7] text-[#b54708] dark:bg-[#5a4308] dark:text-[#fdb022]"}`}>{formatNumber(card.incompleteCaseCount + card.anomalyCaseCount)}</span>
          </div>
          <div className="mt-2 space-y-1 text-xs font-medium text-[#344054] dark:text-[#d4dae5]">
            {card.incompleteCases.map((item) => {
              const isSpd = isSpdCase(item.caseNumber);
              return <div key={`progress-${item.caseNumber}`} className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-semibold" title={item.caseNumber}>{item.caseNumber}</span><span className="shrink-0 text-[#667085] dark:text-[#a7b0c0]">{formatNumber(item.units)}{isSpd ? " Unit" : ` / ${formatNumber(item.capacity)}`}</span>{item.fromPreviousShift ? <span className="shrink-0 rounded bg-[#ecf3ff] px-1.5 py-0.5 text-[10px] font-bold text-[#465fff] dark:bg-[#14245a] dark:text-[#8da2ff]">Prev. shift</span> : isSpd ? null : <span className="shrink-0 rounded bg-[#fef0c7] px-1.5 py-0.5 text-[10px] font-bold text-[#b54708] dark:bg-[#5a4308] dark:text-[#fdb022]">Progress</span>}</div>;
            })}
            {card.anomalyCases.map((item) => <div key={`anomaly-${item.caseNumber}`} className="flex items-center justify-between gap-2"><span className="min-w-0 truncate font-semibold">{item.caseNumber}</span><span className="shrink-0 text-[#b42318] dark:text-[#fda29b]">{formatNumber(item.units)} / {formatNumber(item.capacity)}</span><span className="shrink-0 rounded bg-[#fee4e2] px-1.5 py-0.5 text-[10px] font-bold text-[#b42318] dark:bg-[#5d1919] dark:text-[#fda29b]">Anomaly</span></div>)}
            {card.incompleteCaseCount > card.incompleteCases.length ? <p className="text-xs text-[#667085] dark:text-[#a7b0c0]">+{formatNumber(card.incompleteCaseCount - card.incompleteCases.length)} more in progress</p> : null}
            {card.anomalyCaseCount > card.anomalyCases.length ? <p className="text-xs text-[#b42318] dark:text-[#fda29b]">+{formatNumber(card.anomalyCaseCount - card.anomalyCases.length)} more anomalies</p> : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MetricTile({ label, value, detail, tooltip, tooltipClassName = "w-max min-w-72", valueClassName = "text-[#101828] dark:text-[#f8fafc]", valueSizeClassName = "text-xl" }: { label: string; value: string; detail?: string; tooltip?: ReactNode; tooltipClassName?: string; valueClassName?: string; valueSizeClassName?: string }) {
  return (
    <div className={`group relative flex min-h-[76px] flex-col justify-between rounded-lg bg-[#f9fafb] px-3 py-2.5 dark:bg-[#162033] ${tooltip ? "cursor-help" : ""}`} tabIndex={tooltip ? 0 : undefined}>
      <p className="text-xs font-semibold text-[#667085] dark:text-[#a7b0c0]">{label}</p>
      <p className={`mt-1 text-right font-semibold leading-none tabular-nums ${valueSizeClassName} ${valueClassName}`}>{value}</p>
      {detail ? <p className="mt-1 text-right text-xs font-semibold text-[#667085] dark:text-[#a7b0c0]">{detail}</p> : null}
      {tooltip ? <div className={`pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 rounded-lg bg-[#101828] px-3 py-2 text-xs font-medium leading-5 text-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 ${tooltipClassName}`}>{tooltip}</div> : null}
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
      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {dashboard.cards.map((card) => <PackomCardView key={card.key} card={card} />)}
      </div>
    </section>
  );
}
