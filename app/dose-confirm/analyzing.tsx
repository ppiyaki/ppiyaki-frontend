import AppText from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DoseConfirmAnalyzingScreen() {
  const router = useRouter();
  const { uri } = useLocalSearchParams<{ uri?: string }>();

  const bounce = useSharedValue(0);
  const dotProgress = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 600 }),
        withTiming(0, { duration: 600 }),
      ),
      -1,
      false,
    );
    dotProgress.value = withRepeat(withTiming(3, { duration: 1200 }), -1, false);
  }, [bounce, dotProgress]);

  useEffect(() => {
    // 프로토타입: 2.5초 뒤 70% 성공 / 30% 실패
    const t = setTimeout(() => {
      const success = Math.random() > 0.3;
      if (success) {
        router.replace("/dose-confirm/success" as any);
      } else {
        router.replace({
          pathname: "/dose-confirm/issue" as any,
          params: { uri, attempts: "1" },
        });
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [router, uri]);

  const charStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  const dot0Style = useAnimatedStyle(() => ({
    opacity: dotProgress.value > 0 ? 1 : 0.25,
  }));
  const dot1Style = useAnimatedStyle(() => ({
    opacity: dotProgress.value > 1 ? 1 : 0.25,
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: dotProgress.value > 2 ? 1 : 0.25,
  }));

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.center}>
        <View style={styles.charWrap}>
          <Animated.View style={charStyle}>
            <Image
              source={require("../../assets/images/character/Senior3.png")}
              style={styles.char}
              resizeMode="contain"
            />
          </Animated.View>
          <View style={styles.lensCircle}>
            <Ionicons name="search" size={24} color="#F8B835" />
          </View>
        </View>

        <AppText type="extrabold" style={styles.title}>
          삐약이가 약을 확인하고 있어요
        </AppText>
        <AppText type="pretendard-m" style={styles.desc}>
          잠시만 기다려주세요
        </AppText>

        <View style={styles.dots}>
          <Animated.View style={[styles.dotItem, dot0Style]} />
          <Animated.View style={[styles.dotItem, dot1Style]} />
          <Animated.View style={[styles.dotItem, dot2Style]} />
        </View>
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
    gap: 14,
  },
  charWrap: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  char: {
    width: 180,
    height: 180,
  },
  lensCircle: {
    position: "absolute",
    right: 14,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF4C7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  title: {
    fontSize: 22,
    color: "#222",
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    color: "#666",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  dotItem: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F8B835",
  },
});
