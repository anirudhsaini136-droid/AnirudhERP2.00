import React, { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getHrPayroll } from "../api";
import { HeroBand, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function HrPayrollScreen() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getHrPayroll();
      setRuns(res.payroll_runs || []);
    } catch (e) {
      Alert.alert("Payroll", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={runs}
      keyExtractor={(r) => String(r.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="HR">
            <PageHeader title="Payroll" subtitle="Payroll runs (create on web for full workflow)" />
          </HeroBand>
        </View>
      }
      renderItem={({ item }) => (
        <View style={S.card}>
          <Text style={{ color: T.textPrimary, fontWeight: "700" }}>{item.period_label || item.period || "Run"}</Text>
          <Text style={S.row}>Status: {item.status}</Text>
          <Text style={S.muted}>{item.created_at || ""}</Text>
        </View>
      )}
      ListEmptyComponent={!loading ? <Text style={S.muted}>No payroll runs yet</Text> : null}
    />
  );
}
