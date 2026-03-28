import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getSuperAdminSettings, putSuperAdminSetting } from "../api";
import { HeroBand, PageHeader } from "../components/NexusUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function PlatformSettingsScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSuperAdminSettings();
      const s = res.settings || res || {};
      setEntries(Object.keys(s).map((k) => ({ key: k, value: String(s[k]) })));
    } catch (e) {
      Alert.alert("Platform", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: T.screenBg }}
      contentContainerStyle={S.scrollContent}
      data={entries}
      keyExtractor={(r) => r.key}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.gold} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <HeroBand eyebrow="PLATFORM">
            <PageHeader title="Platform settings" subtitle="Global NexaERP keys" />
          </HeroBand>
        </View>
      }
      renderItem={({ item }) => (
        <View style={S.card}>
          <Text style={{ color: T.gold, fontSize: 12, fontWeight: "700" }}>{item.key}</Text>
          <Text style={[S.row, { marginTop: 6 }]} selectable>
            {item.value && item.value.trim() ? item.value : "Not set"}
          </Text>
          <TouchableOpacity
            style={[S.btnSecondary, { marginTop: 10 }]}
            onPress={() => {
              setEditKey(item.key);
              setEditValue(item.value && item.value !== "null" ? item.value : "");
            }}
          >
            <Text style={S.btnSecondaryText}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={!loading ? <Text style={S.muted}>No settings</Text> : null}
      ListFooterComponent={
        editKey ? (
          <View style={[S.card, { marginTop: 8 }]}>
            <Text style={{ color: T.gold, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>{editKey}</Text>
            <TextInput
              style={S.input}
              placeholder="Setting value"
              placeholderTextColor={T.textMuted}
              value={editValue}
              onChangeText={setEditValue}
            />
            <TouchableOpacity
              style={[S.btnPrimary, saving && { opacity: 0.6 }]}
              disabled={saving}
              onPress={async () => {
                try {
                  setSaving(true);
                  await putSuperAdminSetting(editKey, editValue);
                  setEditKey("");
                  setEditValue("");
                  load();
                } catch (e) {
                  Alert.alert("Platform", e.message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Text style={S.btnPrimaryText}>{saving ? "Saving..." : "Save setting"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.btnSecondary} onPress={() => { setEditKey(""); setEditValue(""); }}>
              <Text style={S.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
    />
  );
}
