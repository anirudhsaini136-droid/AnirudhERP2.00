import React, { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getEmployees } from "../api";
import { EmptyState, HeroBand, ListRowCard, LoadingCenter, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function EmployeesScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getEmployees({ limit: "100" });
      setItems(data.employees || []);
    } catch (e) {
      Alert.alert("Employees", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && items.length === 0) return <LoadingCenter label="Loading team…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={items}
      keyExtractor={(e) => String(e.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="HR">
            <PageHeader title="Employees" subtitle="Directory & employment status" />
          </HeroBand>
        </View>
      }
      renderItem={({ item }) => (
        <ListRowCard
          title={`${item.first_name || ""} ${item.last_name || ""}`.trim()}
          subtitle={`${item.department || "—"} · ${item.job_title || "—"}`}
          meta={String(item.status ?? "")}
          badge={String(item.status ?? "active")}
          badgeColor={item.status === "terminated" ? T.rose : T.emerald}
        />
      )}
      ListEmptyComponent={<EmptyState message="No employees" />}
    />
  );
}
