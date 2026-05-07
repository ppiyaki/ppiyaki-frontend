import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Tip {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  desc: string;
}

const TIPS: Tip[] = [
  {
    icon: "hand-left",
    iconColor: "#F8B835",
    iconBg: "#FFF1C8",
    title: "손바닥 위에 약을 올려주세요",
    desc: "또는 평평한 곳에 약을 올려두세요",
  },
  {
    icon: "sunny",
    iconColor: "#F8B835",
    iconBg: "#FFF1C8",
    title: "밝은 곳에서 찍어주세요",
    desc: "어두우면 약이 잘 안 보여요",
  },
  {
    icon: "scan",
    iconColor: "#5BC4AE",
    iconBg: "#D6F1EA",
    title: "약이 모두 잘 보이게 찍어주세요",
    desc: "가까이서 찍으면 더 정확해요",
  },
];

export default function DoseConfirmIntroScreen() {
  const router = useRouter();
  const { scheduleId, targetDate } = useLocalSearchParams<{
    scheduleId?: string;
    targetDate?: string;
  }>();

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="복약 인증" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroIcon}>
          <Ionicons name="camera" size={44} color="#F8B835" />
        </View>

        <AppText type="extrabold" style={styles.title}>
          약 사진을 찍어주세요
        </AppText>
        <AppText type="pretendard-m" style={styles.desc}>
          삐약이가 약 개수를 확인해드릴게요.{"\n"}
          아래 안내대로 찍으면 더 정확해요!
        </AppText>

        <View style={styles.tipList}>
          {TIPS.map((tip, idx) => (
            <View key={tip.title} style={styles.tipRow}>
              <View
                style={[styles.tipIcon, { backgroundColor: tip.iconBg }]}
              >
                <Ionicons name={tip.icon} size={22} color={tip.iconColor} />
              </View>
              <View style={styles.tipText}>
                <AppText type="pretendard-b" style={styles.tipTitle}>
                  {idx + 1}. {tip.title}
                </AppText>
                <AppText type="pretendard-m" style={styles.tipDesc}>
                  {tip.desc}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/dose-confirm/camera" as any,
              params: { scheduleId, targetDate },
            })
          }
          style={({ pressed }) => [
            styles.btn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="camera" size={22} color="#222" />
          <AppText type="pretendard-b" style={styles.btnText}>
            사진 찍으러 가기
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFF4C7",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    color: "#222",
    textAlign: "center",
    marginTop: 6,
  },
  desc: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 14,
  },
  tipList: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECDB",
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    fontSize: 16,
    color: "#222",
  },
  tipDesc: {
    fontSize: 13,
    color: "#777",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#FFD24D",
  },
  btnText: {
    fontSize: 18,
    color: "#222",
  },
});
