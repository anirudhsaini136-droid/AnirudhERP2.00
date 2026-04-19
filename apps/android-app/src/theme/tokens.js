/**
 * Theme tokens (LIVE bindings).
 *
 * Most screens import `* as T from "../theme/tokens"`. These exports are `let` so
 * they can be updated at runtime when the user switches themes.
 */

export let mode = "dark";

/** NexaERP web palette (tailwind / DashboardLayout) → React Native */
export let obsidian = "#030306";
export let voidBg = "#08090E";
export let abyss = "#0D1017";
export let surface = "#1A1F2E";
export let screenBg = "#0b0d11";
export let cardBg = "#161b22";
export let border = "#21262d";
export let gold = "#D4AF37";
export let goldMuted = "#B8942C";
export let textPrimary = "#e6edf3";
export let textSecondary = "#9aa4b2";
export let textMuted = "#6e7681";
export let emerald = "#10B981";
export let rose = "#F43F5E";
export let sapphire = "#3B82F6";

export function applyTokens(t) {
  if (!t) return;
  mode = t.mode || mode;
  obsidian = t.obsidian || obsidian;
  voidBg = t.voidBg || voidBg;
  abyss = t.abyss || abyss;
  surface = t.surface || surface;
  screenBg = t.screenBg || screenBg;
  cardBg = t.cardBg || cardBg;
  border = t.border || border;
  gold = t.gold || gold;
  goldMuted = t.goldMuted || goldMuted;
  textPrimary = t.textPrimary || textPrimary;
  textSecondary = t.textSecondary || textSecondary;
  textMuted = t.textMuted || textMuted;
  emerald = t.emerald || emerald;
  rose = t.rose || rose;
  sapphire = t.sapphire || sapphire;
}
