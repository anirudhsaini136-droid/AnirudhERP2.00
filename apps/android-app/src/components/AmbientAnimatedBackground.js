import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import * as T from "../theme/tokens";

function TwinkleStar({ left, top, size, delay, tone = "cool" }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.95, duration: 820, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.08, duration: 820, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.28, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.9, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity, scale]);

  const coreColor = tone === "warm" ? "rgba(255,240,190,0.95)" : "rgba(235,244,255,0.96)";
  const haloColor = tone === "warm" ? "rgba(255,210,120,0.24)" : "rgba(120,180,255,0.18)";

  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        top,
        opacity,
        transform: [{ scale }],
      }}
    >
      <View
        style={{
          position: "absolute",
          left: -(size * 0.9),
          top: -(size * 0.9),
          width: size * 2.8,
          height: size * 2.8,
          borderRadius: size * 1.4,
          backgroundColor: haloColor,
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: coreColor,
        }}
      />
    </Animated.View>
  );
}

function Cloud({ style, opacity = 1 }) {
  return (
    <Animated.View style={[styles.cloudWrap, style, { opacity }]}>
      <View style={styles.cloudPuffA} />
      <View style={styles.cloudPuffB} />
      <View style={styles.cloudPuffC} />
      <View style={styles.cloudPuffD} />
      <View style={styles.cloudBase} />
    </Animated.View>
  );
}

