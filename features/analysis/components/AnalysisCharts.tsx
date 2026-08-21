import type {
  AnalysisGapSeriesRow as GapSeriesRow,
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
import { useState } from "react";

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
    rows: [
      { line: "CB 1", children: ["CD", "K1", "CB"] },
      { line: "CB 2", children: ["CB", "K2"] },
    ],
  },
  {
    title: "Cyl Head",
    rows: [
      { line: "CH 1", children: ["HC", "K6", "KJ"] },
      { line: "CH 2", children: ["HD", "HE", "HF", "K7", "K8", "KR"] },
    ],
  },
  {
    title: "Crankshaft",
    rows: [
      { line: "CR 1", children: ["CS", "K3"] },
      { line: "CR 2", children: ["CT", "K4"] },
    ],
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

const advancedStockVariants = [
  "All Variant",
  "2TR STM [K2]",
  "2TR STM [K7]",
  "2TR STM [K4]",
  "2TR STM [K5]",
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

function LsrAmountBaseChart({ config }: { config: LsrDummyConfig }) {
  const width = 320;
  const height = 154;
  const padding = { top: 18, right: 8, bottom: 24, left: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const amountCount = config.amountBase.length;
  const barWidth = Math.max(5, (plotWidth / amountCount) * 0.62);
  const max = config.chartMax;
  const targetY = padding.top + plotHeight - (config.target / max) * plotHeight;
  const gridValues = [max, max / 2, 0];

  return (
    <article className="min-w-0 rounded-2xl border border-[#e4e7ec] bg-white p-3 shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
      <h3 className="text-xs font-semibold text-[#101828] dark:text-[#f8fafc]">LSR Amount Base</h3>
      <div className="mt-1 overflow-x-auto rounded-xl bg-[#f9fafb] p-2 dark:bg-[#162033]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-[154px] min-w-[280px] w-full"
          role="img"
          aria-label={`Dummy LSR Amount Base chart for ${config.partName}`}
        >
          {gridValues.map((value) => {
            const y = padding.top + plotHeight - (value / max) * plotHeight;
            return (
              <g key={value}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--border-strong)" strokeDasharray="2 3" strokeWidth="0.75" />
                <text x={2} y={y + 3} fill="var(--text-muted)" fontSize="8">{formatLsrAmount(value)}</text>
              </g>
            );
          })}
          <line x1={padding.left} x2={width - padding.right} y1={targetY} y2={targetY} stroke="var(--error-text)" strokeDasharray="5 4" strokeWidth="1.5" />
          <text x={padding.left + 2} y={targetY - 4} fill="var(--error-text)" fontSize="8" fontWeight="700">{formatLsrAmount(config.target)}</text>
          {config.amountBase.map((amount, index) => {
            const x = padding.left + ((index + 0.5) / amountCount) * plotWidth;
            const barHeight = (amount / max) * plotHeight;
            const y = padding.top + plotHeight - barHeight;
            const labelY = Math.max(padding.top + 8, y - 3);

            return (
              <g key={`${config.partName}-${index}`}>
                <rect x={x - barWidth / 2} y={y} width={barWidth} height={barHeight} rx="1" fill="var(--brand-500)" />
                <text x={x} y={labelY} textAnchor="middle" fill="var(--foreground)" fontSize="7.5" fontWeight="700">{formatLsrAmount(amount)}</text>
                <text x={x} y={height - 9} textAnchor="middle" fill="var(--text-muted)" fontSize="7.5">{index + 1}</text>
              </g>
            );
          })}
          <text x={width / 2} y={height - 1} textAnchor="middle" fill="var(--text-muted)" fontSize="8">August</text>
        </svg>
      </div>
    </article>
  );
}

function LsrWeeklyTable({ config }: { config: LsrDummyConfig }) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#e4e7ec] bg-white p-3 shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
      <h3 className="text-xs font-semibold text-[#101828] dark:text-[#f8fafc]">LSR Unit Base (Weekly)</h3>
      <div className="mt-1 overflow-x-auto rounded-xl border border-[#e4e7ec] dark:border-[#2f4059]">
        <table className="w-full min-w-[260px] table-fixed text-center text-[10px]">
          <thead className="bg-[#f9fafb] text-[#667085] dark:bg-[#18243a] dark:text-[#b7c2d8]">
            <tr>
              <th className="px-1 py-1.5 text-left font-bold leading-tight">PART<br />NAME</th>
              {[1, 2, 3, 4].map((week) => <th key={week} className="px-1 py-1.5 font-bold">{week}</th>)}
              <th className="px-1 py-1.5 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#ecf3ff] text-[#344054] dark:bg-[#14245a] dark:text-[#e4e7ec]">
              <td className="px-1 py-1.5 text-left font-semibold">{config.partName}</td>
              {config.weekly.map((value, index) => <td key={`${config.partName}-${index}`} className="px-1 py-1.5 font-semibold">{value}</td>)}
              <td className="bg-[#f9fafb] px-1 py-1.5 font-bold text-[#344054] dark:bg-[#18243a] dark:text-[#f8fafc]">{config.weeklyTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

function LsrMachiningCard({ config }: { config: LsrDummyConfig }) {
  const kpis = [
    ["R", config.kpi.r],
    ["W", config.kpi.w],
    ["Total (D-1)", config.kpi.totalDMinusOne],
  ] as const;

  return (
    <section className="flex min-h-[420px] min-w-0 flex-col gap-2">
      <div className="px-1">
        <h2 className="text-sm font-semibold text-[#101828] dark:text-[#f8fafc]">LSR <span className="text-xs font-medium text-[#667085] dark:text-[#a7b0c0]">(Line Supply Request) *Mio</span></h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {kpis.map(([label, value]) => (
          <div key={label} className={`rounded-xl border border-[#e4e7ec] bg-white p-2 shadow-sm dark:border-[#2f4059] dark:bg-[#111827] ${label === "R" ? "text-[#b42318] dark:text-[#ff6b6b]" : "text-[#344054] dark:text-[#e4e7ec]"}`}>
            <p className="text-[10px] font-bold">{label}</p>
            <p className="mt-0.5 text-xs font-bold">{formatLsrAmount(value)}</p>
          </div>
        ))}
      </div>
        <div className="mt-2">
          <p className="text-center text-[10px] font-medium text-[#667085] dark:text-[#a7b0c0]">Month</p>
          <div className="mt-1 grid grid-cols-2 gap-2 text-center text-[10px] font-medium text-[#667085] dark:text-[#a7b0c0]">
            <div className="rounded-xl border border-[#e4e7ec] bg-white p-2 shadow-sm dark:border-[#2f4059] dark:bg-[#111827]"><p>Total</p><p className="mt-0.5 text-xs font-bold text-[#101828] dark:text-[#f8fafc]">{formatLsrAmount(config.kpi.monthTotal)}</p></div>
            <div className="rounded-xl border border-[#e4e7ec] bg-white p-2 shadow-sm dark:border-[#2f4059] dark:bg-[#111827]"><p>Allowance</p><p className="mt-0.5 text-xs font-bold text-[#101828] dark:text-[#f8fafc]">{formatLsrAmount(config.kpi.allowance)}</p></div>
          </div>
        </div>
      </div>
      <LsrAmountBaseChart config={config} />
      <LsrWeeklyTable config={config} />
    </section>
  );
}

type ExpandableStockRow = {
  line: string;
  children?: string[];
};

function ExpandableStockTable({
  rows,
  tone,
}: {
  rows: ExpandableStockRow[];
  tone: "gray" | "blue";
}) {
  const isBlue = tone === "blue";
  const [expandedLines, setExpandedLines] = useState<Set<string>>(
    () => new Set(
      (isBlue ? rows.slice(0, 1) : rows.slice(1, 2))
        .filter((row) => row.children?.length)
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
                {column.split(" ").map((word) => (
                  <span key={word} className="block">{word}</span>
                ))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eaecf0] text-[#344054]">
          {rows.flatMap((row) => {
            const isExpandable = Boolean(row.children?.length);
            const isExpanded = isExpandable && expandedLines.has(row.line);
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
                {machiningStockColumns.map((column) => (
                  <td key={column} className="px-1.5 py-2 text-center text-[#98a2b3]">-</td>
                ))}
              </tr>
            );
            const childRows = isExpanded && row.children
              ? row.children.map((child, index) => (
                  <tr key={`${row.line}-${child}-${index}`} className={isBlue ? "bg-[#eff8ff] dark:bg-[#14245a]" : "bg-[#eaecf0] dark:bg-[#273449]"}>
                    <td className={`px-1.5 py-2 pl-6 text-left font-medium ${isBlue ? "text-[#175cd3] dark:text-[#a6b6ff]" : "text-[#475467] dark:text-[#d0d5dd]"}`}>
                      {child}
                    </td>
                    {machiningStockColumns.map((column) => (
                      <td key={column} className="px-1.5 py-2 text-center text-[#98a2b3]">-</td>
                    ))}
                  </tr>
                ))
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
  rows: VanningTableRow[];
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
        { label: "HD-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
        { label: "HE-Plan", type: "plan" },
        { label: "Finish", type: "detail" },
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

function VanningTable({ columns, rows }: VanningTableConfig) {
  const isSingleDateKamigo = columns[0] === "Kamigo" && columns.length === 2;
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(
    () => new Set(rows.filter((row) => row.type === "plan").map((row) => row.label)),
  );
  const visibleRows: VanningTableRow[] = [];
  let currentPlanLabel: string | undefined;

  for (const row of rows) {
    if (row.type === "plan") {
      currentPlanLabel = row.label;
      visibleRows.push(row);
    } else if (row.type === "detail") {
      if (currentPlanLabel && expandedPlans.has(currentPlanLabel)) {
        visibleRows.push(row);
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
            {visibleRows.map((row, index) => (
              <tr
                key={`${row.label}-${index}`}
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
                {columns.slice(1).map((column) => (
                  <td
                    key={column}
                    className={`px-1 py-1 text-center ${
                      isSingleDateKamigo ? "relative -translate-x-6" : ""
                    }`}
                  >
                    -
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
                {columns.slice(1).map((column) => (
                  <td
                    key={column}
                    className={`px-1 py-1 text-center ${
                      isSingleDateKamigo ? "relative -translate-x-6" : ""
                    }`}
                  >
                    -
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

function VanningModule({ lineKey }: { lineKey: AnalysisChartLine["key"] }) {
  if (lineKey === "assyline") {
    return (
      <div className="h-[375px]">
        <article className="grid h-[375px] place-items-center rounded-2xl border border-[#e4e7ec] bg-white p-4 text-sm font-semibold text-[#98a2b3] shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
          Under Development
        </article>
      </div>
    );
  }

  const config = vanningConfigs[lineKey];

  return (
    <section className="h-[375px]">
      <h3 className="px-1 text-sm font-semibold text-[#101828] dark:text-[#f8fafc]">Vanning [Module]</h3>
      <div className="mt-2 grid grid-cols-[1fr_0.8fr_1fr] gap-2">
        {["Today Vanning", "Planning", "Remaining"].map((label) => (
          <article key={label} className="min-w-0 rounded-xl border border-[#e4e7ec] bg-white p-2 text-center shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
            <p className="text-xs font-medium leading-tight text-[#667085] dark:text-[#b7c2d8]">{label}</p>
            <p className="mt-1 text-sm font-semibold text-[#101828] dark:text-[#f8fafc]">-</p>
          </article>
        ))}
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
}: {
  series: SeriesRow[];
  shiftSeries: ShiftSeriesRow[];
  avShiftSeries: ShiftSeriesRow[];
  peShiftSeries: ShiftSeriesRow[];
  rqShiftSeries: ShiftSeriesRow[];
  gapSeries: GapSeriesRow[];
  lines: AnalysisChartLine[];
  cards: OeeCard[];
}) {
  const monthLabel = formatMonthLabel(series);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
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
                    ["Balance(Unit)", card?.balance ?? 0],
                    ["Balance Monthly", card?.balanceMonthly ?? 0],
                  ].map(([label, value]) => (
                    <article key={label} className="min-w-0 rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-medium text-[#667085]">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-[#101828]">
                        {formatUnit(value as number)}
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
                        <p
                          className={`w-fit rounded px-1.5 py-0.5 text-xs font-semibold ${
                            shiftLabel === "Night"
                              ? "bg-[#eef4ff] text-[#344054] dark:bg-[#1f3478] dark:text-[#d6e4ff]"
                              : "text-[#344054]"
                          }`}
                        >
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

              <VanningModule
                lineKey={line.key}
              />

              <section>
                <h3 className="px-1 text-sm font-semibold text-[#101828]">Balance Stock</h3>
                <div className="mt-1.5 flex gap-2.5">
                  {(line.key === "assyline"
                    ? ["Emergency Stock Domestic [Unit]"]
                    : ["Emergency Stock", "Export Module"]
                  ).map((label) => (
                    <article key={label} className="min-w-0 flex-1 rounded-2xl border border-[#e4e7ec] bg-white p-2.5 text-center shadow-sm">
                      <p className="text-xs font-medium leading-tight text-[#667085]">{label}</p>
                      {line.key !== "assyline" ? (
                        <p className="mt-0.5 text-xs font-medium leading-tight text-[#667085]">[Unit]</p>
                      ) : null}
                      <p className="mt-1 text-base font-semibold leading-tight text-[#101828]">-</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          );
        })}
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
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
            <ExpandableStockTable rows={group.rows} tone="gray" />
          </article>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
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
            <ExpandableStockTable rows={group.rows} tone="blue" />
          </article>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {advancedStockVariants.map((variant) => (
          <article key={variant} className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#101828]">Advanced Stock</h2>
              <p className="text-right text-xs font-semibold text-[#667085]">{variant}</p>
            </div>
            <div className="mt-3 flex gap-2.5">
              {["Actual", "Balance"].map((label) => (
                <div key={label} className="min-w-0 flex-1 rounded-xl bg-[#f9fafb] p-2.5 text-center">
                  <p className="text-xs font-medium leading-tight text-[#667085]">
                    {label} [Unit]
                  </p>
                  <p className="mt-1 text-base font-semibold leading-tight text-[#101828]">-</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        <article className="grid min-h-[420px] place-items-center rounded-2xl border border-[#e4e7ec] bg-white p-4 text-center text-sm font-semibold text-[#98a2b3] shadow-sm dark:border-[#2f4059] dark:bg-[#111827]">
          Under Development
        </article>
        {lsrDummyConfigs.map((config) => (
          <LsrMachiningCard key={config.partName} config={config} />
        ))}
      </section>
    </div>
  );
}
