import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  deleteAccountingJournal,
  getAccountingAccounts,
  getAccountingCashFlow,
  getAccountingJournal,
  getBalanceSheetReport,
  getAccountingProfitLoss,
  getTrialBalance,
  postAccountingClosePeriod,
  postAccountingJournal,
  postAccountingRecalculateBalances,
  postAccountingSetup,
  postFinanceSyncPaymentsToAccounting,
  postFinanceSyncToAccounting,
  postPurchasesSyncPaymentsToAccounting,
  postPurchasesSyncToAccounting,
} from "../api";
import {
  ContentPanel,
  EmptyState,
  HeroBand,
  LoadingCenter,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
} from "../components/NexaUi";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeProvider";
import { useScreenStyles } from "../theme/screenStyles";
import { fmtInrDec } from "../utils/format";

const TABS = [
  "Chart of Accounts",
  "Journal Entries",
  "Trial Balance",
  "P&L",
  "Balance Sheet",
  "Cash Flow",
];

const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function monthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return {
    start: `${y}-${pad2(m + 1)}-01`,
    end: `${y}-${pad2(m + 1)}-${pad2(last)}`,
  };
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function typeColor(T, t) {
  const m = {
    asset: T.sapphire,
    liability: T.rose,
    equity: "#A855F7",
    income: T.emerald,
    expense: T.goldMuted,
  };
  return m[t] || T.textSecondary;
}

/**
 * Ledger grid: fixed Dr/Cr width (no wrap), account name flexes with min width.
 * If the table is wider than the card, parent uses horizontal ScrollView.
 */
function ledgerColWidths() {
  const w = Dimensions.get("window").width;
  const cardInner = Math.max(300, w - 52);
  const codeW = 52;
  const nameMin = 118;
  let amtW = Math.floor((cardInner - codeW - nameMin) / 2);
  amtW = Math.max(100, Math.min(132, amtW));
  const minTableWidth = codeW + nameMin + amtW * 2;
  const coaMinWidth = codeW + nameMin + amtW;
  return { codeW, amtW, nameMin, minTableWidth, coaMinWidth };
}

function makeAccountingStyles(T) {
  const { codeW, amtW, nameMin, minTableWidth, coaMinWidth } = ledgerColWidths();
  const rowBorder = { borderBottomWidth: 1, borderBottomColor: T.border };
  return {
    ledgerTable: { marginHorizontal: -2 },
    tbHead: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth * 2,
      borderBottomColor: T.border,
    },
    tbThCode: {
      width: codeW,
      flexShrink: 0,
      color: T.textMuted,
      fontSize: 10,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    tbThName: {
      flex: 1,
      minWidth: nameMin,
      color: T.textMuted,
      fontSize: 10,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.3,
      paddingRight: 10,
    },
    tbThAmt: {
      width: amtW,
      flexShrink: 0,
      textAlign: "right",
      color: T.textMuted,
      fontSize: 10,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    tbRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 11,
      ...rowBorder,
    },
    tbCode: { width: codeW, flexShrink: 0, fontSize: 11, color: T.textMuted, fontWeight: "600" },
    tbName: {
      flex: 1,
      minWidth: nameMin,
      fontSize: 13,
      color: T.textPrimary,
      fontWeight: "500",
      paddingRight: 10,
    },
    tbAmtBase: {
      width: amtW,
      flexShrink: 0,
      textAlign: "right",
    },
    tbFooter: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 14,
      marginTop: 4,
      borderTopWidth: 2,
      borderTopColor: T.mode === "light" ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.14)",
    },
    ledgerMinWidth: minTableWidth,
    ledgerCoaMinWidth: coaMinWidth,
    ledgerCodeW: codeW,
    ledgerNameCell: { flex: 1, minWidth: nameMin, paddingRight: 10 },
    tabScroll: { marginBottom: 14, flexGrow: 0 },
    tabChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      marginRight: 8,
      borderWidth: 1,
      borderColor: T.border,
      backgroundColor: T.cardBg,
    },
    tabChipOn: {
      borderColor: T.gold,
      backgroundColor: T.mode === "light" ? "rgba(194,142,14,0.12)" : "rgba(212,175,55,0.12)",
    },
    tabChipText: { color: T.textSecondary, fontSize: 12, fontWeight: "700" },
    tabChipTextOn: { color: T.textPrimary },
    sectionTitle: { color: T.textPrimary, fontSize: 16, fontWeight: "800", marginBottom: 10, marginTop: 4 },
    tableHead: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
    th: { color: T.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
    tr: { flexDirection: "row", paddingVertical: 10, ...rowBorder, alignItems: "flex-start" },
    tdMono: { fontFamily: undefined, fontSize: 11, color: T.textMuted },
    tdName: { fontSize: 13, color: T.textPrimary, flex: 1 },
    cardBlock: {
      backgroundColor: T.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: T.border,
      paddingVertical: 16,
      paddingHorizontal: 18,
      marginBottom: 12,
    },
    journalCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: T.border,
      padding: 12,
      marginBottom: 10,
      backgroundColor: T.mode === "light" ? "rgba(15,23,42,0.03)" : "rgba(255,255,255,0.04)",
    },
    input: {
      backgroundColor: T.mode === "light" ? "#FFFFFF" : T.abyss,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: T.textPrimary,
      fontSize: 14,
      marginBottom: 8,
    },
    label: { color: T.textMuted, fontSize: 11, marginBottom: 4, fontWeight: "600" },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalSheet: {
      backgroundColor: T.cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      maxHeight: "88%",
      borderWidth: 1,
      borderColor: T.border,
    },
    pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  };
}

