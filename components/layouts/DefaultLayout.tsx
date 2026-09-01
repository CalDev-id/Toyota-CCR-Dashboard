"use client";

import Sidebar from "@/components/layouts/Sidebar";
import Topbar from "@/components/layouts/Topbar";
import { AsakaiDisplayModeContext } from "@/components/layouts/AsakaiDisplayModeContext";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

type DefaultLayoutProps = {
  children: React.ReactNode;
};

const asakaiDisplayStorageKey = "toyota-ccr-asakai-display-mode";
const asakaiDisplayModeChangeEvent = "toyota-ccr-asakai-display-mode-change";

function subscribeToAsakaiDisplayMode(onStoreChange: () => void) {
  window.addEventListener(asakaiDisplayModeChangeEvent, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(asakaiDisplayModeChangeEvent, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getAsakaiDisplayModeSnapshot() {
  return window.localStorage.getItem(asakaiDisplayStorageKey) === "true";
}

function getAsakaiDisplayModeServerSnapshot() {
  return false;
}

function subscribeToHydration() {
  return () => undefined;
}

function getHydratedSnapshot() {
  return true;
}

function getHydratedServerSnapshot() {
  return false;
}

function saveAsakaiDisplayMode(value: boolean) {
  if (value) {
    window.localStorage.setItem(asakaiDisplayStorageKey, "true");
  } else {
    window.localStorage.removeItem(asakaiDisplayStorageKey);
  }

  window.dispatchEvent(new Event(asakaiDisplayModeChangeEvent));
}

export default function DefaultLayout({
  children,
}: DefaultLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const savedPortraitDisplay = useSyncExternalStore(
    subscribeToAsakaiDisplayMode,
    getAsakaiDisplayModeSnapshot,
    getAsakaiDisplayModeServerSnapshot,
  );
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getHydratedServerSnapshot,
  );
  const pathname = usePathname();
  const isAnalysisPage = pathname.startsWith("/analysis");
  const isAsakaiBoardPage = pathname === "/analysis" || pathname === "/analysis/manual";
  const isDisplayActive = isHydrated && isAsakaiBoardPage && savedPortraitDisplay;

  useEffect(() => {
    if (!isAsakaiBoardPage && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, [isAsakaiBoardPage]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        saveAsakaiDisplayMode(false);
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const enterPortraitDisplay = useCallback(async () => {
    setIsMobileSidebarOpen(false);
    saveAsakaiDisplayMode(true);

    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // Keep the portrait layout available when fullscreen is blocked by the browser.
    }
  }, []);

  const exitPortraitDisplay = useCallback(async () => {
    saveAsakaiDisplayMode(false);

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-[#f9fafb] text-[#101828] print:h-auto print:overflow-visible print:bg-white">
      <AsakaiDisplayModeContext.Provider value={{ isPortraitDisplay: isDisplayActive, enterPortraitDisplay, exitPortraitDisplay }}>
        <div className="flex h-full overflow-hidden print:block print:h-auto print:overflow-visible">
          <Sidebar
            isCollapsed={isDisplayActive || isSidebarCollapsed}
            isMobileOpen={isMobileSidebarOpen}
            forceDesktopVisible={isDisplayActive}
            hideCollapseControl={isDisplayActive}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
          />

          <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] print:h-auto print:overflow-visible">
            <div className={isDisplayActive ? "h-[22px] shrink-0 overflow-hidden" : undefined}>
              <div
                style={isDisplayActive ? { width: "300%", transform: "scale(0.333333)", transformOrigin: "top left" } : undefined}
              >
                <Topbar
                  isMobileSidebarOpen={isMobileSidebarOpen}
                  forceMenuButton={isDisplayActive}
                  onToggleMobileSidebar={() =>
                    setIsMobileSidebarOpen((current) => !current)
                  }
                />
              </div>
            </div>

            <main className="print:p-0">
              <div
                className={isDisplayActive
                  ? "mx-auto w-full max-w-none p-2 print:p-0 print:max-w-none"
                  : isAnalysisPage
                  ? "mx-auto w-full max-w-none p-4 print:p-0 print:max-w-none"
                  : "mx-auto w-full max-w-screen-2xl p-3 md:p-4 2xl:p-5 print:p-0 print:max-w-none"}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </AsakaiDisplayModeContext.Provider>
    </div>
  );
}
