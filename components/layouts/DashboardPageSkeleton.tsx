import DefaultLayout from "@/components/layouts/DefaultLayout";

export default function DashboardPageSkeleton() {
  return (
    <DefaultLayout>
      <section aria-label="Loading page" aria-busy="true" className="animate-pulse">
        <div className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
          <div className="h-6 w-44 rounded bg-[#eaecf0] dark:bg-[#273449]" />
          <div className="mt-3 h-4 w-72 max-w-full rounded bg-[#f2f4f7] dark:bg-[#202d40]" />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-10 rounded-lg bg-[#f2f4f7] dark:bg-[#202d40]" />
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={index} className="h-40 rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
              <div className="h-4 w-24 rounded bg-[#eaecf0] dark:bg-[#273449]" />
              <div className="mt-5 h-8 w-32 rounded bg-[#f2f4f7] dark:bg-[#202d40]" />
              <div className="mt-5 h-3 w-full rounded bg-[#f2f4f7] dark:bg-[#202d40]" />
            </article>
          ))}
        </div>
        <article className="mt-6 h-[330px] rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
          <div className="h-5 w-40 rounded bg-[#eaecf0] dark:bg-[#273449]" />
          <div className="mt-6 h-[245px] w-full rounded-xl bg-[#f2f4f7] dark:bg-[#202d40]" />
        </article>
      </section>
    </DefaultLayout>
  );
}
