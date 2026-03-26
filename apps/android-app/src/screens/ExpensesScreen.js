import React, { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getExpenses } from "../api";
import { EmptyState, HeroBand, ListRowCard, LoadingCenter, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

export default function ExpensesScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getExpenses({ limit: "50" });
      setItems(data.expenses || data.items || []);
    } catch (e) {
      Alert.alert("Expenses", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && items.length === 0) return <LoadingCenter label="Loading expenses…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={items}
      keyExtractor={(x, i) => String(x.id || i)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="FINANCE">
            <PageHeader title="Expenses" subtitle="Operating spend & approvals" />
          </HeroBand>
        </View>
      }
      renderItem={({ item }) => (
        <ListRowCard
          title={item.description || item.title || "Expense"}
          subtitle={item.category || item.vendor_name || ""}
          meta={`${fmtInr(item.amount)} · ${item.status || "—"}`}
          badge={item.status}
          badgeColor={T.sapphire}
        />
      )}
      ListEmptyComponent={<EmptyState message="No expenses" />}
    />
  );
}
