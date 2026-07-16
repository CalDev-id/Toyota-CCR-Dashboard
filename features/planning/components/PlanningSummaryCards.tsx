import type { PlanningPartSummary } from "@/features/planning/types";
import { partIcons } from "@/features/planning/planning-ui";
import Image from "next/image";

const fallbackParts: PlanningPartSummary[] = [
  {
    key: "cylblock",
    label: "Cylblock",
    tableName: "",
    count: 0,
    oneTrTotal: 0,
    twoTrTotal: 0,
    ratioText: null,
    oneTrRatioPercentage: null,
    twoTrRatioPercentage: null,
  },
  {
    key: "cylhead",
    label: "Cylhead",
    tableName: "",
    count: 0,
    oneTrTotal: 0,
    twoTrTotal: 0,
    ratioText: null,
    oneTrRatioPercentage: null,
    twoTrRatioPercentage: null,
  },
  {
    key: "camshaft",
    label: "Camshaft",
    tableName: "",
    count: 0,
    oneTrTotal: 0,
    twoTrTotal: 0,
    ratioText: null,
    oneTrRatioPercentage: null,
    twoTrRatioPercentage: null,
  },
  {
    key: "crankshaft",
    label: "Crankshaft",
    tableName: "",
    count: 0,
    oneTrTotal: 0,
    twoTrTotal: 0,
    ratioText: null,
    oneTrRatioPercentage: null,
    twoTrRatioPercentage: null,
  },
];

const partIconImages: Record<PlanningPartSummary["key"], string> = {
  cylblock: "/images/icon/chicon.png",
  cylhead: "/images/icon/cbicon.png",
  camshaft: "/images/icon/camicon.png",
  crankshaft: "/images/icon/cricon.png",
};

const partTone: Record<
  PlanningPartSummary["key"],
  {
    accent: string;
    surface: string;
    panel: string;
    panelGlow: string;
    text: string;
    softText: string;
    bar: string;
  }
> = {
  cylblock: {
    accent: "border-[#d6e4ff] dark:border-[#2f4d8f]",
    surface: "bg-[#eff4ff] text-[#2f5fc7] dark:bg-[#14245a] dark:text-[#a6b6ff]",
    panel:
      "bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_44%,#fbfdff_70%,#f5f8ff_100%)] dark:bg-[linear-gradient(90deg,#111827_0%,#111827_44%,#142044_74%,#101a36_100%)]",
    panelGlow: "bg-[#b7caff]/18 dark:bg-[#465fff]/16",
    text: "text-[#465fff] dark:text-[#a6b6ff]",
    softText: "text-[#7193e8] dark:text-[#8da2ff]",
    bar: "bg-[#465fff] dark:bg-[#8da2ff]",
  },
  cylhead: {
    accent: "border-[#d8f3df] dark:border-[#1f5b3f]",
    surface: "bg-[#eaf8ee] text-[#137333] dark:bg-[#062b1b] dark:text-[#75e0a7]",
    panel:
      "bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_44%,#fbfefc_70%,#f3faf5_100%)] dark:bg-[linear-gradient(90deg,#111827_0%,#111827_44%,#09281b_74%,#071f16_100%)]",
    panelGlow: "bg-[#aee8bd]/18 dark:bg-[#16a34a]/16",
    text: "text-[#027a48] dark:text-[#75e0a7]",
    softText: "text-[#6bbf86] dark:text-[#75e0a7]",
    bar: "bg-[#16a34a] dark:bg-[#75e0a7]",
  },
  camshaft: {
    accent: "border-[#d6e4ff] dark:border-[#2f4d8f]",
    surface: "bg-[#eff4ff] text-[#2f5fc7] dark:bg-[#14245a] dark:text-[#a6b6ff]",
    panel:
      "bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_44%,#fbfdff_70%,#f5f8ff_100%)] dark:bg-[linear-gradient(90deg,#111827_0%,#111827_44%,#142044_74%,#101a36_100%)]",
    panelGlow: "bg-[#b7caff]/18 dark:bg-[#465fff]/16",
    text: "text-[#465fff] dark:text-[#a6b6ff]",
    softText: "text-[#7193e8] dark:text-[#8da2ff]",
    bar: "bg-[#465fff] dark:bg-[#8da2ff]",
  },
  crankshaft: {
    accent: "border-[#d8f3df] dark:border-[#1f5b3f]",
    surface: "bg-[#eaf8ee] text-[#137333] dark:bg-[#062b1b] dark:text-[#75e0a7]",
    panel:
      "bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_44%,#fbfefc_70%,#f3faf5_100%)] dark:bg-[linear-gradient(90deg,#111827_0%,#111827_44%,#09281b_74%,#071f16_100%)]",
    panelGlow: "bg-[#aee8bd]/18 dark:bg-[#16a34a]/16",
    text: "text-[#027a48] dark:text-[#75e0a7]",
    softText: "text-[#6bbf86] dark:text-[#75e0a7]",
    bar: "bg-[#16a34a] dark:bg-[#75e0a7]",
  },
};

