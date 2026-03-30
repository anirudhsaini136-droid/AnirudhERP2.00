import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
import { getDashboardSettings, getSubscriptionPaymentOffer, postPaymentsCreateOrder, postPaymentsVerify, putDashboardInvoiceSettings, putDashboardSettings } from "../api";
import { HeroBand, PageHeader, PrimaryButton, SecondaryButton } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import RazorpayCheckout from "react-native-razorpay";

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
  const [paymentOffer, setPaymentOffer] = useState(null);
  const [payOfferLoading, setPayOfferLoading] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState("monthly"); // 'monthly' | 'yearly'
  const [razorpayBusy, setRazorpayBusy] = useState(false);
  const [toggleW, setToggleW] = useState(0);
  const toggleAnim = useRef(new Animated.Value(0)).current;
  const togglePad = 4;
  const highlightW = Math.max(0, (toggleW - togglePad * 2) / 2);
  const highlightTranslateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, highlightW],
  });

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: selectedBillingCycle === "yearly" ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 2,
    }).start();
  }, [selectedBillingCycle, toggleAnim]);

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

      // Razorpay order eligibility + amounts for subscription extension
      try {
        setPayOfferLoading(true);
        const offer = await getSubscriptionPaymentOffer();
        setPaymentOffer(offer);
      } catch {
        setPaymentOffer(null);
      } finally {
        setPayOfferLoading(false);
      }
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

  const selectedAmount =
    selectedBillingCycle === "yearly" ? paymentOffer?.yearly_payable_amount : paymentOffer?.monthly_payable_amount;
  const selectedExtendDays =
    selectedBillingCycle === "yearly" ? paymentOffer?.renewal_extend_days_yearly : paymentOffer?.renewal_extend_days;
  const canPayWithRazorpay =
    Boolean(paymentOffer?.razorpay_enabled) &&
    Boolean(paymentOffer?.razorpay_eligible) &&
    Number(selectedAmount || 0) > 0 &&
    (selectedBillingCycle === "yearly" ? paymentOffer?.can_pay_yearly : paymentOffer?.can_pay_monthly);

  const handlePayWithRazorpay = async () => {
    if (!canPayWithRazorpay) {
      Alert.alert("Payment", "Razorpay payment is not available right now.");
      return;
    }
    try {
      setRazorpayBusy(true);

      const orderRes = await postPaymentsCreateOrder({ billing_cycle: selectedBillingCycle });
      const order = orderRes;

      const key = paymentOffer?.razorpay_key_id;
      if (!key) throw new Error("Razorpay key not configured");

      RazorpayCheckout.open({
        key,
        amount: order.amount,
        currency: order.currency,
        name: "NexaERP",
        description: paymentOffer?.payment_note || "Subscription extension",
        order_id: order.order_id,
        prefill: {
          name: data?.business?.owner_name || data?.business?.name || "Business",
          email: "",
          contact: "",
        },
        theme: { color: "#C9A84C" },
      })
        .then(async (resp) => {
          try {
            if (!resp?.razorpay_signature) {
              throw new Error("Razorpay signature missing from payment response");
            }
            const verifyRes = await postPaymentsVerify({
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_signature: resp.razorpay_signature,
              billing_cycle: selectedBillingCycle,
            });

            const expiry = verifyRes?.new_expiry_date ? new Date(verifyRes.new_expiry_date).toLocaleDateString("en-IN") : null;
            Alert.alert("Payment successful", expiry ? `Subscription extended till ${expiry}` : "Subscription extended.");
            await load();
          } catch (e) {
            Alert.alert("Payment verification failed", e?.message || "Could not verify payment");
          } finally {
            setRazorpayBusy(false);
          }
        })
        .catch((err) => {
          Alert.alert("Razorpay", err?.description || err?.message || "Payment cancelled/failed");
          setRazorpayBusy(false);
        });
    } catch (e) {
      Alert.alert("Payment", e?.message || "Could not start payment");
      setRazorpayBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="BUSINESS">
        <PageHeader title="Settings" subtitle="Business profile & invoice defaults" />
      </HeroBand>

      <Text style={S.sectionTitle}>Subscription Extension</Text>
      <View
        style={[
          S.card,
          {
            borderColor: T.goldMuted,
            shadowColor: T.goldMuted,
            shadowOpacity: 0.28,
            shadowRadius: 18,
            elevation: 12,
          },
        ]}
      >
        <Text style={S.cardLabel}>Choose duration</Text>

        <View
          style={{
            marginTop: 10,
            flexDirection: "row",
            padding: togglePad,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: T.border,
            backgroundColor: T.cardBg,
            overflow: "hidden",
          }}
          onLayout={(e) => setToggleW(e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={{
              position: "absolute",
              left: togglePad,
              top: togglePad,
              bottom: togglePad,
              width: highlightW,
              borderRadius: 999,
              backgroundColor: T.gold,
              transform: [{ translateX: highlightTranslateX }],
            }}
          />

          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center" }}
            activeOpacity={0.85}
            onPress={() => setSelectedBillingCycle("monthly")}
          >
            <Text
              style={{
                color: selectedBillingCycle === "monthly" ? T.textPrimary : T.textMuted,
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center" }}
            activeOpacity={0.85}
            onPress={() => setSelectedBillingCycle("yearly")}
          >
            <Text
              style={{
                color: selectedBillingCycle === "yearly" ? T.textPrimary : T.textMuted,
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              Yearly
            </Text>
          </TouchableOpacity>
        </View>

        {payOfferLoading ? (
          <Text style={S.muted}>Loading payment options…</Text>
        ) : (
          <>
            <Text style={S.cardLabel} />
            <Text style={{ color: T.gold, fontWeight: "900", fontSize: 34, marginTop: 10, letterSpacing: -0.6 }}>
              ₹{Number(selectedAmount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </Text>
            <Text style={S.muted}>Extends access by {selectedExtendDays || 0} days after verification.</Text>
            <TouchableOpacity
              onPress={handlePayWithRazorpay}
              disabled={!canPayWithRazorpay || razorpayBusy || payOfferLoading}
              activeOpacity={0.92}
              style={[
                {
                  marginTop: 14,
                  borderRadius: 999,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: T.gold,
                  borderWidth: 1,
                  borderColor: T.goldMuted,
                  shadowColor: T.gold,
                  shadowOpacity: 0.35,
                  shadowRadius: 20,
                  elevation: 14,
                },
                (!canPayWithRazorpay || razorpayBusy || payOfferLoading) && { opacity: 0.55 },
              ]}
            >
              <Text style={{ color: "#0b1223", fontWeight: "900", fontSize: 16 }}>
                {razorpayBusy ? "Processing…" : "Pay with Razorpay"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

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
