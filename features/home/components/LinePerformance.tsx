import type { HomeLinePerformance } from "@/features/home/types";
import { formatPercent } from "@/features/home/utils";

export default function LinePerformance({
  linePerformance,
}: {
  linePerformance: HomeLinePerformance[];
}) {
  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#101828]">Line Performance</h2>
      <p className="mt-1 text-sm text-[#667085]">OEE average this month by line</p>

      <div className="mt-6 space-y-5">
        {linePerformance.map((item) => {
          const progress = Math.min(Math.max(item.oee ?? 0, 0), 100);

          return (
            <div key={item.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#344054]">{item.label}</span>
                <span className="font-semibold text-[#101828]">
                  {formatPercent(item.oee)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f2f4f7]">
                <div
                  className={`h-full rounded-full ${
                    progress >= 90 ? "bg-[#12b76a]" : "bg-[#f04438]"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
