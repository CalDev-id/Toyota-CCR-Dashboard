import type { ProductionAchievementCard, ProductionLineStopDecision } from "@/features/production-achievement/types";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumberAuto(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(Math.abs(value) <= 1 ? value * 100 : value)}%`;
}

function roundDisplayedPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function formatTt(value: string) {
  return value.trim() || "-";
}

function formatStopTime(value: number) {
  return `${formatNumberAuto(value)} min`;
}

function formatProblemMinutes(value: number) {
  return `${formatNumberAuto(value)} min`;
}

function formatHours(value: number) {
  return `${formatNumberAuto(value)} jam`;
}

function formatLastUpdated(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function meetsOeeTarget(value: number | null, target: number | null) {
  if (value === null || target === null) {
    return false;
  }

  const normalizedValue = Math.abs(value) <= 1 ? value * 100 : value;
  const normalizedTarget = Math.abs(target) <= 1 ? target * 100 : target;

  return roundDisplayedPercent(normalizedValue) >= roundDisplayedPercent(normalizedTarget);
}

function getOeeTargetClass(value: number | null, target: number | null) {
  if (value === null || target === null) {
    return "text-[#b42318]";
  }

  const normalizedValue = Math.abs(value) <= 1 ? value * 100 : value;
  const normalizedTarget = Math.abs(target) <= 1 ? target * 100 : target;

  return roundDisplayedPercent(normalizedValue) >= roundDisplayedPercent(normalizedTarget)
    ? "text-[#027a48]"
    : "text-[#b42318]";
}

function getBalanceClass(value: number) {
  if (value < 0) {
    return "text-[#b42318]";
  }

  if (value > 0) {
    return "text-[#027a48]";
  }

  return "text-[#344054]";
}

function getOvertimeClass(actual: number, plan: number) {
  return actual < plan ? "text-[#b42318]" : "text-[#101828]";
}

function getDecisionStyle(decision?: ProductionLineStopDecision["decision"]) {
  if (decision === "RUNNING") {
    return {
      card: "border-[#e4e7ec] bg-white dark:border-[#273449] dark:bg-[#111827]",
      footer: "border-[#e4e7ec] bg-[#f9fafb] text-[#344054] dark:border-[#273449] dark:bg-[#162033] dark:text-[#d0d5dd]",
    };
  }

  if (decision === "CHOKOTEI") {
    return {
      card: "border-[#d6a15d] bg-[#fffcf5] dark:border-[#8a5b24] dark:bg-[#332408]",
      footer: "border-[#fec84b] bg-[#fffaeb] text-[#b54708] dark:border-[#b54708] dark:bg-[#3a2604] dark:text-[#fdb022]",
    };
  }

  if (decision === "LINE_STOP") {
    return {
      card: "border-[#f97066] bg-[#fffbfa] dark:border-[#b42318] dark:bg-[#351313]",
      footer: "border-[#fda29b] bg-[#fef3f2] text-[#b42318] dark:border-[#b42318] dark:bg-[#3b1111] dark:text-[#fda29b]",
    };
  }

  if (decision === "NO_PRODUCTION") {
    return {
      card: "border-[#f97066] bg-[#fffbfa] dark:border-[#b42318] dark:bg-[#351313]",
      footer: "border-[#fda29b] bg-[#fef3f2] text-[#b42318] dark:border-[#b42318] dark:bg-[#3b1111] dark:text-[#fda29b]",
    };
  }

  return {
    card: "border-[#e4e7ec] bg-white dark:border-[#273449] dark:bg-[#111827]",
    footer: "",
  };
}

function MetricTile({
  label,
  value,
  tooltip,
  tooltipClassName = "",
  valueClassName = "text-[#101828]",
  valueSizeClassName = "text-lg",
}: {
  label: string;
  value: ReactNode;
  tooltip?: ReactNode;
  tooltipClassName?: string;
  valueClassName?: string;
  valueSizeClassName?: string;
}) {
  return (
    <div className="group relative flex min-h-[64px] flex-col justify-between rounded-lg bg-[#f9fafb] px-3 py-2.5 dark:bg-[#162033]">
      <p className="whitespace-pre-line text-xs font-semibold text-[#667085] dark:text-[#a7b0c0]">
        {label}
      </p>
      <p
        className={`whitespace-nowrap text-right font-semibold leading-none tracking-normal ${valueSizeClassName} ${valueClassName}`}
      >
        {value}
      </p>
      {tooltip ? (
        <div className={`pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg bg-[#101828] px-3 py-2 text-left text-xs font-medium leading-5 text-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 ${tooltipClassName}`}>
          {tooltip}
        </div>
      ) : null}
    </div>
  );
}

