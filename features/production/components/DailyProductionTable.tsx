import type { ProductionSummaryRow as SummaryRow } from "@/features/production/types";
import { formatNumber, formatNumberAuto, formatPercent } from "@/features/production/components/ProductionDashboardUi";

export default function DailyProductionTable({
  rows,
  date,
  lineLabel,
}: {
  rows: SummaryRow[];
  date: string;
  lineLabel: string;
}) {
  return (
    <section className="mt-6">
      <article className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
        <div className="border-b border-[#e4e7ec] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#101828]">
            Daily Production Rows
          </h2>
          <p className="mt-1 text-sm text-[#667085]">
            {date} daily production summary for {lineLabel}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Plant</th>
                <th className="px-5 py-3">Shift</th>
                <th className="px-5 py-3">Line</th>
                <th className="px-5 py-3">Variant</th>
                <th className="px-5 py-3 text-right">Plan</th>
                <th className="px-5 py-3 text-right">Actual</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-right">OEE</th>
                <th className="px-5 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {rows.length ? (
                rows.map((row, index) => (
                  <tr
                    key={`${row.date}-${row.shift}-${row.shop}-${index}`}
                    className="hover:bg-[#f9fafb]"
                  >
                    <td className="px-5 py-4 font-medium text-[#101828]">
                      {row.date}
                    </td>
                    <td className="px-5 py-4 text-[#667085]">
                      {row.plant || "-"}
                    </td>
                    <td className="px-5 py-4 text-[#667085]">
                      {row.shift || "-"}
                    </td>
                    <td className="px-5 py-4 text-[#667085]">
                      {row.shop || "-"}
                    </td>
                    <td className="px-5 py-4 text-[#667085]">
                      {row.variant || "-"}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-[#101828]">
                      {formatNumber(row.prodPlan)}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-[#101828]">
                      {formatNumberAuto(row.prodAct)}
                    </td>
                    <td
                      className={`px-5 py-4 text-right font-semibold ${
                        row.balance < 0 ? "text-[#b42318]" : "text-[#027a48]"
                      }`}
                    >
                      {formatNumberAuto(row.balance)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-[#101828]">
                      {formatPercent(row.oee)}
                    </td>
                    <td
                      className="max-w-[220px] truncate px-5 py-4 text-[#667085]"
                      title={row.remarks}
                    >
                      {row.remarks || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-12 text-center text-sm font-medium text-[#98a2b3]"
                  >
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
