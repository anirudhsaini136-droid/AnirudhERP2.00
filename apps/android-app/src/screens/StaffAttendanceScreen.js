import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getStaffAttendance } from "../api";
import { HeroBand, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function StaffAttendanceScreen() {
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStaffAttendance(month, year);
      setDays(res.days || res.records || []);
    } catch (e) {
      Alert.alert("Attendance", e.message);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={days}
      keyExtractor={(r, i) => String(r.date || i)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="STAFF">
            <PageHeader title="My attendance" subtitle={`${month}/${year}`} />
          </HeroBand>
        </View>
      }
      renderItem={({ item }) => (
        <View style={S.card}>
          <Text style={{ color: T.textPrimary, fontWeight: "700" }}>{item.date || item.day}</Text>
          <Text style={S.row}>{item.status || "—"}</Text>
          <Text style={S.muted}>{item.check_in || ""} {item.check_out ? `— ${item.check_out}` : ""}</Text>
        </View>
      )}
      ListEmptyComponent={!loading ? <Text style={S.muted}>No rows</Text> : null}
    />
  );
}