export default function AccountingScreen() {
  const { user } = useAuth();
  const { tokens: T } = useTheme();
  const S = useScreenStyles();
  const st = useMemo(() => makeAccountingStyles(T), [T]);

  const [activeTab, setActiveTab] = useState("Chart of Accounts");
  const [accounts, setAccounts] = useState([]);
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);

  const [trialBalance, setTrialBalance] = useState(null);
  const [journal, setJournal] = useState([]);
  const [pl, setPL] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);

  const range = useMemo(() => monthRange(), []);
  const [startDate, setStartDate] = useState(range.start);
  const [endDate, setEndDate] = useState(range.end);

  const [showJournal, setShowJournal] = useState(false);
  const [journalForm, setJournalForm] = useState({
    entry_date: todayIso(),
    narration: "",
    lines: [
      { account_id: "", debit: "", credit: "", narration: "" },
      { account_id: "", debit: "", credit: "", narration: "" },
    ],
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLineIdx, setPickerLineIdx] = useState(0);
  const [accountFilter, setAccountFilter] = useState("");

  const isCA = user?.role === "ca_admin";

  const silentSync = useCallback(async () => {
    if (isCA) return;
    const r = monthRange();
    const s = (p) => p.catch(() => {});
    await Promise.all([
      s(postFinanceSyncToAccounting()),
      s(postPurchasesSyncToAccounting()),
      s(postFinanceSyncPaymentsToAccounting()),
      s(postPurchasesSyncPaymentsToAccounting()),
    ]);
    await s(postAccountingRecalculateBalances());
    await s(postAccountingClosePeriod(r.start, r.end));
  }, [isCA]);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await getAccountingAccounts();
      const list = res.accounts || [];
      const total = res.total ?? list.length;
      setAccounts(list);
      setIsSetup(total > 0);
      if (total > 0 && !isCA) await silentSync();
    } catch {
      setAccounts([]);
      setIsSetup(false);
    }
  }, [isCA, silentSync]);

  const loadTrial = useCallback(async () => {
    try {
      const data = await getTrialBalance();
      setTrialBalance(data);
    } catch {
      setTrialBalance(null);
    }
  }, []);

  const loadJournal = useCallback(async () => {
    try {
      const data = await getAccountingJournal(50);
      setJournal(data.entries || []);
    } catch {
      setJournal([]);
    }
  }, []);

  const loadPL = useCallback(async () => {
    try {
      const data = await getAccountingProfitLoss(startDate, endDate);
      setPL(data);
    } catch {
      setPL(null);
    }
  }, [startDate, endDate]);

  const loadBS = useCallback(async () => {
    try {
      const data = await getBalanceSheetReport();
      setBalanceSheet(data);
    } catch {
      setBalanceSheet(null);
    }
  }, []);

  const loadCF = useCallback(async () => {
    try {
      const data = await getAccountingCashFlow(startDate, endDate);
      setCashFlow(data);
    } catch {
      setCashFlow(null);
    }
  }, [startDate, endDate]);

  const refreshTab = useCallback(async () => {
    if (activeTab === "Trial Balance") await loadTrial();
    if (activeTab === "Journal Entries") await loadJournal();
    if (activeTab === "P&L") await loadPL();
    if (activeTab === "Balance Sheet") await loadBS();
    if (activeTab === "Cash Flow") await loadCF();
    if (activeTab === "Chart of Accounts") await loadAccounts();
  }, [activeTab, loadTrial, loadJournal, loadPL, loadBS, loadCF, loadAccounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAccounts();
      await refreshTab();
    } finally {
      setRefreshing(false);
    }
  }, [loadAccounts, refreshTab]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          await loadAccounts();
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [loadAccounts])
  );

  useEffect(() => {
    if (!isSetup) return;
    refreshTab();
  }, [activeTab, startDate, endDate, isSetup, refreshTab]);

  const setupCOA = async () => {
    setSetupBusy(true);
    try {
      await postAccountingSetup();
      await loadAccounts();
      Alert.alert("Accounting", "Chart of accounts initialized.");
    } catch (e) {
      Alert.alert("Setup failed", e.message || "Try again");
    } finally {
      setSetupBusy(false);
    }
  };

  const openPicker = (lineIdx) => {
    setPickerLineIdx(lineIdx);
    setAccountFilter("");
    setPickerOpen(true);
  };

  const pickAccount = (acc) => {
    setJournalForm((f) => ({
      ...f,
      lines: f.lines.map((l, i) => (i === pickerLineIdx ? { ...l, account_id: acc.id } : l)),
    }));
    setPickerOpen(false);
  };

  const totalDebit = journalForm.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = journalForm.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const submitJournal = async () => {
    if (!balanced) {
      Alert.alert("Journal", "Debits must equal credits and be non-zero.");
      return;
    }
    const lines = journalForm.lines
      .filter((l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map((l) => ({
        account_id: l.account_id,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        narration: l.narration || "",
      }));
    try {
      await postAccountingJournal({
        entry_date: journalForm.entry_date,
        narration: journalForm.narration,
        lines,
        entry_type: "manual",
      });
      setShowJournal(false);
      setJournalForm({
        entry_date: todayIso(),
        narration: "",
        lines: [
          { account_id: "", debit: "", credit: "", narration: "" },
          { account_id: "", debit: "", credit: "", narration: "" },
        ],
      });
      await loadJournal();
      await loadTrial();
      Alert.alert("Journal", "Entry posted.");
    } catch (e) {
      Alert.alert("Journal", e.message || "Failed");
    }
  };

  const confirmDeleteJournal = (id) => {
    Alert.alert("Delete entry?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAccountingJournal(id);
            await loadJournal();
          } catch (e) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const closePeriod = () => {
    Alert.alert(
      "Close period",
      `Close ${startDate} to ${endDate}? Net P&L moves to Retained Earnings.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close",
          onPress: async () => {
            try {
              await postAccountingClosePeriod(startDate, endDate);
              await loadBS();
              await loadTrial();
              Alert.alert("Done", "Period close completed.");
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  const filteredAccounts = useMemo(() => {
    const q = accountFilter.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        String(a.code || "").toLowerCase().includes(q) ||
        String(a.name || "").toLowerCase().includes(q)
    );
  }, [accounts, accountFilter]);

  const accountLabel = (id) => {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} · ${a.name}` : "Select account…";
  };

  if (loading && !isSetup) {
    return <LoadingCenter label="Loading accounting…" />;
  }

  if (!isSetup && !loading) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: T.screenBg }} contentContainerStyle={S.scrollContent}>
        <HeroBand eyebrow="LEDGER">
          <PageHeader
            title="Accounting"
            subtitle="Initialize chart of accounts to match the web app (Indian standard COA)."
          />
        </HeroBand>
        <ContentPanel>
          <Text style={{ color: T.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
            Set up once. After that you get Chart of Accounts, journal, trial balance, P&amp;L, balance sheet, and cash
            flow — same modules as the website.
          </Text>
          <PrimaryButton title={setupBusy ? "Setting up…" : "Initialize chart of accounts"} onPress={setupCOA} disabled={setupBusy} />
        </ContentPanel>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.screenBg }}>
      <ScrollView
        contentContainerStyle={[S.scrollContent, { paddingBottom: 48 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.gold} />}
      >
        <HeroBand eyebrow="LEDGER">
          <PageHeader title="Accounting" subtitle="Double-entry · same tabs as web" />
        </HeroBand>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabScroll}>
          {TABS.map((tab) => {
            const on = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[st.tabChip, on && st.tabChipOn]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.85}
              >
                <Text style={[st.tabChipText, on && st.tabChipTextOn]} numberOfLines={1}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeTab === "Chart of Accounts" && (
          <View>
            {ACCOUNT_TYPES.map((type) => {
              const list = accounts.filter((a) => a.account_type === type);
              if (!list.length) return null;
              return (
                <View key={type} style={[st.cardBlock, { marginBottom: 14 }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ color: typeColor(T, type), fontWeight: "800", fontSize: 15, textTransform: "capitalize" }}>
                      {type}s
                    </Text>
                    <Text style={{ color: T.textMuted, fontSize: 12 }}>{list.length} accounts</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
                    <View style={{ minWidth: st.ledgerCoaMinWidth }}>
                      <View style={st.tbHead}>
                        <Text style={st.tbThCode}>Code</Text>
                        <Text style={st.tbThName}>Name</Text>
                        <Text style={st.tbThAmt}>Balance</Text>
                      </View>
                      {list.map((acc) => (
                        <View key={acc.id} style={st.tbRow}>
                          <Text style={st.tbCode}>{acc.code}</Text>
                          <View style={st.ledgerNameCell}>
                            <Text style={[st.tbName, { minWidth: 0 }]} numberOfLines={2}>
                              {acc.name}
                              {acc.is_system ? <Text style={{ color: T.textMuted, fontSize: 10 }}> SYS</Text> : null}
                            </Text>
                            <Text style={{ color: T.textMuted, fontSize: 10, marginTop: 2 }}>
                              {(acc.account_group || "").replace(/_/g, " ")}
                            </Text>
                          </View>
                          <Text
                            style={[
                              st.tbAmtBase,
                              {
                                fontSize: 13,
                                fontWeight: "700",
                                color: acc.current_balance > 0 ? typeColor(T, type) : T.textMuted,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {fmtInrDec(acc.current_balance)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === "Journal Entries" && (
          <View>
            {!isCA && (
              <View style={{ marginBottom: 12 }}>
                <PrimaryButton title="+ New journal entry" onPress={() => setShowJournal(true)} />
              </View>
            )}
            {journal.length === 0 ? (
              <EmptyState message="No journal entries yet" />
            ) : (
              journal.map((entry) => (
                <View key={entry.id} style={st.journalCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: T.gold, fontWeight: "800", fontSize: 13 }}>{entry.entry_number}</Text>
                    <Text style={{ color: T.textMuted, fontSize: 12 }}>{entry.entry_date}</Text>
                  </View>
                  <Text style={{ color: T.textMuted, fontSize: 11, marginTop: 4, textTransform: "capitalize" }}>
                    {entry.entry_type}
                  </Text>
                  <Text style={{ color: T.textSecondary, fontSize: 13, marginTop: 6 }} numberOfLines={3}>
                    {entry.narration || "—"}
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                    <Text style={{ color: T.sapphire, fontWeight: "700" }}>Dr {fmtInrDec(entry.total_debit)}</Text>
                    <Text style={{ color: T.rose, fontWeight: "700" }}>Cr {fmtInrDec(entry.total_credit)}</Text>
                  </View>
                  {entry.lines?.length > 0 && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border }}>
                      {entry.lines.map((ln, i) => (
                        <Text key={i} style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>
                          {ln.account_code} {ln.debit > 0 ? `Dr ${fmtInrDec(ln.debit)}` : `Cr ${fmtInrDec(ln.credit)}`}
                        </Text>
                      ))}
                    </View>
                  )}
                  {entry.entry_type === "manual" && !isCA && (
                    <TouchableOpacity onPress={() => confirmDeleteJournal(entry.id)} style={{ marginTop: 10 }}>
                      <Text style={{ color: T.rose, fontSize: 12, fontWeight: "700" }}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "Trial Balance" && !trialBalance && (
          <Text style={{ color: T.textMuted, paddingVertical: 20 }}>Loading trial balance…</Text>
        )}

        {activeTab === "Trial Balance" && trialBalance && (
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={st.sectionTitle}>Trial balance</Text>
              <StatusPill text={trialBalance.is_balanced ? "Balanced" : "Check"} variant={trialBalance.is_balanced ? "success" : "warning"} />
            </View>
            <Text style={{ color: T.textMuted, fontSize: 12, marginBottom: 10 }}>As of {trialBalance.as_of_date || "—"}</Text>
            <View style={st.cardBlock}>
              <ScrollView horizontal showsHorizontalScrollIndicator style={st.ledgerTable} nestedScrollEnabled>
                <View style={{ minWidth: st.ledgerMinWidth }}>
                  <View style={st.tbHead}>
                    <Text style={st.tbThCode}>Code</Text>
                    <Text style={st.tbThName}>Account</Text>
                    <Text style={st.tbThAmt}>Dr</Text>
                    <Text style={st.tbThAmt}>Cr</Text>
                  </View>
                  {(trialBalance.rows || []).map((row, i) => (
                    <View key={i} style={[st.tbRow, i === (trialBalance.rows || []).length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={st.tbCode}>{row.code}</Text>
                      <Text style={st.tbName} numberOfLines={2}>
                        {row.name}
                      </Text>
                      <Text
                        style={[st.tbAmtBase, { color: T.sapphire, fontSize: 12, fontWeight: "600" }]}
                        numberOfLines={1}
                      >
                        {row.debit > 0 ? fmtInrDec(row.debit) : "—"}
                      </Text>
                      <Text
                        style={[st.tbAmtBase, { color: T.rose, fontSize: 12, fontWeight: "600" }]}
                        numberOfLines={1}
                      >
                        {row.credit > 0 ? fmtInrDec(row.credit) : "—"}
                      </Text>
                    </View>
                  ))}
                  <View style={st.tbFooter}>
                    <View style={{ width: st.ledgerCodeW }} />
                    <Text style={[st.tbName, { fontWeight: "800", fontSize: 14, color: T.textPrimary }]} numberOfLines={1}>
                      TOTAL
                    </Text>
                    <Text
                      style={[st.tbAmtBase, { color: T.sapphire, fontSize: 13, fontWeight: "800" }]}
                      numberOfLines={1}
                    >
                      {fmtInrDec(trialBalance.total_debit)}
                    </Text>
                    <Text
                      style={[st.tbAmtBase, { color: T.rose, fontSize: 13, fontWeight: "800" }]}
                      numberOfLines={1}
                    >
                      {fmtInrDec(trialBalance.total_credit)}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {activeTab === "P&L" && (
          <View>
            <Text style={st.label}>Start / end (YYYY-MM-DD)</Text>
            <TextInput style={st.input} value={startDate} onChangeText={setStartDate} placeholder="2026-03-01" />
            <TextInput style={st.input} value={endDate} onChangeText={setEndDate} placeholder="2026-03-31" />
            <SecondaryButton title="Generate P&L" onPress={loadPL} />
            {pl && (
              <View style={{ marginTop: 16 }}>
                <View style={[st.cardBlock, { borderLeftWidth: 3, borderLeftColor: T.emerald }]}>
                  <Text style={{ color: T.textPrimary, fontWeight: "800", marginBottom: 10 }}>Income</Text>
                  {(pl.income?.items || []).map((item, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ color: T.textSecondary, flex: 1, paddingRight: 8 }}>{item.name}</Text>
                      <Text style={{ color: T.emerald, fontWeight: "700" }}>{fmtInrDec(item.amount)}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border }}>
                    <Text style={{ fontWeight: "800", color: T.textPrimary }}>Total income</Text>
                    <Text style={{ fontWeight: "800", color: T.emerald }}>{fmtInrDec(pl.income?.total)}</Text>
                  </View>
                </View>
                <View style={[st.cardBlock, { borderLeftWidth: 3, borderLeftColor: T.rose }]}>
                  <Text style={{ color: T.textPrimary, fontWeight: "800", marginBottom: 10 }}>Expenses &amp; COGS</Text>
                  <Text style={{ color: T.textMuted, fontSize: 11, marginBottom: 6 }}>Cost of goods sold</Text>
                  {(pl.cogs?.items || []).map((item, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ color: T.textMuted, fontSize: 12, flex: 1 }}>{item.name}</Text>
                      <Text style={{ color: T.textSecondary, fontSize: 12 }}>{fmtInrDec(item.amount)}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 10 }}>
                    <Text style={{ fontWeight: "700", color: T.textPrimary }}>Gross profit</Text>
                    <Text style={{ fontWeight: "800", color: pl.gross_profit >= 0 ? T.emerald : T.rose }}>
                      {fmtInrDec(pl.gross_profit)}
                    </Text>
                  </View>
                  {(pl.operating_expenses?.items || []).map((item, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ color: T.textSecondary, flex: 1 }}>{item.name}</Text>
                      <Text style={{ color: T.rose, fontSize: 13 }}>{fmtInrDec(item.amount)}</Text>
                    </View>
                  ))}
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border }}>
                    <Text style={{ fontWeight: "800", fontSize: 17, color: T.textPrimary }}>
                      Net {pl.net_profit >= 0 ? "profit" : "loss"}{" "}
                      <Text style={{ fontSize: 12, color: T.textMuted, fontWeight: "600" }}>({pl.net_profit_margin ?? 0}%)</Text>
                    </Text>
                    <Text style={{ fontWeight: "800", fontSize: 20, color: pl.net_profit >= 0 ? T.emerald : T.rose, marginTop: 6 }}>
                      {fmtInrDec(pl.net_profit)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === "Balance Sheet" && (
          <View>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton title="Refresh" onPress={loadBS} />
              </View>
              {!isCA && (
                <View style={{ flex: 1 }}>
                  <PrimaryButton title={`Close (${startDate.slice(0, 7)})`} onPress={closePeriod} />
                </View>
              )}
            </View>
            {balanceSheet && (
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  <StatusPill
                    text={balanceSheet.is_balanced ? "A = L + E" : "Check balance"}
                    variant={balanceSheet.is_balanced ? "success" : "warning"}
                  />
                </View>
                <View style={[st.cardBlock, { borderLeftWidth: 3, borderLeftColor: T.sapphire }]}>
                  <Text style={{ color: T.sapphire, fontWeight: "800", marginBottom: 10 }}>Assets</Text>
                  {["bank_cash", "current", "fixed"].map((k) => {
                    const items = balanceSheet.assets?.[k] || [];
                    if (!items.length) return null;
                    return (
                      <View key={k} style={{ marginBottom: 10 }}>
                        <Text style={{ color: T.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "capitalize" }}>
                          {k.replace(/_/g, " ")}
                        </Text>
                        {items.map((item, i) => (
                          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                            <Text style={{ color: T.textSecondary, flex: 1, paddingRight: 8 }}>{item.name}</Text>
                            <Text style={{ color: T.sapphire, fontWeight: "600" }}>{fmtInrDec(item.balance)}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border }}>
                    <Text style={{ fontWeight: "800", color: T.textPrimary }}>Total assets</Text>
                    <Text style={{ fontWeight: "800", color: T.sapphire, fontSize: 16 }}>{fmtInrDec(balanceSheet.total_assets)}</Text>
                  </View>
                </View>

                <View style={[st.cardBlock, { borderLeftWidth: 3, borderLeftColor: T.rose }]}>
                  <Text style={{ color: T.rose, fontWeight: "800", marginBottom: 10 }}>Liabilities</Text>
                  {["current", "long_term"].map((k) => {
                    const items = balanceSheet.liabilities?.[k] || [];
                    if (!items.length) return null;
                    return (
                      <View key={k} style={{ marginBottom: 10 }}>
                        <Text style={{ color: T.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "capitalize" }}>
                          {k.replace(/_/g, " ")}
                        </Text>
                        {items.map((item, i) => (
                          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                            <Text style={{ color: T.textSecondary, flex: 1 }}>{item.name}</Text>
                            <Text style={{ color: T.rose, fontWeight: "600" }}>{fmtInrDec(item.balance)}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border }}>
                    <Text style={{ fontWeight: "800" }}>Total liabilities</Text>
                    <Text style={{ fontWeight: "800", color: T.rose }}>{fmtInrDec(balanceSheet.total_liabilities)}</Text>
                  </View>
                </View>

                <View style={[st.cardBlock, { borderLeftWidth: 3, borderLeftColor: "#A855F7" }]}>
                  <Text style={{ color: "#A855F7", fontWeight: "800", marginBottom: 10 }}>Equity</Text>
                  {(balanceSheet.equity || []).map((item, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ color: T.textSecondary, flex: 1 }}>{item.name}</Text>
                      <Text style={{ color: "#A855F7", fontWeight: "600" }}>{fmtInrDec(item.balance)}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border }}>
                    <Text style={{ fontWeight: "800" }}>Total equity</Text>
                    <Text style={{ fontWeight: "800", color: "#A855F7" }}>{fmtInrDec(balanceSheet.total_equity)}</Text>
                  </View>
                </View>

                <View style={[st.cardBlock, { borderColor: T.gold, backgroundColor: T.mode === "light" ? "rgba(194,142,14,0.08)" : "rgba(212,175,55,0.08)" }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontWeight: "800", color: T.textPrimary }}>Total L + E</Text>
                    <Text style={{ fontWeight: "800", color: T.gold, fontSize: 17 }}>{fmtInrDec(balanceSheet.total_liabilities_equity)}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === "Cash Flow" && (
          <View>
            <Text style={st.label}>Period (YYYY-MM-DD)</Text>
            <TextInput style={st.input} value={startDate} onChangeText={setStartDate} />
            <TextInput style={st.input} value={endDate} onChangeText={setEndDate} />
            <SecondaryButton title="Generate cash flow" onPress={loadCF} />
            {cashFlow && (
              <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {[
                  { label: "Opening", value: cashFlow.opening_balance, c: T.textSecondary },
                  { label: "Inflows", value: cashFlow.total_inflows, c: T.emerald },
                  { label: "Outflows", value: cashFlow.total_outflows, c: T.rose },
                  {
                    label: "Closing",
                    value: cashFlow.closing_balance,
                    c: cashFlow.closing_balance >= 0 ? T.gold : T.rose,
                  },
                ].map((x) => (
                  <View key={x.label} style={[st.cardBlock, { width: "47%", minWidth: 140 }]}>
                    <Text style={{ color: T.textMuted, fontSize: 11 }}>{x.label}</Text>
                    <Text style={{ color: x.c, fontWeight: "800", fontSize: 16, marginTop: 6 }}>{fmtInrDec(x.value)}</Text>
                  </View>
                ))}
                <View style={[st.cardBlock, { width: "100%" }]}>
                  <Text style={{ color: T.textMuted, fontSize: 12 }}>Net cash flow</Text>
                  <Text
                    style={{
                      fontWeight: "800",
                      fontSize: 22,
                      marginTop: 8,
                      color: cashFlow.net_cash_flow >= 0 ? T.emerald : T.rose,
                    }}
                  >
                    {fmtInrDec(cashFlow.net_cash_flow)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showJournal} animationType="slide" transparent onRequestClose={() => setShowJournal(false)}>
        <View style={st.modalBackdrop}>
          <View style={st.modalSheet}>
            <Text style={{ color: T.textPrimary, fontWeight: "800", fontSize: 18, marginBottom: 12 }}>New journal entry</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
              <Text style={st.label}>Date (YYYY-MM-DD)</Text>
              <TextInput style={st.input} value={journalForm.entry_date} onChangeText={(v) => setJournalForm((f) => ({ ...f, entry_date: v }))} />
              <Text style={st.label}>Narration</Text>
              <TextInput
                style={st.input}
                value={journalForm.narration}
                onChangeText={(v) => setJournalForm((f) => ({ ...f, narration: v }))}
                placeholder="Description"
                placeholderTextColor={T.textMuted}
              />
              {journalForm.lines.map((line, idx) => (
                <View key={idx} style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.border }}>
                  <Text style={st.label}>Line {idx + 1}</Text>
                  <TouchableOpacity style={[st.input, { justifyContent: "center" }]} onPress={() => openPicker(idx)}>
                    <Text style={{ color: line.account_id ? T.textPrimary : T.textMuted }} numberOfLines={2}>
                      {accountLabel(line.account_id)}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.label}>Debit</Text>
                      <TextInput
                        style={st.input}
                        keyboardType="decimal-pad"
                        value={line.debit}
                        onChangeText={(v) =>
                          setJournalForm((f) => ({
                            ...f,
                            lines: f.lines.map((l, i) => (i === idx ? { ...l, debit: v } : l)),
                          }))
                        }
                        placeholder="0"
                        placeholderTextColor={T.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.label}>Credit</Text>
                      <TextInput
                        style={st.input}
                        keyboardType="decimal-pad"
                        value={line.credit}
                        onChangeText={(v) =>
                          setJournalForm((f) => ({
                            ...f,
                            lines: f.lines.map((l, i) => (i === idx ? { ...l, credit: v } : l)),
                          }))
                        }
                        placeholder="0"
                        placeholderTextColor={T.textMuted}
                      />
                    </View>
                  </View>
                </View>
              ))}
              <SecondaryButton
                title="+ Add line"
                onPress={() =>
                  setJournalForm((f) => ({
                    ...f,
                    lines: [...f.lines, { account_id: "", debit: "", credit: "", narration: "" }],
                  }))
                }
              />
              <View style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: T.mode === "light" ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.05)" }}>
                <Text style={{ color: T.textSecondary, fontSize: 13 }}>
                  Dr {fmtInrDec(totalDebit)} · Cr {fmtInrDec(totalCredit)} · Diff {fmtInrDec(Math.abs(totalDebit - totalCredit))}
                </Text>
                <Text style={{ color: balanced ? T.emerald : T.goldMuted, fontSize: 12, marginTop: 6, fontWeight: "700" }}>
                  {balanced ? "Balanced — ready to post" : "Enter matching debits & credits"}
                </Text>
              </View>
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton title="Cancel" onPress={() => setShowJournal(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Post" onPress={submitJournal} disabled={!balanced} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={pickerOpen} animationType="fade" transparent onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={st.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={[st.modalSheet, { maxHeight: "75%" }]} onStartShouldSetResponder={() => true}>
            <Text style={{ color: T.textPrimary, fontWeight: "800", marginBottom: 10 }}>Choose account</Text>
            <TextInput
              style={st.input}
              value={accountFilter}
              onChangeText={setAccountFilter}
              placeholder="Search code or name"
              placeholderTextColor={T.textMuted}
            />
            <FlatList
              data={filteredAccounts}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={st.pickerRow} onPress={() => pickAccount(item)}>
                  <Text style={{ color: T.textPrimary, fontWeight: "700" }}>
                    {item.code} — {item.name}
                  </Text>
                  <Text style={{ color: T.textMuted, fontSize: 11, marginTop: 4, textTransform: "capitalize" }}>{item.account_type}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: T.textMuted, padding: 16 }}>No accounts</Text>}
            />
            <SecondaryButton title="Close" onPress={() => setPickerOpen(false)} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
