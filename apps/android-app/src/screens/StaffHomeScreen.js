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
import { getStaffHome, postStaffClockIn, postStaffClockOut } from "../api";
import { useAuth } from "../context/AuthContext";
import { HeroBand, PageHeader, StatCard } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function StaffHomeScreen() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clocking, setClocking] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStaffHome();
      setData(res);
    } catch (e) {
      Alert.alert("Staff", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const today = data?.today_attendance || {};
  const stats = data?.stats || {};

  const cin = async () => {
    setClocking(true);
    try {
      await postStaffClockIn();
      load();
    } catch (e) {
      Alert.alert("Clock in", e.message);
    } finally {
      setClocking(false);
    }
  };

  const cout = async () => {
    setClocking(true);
    try {
      await postStaffClockOut();
      load();
    } catch (e) {
      Alert.alert("Clock out", e.message);
    } finally {
      setClocking(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="STAFF">
        <PageHeader
          title={`Welcome, ${user?.first_name || "there"}`}
          subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        />
      </HeroBand>
      <View style={[S.card, styles.clockBox]}>
        <Text style={styles.time}>{new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</Text>
        <Text style={S.row}>
          {!today.check_in
            ? "Not clocked in yet"
            : !today.check_out
              ? `Checked in at ${today.check_in || "—"}`
              : `Done: ${today.check_in} — ${today.check_out}`}
        </Text>
        {!today.check_in ? (
          <TouchableOpacity style={[S.btnPrimary, clocking && { opacity: 0.6 }]} onPress={cin} disabled={clocking}>
            <Text style={S.btnPrimaryText}>{clocking ? "…" : "Clock in"}</Text>
          </TouchableOpacity>
        ) : !today.check_out ? (
          <TouchableOpacity style={[S.btnSecondary, clocking && { opacity: 0.6 }]} onPress={cout} disabled={clocking}>
            <Text style={S.btnSecondaryText}>{clocking ? "…" : "Clock out"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <StatCard label="Days worked (month)" value={String(stats.days_worked_this_month ?? 0)} />
      <StatCard label="Pending leave requests" value={String(stats.pending_leave_requests ?? 0)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  clockBox: { alignItems: "center" },
  time: { color: T.textPrimary, fontSize: 32, fontWeight: "800", marginBottom: 8 },
});
