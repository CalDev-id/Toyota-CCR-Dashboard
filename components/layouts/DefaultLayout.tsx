"use client";

import DashboardNavigation from "@/components/navigation/DashboardNavigation";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

type DefaultLayoutProps = {
  children: React.ReactNode;
};

const pageHeaders = [
  {
    href: "/planning",
    title: "Planning",
    subtitle: "Monthly production planning by part, period, shift, and group",
  },
  {
    href: "/production",
    title: "Production",
    subtitle: "Manage production records and output quantities",
  },
  {
    href: "/analysis",
    title: "Analysis",
    subtitle: "PPIC performance, material readiness, and inventory trends",
  },
  {
    href: "/",
    title: "Dashboard",
    subtitle: "Production planning and inventory control overview",
  },
];

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const pageHeader =
    pageHeaders.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
    ) ?? pageHeaders[pageHeaders.length - 1];

  return (
    <div className="h-screen overflow-hidden bg-[#f9fafb] text-[#101828]">
      <div className="flex h-full overflow-hidden">
        <aside
          className={`relative z-40 hidden h-full shrink-0 border-r border-[#e4e7ec] bg-white transition-[width] duration-200 ease-out lg:flex lg:flex-col ${
            isSidebarCollapsed ? "w-[92px]" : "w-[290px]"
          }`}
        >
          <button
            className="absolute -right-4 top-6 z-50 hidden size-8 place-items-center rounded-full border border-[#e4e7ec] bg-white text-[#667085] shadow-sm transition hover:bg-[#f9fafb] hover:text-[#101828] lg:grid"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            type="button"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`size-4 transition-transform ${
                isSidebarCollapsed ? "rotate-180" : ""
              }`}
            >
              <path
                d="m15 6-6 6 6 6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>

          <div
            className={`flex h-20 items-center border-b border-[#e4e7ec] px-6 ${
              isSidebarCollapsed ? "justify-center" : "gap-3"
            }`}
          >
            <div className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#e4e7ec] bg-white">
              <Image
                src="/images/tmmin_logo.png"
                alt="TMMIN logo"
                width={800}
                height={344}
                className="h-7 w-auto object-contain"
                priority
              />
            </div>
            <div className={isSidebarCollapsed ? "hidden" : "min-w-0"}>
              <p className="truncate text-base font-semibold tracking-tight text-[#101828]">
                Toyota CCR
              </p>
              <p className="truncate text-xs font-medium text-[#667085]">
                PPIC & Warehouse
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <p
              className={`mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-[#98a2b3] ${
                isSidebarCollapsed ? "sr-only" : ""
              }`}
            >
              Menu
            </p>
            <DashboardNavigation collapsed={isSidebarCollapsed} />
          </div>

        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          <header className="sticky top-0 z-30 border-b border-[#e4e7ec] bg-white">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 md:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                  className="grid size-10 place-items-center rounded-lg border border-[#e4e7ec] bg-white text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#101828] lg:hidden"
                  aria-label="Open sidebar"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                    <path
                      d="M4 7h16M4 12h16M4 17h16"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>

                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold text-[#101828]">
                    {pageHeader.title}
                  </h1>
                  <p className="truncate text-xs font-medium text-[#667085]">
                    {pageHeader.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {[
                  // {
                  //   label: "Toggle theme",
                  //   icon: (
                  //     <path
                  //       d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z"
                  //       fill="none"
                  //       stroke="currentColor"
                  //       strokeLinejoin="round"
                  //       strokeWidth="1.8"
                  //     />
                  //   ),
                  // },
                  {
                    label: "Notifications",
                    icon: (
                      <path
                        d="M18 9.75a6 6 0 0 0-12 0c0 6-2 6.5-2 6.5h16s-2-.5-2-6.5ZM10 19h4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    ),
                  },
                  // {
                  //   label: "Messages",
                  //   icon: (
                  //     <path
                  //       d="M5.5 18.5h9.8l3.2 2.2v-2.2h.5a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z"
                  //       fill="none"
                  //       stroke="currentColor"
                  //       strokeLinecap="round"
                  //       strokeLinejoin="round"
                  //       strokeWidth="1.8"
                  //     />
                  //   ),
                  // },
                ].map((action) => (
                  <button
                    key={action.label}
                    aria-label={action.label}
                    className="relative grid size-10 place-items-center rounded-full border border-[#e4e7ec] bg-white text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#101828]"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                      {action.icon}
                    </svg>
                    {action.label === "Notifications" ? (
                      <span className="absolute right-2 top-2 size-2 rounded-full bg-[#f04438] ring-2 ring-white" />
                    ) : null}
                  </button>
                ))}

                <button
                  className="ml-1 flex h-11 items-center gap-3 rounded-full border border-[#e4e7ec] bg-white py-1 pl-1 pr-3 transition hover:bg-[#f9fafb]"
                  type="button"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-[#101828] text-xs font-semibold text-white">
                    AD
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-sm font-medium leading-4 text-[#101828]">
                      Admin CCR
                    </span>
                    <span className="mt-0.5 block text-xs text-[#667085]">
                      PPIC Team
                    </span>
                  </span>
                  <svg
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    className="hidden size-4 text-[#667085] sm:block"
                  >
                    <path
                      d="m5 7.5 5 5 5-5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-4 lg:hidden">
              <div className="rounded-lg border border-[#e4e7ec] bg-[#f9fafb] p-2">
                <DashboardNavigation compact />
              </div>
            </div>
          </header>

          <main>
            <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
