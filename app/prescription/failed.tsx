import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrescriptionFailedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="처방전 등록" />

      <View style={styles.content}>
        <AppText type="pretendard-b" style={styles.title}>
          처방전이 인식되지 않았어요😢
        </AppText>
        <AppText type="pretendard-m" style={styles.subtitle}>
          아래 버튼을 눌러 다시 시도해주세요
        </AppText>

        <View style={styles.characterWrap}>
          <Image
            source={require("../../assets/images/sad.png")}
            style={styles.character}
            resizeMode="contain"
          />
          <AppText type="pretendard-r" style={styles.caption}></AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.replace("/prescription/camera")}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <AppText type="pretendard-b" style={styles.ctaText}>
            다시 시도하기
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FDFCF3",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 18,
    color: "#171717",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    textAlign: "center",
    marginTop: 4,
  },
  characterWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  character: {
    width: 238,
    height: 244,
  },
  caption: {
    fontSize: 14,
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
