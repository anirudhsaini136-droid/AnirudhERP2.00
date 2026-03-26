import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getSuperAdminDashboard } from "../api";
import { HeroBand, KpiTile, PageHeader } from "../components/NexusUi";
import AmbientAnimatedBackground from "../components/AmbientAnimatedBackground";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { chunkPairs, fmtInr } from "../utils/format";

export default function SuperAdminDashboardScreen({ navigation }) {
  const styles = React.useMemo(() => makeStyles(), [T.mode, T.screenBg, T.cardBg, T.border, T.textPrimary, T.textSecondary, T.textMuted]);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [boot, setBoot] = useState(true);
  const heroAnim = React.useRef(new Animated.Value(0)).current;
  const rowsAnim = React.useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await getSuperAdminDashboard();
      setData(res);
    } catch (e) {
      Alert.alert("Super Admin", e.message);
    } finally {
      setRefreshing(false);
      setBoot(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const s = data?.stats || {};
  const warnings = data?.expiring_warnings || {};

  const kpiRows = useMemo(() => {
    const tiles = [
      { label: "Total Businesses", value: String(s.total_businesses ?? 0), emoji: "🏢", accent: T.gold },
      { label: "Active", value: String(s.active_businesses ?? 0), emoji: "📈", accent: T.emerald },
      { label: "Trial", value: String(s.trial_businesses ?? 0), emoji: "⏱", accent: T.sapphire },
      { label: "Platform MRR", value: fmtInr(s.mrr), emoji: "₹", accent: T.gold, valueIsAccent: true },
      { label: "Expired", value: String(s.expired_businesses ?? 0), emoji: "⚠", accent: T.rose },
      { label: "New This Month", value: String(s.new_signups_this_month ?? 0), emoji: "↗", accent: T.emerald },
    ];
    return chunkPairs(tiles);
  }, [s]);

  React.useEffect(() => {
    if (!data) return;
    heroAnim.setValue(0);
    rowsAnim.setValue(0);
    Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rowsAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [data, heroAnim, rowsAnim]);

  if (boot && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.gold} size="large" />
        <Text style={styles.centerSub}>Loading platform…</Text>
      </View>
    );
  }

  const urgent = warnings.within_3_days || [];
  const soon = (warnings.within_14_days || []).filter((b) => (b.days_remaining ?? 0) > 3);

  return (
    <View style={styles.screen}>
      <AmbientAnimatedBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.gold} />}
      >
        <Animated.View
          style={{
            opacity: heroAnim,
            transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          <HeroBand eyebrow="SUPER ADMIN">
            <PageHeader
              title="Platform Overview"
              subtitle="Monitor all businesses and subscriptions"
              footnote="MRR sums active accounts from your pricing; trials count only when amount > 0."
            />
          </HeroBand>
        </Animated.View>

      <Text style={S.sectionTitle}>Key metrics</Text>
      {kpiRows.map((pair, ri) => (
        <Animated.View
          key={ri}
          style={[
            styles.kpiRow,
            {
              opacity: rowsAnim,
              transform: [
                {
                  translateY: rowsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16 + ri * 4, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {pair.map((t, ti) => (
            <View key={ti} style={styles.kpiCell}>
              <KpiTile
                label={t.label}
                value={t.value}
                emoji={t.emoji}
                accent={t.accent}
                valueIsAccent={t.valueIsAccent !== false}
              />
            </View>
          ))}
        </Animated.View>
      ))}

      {(urgent.length > 0 || soon.length > 0) && (
        <>
          <Text style={S.sectionTitle}>Expiring subscriptions</Text>
          <View style={styles.panel}>
            {urgent.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.warnRow, styles.warnUrgent]}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("SuperAdminBusinessDetail", { id: b.id, title: b.name })}
              >
                <Text style={styles.warnEmoji}>⚠</Text>
                <View style={styles.warnBody}>
                  <Text style={styles.warnName}>{b.name}</Text>
                  <Text style={styles.warnEmail}>{b.email}</Text>
                </View>
                <View style={styles.badgeDanger}>
                  <Text style={styles.badgeDangerTx}>{b.days_remaining}d</Text>
                </View>
              </TouchableOpacity>
            ))}
            {soon.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.warnRow, styles.warnSoon]}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("SuperAdminBusinessDetail", { id: b.id, title: b.name })}
              >
                <Text style={styles.warnEmoji}>⏱</Text>
                <View style={styles.warnBody}>
                  <Text style={styles.warnName}>{b.name}</Text>
                  <Text style={styles.warnEmail}>{b.email}</Text>
                </View>
                <View style={styles.badgeWarn}>
                  <Text style={styles.badgeWarnTx}>{b.days_remaining}d</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={S.sectionTitle}>Quick actions</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnGold}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("SuperAdminBusinesses")}
        >
          <Text style={styles.btnGoldTxt}>View all businesses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnGhost}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("PlatformSettings")}
        >
          <Text style={styles.btnGhostTxt}>Platform settings</Text>
        </TouchableOpacity>
      </View>

      {data?.recent_activity?.length > 0 ? (
        <>
          <Text style={S.sectionTitle}>Recent activity</Text>
          <View style={styles.panel}>
            {data.recent_activity.slice(0, 12).map((a, i) => (
              <View key={i} style={styles.activityRow}>
                <View style={styles.activityDot} />
                <Text style={styles.activityTxt} numberOfLines={2}>
                  {a.description || a.action || "—"}
                </Text>
                <Text style={styles.activityDate}>
                  {a.created_at
                    ? new Date(a.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : ""}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: T.screenBg },
    scroll: { flex: 1, backgroundColor: "transparent" },
    scrollInner: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: T.screenBg },
    centerSub: { color: T.textMuted, marginTop: 12, fontSize: 13 },
    sectionTitle: {
      color: T.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      marginTop: 22,
      marginBottom: 12,
      letterSpacing: -0.2,
    },
    kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
    kpiCell: { flex: 1 },
    panel: {
      backgroundColor: T.cardBg,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: T.border,
    },
    warnRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 14,
      marginBottom: 8,
    },
    warnUrgent: { backgroundColor: "rgba(244,63,94,0.08)", borderWidth: 1, borderColor: "rgba(244,63,94,0.2)" },
    warnSoon: { backgroundColor: "rgba(245,158,11,0.08)", borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
    warnEmoji: { fontSize: 16, marginRight: 10 },
    warnBody: { flex: 1 },
    warnName: { color: T.textPrimary, fontWeight: "700", fontSize: 14 },
    warnEmail: { color: T.textMuted, fontSize: 12, marginTop: 2 },
    badgeDanger: {
      backgroundColor: "rgba(244,63,94,0.2)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeDangerTx: { color: "#FDA4AF", fontSize: 11, fontWeight: "800" },
    badgeWarn: {
      backgroundColor: "rgba(245,158,11,0.2)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeWarnTx: { color: "#FCD34D", fontSize: 11, fontWeight: "800" },
    actions: { gap: 10, marginTop: 4 },
    btnGold: {
      backgroundColor: T.mode === "light" ? "#FFFFFF" : T.gold,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      borderWidth: 1,
      borderColor: T.mode === "light" ? "rgba(184,148,44,0.45)" : "transparent",
    },
    btnGoldTxt: {
      color: T.mode === "light" ? "#8A6608" : "#111",
      fontWeight: "900",
      fontSize: 15,
      letterSpacing: 0.2,
    },
    btnGhost: {
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: T.mode === "light" ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.12)",
      backgroundColor: T.mode === "light" ? "rgba(15,23,42,0.03)" : "rgba(255,255,255,0.04)",
    },
    btnGhostTxt: { color: T.textPrimary, fontWeight: "700", fontSize: 14 },
    activityRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: T.mode === "light" ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.06)",
    },
    activityDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "rgba(212,175,55,0.5)",
      marginTop: 5,
      marginRight: 10,
    },
    activityTxt: { flex: 1, color: T.textSecondary, fontSize: 13, lineHeight: 18 },
    activityDate: { color: T.textMuted, fontSize: 11, marginLeft: 8 },
  });
}
