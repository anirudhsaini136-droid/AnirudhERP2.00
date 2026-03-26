import React, { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getFinanceProfitLossReport } from "../api";
import { HeroBand, PageHeader, StatCard } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export default function FinanceReportsScreen() {
  const [period, setPeriod] = useState("monthly");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getFinanceProfitLossReport(period);
      setData(res);
    } catch (e) {
      Alert.alert("Reports", e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const summary = data?.summary || {};

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="ANALYTICS">
        <PageHeader title="Financial reports" subtitle="Revenue, expenses and profitability" />
      </HeroBand>
      <View style={styles.seg}>
        {["monthly", "quarterly", "yearly"].map((p) => (
          <TouchableOpacity key={p} style={[styles.segBtn, period === p && styles.segBtnOn]} onPress={() => setPeriod(p)}>
            <Text style={[styles.segTx, period === p && styles.segTxOn]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <StatCard label="Total revenue" value={fmt(summary.total_revenue)} />
      <StatCard label="Total expenses" value={fmt(summary.total_expenses)} />
      <StatCard label="Net profit" value={fmt(summary.net_profit)} />
      <StatCard label="Profit margin" value={`${summary.profit_margin?.toFixed?.(1) ?? 0}%`} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: "row", gap: 6, marginBottom: 16, padding: 4, borderRadius: 14, backgroundColor: T.cardBg, borderWidth: 1, borderColor: T.border },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  segBtnOn: { backgroundColor: "rgba(255,255,255,0.08)" },
  segTx: { color: T.textMuted, fontSize: 12, textTransform: "capitalize" },
  segTxOn: { color: T.textPrimary, fontWeight: "700" },
});
