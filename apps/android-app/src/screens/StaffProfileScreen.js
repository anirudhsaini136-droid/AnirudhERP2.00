import React, { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getStaffProfile, putStaffChangePassword, putStaffProfile } from "../api";
import { HeroBand, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function StaffProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStaffProfile();
      setProfile(res);
      setForm({
        phone: res.phone || "",
        address: res.address || "",
        emergency_contact: res.emergency_contact || "",
      });
    } catch (e) {
      Alert.alert("Profile", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const saveProfile = async () => {
    try {
      await putStaffProfile(form);
      Alert.alert("Saved");
      load();
    } catch (e) {
      Alert.alert("Profile", e.message);
    }
  };

  const savePwd = async () => {
    if (pwd.next !== pwd.confirm) {
      Alert.alert("Passwords do not match");
      return;
    }
    try {
      await putStaffChangePassword({ current_password: pwd.current, new_password: pwd.next });
      setPwd({ current: "", next: "", confirm: "" });
      Alert.alert("Password updated");
    } catch (e) {
      Alert.alert("Password", e.message);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="STAFF">
        <PageHeader title="My profile" subtitle="Contact details and security" />
      </HeroBand>
      <View style={S.card}>
        <Text style={S.cardLabel}>Employee</Text>
        <Text style={S.cardValue}>{profile?.employee_name || profile?.first_name || "—"}</Text>
      </View>
      <View style={S.card}>
        <TextInput style={S.input} placeholder="Phone" placeholderTextColor={T.textMuted} value={form.phone} onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))} keyboardType="phone-pad" />
        <TextInput style={S.input} placeholder="Address" placeholderTextColor={T.textMuted} value={form.address} onChangeText={(t) => setForm((f) => ({ ...f, address: t }))} />
        <TextInput
          style={S.input}
          placeholder="Emergency contact"
          placeholderTextColor={T.textMuted}
          value={form.emergency_contact}
          onChangeText={(t) => setForm((f) => ({ ...f, emergency_contact: t }))}
        />
        <TouchableOpacity style={S.btnPrimary} onPress={saveProfile}>
          <Text style={S.btnPrimaryText}>Save profile</Text>
        </TouchableOpacity>
      </View>
      <View style={S.card}>
        <Text style={S.sectionTitle}>Change password</Text>
        <TextInput style={S.input} placeholder="Current" placeholderTextColor={T.textMuted} secureTextEntry value={pwd.current} onChangeText={(t) => setPwd((p) => ({ ...p, current: t }))} />
        <TextInput style={S.input} placeholder="New" placeholderTextColor={T.textMuted} secureTextEntry value={pwd.next} onChangeText={(t) => setPwd((p) => ({ ...p, next: t }))} />
        <TextInput style={S.input} placeholder="Confirm" placeholderTextColor={T.textMuted} secureTextEntry value={pwd.confirm} onChangeText={(t) => setPwd((p) => ({ ...p, confirm: t }))} />
        <TouchableOpacity style={S.btnSecondary} onPress={savePwd}>
          <Text style={S.btnSecondaryText}>Update password</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
