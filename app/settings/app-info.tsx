import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";

interface InfoRow {
  key: string;
  label: string;
  value?: string;
  href?: string;
}

const ROWS: InfoRow[] = [
  { key: "version", label: "나의 앱 버전", value: APP_VERSION },
  { key: "terms", label: "이용약관", href: "/settings/terms" },
  { key: "privacy", label: "개인정보 처리방침", href: "/settings/privacy" },
];

export default function AppInfoScreen() {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="앱 정보" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {ROWS.map((row, idx) => (
            <Row
              key={row.key}
              row={row}
              showDivider={idx < ROWS.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ row, showDivider }: { row: InfoRow; showDivider: boolean }) {
  const isStatic = row.value !== undefined;

  return (
    <Pressable
      disabled={isStatic}
      style={({ pressed }) => [
        styles.row,
        showDivider && styles.rowDivider,
        pressed && !isStatic && { backgroundColor: "#FBF7EC" },
      ]}
    >
      <AppText type="pretendard-b" style={styles.rowLabel}>
        {row.label}
      </AppText>
      {isStatic ? (
        <AppText type="pretendard-m" style={styles.rowValue}>
          {row.value}
        </AppText>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#BBB" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECDB",
  },
  rowLabel: {
    fontSize: 16,
    color: "#222",
  },
  rowValue: {
    fontSize: 14,
    color: "#888",
  },
});
