"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

type TopbarProps = {
  isMobileSidebarOpen: boolean;
  compact?: boolean;
  forceMenuButton?: boolean;
  onToggleMobileSidebar: () => void;
};

type Theme = "light" | "dark";

const themeStorageKey = "toyota-ccr-theme";
const themeChangeEvent = "toyota-ccr-theme-change";

const pageHeaders = [
  {
    href: "/analysis/manual",
    title: "Asakai Board Manual",
    subtitle: "PPIC performance, material readiness, and inventory trends",
  },
  {
    href: "/planning",
    title: "Monthly Planning",
    subtitle: "Monthly production planning by part, period, shift, and group",
  },
  {
    href: "/production-achievement/linestop-report",
    title: "Linestop Report",
    subtitle: "Monthly linestop Pareto and problem summary by machining line",
  },
  {
    href: "/production-achievement",
    title: "Prod Acv Machining",
    subtitle: "Production achievement overview for machining",
  },
  {
    href: "/production",
    title: "Production",
    subtitle: "Production OEE, attainment, overtime, and shift performance",
  },
  {
    href: "/analysis/input-data",
    title: "Input Data Asakai",
    subtitle: "Asakai Board data input workspace",
  },
  {
    href: "/analysis",
    title: "Asakai Board",
    subtitle: "PPIC performance, material readiness, and inventory trends",
  },
  {
    href: "/users",
    title: "Users",
    subtitle: "Manage dashboard login accounts",
  },
  {
    href: "/packom",
    title: "Prod Acv Packom",
    subtitle: "Production achievement overview for packom",
  },
  {
    href: "/daily-planning",
    title: "Daily Planning",
    subtitle: "Daily production planning workspace",
  },
  {
    href: "/",
    title: "Dashboard",
    subtitle: "Production planning and inventory control overview",
  },
];

const roleLabels = {
  ADMIN: "Admin",
  CCR_OPERATION: "CCR Operation",
  CCR_GROUP_LEADER: "CCR Group Leader",
  USER: "User",
} as const;

function getThemeSnapshot(): Theme {
  return window.localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(themeChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(themeChangeEvent, onStoreChange);
  };
}

function saveTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(themeStorageKey, theme);
  window.dispatchEvent(new Event(themeChangeEvent));
}

export default function Topbar({
  isMobileSidebarOpen,
  compact = false,
  forceMenuButton = false,
  onToggleMobileSidebar,
}: TopbarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const userName = session?.user?.name ?? "User CCR";
  const userEmail = session?.user?.email ?? "Signed in";
  const userRole = session?.user?.role ?? "USER";
  const userRoleLabel = roleLabels[userRole];
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "UC";
  const pageHeader =
    pageHeaders.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
    ) ?? pageHeaders[pageHeaders.length - 1];
  const isDarkMode = theme === "dark";

  async function handleLogout() {
    setIsProfileMenuOpen(false);
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  function toggleTheme() {
    saveTheme(isDarkMode ? "light" : "dark");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4e7ec] bg-white">
      <div className={`flex items-center justify-between gap-3 ${compact ? "min-h-10 px-2 py-1" : "min-h-16 px-4 py-3 md:px-6"}`}>
        <div className={`flex min-w-0 flex-1 ${compact ? "gap-2" : "gap-3"}`}>
          <button
            className={`grid shrink-0 place-items-center rounded-lg border border-[#e4e7ec] bg-white text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#101828] ${compact ? "size-6" : forceMenuButton ? "size-10" : "size-10 lg:hidden"}`}
            aria-label="Open sidebar"
            aria-expanded={isMobileSidebarOpen}
            aria-controls="mobile-sidebar"
            onClick={onToggleMobileSidebar}
            type="button"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={compact ? "size-3.5" : "size-5"}>
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
            <h1 className={`truncate font-semibold text-[#101828] ${compact ? "text-xs" : "text-base"}`}>
              {pageHeader.title}
            </h1>
            <p className={`truncate font-medium text-[#667085] ${compact ? "text-[8px]" : "text-xs"}`}>
              {pageHeader.subtitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDarkMode}
            className={`relative grid place-items-center rounded-full border border-[#e4e7ec] bg-white text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#101828] ${compact ? "size-6" : "size-10"}`}
            type="button"
            onClick={toggleTheme}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={compact ? "size-3.5" : "size-5"}>
              {isDarkMode ? (
                <path
                  d="M12 4.25V3m0 18v-1.25M5.52 5.52l-.88-.88m14.72 14.72-.88-.88M4.25 12H3m18 0h-1.25M5.52 18.48l-.88.88M19.36 4.64l-.88.88M16.25 12a4.25 4.25 0 1 1-8.5 0 4.25 4.25 0 0 1 8.5 0Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              ) : (
                <path
                  d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              )}
            </svg>
          </button>

          <button
            aria-label="Notifications"
            className={`relative grid place-items-center rounded-full border border-[#e4e7ec] bg-white text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#101828] ${compact ? "size-6" : "size-10"}`}
            type="button"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={compact ? "size-3.5" : "size-5"}>
              <path
                d="M18 9.75a6 6 0 0 0-12 0c0 6-2 6.5-2 6.5h16s-2-.5-2-6.5ZM10 19h4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
            <span className="absolute right-2 top-2 size-2 rounded-full bg-[#f04438] ring-2 ring-white" />
          </button>

          <div className="relative ml-1">
            {isProfileMenuOpen ? (
              <button
                className="fixed inset-0 z-40 cursor-default"
                type="button"
                aria-label="Close profile menu"
                onClick={() => setIsProfileMenuOpen(false)}
              />
            ) : null}

            <button
              className={`relative z-50 flex items-center rounded-full border border-[#e4e7ec] bg-white py-1 pl-1 transition hover:bg-[#f9fafb] ${compact ? "h-7 gap-1 pr-1.5" : "h-11 gap-3 pr-3"}`}
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
            >
              <span className={`grid place-items-center rounded-full bg-[#101828] text-xs font-semibold text-white ${compact ? "size-5 text-[8px]" : "size-9"}`}>
                {userInitials}
              </span>
                <span className="hidden text-left sm:block">
                  <span className={`block font-medium text-[#101828] ${compact ? "text-[8px] leading-2.5" : "text-sm leading-4"}`}>
                    {userName}
                  </span>
                  <span className={`block text-[#667085] ${compact ? "text-[7px] leading-2" : "mt-0.5 text-xs"}`}>
                    {userRoleLabel}
                  </span>
                </span>
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className={`hidden text-[#667085] transition-transform sm:block ${compact ? "size-3" : "size-4"} ${
                  isProfileMenuOpen ? "rotate-180" : ""
                }`}
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

            {isProfileMenuOpen ? (
              <div
                className="absolute right-0 top-13 z-50 w-72 overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-lg"
                role="menu"
              >
                <div className="border-b border-[#e4e7ec] p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-[#101828] text-xs font-semibold text-white">
                      {userInitials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#101828]">
                          {userName}
                        </p>
                        <span className="text-xs font-medium text-[#465fff]">
                          {userRoleLabel}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#667085]">
                        {userEmail}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#b42318] transition hover:bg-[#fef3f2]"
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="size-5"
                    >
                      <path
                        d="M9.75 6.75V5.5a1.75 1.75 0 0 1 1.75-1.75h5A1.75 1.75 0 0 1 18.25 5.5v13a1.75 1.75 0 0 1-1.75 1.75h-5a1.75 1.75 0 0 1-1.75-1.75v-1.25M4.75 12h9M11 8.75 14.25 12 11 15.25"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
