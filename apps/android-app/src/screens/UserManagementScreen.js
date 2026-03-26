import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { deleteDashboardUser, getDashboardUsers, putDashboardUserStatus } from "../api";
import { EmptyState, HeroBand, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDashboardUsers();
      setUsers(res.users || []);
    } catch (e) {
      Alert.alert("Users", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = (u, activate) => {
    Alert.alert(activate ? "Activate user?" : "Deactivate user?", u.email, [
      { text: "Cancel", style: "cancel" },
      {
        text: "OK",
        onPress: async () => {
          try {
            await putDashboardUserStatus(u.id, activate);
            load();
          } catch (e) {
            Alert.alert("Users", e.message);
          }
        },
      },
    ]);
  };

  const remove = (u) => {
    Alert.alert("Remove user?", u.email, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDashboardUser(u.id);
            load();
          } catch (e) {
            Alert.alert("Users", e.message);
          }
        },
      },
    ]);
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={users}
      keyExtractor={(u) => String(u.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="BUSINESS">
            <PageHeader title="Manage users" subtitle="Team access for your business" />
          </HeroBand>
        </View>
      }
      renderItem={({ item }) => (
        <View style={S.card}>
          <Text style={{ color: T.textPrimary, fontWeight: "700" }}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={S.row}>{item.email}</Text>
          <Text style={S.muted}>{item.role} · {item.is_active ? "active" : "inactive"}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <TouchableOpacity style={S.btnSecondary} onPress={() => toggle(item, !item.is_active)}>
              <Text style={S.btnSecondaryText}>{item.is_active ? "Deactivate" : "Activate"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.btnSecondary, { borderColor: T.rose }]} onPress={() => remove(item)}>
              <Text style={[S.btnSecondaryText, { color: T.rose }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={!loading ? <EmptyState message="No users" /> : null}
    />
  );
}
