import React from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { HeroBand, PageHeader } from "../components/NexusUi";
import { API_BASE } from "../api";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";

export default function DataMigrationScreen() {
  const openWeb = () => {
    const origin = API_BASE.replace(/\/api\/?$/, "");
    Linking.openURL(origin).catch(() => {});
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.screenBg }} contentContainerStyle={S.scrollContent}>
      <HeroBand eyebrow="DATA">
        <PageHeader title="Import data" subtitle="Bulk migration from Excel / ZIP templates" />
      </HeroBand>
      <View style={S.card}>
        <Text style={{ color: T.textSecondary, lineHeight: 22 }}>
          Full data import (ZIP templates, validation, and progress) matches the web app. Use NexusERP in your browser for
          imports, then continue day-to-day work in this app — same backend.
        </Text>
        <TouchableOpacity style={S.btnPrimary} onPress={openWeb}>
          <Text style={S.btnPrimaryText}>Open web portal</Text>
        </TouchableOpacity>
        <Text style={S.muted}>{API_BASE}</Text>
      </View>
    </ScrollView>
  );
}
