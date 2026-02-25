"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface PaperModeContextValue {
  paperMode: boolean;
  refreshPaperMode: () => void;
}

const PaperModeContext = createContext<PaperModeContextValue>({
  paperMode: false,
  refreshPaperMode: () => {},
});

export function PaperModeProvider({ children }: { children: ReactNode }) {
  const [paperMode, setPaperMode] = useState(false);

  const refreshPaperMode = useCallback(() => {
    fetch(`${BASE_URL}/api/v1/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { paperMode?: boolean } | null) => {
        if (d != null && typeof d.paperMode === "boolean") {
          setPaperMode(d.paperMode);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshPaperMode();
  }, [refreshPaperMode]);

  return (
    <PaperModeContext.Provider value={{ paperMode, refreshPaperMode }}>
      {children}
    </PaperModeContext.Provider>
  );
}

export function usePaperMode(): PaperModeContextValue {
  return useContext(PaperModeContext);
}
