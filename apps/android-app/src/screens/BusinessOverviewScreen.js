import React, { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getBusinessDashboard } from "../api";
import { HeroBand, KpiTile, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { chunkPairs, fmtInr } from "../utils/format";

export default function BusinessOverviewScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await getBusinessDashboard();
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
        { label: "Revenue (month)", value: fmtInr(s.monthly_revenue), emoji: "💹", accent: T.gold },
        { label: "Outstanding", value: fmtInr(s.outstanding_invoices), emoji: "📬", accent: T.sapphire },
        { label: "Overdue count", value: String(s.overdue_count ?? 0), emoji: "⚠", accent: T.rose },
        { label: "Expenses (month)", value: fmtInr(s.total_expenses), emoji: "📉", accent: "#F59E0B" },
        { label: "Net profit (month)", value: fmtInr(s.net_profit), emoji: "✓", accent: T.emerald },
        { label: "Employees", value: String(s.total_employees ?? 0), emoji: "👥", accent: T.gold },
        { label: "Low stock SKUs", value: String(s.low_stock_count ?? 0), emoji: "📦", accent: T.sapphire },
      ]),
    [s]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="BUSINESS">
        <PageHeader title="Dashboard" subtitle="Snapshot of revenue, people & inventory risk" />
      </HeroBand>
      <Text style={S.sectionTitle}>Key metrics</Text>
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
