import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getHrLeaveRequests, putHrLeaveRequestAction } from "../api";
import { HeroBand, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function HrLeaveScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== "all") params.status = filter;
      const res = await getHrLeaveRequests(params);
      setRows(res.leave_requests || []);
    } catch (e) {
      Alert.alert("Leave", e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const act = async (id, action) => {
    try {
      await putHrLeaveRequestAction(id, action);
      load();
    } catch (e) {
      Alert.alert("Leave", e.message);
    }
  };

  return (
    <View style={[S.flex, { backgroundColor: T.screenBg }]}>
      <FlatList
        contentContainerStyle={S.scrollContent}
        data={rows}
        keyExtractor={(r) => String(r.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
        ListHeaderComponent={
          <>
            <View style={{ marginBottom: 6 }}>
              <HeroBand eyebrow="HR">
                <PageHeader title="Leave management" subtitle="Approve or reject requests" />
              </HeroBand>
            </View>
            <View style={styles.tabs}>
              {["all", "pending", "approved", "rejected"].map((k) => (
                <TouchableOpacity key={k} style={[styles.tab, filter === k && styles.tabOn]} onPress={() => setFilter(k)}>
                  <Text style={[styles.tabTx, filter === k && styles.tabTxOn]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={S.card}>
            <Text style={{ color: T.textPrimary, fontWeight: "700" }}>{item.employee_name || "Employee"}</Text>
            <Text style={S.row}>{item.leave_type} · {item.start_date} → {item.end_date}</Text>
            <Text style={S.muted}>Status: {item.status}</Text>
            {item.status === "pending" ? (
              <View style={styles.rowBtn}>
                <TouchableOpacity style={styles.approve} onPress={() => act(item.id, "approve")}>
                  <Text style={styles.approveTx}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reject} onPress={() => act(item.id, "reject")}>
                  <Text style={styles.rejectTx}>Reject</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={S.muted}>No leave requests</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: T.border },
  tabOn: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: T.gold },
  tabTx: { color: T.textMuted, fontSize: 12, textTransform: "capitalize" },
  tabTxOn: { color: T.gold, fontWeight: "700" },
  rowBtn: { flexDirection: "row", gap: 8, marginTop: 10 },
  approve: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: "rgba(16,185,129,0.15)" },
  approveTx: { color: T.emerald, textAlign: "center", fontWeight: "700" },
  reject: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: "rgba(244,63,94,0.12)" },
  rejectTx: { color: T.rose, textAlign: "center", fontWeight: "700" },
});
