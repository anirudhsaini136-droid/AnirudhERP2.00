import React from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions, useNavigation, useNavigationState } from "@react-navigation/native";
import { TRIAL_UPGRADE_MESSAGE } from "../utils/trialAccess";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useShell } from "../context/ShellContext";
import { getNavForUser } from "../navigation/navConfig";
import { useTheme } from "../theme/ThemeProvider";

const WIDTH = Math.min(300, Dimensions.get("window").width * 0.88);

function selectFocusRouteName(state) {
  if (!state) return undefined;
  let route = state.routes[state.index];
  while (route?.state?.routes && route.state.index != null) {
    route = route.state.routes[route.state.index];
  }
  return route?.name;
}

export default function WebSidebar() {
  const { tokens: T } = useTheme();
  const styles = React.useMemo(() => makeStyles(T), [T]);
  const { drawerOpen, closeDrawer } = useShell();
  const navigation = useNavigation();
  const routeName = useNavigationState(selectFocusRouteName);
  const { user, business, signOut, impersonating, endImpersonation } = useAuth();
  const insets = useSafeAreaInsets();
  const slide = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(slide, {
      toValue: drawerOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, slide]);

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [-WIDTH, 0] });
  const { title, items } = getNavForUser(user, business);
  const focusRouteName = routeName || items?.[0]?.screen;

  const go = (screen, params) => {
    closeDrawer();
    navigation.navigate(screen, params);
  };

  const exitImpersonationSession = () => {
    Alert.alert(
      "Return to super admin",
      "You will leave this business workspace and restore your platform admin session.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          async onPress() {
            try {
              await endImpersonation();
              closeDrawer();
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "SuperAdminDashboard" }] }));
            } catch (e) {
              Alert.alert("Session", e?.message || "Could not restore super admin session");
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={drawerOpen} animationType="none" transparent onRequestClose={closeDrawer}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        <Animated.View
          style={[
            styles.drawer,
            {
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 12,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetter}>N</Text>
            </View>
            <Text style={styles.logoText}>NexaERP</Text>
          </View>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{title}</Text>
          </View>

          {impersonating ? (
            <View style={styles.impersonationBanner}>
              <Text style={styles.impersonationTitle}>Viewing as business</Text>
              <Text style={styles.impersonationBiz} numberOfLines={2}>
                {business?.name || "Tenant"}
              </Text>
              <TouchableOpacity style={styles.impersonationBtn} onPress={exitImpersonationSession} activeOpacity={0.88}>
                <Text style={styles.impersonationBtnTx}>Back to super admin</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
            {items.map((item) => {
              const active = focusRouteName === item.screen;
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[styles.navRow, active && styles.navRowActive, item.trialLocked && { opacity: 0.65 }]}
                  onPress={() => {
                    if (item.trialLocked) {
                      closeDrawer();
                      Alert.alert("Trial limit", TRIAL_UPGRADE_MESSAGE);
                      return;
                    }
                    go(item.screen);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
                  {item.trialLocked ? (
                    <Text style={{ color: "#f59e0b", fontSize: 11, fontWeight: "700" }}>LOCK</Text>
                  ) : null}
                  {!item.trialLocked && item.newBadge && !active ? (
                    <View style={styles.newPill}>
                      <Text style={styles.newPillText}>NEW</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.navRowMuted} onPress={() => go("Profile")} activeOpacity={0.85}>
              <Text style={styles.navLabelMuted}>Account</Text>
            </TouchableOpacity>
          </ScrollView>

          {business ? (
            <View style={styles.bizFoot}>
              <Text style={styles.bizName} numberOfLines={1}>
                {business.name}
              </Text>
              <Text style={styles.bizPlan}>
                {(business.plan || "").toUpperCase()}
                {business.days_remaining != null ? ` · ${business.days_remaining}d left` : ""}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.logout} onPress={() => { closeDrawer(); signOut(); }}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(T) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
    drawer: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: WIDTH,
      backgroundColor: T.voidBg,
      borderRightWidth: 1,
      borderRightColor: T.mode === "light" ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.06)",
      paddingHorizontal: 12,
    },
    logoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, marginBottom: 16 },
    logoBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: T.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    logoLetter: { color: "#111", fontWeight: "900", fontSize: 14 },
    logoText: { color: T.textPrimary, fontSize: 18, fontWeight: "700", marginLeft: 10, letterSpacing: -0.3 },
    roleBadge: {
      marginHorizontal: 4,
      marginBottom: 12,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: T.mode === "light" ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.03)",
      borderWidth: 1,
      borderColor: T.mode === "light" ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.06)",
    },
    roleBadgeText: { color: T.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
    impersonationBanner: {
      marginHorizontal: 4,
      marginBottom: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: "rgba(212,175,55,0.1)",
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.22)",
    },
    impersonationTitle: { color: T.gold, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
    impersonationBiz: { color: T.textPrimary, fontSize: 14, fontWeight: "700", marginTop: 6 },
    impersonationBtn: {
      marginTop: 12,
      paddingVertical: 11,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: T.gold,
    },
    impersonationBtnTx: { color: "#111", fontWeight: "800", fontSize: 13 },
    navScroll: { flex: 1 },
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 4,
    },
    navRowActive: {
      backgroundColor: "rgba(212,175,55,0.12)",
      borderLeftWidth: 2,
      borderLeftColor: T.gold,
    },
    navLabel: { color: T.textSecondary, fontSize: 14, fontWeight: "600", flex: 1 },
    navLabelActive: { color: T.gold },
    newPill: {
      backgroundColor: "rgba(16,185,129,0.18)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "rgba(16,185,129,0.35)",
    },
    newPillText: { color: T.emerald, fontSize: 9, fontWeight: "800" },
    navRowMuted: { paddingVertical: 12, paddingHorizontal: 12, marginTop: 8 },
    navLabelMuted: { color: T.textMuted, fontSize: 13 },
    bizFoot: {
      borderTopWidth: 1,
      borderTopColor: T.mode === "light" ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.06)",
      paddingTop: 12,
      paddingHorizontal: 8,
    },
    bizName: { color: T.textSecondary, fontSize: 12 },
    bizPlan: { color: T.textMuted, fontSize: 11, marginTop: 4 },
    logout: {
      marginTop: 12,
      paddingVertical: 14,
      alignItems: "center",
      borderRadius: 12,
      backgroundColor: "rgba(244,63,94,0.08)",
      borderWidth: 1,
      borderColor: "rgba(244,63,94,0.2)",
    },
    logoutText: { color: T.rose, fontWeight: "700" },
  });
}
