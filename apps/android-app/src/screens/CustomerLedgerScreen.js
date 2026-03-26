import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getCustomerLedger, getDashboardSettings, postCustomerBulkPayment } from "../api";
import { ContentPanel, HeroBand, ListRowCard, PageHeader, PrimaryButton, SecondaryButton } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d) {
  try {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

export default function CustomerLedgerScreen({ route, navigation }) {
  const { clientName } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");

  const [showPayment, setShowPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    amount: "0",
    payment_date: todayStr(),
    payment_method: "cash",
    reference: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!clientName) return;
    try {
      const res = await getCustomerLedger(clientName);
      setData(res);
    } catch (e) {
      Alert.alert("Ledger", e.message);
    } finally {
      setLoading(false);
    }
  }, [clientName]);

  useFocusEffect(
    useCallback(() => {
      getDashboardSettings()
        .then((res) => {
          const b = res?.business || {};
          setBusinessName(b.name || "");
        })
        .catch(() => {});
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cust = data?.customer || {};
  const invs = data?.invoices || [];
  const payments = data?.payments || [];

  const unpaidInvoices = useMemo(() => {
    return invs.filter((i) => ["sent", "partially_paid", "overdue"].includes(i.status) && Number(i.balance_due || 0) > 0);
  }, [invs]);

  const openBulkPayment = () => {
    const amt = Number(cust.total_outstanding || 0);
    setBulkForm((f) => ({
      ...f,
      amount: String(amt),
      payment_date: todayStr(),
      payment_method: "cash",
      reference: "",
      notes: "",
    }));
    setShowPayment(true);
  };

  const sendReminder = () => {
    const phone = (cust.phone || "").replace(/[^0-9]/g, "");
    if (!phone) {
      Alert.alert("Remind", "Customer phone is missing.");
      return;
    }

    const storeName = businessName || "Our Store";
    const lines = unpaidInvoices
      .slice(0, 8)
      .map(
        (inv, i) =>
          `${i + 1}. ${inv.invoice_number} - Rs. ${Number(inv.balance_due || 0).toLocaleString("en-IN")} (Due: ${fmtDate(
            inv.due_date
          )})`
      )
      .join("\n");

    const message = [
      `Hello ${cust.name}!`,
      "",
      `This is a gentle reminder from *${storeName}* regarding your pending payments.`,
      "",
      `Total Outstanding: Rs. ${Number(cust.total_outstanding || 0).toLocaleString("en-IN")}`,
      "",
      unpaidInvoices.length ? `Pending Invoices:\n${lines}` : "Pending Invoices: 0",
      "",
      `Kindly arrange the payment at your earliest convenience.`,
      `Thank you for your business!`,
    ].join("\n");

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(waUrl).catch(() => Alert.alert("Remind", "Unable to open WhatsApp."));
  };

  if (loading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.gold} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.screenBg }} contentContainerStyle={S.scrollContent}>
      <HeroBand eyebrow="LEDGER">
        <PageHeader title={cust.name || clientName} subtitle="Statement & open invoices" />
      </HeroBand>
      <ContentPanel>
        <Text style={styles.summary}>Outstanding {fmtInr(cust.total_outstanding)}</Text>
        <Text style={styles.subSum}>Lifetime invoiced {fmtInr(cust.total_invoiced)}</Text>
      </ContentPanel>

      {cust.total_outstanding > 0 ? (
        <View style={{ marginTop: 10 }}>
          <PrimaryButton title={paying ? "Applying…" : "Record Payment"} onPress={openBulkPayment} disabled={paying} />
        </View>
      ) : null}

      {unpaidInvoices.length > 0 && cust.phone ? (
        <View style={{ marginTop: 10 }}>
          <SecondaryButton title="Remind on WhatsApp" onPress={sendReminder} />
        </View>
      ) : null}

      <Text style={S.sectionTitle}>Invoices</Text>
      {invs.length === 0 ? (
        <Text style={S.muted}>No invoices</Text>
      ) : (
        invs.map((inv) => (
          <ListRowCard
            key={inv.id}
            title={inv.invoice_number}
            subtitle={`Due ${fmtInr(inv.balance_due)}`}
            meta={fmtInr(inv.total_amount)}
            badge={inv.status}
            badgeColor={inv.status === "overdue" ? T.rose : T.gold}
            onPress={() => navigation?.navigate("InvoiceDetail", { invoiceId: inv.id })}
          />
        ))
      )}

      {payments.length > 0 ? (
        <>
          <Text style={S.sectionTitle}>Payment History</Text>
          {payments.slice(0, 10).map((p, idx) => (
            <ListRowCard
              key={p.id || idx}
              title={p.invoice_number || "Payment"}
              subtitle={`${fmtDate(p.payment_date)} · ${(p.payment_method || "cash").replace(/_/g, " ")}`}
              meta={`+${fmtInr(p.amount)}`}
              badge="Paid"
              badgeColor={T.emerald}
              onPress={() => {
                if (p.invoice_id) navigation?.navigate("InvoiceDetail", { invoiceId: p.invoice_id });
              }}
            />
          ))}
        </>
      ) : null}

      <Modal transparent visible={showPayment} animationType="slide" onRequestClose={() => setShowPayment(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <View style={[S.card, { margin: 16 }]}>
            <Text style={{ color: T.textPrimary, fontSize: 18, fontWeight: "900", marginBottom: 10 }}>Record Payment</Text>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900" }}>Pending Invoices (FIFO)</Text>
              <View
                style={{
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: T.border,
                  borderRadius: 14,
                  padding: 10,
                  backgroundColor: T.cardBg,
                }}
              >
                {unpaidInvoices.length ? (
                  unpaidInvoices.slice(0, 8).map((inv, i) => (
                    <View key={inv.id || i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ color: T.textSecondary, fontWeight: "800" }}>{inv.invoice_number}</Text>
                      <Text style={{ color: T.gold, fontWeight: "900" }}>{fmtInr(inv.balance_due)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: T.textMuted }}>No outstanding invoices.</Text>
                )}
              </View>

              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900", marginTop: 14 }}>Payment Amount (Rs.) *</Text>
              <TextInput
                style={S.input}
                value={bulkForm.amount}
                onChangeText={(v) => setBulkForm((f) => ({ ...f, amount: v.replace(/[^0-9.]/g, "") }))}
                keyboardType="numeric"
                placeholder="Amount"
              />

              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900", marginTop: 2 }}>Payment Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={S.input}
                value={bulkForm.payment_date}
                onChangeText={(v) => setBulkForm((f) => ({ ...f, payment_date: v.replace(/[^0-9-]/g, "") }))}
                placeholder="YYYY-MM-DD"
              />

              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900", marginTop: 6 }}>Payment Method</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                {["cash", "bank_transfer", "upi", "cheque", "other"].map((m) => {
                  const active = bulkForm.payment_method === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setBulkForm((f) => ({ ...f, payment_method: m }))}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? "rgba(212,175,55,0.6)" : T.border,
                        backgroundColor: active ? "rgba(212,175,55,0.14)" : "transparent",
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: active ? T.gold : T.textSecondary, fontWeight: "900", fontSize: 12 }}>
                        {m.replace(/_/g, " ")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900" }}>Reference / Transaction ID</Text>
              <TextInput
                style={S.input}
                value={bulkForm.reference}
                onChangeText={(v) => setBulkForm((f) => ({ ...f, reference: v }))}
                placeholder="UPI ref, cheque no. etc."
              />

              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900" }}>Notes</Text>
              <TextInput
                style={S.input}
                value={bulkForm.notes}
                onChangeText={(v) => setBulkForm((f) => ({ ...f, notes: v }))}
                placeholder="Optional notes"
              />
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
              <SecondaryButton title="Cancel" onPress={() => setShowPayment(false)} />
              <PrimaryButton
                title={paying ? "Applying…" : `Apply ${fmtInr(Number(bulkForm.amount || 0))}`}
                disabled={paying}
                onPress={async () => {
                  if (paying) return;
                  const amt = Number(bulkForm.amount || 0);
                  if (amt <= 0) {
                    Alert.alert("Payment", "Amount must be greater than 0.");
                    return;
                  }
                  const max = Number(cust.total_outstanding || 0) + 0.01;
                  if (amt > max) {
                    Alert.alert("Payment", "Amount exceeds total outstanding.");
                    return;
                  }
                  try {
                    setPaying(true);
                    await postCustomerBulkPayment(clientName, {
                      amount: amt,
                      payment_method: bulkForm.payment_method,
                      payment_date: bulkForm.payment_date || todayStr(),
                      reference: bulkForm.reference || null,
                      notes: bulkForm.notes || null,
                    });
                    Alert.alert("Payment", "Payment applied successfully.");
                    setShowPayment(false);
                    load();
                  } catch (e) {
                    Alert.alert("Payment", e.message || "Failed to apply payment");
                  } finally {
                    setPaying(false);
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", backgroundColor: T.screenBg },
  summary: { color: T.gold, fontSize: 20, fontWeight: "800" },
  subSum: { color: T.textSecondary, marginTop: 8 },
});
