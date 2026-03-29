import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getDashboardSettings, putDashboardInvoiceSettings, putDashboardSettings } from "../api";
import { HeroBand, PageHeader, PrimaryButton, SecondaryButton } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

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

export default function BusinessSettingsScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const [statePickerOpen, setStatePickerOpen] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    state: "",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    invoice_gst: "",
    invoice_pan: "",
    invoice_footer_note: "",
    invoice_logo_url: "",
    terms_of_sale: "",
    upi_vpa: "",
    upi_name: "",
    whatsapp_number: "",
    wati_api_endpoint: "",
    wati_api_token: "",
  });

  const [bankForm, setBankForm] = useState({
    invoice_bank_name: "",
    invoice_bank_account: "",
    invoice_bank_ifsc: "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDashboardSettings();
      setData(res);
      const b = res?.business || {};
      setProfileForm({
        name: b.name || "",
        phone: b.phone || "",
        address: b.address || "",
        city: b.city || "",
        country: b.country || "",
        state: b.state || "",
      });
      setInvoiceForm({
        invoice_gst: b.invoice_gst || "",
        invoice_pan: b.invoice_pan || "",
        invoice_footer_note: b.invoice_footer_note || "",
        invoice_logo_url: b.invoice_logo_url || "",
        terms_of_sale: b.terms_of_sale || "",
        upi_vpa: b.upi_vpa || "",
        upi_name: b.upi_name || "",
        whatsapp_number: b.whatsapp_number || "",
        wati_api_endpoint: b.wati_api_endpoint || "",
        wati_api_token: b.wati_api_token || "",
      });
      setBankForm({
        invoice_bank_name: b.invoice_bank_name || "",
        invoice_bank_account: b.invoice_bank_account || "",
        invoice_bank_ifsc: b.invoice_bank_ifsc || "",
      });
    } catch (e) {
      Alert.alert("Settings", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="BUSINESS">
        <PageHeader title="Settings" subtitle="Business profile & invoice defaults" />
      </HeroBand>

      <Text style={S.sectionTitle}>Business Profile</Text>
      <View style={S.card}>
        <Text style={S.cardLabel}>Business Name</Text>
        <TextInput style={S.input} placeholder="Business name" placeholderTextColor={T.textMuted} value={profileForm.name} onChangeText={(v) => setProfileForm((f) => ({ ...f, name: v }))} />

        <Text style={S.cardLabel}>Phone</Text>
        <TextInput style={S.input} placeholder="Phone" placeholderTextColor={T.textMuted} value={profileForm.phone} onChangeText={(v) => setProfileForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />

        <Text style={S.cardLabel}>Address</Text>
        <TextInput style={S.input} placeholder="Address" placeholderTextColor={T.textMuted} value={profileForm.address} onChangeText={(v) => setProfileForm((f) => ({ ...f, address: v }))} />

        <Text style={S.cardLabel}>City</Text>
        <TextInput style={S.input} placeholder="City" placeholderTextColor={T.textMuted} value={profileForm.city} onChangeText={(v) => setProfileForm((f) => ({ ...f, city: v }))} />

        <Text style={S.cardLabel}>Country</Text>
        <TextInput style={S.input} placeholder="Country" placeholderTextColor={T.textMuted} value={profileForm.country} onChangeText={(v) => setProfileForm((f) => ({ ...f, country: v }))} />

        <Text style={S.cardLabel}>State (for GST)</Text>
        <TouchableOpacity
          style={S.input}
          activeOpacity={0.9}
          onPress={() => setStatePickerOpen(true)}
        >
          <Text style={{ color: profileForm.state ? T.textPrimary : T.textMuted, fontWeight: "800" }}>
            {profileForm.state || "Select State"}
          </Text>
          <Text style={{ color: T.textMuted, fontWeight: "900", position: "absolute", right: 14, top: 14 }}>▼</Text>
        </TouchableOpacity>

        <PrimaryButton
          title={savingProfile ? "Saving…" : "Save Profile"}
          onPress={async () => {
            try {
              setSavingProfile(true);
              await putDashboardSettings(profileForm);
              Alert.alert("Settings", "Business profile saved");
              load();
            } catch (e) {
              Alert.alert("Settings", e.message || "Failed to save profile");
            } finally {
              setSavingProfile(false);
            }
          }}
          disabled={savingProfile}
        />
      </View>

      <Text style={S.sectionTitle}>Invoice Settings</Text>
      <View style={S.card}>
        <Text style={S.cardLabel}>Invoice GST</Text>
        <TextInput style={S.input} placeholder="GSTIN" placeholderTextColor={T.textMuted} value={invoiceForm.invoice_gst} onChangeText={(v) => setInvoiceForm((f) => ({ ...f, invoice_gst: v }))} />

        <Text style={S.cardLabel}>Invoice PAN</Text>
        <TextInput style={S.input} placeholder="PAN" placeholderTextColor={T.textMuted} value={invoiceForm.invoice_pan} onChangeText={(v) => setInvoiceForm((f) => ({ ...f, invoice_pan: v }))} />

        <Text style={S.cardLabel}>Invoice Footer Note</Text>
        <TextInput style={S.input} placeholder="Footer note" placeholderTextColor={T.textMuted} value={invoiceForm.invoice_footer_note} onChangeText={(v) => setInvoiceForm((f) => ({ ...f, invoice_footer_note: v }))} />

        <Text style={S.cardLabel}>Terms of Sale</Text>
        <TextInput style={S.input} placeholder="Terms of sale" placeholderTextColor={T.textMuted} value={invoiceForm.terms_of_sale} onChangeText={(v) => setInvoiceForm((f) => ({ ...f, terms_of_sale: v }))} />

        <Text style={S.cardLabel}>Invoice Logo URL</Text>
        <TextInput style={S.input} placeholder="Logo URL" placeholderTextColor={T.textMuted} value={invoiceForm.invoice_logo_url} onChangeText={(v) => setInvoiceForm((f) => ({ ...f, invoice_logo_url: v }))} />

        <Text style={S.cardLabel}>UPI VPA</Text>
        <TextInput style={S.input} placeholder="UPI VPA" placeholderTextColor={T.textMuted} value={invoiceForm.upi_vpa} onChangeText={(v) => setInvoiceForm((f) => ({ ...f, upi_vpa: v }))} />

        <Text style={S.cardLabel}>UPI Name</Text>
        <TextInput style={S.input} placeholder="UPI name" placeholderTextColor={T.textMuted} value={invoiceForm.upi_name} onChangeText={(v) => setInvoiceForm((f) => ({ ...f, upi_name: v }))} />

        <Text style={S.cardLabel}>WhatsApp Number</Text>
        <TextInput style={S.input} placeholder="WhatsApp number" placeholderTextColor={T.textMuted} value={invoiceForm.whatsapp_number} onChangeText={(v) => setInvoiceForm((f) => ({ ...f, whatsapp_number: v }))} keyboardType="phone-pad" />

        <Text style={S.cardLabel}>WATI API Endpoint</Text>
        <TextInput style={S.input} placeholder="WATI endpoint" placeholderTextColor={T.textMuted} value={invoiceForm.wati_api_endpoint} onChangeText={(v) => setInvoiceForm((f) => ({ ...f, wati_api_endpoint: v }))} autoCapitalize="none" />

        <Text style={S.cardLabel}>WATI API Token</Text>
        <TextInput style={S.input} placeholder="WATI token" placeholderTextColor={T.textMuted} value={invoiceForm.wati_api_token} onChangeText={(v) => setInvoiceForm((f) => ({ ...f, wati_api_token: v }))} autoCapitalize="none" />

        <PrimaryButton
          title={savingInvoice ? "Saving…" : "Save Invoice Settings"}
          onPress={async () => {
            try {
              setSavingInvoice(true);
              await putDashboardInvoiceSettings(invoiceForm);
              Alert.alert("Settings", "Invoice settings saved");
              load();
            } catch (e) {
              Alert.alert("Settings", e.message || "Failed to save invoice settings");
            } finally {
              setSavingInvoice(false);
            }
          }}
          disabled={savingInvoice}
        />
      </View>

      <Text style={S.sectionTitle}>Bank Details</Text>
      <View style={S.card}>
        <Text style={S.cardLabel}>Bank Name</Text>
        <TextInput style={S.input} placeholder="Bank name" placeholderTextColor={T.textMuted} value={bankForm.invoice_bank_name} onChangeText={(v) => setBankForm((f) => ({ ...f, invoice_bank_name: v }))} />

        <Text style={S.cardLabel}>Account Number</Text>
        <TextInput style={S.input} placeholder="Account number" placeholderTextColor={T.textMuted} value={bankForm.invoice_bank_account} onChangeText={(v) => setBankForm((f) => ({ ...f, invoice_bank_account: v }))} />

        <Text style={S.cardLabel}>IFSC</Text>
        <TextInput style={S.input} placeholder="IFSC" placeholderTextColor={T.textMuted} value={bankForm.invoice_bank_ifsc} onChangeText={(v) => setBankForm((f) => ({ ...f, invoice_bank_ifsc: v }))} autoCapitalize="characters" />

        <PrimaryButton
          title={savingBank ? "Saving…" : "Save Bank Details"}
          onPress={async () => {
            try {
              setSavingBank(true);
              await putDashboardInvoiceSettings(bankForm);
              Alert.alert("Settings", "Bank details saved");
              load();
            } catch (e) {
              Alert.alert("Settings", e.message || "Failed to save bank details");
            } finally {
              setSavingBank(false);
            }
          }}
          disabled={savingBank}
        />
      </View>

      <Modal transparent visible={statePickerOpen} animationType="fade" onRequestClose={() => setStatePickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setStatePickerOpen(false)} />
          <View style={[S.card, { margin: 16, maxHeight: 420 }]}>
            <Text style={{ color: T.gold, fontSize: 14, fontWeight: "900", marginBottom: 10 }}>Select State</Text>
            <ScrollView>
              {INDIAN_STATES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border }}
                  onPress={() => {
                    setProfileForm((f) => ({ ...f, state: s }));
                    setStatePickerOpen(false);
                  }}
                >
                  <Text style={{ color: profileForm.state === s ? T.gold : T.textPrimary, fontWeight: "900" }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <SecondaryButton title="Done" onPress={() => setStatePickerOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
