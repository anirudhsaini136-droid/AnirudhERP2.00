import React, { useCallback, useState } from "react";
import { Alert, FlatList, Modal, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getProducts, postInventoryProduct } from "../api";
import { EmptyState, HeroBand, ListRowCard, LoadingCenter, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

export default function ProductsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
    stock_quantity: "",
    hsn_code: "",
    gst_rate: "",
  });

  const load = useCallback(async () => {
    try {
      const data = await getProducts({ limit: "100" });
      setItems(data.products || []);
    } catch (e) {
      Alert.alert("Products", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAddProduct = async () => {
    if (!form.name.trim()) {
      Alert.alert("Add Product", "Product name is required.");
      return;
    }
    if (Number(form.price || 0) <= 0) {
      Alert.alert("Add Product", "Please enter a valid price.");
      return;
    }
    try {
      setSaving(true);
      await postInventoryProduct({
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        category: form.category.trim() || null,
        unit_price: Number(form.price || 0),
        current_stock: Number(form.stock_quantity || 0),
        hsn_code: form.hsn_code.trim() || null,
        gst_rate: Number(form.gst_rate || 0),
      });
      setShowAdd(false);
      setForm({ name: "", sku: "", category: "", price: "", stock_quantity: "", hsn_code: "", gst_rate: "" });
      await load();
      Alert.alert("Products", "Product added successfully.");
    } catch (e) {
      Alert.alert("Add Product", e.message || "Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  if (loading && items.length === 0) return <LoadingCenter label="Loading catalog…" />;

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: T.screenBg }}
        contentContainerStyle={S.scrollContent}
        data={items}
        keyExtractor={(p) => String(p.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 6 }}>
            <HeroBand eyebrow="INVENTORY">
              <PageHeader title="Products" subtitle="SKU, stock on hand & pricing" />
            </HeroBand>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowAdd(true)}
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
            <Text style={{ color: "#000000", fontWeight: "700", fontSize: 15 }}>+ Add Product</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <ListRowCard
            title={item.name}
            subtitle={`SKU ${item.sku || "—"}`}
            meta={`Stock ${item.current_stock ?? 0} · ${fmtInr(item.unit_price)}`}
            badge={Number(item.current_stock) <= Number(item.minimum_stock || 0) ? "Low" : "OK"}
            badgeColor={Number(item.current_stock) <= Number(item.minimum_stock || 0) ? T.rose : T.emerald}
          />
        )}
        ListEmptyComponent={<EmptyState message="No products" />}
      />
      <Modal transparent visible={showAdd} animationType="fade" onRequestClose={() => setShowAdd(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAdd(false)} />
        <View style={[S.card, { margin: 14, maxHeight: "78%" }]}>
          <Text style={{ color: T.gold, fontWeight: "900", fontSize: 18, marginBottom: 8 }}>Add Product</Text>

          <Text style={S.cardLabel}>Product Name *</Text>
          <TextInput style={S.input} placeholder="Product name" placeholderTextColor={T.textMuted} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />

          <Text style={S.cardLabel}>SKU</Text>
          <TextInput style={S.input} placeholder="SKU" placeholderTextColor={T.textMuted} value={form.sku} onChangeText={(v) => setForm((f) => ({ ...f, sku: v }))} />

          <Text style={S.cardLabel}>Category</Text>
          <TextInput style={S.input} placeholder="Category" placeholderTextColor={T.textMuted} value={form.category} onChangeText={(v) => setForm((f) => ({ ...f, category: v }))} />

          <Text style={S.cardLabel}>Price *</Text>
          <TextInput style={S.input} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={T.textMuted} value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v }))} />

          <Text style={S.cardLabel}>Stock quantity</Text>
          <TextInput style={S.input} placeholder="0" keyboardType="number-pad" placeholderTextColor={T.textMuted} value={form.stock_quantity} onChangeText={(v) => setForm((f) => ({ ...f, stock_quantity: v }))} />

          <Text style={S.cardLabel}>HSN code</Text>
          <TextInput style={S.input} placeholder="HSN code" placeholderTextColor={T.textMuted} value={form.hsn_code} onChangeText={(v) => setForm((f) => ({ ...f, hsn_code: v }))} />

          <Text style={S.cardLabel}>GST rate</Text>
          <TextInput style={S.input} placeholder="18" keyboardType="decimal-pad" placeholderTextColor={T.textMuted} value={form.gst_rate} onChangeText={(v) => setForm((f) => ({ ...f, gst_rate: v }))} />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={{ flex: 1, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: T.textSecondary, fontWeight: "800" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAddProduct}
              disabled={saving}
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
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#000000", fontWeight: "700", fontSize: 15 }}>{saving ? "Adding..." : "Add Product"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </Modal>
    </>
  );
}
