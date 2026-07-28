"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import type { UserRole } from "@/features/users/types";

type SidebarProps = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
};

type MenuChild = {
  label: string;
  href: string;
  roles?: UserRole[];
};

type MenuItem = MenuChild & {
  icon: React.ReactNode;
  children?: MenuChild[];
};

const menuItems: MenuItem[] = [
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
    label: "Asakai Board",
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
    label: "Daily Production",
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
    label: "Production Achievement",
    href: "/production-achievement",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path
          d="M4.5 19.25h15M7 16.25v-5.5M12 16.25v-9.5M17 16.25v-7M6.25 6.75l3.5 2.75 3.5-4 4.5 3.25M17.75 8.75V5.5h-3.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
    children: [
      {
        label: "Prod Acv Machining",
        href: "/production-achievement",
      },
      {
        label: "Prod Acv Packom",
        href: "/packom",
        roles: ["ADMIN", "CCR_OPERATION", "CCR_GROUP_LEADER"],
      },
    ],
  },
  {
    label: "Planning",
    href: "/planning",
    roles: ["ADMIN", "CCR_OPERATION", "CCR_GROUP_LEADER"],
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
    children: [
      {
        label: "Monthly Planning",
        href: "/planning",
      },
      {
        label: "Daily Planning",
        href: "/daily-planning",
      },
    ],
  },
  {
    label: "Users",
    href: "/users",
    roles: ["ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path
          d="M8.25 11.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM3.25 19.25c.52-3.25 2.38-5 5-5s4.48 1.75 5 5M16 9.25h4.5M18.25 7v4.5M15 19.25h5.75"
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

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={`flex h-20 items-center border-b border-[#e4e7ec] px-6 ${
        collapsed ? "justify-center" : "gap-3"
      }`}
    >
      <div className="theme-logo-surface grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#e4e7ec] bg-white">
        <Image
          src="/images/tmmin_logo.png"
          alt="TMMIN logo"
          width={800}
          height={344}
          className="h-7 w-auto object-contain"
          priority
        />
      </div>
      <div className={collapsed ? "hidden" : "min-w-0"}>
        <p className="truncate text-base font-semibold tracking-tight text-[#101828]">
          Toyota CCR
        </p>
        <p className="truncate text-xs font-medium text-[#667085]">
          PPIC & Warehouse
        </p>
      </div>
    </div>
  );
}

