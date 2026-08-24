"use client";

import { createContext, useContext } from "react";

export type AsakaiDisplayMode = {
  isPortraitDisplay: boolean;
  enterPortraitDisplay: () => Promise<void>;
  exitPortraitDisplay: () => Promise<void>;
};

export const AsakaiDisplayModeContext = createContext<AsakaiDisplayMode | null>(null);

export function useAsakaiDisplayMode() {
  const context = useContext(AsakaiDisplayModeContext);

  if (!context) {
    throw new Error("useAsakaiDisplayMode must be used within DefaultLayout");
  }

  return context;
}
