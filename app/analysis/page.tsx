import DefaultLayout from "@/components/layouts/DefaultLayout";

export default function AnalysisPage() {
  return (
    <DefaultLayout>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#101828]">Planning Analytics</h2>
              <p className="mt-1 text-sm text-[#667085]">
                Production plan, material readiness, and inventory trend overview
              </p>
            </div>
            <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-medium text-[#039855]">
              +8.2%
            </span>
          </div>

          <div className="mt-7 flex h-72 items-end gap-3 rounded-2xl bg-[#f9fafb] px-4 py-5">
            {[55, 42, 66, 74, 58, 82, 70, 88, 76, 92].map((height, index) => (
              <div key={index} className="flex flex-1 items-end">
                <div
                  className="w-full rounded-t-lg bg-[#465fff]"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#101828]">Area Breakdown</h2>
          <p className="mt-1 text-sm text-[#667085]">Distribution by PPIC workflow</p>

          <div className="mt-6 space-y-5">
            {[
              ["Production Planning", "42%", 42],
              ["Inventory Control", "31%", 31],
              ["Material Readiness", "18%", 18],
              ["Supplier Follow-up", "9%", 9],
            ].map(([label, value, progress]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#344054]">{label}</span>
                  <span className="font-semibold text-[#101828]">{value}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f2f4f7]">
                  <div
                    className="h-full rounded-full bg-[#465fff]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Plan Variance", "2.4%", "Week over week monitoring"],
          ["Material Readiness", "98.4%", "Risk and shortage visibility"],
          ["Inventory Days", "42", "Average stock coverage"],
        ].map(([title, value, caption]) => (
          <article
            key={title}
            className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-[#667085]">{title}</p>
            <p className="mt-3 text-2xl font-semibold text-[#101828]">{value}</p>
            <p className="mt-1 text-sm text-[#667085]">{caption}</p>
          </article>
        ))}
      </section>
    </DefaultLayout>
  );
}