function Menu({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const role = session?.user?.role ?? "USER";
  const visibleItems = menuItems
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children?.filter(
        (child) => !child.roles || child.roles.includes(role),
      ),
    }));

  return (
    <nav className="space-y-1" aria-label="Dashboard navigation">
      {visibleItems.map((item) => {
        const childItems = item.children;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              childItems?.some(
                (child) =>
                  pathname === child.href || pathname.startsWith(`${child.href}/`),
              );
        const isExpanded = Boolean(
          childItems?.length && (openMenus[item.href] ?? isActive),
        );

        return (
          <div key={item.href} className="space-y-1">
            {childItems?.length && collapsed ? (
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                onClick={onNavigate}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-[#ecf3ff] text-[#465fff] dark:bg-[#14245a] dark:text-[#a6b6ff]"
                    : "text-[#667085] hover:bg-[#f9fafb] hover:text-[#101828] dark:text-[#a7b0c0] dark:hover:bg-[#162033] dark:hover:text-[#f8fafc]"
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                    isActive
                      ? "bg-[#465fff] text-white dark:bg-[#8da2ff] dark:text-[#0b111d]"
                      : "bg-[#f2f4f7] text-[#667085] group-hover:bg-white dark:bg-[#1f2937] dark:text-[#a7b0c0] dark:group-hover:bg-[#273449]"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="sr-only">{item.label}</span>
              </Link>
            ) : childItems?.length ? (
              <button
                type="button"
                aria-expanded={isExpanded}
                title={collapsed ? item.label : undefined}
                onClick={() =>
                  setOpenMenus((current) => ({
                    ...current,
                    [item.href]: !isExpanded,
                  }))
                }
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-[#ecf3ff] text-[#465fff] dark:bg-[#14245a] dark:text-[#a6b6ff]"
                    : "text-[#667085] hover:bg-[#f9fafb] hover:text-[#101828] dark:text-[#a7b0c0] dark:hover:bg-[#162033] dark:hover:text-[#f8fafc]"
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                    isActive
                      ? "bg-[#465fff] text-white dark:bg-[#8da2ff] dark:text-[#0b111d]"
                      : "bg-[#f2f4f7] text-[#667085] group-hover:bg-white dark:bg-[#1f2937] dark:text-[#a7b0c0] dark:group-hover:bg-[#273449]"
                  }`}
                >
                  {item.icon}
                </span>
                <span className={collapsed ? "sr-only" : "flex-1 whitespace-nowrap"}>
                  {item.label}
                </span>
                {!collapsed ? (
                  <svg
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    className={`size-4 shrink-0 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="m5 7.5 5 5 5-5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                ) : null}
              </button>
            ) : (
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                onClick={onNavigate}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#ecf3ff] text-[#465fff] dark:bg-[#14245a] dark:text-[#a6b6ff]"
                    : "text-[#667085] hover:bg-[#f9fafb] hover:text-[#101828] dark:text-[#a7b0c0] dark:hover:bg-[#162033] dark:hover:text-[#f8fafc]"
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                    isActive
                      ? "bg-[#465fff] text-white dark:bg-[#8da2ff] dark:text-[#0b111d]"
                      : "bg-[#f2f4f7] text-[#667085] group-hover:bg-white dark:bg-[#1f2937] dark:text-[#a7b0c0] dark:group-hover:bg-[#273449]"
                  }`}
                >
                  {item.icon}
                </span>
                <span className={collapsed ? "sr-only" : "whitespace-nowrap"}>
                  {item.label}
                </span>
              </Link>
            )}

            {!collapsed && childItems?.length && isExpanded ? (
              <div className="ml-11 space-y-1">
                {childItems.map((child) => {
                  const isChildActive =
                    pathname === child.href || pathname.startsWith(`${child.href}/`);

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      aria-current={isChildActive ? "page" : undefined}
                      onClick={onNavigate}
                      className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isChildActive
                          ? "bg-[#eef4ff] text-[#465fff] dark:bg-[#162033] dark:text-[#a6b6ff]"
                          : "text-[#667085] hover:bg-[#f9fafb] hover:text-[#101828] dark:text-[#a7b0c0] dark:hover:bg-[#162033] dark:hover:text-[#f8fafc]"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function MenuSection({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <p
        className={`mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-[#98a2b3] ${
          collapsed ? "sr-only" : ""
        }`}
      >
        Menu
      </p>
      <Menu collapsed={collapsed} onNavigate={onNavigate} />
    </div>
  );
}

export default function Sidebar({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#101828]/40 transition-opacity lg:hidden ${
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={onCloseMobile}
      />

      <aside
        id="mobile-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] max-w-[calc(100vw-48px)] flex-col border-r border-[#e4e7ec] bg-white shadow-xl transition-transform duration-200 ease-out lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile sidebar"
        aria-hidden={!isMobileOpen}
      >
        <div className="flex h-20 items-center justify-between gap-3 border-b border-[#e4e7ec] px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="theme-logo-surface grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#e4e7ec] bg-white">
              <Image
                src="/images/tmmin_logo.png"
                alt="TMMIN logo"
                width={800}
                height={344}
                className="h-7 w-auto object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-[#101828]">
                Toyota CCR
              </p>
              <p className="truncate text-xs font-medium text-[#667085]">
                PPIC & Warehouse
              </p>
            </div>
          </div>

          <button
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#e4e7ec] bg-white text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#101828]"
            aria-label="Close sidebar"
            onClick={onCloseMobile}
            type="button"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
              <path
                d="m6 6 12 12M18 6 6 18"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>

        <MenuSection onNavigate={onCloseMobile} />
      </aside>

      <aside
        className={`relative z-40 hidden h-full shrink-0 border-r border-[#e4e7ec] bg-white transition-[width] duration-200 ease-out lg:flex lg:flex-col ${
          isCollapsed ? "w-[92px]" : "w-[290px]"
        }`}
      >
        <button
          className="absolute -right-4 top-6 z-50 hidden size-8 place-items-center rounded-full border border-[#e4e7ec] bg-white text-[#667085] shadow-sm transition hover:bg-[#f9fafb] hover:text-[#101828] lg:grid"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapsed}
          type="button"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`size-4 transition-transform ${
              isCollapsed ? "rotate-180" : ""
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

        <Brand collapsed={isCollapsed} />
        <MenuSection collapsed={isCollapsed} />
      </aside>
    </>
  );
}
