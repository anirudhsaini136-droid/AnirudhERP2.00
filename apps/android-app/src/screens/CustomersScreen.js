import React, { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getCustomers } from "../api";
import { EmptyState, HeroBand, ListRowCard, LoadingCenter, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { fmtInr } from "../utils/format";

export default function CustomersScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getCustomers({ limit: "100" });
      setRows(data.customers || []);
    } catch (e) {
      Alert.alert("Customers", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && rows.length === 0) return <LoadingCenter label="Loading ledger…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={rows}
      keyExtractor={(c, i) => (c.name || "") + String(i)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="FINANCE">
            <PageHeader title="Customer ledger" subtitle="Outstanding balances by client" />
          </HeroBand>
        </View>
      }
      renderItem={({ item }) => (
        <ListRowCard
          title={item.name}
          subtitle={`${item.invoice_count ?? 0} invoices`}
          meta={`Outstanding ${fmtInr(item.total_outstanding)}`}
          badge="Ledger"
          onPress={() => navigation.navigate("CustomerLedger", { clientName: item.name })}
        />
      )}
      ListEmptyComponent={<EmptyState message="No customers" />}
    />
  );
}