function PlanningSummaryCard({ part }: { part: PlanningPartSummary }) {
  const partTotal = part.oneTrTotal + part.twoTrTotal;
  const ratioParts = part.ratioText?.split(":").map((value) => value.trim());
  const oneTrPercentage = part.oneTrRatioPercentage ?? 0;
  const twoTrPercentage = part.twoTrRatioPercentage ?? 0;
  const oneTrRatioLabel = ratioParts?.[0] || "-";
  const twoTrRatioLabel = ratioParts?.[1] || "-";
  const hasRatio = Boolean(part.ratioText);
  const tone = partTone[part.key];
  const imageSizeClass =
    part.key === "camshaft" ? "h-[92px] w-[92px]" : "h-[124px] w-[124px]";

  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-3.5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl border text-base font-bold ${tone.accent} ${tone.surface}`}
          >
            {partIcons[part.key]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#101828] dark:text-[#f8fafc]">
              {part.label}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#667085] dark:text-[#a7b0c0]">
              Monthly planning
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold ${tone.accent} ${tone.surface}`}
        >
          Active
        </span>
      </div>

      <div
        className={`relative mt-4 min-h-[104px] overflow-hidden rounded-xl border p-4 ${tone.accent} ${tone.panel}`}
      >
        <div
          className={`absolute -right-6 top-1/2 h-28 w-44 -translate-y-1/2 rounded-full blur-2xl ${tone.panelGlow}`}
        />
        <div
          className={`absolute left-[58%] top-1/2 h-20 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl ${tone.panelGlow}`}
        />
        <div className="absolute inset-y-0 left-0 w-[45%] bg-[linear-gradient(90deg,#ffffff_0%,rgba(255,255,255,0.92)_62%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(90deg,#111827_0%,rgba(17,24,39,0.92)_62%,rgba(17,24,39,0)_100%)]" />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase text-[#7b8aa6] dark:text-[#a7b0c0]">
            Total Plan
          </p>
          <p className="mt-3 text-[34px] font-bold leading-none text-[#101828] dark:text-[#f8fafc]">
            {partTotal.toLocaleString()}
          </p>
        </div>
        <Image
          alt=""
          aria-hidden="true"
          className={`absolute right-4 top-1/2 ${imageSizeClass} -translate-y-1/2 object-contain opacity-60 ${part.key === "camshaft" ? "rotate-[-28deg]" : ""} dark:opacity-48`}
          height={96}
          loading="eager"
          src={partIconImages[part.key]}
          width={96}
        />
      </div>

      <div className="mt-3 grid overflow-hidden rounded-xl border border-[#e4e7ec] bg-white dark:border-[#273449] dark:bg-[#111827] sm:grid-cols-2">
        {[
          {
            label: "1TR",
            value: part.oneTrTotal,
            percentage: oneTrPercentage,
            ratioLabel: oneTrRatioLabel,
          },
          {
            label: "2TR",
            value: part.twoTrTotal,
            percentage: twoTrPercentage,
            ratioLabel: twoTrRatioLabel,
          },
        ].map((item, index) => (
          <div
            key={item.label}
            className={`px-4 py-3 ${index === 1 ? "border-t border-[#e4e7ec] dark:border-[#273449] sm:border-l sm:border-t-0" : ""}`}
          >
            <p className="text-xs font-bold uppercase text-[#667085] dark:text-[#a7b0c0]">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-bold leading-none text-[#101828] dark:text-[#f8fafc]">
              {item.value.toLocaleString()}
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#d0d5dd] dark:bg-[#384860]">
                <div
                  className={`h-full rounded-full ${partTotal > 0 ? tone.bar : "bg-[#98a2b3] dark:bg-[#7f8a9d]"}`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span
                className={`min-w-11 rounded-full px-2 py-0.5 text-center text-xs font-bold ${hasRatio ? `${tone.text} bg-[#eef4ff] dark:bg-[#14245a]` : `${tone.softText} bg-[#f2f4f7] dark:bg-[#1f2937]`}`}
              >
                {item.ratioLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function PlanningSummaryCards({ parts }: { parts: PlanningPartSummary[] }) {
  const renderedParts = parts.length > 0 ? parts : fallbackParts;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {renderedParts.map((part) => (
        <PlanningSummaryCard key={part.key} part={part} />
      ))}
    </section>
  );
}
