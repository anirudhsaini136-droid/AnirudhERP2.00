import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const ShellContext = createContext(null);

export function ShellProvider({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo(
    () => ({ drawerOpen, setDrawerOpen, openDrawer, closeDrawer }),
    [drawerOpen, openDrawer, closeDrawer]
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be within ShellProvider");
  return ctx;
}