function TooltipMetricRow({
  label,
  value,
  unit = "units",
  tone = "default",
}: {
  label: string;
  value: number | null;
  unit?: "units" | "min" | "%";
  tone?: "default" | "plan";
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="text-[#d0d5dd]">{label}</span>
      <span className={`font-bold tabular-nums ${tone === "plan" ? "text-[#fecdca]" : "text-white"}`}>
        {unit === "%" ? formatPercent(value) : value === null ? "-" : formatNumber(value)}
        {unit !== "%" ? <span className="text-[10px] font-medium text-[#98a2b3]"> {unit}</span> : null}
      </span>
    </div>
  );
}

function SummaryMetricBadge({ label }: { label: "OEE" | "AV" | "PE" | "RQ" }) {
  const className =
    label === "OEE"
      ? "bg-[#ecfdf3] text-[#027a48] dark:bg-[#062b1b] dark:text-[#75e0a7]"
      : label === "AV"
        ? "bg-[#fef3f2] text-[#b42318] dark:bg-[#3b1111] dark:text-[#fda29b]"
        : label === "PE"
          ? "bg-[#fffaeb] text-[#b54708] dark:bg-[#3a2604] dark:text-[#fdb022]"
          : "bg-[#ecf3ff] text-[#465fff] dark:bg-[#14245a] dark:text-[#8da2ff]";

  return (
    <span className={`grid h-5 min-w-7 place-items-center rounded px-1.5 text-[10px] font-bold ${className}`}>
      {label}
    </span>
  );
}

function OeeMetricValue({
  value,
  target,
}: {
  value: number | null;
  target: number | null;
}) {
  return (
    <span className="whitespace-nowrap text-xl leading-none">
      {formatPercent(value)}
      <span className="ml-1 text-xs font-semibold opacity-75">
        / {formatPercent(target)}
      </span>
    </span>
  );
}

function TaktTimeMetricValue({
  actual,
  plan,
}: {
  actual: string;
  plan: string;
}) {
  return (
    <span className="whitespace-nowrap text-xl leading-none">
      {formatTt(actual)}
      <span className="ml-1 text-xs font-semibold opacity-75">
        / {formatTt(plan)}
      </span>
    </span>
  );
}

function ProductionMetricValue({ actual, plan }: { actual: number; plan: number }) {
  return (
    <span className="whitespace-nowrap text-[1.65rem] leading-none">
      {formatNumberAuto(actual)}
      <span className="ml-1 text-base font-semibold opacity-75">
        / {formatNumber(plan)}
      </span>
    </span>
  );
}

function OvertimeMetricValue({ actual, plan }: { actual: number; plan: number }) {
  return (
    <span className="whitespace-nowrap text-xl leading-none">
      {formatNumberAuto(actual)}
      <span className="ml-1 text-xs font-semibold opacity-75">
        / {formatNumberAuto(plan)}
      </span>
    </span>
  );
}

