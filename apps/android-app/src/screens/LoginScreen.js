import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE, login } from "../api";
import { useAuth } from "../context/AuthContext";
import { PrimaryButton } from "../components/NexusUi";
import * as T from "../theme/tokens";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const styles = React.useMemo(() => makeStyles(), [T.mode, T.border, T.cardBg, T.voidBg]);

  async function handleLogin() {
    try {
      setLoading(true);
      const data = await login(email.trim(), password);
      await signIn(data.access_token, data.refresh_token);
    } catch (e) {
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.glowOrb} />
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>N</Text>
          </View>
          <View>
            <Text style={styles.brand}>NexusERP</Text>
            <Text style={styles.tag}>Enterprise · Android</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardHint}>Sign in with your web portal credentials.</Text>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@company.com"
            placeholderTextColor={T.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={T.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <PrimaryButton title={loading ? "Signing in…" : "Sign in"} onPress={handleLogin} disabled={loading} />
        </View>

        <Text style={styles.apiFoot} numberOfLines={2}>
          API {API_BASE}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: T.voidBg },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 22,
      paddingTop: 56,
      paddingBottom: 32,
      justifyContent: "center",
    },
    glowOrb: {
      position: "absolute",
      top: -40,
      right: -60,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: "rgba(212,175,55,0.12)",
    },
    brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 28 },
    logoBadge: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: T.gold,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      shadowColor: T.gold,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    logoLetter: { color: "#111", fontSize: 22, fontWeight: "900" },
    brand: { color: T.textPrimary, fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
    tag: { color: T.textMuted, fontSize: 13, marginTop: 4 },
    card: {
      backgroundColor: T.cardBg,
      borderRadius: 22,
      padding: 22,
      borderWidth: 1,
      borderColor: T.mode === "light" ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.08)",
    },
    cardTitle: { color: T.textPrimary, fontSize: 22, fontWeight: "800" },
    cardHint: { color: T.textSecondary, fontSize: 13, marginTop: 6, marginBottom: 18 },
    label: { color: T.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6 },
    input: {
      backgroundColor: T.mode === "light" ? "#FFFFFF" : T.abyss,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: T.border,
      padding: 15,
      color: T.textPrimary,
      fontSize: 15,
      marginBottom: 14,
    },
    apiFoot: { color: T.textMuted, fontSize: 11, textAlign: "center", marginTop: 24, opacity: 0.8 },
  });
}
