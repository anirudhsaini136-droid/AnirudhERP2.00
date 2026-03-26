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
import { getGstSummary, getPurchasesItcSummary, getTrialBalance } from "../api";
import { HeroBand, PageHeader, StatCard } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

function monthRange() {
  const e = new Date();
  const s = new Date(e.getFullYear(), e.getMonth(), 1);
  return {
    start: s.toISOString().split("T")[0],
    end: e.toISOString().split("T")[0],
  };
}

export default function CaPortalScreen() {
  const [{ start, end }] = useState(monthRange);
  const [loading, setLoading] = useState(false);
  const [trial, setTrial] = useState(null);
  const [gst, setGst] = useState(null);
  const [itc, setItc] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [tb, gs, itcRes] = await Promise.all([
        getTrialBalance().catch(() => null),
        getGstSummary({ start_date: start, end_date: end }).catch(() => null),
        getPurchasesItcSummary(start, end).catch(() => null),
      ]);
      setTrial(tb);
      setGst(gs);
      setItc(itcRes);
    } catch (e) {
      Alert.alert("CA portal", e.message);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const g = gst || {};

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="CA">
        <PageHeader title="CA portal" subtitle={`Period ${start} — ${end}`} />
      </HeroBand>
      <Text style={S.sectionTitle}>Trial balance</Text>
      <Text style={S.row}>{trial ? "Loaded — see Accounting for detail" : "Unavailable"}</Text>
      <Text style={S.sectionTitle}>GST summary</Text>
      <StatCard label="Taxable supplies" value={`₹${Number(g.taxable_value || 0).toLocaleString("en-IN")}`} />
      <StatCard label="Total tax" value={`₹${Number(g.total_tax || 0).toLocaleString("en-IN")}`} />
      <Text style={S.sectionTitle}>ITC (purchases)</Text>
      <Text style={S.row}>{itc ? JSON.stringify(itc).slice(0, 200) + "…" : "—"}</Text>
    </ScrollView>
  );
}
