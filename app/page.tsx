import DefaultLayout from "@/components/layouts/DefaultLayout";

const metrics = [
  {
    label: "Planned Units",
    value: "3,782",
    trend: "11.01%",
    positive: true,
    caption: "Units scheduled this month",
  },
  {
    label: "Material Orders",
    value: "5,359",
    trend: "9.05%",
    positive: false,
    caption: "Open PO and kanban items",
  },
  {
    label: "Shortage Items",
    value: "124",
    trend: "4.24%",
    positive: true,
    caption: "Parts under monitoring",
  },
  {
    label: "Plan Attainment",
    value: "98.4%",
    trend: "2.18%",
    positive: true,
    caption: "Production plan achieved",
  },
];

const monthlyBars = [44, 62, 48, 80, 52, 68, 92, 74, 64, 88, 58, 78];

export default function Home() {
  return (
    <DefaultLayout>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="grid size-11 place-items-center rounded-xl bg-[#f2f4f7] text-[#344054]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                  <path
                    d="M7.75 11.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM16.25 12.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM2.75 19.25c.5-3.15 2.35-5 5-5s4.5 1.85 5 5M13.25 18.25c.62-2.1 1.88-3.15 3.75-3.15 2.15 0 3.55 1.3 4.05 4.15"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  item.positive
                    ? "bg-[#ecfdf3] text-[#039855]"
                    : "bg-[#fef3f2] text-[#d92d20]"
                }`}
              >
                {item.positive ? "↑" : "↓"} {item.trend}
              </span>
            </div>
            <p className="mt-5 text-sm font-medium text-[#667085]">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-[#101828]">
              {item.value}
            </p>
            <p className="mt-1 text-sm text-[#667085]">{item.caption}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#101828]">Monthly Production</h2>
              <p className="mt-1 text-sm text-[#667085]">
                Planned versus released production volume by month
              </p>
            </div>
            <button className="h-10 rounded-lg border border-[#e4e7ec] px-4 text-sm font-medium text-[#344054]">
              Export
            </button>
          </div>

          <div className="mt-7 flex h-72 items-end gap-3 rounded-2xl bg-[#f9fafb] px-4 py-5">
            {monthlyBars.map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-3">
                <div className="flex h-56 w-full items-end">
                  <div
                    className="w-full rounded-t-lg bg-[#465fff]"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-[#667085]">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index]}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#101828]">Monthly Target</h2>
              <p className="mt-1 text-sm text-[#667085]">Production target completed this month</p>
            </div>
            <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-medium text-[#039855]">
              +10%
            </span>
          </div>

          <div className="mx-auto mt-8 grid size-52 place-items-center rounded-full border-[18px] border-[#ecf3ff]">
            <div className="grid size-36 place-items-center rounded-full border-[18px] border-[#465fff] bg-white text-center">
              <div>
                <p className="text-3xl font-semibold text-[#101828]">75.55%</p>
                <p className="mt-1 text-xs font-medium text-[#667085]">Progress</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 divide-x divide-[#e4e7ec] rounded-2xl bg-[#f9fafb] p-4 text-center">
            {[
              ["Target", "20K"],
              ["Released", "16K"],
              ["Today", "1.5K"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium text-[#667085]">{label}</p>
                <p className="mt-1 text-sm font-semibold text-[#101828]">{value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#101828]">Statistics</h2>
          <p className="mt-1 text-sm text-[#667085]">Weekly PPIC activity by area</p>

          <div className="mt-6 space-y-5">
            {[
              ["Production Planning", "1,245", 82],
              ["Inventory Control", "982", 68],
              ["Material Readiness", "584", 48],
              ["Supplier Follow-up", "312", 34],
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

        <article className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e4e7ec] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[#101828]">Recent Material Orders</h2>
              <p className="mt-1 text-sm text-[#667085]">Latest PPIC planning and inventory movement</p>
            </div>
            <button className="h-10 rounded-lg border border-[#e4e7ec] px-4 text-sm font-medium text-[#344054]">
              See all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Area</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {[
                  ["PO-2401", "Body Parts", "In Review", "96%"],
                  ["PO-2402", "Engine Parts", "Shortage", "82%"],
                  ["PO-2403", "Interior Parts", "Released", "100%"],
                  ["PO-2404", "Packaging", "Pending", "74%"],
                ].map(([id, area, status, readiness]) => (
                  <tr key={id}>
                    <td className="px-5 py-4 font-medium text-[#101828]">{id}</td>
                    <td className="px-5 py-4 text-[#667085]">{area}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#ecf3ff] px-2.5 py-1 text-xs font-medium text-[#465fff]">
                        {status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-[#101828]">
                      {readiness}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </DefaultLayout>
  );
}
