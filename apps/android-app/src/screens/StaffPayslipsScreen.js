import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getStaffPayslips } from "../api";
import { HeroBand, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function StaffPayslipsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStaffPayslips();
      setRows(res.payslips || []);
    } catch (e) {
      Alert.alert("Payslips", e.message);
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
      data={rows}
      keyExtractor={(r) => String(r.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="STAFF">
            <PageHeader title="My payslips" subtitle="Salary history" />
          </HeroBand>
        </View>
      }
      renderItem={({ item }) => (
        <View style={S.card}>
          <Text style={{ color: T.textPrimary, fontWeight: "700" }}>{item.period || item.month || "Payslip"}</Text>
          <Text style={S.row}>Net: ₹{Number(item.net_pay || 0).toLocaleString("en-IN")}</Text>
          <Text style={S.muted}>{item.status}</Text>
        </View>
      )}
      ListEmptyComponent={!loading ? <Text style={S.muted}>No payslips</Text> : null}
    />
  );
}
