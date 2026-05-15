"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  {
    label: "Home",
    href: "/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path
          d="M3.75 10.7 12 4l8.25 6.7v8.05a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.4h-5.1v5.4h-4.2a1.5 1.5 0 0 1-1.5-1.5V10.7Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    label: "Analysis",
    href: "/analysis",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path
          d="M4 18.5h16M6.5 15l3.6-4.1 3.2 2.9 4.8-6.4M16 7.4h2.1v2.1"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    label: "Production",
    href: "/production",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path
          d="M4.5 18.75V8.25l4.5 3v-3l4.5 3v-3l6 4v6.5H4.5ZM7.5 15.75h1.8m3 0h1.8m3 0h1.2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    label: "Planning",
    href: "/planning",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path
          d="M7 3.75v3M17 3.75v3M4.75 8.25h14.5M6.25 5.25h11.5a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H6.25a1.5 1.5 0 0 1-1.5-1.5v-11a1.5 1.5 0 0 1 1.5-1.5ZM8 12h2.25M8 15.5h2.25M13.75 12H16M13.75 15.5H16"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
];

type DashboardNavigationProps = {
  compact?: boolean;
  collapsed?: boolean;
};

export default function DashboardNavigation({
  compact = false,
  collapsed = false,
}: DashboardNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      className={compact ? "flex gap-2 overflow-x-auto" : "space-y-1"}
      aria-label="Dashboard navigation"
    >
      {navigationItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-[#ecf3ff] text-[#465fff]"
                : "text-[#667085] hover:bg-[#f9fafb] hover:text-[#101828]"
            }`}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                isActive
                  ? "bg-[#465fff] text-white"
                  : "bg-[#f2f4f7] text-[#667085] group-hover:bg-white"
              }`}
            >
              {item.icon}
            </span>
            <span className={collapsed ? "sr-only" : "whitespace-nowrap"}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
