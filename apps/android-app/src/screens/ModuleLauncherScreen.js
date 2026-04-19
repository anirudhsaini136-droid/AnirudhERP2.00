import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getMe } from "../api";
import { HeroBand, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { getLauncherItems } from "../utils/menu";
import { TRIAL_UPGRADE_MESSAGE } from "../utils/trialAccess";

export default function ModuleLauncherScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [biz, setBiz] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await getMe();
      setUser(res.user);
      setBiz(res.business);
    } catch (e) {
      Alert.alert("Session error", e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const role = user?.role || "staff";
  const items = getLauncherItems(role, biz);

  return (
    <View style={{ flex: 1, backgroundColor: T.screenBg }}>
      <FlatList
        contentContainerStyle={[S.scrollContent, { paddingTop: 8 }]}
        data={items}
        keyExtractor={(it) => it.key}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.gold} />}
        ListHeaderComponent={
          <HeroBand eyebrow="NEXA">
            <PageHeader
              title={`Hello, ${user?.first_name || "there"}`}
              subtitle={biz?.name ? `${biz.name} · ${String(role).replace(/_/g, " ")}` : String(role).replace(/_/g, " ")}
            />
          </HeroBand>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tile, item.trialLocked && styles.tileLocked]}
            activeOpacity={0.88}
            onPress={() => {
              if (item.trialLocked) {
                Alert.alert("Trial limit", TRIAL_UPGRADE_MESSAGE);
                return;
              }
              navigation.navigate(item.screen);
            }}
          >
            <Text style={styles.tileLabel}>{item.label}</Text>
            {item.trialLocked ? <Text style={styles.lockHint}>Locked · trial</Text> : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, marginBottom: 10 },
  tile: {
    flex: 1,
    minHeight: 88,
    backgroundColor: T.cardBg,
    borderRadius: 16,
    padding: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  tileLabel: { color: T.textPrimary, fontWeight: "700", fontSize: 14 },
  tileLocked: { opacity: 0.72, borderColor: "rgba(245,158,11,0.35)" },
  lockHint: { color: "#f59e0b", fontSize: 11, fontWeight: "700", marginTop: 6 },
});
