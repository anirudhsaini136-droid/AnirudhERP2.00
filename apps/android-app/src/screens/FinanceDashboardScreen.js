import React, { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getFinanceDashboard } from "../api";
import { HeroBand, KpiTile, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { chunkPairs, fmtInr } from "../utils/format";

export default function FinanceDashboardScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await getFinanceDashboard();
      setData(res);
    } catch (e) {
      Alert.alert("Error", e.message);
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
        { label: "Revenue (month)", value: fmtInr(s.revenue_this_month), emoji: "📊", accent: T.gold },
        { label: "Expenses (month)", value: fmtInr(s.expenses_this_month), emoji: "📉", accent: T.rose },
        { label: "Net profit", value: fmtInr(s.net_profit), emoji: "✓", accent: T.emerald },
        { label: "Outstanding", value: fmtInr(s.outstanding_amount), emoji: "⏳", accent: T.sapphire },
        {
          label: "Overdue",
          value: `${s.overdue_count ?? 0} · ${fmtInr(s.overdue_amount)}`,
          emoji: "⚠",
          accent: "#F59E0B",
        },
      ]),
    [s]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="FINANCE">
        <PageHeader title="Finance" subtitle="Revenue, expense & cash health at a glance" />
      </HeroBand>
      <Text style={S.sectionTitle}>Overview</Text>
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
