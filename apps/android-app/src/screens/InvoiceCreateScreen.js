import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { getCustomers, getProducts, postInvoice } from "../api";
import { useAuth } from "../context/AuthContext";
import { getInvoiceDraftById, removeInvoiceDraft, upsertInvoiceDraft } from "../lib/localInvoiceDrafts";
import { ContentPanel, HeroBand, PageHeader, PrimaryButton, SecondaryButton } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const PARTY_GSTIN_RE = /^[A-Z0-9]{15}$/;
function normalizePartyGstin(s) {
  return (s || "").trim().toUpperCase();
}

function hasAndroidInvoiceAnyData(s) {
  if (!s) return false;
  if ((s.clientName || "").trim()) return true;
  if ((s.clientPhone || "").trim()) return true;
  if ((s.clientEmail || "").trim()) return true;
  if ((s.clientAddress || "").trim()) return true;
  if ((s.clientGstin || "").trim()) return true;
  if ((s.notes || "").trim()) return true;
  if ((s.buyerState || "").trim()) return true;
  if (Number(s.taxRate || 0) > 0 || Number(s.discountAmount || 0) > 0) return true;
  if ((s.customFields || []).some((cf) => (cf?.label || "").trim() || (cf?.value || "").trim())) return true;
  return (s.items || []).some((it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unit_price) || 0;
    const disc = s.showItemDiscount ? Number(it.item_discount) || 0 : 0;
    return (
      (it.description || "").trim() ||
      qty > 0 ||
      price > 0 ||
      disc > 0 ||
      qty * price - disc > 0
    );
  });
}

function canSaveAndroidInvoiceDraft(s) {
  if (!s || !(s.clientName || "").trim()) return false;
  return (s.items || []).some((it) => {
    if (!(it.description || "").trim()) return false;
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unit_price) || 0;
    const disc = s.showItemDiscount ? Number(it.item_discount) || 0 : 0;
    return qty * price - disc > 0;
  });
}

async function saveDraftFromSnapshot(s, businessId) {
  const id = s.linkingDraftId || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const items = s.items || [];
  let subtotal = 0;
  for (const it of items) {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unit_price) || 0;
    const disc = s.showItemDiscount ? Number(it.item_discount) || 0 : 0;
    subtotal += qty * price - disc;
  }
  const tr = Number(s.taxRate) || 0;
  const taxAmount = subtotal * (tr / 100);
  const totalAmount = subtotal + taxAmount - (Number(s.discountAmount) || 0);
  const suffix = id.slice(-4).toUpperCase();
  const gst = normalizePartyGstin(s.clientGstin || "").replace(/[^A-Z0-9]/g, "").slice(0, 15);
  await upsertInvoiceDraft(businessId, {
    id,
    invoice_number: `DRAFT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${suffix}`,
    client_name: s.clientName.trim(),
    client_phone: s.clientPhone || "",
    client_email: s.clientEmail || "",
    client_address: s.clientAddress || "",
    client_gstin: PARTY_GSTIN_RE.test(gst) ? gst : "",
    buyer_state: s.buyerState || "",
    issue_date: s.issueDate,
    due_date: s.dueDate,
    tax_rate: tr,
    discount_amount: Number(s.discountAmount) || 0,
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    notes: s.notes || "",
    items: items.map((it) => ({ ...it })),
    custom_fields: s.showCustomFields
      ? (s.customFields || []).filter((f) => (f.label || "").trim() && (f.value || "").trim())
      : [],
  });
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

function matchIndianStateAndroid(raw) {
  const t = (raw || "").trim();
  if (!t) return "";
  const m = INDIAN_STATES.find((s) => s.toLowerCase() === t.toLowerCase());
  return m || t;
}

function customerAutocompleteLine(c) {
  const city =
    c.city ||
    c.state ||
    (() => {
      const addr = (c.address || "").toString().trim();
      if (!addr) return "—";
      const first = addr.split(",")[0].trim();
      return first.slice(0, 40) || "—";
    })();
  return [c.name || "—", c.phone || "—", city].join(" • ");
}

