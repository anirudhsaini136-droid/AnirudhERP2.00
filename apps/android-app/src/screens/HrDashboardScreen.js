import React, { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getHrDashboard } from "../api";
import { HeroBand, KpiTile, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { chunkPairs } from "../utils/format";

export default function HrDashboardScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await getHrDashboard();
      setData(res);
    } catch (e) {
      Alert.alert("HR", e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const s = data?.stats || {};

  const rows = useMemo(
    () =>
      chunkPairs([
        { label: "Employees", value: String(s.total_employees ?? 0), emoji: "👥", accent: T.gold },
        { label: "Present today", value: String(s.present_today ?? 0), emoji: "✓", accent: T.emerald },
        { label: "On leave", value: String(s.on_leave_today ?? 0), emoji: "☀", accent: T.sapphire },
        { label: "Pending leave", value: String(s.pending_leave_requests ?? 0), emoji: "📋", accent: "#F59E0B" },
        { label: "Attendance rate", value: `${s.attendance_rate ?? 0}%`, emoji: "📈", accent: T.gold },
        { label: "Payroll", value: String(s.payroll_status ?? "—"), emoji: "₹", accent: T.emerald },
      ]),
    [s]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="HR">
        <PageHeader title="HR" subtitle="Attendance, leave & payroll pulse" />
      </HeroBand>
      <Text style={S.sectionTitle}>Today</Text>
      {rows.map((pair, i) => (
        <View key={i} style={styles.kpiRow}>
          {pair.map((t, j) => (
            <View key={j} style={{ flex: 1 }}>
              <KpiTile label={t.label} value={t.value} emoji={t.emoji} accent={t.accent} />
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
});
