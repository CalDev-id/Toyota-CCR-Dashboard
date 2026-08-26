"use client";

import type { PackomCard, PackomDashboard, PackomProblem } from "@/features/packom/types";
import ProductionAchievementClock from "@/features/production-achievement/components/ProductionAchievementClock";
import ProductionAchievementFilters from "@/features/production-achievement/components/ProductionAchievementFilters";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatNumberAuto(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value % 1 === 0 ? 0 : 1 }).format(value);
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

function ProblemTypeBadge({ type }: { type: PackomProblem["type"] }) {
  const className = type === "AV"
    ? "bg-[#fef3f2] text-[#b42318] dark:bg-[#3b1111] dark:text-[#fda29b]"
    : type === "PE"
      ? "bg-[#fffaeb] text-[#b54708] dark:bg-[#3a2604] dark:text-[#fdb022]"
      : "bg-[#ecf3ff] text-[#465fff] dark:bg-[#14245a] dark:text-[#8da2ff]";

  return <span className={`grid h-5 min-w-6 shrink-0 place-items-center rounded px-1.5 text-[10px] font-bold ${className}`}>{type}</span>;
}

function PackomCardView({ card }: { card: PackomCard }) {
  const hasProblems = card.problems.length > 0;
  const [isProblemTooltipOpen, setIsProblemTooltipOpen] = useState(false);
  const problemPanelRef = useRef<HTMLDivElement>(null);
  const problemTooltipId = `packom-problem-tooltip-${card.key}`;

  useEffect(() => {
    if (!isProblemTooltipOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!problemPanelRef.current?.contains(event.target as Node)) {
        setIsProblemTooltipOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isProblemTooltipOpen]);

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
      <div className="mt-4 grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Plan" value={formatNumber(card.plan)} valueClassName="text-[#465fff] dark:text-[#8da2ff]" valueSizeClassName="text-2xl" />
          <MetricTile label="Act Modul" value={formatNumber(card.totalPacking)} valueSizeClassName="text-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Good [Unit]" value={formatNumber(card.good)} valueClassName="text-[#027a48]" valueSizeClassName="text-2xl" />
          <MetricTile label="Defect [Unit]" value={formatNumber(card.defect)} valueClassName={card.defect > 0 ? "text-[#b42318]" : undefined} valueSizeClassName="text-2xl" />
        </div>
      </div>
      <div className="mt-5">
        {card.partBreakdown.length ? (
          <div className="overflow-hidden rounded-xl border border-[#e4e7ec] dark:border-[#273449]">
            <table className="w-full table-fixed text-xs">
              <thead className="bg-[#f9fafb] text-[#667085] dark:bg-[#162033] dark:text-[#a7b0c0]">
                <tr>
                  <th className="w-[24%] px-4 py-2.5 text-left font-semibold">Type</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Part</th>
                  <th className="w-[20%] px-3 py-2.5 text-center font-semibold"><span className="relative -left-1">Module</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec] dark:divide-[#273449]">
                {card.partBreakdown.map((part) => (
                  <tr key={part.code}>
                    <td className={`px-4 py-2.5 font-semibold ${part.isUnknown ? "text-[#b54708] dark:text-[#fdb022]" : "text-[#101828] dark:text-[#f8fafc]"}`}>{part.code}</td>
                    <td className="truncate px-3 py-2.5 font-medium text-[#667085] dark:text-[#a7b0c0]" title={part.label}>{part.label}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-[#101828] dark:text-[#f8fafc]"><span className="relative -left-1">{formatNumber(part.count)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-[122px] place-items-center rounded-xl border border-dashed border-[#d0d5dd] px-3 py-4 text-center text-xs font-medium text-[#98a2b3] dark:border-[#384860] dark:text-[#7f8a9d]">No part code data</div>
        )}
      </div>
      {card.incompleteCaseCount > 0 || card.anomalyCaseCount > 0 ? (
        <div className={`mt-3 border-l-4 py-2 pl-3 pr-3 ${card.anomalyCaseCount ? "border-[#f04438] bg-[#fffbfa] dark:bg-[#2d1215]" : "border-[#fdb022] bg-[#fffaeb] dark:bg-[#342400]"}`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs font-semibold uppercase tracking-wide ${card.anomalyCaseCount ? "text-[#b42318] dark:text-[#fda29b]" : "text-[#b54708] dark:text-[#fdb022]"}`}>Case Status</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${card.anomalyCaseCount ? "bg-[#fee4e2] text-[#b42318] dark:bg-[#5d1919] dark:text-[#fda29b]" : "bg-[#fef0c7] text-[#b54708] dark:bg-[#5a4308] dark:text-[#fdb022]"}`}>{formatNumber(card.incompleteCaseCount + card.anomalyCaseCount)}</span>
          </div>
          <div className="mt-2 space-y-1 text-xs font-medium text-[#344054] dark:text-[#d4dae5]">
            {card.incompleteCases.map((item) => {
              const isSpd = isSpdCase(item.caseNumber);
              return <div key={`progress-${item.caseNumber}`} className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-semibold" title={item.caseNumber}>{item.caseNumber}</span><span className="shrink-0 text-[#667085] dark:text-[#a7b0c0]">{formatNumber(item.units)}{isSpd ? " Unit" : ` / ${formatNumber(item.capacity)}`}</span>{isSpd ? null : <span className="shrink-0 rounded bg-[#fef0c7] px-1.5 py-0.5 text-[10px] font-bold text-[#b54708] dark:bg-[#5a4308] dark:text-[#fdb022]">Progress</span>}</div>;
            })}
            {card.anomalyCases.map((item) => <div key={`anomaly-${item.caseNumber}`} className="flex items-center justify-between gap-2"><span className="min-w-0 truncate font-semibold">{item.caseNumber}</span><span className="shrink-0 text-[#b42318] dark:text-[#fda29b]">{formatNumber(item.units)} / {formatNumber(item.capacity)}</span><span className="shrink-0 rounded bg-[#fee4e2] px-1.5 py-0.5 text-[10px] font-bold text-[#b42318] dark:bg-[#5d1919] dark:text-[#fda29b]">Anomaly</span></div>)}
            {card.incompleteCaseCount > card.incompleteCases.length ? <p className="text-xs text-[#667085] dark:text-[#a7b0c0]">+{formatNumber(card.incompleteCaseCount - card.incompleteCases.length)} more in progress</p> : null}
            {card.anomalyCaseCount > card.anomalyCases.length ? <p className="text-xs text-[#b42318] dark:text-[#fda29b]">+{formatNumber(card.anomalyCaseCount - card.anomalyCases.length)} more anomalies</p> : null}
          </div>
        </div>
      ) : null}
      <div
        ref={problemPanelRef}
        aria-controls={hasProblems ? problemTooltipId : undefined}
        aria-expanded={hasProblems ? isProblemTooltipOpen : undefined}
        className={`relative mt-3 min-h-[122px] rounded-xl border px-3 py-3 ${
          hasProblems
            ? "border-[#fecdca] bg-[#fffbfa] dark:border-[#7a271a] dark:bg-[#3b1111]"
            : "border-[#e4e7ec] bg-[#f9fafb] dark:border-[#273449] dark:bg-[#162033]"
        } ${hasProblems ? "cursor-pointer transition hover:border-[#f97066] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f04438]" : ""}`}
        onClick={hasProblems ? () => setIsProblemTooltipOpen((current) => !current) : undefined}
        onKeyDown={hasProblems ? (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setIsProblemTooltipOpen((current) => !current);
        } : undefined}
        role={hasProblems ? "button" : undefined}
        tabIndex={hasProblems ? 0 : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs font-semibold uppercase tracking-wide ${hasProblems ? "text-[#b42318] dark:text-[#fda29b]" : "text-[#667085] dark:text-[#a7b0c0]"}`}>Problem</p>
          {hasProblems ? <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 text-[#b42318] dark:text-[#fda29b]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M12 16v-4M12 8h.01" /><circle cx="12" cy="12" r="9" /></svg> : null}
        </div>
        {hasProblems ? (
          <ol className="mt-2 space-y-1.5">
            {card.problems.slice(0, 3).map((problem, index) => (
              <li key={`${problem.label}-${problem.value}-${index}`} className="flex gap-2 text-sm font-medium text-[#344054] dark:text-[#d4dae5]">
                <ProblemTypeBadge type={problem.type} />
                <span className="min-w-0 flex-1 truncate" title={problem.label}>{problem.label}</span>
                <span className="shrink-0 font-semibold">{formatNumberAuto(problem.value)} {problem.unit}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-8 text-center text-sm font-medium text-[#344054] dark:text-[#d4dae5]">No problem data</p>
        )}
        {hasProblems ? (
          <div id={problemTooltipId} className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg bg-[#101828] px-3 py-2 text-xs font-medium text-white shadow-lg transition ${isProblemTooltipOpen ? "visible opacity-100" : "invisible opacity-0"}`}>
            <ol className="space-y-1.5">
              {card.problems.map((problem, index) => (
                <li key={`${problem.label}-${problem.value}-${index}`} className="flex min-w-52 items-center gap-2">
                  <ProblemTypeBadge type={problem.type} />
                  <span className="min-w-0 flex-1">{problem.label}</span>
                  <span className="shrink-0 font-semibold">{formatNumberAuto(problem.value)} {problem.unit}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
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
      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {dashboard.cards.map((card) => <PackomCardView key={card.key} card={card} />)}
      </div>
    </section>
  );
}
