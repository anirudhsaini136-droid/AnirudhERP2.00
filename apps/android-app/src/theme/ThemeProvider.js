import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { applyTokens } from "./tokens";

export const THEME_PREFS = /** @type {const} */ ({
  system: "system",
  light: "light",
  dark: "dark",
});

const KEY_THEME_PREF = "theme_pref";

function makeTokens(mode) {
  const m = mode === "light" ? "light" : "dark";
  if (m === "light") {
    return {
      mode: "light",
      obsidian: "#FFFFFF",
      voidBg: "#F3F5FB",
      abyss: "#E9EEF8",
      surface: "#FFFFFF",
      screenBg: "#F2F4FA",
      cardBg: "#FFFFFF",
      border: "rgba(15,23,42,0.10)",
      gold: "#C28E0E",
      goldMuted: "#9B6F08",
      textPrimary: "#0B1220",
      textSecondary: "#253247",
      textMuted: "#5D6B84",
      emerald: "#059669",
      rose: "#E11D48",
      sapphire: "#2563EB",
    };
  }
  return {
    mode: "dark",
    obsidian: "#02040A",
    voidBg: "#060A13",
    abyss: "#0E1421",
    surface: "#182132",
    screenBg: "#0A0F1A",
    cardBg: "#121A28",
    border: "rgba(148,163,184,0.22)",
    gold: "#D4AF37",
    goldMuted: "#B8942C",
    textPrimary: "#E7EEF9",
    textSecondary: "#A7B4C8",
    textMuted: "#7E8CA3",
    emerald: "#10B981",
    rose: "#F43F5E",
    sapphire: "#4F8DFF",
  };
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const [pref, setPref] = useState(THEME_PREFS.system);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY_THEME_PREF);
        if (!cancelled && saved && Object.values(THEME_PREFS).includes(saved)) setPref(saved);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveMode = pref === THEME_PREFS.system ? (systemScheme === "light" ? "light" : "dark") : pref;
  const tokens = useMemo(() => makeTokens(effectiveMode), [effectiveMode]);

  useEffect(() => {
    applyTokens(tokens);
  }, [tokens]);

  const setThemePref = async (next) => {
    const v = Object.values(THEME_PREFS).includes(next) ? next : THEME_PREFS.system;
    setPref(v);
    try {
      await AsyncStorage.setItem(KEY_THEME_PREF, v);
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({
      ready,
      pref,
      effectiveMode,
      tokens,
      setThemePref,
    }),
    [ready, pref, effectiveMode, tokens]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

