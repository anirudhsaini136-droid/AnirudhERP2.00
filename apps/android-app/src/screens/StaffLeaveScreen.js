import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getStaffLeave, postStaffLeave } from "../api";
import { HeroBand, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function StaffLeaveScreen() {
  const [rows, setRows] = useState([]);
  const [balance, setBalance] = useState({});
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState("annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStaffLeave();
      setRows(res.leave_requests || []);
      setBalance(res.balance || {});
    } catch (e) {
      Alert.alert("Leave", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const submit = async () => {
    try {
      await postStaffLeave({ leave_type: leaveType, start_date: start, end_date: end, reason });
      setStart("");
      setEnd("");
      setReason("");
      load();
      Alert.alert("Leave", "Request submitted");
    } catch (e) {
      Alert.alert("Leave", e.message);
    }
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={rows}
      keyExtractor={(r) => String(r.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <>
          <View style={{ marginBottom: 6 }}>
            <HeroBand eyebrow="STAFF">
              <PageHeader title="My leave" subtitle="Request time off" />
            </HeroBand>
          </View>
          <View style={S.card}>
            <Text style={S.cardLabel}>Balance (annual / sick)</Text>
            <Text style={S.cardValue}>
              {balance.annual ?? "—"} / {balance.sick ?? "—"}
            </Text>
            <TextInput style={S.input} placeholder="Leave type (annual|sick)" placeholderTextColor={T.textMuted} value={leaveType} onChangeText={setLeaveType} />
            <TextInput style={S.input} placeholder="Start YYYY-MM-DD" placeholderTextColor={T.textMuted} value={start} onChangeText={setStart} />
            <TextInput style={S.input} placeholder="End YYYY-MM-DD" placeholderTextColor={T.textMuted} value={end} onChangeText={setEnd} />
            <TextInput style={S.input} placeholder="Reason" placeholderTextColor={T.textMuted} value={reason} onChangeText={setReason} />
            <TouchableOpacity style={S.btnPrimary} onPress={submit}>
              <Text style={S.btnPrimaryText}>Submit request</Text>
            </TouchableOpacity>
          </View>
          <Text style={S.sectionTitle}>History</Text>
        </>
      }
      renderItem={({ item }) => (
        <View style={S.card}>
          <Text style={{ color: T.textPrimary, fontWeight: "700" }}>{item.leave_type}</Text>
          <Text style={S.row}>{item.start_date} → {item.end_date}</Text>
          <Text style={S.muted}>{item.status}</Text>
        </View>
      )}
    />
  );
}
