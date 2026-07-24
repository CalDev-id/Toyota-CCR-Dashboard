import DefaultLayout from "@/components/layouts/DefaultLayout";

function Block({ className }: { className: string }) {
  return <div className={`rounded-lg bg-[#eaecf0] dark:bg-[#273449] ${className}`} />;
}

export default function HomeDashboardSkeleton() {
  return (
    <DefaultLayout>
      <section aria-label="Loading home dashboard" aria-busy="true" className="animate-pulse">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
              <Block className="h-4 w-20" />
              <Block className="mt-4 h-8 w-28 bg-[#f2f4f7] dark:bg-[#202d40]" />
              <Block className="mt-4 h-3 w-36" />
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
          <article className="h-[330px] rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
            <Block className="h-5 w-44" />
            <Block className="mt-6 h-[245px] w-full bg-[#f2f4f7] dark:bg-[#202d40]" />
          </article>
          <article className="h-[330px] rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
            <Block className="h-5 w-32" />
            <Block className="mt-6 h-[245px] w-full bg-[#f2f4f7] dark:bg-[#202d40]" />
          </article>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="h-[270px] rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
            <Block className="h-5 w-36" />
            <Block className="mt-6 h-[180px] w-full bg-[#f2f4f7] dark:bg-[#202d40]" />
          </article>
          <article className="h-[270px] rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
            <Block className="h-5 w-40" />
            <Block className="mt-6 h-[180px] w-full bg-[#f2f4f7] dark:bg-[#202d40]" />
          </article>
        </div>
      </section>
    </DefaultLayout>
  );
}
