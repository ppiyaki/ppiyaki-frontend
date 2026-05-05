import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrescriptionResultScreen() {
  const router = useRouter();
  const detectedCount = 3;

  const handleConfirm = () => {
    router.replace("/(tabs)");
  };

  const handleReject = () => {
    router.replace("/prescription/camera");
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="처방전 등록" />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText type="pretendard-b" style={styles.title}>
              처방전 인식 결과
            </AppText>
            <View style={styles.subtitleRow}>
              <AppText type="pretendard-r" style={styles.subtitle}>
                처방전의 약이 총{" "}
              </AppText>
              <AppText type="extrabold" style={styles.countNum}>
                {detectedCount}개
              </AppText>
              <AppText type="pretendard-r" style={styles.subtitle}>
                !
              </AppText>
            </View>
            <AppText type="pretendard-r" style={styles.subtitle}>
              맞나요?
            </AppText>
          </View>
          <Image
            source={require("../../assets/images/Senior.png")}
            style={styles.character}
            resizeMode="contain"
          />
        </View>

        <View style={styles.resultBox} />
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <AppText type="pretendard-b" style={styles.btnText}>
            응
          </AppText>
        </Pressable>
        <Pressable
          onPress={handleReject}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <AppText type="pretendard-b" style={styles.btnText}>
            아니
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FEFDFB",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 4,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    color: "#171717",
    marginBottom: 6,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  subtitle: {
    fontSize: 15,
    color: "#444",
  },
  countNum: {
    fontSize: 18,
    color: "#F88835",
  },
  character: {
    width: 84,
    height: 84,
    marginLeft: 8,
  },
  resultBox: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE8D6",
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  btn: {
    flex: 1,
    backgroundColor: "#E8E0C0",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnText: {
    fontSize: 17,
    color: "#333",
  },
});