export default function InvoiceCreateScreen({ navigation }) {
  const route = useRoute();
  const { business } = useAuth();
  const [linkingDraftId, setLinkingDraftId] = useState(null);

  const [saving, setSaving] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [buyerState, setBuyerState] = useState("");

  const [issueDate, setIssueDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(todayStr());
  const [taxRate, setTaxRate] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");

  // Web-like optional sections
  const [showHSN, setShowHSN] = useState(false);
  const [showItemDiscount, setShowItemDiscount] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);

  const [customFields, setCustomFields] = useState([]); // [{label,value}]

  const emptyItem = useMemo(
    () => ({
      product_id: null,
      description: "",
      hsn_code: "",
      quantity: "1",
      unit_price: "",
      item_discount: "0",
      available_stock: null,
      minimum_stock: null,
    }),
    []
  );

  const [items, setItems] = useState([emptyItem]);

  const [customerResults, setCustomerResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerSuggestClosed, setCustomerSuggestClosed] = useState(false);
  const clientNameBlurTimer = useRef(null);
  const [productResults, setProductResults] = useState([]);
  const [activeProductRow, setActiveProductRow] = useState(null);
  const [productQuery, setProductQuery] = useState("");

  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);

  const snapshotRef = useRef({});
  snapshotRef.current = {
    clientName,
    clientPhone,
    clientEmail,
    clientAddress,
    clientGstin,
    buyerState,
    issueDate,
    dueDate,
    taxRate,
    discountAmount,
    notes,
    items,
    customFields,
    showItemDiscount,
    showCustomFields,
    linkingDraftId,
    saving,
  };

  useEffect(() => {
    const draftId = route.params?.draftId;
    const bid = business?.id;
    if (!draftId || !bid) return;
    let cancelled = false;
    (async () => {
      const d = await getInvoiceDraftById(bid, draftId);
      if (cancelled || !d) return;
      setLinkingDraftId(d.id);
      setClientName(d.client_name || "");
      setClientPhone(d.client_phone || "");
      setClientEmail(d.client_email || "");
      setClientAddress(d.client_address || "");
      setClientGstin((d.client_gstin || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15));
      setBuyerState(d.buyer_state || "");
      setIssueDate(d.issue_date || todayStr());
      setDueDate(d.due_date || todayStr());
      setTaxRate(String(d.tax_rate ?? 0));
      setDiscountAmount(String(d.discount_amount ?? 0));
      setNotes(d.notes || "");
      const rawItems = Array.isArray(d.items) && d.items.length ? d.items : null;
      if (rawItems) {
        setItems(
          rawItems.map((it) => ({
            product_id: it.product_id || null,
            description: it.description || "",
            hsn_code: it.hsn_code || "",
            quantity: String(it.quantity ?? 1),
            unit_price: String(it.unit_price ?? ""),
            item_discount: String(it.item_discount ?? 0),
            available_stock: it.available_stock ?? null,
            minimum_stock: it.minimum_stock ?? null,
          }))
        );
      }
      if (Array.isArray(d.custom_fields) && d.custom_fields.length) {
        setShowCustomFields(true);
        setCustomFields(d.custom_fields.map((x) => ({ label: x.label || "", value: x.value || "" })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params?.draftId, business?.id]);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      const s = snapshotRef.current;
      if (s.saving) return;
      if (!hasAndroidInvoiceAnyData(s)) return;
      e.preventDefault();
      const bid = business?.id;
      Alert.alert("Save as draft or discard?", "Your invoice isn't finished.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            if (bid && s.linkingDraftId) removeInvoiceDraft(bid, s.linkingDraftId);
            navigation.dispatch(e.data.action);
          },
        },
        {
          text: "Save draft",
          onPress: async () => {
            if (!canSaveAndroidInvoiceDraft(s)) {
              Alert.alert(
                "Draft",
                "Add client name and at least one line item with description and amount greater than 0."
              );
              return;
            }
            if (!bid) {
              navigation.dispatch(e.data.action);
              return;
            }
            try {
              await saveDraftFromSnapshot(s, bid);
            } catch {
              Alert.alert("Draft", "Could not save draft.");
              return;
            }
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
  }, [navigation, business?.id]);

  const discardViaX = useCallback(async () => {
    if (saving) return;
    const bid = business?.id;
    if (bid && linkingDraftId) await removeInvoiceDraft(bid, linkingDraftId);
    navigation.goBack();
  }, [saving, business?.id, linkingDraftId, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={discardViaX}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={{ color: T.rose, fontSize: 20, fontWeight: "900" }}>✕</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, discardViaX]);

  const subtotal = useMemo(() => {
    return items.reduce((s, it) => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unit_price) || 0;
      const disc = Number(it.item_discount) || 0;
      return s + qty * price - disc;
    }, 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    const tr = Number(taxRate) || 0;
    return subtotal * (tr / 100);
  }, [taxRate, subtotal]);

  const totalAmount = useMemo(() => {
    return subtotal + taxAmount - (Number(discountAmount) || 0);
  }, [subtotal, taxAmount, discountAmount]);

  // GET /finance/customers?search= — same as web Create Invoice
  useEffect(() => {
    const q = clientName.trim();
    if (!q || q.length < 2) {
      setCustomerResults([]);
      setCustomerSearchLoading(false);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const data = await getCustomers({ search: q, limit: "15", page: "1" });
        if (cancelled) return;
        setCustomerResults(data.customers || []);
      } catch {
        if (!cancelled) setCustomerResults([]);
      } finally {
        if (!cancelled) setCustomerSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [clientName]);

  const dismissCustomerSuggest = () => {
    setCustomerResults([]);
    setCustomerSearchLoading(false);
  };

  const applyCustomer = (c) => {
    if (clientNameBlurTimer.current) clearTimeout(clientNameBlurTimer.current);
    setClientName(c.name || "");
    setClientPhone((c.phone || "").toString());
    setClientEmail((c.email || "").toString());
    setClientAddress(typeof c.address === "string" ? c.address : c.address ? String(c.address) : "");
    const g = (c.gstin || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    setClientGstin(g);
    setBuyerState(matchIndianStateAndroid((c.state || "").toString()));
    setCustomerSuggestClosed(true);
    dismissCustomerSuggest();
  };

  // Product suggestions for the focused line item
  useEffect(() => {
    if (activeProductRow === null) return;
    const q = productQuery.trim();
    if (!q || q.length < 1) {
      setProductResults([]);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = await getProducts({ search: q, limit: "10", page: "1" });
        if (cancelled) return;
        setProductResults(data.products || []);
      } catch {
        if (!cancelled) setProductResults([]);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [activeProductRow, productQuery]);

  const canSave = useMemo(() => {
    if (!clientName.trim()) return false;
    const validItems = items.filter((it) => it.product_id && Number(it.unit_price) > 0 && Number(it.quantity) > 0);
    return validItems.length > 0;
  }, [clientName, items]);

  const addItem = () => setItems((x) => [...x, emptyItem]);
  const removeItem = (idx) => setItems((x) => x.filter((_, i) => i !== idx));

  const addCustomField = () => setCustomFields((x) => [...x, { label: "", value: "" }]);

  useEffect(() => {
    // Web behavior: if user enables custom fields and nothing exists yet, add one row.
    if (showCustomFields && customFields.length === 0) addCustomField();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCustomFields]);

  useEffect(() => {
    // When turning off per-item discount, keep payload consistent with web by forcing 0.
    if (!showItemDiscount) {
      setItems((arr) => arr.map((it) => ({ ...it, item_discount: "0" })));
    }
  }, [showItemDiscount]);

  const save = async () => {
    if (!canSave) {
      Alert.alert("Invoice", "Select a customer and at least one product line item (with quantity & rate).");
      return;
    }
    const partyGstin = normalizePartyGstin(clientGstin);
    if (partyGstin && !PARTY_GSTIN_RE.test(partyGstin)) {
      Alert.alert("Invoice", "Party GSTIN must be exactly 15 letters or digits.");
      return;
    }
    try {
      setSaving(true);

      const payload = {
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        client_address: clientAddress.trim() || null,
        client_phone: clientPhone.trim() || null,
        ...(partyGstin ? { client_gstin: partyGstin } : {}),
        buyer_state: buyerState.trim() || null,
        place_of_supply: buyerState.trim() || null,
        issue_date: issueDate,
        due_date: dueDate,
        payment_terms: null,
        notes: notes.trim() || null,
        currency: "INR",
        tax_rate: Number(taxRate) || 0,
        discount_amount: Number(discountAmount) || 0,
        custom_fields: showCustomFields
          ? customFields.filter((f) => (f.label || "").trim() && (f.value || "").trim())
          : null,
        items: items
          .filter((it) => it.product_id && Number(it.unit_price) > 0 && Number(it.quantity) > 0)
          .map((it) => ({
            product_id: it.product_id,
            description: it.description.trim(),
            hsn_code: (it.hsn_code || "").trim() ? it.hsn_code.trim() : null,
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            item_discount: showItemDiscount ? Number(it.item_discount) || 0 : 0,
          })),
      };

      const res = await postInvoice(payload);
      const bid = business?.id;
      if (bid && linkingDraftId) await removeInvoiceDraft(bid, linkingDraftId);
      Alert.alert("Invoice", res.message || "Invoice created");
      navigation.replace("InvoiceDetail", { invoiceId: res.id });
    } catch (e) {
      Alert.alert("Invoice", e.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.screenBg }} contentContainerStyle={S.scrollContent}>
      <HeroBand eyebrow="FINANCE">
        <PageHeader title="Create invoice" subtitle="Matched with web invoice form fields" />
      </HeroBand>

      <ContentPanel>
        <Text style={S.muted}>Client</Text>
        <TextInput
          style={S.input}
          placeholder="Client Name * (search)"
          placeholderTextColor={T.textMuted}
          value={clientName}
          onChangeText={(t) => {
            setCustomerSuggestClosed(false);
            setClientName(t);
          }}
          autoCorrect={false}
          onFocus={() => {
            if (clientNameBlurTimer.current) {
              clearTimeout(clientNameBlurTimer.current);
              clientNameBlurTimer.current = null;
            }
            setCustomerSuggestClosed(false);
          }}
          onBlur={() => {
            clientNameBlurTimer.current = setTimeout(() => {
              setCustomerSuggestClosed(true);
              dismissCustomerSuggest();
            }, 200);
          }}
        />

        {clientName.trim().length >= 2 && !customerSuggestClosed ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "rgba(212, 175, 55, 0.45)",
              borderRadius: 14,
              backgroundColor: "#f8f9fa",
              marginTop: -6,
              marginBottom: 10,
              overflow: "hidden",
            }}
          >
            {customerSearchLoading ? (
              <Text style={{ padding: 14, color: "#4b5563", fontSize: 13 }}>Searching…</Text>
            ) : customerResults.length === 0 ? (
              <Text style={{ padding: 14, color: "#6b7280", fontSize: 13 }}>No customers found — continue as manual entry</Text>
            ) : (
              customerResults.slice(0, 15).map((c, idx) => (
                <TouchableOpacity
                  key={c.id ? String(c.id) : `${c.name || ""}-${c.phone || ""}-${idx}`}
                  onPress={() => applyCustomer(c)}
                  activeOpacity={0.75}
                  style={{
                    padding: 12,
                    borderBottomWidth: idx === Math.min(customerResults.length, 15) - 1 ? 0 : 1,
                    borderBottomColor: "rgba(0,0,0,0.08)",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <Text style={{ color: "#111827", fontWeight: "800", fontSize: 13, lineHeight: 18 }}>{customerAutocompleteLine(c)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : null}

        <TextInput style={S.input} placeholder="Client Phone" placeholderTextColor={T.textMuted} value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" />
        <TextInput style={S.input} placeholder="Client Email" placeholderTextColor={T.textMuted} value={clientEmail} onChangeText={setClientEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={S.input} placeholder="Client Address" placeholderTextColor={T.textMuted} value={clientAddress} onChangeText={setClientAddress} />
        <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "700", marginTop: 4 }}>Party GSTIN (Optional)</Text>
        <TextInput
          style={[S.input, { fontFamily: "monospace" }]}
          placeholder="e.g. 27AAPFU0939F1ZV"
          placeholderTextColor={T.textMuted}
          value={clientGstin}
          onChangeText={(v) => setClientGstin(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          maxLength={15}
          autoCapitalize="characters"
        />
      </ContentPanel>

      <ContentPanel>
        <Text style={S.muted}>Dates + Tax</Text>
        <TextInput style={S.input} placeholder="Issue date YYYY-MM-DD" placeholderTextColor={T.textMuted} value={issueDate} onChangeText={setIssueDate} />
        <TextInput style={S.input} placeholder="Due date YYYY-MM-DD" placeholderTextColor={T.textMuted} value={dueDate} onChangeText={setDueDate} />
        <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900", marginTop: -4 }}>Tax Rate (%)</Text>
        <TextInput
          style={S.input}
          placeholder="Tax rate %"
          placeholderTextColor={T.textMuted}
          value={taxRate}
          onChangeText={(v) => setTaxRate(v.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
        />
        <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900", marginTop: -4 }}>Overall Discount (₹)</Text>
        <TextInput
          style={S.input}
          placeholder="Discount amount"
          placeholderTextColor={T.textMuted}
          value={discountAmount}
          onChangeText={(v) => setDiscountAmount(v.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
        />

        <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "700", marginTop: -2 }}>Buyer State (for GST auto-calculation)</Text>
        <TouchableOpacity
          style={[S.input, { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
          activeOpacity={0.9}
          onPress={() => setBuyerDropdownOpen(true)}
        >
          <Text style={{ color: buyerState ? T.textPrimary : T.textMuted, fontWeight: "800" }}>{buyerState || "Select buyer state"}</Text>
          <Text style={{ color: T.textMuted, fontWeight: "900" }}>▼</Text>
        </TouchableOpacity>

        {Number(taxRate) > 0 && buyerState ? (
          <View
            style={{
              marginTop: 10,
              padding: 14,
              borderRadius: 16,
              backgroundColor: "rgba(59,130,246,0.10)",
              borderWidth: 1,
              borderColor: "rgba(59,130,246,0.22)",
            }}
          >
            <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "700" }}>GST Type</Text>
            <Text style={{ color: T.gold, marginTop: 6, fontWeight: "900" }}>Auto-calculated on save</Text>
            <Text style={{ color: T.textMuted, marginTop: 6, fontSize: 11, lineHeight: 15 }}>CGST+SGST or IGST based on states</Text>
          </View>
        ) : null}
      </ContentPanel>

      <ContentPanel>
        <Text style={S.muted}>Optional Columns</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <TouchableOpacity
            style={[stylesPillBase, showHSN ? stylesPillActive : null]}
            onPress={() => setShowHSN((x) => !x)}
            activeOpacity={0.9}
          >
            <Text style={{ color: showHSN ? T.gold : T.textMuted, fontWeight: "900" }}>{showHSN ? "✓" : "+"} HSN/SAC Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[stylesPillBase, showItemDiscount ? stylesPillActive : null]}
            onPress={() => setShowItemDiscount((x) => !x)}
            activeOpacity={0.9}
          >
            <Text style={{ color: showItemDiscount ? T.gold : T.textMuted, fontWeight: "900" }}>{showItemDiscount ? "✓" : "+"} Per-Item Discount</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[stylesPillBase, showCustomFields ? stylesPillActive : null]}
            onPress={() => setShowCustomFields((x) => !x)}
            activeOpacity={0.9}
          >
            <Text style={{ color: showCustomFields ? T.gold : T.textMuted, fontWeight: "900" }}>{showCustomFields ? "✓" : "+"} Custom Fields (Veh No, Job No etc.)</Text>
          </TouchableOpacity>
        </View>

        {showCustomFields ? (
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ color: T.textMuted, fontSize: 12, fontWeight: "900" }}>Custom Fields</Text>
              <TouchableOpacity onPress={addCustomField} activeOpacity={0.9}>
                <Text style={{ color: T.gold, fontWeight: "900" }}>+ Add Field</Text>
              </TouchableOpacity>
            </View>

            {customFields.map((cf, idx) => (
              <View key={idx} style={{ borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 12, marginBottom: 10 }}>
                <TextInput
                  style={S.input}
                  placeholder={`Label (e.g. Veh No)`}
                  placeholderTextColor={T.textMuted}
                  value={cf.label}
                  onChangeText={(v) => setCustomFields((arr) => arr.map((x, i) => (i === idx ? { ...x, label: v } : x)))}
                />
                <TextInput
                  style={S.input}
                  placeholder={`Value (e.g. UK07AX4657)`}
                  placeholderTextColor={T.textMuted}
                  value={cf.value}
                  onChangeText={(v) => setCustomFields((arr) => arr.map((x, i) => (i === idx ? { ...x, value: v } : x)))}
                />
                {customFields.length > 1 ? (
                  <TouchableOpacity
                    style={[S.btnSecondary, { marginTop: 6 }]}
                    onPress={() => setCustomFields((arr) => arr.filter((_, i) => i !== idx))}
                    activeOpacity={0.9}
                  >
                    <Text style={S.btnSecondaryText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ContentPanel>

      <ContentPanel>
        <Text style={S.muted}>Line items *</Text>
        {items.map((it, idx) => {
          const qty = Number(it.quantity) || 0;
          const price = Number(it.unit_price) || 0;
          const lineDisc = showItemDiscount ? Number(it.item_discount) || 0 : 0;
          const lineAmount = qty * price - lineDisc;

          return (
            <View key={idx} style={[S.card, { marginBottom: 10 }]}>
              <TextInput
                style={S.input}
                placeholder="Description (search product)"
                placeholderTextColor={T.textMuted}
                value={it.description}
                onFocus={() => {
                  setActiveProductRow(idx);
                  setProductQuery(it.description);
                }}
                onChangeText={(v) => {
                  setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, description: v } : x)));
                  setActiveProductRow(idx);
                  setProductQuery(v);
                }}
              />

              {it.product_id ? (
                <Text
                  style={{
                    color: Number(it.available_stock) <= 0 ? T.rose : Number(it.available_stock) <= Number(it.minimum_stock || 0) ? T.gold : T.emerald,
                    marginTop: -6,
                    marginBottom: 10,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  {Number(it.available_stock) <= 0
                    ? "Out of stock"
                    : Number(it.available_stock) <= Number(it.minimum_stock || 0)
                      ? `${it.available_stock} low stock`
                      : `${it.available_stock} in stock`}
                </Text>
              ) : null}

              {activeProductRow === idx && productResults.length > 0 ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: T.border,
                    borderRadius: 14,
                    backgroundColor: T.cardBg,
                    marginTop: -6,
                    marginBottom: 10,
                    overflow: "hidden",
                  }}
                >
                  {productResults.slice(0, 5).map((p, pidx) => (
                    <TouchableOpacity
                      key={(p.id || p.name || "") + pidx}
                      onPress={() => {
                        setItems((arr) =>
                          arr.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  product_id: p.id,
                                  description: p.name,
                                  unit_price: String(p.unit_price ?? p.cost_price ?? ""),
                                  hsn_code: p.hsn_code || "",
                                  available_stock: Number(p.current_stock ?? 0),
                                  minimum_stock: Number(p.minimum_stock ?? 0),
                                }
                              : x
                          )
                        );
                      if (p.hsn_code) setShowHSN(true); // Web parity: auto-enable HSN when product has it
                        setActiveProductRow(null);
                        setProductResults([]);
                        setProductQuery("");
                      }}
                      style={{ padding: 12, borderBottomWidth: pidx === 4 ? 0 : 1, borderBottomColor: T.border }}
                    >
                      <Text style={{ color: T.textPrimary, fontWeight: "900" }}>{p.name}</Text>
                      <Text style={{ color: T.textMuted, marginTop: 4, fontWeight: "800", fontSize: 12 }}>
                        Stock {Number(p.current_stock ?? 0)} · Min {Number(p.minimum_stock ?? 0)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {showHSN ? (
                <TextInput
                  style={S.input}
                  placeholder="HSN/SAC Code"
                  placeholderTextColor={T.textMuted}
                  value={it.hsn_code}
                  onChangeText={(v) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, hsn_code: v } : x)))}
                />
              ) : null}

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={S.input}
                    placeholder="Qty"
                    placeholderTextColor={T.textMuted}
                    keyboardType="numeric"
                    value={it.quantity}
                    onChangeText={(v) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, quantity: v.replace(/[^0-9.]/g, "") } : x)))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={S.input}
                    placeholder="Rate"
                    placeholderTextColor={T.textMuted}
                    keyboardType="numeric"
                    value={it.unit_price}
                    onChangeText={(v) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, unit_price: v.replace(/[^0-9.]/g, "") } : x)))}
                  />
                </View>
              </View>

              {showItemDiscount ? (
                <TextInput
                  style={S.input}
                  placeholder="Per-item Discount (₹)"
                  placeholderTextColor={T.textMuted}
                  keyboardType="numeric"
                  value={it.item_discount}
                  onChangeText={(v) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, item_discount: v.replace(/[^0-9.]/g, "") } : x)))}
                />
              ) : null}

              <Text style={{ color: T.gold, marginTop: 4, fontWeight: "900" }}>Amount: ₹{Number.isFinite(lineAmount) ? lineAmount.toFixed(2) : "0.00"}</Text>

              {items.length > 1 ? (
                <TouchableOpacity style={S.btnSecondary} onPress={() => removeItem(idx)} activeOpacity={0.9}>
                  <Text style={S.btnSecondaryText}>Remove item</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
        <SecondaryButton title="Add another item" onPress={addItem} />
      </ContentPanel>

      <ContentPanel>
        <Text style={S.muted}>Totals</Text>
        <View style={{ marginTop: -4 }}>
          <Text style={{ color: T.textMuted, fontSize: 13, fontWeight: "800" }}>Subtotal: ₹{subtotal.toFixed(2)}</Text>
          {Number(taxRate) > 0 ? (
            <Text style={{ color: T.textMuted, fontSize: 13, fontWeight: "800", marginTop: 6 }}>Tax ({Number(taxRate)}%): ₹{taxAmount.toFixed(2)}</Text>
          ) : null}
          {Number(discountAmount) > 0 ? (
            <Text style={{ color: T.rose, fontSize: 13, fontWeight: "900", marginTop: 6 }}>Discount: ₹{Number(discountAmount).toFixed(2)}</Text>
          ) : null}
          <Text style={{ color: T.gold, fontSize: 26, fontWeight: "900", marginTop: 8 }}>Total: ₹{totalAmount.toFixed(2)}</Text>
        </View>

        <TextInput style={S.input} placeholder="Notes (optional)" placeholderTextColor={T.textMuted} value={notes} onChangeText={setNotes} />
      </ContentPanel>

      {/* Buyer State dropdown (web select parity) */}
      <Modal transparent visible={buyerDropdownOpen} animationType="fade" onRequestClose={() => setBuyerDropdownOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
          activeOpacity={1}
          onPress={() => setBuyerDropdownOpen(false)}
        />
        <View style={{ position: "absolute", left: 16, right: 16, top: 140, maxHeight: 420, backgroundColor: T.cardBg, borderRadius: 18, borderWidth: 1, borderColor: T.border, padding: 8 }}>
          <ScrollView>
            <TouchableOpacity
              style={{ padding: 12, borderRadius: 12, backgroundColor: "rgba(212,175,55,0.08)" }}
              onPress={() => {
                setBuyerState("");
                setBuyerDropdownOpen(false);
              }}
            >
              <Text style={{ color: T.textPrimary, fontWeight: "900" }}>Select buyer state</Text>
            </TouchableOpacity>
            {INDIAN_STATES.map((s) => (
              <TouchableOpacity
                key={s}
                style={{ padding: 12, borderTopWidth: 1, borderTopColor: T.border }}
                onPress={() => {
                  setBuyerState(s);
                  setBuyerDropdownOpen(false);
                }}
              >
                <Text style={{ color: buyerState === s ? T.gold : T.textPrimary, fontWeight: buyerState === s ? "900" : "800" }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <PrimaryButton title={saving ? "Creating…" : "Create invoice"} onPress={save} disabled={saving} />
    </ScrollView>
  );
}

const stylesPillBase = {
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: T.border,
  backgroundColor: "rgba(15,23,42,0.03)",
};

const stylesPillActive = {
  backgroundColor: "rgba(212,175,55,0.12)",
  borderColor: "rgba(212,175,55,0.35)",
};

