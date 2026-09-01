import type {
  AnalysisGapSeriesRow as GapSeriesRow,
  AnalysisAsakaiShipmentVanning,
  AnalysisShipmentVanningDestination,
  AnalysisMachiningAdvancedStock,
  AnalysisMachiningBalanceStock,
  AnalysisMachiningEmergencyStock,
  AnalysisMachiningModuleExportStock,
  AnalysisEmergencyStockMetrics,
  AnalysisResponse,
  AnalysisOeeCard as OeeCard,
  AnalysisOeeSeriesRow as SeriesRow,
  AnalysisShiftSeriesRow as ShiftSeriesRow,
} from "@/features/analysis/types";
import DailyGapChart from "@/features/analysis/components/DailyGapChart";
import DailyShiftPercentChart from "@/features/analysis/components/DailyShiftPercentChart";
import PercentLineCanvasChart from "@/features/analysis/components/PercentLineCanvasChart";
import {
  type AnalysisChartLine,
  formatMonthLabel,
  formatNumber,
  formatUnit,
  getPrimaryShiftLabel,
  isSingleShiftLine,
} from "@/features/analysis/components/analysisChartUtils";
import { useEffect, useRef, useState } from "react";

function ProblemBadge({ type }: { type: "AV" | "PE" }) {
  const className =
    type === "AV"
      ? "bg-[#fef3f2] text-[#b42318]"
      : "bg-[#fffaeb] text-[#b54708]";

  return (
    <span className={`grid h-5 min-w-6 place-items-center rounded px-1.5 text-[10px] font-bold ${className}`}>
      {type}
    </span>
  );
}

const machiningStockGroups = [
  {
    title: "Cyl Block",
    rows: [
      { line: "CB 1", children: ["Local", "Export"] },
      { line: "CB 2", children: ["Local", "Export"] },
    ],
  },
  {
    title: "Cyl Head",
    rows: [
      { line: "CH 1", children: ["Local", "Export"] },
      { line: "CH 2", children: ["Local", "Export"] },
    ],
  },
  {
    title: "Crankshaft",
    rows: [
      { line: "CR 1", children: ["Local", "Export"] },
      { line: "CR 2", children: ["Local", "Export"] },
    ],
  },
  {
    title: "Camshaft",
    rows: [
      { line: "CAM 1", children: ["Local", "Export"] },
      { line: "CAM 2", children: ["Local", "Export"] },
    ],
  },
];

const machiningExportGroups = [
  {
    title: "Cyl Block",
    rows: [{ line: "CB 1" }, { line: "CB 2" }],
  },
  {
    title: "Cyl Head",
    rows: [{ line: "CH 1" }, { line: "CH 2" }],
  },
  {
    title: "Crankshaft",
    rows: [{ line: "CR 1" }, { line: "CR 2" }],
  },
  {
    title: "Camshaft",
    rows: [{ line: "CAM 1" }, { line: "CAM 2" }],
  },
];

const machiningStockColumns = [
  "Balance Pallet",
  "Target Pallet",
  "Act Pallet",
  "Act Unit",
  "Act Day",
];

const advancedStockVariants: Array<{
  key?: keyof AnalysisMachiningAdvancedStock;
  label: string;
}> = [
  { label: "All Variant" },
  { key: "cylBlock", label: "2TR STM [K2]" },
  { key: "cylHead", label: "2TR STM [K7]" },
  { key: "crankshaft", label: "2TR STM [K4]" },
  { key: "camshaft", label: "No.1 & No.2 [K5]" },
];

type LsrDummyConfig = {
  partName: string;
  kpi: {
    r: number;
    w: number;
    totalDMinusOne: number;
    monthTotal: number;
    allowance: number;
  };
  amountBase: number[];
  target: number;
  chartMax: number;
  weekly: number[];
  weeklyTotal: number;
};

const lsrDummyConfigs: LsrDummyConfig[] = [
  {
    partName: "CB",
    kpi: { r: 12.8, w: 8.9, totalDMinusOne: 21.7, monthTotal: 299, allowance: 129.13 },
    amountBase: [6.1, 9.4, 15.8, 30.7, 37, 40.2, 17.2, 9.4, 14.9, 28.2, 19.2, 17.5, 0, 0],
    target: 6.1,
    chartMax: 60,
    weekly: [17, 296, 208, 43],
    weeklyTotal: 564,
  },
  {
    partName: "CH",
    kpi: { r: 4.7, w: 18.4, totalDMinusOne: 23.1, monthTotal: 234, allowance: 425.64 },
    amountBase: [1.2, 20.3, 23.5, 33.4, 13.8, 9.8, 4.9, 11.9, 18.3, 15.5, 25.2, 0, 0],
    target: 20.3,
    chartMax: 60,
    weekly: [30, 172, 138, 29],
    weeklyTotal: 369,
  },
  {
    partName: "CR",
    kpi: { r: 0, w: 3.1, totalDMinusOne: 3.1, monthTotal: 52, allowance: 115.86 },
    amountBase: [5.5, 4.5, 7.7, 7.7, 1.5, 2.1, 3.2, 0, 0],
    target: 5.5,
    chartMax: 60,
    weekly: [12, 136, 58, 11],
    weeklyTotal: 217,
  },
  {
    partName: "CA",
    kpi: { r: 0.1, w: 0.4, totalDMinusOne: 0.5, monthTotal: 10, allowance: 184.17 },
    amountBase: [0, 1.04, 0.71, 0.66, 0, 1.04, 1.44, 1.63, 0.66, 1.19, 0, 0],
    target: 0,
    chartMax: 2,
    weekly: [0, 289, 319, 59],
    weeklyTotal: 667,
  },
];

