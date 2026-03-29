import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import {
  deleteSuperAdminBusiness,
  getSuperAdminBusiness,
  postSuperAdminChangePlan,
  postSuperAdminExtendSubscription,
  postSuperAdminResetPassword,
  postSuperAdminSuspendBusiness,
  putSuperAdminBusiness,
} from "../api";
import {
  ContentPanel,
  EmptyState,
  HeroBand,
  KpiTile,
  ListRowCard,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
} from "../components/NexaUi";
import { useAuth } from "../context/AuthContext";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { chunkPairs, fmtInr } from "../utils/format";

const MODULE_LABELS = {
  manage_users: "Manage users",
  hr_payroll: "HR & payroll",
  invoices_finance: "Invoices & finance",
  inventory_billing: "Inventory & billing",
  purchases_itc: "Purchases & ITC",
  gst_reports: "GST reports",
  customer_ledger: "Customer ledger",
  expenses: "Expenses",
  accounting: "Accounting",
  ca_portal: "CA portal",
};

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function parseModules(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function planVariant(plan) {
  const p = String(plan || "").toLowerCase();
  if (p === "enterprise") return "success";
  if (p === "growth") return "default";
  if (p === "starter") return "warning";
  return "default";
}

function statusVariant(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "success";
  if (s === "trial") return "warning";
  if (s === "expired" || s === "suspended" || s === "cancelled") return "danger";
  return "default";
}

function DetailField({ label, value }) {
  const v = value != null && value !== "" ? String(value) : "—";
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable>
        {v}
      </Text>
    </View>
  );
}

export default function SuperAdminBusinessDetailScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const id = params?.id;
  const { startImpersonation, user: authUser } = useAuth();
  const [biz, setBiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [impersonateBusy, setImpersonateBusy] = useState(false);

  const [showExtend, setShowExtend] = useState(false);
  const [extendForm, setExtendForm] = useState(() => ({
    duration_days: 30,
    mode: "add", // "add" | "set_from_today"
    payment_method: "cash",
    amount: 0,
    currency: "INR",
    payment_date: new Date().toISOString().slice(0, 10),
    reference_number: "",
    notes: "",
  }));
  const [extendBusy, setExtendBusy] = useState(false);

  const [showPlan, setShowPlan] = useState(false);
  const [newPlan, setNewPlan] = useState("");
  const [planBusy, setPlanBusy] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  const [resetUser, setResetUser] = useState(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getSuperAdminBusiness(id);
      setBiz(res);
    } catch (e) {
      Alert.alert("Business", e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const payload = biz || {};
  const hasNestedBusiness = payload.business && typeof payload.business === "object";
  const b = hasNestedBusiness ? payload.business : payload;
  const users = payload.users || [];
  const payments = payload.manual_payments || [];
  const history = payload.subscription_history || [];
  const modules = parseModules(b.modules);

  const [editMonthly, setEditMonthly] = useState(() => String(b.monthly_amount ?? 0));
  const [editMaxUsers, setEditMaxUsers] = useState(() => String(b.max_users ?? 5));
  const [editMaxEmp, setEditMaxEmp] = useState(() => String(b.max_employees ?? 10));
  const [editMaxInv, setEditMaxInv] = useState(() => String(b.max_invoices_month ?? 100));
  const [editMaxProd, setEditMaxProd] = useState(() => String(b.max_products ?? 50));
  const [editModules, setEditModules] = useState(() => modules);

  // Keep edit form in sync on load/refresh.
  React.useEffect(() => {
    setEditMonthly(String(b.monthly_amount ?? 0));
    setEditMaxUsers(String(b.max_users ?? 5));
    setEditMaxEmp(String(b.max_employees ?? 10));
    setEditMaxInv(String(b.max_invoices_month ?? 100));
    setEditMaxProd(String(b.max_products ?? 50));
    setEditModules(parseModules(b.modules));
    setNewPlan(String(b.plan || ""));
  }, [b.max_employees, b.max_invoices_month, b.max_products, b.max_users, b.modules, b.monthly_amount, b.plan]);

  const daysLeft = Number(b.days_remaining);
  const daysAccent =
    Number.isFinite(daysLeft) && daysLeft <= 7 ? T.rose : Number.isFinite(daysLeft) && daysLeft <= 14 ? "#F59E0B" : T.emerald;

  const openAsBusiness = useCallback(() => {
    Alert.alert(
      "Open as business owner",
      `You will use the app as the owner of “${b.name || "this business"}”. Your super admin session stays on hold until you exit from the side menu or Profile.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open business",
          async onPress() {
            try {
              setImpersonateBusy(true);
              await startImpersonation(id);
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "BusinessDashboard" }] }));
            } catch (e) {
              Alert.alert("Could not open business", e.message || "Request failed");
            } finally {
              setImpersonateBusy(false);
            }
          },
        },
      ]
    );
  }, [b.name, id, navigation, startImpersonation]);

  const submitExtend = useCallback(async () => {
    try {
      setExtendBusy(true);
      const body = {
        ...extendForm,
        duration_days: Number(extendForm.duration_days) || 30,
        amount: Number(extendForm.amount) || 0,
      };
      const res = await postSuperAdminExtendSubscription(id, body);
      Alert.alert("Subscription", res.message || "Updated");
      setShowExtend(false);
      await load();
    } catch (e) {
      Alert.alert("Subscription", e.message || "Request failed");
    } finally {
      setExtendBusy(false);
    }
  }, [extendForm, id, load]);

  const submitPlan = useCallback(async () => {
    try {
      setPlanBusy(true);
      const res = await postSuperAdminChangePlan(id, String(newPlan || "").trim());
      Alert.alert("Plan", res.message || "Plan updated");
      setShowPlan(false);
      await load();
    } catch (e) {
      Alert.alert("Plan", e.message || "Request failed");
    } finally {
      setPlanBusy(false);
    }
  }, [id, load, newPlan]);

  const toggleModule = useCallback((mod) => {
    setEditModules((cur) => (cur.includes(mod) ? cur.filter((x) => x !== mod) : [...cur, mod]));
  }, []);

  const submitEdit = useCallback(async () => {
    try {
      setEditBusy(true);
      const body = {
        modules: JSON.stringify(editModules),
        monthly_amount: Number(editMonthly) || 0,
        max_users: Number(editMaxUsers) || 5,
        max_employees: Number(editMaxEmp) || 10,
        max_invoices_month: Number(editMaxInv) || 100,
        max_products: Number(editMaxProd) || 50,
      };
      const res = await putSuperAdminBusiness(id, body);
      Alert.alert("Business", res.message || "Saved");
      setShowEdit(false);
      await load();
    } catch (e) {
      Alert.alert("Business", e.message || "Save failed");
    } finally {
      setEditBusy(false);
    }
  }, [editMaxEmp, editMaxInv, editMaxProd, editMaxUsers, editModules, editMonthly, id, load]);

  const confirmSuspend = useCallback(() => {
    Alert.alert("Suspend business", "All users will lose access.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Suspend",
        style: "destructive",
        async onPress() {
          try {
            const res = await postSuperAdminSuspendBusiness(id);
            Alert.alert("Business", res.message || "Suspended");
            await load();
          } catch (e) {
            Alert.alert("Business", e.message || "Request failed");
          }
        },
      },
    ]);
  }, [id, load]);

  const submitResetPassword = useCallback(async () => {
    if (!resetUser?.id) return;
    if (!resetPwd || resetPwd.length < 6) {
      Alert.alert("Reset password", "Password must be at least 6 characters.");
      return;
    }
    try {
      setResetBusy(true);
      const res = await postSuperAdminResetPassword(resetUser.id, resetPwd);
      Alert.alert("Reset password", res.message || "Password reset");
      setResetUser(null);
      setResetPwd("");
      await load();
    } catch (e) {
      Alert.alert("Reset password", e.message || "Request failed");
    } finally {
      setResetBusy(false);
    }
  }, [load, resetPwd, resetUser]);

  const submitDelete = useCallback(async () => {
    const expected = String(b.name || "").trim();
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    if (!expected || deleteName.trim() !== expected) {
      Alert.alert("Delete", `Type the business name exactly to confirm: ${expected || "—"}`);
      return;
    }
    try {
      setDeleteBusy(true);
      const res = await deleteSuperAdminBusiness(id);
      Alert.alert("Deleted", res.message || "Business deleted");
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "SuperAdminBusinesses" }] }));
    } catch (e) {
      Alert.alert("Delete", e.message || "Request failed");
    } finally {
      setDeleteBusy(false);
    }
  }, [CommonActions.reset, b.name, deleteArmed, deleteName, id, navigation]);

  const kpiRows = useMemo(() => {
    const tiles = [
      {
        label: "Days remaining",
        value: Number.isFinite(daysLeft) ? String(Math.max(0, daysLeft)) : "—",
        emoji: "⏳",
        accent: daysAccent,
        valueIsAccent: true,
      },
      {
        label: "Subscription until",
        value: fmtDate(b.subscription_expires_at),
        emoji: "📅",
        accent: T.sapphire,
        valueIsAccent: false,
      },
      {
        label: "Monthly (MRR)",
        value: fmtInr(b.mrr),
        emoji: "₹",
        accent: T.gold,
        valueIsAccent: true,
      },
      {
        label: "Users",
        value: String(users.length),
        emoji: "👥",
        accent: T.textSecondary,
        valueIsAccent: false,
      },
    ];
    return chunkPairs(tiles);
  }, [b.mrr, b.subscription_expires_at, daysLeft, daysAccent, users.length]);

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={S.muted}>Missing business id</Text>
      </View>
    );
  }

  if (loading && !biz) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.gold} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="TENANT">
        <PageHeader title={b.name || "Business"} subtitle={b.email || "—"} />
        <View style={styles.pillRow}>
          {b.plan ? <StatusPill text={String(b.plan)} variant={planVariant(b.plan)} /> : null}
          {b.status ? <StatusPill text={String(b.status)} variant={statusVariant(b.status)} /> : null}
        </View>
      </HeroBand>

      {authUser?.role === "super_admin" && id ? (
        <View style={{ marginBottom: 6 }}>
          <PrimaryButton
            title={impersonateBusy ? "Opening…" : "Open as this business"}
            onPress={openAsBusiness}
            disabled={impersonateBusy}
          />
          <View style={{ height: 10 }} />
          <SecondaryButton title={showExtend ? "Hide subscription" : "Extend / set subscription"} onPress={() => setShowExtend((s) => !s)} />
          <SecondaryButton title={showPlan ? "Hide plan" : "Change plan"} onPress={() => setShowPlan((s) => !s)} />
          <SecondaryButton title={showEdit ? "Hide modules & limits" : "Edit modules, amount & limits"} onPress={() => setShowEdit((s) => !s)} />
          <TouchableOpacity style={styles.dangerBtn} activeOpacity={0.9} onPress={confirmSuspend}>
            <Text style={styles.dangerBtnTx}>Suspend business</Text>
          </TouchableOpacity>

          <ContentPanel style={{ marginTop: 12 }}>
            <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "700" }}>Danger zone</Text>
            <Text style={[S.muted, { marginTop: 8 }]}>Deleting permanently removes the tenant and its users.</Text>
            {deleteArmed ? (
              <>
                <Text style={[S.muted, { marginTop: 10 }]}>Type business name to confirm</Text>
                <TextInput
                  style={S.input}
                  placeholder={b.name || "Business name"}
                  placeholderTextColor={T.textMuted}
                  value={deleteName}
                  onChangeText={setDeleteName}
                />
              </>
            ) : null}
            <TouchableOpacity style={[styles.deleteBtn, deleteBusy && { opacity: 0.55 }]} activeOpacity={0.9} onPress={submitDelete} disabled={deleteBusy}>
              <Text style={styles.deleteBtnTx}>{deleteBusy ? "Deleting…" : deleteArmed ? "Delete permanently" : "Delete business"}</Text>
            </TouchableOpacity>
          </ContentPanel>

          {showExtend ? (
            <ContentPanel style={{ marginTop: 12 }}>
              <Text style={styles.panelTitle}>Adjust subscription</Text>
              <Text style={S.muted}>Mode</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8, marginBottom: 10 }}>
                {[
                  { key: "add", label: "Add to current end" },
                  { key: "set_from_today", label: "Set from today" },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.optPill, extendForm.mode === m.key && styles.optPillOn]}
                    onPress={() => setExtendForm((f) => ({ ...f, mode: m.key }))}
                  >
                    <Text style={[styles.optPillTx, extendForm.mode === m.key && styles.optPillTxOn]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={S.input}
                placeholder="Duration (days)"
                placeholderTextColor={T.textMuted}
                keyboardType="number-pad"
                value={String(extendForm.duration_days)}
                onChangeText={(v) => setExtendForm((f) => ({ ...f, duration_days: v.replace(/[^0-9]/g, "") }))}
              />
              <TextInput
                style={S.input}
                placeholder="Amount (₹)"
                placeholderTextColor={T.textMuted}
                keyboardType="numeric"
                value={String(extendForm.amount)}
                onChangeText={(v) => setExtendForm((f) => ({ ...f, amount: v.replace(/[^0-9.]/g, "") }))}
              />
              <TextInput
                style={S.input}
                placeholder="Payment method (cash|upi|bank_transfer|card)"
                placeholderTextColor={T.textMuted}
                value={String(extendForm.payment_method)}
                onChangeText={(v) => setExtendForm((f) => ({ ...f, payment_method: v }))}
              />
              <TextInput
                style={S.input}
                placeholder="Payment date (YYYY-MM-DD)"
                placeholderTextColor={T.textMuted}
                value={String(extendForm.payment_date)}
                onChangeText={(v) => setExtendForm((f) => ({ ...f, payment_date: v }))}
              />
              <TextInput
                style={S.input}
                placeholder="Reference number (optional)"
                placeholderTextColor={T.textMuted}
                value={String(extendForm.reference_number)}
                onChangeText={(v) => setExtendForm((f) => ({ ...f, reference_number: v }))}
              />
              <TextInput
                style={S.input}
                placeholder="Notes (optional)"
                placeholderTextColor={T.textMuted}
                value={String(extendForm.notes)}
                onChangeText={(v) => setExtendForm((f) => ({ ...f, notes: v }))}
              />
              <PrimaryButton title={extendBusy ? "Saving…" : "Save subscription"} onPress={submitExtend} disabled={extendBusy} />
            </ContentPanel>
          ) : null}

          {showPlan ? (
            <ContentPanel style={{ marginTop: 12 }}>
              <Text style={styles.panelTitle}>Change plan</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {["starter", "growth", "enterprise"].map((p) => (
                  <TouchableOpacity key={p} style={[styles.optPill, newPlan === p && styles.optPillOn]} onPress={() => setNewPlan(p)}>
                    <Text style={[styles.optPillTx, newPlan === p && styles.optPillTxOn]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <PrimaryButton title={planBusy ? "Saving…" : "Save plan"} onPress={submitPlan} disabled={planBusy} />
            </ContentPanel>
          ) : null}

          {showEdit ? (
            <ContentPanel style={{ marginTop: 12 }}>
              <Text style={styles.panelTitle}>Modules, amount & limits</Text>
              <Text style={styles.fieldLabel}>Monthly amount (₹)</Text>
              <TextInput
                style={S.input}
                placeholder="Monthly amount (₹)"
                placeholderTextColor={T.textMuted}
                keyboardType="numeric"
                value={editMonthly}
                onChangeText={(v) => setEditMonthly(v.replace(/[^0-9.]/g, ""))}
              />
              <Text style={styles.fieldLabel}>Max users</Text>
              <TextInput
                style={S.input}
                placeholder="Max users"
                placeholderTextColor={T.textMuted}
                keyboardType="number-pad"
                value={editMaxUsers}
                onChangeText={(v) => setEditMaxUsers(v.replace(/[^0-9]/g, ""))}
              />
              <Text style={styles.fieldLabel}>Max employees</Text>
              <TextInput
                style={S.input}
                placeholder="Max employees"
                placeholderTextColor={T.textMuted}
                keyboardType="number-pad"
                value={editMaxEmp}
                onChangeText={(v) => setEditMaxEmp(v.replace(/[^0-9]/g, ""))}
              />
              <Text style={styles.fieldLabel}>Max invoices / month</Text>
              <TextInput
                style={S.input}
                placeholder="Max invoices / month"
                placeholderTextColor={T.textMuted}
                keyboardType="number-pad"
                value={editMaxInv}
                onChangeText={(v) => setEditMaxInv(v.replace(/[^0-9]/g, ""))}
              />
              <Text style={styles.fieldLabel}>Max products</Text>
              <TextInput
                style={S.input}
                placeholder="Max products"
                placeholderTextColor={T.textMuted}
                keyboardType="number-pad"
                value={editMaxProd}
                onChangeText={(v) => setEditMaxProd(v.replace(/[^0-9]/g, ""))}
              />
              <Text style={[S.muted, { marginTop: 6, marginBottom: 10 }]}>Enabled modules</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {Object.keys(MODULE_LABELS).map((k) => {
                  const on = editModules.includes(k);
                  return (
                    <TouchableOpacity key={k} style={[styles.optPill, on && styles.optPillOn]} onPress={() => toggleModule(k)} activeOpacity={0.9}>
                      <Text style={[styles.optPillTx, on && styles.optPillTxOn]}>{MODULE_LABELS[k]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <PrimaryButton title={editBusy ? "Saving…" : "Save changes"} onPress={submitEdit} disabled={editBusy} />
            </ContentPanel>
          ) : null}

          <Text style={[S.muted, { marginTop: 12, lineHeight: 18 }]}>
            Same as the web controls: Login as, extend subscription, change plan, edit modules/limits, suspend, delete, and reset passwords.
          </Text>
        </View>
      ) : null}

      {kpiRows.map((pair, ri) => (
        <View key={ri} style={styles.kpiRow}>
          {pair.map((t, ti) => (
            <View key={ti} style={styles.kpiCell}>
              <KpiTile
                label={t.label}
                value={t.value}
                emoji={t.emoji}
                accent={t.accent}
                valueIsAccent={t.valueIsAccent !== false}
              />
            </View>
          ))}
        </View>
      ))}

      <Text style={S.sectionTitle}>Contact & business</Text>
      <ContentPanel>
        <View style={styles.detailGrid}>
          <DetailField label="Owner" value={b.owner_name} />
          <DetailField label="Email" value={b.email} />
          <DetailField label="Phone" value={b.phone} />
          <DetailField label="City" value={b.city} />
          <DetailField label="Country" value={b.country} />
          <DetailField label="Payment type" value={b.payment_type} />
          <DetailField label="Created" value={fmtDate(b.created_at)} />
          <DetailField label="Address" value={b.address} />
        </View>
      </ContentPanel>

      <Text style={S.sectionTitle}>Invoice & tax</Text>
      <ContentPanel>
        <View style={styles.detailGrid}>
          <DetailField label="GSTIN" value={b.invoice_gst} />
          <DetailField label="PAN" value={b.invoice_pan} />
        </View>
      </ContentPanel>

      <Text style={S.sectionTitle}>Bank & UPI</Text>
      <ContentPanel>
        <View style={styles.detailGrid}>
          <DetailField label="Bank" value={b.invoice_bank_name} />
          <DetailField label="Account no." value={b.invoice_bank_account} />
          <DetailField label="IFSC" value={b.invoice_bank_ifsc} />
          <DetailField label="UPI VPA" value={b.upi_vpa} />
          <DetailField label="UPI name" value={b.upi_name} />
        </View>
      </ContentPanel>

      <Text style={S.sectionTitle}>Plan limits</Text>
      <ContentPanel>
        <View style={styles.detailGrid}>
          <DetailField label="Monthly amount (₹)" value={b.monthly_amount} />
          <DetailField label="Max users" value={b.max_users} />
          <DetailField label="Max employees" value={b.max_employees} />
          <DetailField label="Max invoices / month" value={b.max_invoices_month} />
          <DetailField label="Max products" value={b.max_products} />
        </View>
      </ContentPanel>

      <Text style={S.sectionTitle}>Enabled modules</Text>
      <ContentPanel>
        {modules.length === 0 ? (
          <Text style={S.muted}>No modules enabled (or not set).</Text>
        ) : (
          <View style={styles.chipWrap}>
            {modules.map((m) => (
              <View key={m} style={S.chip}>
                <Text style={S.chipText}>{MODULE_LABELS[m] || m}</Text>
              </View>
            ))}
          </View>
        )}
      </ContentPanel>

      <Text style={S.sectionTitle}>Users ({users.length})</Text>
      {users.length === 0 ? (
        <EmptyState message="No users linked to this tenant." />
      ) : (
        users.map((u) => (
          <ListRowCard
            key={u.id}
            title={`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "User"}
            subtitle={u.email}
            meta={u.is_active ? "Active" : "Inactive"}
            badge={u.role ? String(u.role).replace(/_/g, " ") : null}
            badgeColor={T.sapphire}
            onPress={() => {
              setResetUser(u);
              setResetPwd("");
            }}
          >
            <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={S.muted}>Tap to reset password</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {u.visible_password ? (
                  <View
                    style={[
                      styles.smallPill,
                      { borderColor: "rgba(212,175,55,0.35)", backgroundColor: "rgba(212,175,55,0.12)" },
                    ]}
                  >
                    <Text style={[styles.smallPillTx, { color: T.gold }]} numberOfLines={1}>
                      {String(u.visible_password).slice(0, 12)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </ListRowCard>
        ))
      )}

      {resetUser ? (
        <ContentPanel style={{ marginTop: 12 }}>
          <Text style={styles.panelTitle}>Reset password</Text>
          <Text style={S.muted}>User: {resetUser.email || resetUser.id}</Text>
          <TextInput
            style={S.input}
            placeholder="New password (min 6 chars)"
            placeholderTextColor={T.textMuted}
            secureTextEntry
            value={resetPwd}
            onChangeText={setResetPwd}
          />
          <PrimaryButton title={resetBusy ? "Resetting…" : "Reset password"} onPress={submitResetPassword} disabled={resetBusy} />
          <SecondaryButton
            title="Cancel"
            onPress={() => {
              setResetUser(null);
              setResetPwd("");
            }}
          />
        </ContentPanel>
      ) : null}

      <Text style={S.sectionTitle}>Manual payments ({payments.length})</Text>
      {payments.length === 0 ? (
        <EmptyState message="No manual subscription payments recorded." />
      ) : (
        payments.map((p) => (
          <ListRowCard
            key={p.id}
            title={fmtInr(p.amount)}
            subtitle={fmtDate(p.payment_date)}
            meta={[p.payment_method, p.duration_days != null ? `${p.duration_days} days` : null, p.reference_number]
              .filter(Boolean)
              .join(" · ")}
            badge={fmtDate(p.new_expiry_date)}
          />
        ))
      )}

      <Text style={S.sectionTitle}>Subscription history</Text>
      {history.length === 0 ? (
        <EmptyState message="No history entries yet." />
      ) : (
        <ContentPanel>
          {history.map((h) => (
            <View key={h.id} style={styles.histRow}>
              <View
                style={[
                  styles.histDot,
                  {
                    backgroundColor:
                      h.action === "extended" || h.action === "created"
                        ? T.emerald
                        : h.action === "suspended" || h.action === "expired"
                          ? T.rose
                          : T.gold,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: T.textPrimary, fontWeight: "700", fontSize: 14, textTransform: "capitalize" }}>
                  {String(h.action || "—").replace(/_/g, " ")}
                </Text>
                {h.notes ? <Text style={S.muted}>{h.notes}</Text> : null}
              </View>
              <Text style={{ color: T.textMuted, fontSize: 11 }}>{fmtDate(h.created_at)}</Text>
            </View>
          ))}
        </ContentPanel>
      )}

      <View style={{ height: 10 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: T.screenBg },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -8 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiCell: { flex: 1 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  detailCell: { width: "48%", marginBottom: 14 },
  detailLabel: { color: T.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.3, marginBottom: 4 },
  detailValue: { color: T.textPrimary, fontSize: 14, lineHeight: 20 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  panelTitle: { color: T.textPrimary, fontWeight: "800", fontSize: 15, marginBottom: 10 },
  fieldLabel: { color: T.textMuted, fontSize: 12, fontWeight: "700", marginTop: 10, marginBottom: 6 },
  optPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    maxWidth: "100%",
  },
  optPillOn: { borderColor: "rgba(212,175,55,0.35)", backgroundColor: "rgba(212,175,55,0.12)" },
  optPillTx: { color: T.textSecondary, fontSize: 12, fontWeight: "700" },
  optPillTxOn: { color: T.gold },
  dangerBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.28)",
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  dangerBtnTx: { color: "#FCD34D", fontWeight: "800", fontSize: 14 },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(244,63,94,0.35)",
    backgroundColor: "rgba(244,63,94,0.1)",
  },
  deleteBtnTx: { color: "#FDA4AF", fontWeight: "900", fontSize: 14 },
  smallPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, maxWidth: 140 },
  smallPillTx: { fontSize: 10, fontWeight: "800" },
  histRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    gap: 10,
  },
  histDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
});
