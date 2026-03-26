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
import { HeroBand, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { getLauncherItems } from "../utils/menu";

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
  const items = getLauncherItems(role);

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
          <HeroBand eyebrow="NEXUS">
            <PageHeader
              title={`Hello, ${user?.first_name || "there"}`}
              subtitle={biz?.name ? `${biz.name} · ${String(role).replace(/_/g, " ")}` : String(role).replace(/_/g, " ")}
            />
          </HeroBand>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tile}
            activeOpacity={0.88}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.tileLabel}>{item.label}</Text>
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
});
