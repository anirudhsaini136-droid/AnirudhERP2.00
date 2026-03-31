import React from "react";
import { Alert, AppState, Pressable, Text, View, ActivityIndicator } from "react-native";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  createNavigationContainerRef,
  CommonActions,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ShellProvider, useShell } from "./context/ShellContext";
import WebSidebar from "./components/WebSidebar";
import { screenTitleForRoute } from "./navigation/navConfig";
import {
  getTrialAwareInitialScreen,
  shouldApplyTrialModuleLock,
  TRIAL_UNLOCKED_SCREENS,
  TRIAL_UPGRADE_MESSAGE,
} from "./utils/trialAccess";
import { THEME_PREFS, ThemeProvider, useTheme } from "./theme/ThemeProvider";

import LoginScreen from "./screens/LoginScreen";
import BusinessOverviewScreen from "./screens/BusinessOverviewScreen";
import FinanceDashboardScreen from "./screens/FinanceDashboardScreen";
import InvoicesScreen from "./screens/InvoicesScreen";
import InvoiceDetailScreen from "./screens/InvoiceDetailScreen";
import InvoiceCreateScreen from "./screens/InvoiceCreateScreen";
import CustomersScreen from "./screens/CustomersScreen";
import CustomerLedgerScreen from "./screens/CustomerLedgerScreen";
import GstScreen from "./screens/GstScreen";
import ExpensesScreen from "./screens/ExpensesScreen";
import InventoryDashboardScreen from "./screens/InventoryDashboardScreen";
import ProductsScreen from "./screens/ProductsScreen";
import PurchasesScreen from "./screens/PurchasesScreen";
import PurchaseDetailScreen from "./screens/PurchaseDetailScreen";
import HrDashboardScreen from "./screens/HrDashboardScreen";
import EmployeesScreen from "./screens/EmployeesScreen";
import SuperAdminDashboardScreen from "./screens/SuperAdminDashboardScreen";
import SuperAdminBusinessesScreen from "./screens/SuperAdminBusinessesScreen";
import SuperAdminBusinessDetailScreen from "./screens/SuperAdminBusinessDetailScreen";
import AccountingScreen from "./screens/AccountingScreen";
import ProfileScreen from "./screens/ProfileScreen";
import HrAttendanceScreen from "./screens/HrAttendanceScreen";
import HrLeaveScreen from "./screens/HrLeaveScreen";
import HrPayrollScreen from "./screens/HrPayrollScreen";
import FinanceReportsScreen from "./screens/FinanceReportsScreen";
import DataMigrationScreen from "./screens/DataMigrationScreen";
import QuickBillScreen from "./screens/QuickBillScreen";
import CaPortalScreen from "./screens/CaPortalScreen";
import StaffHomeScreen from "./screens/StaffHomeScreen";
import StaffAttendanceScreen from "./screens/StaffAttendanceScreen";
import StaffLeaveScreen from "./screens/StaffLeaveScreen";
import StaffPayslipsScreen from "./screens/StaffPayslipsScreen";
import StaffProfileScreen from "./screens/StaffProfileScreen";
import UserManagementScreen from "./screens/UserManagementScreen";
import BusinessSettingsScreen from "./screens/BusinessSettingsScreen";
import PlatformSettingsScreen from "./screens/PlatformSettingsScreen";
import TrialUpgradeScreen from "./screens/TrialUpgradeScreen";

const Stack = createNativeStackNavigator();

export const navigationRef = createNavigationContainerRef();

function AppHeaderLeft(props) {
  const { openDrawer } = useShell();
  const { tokens: T } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Pressable onPress={openDrawer} style={{ paddingHorizontal: 6, paddingVertical: 8 }} hitSlop={12}>
        <Text style={{ color: T.textPrimary, fontSize: 22, fontWeight: "300" }}>☰</Text>
      </Pressable>
    </View>
  );
}

