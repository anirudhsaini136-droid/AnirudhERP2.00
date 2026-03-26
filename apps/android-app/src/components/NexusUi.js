import React, { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useScreenStyles } from "../theme/screenStyles";

/** Page title block */
export function PageHeader({ title, subtitle, footnote, eyebrow }) {
  const { tokens: T } = useTheme();
  const S = useScreenStyles();
  const styles = useMemo(() => makeStyles(T), [T]);
  return (
    <View style={{ marginBottom: 18 }}>
      {eyebrow ? <Text style={S.sectionEyebrow}>{eyebrow}</Text> : null}
      <Text style={S.title}>{title}</Text>
      {subtitle ? <Text style={S.subtitle}>{subtitle}</Text> : null}
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </View>
  );
}

/** Gold-tinted hero band (module home) */
export function HeroBand({ eyebrow, children }) {
  const { tokens: T } = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [T.mode, eyebrow]);

  const animStyle = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  };
  return (
    <Animated.View style={[styles.heroBand, animStyle]}>
      {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
      {children}
    </Animated.View>
  );
}

export function StatCard({ label, value }) {
  const S = useScreenStyles();
  return (
    <View style={S.card}>
      <Text style={S.cardLabel}>{label}</Text>
      <Text style={S.cardValue}>{value}</Text>
    </View>
  );
}

/** KPI tile — top accent, icon chip */
export function KpiTile({ label, value, emoji, accent, valueIsAccent = true }) {
  const { tokens: T } = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const ac = accent || T.gold;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [T.mode, label]);

  const animStyle = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [6, 0],
        }),
      },
    ],
  };
  return (
    <Animated.View style={[styles.kpi, { borderColor: `${ac}35`, borderTopColor: ac }, animStyle]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${ac}1a` }]}>
        <Text style={styles.kpiEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, valueIsAccent && { color: ac }]} numberOfLines={2}>
        {value}
      </Text>
    </Animated.View>
  );
}

/** Rounded panel (warnings, activity) */
export function ContentPanel({ children, style }) {
  const { tokens: T } = useTheme();
  const styles2 = useMemo(() => makeStyles(T), [T]);
  return <View style={[styles2.panel, style]}>{children}</View>;
}

/** List cell — pressable row */
export function ListRowCard({ title, subtitle, meta, badge, badgeColor, onPress, children }) {
  const { tokens: T } = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const pressAnim = useRef(new Animated.Value(0)).current;

  const pressIn = () => {
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 180, mass: 0.6 }).start();
  };

  const pressOut = () => {
    Animated.spring(pressAnim, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180, mass: 0.6 }).start();
  };

  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.99],
  });

  const Body = (
    <Animated.View style={[styles.lrCard, { transform: [{ scale }] }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.lrTitle} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.lrSub} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {meta ? (
            <Text style={styles.lrMeta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        {badge ? (
          <View style={[styles.pill, { borderColor: (badgeColor || T.gold) + "55", backgroundColor: (badgeColor || T.gold) + "18" }]}>
            <Text style={[styles.pillTx, { color: badgeColor || T.gold }]} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      {children}
    </Animated.View>
  );
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.88} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        {Body}
      </TouchableOpacity>
    );
  }
  return Body;
}

export function LoadingCenter({ label }) {
  const { tokens: T } = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  return (
    <View style={styles.center}>
      <ActivityIndicator color={T.gold} size="large" />
      {label ? <Text style={styles.centerLabel}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ message }) {
  const { tokens: T } = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  return <Text style={styles.empty}>{message}</Text>;
}

function pillVariantStyle(v) {
  switch (v) {
    case "success":
      return { bg: "rgba(16,185,129,0.15)", fg: "emerald", bd: "rgba(16,185,129,0.35)" };
    case "warning":
      return { bg: "rgba(245,158,11,0.12)", fg: "#FCD34D", bd: "rgba(245,158,11,0.35)" };
    case "danger":
      return { bg: "rgba(244,63,94,0.12)", fg: "#FDA4AF", bd: "rgba(244,63,94,0.35)" };
    default:
      return { bg: "rgba(212,175,55,0.15)", fg: "gold", bd: "rgba(212,175,55,0.35)" };
  }
}

export function StatusPill({ text, variant = "default" }) {
  const { tokens: T } = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const raw = pillVariantStyle(variant);
  const p = {
    bg: raw.bg,
    bd: raw.bd,
    fg: raw.fg === "emerald" ? T.emerald : raw.fg === "gold" ? T.gold : raw.fg,
  };
  return (
    <View style={[styles.pill, { backgroundColor: p.bg, borderColor: p.bd }]}>
      <Text style={[styles.pillTx, { color: p.fg }]}>{text}</Text>
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled }) {
  const S = useScreenStyles();
  return (
    <TouchableOpacity
      style={[S.btnPrimary, disabled && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      <Text style={S.btnPrimaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ title, onPress }) {
  const S = useScreenStyles();
  return (
    <TouchableOpacity style={S.btnSecondary} onPress={onPress} activeOpacity={0.9}>
      <Text style={S.btnSecondaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(T) {
  const shDark = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
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
    footnote: { color: T.textMuted, fontSize: 11, lineHeight: 16, marginTop: 8 },
    heroBand: {
      borderRadius: 22,
      padding: 20,
      marginBottom: 10,
      backgroundColor: T.mode === "light" ? "rgba(255,255,255,0.92)" : "rgba(212,175,55,0.09)",
      borderWidth: 1,
      borderColor: T.mode === "light" ? "rgba(194,142,14,0.22)" : "rgba(212,175,55,0.20)",
      ...shadow,
    },
    heroEyebrow: {
      color: T.gold,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      marginBottom: 8,
    },
    kpi: {
      flex: 1,
      minWidth: 0,
      backgroundColor: T.cardBg,
      borderRadius: 18,
      padding: 15,
      borderWidth: 1,
      borderTopWidth: 3.5,
      ...shadow,
    },
    kpiIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    kpiEmoji: { fontSize: 18 },
    kpiLabel: {
      color: T.textMuted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    kpiValue: {
      color: T.textPrimary,
      fontSize: 19,
      fontWeight: "800",
      marginTop: 6,
      letterSpacing: -0.5,
    },
    panel: {
      backgroundColor: T.cardBg,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: T.border,
      marginBottom: 14,
      ...shadow,
    },
    lrTitle: { color: T.textPrimary, fontWeight: "800", fontSize: 16, letterSpacing: -0.24 },
    lrSub: { color: T.textSecondary, marginTop: 6, fontSize: 13, lineHeight: 18 },
    lrMeta: { color: T.textMuted, marginTop: 6, fontSize: 12 },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
      maxWidth: "42%",
    },
    pillTx: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
    lrCard: {
      backgroundColor: T.cardBg,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: T.border,
      ...shadow,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: T.screenBg,
      padding: 24,
    },
    centerLabel: { color: T.textMuted, marginTop: 14, fontSize: 13 },
    empty: { color: T.textMuted, textAlign: "center", marginTop: 36, fontSize: 14, paddingHorizontal: 24 },
  });
}
