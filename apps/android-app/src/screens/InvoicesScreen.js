import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, TouchableOpacity, View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getInvoices, postSendAllWhatsappReminders } from "../api";
import { useAuth } from "../context/AuthContext";
import { pruneExpiredDrafts } from "../lib/localInvoiceDrafts";
import { HeroBand, ListRowCard, LoadingCenter, PageHeader, EmptyState } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

export default function InvoicesScreen({ navigation }) {
  const { business } = useAuth();
  const [items, setItems] = useState([]);
  const [localDrafts, setLocalDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingAll, setSendingAll] = useState(false);

  const refreshLocalDrafts = useCallback(async () => {
    const bid = business?.id;
    if (!bid) {
      setLocalDrafts([]);
      return;
    }
    const d = await pruneExpiredDrafts(bid);
    setLocalDrafts(d);
  }, [business?.id]);

  const mergedItems = useMemo(() => {
    const prefix = (localDrafts || []).map((d) => ({
      id: `__draft__${d.id}`,
      invoice_number: d.invoice_number || "Draft",
      client_name: d.client_name || "—",
      total_amount: d.total_amount ?? 0,
      status: "draft",
      isAndroidLocalDraft: true,
      _draftId: d.id,
      balance_due: d.total_amount ?? 0,
      client_phone: d.client_phone || "",
    }));
    return [...prefix, ...(items || [])];
  }, [localDrafts, items]);

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
      refreshLocalDrafts();
    }, [load, refreshLocalDrafts])
  );

  if (loading && items.length === 0) return <LoadingCenter label="Loading invoices…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={mergedItems}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="FINANCE">
            <PageHeader
              title="Invoices"
              subtitle={
                localDrafts.length > 0
                  ? `Tap a row for details · ${localDrafts.length} draft${localDrafts.length === 1 ? "" : "s"} on device`
                  : "Tap a row for line items & status"
              }
            />
            {localDrafts.length > 0 ? (
              <View
                style={{
                  marginTop: 10,
                  alignSelf: "flex-start",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(245,158,11,0.45)",
                  backgroundColor: "rgba(245,158,11,0.12)",
                }}
              >
                <Text style={{ color: T.gold, fontWeight: "900", fontSize: 12 }}>
                  {localDrafts.length} draft{localDrafts.length === 1 ? "" : "s"}
                </Text>
              </View>
            ) : null}
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
          onPress={() =>
            item.isAndroidLocalDraft
              ? navigation.navigate("InvoiceCreate", { draftId: item._draftId })
              : navigation.navigate("InvoiceDetail", { invoiceId: item.id })
          }
        />
      )}
      ListEmptyComponent={<EmptyState message="No invoices yet" />}
    />
  );
}
