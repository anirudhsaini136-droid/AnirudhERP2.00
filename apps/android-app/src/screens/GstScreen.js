import React, { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getGstSummary } from "../api";
import { ContentPanel, HeroBand, KpiTile, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { chunkPairs, fmtInr } from "../utils/format";

function monthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n) => String(n).padStart(2, "0");
  const start = `${y}-${pad(m + 1)}-01`;
  const last = new Date(y, m + 1, 0);
  const end = `${y}-${pad(m + 1)}-${pad(last.getDate())}`;
  return { start_date: start, end_date: end };
}

export default function GstScreen() {
  const range = useMemo(() => monthRange(), []);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await getGstSummary(range);
      setData(res);
    } catch (e) {
      Alert.alert("GST", e.message);
    } finally {
      setRefreshing(false);
    }
  }, [range.start_date, range.end_date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const s = data?.summary || {};
  const period = data?.period || range;

  const topKpi = useMemo(
    () =>
      chunkPairs([
        { label: "Taxable value", value: fmtInr(s.total_taxable_value), emoji: "📑", accent: T.gold },
        { label: "Total tax", value: fmtInr(s.total_tax), emoji: "₹", accent: T.emerald },
        { label: "Total sales", value: fmtInr(s.total_sales), emoji: "📈", accent: T.sapphire },
        { label: "Invoices", value: String(s.total_invoices ?? 0), emoji: "🧾", accent: T.gold },
      ]),
    [s]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="COMPLIANCE">
        <PageHeader
          title="GST reports"
          subtitle="Summary for the selected filing window"
          footnote={`${period?.start || range.start_date} → ${period?.end || range.end_date}`}
        />
      </HeroBand>
      <Text style={S.sectionTitle}>Highlights</Text>
      {topKpi.map((pair, i) => (
        <View key={i} style={styles.kpiRow}>
          {pair.map((t, j) => (
            <View key={j} style={{ flex: 1 }}>
              <KpiTile label={t.label} value={t.value} emoji={t.emoji} accent={t.accent} />
            </View>
          ))}
        </View>
      ))}
      <ContentPanel>
        <Text style={styles.panelTitle}>Tax break-up</Text>
        <Text style={styles.row}>CGST · {fmtInr(s.total_cgst)}</Text>
        <Text style={styles.row}>SGST · {fmtInr(s.total_sgst)}</Text>
        <Text style={styles.row}>IGST · {fmtInr(s.total_igst)}</Text>
        <Text style={[styles.row, { marginTop: 10 }]}>
          Intrastate / interstate · {s.intrastate_count ?? 0} / {s.interstate_count ?? 0}
        </Text>
      </ContentPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  panelTitle: { color: T.textPrimary, fontWeight: "800", fontSize: 16, marginBottom: 12 },
  row: { color: T.textSecondary, fontSize: 14, marginBottom: 8 },
});
