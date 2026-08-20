"use client";

import Sidebar from "@/components/layouts/Sidebar";
import Topbar from "@/components/layouts/Topbar";
import { usePathname } from "next/navigation";
import { useState } from "react";

type DefaultLayoutProps = {
  children: React.ReactNode;
};

export default function DefaultLayout({
  children,
}: DefaultLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isAnalysisPage = pathname.startsWith("/analysis");

  return (
    <div className="h-screen overflow-hidden bg-[#f9fafb] text-[#101828]">
        <div className="flex h-full overflow-hidden">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
          />

          <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
            <Topbar
              isMobileSidebarOpen={isMobileSidebarOpen}
              onToggleMobileSidebar={() =>
                setIsMobileSidebarOpen((current) => !current)
              }
            />

            <main>
              <div
                className={isAnalysisPage
                  ? "mx-auto w-full max-w-none p-4"
                  : "mx-auto w-full max-w-screen-2xl p-3 md:p-4 2xl:p-5"}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
    </div>
  );
}
