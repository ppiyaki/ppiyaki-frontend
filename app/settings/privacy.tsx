import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PolicyItem {
  key: string;
  label: string;
  desc: string;
  href: string;
}

const ITEMS: PolicyItem[] = [
  {
    key: "privacy",
    label: "개인정보 수집 및 이용",
    desc: "닉네임·가입 식별·연동 코드 등 기본 정보 처리",
    href: "/settings/terms-privacy",
  },
  {
    key: "sensitive",
    label: "민감정보(건강) 수집",
    desc: "처방전·약품명·복약 기록 등 건강 정보 처리",
    href: "/settings/terms-sensitive",
  },
  {
    key: "third-party",
    label: "개인정보 제3자 제공",
    desc: "연동된 보호자에게 복약 정보 전송",
    href: "/settings/terms-third-party",
  },
];

export default function PrivacyIndexScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="개인정보 처리방침" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <AppText type="pretendard-r" style={styles.intro}>
          ‘삐약이’는 개인정보 보호법에 따라 아래 항목별로 사용자의 개인정보를
          수집·이용·제공합니다. 각 항목을 눌러 상세 내용을 확인할 수 있어요.
        </AppText>

        <View style={styles.list}>
          {ITEMS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: "#FBF7EC" },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText type="pretendard-b" style={styles.rowLabel}>
                  {item.label}
                </AppText>
                <AppText type="pretendard-m" style={styles.rowDesc}>
                  {item.desc}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#BBB" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFDF6" },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  intro: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  list: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECDB",
  },
  rowLabel: { fontSize: 15, color: "#222" },
  rowDesc: { fontSize: 12, color: "#777" },
});
