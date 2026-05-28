import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Option {
  key: "ocr" | "manual";
  title: string;
  desc: string;
  icon: keyof typeof import("@expo/vector-icons/build/Ionicons").default.glyphMap;
  iconColor: string;
  iconBg: string;
  borderColor: string;
  href: string;
}

const OPTIONS: Option[] = [
  {
    key: "ocr",
    title: "처방전으로 등록",
    desc: "사진을 찍으면 자동으로 약 정보를 읽어와요",
    icon: "camera",
    iconColor: "#F8B835",
    iconBg: "#FFF4C7",
    borderColor: "#FFE9A8",
    href: "/prescription/camera",
  },
  {
    key: "manual",
    title: "약 직접 등록",
    desc: "약 이름을 검색해서 직접 추가할 수 있어요",
    icon: "search",
    iconColor: "#5BC4AE",
    iconBg: "#D6F1EA",
    borderColor: "#BDEFEA",
    href: "/prescription/manual-add",
  },
];

export default function PrescriptionIntroScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="약 등록" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppText type="extrabold" style={styles.title}>
          어떻게 등록할까요?
        </AppText>
        <AppText type="pretendard-m" style={styles.desc}>
          처방전을 찍거나, 약 이름을 직접 검색해서 등록할 수 있어요
        </AppText>

        <View style={styles.optionList}>
          {OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => router.push(opt.href as any)}
              style={({ pressed }) => [
                styles.optionCard,
                { borderColor: opt.borderColor },
                pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
              ]}
            >
              <View
                style={[styles.optionIcon, { backgroundColor: opt.iconBg }]}
              >
                <Ionicons name={opt.icon} size={26} color={opt.iconColor} />
              </View>
              <View style={styles.optionText}>
                <AppText type="pretendard-b" style={styles.optionTitle}>
                  {opt.title}
                </AppText>
                <AppText type="pretendard-m" style={styles.optionDesc}>
                  {opt.desc}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BBB" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FDFCF3",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    color: "#171717",
    marginTop: 8,
  },
  desc: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    marginBottom: 8,
  },
  optionList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    minHeight: 92,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 17,
    color: "#222",
  },
  optionDesc: {
    fontSize: 13,
    color: "#666",
    lineHeight: 19,
  },
});
