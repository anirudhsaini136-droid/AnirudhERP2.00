import React, { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CommonActions, useFocusEffect, useNavigation } from "@react-navigation/native";
import { API_BASE, clearTrustedDeviceRecord, getMe, revokeTrustedDevices } from "../api";
import { ContentPanel, HeroBand, PageHeader, PrimaryButton, SecondaryButton } from "../components/NexaUi";
import { useAuth } from "../context/AuthContext";
import { THEME_PREFS, useTheme } from "../theme/ThemeProvider";
import { useScreenStyles } from "../theme/screenStyles";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { signOut, impersonating, endImpersonation } = useAuth();
  const { tokens: T, pref, setThemePref, effectiveMode } = useTheme();
  const S = useScreenStyles();
  const styles = useMemo(() => makeStyles(T), [T]);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await getMe();
      setData(res);
    } catch (e) {
      Alert.alert("Profile", e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const u = data?.user;
  const b = data?.business;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.gold} />}
    >
      <HeroBand eyebrow="ACCOUNT">
        <PageHeader title="Profile" subtitle="Session, role & workspace" />
      </HeroBand>

      <ContentPanel>
        <Text style={styles.themeTitle}>Appearance</Text>
        <Text style={S.muted}>Auto-switches with your phone when set to System.</Text>
        <View style={styles.themeRow}>
          {[
            { key: THEME_PREFS.system, label: "System" },
            { key: THEME_PREFS.dark, label: "Dark" },
            { key: THEME_PREFS.light, label: "Light" },
          ].map((opt) => {
            const on = pref === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.themePill, on && styles.themePillOn]}
                activeOpacity={0.9}
                onPress={() => setThemePref(opt.key)}
              >
                <Text style={[styles.themePillTx, on && styles.themePillTxOn]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[S.muted, { marginTop: 10 }]}>Current: {effectiveMode.toUpperCase()}</Text>
      </ContentPanel>

      {impersonating ? (
        <ContentPanel style={{ marginBottom: 14, borderColor: "rgba(212,175,55,0.25)", backgroundColor: "rgba(212,175,55,0.06)" }}>
          <Text style={styles.impersonationLabel}>Super admin session on hold</Text>
          <Text style={styles.impersonationHint}>
            You are signed in as this tenant’s owner. Exit to restore your platform admin access.
          </Text>
          <PrimaryButton
            title="Back to super admin"
            onPress={() => {
              Alert.alert(
                "Return to super admin",
                "Restore your platform admin session?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Continue",
                    async onPress() {
                      try {
                        await endImpersonation();
                        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "SuperAdminDashboard" }] }));
                        load();
                      } catch (e) {
                        Alert.alert("Session", e?.message || "Could not restore super admin session");
                      }
                    },
                  },
                ]
              );
            }}
          />
        </ContentPanel>
      ) : null}

      <ContentPanel>
        <View style={styles.avatar}>
          <Text style={styles.avatarTx}>
            {(u?.first_name?.[0] || "?").toUpperCase()}
            {(u?.last_name?.[0] || "").toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>
          {u?.first_name} {u?.last_name}
        </Text>
        <Text style={styles.email}>{u?.email}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleTx}>{String(u?.role || "").replace(/_/g, " ")}</Text>
        </View>
      </ContentPanel>
      {b ? (
        <ContentPanel>
          <Text style={styles.bizLabel}>Active business</Text>
          <Text style={styles.bizName}>{b.name}</Text>
        </ContentPanel>
      ) : null}
      <View style={[S.card, { marginTop: 8 }]}>
        <Text style={S.muted}>API endpoint</Text>
        <Text style={styles.mono} selectable>
          {API_BASE}
        </Text>
      </View>
      <SecondaryButton title="Refresh profile" onPress={load} />
      <TouchableOpacity
        style={styles.trustedOut}
        onPress={() => {
          Alert.alert(
            "Remove trusted device",
            "This signs you out on all devices that used “remember this device” for OTP, and clears the saved device on this phone. You will need email OTP again on next sign-in.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Continue",
                style: "destructive",
                async onPress() {
                  let serverOk = true;
                  try {
                    await revokeTrustedDevices();
                  } catch {
                    serverOk = false;
                  }
                  try {
                    if (u?.email) await clearTrustedDeviceRecord(u.email);
                    Alert.alert(
                      "Done",
                      serverOk
                        ? "Trusted devices removed on the server and on this phone. Sign in again when you are ready."
                        : "Cleared on this phone. Sign in when online and use this action again to revoke trusted devices on the server."
                    );
                    await signOut();
                  } catch (e) {
                    Alert.alert("Error", e?.message || "Something went wrong");
                  }
                },
              },
            ]
          );
        }}
        activeOpacity={0.9}
      >
        <Text style={styles.trustedOutTx}>Remove trusted device / Sign out all devices</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logout} onPress={() => signOut()} activeOpacity={0.9}>
        <Text style={styles.logoutTx}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(T) {
  return StyleSheet.create({
    themeTitle: { color: T.textPrimary, fontWeight: "800", fontSize: 15, marginBottom: 10 },
    themeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 },
    themePill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: T.mode === "light" ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.12)",
      backgroundColor: T.mode === "light" ? "rgba(15,23,42,0.03)" : "rgba(255,255,255,0.05)",
    },
    themePillOn: { borderColor: "rgba(212,175,55,0.35)", backgroundColor: "rgba(212,175,55,0.12)" },
    themePillTx: { color: T.textSecondary, fontWeight: "800", fontSize: 12 },
    themePillTxOn: { color: T.gold },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: T.gold,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    avatarTx: { color: "#111", fontSize: 26, fontWeight: "900" },
    name: { color: T.textPrimary, fontSize: 22, fontWeight: "800", textAlign: "center" },
    email: { color: T.textSecondary, textAlign: "center", marginTop: 8 },
    rolePill: {
      alignSelf: "center",
      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: "rgba(212,175,55,0.15)",
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.35)",
    },
    roleTx: { color: T.gold, fontWeight: "800", fontSize: 12, textTransform: "capitalize" },
    bizLabel: { color: T.textMuted, fontSize: 12, fontWeight: "600" },
    bizName: { color: T.textPrimary, fontSize: 18, fontWeight: "800", marginTop: 8 },
    mono: { color: T.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 18 },
    trustedOut: {
      marginTop: 12,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(251,191,36,0.35)",
      backgroundColor: "rgba(251,191,36,0.08)",
    },
    trustedOutTx: { color: T.gold, fontWeight: "800", fontSize: 14, textAlign: "center", paddingHorizontal: 12 },
    logout: {
      marginTop: 16,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(244,63,94,0.35)",
      backgroundColor: "rgba(244,63,94,0.1)",
    },
    logoutTx: { color: "#FDA4AF", fontWeight: "800", fontSize: 15 },
    impersonationLabel: { color: T.gold, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
    impersonationHint: { color: T.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 14 },
  });
}