function formatLsrAmount(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}M`;
}

function formatLsrAllowance(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${Math.trunc(value / 1_000_000)}M`;
  if (absolute >= 1_000) return `${Math.trunc(value / 1_000)}K`;
  return String(Math.trunc(value));
}

function LsrAmountBaseChart({ config, amountBase, selectedDate }: { config: LsrDummyConfig; amountBase?: AnalysisResponse["lsrAmountBase"]["CB"]; selectedDate?: string }) {
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const amountCount = amountBase?.daily.length ?? 0;
  const width = Math.max(320, amountCount * 22 + 36);
  const height = 144;
  const padding = { top: 18, right: 8, bottom: 24, left: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const amounts = amountBase?.daily ?? [];
  const barWidth = amountCount ? Math.max(5, (plotWidth / amountCount) * 0.6) : 0;
  const max = amountBase?.chartMax ?? 20;
  const target = amountBase?.targetDaily ?? 0;
  const targetY = padding.top + plotHeight - (target / max) * plotHeight;
  const gridValues = [max, max / 2, 0];

  useEffect(() => {
    const container = chartScrollRef.current;
    if (container) container.scrollLeft = container.scrollWidth;
  }, [amountCount, selectedDate]);

  return (
    <article className="min-w-0 rounded-2xl border border-[#e4e7ec] bg-white p-3 shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
      <h3 className="text-xs font-semibold text-[#101828] dark:text-[#f8fafc]">LSR Amount Base</h3>
      <div ref={chartScrollRef} className="mt-1 overflow-x-auto rounded-xl bg-[#f9fafb] px-2 pb-0 pt-2 dark:bg-[#162033]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-[144px]"
          style={{ width }}
          role="img"
          aria-label={`LSR Amount Base chart for ${config.partName}`}
        >
          {gridValues.map((value) => {
            const y = padding.top + plotHeight - (value / max) * plotHeight;
            return (
              <g key={value}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--border-strong)" strokeDasharray="2 3" strokeWidth="0.75" />
                <text x={2} y={y + 3} fill="var(--text-muted)" fontSize="10">{formatLsrAmount(value)}</text>
              </g>
            );
          })}
          {amountBase?.targetDaily != null && (
            <>
              <line x1={padding.left} x2={width - padding.right} y1={targetY} y2={targetY} stroke="var(--error-text)" strokeDasharray="5 4" strokeWidth="1.5" />
              <text x={padding.left + 2} y={targetY - 4} fill="var(--error-text)" fontSize="10" fontWeight="700">{formatLsrAmount(target)}</text>
            </>
          )}
          {amounts.map(({ amount, date }, index) => {
            const x = padding.left + ((index + 0.5) / amountCount) * plotWidth;
            const barHeight = (amount / max) * plotHeight;
            const y = padding.top + plotHeight - barHeight;
            const labelY = Math.max(padding.top + 8, y - 3);

            return (
              <g key={`${config.partName}-${date}`}>
                <rect x={x - barWidth / 2} y={y} width={barWidth} height={barHeight} rx="1" fill="var(--brand-500)" />
                {amount > 0 && <text x={x} y={labelY} textAnchor="middle" fill="var(--foreground)" fontSize="9" fontWeight="700">{formatLsrAmount(amount)}</text>}
                <text x={x} y={height - 5} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{Number(date.slice(-2)) || index + 1}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-1 text-center text-[11px] font-medium leading-none text-[#667085] dark:text-[#a7b0c0]">
        {selectedDate ? new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(`${selectedDate.slice(0, 7)}-01T00:00:00`)) : ""}
      </p>
    </article>
  );
}

function weeklyRange(month: string | undefined, index: number) {
  if (!month) return "";
  const [year, monthNumber] = month.slice(0, 7).split("-").map(Number); const firstWeekday = new Date(year, monthNumber - 1, 1).getDay(); const lastDay = new Date(year, monthNumber, 0).getDate();
  const start = index === 0 ? 1 : 8 - firstWeekday + (index - 1) * 7; const end = Math.min(lastDay, index === 0 ? 7 - firstWeekday : start + 6);
  return `${String(start).padStart(2, "0")}/${String(monthNumber).padStart(2, "0")}/${year} – ${String(end).padStart(2, "0")}/${String(monthNumber).padStart(2, "0")}/${year}`;
}
function LsrWeeklyTable({ config, weekly, selectedDate }: { config: LsrDummyConfig; weekly?: { weekly: number[]; total: number }; selectedDate?: string }) {
  const values = weekly?.weekly ?? config.weekly; const total = weekly?.total ?? config.weeklyTotal;
  return (
    <article className="min-w-0 rounded-2xl border border-[#e4e7ec] bg-white p-3 shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
      <h3 className="text-xs font-semibold text-[#101828] dark:text-[#f8fafc]">LSR Unit Base (Weekly)</h3>
      <div className="mt-1 overflow-visible rounded-xl border border-[#e4e7ec] dark:border-[#2f4059]">
        <table className="w-full table-fixed text-center text-[11px]">
          <thead className="bg-[#f9fafb] text-[#667085] dark:bg-[#18243a] dark:text-[#b7c2d8]">
            <tr>
              <th className="px-1 py-1.5 text-left font-bold leading-tight">PART<br />NAME</th>
              {values.map((_, index) => <th key={index} className="group relative cursor-help px-1 py-1.5 font-bold"><span>{index + 1}</span><span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden w-max max-w-40 -translate-x-1/2 rounded-md bg-[#101828] px-2 py-1 text-[10px] font-medium normal-case text-white shadow-lg group-hover:block dark:bg-[#f8fafc] dark:text-[#101828]">{weeklyRange(selectedDate, index)}</span></th>)}
              <th className="px-1 py-1.5 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#ecf3ff] text-[#344054] dark:bg-[#14245a] dark:text-[#e4e7ec]">
              <td className="px-1 py-1.5 text-left font-semibold">{config.partName}</td>
              {values.map((value, index) => <td key={`${config.partName}-${index}`} className="px-1 py-1.5 font-semibold">{value}</td>)}
              <td className="bg-[#f9fafb] px-1 py-1.5 font-bold text-[#344054] dark:bg-[#18243a] dark:text-[#f8fafc]">{total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

function LsrMachiningCard({ config, weekly, kpi, amountBase, selectedDate }: { config: LsrDummyConfig; weekly?: { weekly: number[]; total: number }; kpi?: AnalysisResponse["lsrKpi"]["CB"]; amountBase?: AnalysisResponse["lsrAmountBase"]["CB"]; selectedDate?: string }) {
  const displayKpi = kpi ?? { r: 0, w: 0, totalDMinusOne: 0, monthTotal: 0, allowance: null };
  const kpis = [
    ["R", displayKpi.r],
    ["W", displayKpi.w],
    ["Total (D-2)", displayKpi.totalDMinusOne],
  ] as const;

  return (
    <section className="flex min-h-[420px] min-w-0 flex-col gap-2">
      <div className="px-1">
        <h2 className="text-sm font-semibold text-[#101828] dark:text-[#f8fafc]">LSR <span className="text-xs font-medium text-[#667085] dark:text-[#a7b0c0]">(Line Supply Request) *Mio</span></h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {kpis.map(([label, value]) => (
          <div key={label} className={`rounded-xl border border-[#e4e7ec] bg-white p-2 shadow-sm dark:border-[#2f4059] dark:bg-[#111827] ${label === "R" ? "text-[#b42318] dark:text-[#ff6b6b]" : "text-[#344054] dark:text-[#e4e7ec]"}`}>
            <p className="text-xs font-bold">{label}</p>
            <p className="mt-0.5 text-sm font-bold">{formatLsrAmount(value)}</p>
          </div>
        ))}
      </div>
        <div className="mt-2">
          <p className="text-center text-xs font-medium text-[#667085] dark:text-[#a7b0c0]">Month</p>
          <div className="mt-1 grid grid-cols-2 gap-2 text-center text-xs font-medium text-[#667085] dark:text-[#a7b0c0]">
            <div className="rounded-xl border border-[#e4e7ec] bg-white p-2 shadow-sm dark:border-[#2f4059] dark:bg-[#111827]"><p>Total</p><p className="mt-0.5 text-sm font-bold text-[#101828] dark:text-[#f8fafc]">{formatLsrAmount(displayKpi.monthTotal)}</p></div>
            <div className="rounded-xl border border-[#e4e7ec] bg-white p-2 shadow-sm dark:border-[#2f4059] dark:bg-[#111827]"><p>Allowance</p><p className="mt-0.5 text-sm font-bold text-[#101828] dark:text-[#f8fafc]">{displayKpi.allowance === null ? "-" : formatLsrAllowance(displayKpi.allowance)}</p></div>
          </div>
        </div>
      </div>
      <LsrAmountBaseChart config={config} amountBase={amountBase} selectedDate={selectedDate} />
      <LsrWeeklyTable config={config} weekly={weekly} selectedDate={selectedDate} />
    </section>
  );
}

type ExpandableStockRow = {
  line: string;
  children?: string[];
};

const machiningStockMetricKeys: Array<keyof AnalysisEmergencyStockMetrics> = [
  "balancePallet",
  "targetPallet",
  "actPallet",
  "actUnit",
  "actDay",
];

function StockMetricCells({ metrics }: { metrics?: AnalysisEmergencyStockMetrics }) {
  return machiningStockMetricKeys.map((key) => (
    <td key={key} className={metrics ? "px-1.5 py-2 text-center font-medium text-[#344054]" : "px-1.5 py-2 text-center text-[#98a2b3]"}>
      {metrics ? (key === "actDay" ? formatNumber(metrics[key], 1) : formatUnit(metrics[key])) : "-"}
    </td>
  ));
}

function ExpandableStockTable({
  rows,
  tone,
  machiningStock,
  machiningModuleExportStock,
}: {
  rows: ExpandableStockRow[];
  tone: "gray" | "blue";
  machiningStock?: AnalysisMachiningEmergencyStock;
  machiningModuleExportStock?: AnalysisMachiningModuleExportStock;
}) {
  const isBlue = tone === "blue";
  const [expandedLines, setExpandedLines] = useState<Set<string>>(
    () => new Set(
      (isBlue ? rows.slice(0, 1) : rows.slice(1, 2))
        .filter((row) => isBlue || row.children?.length)
        .map((row) => row.line),
    ),
  );

  function toggleLine(line: string) {
    setExpandedLines((current) => {
      const next = new Set(current);

      if (next.has(line)) {
        next.delete(line);
      } else {
        next.add(line);
      }

      return next;
    });
  }

  return (
    <div className="mt-3 overflow-x-auto pb-2">
      <table className="w-full min-w-[384px] table-fixed text-left text-xs">
        <thead className={isBlue ? "bg-[#eff8ff] text-[#175cd3] dark:bg-[#14245a] dark:text-[#a6b6ff]" : "bg-[#f9fafb] text-[#667085]"}>
          <tr>
            <th className="rounded-l-lg px-1.5 py-2 text-left font-semibold">Line</th>
            {machiningStockColumns.map((column, index) => (
              <th
                key={column}
                className={`px-1.5 py-2 text-center font-semibold ${
                  index === machiningStockColumns.length - 1 ? "rounded-r-lg" : ""
                }`}
              >
                {(isBlue && column === "Act Pallet" ? "Act Module" : column).split(" ").map((word) => (
                  <span key={word} className="block">{word}</span>
                ))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eaecf0] text-[#344054]">
          {rows.flatMap((row) => {
            const stockKey = ({
              "CB 1": "cb1",
              "CB 2": "cb2",
              "CH 1": "ch1",
              "CH 2": "ch2",
              "CR 1": "cr1",
              "CR 2": "cr2",
              "CAM 1": "cam1",
              "CAM 2": "cam2",
            } as const)[row.line];
            const moduleMetrics = stockKey ? machiningModuleExportStock?.[stockKey] : undefined;
            const isExpandable = isBlue
              ? Boolean(moduleMetrics && Object.keys(moduleMetrics.modules).length)
              : Boolean(row.children?.length);
            const isExpanded = isExpandable && expandedLines.has(row.line);
            const parentMetrics = stockKey
              ? isBlue ? moduleMetrics?.total : machiningStock?.[stockKey].total
              : undefined;
            const parentRow = (
              <tr
                key={row.line}
                className={`bg-white dark:bg-[#111827] ${
                  isExpandable ? "cursor-pointer hover:bg-[#f9fafb] dark:hover:bg-[#162033]" : ""
                }`}
                role={isExpandable ? "button" : undefined}
                tabIndex={isExpandable ? 0 : undefined}
                aria-expanded={isExpandable ? isExpanded : undefined}
                onClick={isExpandable ? () => toggleLine(row.line) : undefined}
                onKeyDown={isExpandable ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleLine(row.line);
                  }
                } : undefined}
              >
                <td className="px-1.5 py-2 text-left font-semibold">
                  {isExpandable ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-left">
                      <svg
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                        className={`size-3 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      >
                        <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                      </svg>
                      {row.line}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap">{row.line}</span>
                  )}
                </td>
                <StockMetricCells metrics={parentMetrics} />
              </tr>
            );
            const children = isBlue
              ? Object.entries(moduleMetrics?.modules ?? {})
              : (row.children ?? []).map((child) => [child, undefined] as const);
            const childRows = isExpanded
              ? children.map(([child, moduleMetrics], index) => {
                  const childKey = child === "Local" ? "local" : child === "Export" ? "export" : null;
                  const childMetrics = isBlue
                    ? moduleMetrics
                    : stockKey && childKey ? machiningStock?.[stockKey][childKey] : undefined;

                  return (
                    <tr key={`${row.line}-${child}-${index}`} className={isBlue ? "bg-[#eff8ff] dark:bg-[#14245a]" : "bg-[#eaecf0] dark:bg-[#273449]"}>
                      <td className={`px-1.5 py-2 pl-6 text-left font-medium ${isBlue ? "text-[#175cd3] dark:text-[#a6b6ff]" : "text-[#475467] dark:text-[#d0d5dd]"}`}>
                        {child}
                      </td>
                      <StockMetricCells metrics={childMetrics} />
                    </tr>
                  );
                })
              : [];

            return [parentRow, ...childRows];
          })}
        </tbody>
      </table>
    </div>
  );
}

function DailyEfficiencyChart({
  line,
  series,
  monthLabel,
}: {
  line: AnalysisChartLine;
  series: ShiftSeriesRow[];
  monthLabel: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white px-4 pb-4 pt-4 shadow-sm">
      <div className="mb-5">
        <div>
          <h2 className="text-sm font-semibold text-[#101828]">Daily Efficiency</h2>
        </div>
      </div>

      <PercentLineCanvasChart
        line={line}
        series={series}
        monthLabel={monthLabel}
        ariaLabel={`${line.label} daily efficiency chart`}
      />
    </article>
  );
}

type VanningTableRow = {
  label: string;
  type: "plan" | "detail" | "total";
};

type VanningTableConfig = {
  columns: string[];
  columnTitles?: string[];
  rows: VanningTableRow[];
  values?: Array<Array<number | null>>;
};

const vanningConfigs: Record<
  Exclude<AnalysisChartLine["key"], "assyline">,
  { kamigo?: VanningTableConfig; stm: VanningTableConfig }
> = {
  cylblock: {
    kamigo: {
      columns: ["Kamigo", "13", "14"],
      rows: [
        { label: "CB-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "CD-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "Total [Plan]", type: "total" },
      ],
    },
    stm: {
      columns: ["STM", "10", "13", "14", "15"],
      rows: [
        { label: "K1-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "K2-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "Total [Plan]", type: "total" },
      ],
    },
  },
  cylhead: {
    kamigo: {
      columns: ["Kamigo", "14"],
      rows: [
        { label: "HC-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "HD-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "HE-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "HF-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "Total [Plan]", type: "total" },
      ],
    },
    stm: {
      columns: ["STM", "10", "13", "14", "15"],
      rows: [
        { label: "K6-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "K7-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "K8-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "Total [Plan]", type: "total" },
      ],
    },
  },
  crankshaft: {
    kamigo: {
      columns: ["Kamigo", "13", "16"],
      rows: [
        { label: "CS-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "CT-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "Total [Plan]", type: "total" },
      ],
    },
    stm: {
      columns: ["STM", "10", "13", "14", "15"],
      rows: [
        { label: "K3-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "K4-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "Total [Plan]", type: "total" },
      ],
    },
  },
  camshaft: {
    stm: {
      columns: ["STM", "10", "13", "14", "15", "16"],
      rows: [
        { label: "K5-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "Remain", type: "detail" },
        { label: "Total [Plan]", type: "total" },
      ],
    },
  },
};

function VanningTable({ columns, columnTitles, rows, values }: VanningTableConfig) {
  const isSingleDateKamigo = columns[0] === "Kamigo" && columns.length === 2;
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(
    () => new Set(rows.filter((row) => row.type === "plan").map((row) => row.label)),
  );
  const visibleRows: Array<{ row: VanningTableRow; index: number }> = [];
  let currentPlanLabel: string | undefined;

  for (const [index, row] of rows.entries()) {
    if (row.type === "plan") {
      currentPlanLabel = row.label;
      visibleRows.push({ row, index });
    } else if (row.type === "detail") {
      if (currentPlanLabel && expandedPlans.has(currentPlanLabel)) {
        visibleRows.push({ row, index });
      }
    }
  }

  const totalRow = rows.find((row) => row.type === "total");

  function togglePlan(label: string) {
    setExpandedPlans((current) => {
      const next = new Set(current);

      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }

      return next;
    });
  }

  return (
    <article className="h-[260px] min-w-0 rounded-xl border border-[#e4e7ec] bg-white p-2 shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
      <div className="vanning-table-scroll h-full overflow-auto">
        <table className="w-full min-w-[180px] table-fixed text-center text-xs">
          <colgroup>
            {columns.map((column, index) => (
              <col
                key={column}
                style={{
                  width: index === 0
                    ? "42%"
                    : `${58 / (columns.length - 1)}%`,
                }}
              />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[#756300] text-[#fff7c2]">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column}
                  title={columnTitles?.[index]}
                  className={`px-1 py-1.5 font-semibold ${
                    isSingleDateKamigo && index === 1 ? "relative -translate-x-6" : ""
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[#667085] dark:text-[#b7c2d8]">
            {visibleRows.map(({ row, index: rowIndex }) => (
              <tr
                key={`${row.label}-${rowIndex}`}
                className={`border-b border-[#eaecf0] dark:border-[#2f4059] ${
                  row.type === "plan"
                    ? "cursor-pointer bg-[#f9fafb] hover:bg-[#f2f4f7] dark:bg-[#18243a] dark:hover:bg-[#22314d]"
                    : "bg-white dark:bg-[#111827]"
                }`}
                role={row.type === "plan" ? "button" : undefined}
                tabIndex={row.type === "plan" ? 0 : undefined}
                aria-expanded={row.type === "plan" ? expandedPlans.has(row.label) : undefined}
                onClick={row.type === "plan" ? () => togglePlan(row.label) : undefined}
                onKeyDown={row.type === "plan" ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    togglePlan(row.label);
                  }
                } : undefined}
              >
                <td className={`px-1 py-1 text-left font-medium ${
                  row.type === "detail" ? "pl-4" : ""
                }`}>
                  {row.type === "plan" ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <svg
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                        className={`size-3 shrink-0 transition-transform ${
                          expandedPlans.has(row.label) ? "rotate-90" : ""
                        }`}
                      >
                        <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                      </svg>
                      {row.label}
                    </span>
                  ) : (
                    row.label
                  )}
                </td>
                {columns.slice(1).map((column, columnIndex) => (
                  <td
                    key={column}
                    className={`px-1 py-1 text-center ${
                      isSingleDateKamigo ? "relative -translate-x-6" : ""
                    }`}
                  >
                    {values?.[rowIndex]?.[columnIndex] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totalRow ? (
            <tfoot className="sticky bottom-0 z-10 bg-[#f2f4f7] text-[#667085] dark:bg-[#18243a] dark:text-[#b7c2d8]">
              <tr>
                <td className="px-1 py-1 text-center font-medium">
                  <span className="block">Total</span>
                  <span className="block">[Plan]</span>
                </td>
                {columns.slice(1).map((column, columnIndex) => (
                  <td
                    key={column}
                    className={`px-1 py-1 text-center ${
                      isSingleDateKamigo ? "relative -translate-x-6" : ""
                    }`}
                  >
                    {values?.[rows.indexOf(totalRow)]?.[columnIndex] ?? "-"}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </article>
  );
}

function formatVanningDateTitle(date: string) {
  const [, month, day] = date.split("-");
  const monthLabel = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1];
  return `${day} ${monthLabel}`;
}

function buildDynamicVanningTable(config: VanningTableConfig, destination: AnalysisShipmentVanningDestination): VanningTableConfig {
  let moduleCode = "";
  const values = config.rows.map((row) => {
    if (row.type === "total") return destination.totalPlan.map((value) => value || null);
    if (row.type === "plan") moduleCode = row.label.split("-", 1)[0];
    const metrics = destination.modules[moduleCode] ?? [];
    const field = row.type === "plan" ? "plan" : row.label.toLowerCase() as "finish" | "remain";
    return metrics.map((value) => value[field] || null);
  });

  return {
    ...config,
    columns: [config.columns[0], ...destination.dates.map((date) => date.slice(-2))],
    columnTitles: [config.columns[0], ...destination.dates.map(formatVanningDateTitle)],
    values,
  };
}

function buildShipmentVanningConfig(
  lineKey: Exclude<AnalysisChartLine["key"], "assyline">,
  vanning: AnalysisAsakaiShipmentVanning,
) {
  const config = vanningConfigs[lineKey];
  const lineVanning = vanning[lineKey];
  return {
    kamigo: config.kamigo && lineVanning.kamigo ? buildDynamicVanningTable(config.kamigo, lineVanning.kamigo) : config.kamigo,
    stm: lineVanning.stm ? buildDynamicVanningTable(config.stm, lineVanning.stm) : config.stm,
  };
}

function getVanningSummary(
  vanning: AnalysisAsakaiShipmentVanning | undefined,
  lineKey: Exclude<AnalysisChartLine["key"], "assyline">,
  selectedDate: string | undefined,
) {
  if (!selectedDate) return null;
  let planning = 0;
  let remaining = 0;
  let hasVanning = false;

  for (const destination of Object.values(vanning?.[lineKey] ?? {})) {
    if (!destination) continue;
    const index = destination.dates.indexOf(selectedDate);
    if (index === -1) continue;
    hasVanning = true;
    planning += destination.totalPlan[index] ?? 0;
    remaining += Object.values(destination.modules).reduce(
      (total, metrics) => total + (metrics[index]?.remain ?? 0),
      0,
    );
  }

  return { planning, remaining, hasVanning };
}

function formatTodayVanning(date: string | undefined) {
  if (!date) return "-";
  const [, month, day] = date.split("-").map(Number);
  return Number.isFinite(month) && Number.isFinite(day) ? `${day}/${month}` : "-";
}

function VanningModule({ lineKey, shipmentVanning, selectedDate }: {
  lineKey: AnalysisChartLine["key"];
  shipmentVanning?: AnalysisAsakaiShipmentVanning;
  selectedDate?: string;
}) {
  if (lineKey === "assyline") {
    return (
      <div className="h-[375px]">
        <article className="grid h-[375px] place-items-center rounded-2xl border border-[#e4e7ec] bg-white p-4 text-sm font-semibold text-[#98a2b3] shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
          Under Development
        </article>
      </div>
    );
  }

  const config = shipmentVanning ? buildShipmentVanningConfig(lineKey, shipmentVanning) : vanningConfigs[lineKey];
  const summary = getVanningSummary(shipmentVanning, lineKey, selectedDate);
  const summaryCards = [
    ["Today Vanning", formatTodayVanning(selectedDate)],
    ["Planning", summary?.hasVanning ? summary.planning : "-"],
    ["Remaining", summary?.hasVanning ? summary.remaining : "-"],
  ];

  return (
    <section className="h-[375px]">
      <h3 className="px-1 text-sm font-semibold text-[#101828] dark:text-[#f8fafc]">Vanning [Module]</h3>
      <div className="mt-2 grid grid-cols-[1fr_0.8fr_1fr] gap-2">
        {summaryCards.map(([label, value]) => {
          const hasRemaining = label === "Remaining" && typeof value === "number" && value > 0;
          return (
            <article key={label} className="min-w-0 rounded-xl border border-[#e4e7ec] bg-white p-2 text-center shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
              <p className="text-xs font-medium leading-tight text-[#667085] dark:text-[#b7c2d8]">{label}</p>
              <p className={`mt-1 text-sm font-semibold ${hasRemaining ? "text-[#b42318] dark:text-[#ff6b6b]" : "text-[#101828] dark:text-[#f8fafc]"}`}>{value}</p>
            </article>
          );
        })}
      </div>
      {config.kamigo ? (
        <div className="mt-2 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2">
          <div className="min-w-0">
            <h4 className="whitespace-nowrap px-1 pb-1 text-[11px] font-semibold leading-none text-[#344054] dark:text-[#e4e7ec]">This Week Vanning</h4>
            <VanningTable {...config.kamigo} />
          </div>
          <div className="min-w-0">
            <h4 className="whitespace-nowrap px-1 pb-1 text-[11px] font-semibold leading-none text-[#344054] dark:text-[#e4e7ec]">Date</h4>
            <VanningTable {...config.stm} />
          </div>
        </div>
      ) : (
        <div className="mt-2 min-w-0">
          <div className="flex items-center justify-between px-1 pb-1 text-[11px] font-semibold leading-none text-[#344054] dark:text-[#e4e7ec]">
            <h4 className="whitespace-nowrap">This Week Vanning</h4>
            <h4 className="whitespace-nowrap">Date</h4>
          </div>
          <VanningTable {...config.stm} />
        </div>
      )}
    </section>
  );
}

export function OeeLineChart({
  series,
  shiftSeries,
  avShiftSeries,
  peShiftSeries,
  rqShiftSeries,
  gapSeries,
  lines,
  cards,
  machiningEmergencyStock,
  machiningModuleExportStock,
  machiningAdvancedStock,
  machiningBalanceStock,
  shipmentVanning,
  selectedDate,
  portraitDisplay,
  lsrWeekly,
  lsrKpi,
  lsrAmountBase,
}: {
  series: SeriesRow[];
  shiftSeries: ShiftSeriesRow[];
  avShiftSeries: ShiftSeriesRow[];
  peShiftSeries: ShiftSeriesRow[];
  rqShiftSeries: ShiftSeriesRow[];
  gapSeries: GapSeriesRow[];
  lines: AnalysisChartLine[];
  cards: OeeCard[];
  machiningEmergencyStock?: AnalysisMachiningEmergencyStock;
  machiningModuleExportStock?: AnalysisMachiningModuleExportStock;
  machiningAdvancedStock?: AnalysisMachiningAdvancedStock;
  machiningBalanceStock?: AnalysisMachiningBalanceStock;
  shipmentVanning?: AnalysisAsakaiShipmentVanning;
  selectedDate?: string;
  portraitDisplay?: boolean;
  lsrWeekly?: AnalysisResponse["lsrWeekly"];
  lsrKpi?: AnalysisResponse["lsrKpi"];
  lsrAmountBase?: AnalysisResponse["lsrAmountBase"];
}) {
  const monthLabel = formatMonthLabel(series);

  return (
    <div className={`flex flex-col ${portraitDisplay ? "gap-2" : "gap-4"}`}>
      <div className={`grid ${portraitDisplay ? "grid-cols-5 gap-2" : "gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"}`}>
        {lines.map((line) => {
          const card = cards.find((item) => item.key === line.key);
          const isSingleShift = isSingleShiftLine(line);
          const primaryShiftLabel = getPrimaryShiftLabel(line);
          const overTimeItems = isSingleShift
            ? [
                ["OT Day", card?.otDay ?? 0],
                [`Cum. ${primaryShiftLabel}`, card?.cumR ?? 0],
              ]
            : [
                ["OT Day", card?.otDay ?? 0],
                ["OT NGT", card?.otNight ?? 0],
                ["Cum. R", card?.cumR ?? 0],
                ["Cum. W", card?.cumW ?? 0],
              ];
          return (
            <div key={line.key} className="flex min-w-0 flex-col gap-4">
              <DailyEfficiencyChart
                line={line}
                series={shiftSeries}
                monthLabel={monthLabel}
              />

              <section>
                <h3 className="px-1 text-sm font-semibold text-[#101828]">
                  Production Achievement
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {[
                    ["Balance(Unit)", card?.balance ?? null],
                    ["Balance Monthly", card?.balanceMonthly ?? null],
                  ].map(([label, value]) => (
                    <article key={label} className="min-w-0 rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-medium text-[#667085]">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-[#101828]">
                        {value === null ? "-" : formatUnit(value as number)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="px-1 text-sm font-semibold text-[#101828]">Prod. Over Time</h3>
                <div className="mt-3 flex gap-2">
                  {overTimeItems.map(([label, value]) => (
                    <article key={label} className="min-w-0 flex-1 rounded-2xl border border-[#e4e7ec] bg-white p-3 shadow-sm">
                      <p className="whitespace-nowrap text-[10px] font-medium text-[#667085]">{label}</p>
                      <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[#101828]">
                        {formatNumber(value as number)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <article className="flex h-[240px] flex-col rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#101828]">
                      <span className="block">Daily Gap OT Getsudo</span>
                      <span className="block">vs CCR</span>
                    </h3>
                  </div>
                  <div className="flex gap-4 text-right text-xs font-semibold">
                    <div>
                      <p className="text-[#f04438]">
                        {isSingleShift ? `Cum. ${primaryShiftLabel}` : "Cum. R"}
                      </p>
                      <p className="mt-1 text-[#b42318]">{formatNumber(card?.gapCumR ?? 0, 1)}</p>
                    </div>
                    {isSingleShift ? null : (
                      <div>
                        <p className="text-[#667085]">Cum. W</p>
                        <p className="mt-1 text-[#344054]">{formatNumber(card?.gapCumW ?? 0, 1)}</p>
                      </div>
                    )}
                  </div>
                </div>
                <DailyGapChart
                  series={gapSeries}
                  lineKey={line.key}
                  singleShift={isSingleShift}
                />
              </article>

              <section>
                <h3 className="px-1 text-sm font-semibold text-[#101828]">Note</h3>
                <article className="mt-3 rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
                  <div className="grid min-h-[96px] gap-2 rounded-xl bg-[#f9fafb] p-3">
                    {[
                      { shiftLabel: "Day", problem: card?.note.day },
                      { shiftLabel: "Night", problem: card?.note.night },
                    ].map(({ shiftLabel, problem }) => (
                      <div key={shiftLabel} className="grid min-w-0 grid-cols-[48px_32px_minmax(0,1fr)] items-center gap-2">
                        <p className={`w-fit rounded px-1.5 py-0.5 text-xs font-semibold ${
                          shiftLabel === "Day"
                            ? "bg-[#fef0c7] text-[#b54708] dark:bg-[#5f4300] dark:text-[#fedf89]"
                            : "bg-[#eef4ff] text-[#344054] dark:bg-[#1f3478] dark:text-[#d6e4ff]"
                        }`}>
                          {shiftLabel}
                        </p>
                        {problem ? (
                          <>
                            <ProblemBadge type={problem.type} />
                            <p className="min-w-0 truncate text-xs font-medium text-[#344054]" title={problem.label}>
                              {problem.label}
                            </p>
                          </>
                        ) : (
                          <p className="col-span-2 text-xs font-medium text-[#98a2b3]">No problem data</p>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <DailyShiftPercentChart
                title="Data RQ"
                line={line}
                series={rqShiftSeries}
                monthLabel={monthLabel}
              />

              <div className="px-1 py-1">
                <h3 className="text-sm font-semibold text-[#101828]">Data Line Stop</h3>
              </div>

              <DailyShiftPercentChart
                title="Daily AV"
                line={line}
                series={avShiftSeries}
                monthLabel={monthLabel}
              />

              <DailyShiftPercentChart
                title="Daily PE"
                line={line}
                series={peShiftSeries}
                monthLabel={monthLabel}
              />

              <VanningModule lineKey={line.key} shipmentVanning={shipmentVanning} selectedDate={selectedDate} />

              <section>
                <h3 className="px-1 text-sm font-semibold text-[#101828]">Balance Stock</h3>
                <div className="mt-1.5 flex gap-2.5">
                  {(line.key === "assyline"
                    ? [{ label: "Emergency Stock Domestic [Unit]", value: null }]
                    : [
                      { label: "Emergency Stock", value: machiningBalanceStock?.[line.key]?.emergency ?? null },
                      { label: "Export Module", value: machiningBalanceStock?.[line.key]?.exportModule ?? null },
                    ]
                  ).map(({ label, value }) => (
                    <article key={label} className="min-h-[90px] min-w-0 flex-1 rounded-2xl border border-[#e4e7ec] bg-white p-2.5 text-center shadow-sm">
                      <p className="text-xs font-medium leading-tight text-[#667085]">{label}</p>
                      {line.key !== "assyline" ? (
                        <p className="mt-0.5 text-xs font-medium leading-tight text-[#667085]">[Unit]</p>
                      ) : null}
                      <p className="mt-1 text-base font-semibold leading-tight text-[#101828]">{value === null ? "-" : formatUnit(value)}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          );
        })}
      </div>

      <section className={`grid ${portraitDisplay ? "grid-cols-5 gap-2" : "gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"}`}>
        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#101828]">
            Stock Engine Assy [Domestic]
          </h2>
          <div className="mt-4 grid min-h-44 place-items-center rounded-xl bg-[#f9fafb] p-4 text-center text-sm font-semibold text-[#98a2b3]">
            Under Development
          </div>
        </article>

        {machiningStockGroups.map((group) => (
          <article key={group.title} className="min-w-0 rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#101828]">
                Stock Emergency (Abu-Abu)
              </h2>
              <span
                className="grid size-5 shrink-0 place-items-center rounded-full bg-[#f2f4f7] text-xs font-bold text-[#667085] dark:bg-[#273449] dark:text-[#a7b0c0]"
                title="Informasi Stock Emergency"
                aria-label="Informasi Stock Emergency"
              >
                i
              </span>
            </div>
            <ExpandableStockTable
              rows={group.rows}
              tone="gray"
              machiningStock={machiningEmergencyStock}
            />
          </article>
        ))}
      </section>

      <section className={`grid ${portraitDisplay ? "grid-cols-5 gap-2" : "gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"}`}>
        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#101828]">
            Stock Engine Assy [Export]
          </h2>
          <div className="mt-4 grid min-h-44 place-items-center rounded-xl bg-[#f9fafb] p-4 text-center text-sm font-semibold text-[#98a2b3]">
            Under Development
          </div>
        </article>

        {machiningExportGroups.map((group) => (
          <article key={group.title} className="min-w-0 rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-[#101828]">
              Stock Module Export [Biru]
            </h2>
            <ExpandableStockTable
              rows={group.rows}
              tone="blue"
              machiningModuleExportStock={machiningModuleExportStock}
            />
          </article>
        ))}
      </section>

      <section className={`grid ${portraitDisplay ? "grid-cols-5 gap-2" : "gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"}`}>
        {advancedStockVariants.map((variant) => {
          const metrics = variant.key ? machiningAdvancedStock?.[variant.key] : undefined;

          return (
          <article key={variant.label} className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#101828]">Advanced Stock</h2>
              <p className="text-right text-xs font-semibold text-[#667085]">{variant.label}</p>
            </div>
            <div className="mt-3 flex gap-2.5">
              {[
                ["Actual", metrics ? metrics.actualUnit : null],
                ["Balance", metrics ? metrics.balanceUnit : null],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 flex-1 rounded-xl bg-[#f9fafb] p-2.5 text-center">
                  <p className="text-xs font-medium leading-tight text-[#667085]">
                    {label} [Unit]
                  </p>
                  <p className="mt-1 text-base font-semibold leading-tight text-[#101828]">
                    {value === null ? "-" : formatUnit(Number(value))}
                  </p>
                </div>
              ))}
            </div>
          </article>
          );
        })}
      </section>

      <section className={`grid ${portraitDisplay ? "grid-cols-5 gap-2" : "gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"}`}>
        <article className="grid min-h-[420px] place-items-center rounded-2xl border border-[#e4e7ec] bg-white p-4 text-center text-sm font-semibold text-[#98a2b3] shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
          Under Development
        </article>
        {lsrDummyConfigs.map((config) => {
          const line = config.partName as "CB" | "CH" | "CR" | "CA";
          return <LsrMachiningCard key={config.partName} config={config} weekly={lsrWeekly?.[line]} kpi={lsrKpi?.[line]} amountBase={lsrAmountBase?.[line]} selectedDate={selectedDate} />;
        })}
      </section>
    </div>
  );
}
