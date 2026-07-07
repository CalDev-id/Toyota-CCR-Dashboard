import type { HomeLineGap } from "@/features/home/types";
import { formatNumber, getStatusClass } from "@/features/home/utils";

export default function PlanActualGapTable({ lineGaps }: { lineGaps: HomeLineGap[] }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
      <div className="border-b border-[#e4e7ec] px-5 py-4">
        <h2 className="text-lg font-semibold text-[#101828]">Plan vs Actual Gap</h2>
        <p className="mt-1 text-sm text-[#667085]">
          Lines with the largest production shortfall this month
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed min-w-[560px] text-left text-sm">
          <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
            <tr>
              <th className="w-[24%] px-5 py-3">Line</th>
              <th className="w-[19%] px-5 py-3 text-right">Plan</th>
              <th className="w-[19%] px-5 py-3 text-right">Actual</th>
              <th className="w-[19%] px-5 py-3 text-right">Gap</th>
              <th className="w-[19%] px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4e7ec]">
            {lineGaps.map((item) => (
              <tr key={item.line}>
                <td className="px-5 py-4 font-medium text-[#101828]">{item.line}</td>
                <td className="px-5 py-4 text-right text-[#667085]">{formatNumber(item.plan)}</td>
                <td className="px-5 py-4 text-right text-[#667085]">{formatNumber(item.actual)}</td>
                <td className="px-5 py-4 text-right font-medium text-[#101828]">{formatNumber(item.gap)}</td>
                <td className="px-5 py-4 text-right">
                  <span className={`inline-flex justify-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