function AppHeaderRight() {
  const { tokens: T, pref, setThemePref } = useTheme();
  const icon = pref === THEME_PREFS.light ? "☀" : pref === THEME_PREFS.dark ? "🌙" : "◐";
  const openThemeMenu = () => {
    Alert.alert("Theme", "Choose appearance mode", [
      { text: "System", onPress: () => setThemePref(THEME_PREFS.system) },
      { text: "Light", onPress: () => setThemePref(THEME_PREFS.light) },
      { text: "Dark", onPress: () => setThemePref(THEME_PREFS.dark) },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  return (
    <Pressable onPress={openThemeMenu} style={{ paddingHorizontal: 12, paddingVertical: 8 }} hitSlop={12}>
      <Text style={{ color: T.textPrimary, fontSize: 16, fontWeight: "700" }}>{icon}</Text>
    </Pressable>
  );
}

function AuthedStack() {
  const { user, business } = useAuth();
  const { tokens: T } = useTheme();
  const initial = getTrialAwareInitialScreen(user?.role, business);

  const screenOptions = {
    headerStyle: { backgroundColor: T.cardBg },
    headerTintColor: T.textPrimary,
    headerTitleStyle: { fontWeight: "700" },
    contentStyle: { backgroundColor: T.screenBg },
    headerLeft: (p) => <AppHeaderLeft {...p} />,
    headerRight: () => <AppHeaderRight />,
  };

  return (
    <>
      <Stack.Navigator
        initialRouteName={initial}
        screenOptions={({ route }) => ({
          ...screenOptions,
          title: screenTitleForRoute(route.name),
        })}
      >
        <Stack.Screen name="TrialUpgrade" component={TrialUpgradeScreen} />
        <Stack.Screen name="BusinessDashboard" component={BusinessOverviewScreen} />
        <Stack.Screen name="UserManagement" component={UserManagementScreen} />
        <Stack.Screen name="BusinessSettings" component={BusinessSettingsScreen} />
        <Stack.Screen name="HrDashboard" component={HrDashboardScreen} />
        <Stack.Screen name="Employees" component={EmployeesScreen} />
        <Stack.Screen name="HrAttendance" component={HrAttendanceScreen} />
        <Stack.Screen name="HrLeave" component={HrLeaveScreen} />
        <Stack.Screen name="HrPayroll" component={HrPayrollScreen} />
        <Stack.Screen name="FinanceDashboard" component={FinanceDashboardScreen} />
        <Stack.Screen name="Invoices" component={InvoicesScreen} />
        <Stack.Screen name="InvoiceCreate" component={InvoiceCreateScreen} />
        <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
        <Stack.Screen name="Customers" component={CustomersScreen} />
        <Stack.Screen name="CustomerLedger" component={CustomerLedgerScreen} />
        <Stack.Screen name="DataMigration" component={DataMigrationScreen} />
        <Stack.Screen name="Expenses" component={ExpensesScreen} />
        <Stack.Screen name="FinanceReports" component={FinanceReportsScreen} />
        <Stack.Screen name="Gst" component={GstScreen} />
        <Stack.Screen name="Accounting" component={AccountingScreen} />
        <Stack.Screen name="Purchases" component={PurchasesScreen} />
        <Stack.Screen name="PurchaseDetail" component={PurchaseDetailScreen} />
        <Stack.Screen name="InventoryDashboard" component={InventoryDashboardScreen} />
        <Stack.Screen name="Products" component={ProductsScreen} />
        <Stack.Screen name="QuickBill" component={QuickBillScreen} />
        <Stack.Screen name="CaPortal" component={CaPortalScreen} />
        <Stack.Screen name="StaffHome" component={StaffHomeScreen} />
        <Stack.Screen name="StaffAttendance" component={StaffAttendanceScreen} />
        <Stack.Screen name="StaffLeave" component={StaffLeaveScreen} />
        <Stack.Screen name="StaffPayslips" component={StaffPayslipsScreen} />
        <Stack.Screen name="StaffProfile" component={StaffProfileScreen} />
        <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} />
        <Stack.Screen name="SuperAdminBusinesses" component={SuperAdminBusinessesScreen} />
        <Stack.Screen
          name="SuperAdminBusinessDetail"
          component={SuperAdminBusinessDetailScreen}
          options={({ route }) => ({ title: route.params?.title || "Business" })}
        />
        <Stack.Screen name="PlatformSettings" component={PlatformSettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
      <WebSidebar />
    </>
  );
}

function RootNavigator() {
  const { ready, authed, profileLoading, user } = useAuth();
  const { tokens: T } = useTheme();

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: T.screenBg }}>
        <ActivityIndicator size="large" color={T.gold} />
      </View>
    );
  }

  if (!authed) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: T.screenBg },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  if (profileLoading || !user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: T.screenBg }}>
        <ActivityIndicator size="large" color={T.gold} />
      </View>
    );
  }

  return (
    <ShellProvider>
      <AuthedStack />
    </ShellProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ThemedNavigation />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedNavigation() {
  const { tokens: T, effectiveMode } = useTheme();
  const { user, business } = useAuth();
  const insets = useSafeAreaInsets();
  const checkingRef = React.useRef(false);
  const trialNavGen = React.useRef(0);
  const [otaStatus, setOtaStatus] = React.useState("idle"); // idle | downloading | ready

  const onTrialNavStateChange = React.useCallback(() => {
    if (!navigationRef.isReady()) return;
    const role = user?.role;
    const name = navigationRef.getCurrentRoute()?.name;
    if (!name || !shouldApplyTrialModuleLock(business, role)) return;
    if (TRIAL_UNLOCKED_SCREENS.has(name)) return;
    const my = ++trialNavGen.current;
    requestAnimationFrame(() => {
      if (my !== trialNavGen.current) return;
      const safe = getTrialAwareInitialScreen(role, business);
      navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: safe }] }));
      Alert.alert("Trial limit", TRIAL_UPGRADE_MESSAGE);
    });
  }, [user, business]);

  const checkForOtaUpdate = React.useCallback(async () => {
    if (__DEV__ || checkingRef.current || otaStatus === "ready") return;
    checkingRef.current = true;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setOtaStatus("downloading");
        try {
          await Updates.fetchUpdateAsync();
          setOtaStatus("ready");
        } catch {
          setOtaStatus("idle");
        }
      }
    } catch {
      // Ignore update check failures silently.
    } finally {
      checkingRef.current = false;
    }
  }, [otaStatus]);

  React.useEffect(() => {
    checkForOtaUpdate();
  }, [checkForOtaUpdate]);

  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkForOtaUpdate();
    });
    return () => sub.remove();
  }, [checkForOtaUpdate]);

  const base = effectiveMode === "light" ? DefaultTheme : DarkTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: T.screenBg,
      card: T.cardBg,
      primary: T.gold,
      text: T.textPrimary,
      border: T.border,
    },
  };
  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        key={`nav-${effectiveMode}`}
        theme={navTheme}
        onStateChange={onTrialNavStateChange}
      >
        <RootNavigator />
      </NavigationContainer>
      {otaStatus !== "idle" && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: Math.max(insets.top, 8),
            left: 12,
            right: 12,
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: T.cardBg,
              borderWidth: 1.2,
              borderColor: otaStatus === "ready" ? T.gold : T.border,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: T.gold,
              shadowOpacity: otaStatus === "ready" ? 0.24 : 0.14,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Text style={{ color: T.textPrimary, fontWeight: "800", flex: 1, marginRight: 10 }}>
              {otaStatus === "downloading" ? "Update downloading..." : "Update ready! Restart to apply"}
            </Text>
            {otaStatus === "ready" ? (
              <Pressable
                onPress={async () => {
                  try {
                    await Updates.reloadAsync();
                  } catch {
                    Alert.alert("Update", "Could not restart right now. Please try again.");
                  }
                }}
                style={{
                  backgroundColor: "#d4a017",
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                  alignItems: "center",
                  shadowColor: "#d4a017",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Text style={{ color: "#000000", fontWeight: "700", fontSize: 15 }}>Restart</Text>
              </Pressable>
            ) : (
              <ActivityIndicator size="small" color={T.gold} />
            )}
          </View>
        </View>
      )}
    </>
  );
}
