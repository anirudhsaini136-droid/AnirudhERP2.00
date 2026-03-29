import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  deleteInvoice,
  getDashboardSettings,
  getInvoice,
  postInvoicePayment,
  postInvoiceSendWhatsappApi,
  postInvoiceGenerateEinvoice,
  postEwayBill,
} from "../api";
import { ContentPanel, HeroBand, ListRowCard, PageHeader, PrimaryButton, SecondaryButton } from "../components/NexaUi";
import MobileInvoiceRenderer from "../components/MobileInvoiceRenderer";
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

function amountInWords(n) {
  const num = Math.floor(Number(n || 0));
  if (!num) return "ZERO RUPEES ONLY";
  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  const two = (x) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ` ${ones[x % 10]}` : ""}`.trim());
  const three = (x) => {
    const h = Math.floor(x / 100);
    const r = x % 100;
    return `${h ? `${ones[h]} HUNDRED` : ""}${r ? ` ${two(r)}` : ""}`.trim();
  };
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;
  const parts = [];
  if (crore) parts.push(`${two(crore)} CRORE`);
  if (lakh) parts.push(`${two(lakh)} LAKH`);
  if (thousand) parts.push(`${two(thousand)} THOUSAND`);
  if (rest) parts.push(three(rest));
  return `${parts.join(" ").trim()} RUPEES ONLY`;
}

export default function InvoiceDetailScreen({ route, navigation }) {
  const { invoiceId } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [business, setBusiness] = useState(null);

  const [gstBusy, setGstBusy] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "0",
    payment_date: todayStr(),
    payment_method: "cash",
    reference: "",
    notes: "",
  });

  const inv = data?.invoice || {};
  const items = data?.items || [];
  const payments = data?.payments || [];

  const load = useCallback(async () => {
    if (!invoiceId) return;
    try {
      const res = await getInvoice(invoiceId);
      setData(res);
    } catch (e) {
      Alert.alert("Invoice", e.message);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      getDashboardSettings()
        .then((res) => {
          const b = res?.business || null;
          setBusiness(b);
          setBusinessName(b?.name || "");
        })
        .catch(() => {});
    }, [])
  );

  const canRecordPayment = useMemo(() => Number(inv.balance_due || 0) > 0, [inv.balance_due]);
  const upiLink = useMemo(() => {
    if (!business?.upi_vpa || !inv?.balance_due) return "";
    const amount = Number(inv.balance_due || 0).toFixed(2);
    const params = new URLSearchParams({
      pa: business.upi_vpa,
      pn: business.upi_name || business.name || "NexaERP",
      am: amount,
      cu: "INR",
      tn: `Invoice ${inv.invoice_number || invoiceId}`,
    });
    return `upi://pay?${params.toString()}`;
  }, [business, inv.balance_due, inv.invoice_number, invoiceId]);

  const qrUrl = useMemo(() => {
    if (!upiLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiLink)}`;
  }, [upiLink]);

  const openPayment = () => {
    setPaymentForm((f) => ({
      ...f,
      amount: String(Number(inv.balance_due || 0)),
      payment_date: todayStr(),
      payment_method: "cash",
      reference: "",
      notes: "",
    }));
    setShowPayment(true);
  };

  const openWhatsAppFallback = () => {
    const phone = (inv.client_phone || "").replace(/[^0-9]/g, "");
    if (!phone) {
      Alert.alert("WhatsApp", "Customer phone is missing.");
      return;
    }
    const store = businessName || "Our Store";
    const amountDue = Number(inv.balance_due || inv.total_amount || 0);
    const message = [
      `Hello ${inv.client_name || ""}!`,
      ``,
      `This is a gentle reminder from *${store}* regarding your pending payment.`,
      ``,
      `Invoice No: ${inv.invoice_number || invoiceId}`,
      `Amount Due: INR ${amountDue.toFixed(2)}`,
      inv.due_date ? `Due Date: ${fmtDate(inv.due_date)}` : "",
      ``,
      `Kindly arrange the payment at your earliest convenience.`,
      `Thank you for your business!`,
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert("WhatsApp", "Unable to open WhatsApp."));
  };

  const generateEinvoice = async () => {
    if (!invoiceId || gstBusy) return;
    if (inv.einvoice_irn) {
      Alert.alert("E-Invoice", "IRN already exists.");
      return;
    }
    try {
      setGstBusy(true);
      await postInvoiceGenerateEinvoice(invoiceId);
      Alert.alert("E-Invoice", "IRN generated.");
      await load();
    } catch (e) {
      Alert.alert("E-Invoice", e.message || "Failed");
    } finally {
      setGstBusy(false);
    }
  };

  const createEwayDemo = () => {
    if (!invoiceId || gstBusy) return;
    Alert.alert(
      "E-Way Bill",
      "Create e-way bill with vehicle HR26AX1234? (Change in app later or use web.)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: async () => {
            try {
              setGstBusy(true);
              await postEwayBill({
                invoice_id: invoiceId,
                vehicle_no: "HR26AX1234",
                transport_mode: "road",
                distance_km: 100,
              });
              Alert.alert("E-Way", "Created (mock mode by default).");
            } catch (e) {
              Alert.alert("E-Way", e.message || "Failed");
            } finally {
              setGstBusy(false);
            }
          },
        },
      ]
    );
  };

  const sendWhatsApp = async () => {
    if (!invoiceId) return;
    try {
      const res = await postInvoiceSendWhatsappApi(invoiceId);
      Alert.alert("WhatsApp", res?.message || "WhatsApp sent.");
    } catch (e) {
      // If WATI API is not configured, we fall back to WhatsApp deep-link.
      openWhatsAppFallback();
    }
  };

  if (loading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.gold} size="large" />
      </View>
    );
  }

  const handleDelete = () => {
    if (!invoiceId || deleting) return;
    Alert.alert("Delete invoice", "Are you sure? Stock will be restored if it was deducted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: deleting ? "Deleting..." : "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteInvoice(invoiceId);
            Alert.alert("Invoice", "Invoice deleted");
            navigation?.navigate("Invoices");
          } catch (e) {
            Alert.alert("Invoice", e.message || "Failed to delete invoice");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.screenBg }} contentContainerStyle={S.scrollContent}>
      <HeroBand eyebrow="INVOICE">
        <PageHeader title={inv.invoice_number || "Invoice"} subtitle={inv.client_name} />
      </HeroBand>

      <MobileInvoiceRenderer
        invoice={inv}
        items={items}
        business={business || { name: businessName }}
        qrUrl={qrUrl}
        onPressPayNow={() =>
          Linking.openURL(upiLink).catch(() => Alert.alert("UPI", "No UPI app found on device."))
        }
      />

      {canRecordPayment ? (
        <View style={{ marginTop: 10 }}>
          <PrimaryButton title={paying ? "Recording…" : "Record Payment"} onPress={openPayment} disabled={paying} />
        </View>
      ) : null}

      {inv.status !== "cancelled" && !inv.einvoice_irn ? (
        <View style={{ marginTop: 10 }}>
          <SecondaryButton title={gstBusy ? "…" : "Generate E-Invoice (IRN)"} onPress={generateEinvoice} disabled={gstBusy} />
        </View>
      ) : null}

      <View style={{ marginTop: 10 }}>
        <SecondaryButton title={gstBusy ? "…" : "Create E-Way Bill (quick)"} onPress={createEwayDemo} disabled={gstBusy} />
      </View>

      {inv.client_phone ? (
        <View style={{ marginTop: 10 }}>
          <SecondaryButton title="Send on WhatsApp" onPress={sendWhatsApp} />
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          S.btnSecondary,
          styles.deleteBtn,
          deleting ? { opacity: 0.7 } : null,
        ]}
        onPress={handleDelete}
        disabled={deleting}
        activeOpacity={0.9}
      >
        <Text style={styles.deleteBtnText}>{deleting ? "Deleting..." : "Delete invoice"}</Text>
      </TouchableOpacity>

      {payments.length > 0 ? (
        <>
          <Text style={S.sectionTitle}>Payments</Text>
          {payments.map((p, idx) => (
            <ListRowCard
              key={p.id || idx}
              title={p.invoice_number || inv.invoice_number || "Payment"}
              subtitle={`${fmtDate(p.payment_date)} · ${(p.payment_method || "cash").replace(/_/g, " ")}`}
              meta={`${fmtInr(p.amount)}` + (p.reference ? ` · Ref ${p.reference}` : "")}
              badge="Paid"
              badgeColor={T.emerald}
            />
          ))}
        </>
      ) : null}

      <Modal transparent visible={showPayment} animationType="slide" onRequestClose={() => setShowPayment(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <View style={[S.card, { margin: 16 }]}>
            <Text style={{ color: T.textPrimary, fontSize: 18, fontWeight: "900", marginBottom: 10 }}>Record Payment</Text>

            <ScrollView style={{ maxHeight: 430 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: T.textMuted, fontSize: 12 }}>Invoice</Text>
                <Text style={{ color: T.textPrimary, fontWeight: "900", marginTop: 4 }}>{inv.invoice_number || invoiceId}</Text>
                <Text style={{ color: T.textSecondary, marginTop: 6 }}>
                  Balance Due: <Text style={{ color: T.gold, fontWeight: "900" }}>{fmtInr(inv.balance_due)}</Text>
                </Text>
              </View>

              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900" }}>Amount *</Text>
              <TextInput
                style={S.input}
                value={paymentForm.amount}
                onChangeText={(v) => setPaymentForm((f) => ({ ...f, amount: v.replace(/[^0-9.]/g, "") }))}
                keyboardType="numeric"
                placeholder="Amount"
              />

              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900", marginTop: 2 }}>Payment Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={S.input}
                value={paymentForm.payment_date}
                onChangeText={(v) => setPaymentForm((f) => ({ ...f, payment_date: v.replace(/[^0-9-]/g, "") }))}
                placeholder="YYYY-MM-DD"
              />

              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900", marginTop: 6 }}>Payment Method</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                {["cash", "bank_transfer", "upi", "cheque", "other"].map((m) => {
                  const active = paymentForm.payment_method === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setPaymentForm((f) => ({ ...f, payment_method: m }))}
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

              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900" }}>Reference</Text>
              <TextInput
                style={S.input}
                value={paymentForm.reference}
                onChangeText={(v) => setPaymentForm((f) => ({ ...f, reference: v }))}
                placeholder="UPI ref, cheque no. etc."
              />

              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900" }}>Notes</Text>
              <TextInput
                style={S.input}
                value={paymentForm.notes}
                onChangeText={(v) => setPaymentForm((f) => ({ ...f, notes: v }))}
                placeholder="Optional notes"
              />
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
              <SecondaryButton title="Cancel" onPress={() => setShowPayment(false)} />
              <PrimaryButton
                title={paying ? "Recording…" : `Record ${fmtInr(Number(paymentForm.amount || 0))}`}
                disabled={paying}
                onPress={async () => {
                  if (paying) return;
                  const amt = Number(paymentForm.amount || 0);
                  if (amt <= 0) {
                    Alert.alert("Payment", "Amount must be greater than 0.");
                    return;
                  }
                  const max = Number(inv.balance_due || 0) + 0.01;
                  if (amt > max) {
                    Alert.alert("Payment", "Amount exceeds balance due.");
                    return;
                  }
                  try {
                    setPaying(true);
                    await postInvoicePayment(invoiceId, {
                      amount: amt,
                      payment_method: paymentForm.payment_method,
                      payment_date: paymentForm.payment_date || todayStr(),
                      reference: paymentForm.reference || null,
                      notes: paymentForm.notes || null,
                    });
                    Alert.alert("Payment", "Payment recorded successfully.");
                    setShowPayment(false);
                    load();
                  } catch (e) {
                    Alert.alert("Payment", e.message || "Failed to record payment");
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
  docCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15,23,42,0.08)",
  },
  brandRow: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandLogoText: { color: "#111", fontWeight: "900" },
  brandName: { color: "#F8FAFC", fontSize: 16, fontWeight: "900" },
  brandSub: { color: "rgba(248,250,252,0.75)", fontSize: 11, marginTop: 2 },
  invoiceTopTitle: { color: "#D4AF37", fontSize: 26, fontWeight: "900" },
  invoiceTopNo: { color: "#F8FAFC", fontSize: 12, fontWeight: "800", marginTop: 2 },
  invoiceHeaderBand: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  invoiceHeaderTitle: { color: "#6B7280", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  invoiceHeaderNo: { color: "#0F172A", marginTop: 4, fontSize: 15, fontWeight: "900" },
  metaBand: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 8 },
  metaLabel: { color: "#64748B", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  metaValue: { color: "#475569", fontSize: 12, marginTop: 2 },
  metaValueStrong: { color: "#0F172A", fontSize: 12, fontWeight: "800", marginTop: 1 },
  metaStatus: { color: "#2563EB", fontSize: 11, fontWeight: "900" },
  invoiceGrid: { marginTop: 14, gap: 10 },
  invoiceBox: {
    backgroundColor: T.mode === "light" ? "rgba(15,23,42,0.02)" : "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 12,
  },
  boxTitle: { color: "#6B7280", fontSize: 10, fontWeight: "900", marginBottom: 6, letterSpacing: 0.8 },
  boxMain: { color: "#0F172A", fontSize: 14, fontWeight: "800" },
  boxSub: { color: "#475569", fontSize: 12, marginTop: 4, lineHeight: 18 },
  payWrap: { marginTop: 14, alignItems: "center" },
  qr: { width: 170, height: 170, borderRadius: 12, backgroundColor: "#fff" },
  payText: { color: T.textSecondary, marginTop: 8, marginBottom: 4, fontWeight: "700" },
  totalsWrap: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10 },
  totalRow: { color: "#475569", fontSize: 13, marginTop: 4 },
  totalGrand: { color: "#0F172A", fontSize: 16, fontWeight: "900", marginTop: 8 },
  totalDue: { color: "#D4AF37", fontSize: 18, fontWeight: "900", marginTop: 6 },
  wordsWrap: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: T.gold,
    backgroundColor: T.mode === "light" ? "rgba(15,23,42,0.03)" : "rgba(255,255,255,0.03)",
  },
  wordsLabel: { color: T.textMuted, fontSize: 11, fontWeight: "900", marginBottom: 4 },
  wordsText: { color: "#0F172A", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  bankWrap: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10 },
  notesWrap: { marginTop: 12 },
  footerNote: { marginTop: 14, color: T.textMuted, textAlign: "center", fontSize: 12, lineHeight: 18 },
  status: { color: T.textSecondary, fontSize: 13 },
  bigTotal: { color: T.gold, fontSize: 28, fontWeight: "900", marginTop: 8, letterSpacing: -0.5 },
  deleteBtn: {
    borderColor: "rgba(244,63,94,0.35)",
    backgroundColor: "rgba(244,63,94,0.08)",
    marginTop: 4,
  },
  deleteBtnText: {
    color: T.rose,
    fontWeight: "800",
    fontSize: 14,
  },
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
  tableHead: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#111827",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  th: { color: "#6B7280", fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  td: { color: "#111827", fontSize: 12, fontWeight: "600" },
  tdAmount: { color: "#111827", fontSize: 12, fontWeight: "800" },
});
