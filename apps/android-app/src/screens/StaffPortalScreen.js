import React, { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getStaffPortal } from "../api";
import { ContentPanel, HeroBand, PageHeader, StatCard, StatusPill } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function StaffPortalScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await getStaffPortal();
      setData(res);
    } catch (e) {
      Alert.alert("Staff", e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const emp = data?.employee;
  const st = data?.stats || {};
  const name = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="STAFF">
        <PageHeader title="Staff portal" subtitle="Attendance & leave snapshot" />
      </HeroBand>
      {name ? (
        <Text style={{ color: T.textPrimary, fontSize: 17, fontWeight: "700", marginBottom: 12 }}>{name}</Text>
      ) : (
        <ContentPanel>
          <Text style={{ color: T.rose, fontSize: 14 }}>No employee record linked to this login. Contact HR.</Text>
        </ContentPanel>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "700" }}>Clock status</Text>
        <StatusPill text={data?.is_clocked_in ? "Clocked in" : "Not clocked in"} variant={data?.is_clocked_in ? "success" : "default"} />
      </View>
      <Text style={S.sectionTitle}>This month</Text>
      <StatCard label="Days worked" value={String(st.days_worked_this_month ?? 0)} />
      <StatCard label="Pending leave requests" value={String(st.pending_leave_requests ?? 0)} />
      <StatCard label="Annual leave remaining" value={String(st.annual_leave_remaining ?? 0)} />
      <StatCard label="Sick leave remaining" value={String(st.sick_leave_remaining ?? 0)} />
    </ScrollView>
  );
}
