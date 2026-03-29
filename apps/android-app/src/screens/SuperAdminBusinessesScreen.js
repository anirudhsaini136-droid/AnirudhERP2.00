import React, { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getSuperAdminBusinesses, postSuperAdminBusiness } from "../api";
import { EmptyState, HeroBand, ListRowCard, LoadingCenter, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function SuperAdminBusinessesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    owner_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "India",
    plan: "starter",
    initial_days: "14",
    monthly_amount: "0",
  });

  const load = useCallback(async () => {
    try {
      const data = await getSuperAdminBusinesses();
      setItems(data.businesses || []);
    } catch (e) {
      Alert.alert("Businesses", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && items.length === 0) return <LoadingCenter label="Loading businesses…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={items}
      keyExtractor={(b) => String(b.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <>
          <View style={{ marginBottom: 6 }}>
            <HeroBand eyebrow="SUPER ADMIN">
              <PageHeader title="Businesses" subtitle="Tenant health, plans & renewal" />
            </HeroBand>
          </View>
          <TouchableOpacity style={[S.btnPrimary, { marginBottom: 12 }]} onPress={() => setShowCreate((v) => !v)}>
            <Text style={S.btnPrimaryText}>{showCreate ? "Close create form" : "Create new business"}</Text>
          </TouchableOpacity>
          {showCreate ? (
            <View style={S.card}>
              <TextInput style={S.input} placeholder="Business name" placeholderTextColor={T.textMuted} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
              <TextInput style={S.input} placeholder="Owner name" placeholderTextColor={T.textMuted} value={form.owner_name} onChangeText={(v) => setForm((f) => ({ ...f, owner_name: v }))} />
              <TextInput style={S.input} placeholder="Owner email" placeholderTextColor={T.textMuted} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} />
              <TextInput style={S.input} placeholder="Phone" placeholderTextColor={T.textMuted} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
              <TextInput style={S.input} placeholder="Address" placeholderTextColor={T.textMuted} value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} />
              <TextInput style={S.input} placeholder="City" placeholderTextColor={T.textMuted} value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} />
              <TextInput style={S.input} placeholder="Country" placeholderTextColor={T.textMuted} value={form.country} onChangeText={(v) => setForm((f) => ({ ...f, country: v }))} />
              <TextInput style={S.input} placeholder="Plan (starter|growth|enterprise)" placeholderTextColor={T.textMuted} value={form.plan} onChangeText={(v) => setForm((f) => ({ ...f, plan: v }))} />
              <TextInput style={S.input} placeholder="Initial days" placeholderTextColor={T.textMuted} keyboardType="number-pad" value={form.initial_days} onChangeText={(v) => setForm((f) => ({ ...f, initial_days: v.replace(/[^0-9]/g, "") }))} />
              <TextInput style={S.input} placeholder="Monthly amount ₹" placeholderTextColor={T.textMuted} keyboardType="numeric" value={form.monthly_amount} onChangeText={(v) => setForm((f) => ({ ...f, monthly_amount: v.replace(/[^0-9.]/g, "") }))} />
              <TouchableOpacity
                style={[S.btnPrimary, creating && { opacity: 0.6 }]}
                disabled={creating}
                onPress={async () => {
                  try {
                    setCreating(true);
                    const payload = {
                      ...form,
                      initial_days: Number(form.initial_days) || 14,
                      monthly_amount: Number(form.monthly_amount) || 0,
                      modules: "[]",
                      max_users: 5,
                      max_invoices_month: 100,
                      max_products: 50,
                      max_employees: 10,
                      amount_paid: 0,
                      payment_method: "cash",
                    };
                    const res = await postSuperAdminBusiness(payload);
                    Alert.alert("Business", res.message || "Created");
                    setShowCreate(false);
                    setForm({
                      name: "",
                      owner_name: "",
                      email: "",
                      phone: "",
                      address: "",
                      city: "",
                      country: "India",
                      plan: "starter",
                      initial_days: "14",
                      monthly_amount: "0",
                    });
                    load();
                  } catch (e) {
                    Alert.alert("Business", e.message);
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                <Text style={S.btnPrimaryText}>{creating ? "Creating..." : "Create business"}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      }
      renderItem={({ item }) => (
        <ListRowCard
          title={item.name}
          subtitle={`${String(item.plan ?? "—")} · ${String(item.status ?? "—")}`}
          meta={item.days_remaining != null ? `${item.days_remaining} days left` : ""}
          badge={String(item.status ?? "")}
          badgeColor={item.status === "active" ? T.emerald : item.status === "trial" ? T.gold : T.textMuted}
          onPress={() => navigation.navigate("SuperAdminBusinessDetail", { id: item.id, title: item.name })}
        />
      )}
      ListEmptyComponent={<EmptyState message="No businesses" />}
    />
  );
}
