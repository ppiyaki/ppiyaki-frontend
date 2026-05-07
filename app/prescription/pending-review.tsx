import AppText from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrescriptionPendingReviewScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.center}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.charWrap}>
            <Image
              source={require("../../assets/images/character/Senior3.png")}
              style={styles.char}
              resizeMode="contain"
            />
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={28} color="#FFF" />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <AppText type="extrabold" style={styles.title}>
            처방전 등록이 완료됐어요!
          </AppText>
          <AppText type="pretendard-m" style={styles.desc}>
            보호자가 약 정보를 확인해드릴 거예요.{"\n"}
            확인이 끝나면 알림으로 알려드릴게요!
          </AppText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          style={styles.tipCard}
        >
          <View style={styles.tipIconBox}>
            <Ionicons name="time" size={20} color="#F8B835" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText type="pretendard-b" style={styles.tipTitle}>
              잠시만 기다려주세요
            </AppText>
            <AppText type="pretendard-m" style={styles.tipText}>
              보호자가 확인하기 전까지는 약을{"\n"}
              새로 등록할 수 없어요.
            </AppText>
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.replace("/(tabs)" as any)}
          style={({ pressed }) => [
            styles.btn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <AppText type="pretendard-b" style={styles.btnText}>
            홈으로 돌아가기
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 18,
  },
  charWrap: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  char: {
    width: 160,
    height: 160,
  },
  checkBadge: {
    position: "absolute",
    bottom: 12,
    right: 8,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5BC4AE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFDF6",
  },
  title: {
    fontSize: 24,
    color: "#222",
    textAlign: "center",
    marginBottom: 6,
  },
  desc: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF8E0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FFE9A8",
    marginTop: 8,
  },
  tipIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  tipTitle: {
    fontSize: 14,
    color: "#5A4500",
    marginBottom: 2,
  },
  tipText: {
    fontSize: 13,
    color: "#7A5C00",
    lineHeight: 19,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  btn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFD24D",
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    fontSize: 17,
    color: "#222",
  },
});