function WorkHoursTooltip({
  planMinutes,
  actualHours,
}: {
  planMinutes: number;
  actualHours: number | null;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[#d0d5dd]">Work Hours Plan</span>
        <span className="font-bold tabular-nums text-white">
          {formatHours(planMinutes / 60)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[#d0d5dd]">Work Hours Actual</span>
        <span className="font-bold tabular-nums text-white">
          {actualHours === null ? "-" : formatHours(actualHours)}
        </span>
      </div>
    </div>
  );
}

function ProblemTypeBadge({ type }: { type?: "AV" | "PE" | "RQ" }) {
  if (!type) {
    return null;
  }

  const className =
    type === "AV"
      ? "bg-[#fef3f2] text-[#b42318] dark:bg-[#3b1111] dark:text-[#fda29b]"
      : type === "PE"
        ? "bg-[#fffaeb] text-[#b54708] dark:bg-[#3a2604] dark:text-[#fdb022]"
        : "bg-[#ecf3ff] text-[#465fff] dark:bg-[#14245a] dark:text-[#8da2ff]";

  return (
    <span
      className={`grid h-5 min-w-6 shrink-0 place-items-center rounded px-1.5 text-[10px] font-bold ${className}`}
    >
      {type}
    </span>
  );
}

export default function ProductionAchievementCardView({
  card,
  lineStopDecision,
}: {
  card: ProductionAchievementCard;
  lineStopDecision?: ProductionLineStopDecision;
}) {
  const isTargetMet = meetsOeeTarget(card.oee, card.oeeTarget);
  const targetLabel = formatPercent(card.oeeTarget);
  const hasProblems = card.problems.length > 0;
  const decisionStyle = getDecisionStyle(lineStopDecision?.decision);
  const { AV: avStopTime, PE: peStopTime, RQ: rqStopTime } =
    card.stopTimeByType ?? { AV: 0, PE: 0, RQ: 0 };
  const [isProblemTooltipOpen, setIsProblemTooltipOpen] = useState(false);
  const problemPanelRef = useRef<HTMLDivElement>(null);
  const problemTooltipId = `problem-tooltip-${card.key}`;

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
    <div className="w-[320px] shrink-0 xl:w-full xl:min-w-0 xl:shrink">
      <article className={`relative flex min-h-[500px] w-full flex-col rounded-2xl border p-4 shadow-sm ${decisionStyle.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">
            {card.label}
          </h2>
          {card.key !== "assy" ? (
            <p className="mt-1 text-xs font-medium text-[#667085] dark:text-[#a7b0c0]">
              Last updated: {formatLastUpdated(card.lastUpdatedAt)}
            </p>
          ) : (
            <p className="mt-1 text-xs font-medium text-[#667085] dark:text-[#a7b0c0]">
              Belum realtime • Update tiap jam
            </p>
          )}
        </div>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            isTargetMet
              ? "bg-[#ecfdf3] text-[#039855] dark:bg-[#062b1b] dark:text-[#75e0a7]"
              : "bg-[#fef3f2] text-[#d92d20] dark:bg-[#3b1111] dark:text-[#fda29b]"
          }`}
          aria-label={isTargetMet ? "OEE target met" : "OEE below target"}
          title={isTargetMet ? `OEE >= ${targetLabel}` : `OEE < ${targetLabel}`}
        >
          {isTargetMet ? (
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="10"
                cy="10"
                r="5.75"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l8 8M14 6l-8 8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.4"
              />
            </svg>
          )}
        </span>
      </div>

      <div className="mt-4 grid h-36 place-items-center rounded-xl bg-[#f9fafb] dark:bg-[#162033]">
        <Image
          src={card.imageSrc}
          alt={`${card.label} production part`}
          width={220}
          height={150}
          loading="eager"
          className="max-h-32 w-auto max-w-[88%] object-contain"
        />
      </div>

      <div className="relative">
      <div className="mt-4 grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            label="Prod."
            value={<ProductionMetricValue actual={card.prodAct} plan={card.prodPlan} />}
            tooltip={
              <div className="w-52 rounded-md bg-[#101828] px-3 py-2.5">
                <div className="space-y-2 text-xs">
                  <TooltipMetricRow label="Prod Input" value={card.prodInput} />
                  <TooltipMetricRow label="Prod Scan" value={card.prodScan} />
                  <TooltipMetricRow label="Total Plan" value={card.totalDailyProdPlan} tone="plan" />
                </div>
              </div>
            }
            tooltipClassName="border-0 bg-transparent p-0 leading-normal shadow-none"
            valueSizeClassName="text-2xl"
          />
          <MetricTile
            label="OEE"
            value={<OeeMetricValue value={card.oee} target={card.oeeTarget} />}
            tooltip={
              <div className="w-36 space-y-2">
                <span className="flex items-center justify-between gap-4"><SummaryMetricBadge label="OEE" /> {formatPercent(card.summaryOee)}</span>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <span className="space-y-1"><SummaryMetricBadge label="AV" /><span className="block">{formatPercent(card.av)}</span></span>
                  <span className="space-y-1"><SummaryMetricBadge label="PE" /><span className="block">{formatPercent(card.pe)}</span></span>
                  <span className="space-y-1"><SummaryMetricBadge label="RQ" /><span className="block">{formatPercent(card.rq)}</span></span>
                </div>
              </div>
            }
            valueClassName={getOeeTargetClass(card.oee, card.oeeTarget)}
            valueSizeClassName="text-xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            label="Balance"
            value={formatNumber(card.balance)}
            valueClassName={getBalanceClass(card.balance)}
            valueSizeClassName="text-xl"
          />
          <MetricTile
            label="Overtime"
            value={<OvertimeMetricValue actual={card.otAct} plan={card.otPlan} />}
            tooltip={
              card.key === "assy" ? undefined : (
                <WorkHoursTooltip
                  planMinutes={card.workHoursPlanMinutes}
                  actualHours={card.actualWorkHours}
                />
              )
            }
            valueClassName={getOvertimeClass(card.otAct, card.otPlan)}
            valueSizeClassName="text-xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            label="Takt Time"
            value={<TaktTimeMetricValue actual={card.ttAct} plan={card.ttPlan} />}
            valueSizeClassName="text-xl"
          />
          <MetricTile
            label="Stop Time"
            value={formatStopTime(card.stopTime)}
            tooltip={<div className="space-y-1"><span className="flex items-center justify-between gap-4"><ProblemTypeBadge type="AV" /> {formatProblemMinutes(avStopTime)}</span><span className="flex items-center justify-between gap-4"><ProblemTypeBadge type="PE" /> {formatProblemMinutes(peStopTime)}</span><span className="flex items-center justify-between gap-4"><ProblemTypeBadge type="RQ" /> {formatProblemMinutes(rqStopTime)}</span></div>}
            valueSizeClassName="text-lg"
          />
        </div>
      </div>

      <div className="mt-5 min-h-[122px]">
        {card.variants.length ? (
          <div className="overflow-hidden rounded-xl border border-[#e4e7ec] dark:border-[#273449]">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-[#f9fafb] text-[#667085] dark:bg-[#162033] dark:text-[#a7b0c0]">
                <tr>
                  <th className="w-[34%] px-4 py-2.5 text-left font-semibold">
                    Type
                  </th>
                  <th className="w-[22%] px-3 py-2.5 text-right font-semibold">
                    Plan
                  </th>
                  <th className="w-[22%] px-3 py-2.5 text-right font-semibold">
                    Act
                  </th>
                  <th className="w-[22%] px-4 py-2.5 text-right font-semibold">
                    Bal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec] dark:divide-[#273449]">
                {card.variants.map((variant) => (
                  <tr key={variant.name}>
                    <td className="truncate px-4 py-2.5 font-semibold text-[#101828] dark:text-[#f8fafc]">
                      {variant.name}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-[#667085] dark:text-[#a7b0c0]">
                      {formatNumber(variant.prodPlan)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-[#667085] dark:text-[#a7b0c0]">
                      {formatNumberAuto(variant.prodAct)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold ${getBalanceClass(
                        variant.balance,
                      )}`}
                    >
                      {formatNumber(variant.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-[122px] place-items-center rounded-xl border border-dashed border-[#d0d5dd] px-3 py-4 text-center text-xs font-medium text-[#98a2b3] dark:border-[#384860] dark:text-[#7f8a9d]">
            No variant breakdown
          </div>
        )}
      </div>

      <div
        ref={problemPanelRef}
        aria-controls={hasProblems ? problemTooltipId : undefined}
        aria-expanded={hasProblems ? isProblemTooltipOpen : undefined}
        className={`relative mt-5 min-h-[122px] rounded-xl border px-3 py-3 ${
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
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
            hasProblems
              ? "text-[#b42318] dark:text-[#fda29b]"
              : "text-[#667085] dark:text-[#a7b0c0]"
            }`}
          >
            Problem
          </p>
          {hasProblems ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 text-[#b42318] dark:text-[#fda29b]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M12 16v-4M12 8h.01" /><circle cx="12" cy="12" r="9" /></svg>
          ) : null}
        </div>
        {hasProblems ? (
          <ol className="mt-2 space-y-1.5">
            {card.problems.slice(0, 3).map((problem, index) => {
              const unit = problem.unit ? ` ${problem.unit}` : "";

              return (
                <li
                  key={`${problem.label}-${problem.value}-${index}`}
                  className="flex gap-2 text-sm font-medium text-[#344054] dark:text-[#d4dae5]"
                >
                  <ProblemTypeBadge type={problem.type} />
                  <span className="min-w-0 flex-1 truncate" title={problem.label}>
                    {problem.label}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatNumberAuto(problem.value)}
                    {unit}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-8 text-center text-sm font-medium text-[#344054] dark:text-[#d4dae5]">
            No problem data
          </p>
        )}
        {hasProblems ? (
          <div id={problemTooltipId} className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg bg-[#101828] px-3 py-2 text-xs font-medium text-white shadow-lg transition ${isProblemTooltipOpen ? "visible opacity-100" : "invisible opacity-0"}`}>
            <ol className="space-y-1.5">
              {card.problems.map((problem, index) => (
                <li key={`${problem.label}-${problem.value}-${index}`} className="flex min-w-52 items-center gap-2">
                  <ProblemTypeBadge type={problem.type} />
                  <span className="min-w-0 flex-1">{problem.label}</span>
                  <span className="shrink-0 font-semibold">{formatNumberAuto(problem.value)}{problem.unit ? ` ${problem.unit}` : ""}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
      {!card.hasData ? (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-white/55 text-lg font-semibold text-[#344054] backdrop-blur-sm dark:bg-[#111827]/55 dark:text-[#d4dae5]">
          No Data
        </div>
      ) : null}
      </div>

      </article>

      {lineStopDecision ? (
        <div className={`mt-3 rounded-xl border px-3 py-3 shadow-sm ${decisionStyle.footer}`}>
          <p className="text-sm font-bold tracking-wide">{lineStopDecision.decision.replaceAll("_", " ")}</p>
          <p className="mt-1 text-xs font-medium opacity-85">PIC: {lineStopDecision.decidedByName} · {formatLastUpdated(lineStopDecision.decidedAt)}</p>
        </div>
      ) : null}

    </div>
  );
}
