import React, { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getProducts } from "../api";
import { EmptyState, HeroBand, ListRowCard, LoadingCenter, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

export default function ProductsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getProducts({ limit: "100" });
      setItems(data.products || []);
    } catch (e) {
      Alert.alert("Products", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && items.length === 0) return <LoadingCenter label="Loading catalog…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={items}
      keyExtractor={(p) => String(p.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="INVENTORY">
            <PageHeader title="Products" subtitle="SKU, stock on hand & pricing" />
          </HeroBand>
        </View>
      }
      renderItem={({ item }) => (
        <ListRowCard
          title={item.name}
          subtitle={`SKU ${item.sku || "—"}`}
          meta={`Stock ${item.current_stock ?? 0} · ${fmtInr(item.unit_price)}`}
          badge={Number(item.current_stock) <= Number(item.minimum_stock || 0) ? "Low" : "OK"}
          badgeColor={Number(item.current_stock) <= Number(item.minimum_stock || 0) ? T.rose : T.emerald}
        />
      )}
      ListEmptyComponent={<EmptyState message="No products" />}
    />
  );
}
