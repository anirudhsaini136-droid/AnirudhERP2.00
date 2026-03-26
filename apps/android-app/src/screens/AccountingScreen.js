import React, { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTrialBalance } from "../api";
import {
  ContentPanel,
  EmptyState,
  HeroBand,
  ListRowCard,
  LoadingCenter,
  PageHeader,
  StatusPill,
} from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

export default function AccountingScreen() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getTrialBalance();
      setRows(data.rows || []);
      setTotals({ debit: data.total_debit, credit: data.total_credit, balanced: data.is_balanced });
    } catch (e) {
      Alert.alert("Accounting", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && rows.length === 0) return <LoadingCenter label="Loading trial balance…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={rows}
      keyExtractor={(r) => String(r.code)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 12 }}>
          <HeroBand eyebrow="LEDGER">
            <PageHeader title="Accounting" subtitle="Trial balance & double-entry health" />
          </HeroBand>
          <ContentPanel>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: T.textMuted, fontSize: 12 }}>Debit / Credit</Text>
                <Text style={{ color: T.textPrimary, fontWeight: "800", fontSize: 16, marginTop: 6 }}>
                  {fmtInr(totals.debit)} · {fmtInr(totals.credit)}
                </Text>
              </View>
              <StatusPill text={totals.balanced ? "Balanced" : "Check"} variant={totals.balanced ? "success" : "warning"} />
            </View>
          </ContentPanel>
        </View>
      }
      renderItem={({ item }) => (
        <ListRowCard
          title={item.code}
          subtitle={item.name}
          meta={`Dr ${fmtInr(item.debit)} · Cr ${fmtInr(item.credit)}`}
        />
      )}
      ListEmptyComponent={<EmptyState message="No ledger rows" />}
    />
  );
}
