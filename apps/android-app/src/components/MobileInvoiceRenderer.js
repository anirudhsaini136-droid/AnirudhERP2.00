import React, { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { fmtInr } from "../utils/format";

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

export default function MobileInvoiceRenderer({ invoice, items, business, qrUrl, onPressPayNow }) {
  const { tokens: T } = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);

  const hasHSN = useMemo(() => (items || []).some((i) => !!i.hsn_code), [items]);
  const hasItemDiscount = useMemo(() => (items || []).some((i) => Number(i.item_discount || 0) > 0), [items]);

  const subtotal = Number(invoice?.subtotal || 0);
  const cgst = Number(invoice?.cgst_amount || 0);
  const sgst = Number(invoice?.sgst_amount || 0);
  const igst = Number(invoice?.igst_amount || 0);
  const tax = Number(invoice?.tax_amount || 0);
  const discount = Number(invoice?.discount_amount || 0);
  const total = Number(invoice?.total_amount || 0);
  const paid = Number(invoice?.amount_paid || 0);
  const due = Number(invoice?.balance_due || 0);

  return (
    <View style={styles.paper}>
      <View style={styles.darkHeader}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={styles.brandRow}>
              <View style={styles.logo}>
                <Text style={styles.logoTx}>{(business?.name || "N").slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.brandName}>{business?.name || "Your Business"}</Text>
                {!!business?.invoice_gst && <Text style={styles.brandSub}>GST: {business.invoice_gst}</Text>}
              </View>
            </View>
            {!!business?.address && <Text style={styles.brandSub}>{business.address}</Text>}
            {!!business?.phone && <Text style={styles.brandSub}>Mob: {business.phone}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.invoiceWord}>INVOICE</Text>
            <Text style={styles.invoiceNo}>{invoice?.invoice_number || "-"}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillTx}>{(invoice?.status || "-").replace(/_/g, " ").toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.metaBand}>
        <View style={{ flex: 1 }}>
          <Text style={styles.metaK}>Bill To</Text>
          <Text style={styles.metaStrong}>{invoice?.client_name || "-"}</Text>
          {!!invoice?.client_email && <Text style={styles.metaV}>{invoice.client_email}</Text>}
          {!!invoice?.client_phone && <Text style={styles.metaV}>{invoice.client_phone}</Text>}
          {!!invoice?.client_address && <Text style={styles.metaV}>{invoice.client_address}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.metaRow}><Text style={styles.metaK}>Invoice Date</Text><Text style={styles.metaStrong}>{fmtDate(invoice?.issue_date)}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaK}>Due Date</Text><Text style={styles.metaStrong}>{fmtDate(invoice?.due_date)}</Text></View>
          {!!invoice?.place_of_supply && <View style={styles.metaRow}><Text style={styles.metaK}>Place of Supply</Text><Text style={styles.metaStrong}>{invoice.place_of_supply}</Text></View>}
          {!!invoice?.supply_type && <View style={styles.metaRow}><Text style={styles.metaK}>Supply Type</Text><Text style={styles.metaStrong}>{invoice.supply_type === "interstate" ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}</Text></View>}
        </View>
      </View>

      {!!invoice?.einvoice_irn && (
        <View style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "rgba(16,185,129,0.12)", borderBottomWidth: StyleSheet.hairlineWidth, borderColor: T.border }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: T.textMuted, marginBottom: 4 }}>GST E-INVOICE (IRN)</Text>
          <Text style={{ fontSize: 12, color: T.textPrimary, fontFamily: "monospace" }} selectable>
            {invoice.einvoice_irn}
          </Text>
        </View>
      )}

      <View style={styles.tableHead}>
        <Text style={[styles.th, { flex: 0.5 }]}>No.</Text>
        <Text style={[styles.th, { flex: 2.3 }]}>Description</Text>
        {hasHSN ? <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>HSN</Text> : null}
        <Text style={[styles.th, { flex: 0.8, textAlign: "center" }]}>Qty</Text>
        <Text style={[styles.th, { flex: 1.1, textAlign: "right" }]}>Rate</Text>
        {hasItemDiscount ? <Text style={[styles.th, { flex: 1.1, textAlign: "right" }]}>Disc</Text> : null}
        <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>Amount</Text>
      </View>
      {(items || []).map((it, idx) => (
        <View key={it.id || idx} style={styles.tableRow}>
          <Text style={[styles.td, { flex: 0.5 }]}>{idx + 1}</Text>
          <Text style={[styles.td, { flex: 2.3 }]}>{it.description}</Text>
          {hasHSN ? <Text style={[styles.td, { flex: 1, textAlign: "center" }]}>{it.hsn_code || "-"}</Text> : null}
          <Text style={[styles.td, { flex: 0.8, textAlign: "center" }]}>{it.quantity}</Text>
          <Text style={[styles.td, { flex: 1.1, textAlign: "right" }]}>{fmtInr(it.unit_price)}</Text>
          {hasItemDiscount ? <Text style={[styles.td, { flex: 1.1, textAlign: "right" }]}>{Number(it.item_discount || 0) ? fmtInr(it.item_discount) : "-"}</Text> : null}
          <Text style={[styles.tdAmount, { flex: 1.2, textAlign: "right" }]}>{fmtInr(it.total)}</Text>
        </View>
      ))}

      <View style={styles.totalsWrap}>
        <View style={styles.totalRow}><Text style={styles.totalK}>Subtotal</Text><Text style={styles.totalV}>{fmtInr(subtotal)}</Text></View>
        {cgst > 0 ? <View style={styles.totalRow}><Text style={styles.totalK}>CGST ({invoice?.cgst_rate || 0}%)</Text><Text style={styles.totalV}>{fmtInr(cgst)}</Text></View> : null}
        {sgst > 0 ? <View style={styles.totalRow}><Text style={styles.totalK}>SGST ({invoice?.sgst_rate || 0}%)</Text><Text style={styles.totalV}>{fmtInr(sgst)}</Text></View> : null}
        {igst > 0 ? <View style={styles.totalRow}><Text style={styles.totalK}>IGST ({invoice?.igst_rate || 0}%)</Text><Text style={styles.totalV}>{fmtInr(igst)}</Text></View> : null}
        {!cgst && !igst && tax > 0 ? <View style={styles.totalRow}><Text style={styles.totalK}>Tax ({invoice?.tax_rate || 0}%)</Text><Text style={styles.totalV}>{fmtInr(tax)}</Text></View> : null}
        {discount > 0 ? <View style={styles.totalRow}><Text style={styles.totalK}>Discount</Text><Text style={[styles.totalV, { color: "#ef4444" }]}>-{fmtInr(discount)}</Text></View> : null}
        <View style={styles.grandBand}>
          <Text style={styles.grandK}>Total</Text>
          <Text style={styles.grandV}>{fmtInr(total)}</Text>
        </View>
        {paid > 0 ? <View style={styles.totalRow}><Text style={styles.totalK}>Amount Paid</Text><Text style={[styles.totalV, { color: "#10b981" }]}>-{fmtInr(paid)}</Text></View> : null}
        {due > 0 ? <View style={styles.totalRow}><Text style={styles.totalK}>Balance Due</Text><Text style={[styles.totalV, { color: "#ef4444", fontWeight: "900" }]}>{fmtInr(due)}</Text></View> : null}
      </View>

      <View style={styles.wordsBox}>
        <Text style={styles.wordsLabel}>Amount in Words:</Text>
        <Text style={styles.wordsValue}>{amountInWords(total)}</Text>
      </View>

      {(business?.invoice_bank_name || business?.invoice_bank_account || business?.invoice_bank_ifsc) ? (
        <View style={styles.bankBox}>
          <Text style={styles.metaK}>Bank Details</Text>
          {!!business?.invoice_bank_name && <Text style={styles.metaV}>Bank: {business.invoice_bank_name}</Text>}
          {!!business?.invoice_bank_account && <Text style={styles.metaV}>A/C: {business.invoice_bank_account}</Text>}
          {!!business?.invoice_bank_ifsc && <Text style={styles.metaV}>IFSC: {business.invoice_bank_ifsc}</Text>}
        </View>
      ) : null}

      {qrUrl && due > 0 ? (
        <View style={styles.qrBox}>
          <Image source={{ uri: qrUrl }} style={styles.qr} resizeMode="contain" />
          <Text style={styles.qrTx}>Scan UPI QR to pay {fmtInr(due)}</Text>
          <TouchableOpacity style={styles.payNowBtn} activeOpacity={0.9} onPress={onPressPayNow}>
            <Text style={styles.payNowBtnTx}>Pay Now (UPI App)</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!!invoice?.notes && (
        <View style={styles.noteBox}>
          <Text style={styles.metaK}>Notes</Text>
          <Text style={styles.metaV}>{invoice.notes}</Text>
        </View>
      )}
      {!!business?.terms_of_sale && (
        <View style={styles.noteBox}>
          <Text style={styles.metaK}>Terms of Sale</Text>
          <Text style={styles.metaV}>{business.terms_of_sale}</Text>
        </View>
      )}
      {!!business?.invoice_footer_note && <Text style={styles.footer}>{business.invoice_footer_note}</Text>}
    </View>
  );
}

