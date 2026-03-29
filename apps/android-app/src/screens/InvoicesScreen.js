import React, { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, TouchableOpacity, View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getInvoices, postSendAllWhatsappReminders } from "../api";
import { HeroBand, ListRowCard, LoadingCenter, PageHeader, EmptyState } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

export default function InvoicesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingAll, setSendingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getInvoices({ limit: "50" });
      setItems(data.invoices || []);
    } catch (e) {
      Alert.alert("Invoices", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && items.length === 0) return <LoadingCenter label="Loading invoices…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="FINANCE">
            <PageHeader title="Invoices" subtitle="Tap a row for line items & status" />
          </HeroBand>
          <TouchableOpacity
            style={[S.btnPrimary, { marginTop: 10 }]}
            onPress={() => navigation.navigate("InvoiceCreate")}
            activeOpacity={0.9}
          >
            <Text style={S.btnPrimaryText}>Create invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.btnSecondary, { marginTop: 10, opacity: sendingAll ? 0.7 : 1 }]}
            onPress={async () => {
              const candidates = (items || []).filter(
                (inv) =>
                  ["draft", "sent", "partially_paid", "overdue"].includes(inv.status) &&
                  Number(inv.balance_due || 0) > 0 &&
                  !!(inv.client_phone || "").trim()
              );
              if (!candidates.length) {
                Alert.alert("Reminders", "No invoices eligible for WhatsApp reminders.");
                return;
              }

              const invoice_ids = candidates.map((i) => i.server_invoice_id || i.id).filter(Boolean);
              try {
                setSendingAll(true);
                await postSendAllWhatsappReminders({ invoice_ids });
                Alert.alert("Reminders", "WhatsApp reminders send requested.");
                load();
              } catch (e) {
                Alert.alert("Reminders", e.message || "Failed to send reminders");
              } finally {
                setSendingAll(false);
              }
            }}
            disabled={sendingAll}
            activeOpacity={0.9}
          >
            <Text style={S.btnSecondaryText}>{sendingAll ? "Sending…" : "Send All WhatsApp reminders"}</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <ListRowCard
          title={item.invoice_number || String(item.id)}
          subtitle={item.client_name || "—"}
          meta={`${fmtInr(item.total_amount)} · ${item.status || ""}`}
          badge={item.status}
          badgeColor={item.status === "paid" ? T.emerald : item.status === "overdue" ? T.rose : T.gold}
          onPress={() => navigation.navigate("InvoiceDetail", { invoiceId: item.id })}
        />
      )}
      ListEmptyComponent={<EmptyState message="No invoices yet" />}
    />
  );
}
