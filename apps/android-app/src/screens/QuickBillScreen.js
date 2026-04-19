import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { postInventoryBill } from "../api";
import { ContentPanel, HeroBand, PageHeader, PrimaryButton, SecondaryButton } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function QuickBillScreen({ navigation }) {
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState([{ name: "", quantity: "1", price: "" }]);

  const canSave = useMemo(() => {
    if (!customerName.trim()) return false;
    const valid = items.filter((it) => it.name.trim() && Number(it.quantity) > 0 && Number(it.price) > 0);
    return valid.length > 0;
  }, [customerName, items]);

  const addItem = () => setItems((x) => [...x, { name: "", quantity: "1", price: "" }]);
  const removeItem = (idx) => setItems((x) => x.filter((_, i) => i !== idx));

  const save = async () => {
    if (!canSave) {
      Alert.alert("Quick bill", "Enter customer name and at least one valid line item.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_email: customerEmail.trim() || null,
        notes: notes.trim() || null,
        currency: "INR",
        items: items
          .filter((it) => it.name.trim() && Number(it.quantity) > 0 && Number(it.price) > 0)
          .map((it) => ({
            product_id: null,
            name: it.name.trim(),
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
          })),
      };
      const res = await postInventoryBill(payload);
      Alert.alert("Quick bill", res.message || "Bill created");
      const billId = res?.id ?? res?.bill_id ?? res?.bill?.id;
      if (billId) navigation.navigate("PurchaseDetail", { billId });
    } catch (e) {
      Alert.alert("Quick bill", e.message || "Failed to create bill");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.screenBg }} contentContainerStyle={S.scrollContent}>
      <HeroBand eyebrow="POINT OF SALE">
        <PageHeader title="Quick Bill" subtitle="Create a simple bill quickly" />
      </HeroBand>

      <ContentPanel>
        <Text style={S.muted}>Customer</Text>
        <TextInput
          style={S.input}
          placeholder="Customer name"
          placeholderTextColor={T.textMuted}
          value={customerName}
          onChangeText={setCustomerName}
        />
        <TextInput
          style={S.input}
          placeholder="Phone (optional)"
          placeholderTextColor={T.textMuted}
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={S.input}
          placeholder="Email (optional)"
          placeholderTextColor={T.textMuted}
          value={customerEmail}
          onChangeText={setCustomerEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </ContentPanel>

      <ContentPanel>
        <Text style={S.muted}>Line items</Text>
        {items.map((it, idx) => (
          <View key={idx} style={[S.card, { marginBottom: 10 }]}>
            <TextInput
              style={S.input}
              placeholder="Item name"
              placeholderTextColor={T.textMuted}
              value={it.name}
              onChangeText={(v) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, name: v } : x)))}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={S.input}
                  placeholder="Qty"
                  placeholderTextColor={T.textMuted}
                  keyboardType="numeric"
                  value={it.quantity}
                  onChangeText={(v) =>
                    setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, quantity: v.replace(/[^0-9.]/g, "") } : x)))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={S.input}
                  placeholder="Price"
                  placeholderTextColor={T.textMuted}
                  keyboardType="numeric"
                  value={it.price}
                  onChangeText={(v) =>
                    setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, price: v.replace(/[^0-9.]/g, "") } : x)))
                  }
                />
              </View>
            </View>
            {items.length > 1 ? (
              <TouchableOpacity style={S.btnSecondary} onPress={() => removeItem(idx)} activeOpacity={0.9}>
                <Text style={S.btnSecondaryText}>Remove item</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
        <SecondaryButton title="Add another item" onPress={addItem} />
      </ContentPanel>

      <ContentPanel>
        <Text style={S.muted}>Notes</Text>
        <TextInput
          style={S.input}
          placeholder="Notes (optional)"
          placeholderTextColor={T.textMuted}
          value={notes}
          onChangeText={setNotes}
        />
      </ContentPanel>

      <PrimaryButton title={saving ? "Creating…" : "Create bill"} onPress={save} disabled={saving} />

      <View style={{ height: 12 }} />
      <SecondaryButton title="Browse products" onPress={() => navigation.navigate("Products")} />
      <SecondaryButton title="Customer ledger" onPress={() => navigation.navigate("Customers")} />
    </ScrollView>
  );
}
