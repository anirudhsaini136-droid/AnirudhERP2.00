import React, { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getPurchases } from "../api";
import { EmptyState, HeroBand, ListRowCard, LoadingCenter, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

export default function PurchasesScreen({ navigation }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getPurchases({ limit: "50" });
      setBills(data.bills || []);
    } catch (e) {
      Alert.alert("Purchases", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && bills.length === 0) return <LoadingCenter label="Loading bills…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={bills}
      keyExtractor={(b) => String(b.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="PROCUREMENT">
            <PageHeader title="Purchases" subtitle="Vendor bills & ITC trail" />
          </HeroBand>
        </View>
      }
      renderItem={({ item }) => (
        <ListRowCard
          title={item.bill_number || String(item.id)}
          subtitle={item.vendor_name || "—"}
          meta={fmtInr(item.total_amount)}
          badge={item.status}
          badgeColor={T.gold}
          onPress={() => navigation.navigate("PurchaseDetail", { billId: item.id })}
        />
      )}
      ListEmptyComponent={<EmptyState message="No purchase bills" />}
    />
  );
}