function makeStyles(T) {
  return StyleSheet.create({
    paper: {
      backgroundColor: "#fff",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(15,23,42,0.08)",
      overflow: "hidden",
    },
    darkHeader: { backgroundColor: "#111827", padding: 14 },
    topRow: { flexDirection: "row", justifyContent: "space-between" },
    brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    logo: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center", marginRight: 10 },
    logoTx: { color: "#111", fontWeight: "900" },
    brandName: { color: "#F8FAFC", fontWeight: "900", fontSize: 17 },
    brandSub: { color: "rgba(248,250,252,0.72)", fontSize: 11, marginTop: 2, lineHeight: 16 },
    invoiceWord: { color: "#D4AF37", fontSize: 26, fontWeight: "900" },
    invoiceNo: { color: "#fff", fontWeight: "800", fontSize: 12, marginTop: 3 },
    statusPill: { marginTop: 7, borderWidth: 1, borderColor: "rgba(59,130,246,0.4)", backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    statusPillTx: { color: "#93c5fd", fontWeight: "900", fontSize: 10 },
    metaBand: { backgroundColor: "#F8FAFC", borderTopWidth: 1, borderTopColor: "#E5E7EB", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", padding: 14, flexDirection: "row", gap: 10 },
    metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 8 },
    metaK: { color: "#64748B", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
    metaV: { color: "#475569", fontSize: 12, marginTop: 2, lineHeight: 17 },
    metaStrong: { color: "#0F172A", fontSize: 12, fontWeight: "800" },
    tableHead: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1.5, borderBottomColor: "#111827" },
    th: { color: "#6B7280", fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    tableRow: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
    td: { color: "#111827", fontSize: 12, fontWeight: "600" },
    tdAmount: { color: "#111827", fontSize: 12, fontWeight: "800" },
    totalsWrap: { padding: 12, alignSelf: "flex-end", width: "72%" },
    totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
    totalK: { color: "#475569", fontSize: 12 },
    totalV: { color: "#0F172A", fontSize: 12, fontWeight: "700" },
    grandBand: { marginTop: 8, backgroundColor: "#111827", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between" },
    grandK: { color: "#fff", fontWeight: "800", fontSize: 14 },
    grandV: { color: "#D4AF37", fontWeight: "900", fontSize: 20 },
    wordsBox: { marginHorizontal: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: "#D4AF37", backgroundColor: "#F8FAFC", borderRadius: 10, padding: 10 },
    wordsLabel: { color: "#64748B", fontSize: 11, fontWeight: "800" },
    wordsValue: { color: "#0F172A", fontSize: 11, fontWeight: "700", marginTop: 4 },
    bankBox: { marginHorizontal: 12, marginBottom: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10 },
    qrBox: { marginHorizontal: 12, marginBottom: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10 },
    qr: { width: 170, height: 170, borderRadius: 12, backgroundColor: "#fff" },
    qrTx: { color: "#334155", marginTop: 8, fontWeight: "700" },
    payNowBtn: {
      marginTop: 10,
      backgroundColor: "#10B981",
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: "rgba(16,185,129,0.45)",
    },
    payNowBtnTx: { color: "#052E16", fontWeight: "900", fontSize: 13 },
    noteBox: { marginHorizontal: 12, marginBottom: 10 },
    footer: { textAlign: "center", color: "#64748B", fontSize: 11, marginHorizontal: 12, marginBottom: 12 },
  });
}
