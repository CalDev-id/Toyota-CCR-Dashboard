
function Block({ className }: { className: string }) {
  return <div className={`rounded-lg bg-[#eaecf0] dark:bg-[#273449] ${className}`} />;
}

export default function ProductionLoading() {
  return (
    <section aria-label="Loading daily production" aria-busy="true" className="animate-pulse">
        <div className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <Block className="h-3 w-16" />
                <Block className="mt-2 h-10 w-full bg-[#f2f4f7] dark:bg-[#202d40]" />
              </div>
            ))}
          </div>
        </div>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <article key={index} className="h-36 rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
                  <Block className="h-4 w-12" />
                  <Block className="mt-5 h-8 w-24 bg-[#f2f4f7] dark:bg-[#202d40]" />
                </article>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <article key={index} className="h-44 rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
                  <Block className="h-4 w-28" />
                  <Block className="mt-5 h-20 w-full bg-[#f2f4f7] dark:bg-[#202d40]" />
                </article>
              ))}
            </div>
          </div>
          <article className="h-[296px] rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
            <Block className="mx-auto h-48 w-48 rounded-full bg-[#f2f4f7] dark:bg-[#202d40]" />
          </article>
        </section>

        <article className="mt-6 h-72 rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
          <Block className="h-5 w-44" />
          <Block className="mt-5 h-52 w-full bg-[#f2f4f7] dark:bg-[#202d40]" />
        </article>
    </section>
  );
}
