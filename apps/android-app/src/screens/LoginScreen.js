import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
  const isDark = T.mode !== "light";

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
      <View style={styles.scene}>
        <AnimatedBackdrop isDark={isDark} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
      </View>
    </KeyboardAvoidingView>
  );
}

function AnimatedBackdrop({ isDark }) {
  const { width, height } = useWindowDimensions();
  const dayGlowScale = useRef(new Animated.Value(1)).current;
  const dayCloud1 = useRef(new Animated.Value(-180)).current;
  const dayCloud2 = useRef(new Animated.Value(-260)).current;
  const dayCloud3 = useRef(new Animated.Value(-140)).current;
  const shootX = useRef(new Animated.Value(-220)).current;
  const shootY = useRef(new Animated.Value(80)).current;
  const shootOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDark) return undefined;

    const sunPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dayGlowScale, {
          toValue: 1.08,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dayGlowScale, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const cloudAnim = (val, startX, duration, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: width + 220,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: startX,
            duration: 1,
            useNativeDriver: true,
          }),
        ])
      );

    const c1 = cloudAnim(dayCloud1, -180, 16000);
    const c2 = cloudAnim(dayCloud2, -260, 21000, 1100);
    const c3 = cloudAnim(dayCloud3, -140, 18500, 2300);

    sunPulse.start();
    c1.start();
    c2.start();
    c3.start();

    return () => {
      sunPulse.stop();
      c1.stop();
      c2.stop();
      c3.stop();
      dayCloud1.setValue(-180);
      dayCloud2.setValue(-260);
      dayCloud3.setValue(-140);
    };
  }, [isDark, width, dayGlowScale, dayCloud1, dayCloud2, dayCloud3]);

  useEffect(() => {
    if (!isDark) return undefined;
    let cancelled = false;
    let timer = null;

    const runShootingStar = () => {
      if (cancelled) return;
      shootX.setValue(-220);
      shootY.setValue(70 + Math.random() * 110);
      shootOpacity.setValue(0);
      Animated.sequence([
        Animated.delay(1200 + Math.random() * 2600),
        Animated.timing(shootOpacity, { toValue: 0.9, duration: 150, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(shootX, {
            toValue: width + 220,
            duration: 1150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(shootY, {
            toValue: 260 + Math.random() * 90,
            duration: 1150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(shootOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        if (!cancelled) {
          timer = setTimeout(runShootingStar, 2200 + Math.random() * 3600);
        }
      });
    };

    runShootingStar();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      shootOpacity.stopAnimation();
      shootX.stopAnimation();
      shootY.stopAnimation();
    };
  }, [isDark, width, shootOpacity, shootX, shootY]);

  const stars = [
    { x: 0.08, y: 0.1, s: 2.5, d: 0 },
    { x: 0.16, y: 0.2, s: 1.8, d: 300 },
    { x: 0.3, y: 0.08, s: 2.2, d: 900 },
    { x: 0.42, y: 0.17, s: 2.6, d: 600 },
    { x: 0.55, y: 0.09, s: 2.1, d: 1500 },
    { x: 0.66, y: 0.22, s: 2.8, d: 400 },
    { x: 0.78, y: 0.1, s: 1.9, d: 1700 },
    { x: 0.88, y: 0.18, s: 2.4, d: 1200 },
    { x: 0.12, y: 0.34, s: 2.1, d: 2100 },
    { x: 0.24, y: 0.29, s: 2.3, d: 2600 },
    { x: 0.37, y: 0.38, s: 1.7, d: 1400 },
    { x: 0.61, y: 0.33, s: 2.4, d: 2500 },
    { x: 0.74, y: 0.3, s: 2.2, d: 700 },
    { x: 0.9, y: 0.36, s: 1.9, d: 2900 },
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {isDark ? (
        <>
          {stars.map((star, idx) => (
            <TwinkleStar
              key={`star-${idx}`}
              left={star.x * width}
              top={star.y * height}
              size={star.s}
              delay={star.d}
            />
          ))}
          <Animated.View
            style={{
              position: "absolute",
              width: 170,
              height: 3,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.98)",
              opacity: shootOpacity,
              transform: [{ translateX: shootX }, { translateY: shootY }, { rotate: "-18deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 56,
              right: 24,
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          />
        </>
      ) : (
        <>
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          />
          <Animated.View
            style={{
              position: "absolute",
              top: 68,
              right: 28,
              width: 128,
              height: 128,
              borderRadius: 64,
              backgroundColor: "rgba(250,204,21,0.32)",
              transform: [{ scale: dayGlowScale }],
            }}
          />
          <Animated.View style={[dayCloudStyle, { top: 98, transform: [{ translateX: dayCloud1 }], opacity: 0.58 }]} />
          <Animated.View style={[dayCloudStyle, { top: 158, transform: [{ translateX: dayCloud2 }], opacity: 0.5 }]} />
          <Animated.View style={[dayCloudStyle, { top: 218, transform: [{ translateX: dayCloud3 }], opacity: 0.42 }]} />
        </>
      )}
    </View>
  );
}

function TwinkleStar({ left, top, size, delay }) {
  const opacity = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    twinkle.start();
    return () => twinkle.stop();
  }, [delay, opacity]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(255,255,255,0.95)",
        opacity,
      }}
    />
  );
}

const dayCloudStyle = {
  position: "absolute",
  left: 0,
  width: 180,
  height: 54,
  borderRadius: 27,
  backgroundColor: "rgba(255,255,255,0.46)",
};

function makeStyles() {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: T.voidBg },
    scene: { flex: 1 },
    scrollView: { flex: 1, zIndex: 2 },
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
      backgroundColor: T.mode === "light" ? "rgba(212,175,55,0.18)" : "rgba(212,175,55,0.14)",
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
