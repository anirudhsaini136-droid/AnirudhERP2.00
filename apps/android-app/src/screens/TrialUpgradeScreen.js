import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { HeroBand, PageHeader } from "../components/NexaUi";
import * as T from "../theme/tokens";
import { S } from "../theme/screenStyles";
import { TRIAL_UPGRADE_MESSAGE } from "../utils/trialAccess";

export default function TrialUpgradeScreen({ navigation }) {
  return (
    <View style={{ flex: 1, backgroundColor: T.screenBg }}>
      <ScrollView contentContainerStyle={[S.scrollContent, { paddingTop: 8 }]}>
        <HeroBand eyebrow="TRIAL">
          <PageHeader title="Upgrade to continue" subtitle="Your plan preview is limited" />
        </HeroBand>
        <View style={styles.card}>
          <Text style={styles.body}>{TRIAL_UPGRADE_MESSAGE}</Text>
          <Pressable
            style={styles.btn}
            onPress={() => navigation.navigate("Profile")}
            android_ripple={{ color: "#0003" }}
          >
            <Text style={styles.btnTx}>Account & billing</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 18,
    borderRadius: 16,
    backgroundColor: T.cardBg,
    borderWidth: 1,
    borderColor: T.border,
  },
  body: { color: T.textSecondary, fontSize: 15, lineHeight: 22 },
  btn: {
    marginTop: 18,
    backgroundColor: "#d4a017",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#d4a017",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnTx: { color: "#000000", fontWeight: "700", fontSize: 15 },
});
