import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getPurchaseBill } from "../api";
import { ContentPanel, HeroBand, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

export default function PurchaseDetailScreen({ route }) {
  const { billId } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!billId) return;
    try {
      const res = await getPurchaseBill(billId);
      setData(res);
    } catch (e) {
      Alert.alert("Purchase", e.message);
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading || !data || !data.bill) {
    return (
      <View style={styles.center}>
        {loading ? <ActivityIndicator color={T.gold} size="large" /> : <Text style={{ color: T.textMuted }}>Not found</Text>}
      </View>
    );
  }

  const bill = data.bill;
  const items = data.items || [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.screenBg }} contentContainerStyle={S.scrollContent}>
      <HeroBand eyebrow="PURCHASE">
        <PageHeader title={bill.bill_number} subtitle={bill.vendor_name} />
      </HeroBand>
      <ContentPanel>
        <Text style={styles.big}>{fmtInr(bill.total_amount)}</Text>
      </ContentPanel>
      <Text style={S.sectionTitle}>Line items</Text>
      {items.map((it, idx) => (
        <View key={it.id || idx} style={styles.line}>
          <Text style={styles.lineMain}>{it.description}</Text>
          <Text style={styles.lineSub}>
            {it.quantity} × {fmtInr(it.unit_price)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", backgroundColor: T.screenBg },
  big: { color: T.gold, fontSize: 26, fontWeight: "900" },
  line: {
    backgroundColor: T.cardBg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  lineMain: { color: T.textPrimary, fontWeight: "700" },
  lineSub: { color: T.textMuted, marginTop: 8, fontSize: 13 },
});
