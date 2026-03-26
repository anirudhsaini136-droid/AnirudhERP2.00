import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "./ThemeProvider";
import * as Tokens from "./tokens";

export function makeScreenStyles(T) {
  const shDark = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 7,
  };
  const shLight = {
    shadowColor: "rgba(2,6,23,0.25)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  };
  const shadow = T.mode === "light" ? shLight : shDark;
  return StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
    title: { color: T.textPrimary, fontSize: 26, fontWeight: "800", marginBottom: 6, letterSpacing: -0.6 },
    subtitle: { color: T.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 4 },
    card: {
      backgroundColor: T.cardBg,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: T.border,
      ...shadow,
    },
    cardLabel: { color: T.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, letterSpacing: 0.4 },
    cardValue: { color: T.textPrimary, fontSize: 21, fontWeight: "800", letterSpacing: -0.45 },
    row: { color: T.textSecondary, fontSize: 14, marginTop: 8, lineHeight: 20 },
    muted: { color: T.textMuted, fontSize: 12, lineHeight: 17 },
    sectionTitle: {
      color: T.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      marginTop: 20,
      marginBottom: 12,
      letterSpacing: -0.2,
    },
    sectionEyebrow: {
      color: T.gold,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      marginBottom: 8,
    },
    chip: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: "rgba(212,175,55,0.12)",
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.28)",
    },
    chipText: { color: T.gold, fontSize: 11, fontWeight: "700" },
    btnPrimary: {
      backgroundColor: T.gold,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 12,
    },
    btnPrimaryText: { color: "#111", fontWeight: "800", fontSize: 15 },
    btnSecondary: {
      backgroundColor: T.mode === "light" ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.05)",
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: T.mode === "light" ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.12)",
      marginTop: 10,
    },
    btnSecondaryText: { color: T.textPrimary, fontWeight: "700", fontSize: 14 },
    input: {
      backgroundColor: T.mode === "light" ? "#FFFFFF" : T.abyss,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 14,
      padding: 15,
      color: T.textPrimary,
      marginBottom: 12,
      fontSize: 15,
    },
  });
}

export function useScreenStyles() {
  const { tokens: T } = useTheme();
  return useMemo(() => makeScreenStyles(T), [T]);
}

/**
 * Back-compat export used across existing screens.
 * This is a *dynamic* style map so theme switches are reflected without
 * requiring every screen to be refactored immediately.
 */
export const S = /** @type {any} */ ({});

Object.defineProperties(S, {
  flex: { get: () => ({ flex: 1 }) },
  scrollContent: { get: () => ({ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }) },
  title: { get: () => ({ color: Tokens.textPrimary, fontSize: 26, fontWeight: "800", marginBottom: 6, letterSpacing: -0.6 }) },
  subtitle: { get: () => ({ color: Tokens.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 4 }) },
  card: {
    get: () => ({
      backgroundColor: Tokens.cardBg,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: Tokens.border,
      ...(Tokens.mode === "light"
        ? {
            shadowColor: "rgba(2,6,23,0.25)",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 14,
            elevation: 6,
          }
        : {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.24,
            shadowRadius: 18,
            elevation: 7,
          }),
    }),
  },
  cardLabel: { get: () => ({ color: Tokens.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, letterSpacing: 0.4 }) },
  cardValue: { get: () => ({ color: Tokens.textPrimary, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 }) },
  row: { get: () => ({ color: Tokens.textSecondary, fontSize: 14, marginTop: 8, lineHeight: 20 }) },
  muted: { get: () => ({ color: Tokens.textMuted, fontSize: 12, lineHeight: 17 }) },
  sectionTitle: {
    get: () => ({
      color: Tokens.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      marginTop: 20,
      marginBottom: 12,
      letterSpacing: -0.2,
    }),
  },
  sectionEyebrow: { get: () => ({ color: Tokens.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 }) },
  chip: {
    get: () => ({
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: "rgba(212,175,55,0.12)",
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.28)",
    }),
  },
  chipText: { get: () => ({ color: Tokens.gold, fontSize: 11, fontWeight: "700" }) },
  btnPrimary: { get: () => ({ backgroundColor: Tokens.gold, paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 12 }) },
  btnPrimaryText: { get: () => ({ color: "#111", fontWeight: "800", fontSize: 15 }) },
  btnSecondary: {
    get: () => ({
      backgroundColor: Tokens.mode === "light" ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.05)",
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: Tokens.mode === "light" ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.12)",
      marginTop: 10,
    }),
  },
  btnSecondaryText: { get: () => ({ color: Tokens.textPrimary, fontWeight: "700", fontSize: 14 }) },
  input: {
    get: () => ({
      backgroundColor: Tokens.mode === "light" ? "#FFFFFF" : Tokens.abyss,
      borderWidth: 1,
      borderColor: Tokens.border,
      borderRadius: 14,
      padding: 14,
      color: Tokens.textPrimary,
      marginBottom: 12,
      fontSize: 15,
    }),
  },
});
