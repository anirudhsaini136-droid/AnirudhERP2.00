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
import { getHrAttendance, postHrAttendance } from "../api";
import { HeroBand, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

function dayStr(d) {
  return d.toISOString().split("T")[0];
}

export default function HrAttendanceScreen() {
  const [date, setDate] = useState(dayStr(new Date()));
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getHrAttendance(date);
      setRecords(res.records || []);
      setSummary(res.summary || {});
    } catch (e) {
      Alert.alert("Attendance", e.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shift = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(dayStr(d));
  };

  const mark = async (employeeId, status) => {
    try {
      await postHrAttendance({
        employee_id: employeeId,
        date,
        status,
        check_in: status === "present" ? new Date().toTimeString().slice(0, 5) : undefined,
      });
      load();
    } catch (e) {
      Alert.alert("Attendance", e.message);
    }
  };

  const header = (
    <>
      <View style={{ marginBottom: 6 }}>
        <HeroBand eyebrow="HR">
          <PageHeader title="Attendance" subtitle="Daily attendance tracking" />
        </HeroBand>
      </View>
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => shift(-1)}>
          <Text style={styles.dateBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{date}</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => shift(1)}>
          <Text style={styles.dateBtnText}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        <MiniStat label="Present" value={String(summary.present ?? 0)} color={T.emerald} />
        <MiniStat label="Absent" value={String(summary.absent ?? 0)} color={T.rose} />
        <MiniStat label="Late" value={String(summary.late ?? 0)} color="#F59E0B" />
        <MiniStat label="On leave" value={String(summary.on_leave ?? 0)} color={T.sapphire} />
      </View>
      <Text style={S.sectionTitle}>Records</Text>
    </>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={records}
      keyExtractor={(r) => String(r.employee_id || r.id)}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      renderItem={({ item }) => (
        <View style={S.card}>
          <Text style={{ color: T.textPrimary, fontWeight: "700" }}>
            {item.employee_name || `${item.first_name || ""} ${item.last_name || ""}`.trim()}
          </Text>
          <Text style={S.row}>{item.department || "—"} · {item.status || "—"}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.pill} onPress={() => mark(item.employee_id || item.id, "present")}>
              <Text style={styles.pillOk}>Present</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pill} onPress={() => mark(item.employee_id || item.id, "absent")}>
              <Text style={styles.pillBad}>Absent</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={!loading ? <Text style={S.muted}>No records for this date</Text> : null}
    />
  );
}

function MiniStat({ label, value, color }) {
  return (
    <View style={[styles.mini, { borderColor: `${color}40` }]}>
      <Text style={[styles.miniVal, { color }]}>{value}</Text>
      <Text style={styles.miniLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16, gap: 16 },
  dateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  dateBtnText: { color: T.textPrimary, fontSize: 18 },
  dateLabel: { color: T.textPrimary, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  mini: {
    flexGrow: 1,
    minWidth: "22%",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: T.cardBg,
    alignItems: "center",
  },
  miniVal: { fontSize: 20, fontWeight: "800" },
  miniLbl: { color: T.textMuted, fontSize: 10, marginTop: 4, textAlign: "center" },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: T.surface },
  pillOk: { color: T.emerald, fontWeight: "700", fontSize: 12 },
  pillBad: { color: T.rose, fontWeight: "700", fontSize: 12 },
});
