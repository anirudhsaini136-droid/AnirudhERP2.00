import React, { useCallback, useState } from "react";
import { Alert, FlatList, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getProducts, getPurchases, postPurchaseBill } from "../api";
import { EmptyState, HeroBand, ListRowCard, LoadingCenter, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

export default function PurchasesScreen({ navigation }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState({
    vendor_name: "",
    vendor_phone: "",
    vendor_gstin: "",
    tax_rate: "18",
    items: [{ product_id: null, product_name: "", quantity: "1", unit_price: "" }],
  });

  const load = useCallback(async () => {
    try {
      const data = await getPurchases({ limit: "50" });
      setBills(data.bills || []);
    } catch (e) {
      Alert.alert("Purchases", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openCreate = async () => {
    setShowCreate(true);
    try {
      const data = await getProducts({ limit: "100" });
      setCatalog(data.products || []);
    } catch {
      setCatalog([]);
    }
  };

  const updateItem = (idx, field, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  };

  const addItem = () => {
    setForm((f) => ({ ...f, items: [...f.items, { product_id: null, product_name: "", quantity: "1", unit_price: "" }] }));
  };

  const removeItem = (idx) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const handleCreateBill = async () => {
    if (!form.vendor_name.trim()) {
      Alert.alert("New Purchase Bill", "Vendor name is required.");
      return;
    }
    if (!form.items.length || form.items.some((it) => !it.product_name.trim())) {
      Alert.alert("New Purchase Bill", "Please add at least one item with product.");
      return;
    }
    try {
      setCreating(true);
      await postPurchaseBill({
        vendor_name: form.vendor_name.trim(),
        vendor_phone: form.vendor_phone.trim() || null,
        vendor_gstin: form.vendor_gstin.trim() || null,
        tax_rate: Number(form.tax_rate || 0),
        items: form.items.map((it) => ({
          description: it.product_name.trim(),
          product_id: it.product_id || null,
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
        })),
      });
      setShowCreate(false);
      setForm({
        vendor_name: "",
        vendor_phone: "",
        vendor_gstin: "",
        tax_rate: "18",
        items: [{ product_id: null, product_name: "", quantity: "1", unit_price: "" }],
      });
      await load();
      Alert.alert("Purchases", "Purchase bill created successfully.");
    } catch (e) {
      Alert.alert("New Purchase Bill", e.message || "Failed to create purchase bill");
    } finally {
      setCreating(false);
    }
  };

  if (loading && bills.length === 0) return <LoadingCenter label="Loading bills…" />;

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: T.screenBg }}
        contentContainerStyle={S.scrollContent}
        data={bills}
        keyExtractor={(b) => String(b.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 6 }}>
            <HeroBand eyebrow="PROCUREMENT">
              <PageHeader title="Purchases" subtitle="Vendor bills & ITC trail" />
            </HeroBand>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={openCreate}
              style={{
                alignSelf: "flex-end",
                marginTop: 8,
                backgroundColor: "#d4a017",
                borderRadius: 10,
                alignItems: "center",
                shadowColor: "#d4a017",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: "#000000", fontWeight: "700", fontSize: 15 }}>+ New Purchase Bill</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <ListRowCard
            title={item.bill_number || String(item.id)}
            subtitle={item.vendor_name || "—"}
            meta={fmtInr(item.total_amount)}
            badge={item.status}
            badgeColor={T.gold}
            onPress={() => navigation.navigate("PurchaseDetail", { billId: item.id })}
          />
        )}
        ListEmptyComponent={<EmptyState message="No purchase bills" />}
      />
      <Modal transparent visible={showCreate} animationType="fade" onRequestClose={() => setShowCreate(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowCreate(false)} />
        <View style={[S.card, { margin: 14, maxHeight: "82%" }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ color: T.gold, fontWeight: "900", fontSize: 18, marginBottom: 8 }}>New Purchase Bill</Text>

            <Text style={S.cardLabel}>Vendor name *</Text>
            <TextInput style={S.input} placeholder="Vendor name" placeholderTextColor={T.textMuted} value={form.vendor_name} onChangeText={(v) => setForm((f) => ({ ...f, vendor_name: v }))} />

            <Text style={S.cardLabel}>Phone</Text>
            <TextInput style={S.input} placeholder="Phone" keyboardType="phone-pad" placeholderTextColor={T.textMuted} value={form.vendor_phone} onChangeText={(v) => setForm((f) => ({ ...f, vendor_phone: v }))} />

            <Text style={S.cardLabel}>GSTIN</Text>
            <TextInput style={S.input} placeholder="GSTIN" autoCapitalize="characters" placeholderTextColor={T.textMuted} value={form.vendor_gstin} onChangeText={(v) => setForm((f) => ({ ...f, vendor_gstin: v }))} />

            <Text style={S.cardLabel}>Tax rate (%)</Text>
            <TextInput style={S.input} placeholder="18" keyboardType="decimal-pad" placeholderTextColor={T.textMuted} value={form.tax_rate} onChangeText={(v) => setForm((f) => ({ ...f, tax_rate: v }))} />

            <Text style={[S.cardLabel, { marginTop: 4 }]}>Items</Text>
            {form.items.map((it, idx) => (
              <View key={idx} style={{ borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 10, marginTop: 8 }}>
                <Text style={{ color: T.textMuted, fontSize: 12, marginBottom: 6 }}>Item {idx + 1}</Text>
                <TextInput
                  style={S.input}
                  placeholder="Product"
                  placeholderTextColor={T.textMuted}
                  value={it.product_name}
                  onChangeText={(v) => {
                    updateItem(idx, "product_name", v);
                    const matched = catalog.find((p) => p.name === v);
                    updateItem(idx, "product_id", matched?.id || null);
                  }}
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TextInput style={[S.input, { flex: 1 }]} placeholder="Qty" keyboardType="number-pad" placeholderTextColor={T.textMuted} value={it.quantity} onChangeText={(v) => updateItem(idx, "quantity", v)} />
                  <TextInput style={[S.input, { flex: 1 }]} placeholder="Price" keyboardType="decimal-pad" placeholderTextColor={T.textMuted} value={it.unit_price} onChangeText={(v) => updateItem(idx, "unit_price", v)} />
                </View>
                {form.items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(idx)} style={{ alignSelf: "flex-end", marginTop: 8 }}>
                    <Text style={{ color: T.rose, fontWeight: "700", fontSize: 12 }}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={addItem} style={{ marginTop: 10, alignSelf: "flex-start" }}>
              <Text style={{ color: T.gold, fontWeight: "800" }}>+ Add item</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 4 }}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={{ flex: 1, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: T.textSecondary, fontWeight: "800" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateBill}
                disabled={creating}
                style={{
                  flex: 1,
                  backgroundColor: "#d4a017",
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                  alignItems: "center",
                  shadowColor: "#d4a017",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                  opacity: creating ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "#000000", fontWeight: "700", fontSize: 15 }}>{creating ? "Creating..." : "Create Bill"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
      </Modal>
    </>
  );
}
