import React, { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getInventoryDashboard } from "../api";
import { HeroBand, KpiTile, ListRowCard, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { chunkPairs, fmtInr } from "../utils/format";

export default function InventoryDashboardScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await getInventoryDashboard();
      setData(res);
    } catch (e) {
      Alert.alert("Inventory", e.message);
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
  const low = data?.low_stock_items || [];

  const rows = useMemo(
    () =>
      chunkPairs([
        { label: "Products", value: String(s.total_products ?? 0), emoji: "📦", accent: T.gold },
        { label: "Low stock SKUs", value: String(s.low_stock_count ?? 0), emoji: "⚠", accent: T.rose },
        { label: "Stock value", value: fmtInr(s.total_value), emoji: "₹", accent: T.emerald },
      ]),
    [s]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="INVENTORY">
        <PageHeader title="Inventory" subtitle="SKUs, valuation & replenishment alerts" />
      </HeroBand>
      <Text style={S.sectionTitle}>Snapshot</Text>
      {rows.map((pair, i) => (
        <View key={i} style={styles.kpiRow}>
          {pair.map((t, j) => (
            <View key={j} style={{ flex: 1 }}>
              <KpiTile label={t.label} value={t.value} emoji={t.emoji} accent={t.accent} />
            </View>
          ))}
        </View>
      ))}
      {low.length > 0 ? (
        <>
          <Text style={S.sectionTitle}>Low stock</Text>
          {low.slice(0, 20).map((p) => (
            <ListRowCard
              key={p.id || p.name}
              title={p.name}
              subtitle={`Stock ${p.current_stock ?? 0} · min ${p.minimum_stock ?? 0}`}
              badge="Reorder"
              badgeColor={T.rose}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
});
