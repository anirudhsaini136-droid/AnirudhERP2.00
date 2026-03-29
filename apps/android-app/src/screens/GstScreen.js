import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getGstGstr1, getGstSummary, getPurchasesItcSummary } from "../api";
import { ContentPanel, HeroBand, KpiTile, LoadingCenter, PageHeader, PrimaryButton, SecondaryButton } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { chunkPairs, fmtInr } from "../utils/format";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function monthBounds(offset = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return { start_date: iso(start), end_date: iso(end) };
}

const toNum = (n) => Number(n || 0);

function buildCsv(rows) {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const s = String(val);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export default function GstScreen() {
  const initial = useMemo(() => monthBounds(0), []);
  const [startDate, setStartDate] = useState(initial.start_date);
  const [endDate, setEndDate] = useState(initial.end_date);
  const [summary, setSummary] = useState(null);
  const [gstr1, setGstr1] = useState(null);
  const [itc, setItc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  const runReport = useCallback(async (start, end) => {
    try {
      setRefreshing(true);
      const [sumRes, g1Res] = await Promise.all([
        getGstSummary({ start_date: start, end_date: end }),
        getGstGstr1({ start_date: start, end_date: end }),
      ]);
      setSummary(sumRes);
      setGstr1(g1Res);
      try {
        const itcRes = await getPurchasesItcSummary(start, end);
        setItc(itcRes);
      } catch {
        setItc({ total_purchases: 0, itc: { cgst: 0, sgst: 0, igst: 0, total: 0 } });
      }
    } catch (e) {
      Alert.alert("GST", e.message || "Failed to load GST data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const load = useCallback(() => runReport(startDate, endDate), [runReport, startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      runReport(startDate, endDate);
    }, [runReport, startDate, endDate]),
  );

  const s = summary?.summary || {};
  const netGst = Math.max(0, toNum(s.total_tax) - toNum(itc?.itc?.total));

  const topKpi = useMemo(
    () =>
      chunkPairs([
        { label: "Total sales", value: fmtInr(s.total_sales), emoji: "📈", accent: T.gold },
        { label: "Taxable value", value: fmtInr(s.total_taxable_value), emoji: "📑", accent: T.sapphire },
        { label: "GST collected", value: fmtInr(s.total_tax), emoji: "₹", accent: T.emerald },
        { label: "Net GST payable", value: fmtInr(netGst), emoji: "⚖️", accent: T.rose },
      ]),
    [s.total_sales, s.total_taxable_value, s.total_tax, netGst],
  );

  const onShareCsv = async (csv, filenameHint) => {
    if (!csv?.trim()) {
      Alert.alert("Export", "No data to export");
      return;
    }
    try {
      await Share.share({
        message: `${filenameHint}\n\n${csv}`,
        title: filenameHint,
      });
    } catch (e) {
      Alert.alert("Export", e.message || "Could not open share sheet");
    }
  };

  const exportSummaryCsv = () => {
    const invoices = summary?.invoices || [];
    const rows = invoices.map((inv) => ({
      "Invoice No": inv.invoice_number,
      Date: inv.issue_date,
      Customer: inv.client_name,
      "Place of Supply": inv.place_of_supply || inv.buyer_state || "",
      "Supply Type": inv.supply_type || "intrastate",
      "Taxable Value": inv.subtotal,
      "Tax Rate %": inv.tax_rate,
      "CGST %": inv.cgst_rate,
      "CGST Amount": inv.cgst_amount,
      "SGST %": inv.sgst_rate,
      "SGST Amount": inv.sgst_amount,
      "IGST %": inv.igst_rate,
      "IGST Amount": inv.igst_amount,
      "Total Amount": inv.total_amount,
      Status: inv.status,
    }));
    onShareCsv(buildCsv(rows), `GST_Summary_${startDate}_to_${endDate}`);
  };

  const exportGstr1Csv = () => {
    const rows = (gstr1?.rows || []).map((row) => ({
      "Invoice No": row.invoice_number,
      Date: row.invoice_date,
      Customer: row.customer_name,
      "Place of Supply": row.place_of_supply,
      HSN: row.hsn_code,
      Description: row.description,
      Qty: row.quantity,
      Rate: row.unit_price,
      Taxable: row.taxable_value,
      "Tax %": row.tax_rate,
      CGST: row.cgst_amount,
      SGST: row.sgst_amount,
      IGST: row.igst_amount,
      Total: row.invoice_value,
    }));
    onShareCsv(buildCsv(rows), `GSTR1_${startDate}_to_${endDate}`);
  };

  if (loading && !summary) {
    return <LoadingCenter label="Loading GST reports…" />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="COMPLIANCE">
        <PageHeader
          title="GST reports"
          subtitle="GSTR-1 · tax summary · ITC · GSTR-3B (same as web)"
          footnote={`${startDate} → ${endDate}`}
        />
      </HeroBand>

      <ContentPanel style={{ marginBottom: 12 }}>
        <Text style={styles.label}>From (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-03-01"
          placeholderTextColor={T.textMuted}
          autoCapitalize="none"
        />
        <Text style={[styles.label, { marginTop: 10 }]}>To (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2026-03-31"
          placeholderTextColor={T.textMuted}
          autoCapitalize="none"
        />
        <View style={styles.chipRow}>
          {[
            { label: "This month", off: 0 },
            { label: "Last month", off: -1 },
            { label: "2 mo ago", off: -2 },
          ].map(({ label, off }) => (
            <TouchableOpacity
              key={off}
              style={styles.chip}
              onPress={() => {
                const b = monthBounds(off);
                setStartDate(b.start_date);
                setEndDate(b.end_date);
                runReport(b.start_date, b.end_date);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.chipText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <PrimaryButton title={refreshing ? "Loading…" : "Generate report"} onPress={load} disabled={refreshing} />
      </ContentPanel>

      {summary && (
        <>
          <Text style={S.sectionTitle}>Summary</Text>
          {topKpi.map((pair, i) => (
            <View key={i} style={styles.kpiRow}>
              {pair.map((t, j) => (
                <View key={j} style={{ flex: 1 }}>
                  <KpiTile label={t.label} value={t.value} emoji={t.emoji} accent={t.accent} />
                </View>
              ))}
            </View>
          ))}

          <View style={styles.triRow}>
            <View style={[styles.triCard, { borderTopColor: T.sapphire }]}>
              <Text style={styles.triLabel}>CGST (intra)</Text>
              <Text style={[styles.triVal, { color: T.sapphire }]}>{fmtInr(s.total_cgst)}</Text>
              <Text style={styles.triSub}>{s.intrastate_count ?? 0} intra-state</Text>
            </View>
            <View style={[styles.triCard, { borderTopColor: T.sapphire }]}>
              <Text style={styles.triLabel}>SGST (intra)</Text>
              <Text style={[styles.triVal, { color: T.sapphire }]}>{fmtInr(s.total_sgst)}</Text>
              <Text style={styles.triSub}>Matches CGST</Text>
            </View>
            <View style={[styles.triCard, { borderTopColor: "#a78bfa" }]}>
              <Text style={styles.triLabel}>IGST (inter)</Text>
              <Text style={[styles.triVal, { color: "#a78bfa" }]}>{fmtInr(s.total_igst)}</Text>
              <Text style={styles.triSub}>{s.interstate_count ?? 0} inter-state</Text>
            </View>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "summary" && styles.tabOn]}
              onPress={() => setActiveTab("summary")}
            >
              <Text style={[styles.tabText, activeTab === "summary" && styles.tabTextOn]}>Sales register</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "gstr1" && styles.tabOn]}
              onPress={() => setActiveTab("gstr1")}
            >
              <Text style={[styles.tabText, activeTab === "gstr1" && styles.tabTextOn]}>GSTR-1 detail</Text>
            </TouchableOpacity>
          </View>

          {activeTab === "summary" && (
            <ContentPanel>
              <View style={styles.rowBetween}>
                <Text style={styles.panelTitle}>Sales register ({s.total_invoices ?? 0})</Text>
                <SecondaryButton title="Export CSV" onPress={exportSummaryCsv} />
              </View>
              {(summary.invoices || []).length === 0 ? (
                <Text style={styles.empty}>No invoices in range</Text>
              ) : (
                (summary.invoices || []).map((inv, idx) => (
                  <View key={String(inv.id || inv.invoice_number || idx)} style={styles.invCard}>
                    <Text style={styles.invTitle}>
                      {inv.invoice_number}{" "}
                      <Text style={styles.invDate}>{inv.issue_date}</Text>
                    </Text>
                    <Text style={styles.invSub} numberOfLines={1}>
                      {inv.client_name || "—"}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.badge,
                          inv.supply_type === "interstate" ? styles.badgeIg : styles.badgeCg,
                        ]}
                      >
                        <Text style={styles.badgeTx}>{inv.supply_type === "interstate" ? "IGST" : "CGST+SGST"}</Text>
                      </View>
                    </View>
                    <View style={styles.grid4}>
                      <Text style={styles.cell}>
                        Taxable{"\n"}
                        <Text style={styles.cellStrong}>{fmtInr(inv.subtotal)}</Text>
                      </Text>
                      <Text style={styles.cell}>
                        CGST{"\n"}
                        <Text style={styles.cellStrong}>{toNum(inv.cgst_amount) ? fmtInr(inv.cgst_amount) : "—"}</Text>
                      </Text>
                      <Text style={styles.cell}>
                        SGST{"\n"}
                        <Text style={styles.cellStrong}>{toNum(inv.sgst_amount) ? fmtInr(inv.sgst_amount) : "—"}</Text>
                      </Text>
                      <Text style={styles.cell}>
                        IGST{"\n"}
                        <Text style={styles.cellStrong}>{toNum(inv.igst_amount) ? fmtInr(inv.igst_amount) : "—"}</Text>
                      </Text>
                    </View>
                    <Text style={styles.totalLine}>Total {fmtInr(inv.total_amount)}</Text>
                  </View>
                ))
              )}
              <View style={styles.totalsFoot}>
                <Text style={styles.footLabel}>Totals</Text>
                <Text style={styles.footLine}>Taxable {fmtInr(s.total_taxable_value)}</Text>
                <Text style={styles.footLine}>
                  CGST {fmtInr(s.total_cgst)} · SGST {fmtInr(s.total_sgst)} · IGST {fmtInr(s.total_igst)}
                </Text>
                <Text style={[styles.footLine, { color: T.gold, fontWeight: "800" }]}>Sales {fmtInr(s.total_sales)}</Text>
              </View>
            </ContentPanel>
          )}

          {activeTab === "gstr1" && (
            <ContentPanel>
              <View style={styles.rowBetween}>
                <Text style={styles.panelTitle}>GSTR-1 ({gstr1?.total_rows ?? (gstr1?.rows || []).length} lines)</Text>
                <SecondaryButton title="Export CSV" onPress={exportGstr1Csv} />
              </View>
              {(gstr1?.rows || []).length === 0 ? (
                <Text style={styles.empty}>No line items in range</Text>
              ) : (
                (gstr1?.rows || []).map((row, idx) => (
                  <View key={`g1-${idx}`} style={styles.g1Card}>
                    <Text style={styles.invTitle}>
                      {row.invoice_number} <Text style={styles.invDate}>{row.invoice_date}</Text>
                    </Text>
                    <Text style={styles.invSub} numberOfLines={1}>
                      {row.customer_name}
                    </Text>
                    <Text style={styles.g1Meta}>
                      POS {row.place_of_supply || "—"} · HSN {row.hsn_code || "—"}
                    </Text>
                    <Text style={styles.g1Desc} numberOfLines={2}>
                      {row.description || "—"}
                    </Text>
                    <Text style={styles.g1Meta}>
                      Qty {row.quantity} × {fmtInr(row.unit_price)} · Taxable {fmtInr(row.taxable_value)} · {row.tax_rate}%
                    </Text>
                    <View style={styles.grid4}>
                      <Text style={styles.cell}>
                        CGST{"\n"}
                        <Text style={styles.cellStrong}>{toNum(row.cgst_amount) ? fmtInr(row.cgst_amount) : "—"}</Text>
                      </Text>
                      <Text style={styles.cell}>
                        SGST{"\n"}
                        <Text style={styles.cellStrong}>{toNum(row.sgst_amount) ? fmtInr(row.sgst_amount) : "—"}</Text>
                      </Text>
                      <Text style={styles.cell}>
                        IGST{"\n"}
                        <Text style={styles.cellStrong}>{toNum(row.igst_amount) ? fmtInr(row.igst_amount) : "—"}</Text>
                      </Text>
                      <Text style={styles.cell}>
                        Inv. total{"\n"}
                        <Text style={[styles.cellStrong, { color: T.gold }]}>{fmtInr(row.invoice_value)}</Text>
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ContentPanel>
          )}

          {itc && (
            <ContentPanel style={{ borderColor: "rgba(16,185,129,0.35)", marginTop: 4 }}>
              <Text style={styles.panelTitle}>Input tax credit (purchases)</Text>
              <View style={styles.itcGrid}>
                <View>
                  <Text style={styles.itcLab}>Total purchases</Text>
                  <Text style={styles.itcVal}>{fmtInr(itc.total_purchases)}</Text>
                </View>
                <View>
                  <Text style={styles.itcLab}>ITC CGST</Text>
                  <Text style={[styles.itcVal, { color: T.emerald }]}>{fmtInr(itc.itc?.cgst)}</Text>
                </View>
                <View>
                  <Text style={styles.itcLab}>ITC SGST</Text>
                  <Text style={[styles.itcVal, { color: T.emerald }]}>{fmtInr(itc.itc?.sgst)}</Text>
                </View>
                <View>
                  <Text style={styles.itcLab}>ITC IGST</Text>
                  <Text style={[styles.itcVal, { color: T.emerald }]}>{fmtInr(itc.itc?.igst)}</Text>
                </View>
              </View>
            </ContentPanel>
          )}

          <ContentPanel style={{ borderColor: "rgba(201,168,76,0.35)", marginTop: 4, marginBottom: 24 }}>
            <Text style={styles.panelTitle}>GSTR-3B summary</Text>
            <Text style={styles.hint}>Share figures with your CA</Text>
            <View style={styles.itcGrid}>
              <View>
                <Text style={styles.itcLab}>Outward taxable</Text>
                <Text style={styles.itcVal}>{fmtInr(s.total_taxable_value)}</Text>
              </View>
              <View>
                <Text style={styles.itcLab}>Output tax</Text>
                <Text style={[styles.itcVal, { color: T.rose }]}>{fmtInr(s.total_tax)}</Text>
              </View>
              <View>
                <Text style={styles.itcLab}>Total ITC</Text>
                <Text style={[styles.itcVal, { color: T.emerald }]}>{fmtInr(itc?.itc?.total)}</Text>
              </View>
              <View>
                <Text style={styles.itcLab}>Net GST payable</Text>
                <Text style={[styles.itcVal, { color: T.gold, fontSize: 18 }]}>{fmtInr(netGst)}</Text>
              </View>
            </View>
            {["CGST", "SGST", "IGST"].map((lab) => {
              const key = lab.toLowerCase();
              const output = s[`total_${key}`] ?? 0;
              const itcV = itc?.itc?.[key] ?? 0;
              const net = Math.max(0, toNum(output) - toNum(itcV));
              return (
                <View key={lab} style={styles.g3bRow}>
                  <Text style={styles.g3bLab}>{lab}</Text>
                  <Text style={styles.g3bLine}>
                    Output <Text style={{ color: T.rose }}>{fmtInr(output)}</Text>
                  </Text>
                  <Text style={styles.g3bLine}>
                    ITC <Text style={{ color: T.emerald }}>-{fmtInr(itcV)}</Text>
                  </Text>
                  <Text style={styles.g3bLine}>
                    Net <Text style={{ color: T.gold, fontWeight: "800" }}>{fmtInr(net)}</Text>
                  </Text>
                </View>
              );
            })}
          </ContentPanel>
        </>
      )}

      {!summary && !loading && (
        <ContentPanel>
          <Text style={styles.empty}>Set dates and tap Generate report</Text>
        </ContentPanel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: T.textMuted, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: T.cardBg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: T.textPrimary,
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.cardBg,
  },
  chipText: { color: T.textSecondary, fontSize: 12, fontWeight: "600" },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  triRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  triCard: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: T.cardBg,
    borderRadius: 12,
    padding: 12,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: T.border,
  },
  triLabel: { color: T.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  triVal: { fontSize: 16, fontWeight: "800", marginTop: 6 },
  triSub: { color: T.textMuted, fontSize: 11, marginTop: 4 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: T.cardBg,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  tabOn: { backgroundColor: "rgba(255,255,255,0.08)", borderColor: T.gold },
  tabText: { color: T.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextOn: { color: T.textPrimary },
  panelTitle: { color: T.textPrimary, fontWeight: "800", fontSize: 15, flex: 1, marginRight: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  invCard: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  invTitle: { color: T.textPrimary, fontWeight: "800", fontSize: 14 },
  invDate: { color: T.textMuted, fontWeight: "500", fontSize: 12 },
  invSub: { color: T.textSecondary, fontSize: 13, marginTop: 4 },
  badgeRow: { marginTop: 8 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeCg: { backgroundColor: "rgba(59,130,246,0.2)" },
  badgeIg: { backgroundColor: "rgba(167,139,250,0.2)" },
  badgeTx: { fontSize: 10, fontWeight: "800", color: T.textPrimary },
  grid4: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 8 },
  cell: { color: T.textMuted, fontSize: 11, width: "22%" },
  cellStrong: { color: T.textPrimary, fontWeight: "700", fontSize: 12 },
  totalLine: { marginTop: 10, color: T.gold, fontWeight: "800", fontSize: 14, textAlign: "right" },
  totalsFoot: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: T.border,
  },
  footLabel: { color: T.textPrimary, fontWeight: "800", marginBottom: 6 },
  footLine: { color: T.textSecondary, fontSize: 12, marginBottom: 4 },
  g1Card: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  g1Meta: { color: T.textMuted, fontSize: 11, marginTop: 6 },
  g1Desc: { color: T.textSecondary, fontSize: 12, marginTop: 4 },
  empty: { color: T.textMuted, textAlign: "center", padding: 20 },
  itcGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  itcLab: { color: T.textMuted, fontSize: 10, textTransform: "uppercase" },
  itcVal: { color: T.textPrimary, fontWeight: "800", fontSize: 15, marginTop: 4 },
  hint: { color: T.textMuted, fontSize: 12, marginBottom: 4 },
  g3bRow: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: T.border,
  },
  g3bLab: { color: T.textSecondary, fontWeight: "800", marginBottom: 6 },
  g3bLine: { color: T.textMuted, fontSize: 12, marginTop: 2 },
});
