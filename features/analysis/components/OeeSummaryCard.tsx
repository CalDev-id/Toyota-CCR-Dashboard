import type { AnalysisOeeCard as OeeCard } from "@/features/analysis/types";
import { formatPercent, meetsOeeTarget, metricTone } from "@/features/analysis/components/analysisChartUtils";

export default function OeeSummaryCard({ card }: { card: OeeCard }) {
  const isTargetMet = meetsOeeTarget(card.ave);
  const metricItems =
    card.key === "assyline"
      ? [
          ["Daily", card.r],
          ["Monthly", card.monthly],
        ]
      : [
          ["R", card.r],
          ["W", card.w],
          ["Ave", card.ave],
          ["Monthly", card.monthly],
        ];

  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#101828]">{card.line}</h2>
          <p className="mt-1 text-xs font-medium text-[#667085]">OEE summary</p>
        </div>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            isTargetMet ? "bg-[#ecfdf3] text-[#039855]" : "bg-[#fef3f2] text-[#d92d20]"
          }`}
          aria-label={isTargetMet ? "Average OEE target met" : "Average OEE below target"}
          title={isTargetMet ? "Ave >= 90%" : "Ave < 90%"}
        >
          {isTargetMet ? (
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 10.5l3.2 3.2L15.5 6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
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

      <div className="mt-5 flex flex-nowrap items-stretch gap-2">
        {metricItems.map(([label, value]) => (
          <div key={label} className="min-w-0 flex-1 rounded-xl bg-[#f9fafb] p-2.5">
            <p className="text-xs font-medium text-[#667085]">{label}</p>
            <p className={`mt-1 whitespace-nowrap text-[clamp(0.7rem,0.9vw,0.875rem)] font-semibold ${metricTone(value as number | null)}`}>
              {formatPercent(value as number | null)}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}
