import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrescriptionIntroScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="처방전 등록" />

      <View style={styles.content}>
        <View style={styles.guideHeader}>
          {/* <View style={styles.stepBadge}>
            <AppText type="pretendard-b" style={styles.stepBadgeText}>
              그림
            </AppText>
          </View> */}
          <AppText type="pretendard-m" style={styles.guideText}>
            레이아웃 사진을 참고하여 처방전을 찍어주세요.
          </AppText>
        </View>

        <View style={styles.exampleBox}>
          <AppText type="pretendard-m" style={styles.exampleText}>
            (예시 레이아웃 사진)
          </AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.push("/prescription/camera")}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <AppText type="pretendard-b" style={styles.ctaText}>
            처방전 촬영하기
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF7",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  stepBadge: {
    backgroundColor: "#F88835",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stepBadgeText: {
    color: "#FFF",
    fontSize: 12,
  },
  guideText: {
    fontSize: 13,
    color: "#444",
    flexShrink: 1,
  },
  exampleBox: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE8D6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  exampleText: {
    fontSize: 16,
    color: "#888",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  cta: {
    backgroundColor: "#E8E0C0",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontSize: 17,
    color: "#333",
  },
});
