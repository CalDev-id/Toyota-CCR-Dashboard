import type { ProductionProblemRow as ProblemRow } from "@/features/production/types";
import { formatNumberAuto } from "@/features/production/components/ProductionDashboardUi";

type ProblemTotals = {
  avMinutes: number;
  peMinutes: number;
  rqMinutes: number;
  defectUnits: number;
};

export default function DetailProblemTable({
  problemRows,
  problemTotals,
  date,
}: {
  problemRows: ProblemRow[];
  problemTotals: ProblemTotals;
  date: string;
}) {
  return (
    <section className="mt-6">
      <article className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
        <div className="border-b border-[#e4e7ec] px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#101828]">
                Detail Problem
              </h2>
              <p className="mt-1 text-sm text-[#667085]">
                AV, PE, RQ, loss time, and defect details for {date}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-xl bg-[#f9fafb] px-3 py-2">
                <p className="text-xs font-medium text-[#667085]">AV loss</p>
                <p className="mt-1 font-semibold text-[#101828]">
                  {formatNumberAuto(problemTotals.avMinutes)} min
                </p>
              </div>
              <div className="rounded-xl bg-[#f9fafb] px-3 py-2">
                <p className="text-xs font-medium text-[#667085]">PE loss</p>
                <p className="mt-1 font-semibold text-[#101828]">
                  {formatNumberAuto(problemTotals.peMinutes)} min
                </p>
              </div>
              <div className="rounded-xl bg-[#f9fafb] px-3 py-2">
                <p className="text-xs font-medium text-[#667085]">RQ loss</p>
                <p className="mt-1 font-semibold text-[#101828]">
                  {formatNumberAuto(problemTotals.rqMinutes)} min
                </p>
              </div>
              <div className="rounded-xl bg-[#f9fafb] px-3 py-2">
                <p className="text-xs font-medium text-[#667085]">Defect</p>
                <p className="mt-1 font-semibold text-[#101828]">
                  {formatNumberAuto(problemTotals.defectUnits)}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Shift</th>
                <th className="px-5 py-3">Problem AV</th>
                <th className="px-5 py-3 text-right">AV Min</th>
                <th className="px-5 py-3">Problem PE</th>
                <th className="px-5 py-3 text-right">PE Min</th>
                <th className="px-5 py-3">Problem RQ</th>
                <th className="px-5 py-3 text-right">Defect</th>
                <th className="px-5 py-3 text-right">RQ Min</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {problemRows.length ? (
                problemRows.map((row, index) => (
                  <tr
                    key={`${row.date}-${row.shift}-${row.jam}-${row.shop}-${index}`}
                    className="hover:bg-[#f9fafb]"
                  >
                    <td className="px-5 py-4 font-medium text-[#101828]">
                      {row.jam || "-"}
                    </td>
                    <td className="px-5 py-4 text-[#667085]">
                      {[row.shift, row.shift2].filter(Boolean).join(" / ") || "-"}
                    </td>
                    <td
                      className="max-w-[220px] truncate px-5 py-4 text-[#667085]"
                      title={row.problemAv}
                    >
                      {row.problemAv || "-"}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-[#101828]">
                      {formatNumberAuto(row.lsAvMin)}
                    </td>
                    <td
                      className="max-w-[220px] truncate px-5 py-4 text-[#667085]"
                      title={row.problemPe}
                    >
                      {row.problemPe || "-"}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-[#101828]">
                      {formatNumberAuto(row.lsPeMin)}
                    </td>
                    <td
                      className="max-w-[220px] truncate px-5 py-4 text-[#667085]"
                      title={row.problemRq}
                    >
                      {row.problemRq || "-"}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-[#101828]">
                      {formatNumberAuto(row.defectC + row.defectM)}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-[#101828]">
                      {formatNumberAuto(row.defectCMin + row.defectMMin)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-sm font-medium text-[#98a2b3]"
                  >
                    No detail problem data for this day
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