export default function AmbientAnimatedBackground() {
  const isDark = T.mode !== "light";
  const { width, height } = useWindowDimensions();
  const dayGlowScale = useRef(new Animated.Value(1)).current;
  const cloud1 = useRef(new Animated.Value(-220)).current;
  const cloud2 = useRef(new Animated.Value(-300)).current;
  const cloud3 = useRef(new Animated.Value(-160)).current;
  const shootX = useRef(new Animated.Value(-220)).current;
  const shootY = useRef(new Animated.Value(120)).current;
  const shootOpacity = useRef(new Animated.Value(0)).current;
  const shootBurst = useRef(new Animated.Value(0)).current;
  const shootCoreScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (isDark) return undefined;

    const sunPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dayGlowScale, { toValue: 1.08, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(dayGlowScale, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const cloudAnim = (val, startX, duration, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: width + 220, duration, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(val, { toValue: startX, duration: 1, useNativeDriver: true }),
        ])
      );

    const c1 = cloudAnim(cloud1, -220, 16000);
    const c2 = cloudAnim(cloud2, -300, 20500, 1000);
    const c3 = cloudAnim(cloud3, -160, 18000, 2100);
    sunPulse.start();
    c1.start();
    c2.start();
    c3.start();
    return () => {
      sunPulse.stop();
      c1.stop();
      c2.stop();
      c3.stop();
    };
  }, [isDark, width, dayGlowScale, cloud1, cloud2, cloud3]);

  useEffect(() => {
    if (!isDark) return undefined;
    let cancelled = false;
    let timer = null;
    const runShoot = () => {
      if (cancelled) return;
      const startX = Math.max(width - 40 - Math.random() * 120, 120);
      const endX = Math.max(startX - (70 + Math.random() * 90), 24);
      shootX.setValue(startX);
      shootY.setValue(-36);
      shootOpacity.setValue(0);
      shootBurst.setValue(0);
      shootCoreScale.setValue(0.9);
      Animated.sequence([
        Animated.delay(1300 + Math.random() * 2600),
        Animated.parallel([
          Animated.timing(shootOpacity, { toValue: 0.86, duration: 520, useNativeDriver: true }),
          Animated.timing(shootCoreScale, { toValue: 1.15, duration: 520, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(shootX, { toValue: endX, duration: 3400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(shootY, { toValue: 320 + Math.random() * 170, duration: 3400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(shootBurst, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(shootCoreScale, { toValue: 1.55, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(shootOpacity, { toValue: 0.18, duration: 260, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(shootBurst, { toValue: 0, duration: 430, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(shootOpacity, { toValue: 0, duration: 430, useNativeDriver: true }),
        ]),
      ]).start(() => {
        if (!cancelled) timer = setTimeout(runShoot, 4200 + Math.random() * 5200);
      });
    };
    runShoot();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isDark, width, shootX, shootY, shootOpacity, shootBurst, shootCoreScale]);

  const stars = [
    { x: 0.08, y: 0.08, s: 2.2, d: 0, tone: "cool" },
    { x: 0.16, y: 0.2, s: 1.7, d: 260, tone: "cool" },
    { x: 0.28, y: 0.1, s: 2.4, d: 720, tone: "warm" },
    { x: 0.38, y: 0.16, s: 1.9, d: 580, tone: "cool" },
    { x: 0.48, y: 0.12, s: 1.5, d: 430, tone: "cool" },
    { x: 0.56, y: 0.09, s: 2.6, d: 1020, tone: "warm" },
    { x: 0.66, y: 0.2, s: 1.8, d: 1320, tone: "cool" },
    { x: 0.73, y: 0.14, s: 1.6, d: 1490, tone: "cool" },
    { x: 0.78, y: 0.1, s: 2.1, d: 860, tone: "warm" },
    { x: 0.9, y: 0.18, s: 1.9, d: 1680, tone: "cool" },
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {isDark ? (
        <>
          {stars.map((s, i) => (
            <TwinkleStar key={`s-${i}`} left={s.x * width} top={s.y * height} size={s.s} delay={s.d} tone={s.tone} />
          ))}
          <Animated.View
            style={{
              position: "absolute",
              opacity: shootOpacity,
              transform: [{ translateX: shootX }, { translateY: shootY }, { rotate: "112deg" }],
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 12,
                position: "absolute",
                left: -7,
                top: -7,
                backgroundColor: "rgba(255,215,120,0.28)",
              }}
            />
            <Animated.View
              style={{
                width: 8,
                height: 8,
                borderRadius: 6,
                backgroundColor: "rgba(255,248,225,0.99)",
                transform: [{ scale: shootCoreScale }],
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 2.2,
                left: -18,
                width: 16,
                height: 3,
                borderRadius: 3,
                backgroundColor: "rgba(255,238,185,0.42)",
              }}
            />
            <Animated.View
              style={{
                position: "absolute",
                left: -14,
                top: -14,
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
                opacity: shootBurst,
                transform: [{ scale: shootBurst.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.15] }) }],
              }}
            >
              <View
                style={{
                  position: "absolute",
                  width: 22,
                  height: 2,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,246,210,0.9)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  width: 2,
                  height: 22,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,246,210,0.9)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  width: 16,
                  height: 1.8,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,230,170,0.72)",
                  transform: [{ rotate: "45deg" }],
                }}
              />
              <View
                style={{
                  position: "absolute",
                  width: 16,
                  height: 1.8,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,230,170,0.72)",
                  transform: [{ rotate: "-45deg" }],
                }}
              />
            </Animated.View>
          </Animated.View>
        </>
      ) : (
        <>
          <View style={styles.lightSkyTint} />
          <Animated.View style={[styles.sunGlow, { transform: [{ scale: dayGlowScale }] }]} />
          <Cloud style={{ top: 88, transform: [{ translateX: cloud1 }] }} opacity={0.7} />
          <Cloud style={{ top: 152, transform: [{ translateX: cloud2 }] }} opacity={0.6} />
          <Cloud style={{ top: 218, transform: [{ translateX: cloud3 }] }} opacity={0.54} />
          <Animated.View style={[styles.lightOrb, { top: 132, left: 28, transform: [{ translateX: cloud2 }] }]} />
          <Animated.View style={[styles.lightOrb, { top: 242, right: 18, opacity: 0.3, transform: [{ translateX: cloud1 }] }]} />
        </>
      )}
      <View style={[styles.readabilityLayer, isDark ? styles.readabilityDark : styles.readabilityLight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  sunGlow: {
    position: "absolute",
    top: 40,
    right: 12,
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: "rgba(250,204,21,0.40)",
  },
  lightSkyTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(186,220,255,0.20)",
  },
  cloudWrap: {
    position: "absolute",
    left: 0,
    width: 220,
    height: 76,
  },
  cloudBase: {
    position: "absolute",
    left: 18,
    right: 16,
    bottom: 8,
    height: 34,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.62)",
  },
  cloudPuffA: {
    position: "absolute",
    left: 20,
    top: 28,
    width: 46,
    height: 46,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.62)",
  },
  cloudPuffB: {
    position: "absolute",
    left: 52,
    top: 18,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.66)",
  },
  cloudPuffC: {
    position: "absolute",
    left: 98,
    top: 12,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  cloudPuffD: {
    position: "absolute",
    left: 148,
    top: 26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.62)",
  },
  lightOrb: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(110,185,255,0.18)",
  },
  readabilityLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  readabilityLight: { backgroundColor: "rgba(248,250,252,0.50)" },
  readabilityDark: { backgroundColor: "rgba(2,6,23,0.60)" },
});

