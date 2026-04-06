import AppText from "@/components/app-text";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const PRIMARY_COLOR = "#FFD045";
const SENIOR_COLOR = "#F88835";
const FAMILY_COLOR = "#4799E0";
const STEPS = [0, 1, 2, 3] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [buttonEnabled, setButtonEnabled] = useState(false);

  const opacityValues = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const moveValues = useRef(STEPS.map(() => new Animated.Value(12))).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stepAnimations = STEPS.map((index) =>
      Animated.parallel([
        Animated.timing(opacityValues[index], {
          toValue: 1,
          duration: 980,
          delay: index === 0 ? 220 : 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(moveValues[index], {
          toValue: 0,
          duration: 980,
          delay: index === 0 ? 220 : 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.sequence(stepAnimations).start(() => {
      setButtonEnabled(true);
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [buttonOpacity, moveValues, opacityValues]);

  const ui = useMemo(() => {
    const compact = width < 360 || height < 760;
    return {
      hello: compact ? 24 : 24,
      subtitle: compact ? 20 : 20,
      body: compact ? 18 : 18,
      cta: compact ? 24 : 24,
      buttonText: compact ? 24 : 24,
      logoW: compact ? 188 : 218,
      logoH: compact ? 76 : 90,
      contentShiftDown: Math.round(Math.min(height * 0.1, 190)),
    };
  }, [height, width]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "right", "left"]}>
      <View style={styles.screen}>
        <View
          style={[
            styles.centered,
            {
              marginTop: ui.contentShiftDown,
              paddingBottom: insets.bottom + 110,
            },
          ]}
        >
          <Animated.View
            style={{
              opacity: opacityValues[0],
              transform: [{ translateY: moveValues[0] }],
            }}
          >
            <AppText
              type="pretendard-b"
              style={[styles.hello, { fontSize: ui.hello }]}
            >
              안녕하세요!
            </AppText>
          </Animated.View>

          <Animated.View
            style={[
              styles.logoRowWrap,
              {
                opacity: opacityValues[1],
                transform: [{ translateY: moveValues[1] }],
              },
            ]}
          >
            <View style={styles.logoRow}>
              <Image
                source={require("../assets/images/logo.png")}
                resizeMode="contain"
                style={{ width: ui.logoW, height: ui.logoH }}
              />
              <AppText type="pretendard-b" style={styles.neun}>
                는
              </AppText>
            </View>
            <AppText
              type="pretendard-s"
              style={[styles.subtitle, { fontSize: ui.subtitle }]}
            >
              당신만을 위한 AI 복약 도우미에요.
            </AppText>
          </Animated.View>

          <Animated.View
            style={{
              opacity: opacityValues[2],
              transform: [{ translateY: moveValues[2] }],
            }}
          >
            <AppText
              type="pretendard-b"
              style={[styles.sectionTitle, { fontSize: ui.body }]}
            >
              삐약이를 통해
            </AppText>
            <AppText
              type="pretendard-s"
              style={[styles.bodyLine, { fontSize: ui.body }]}
            >
              <AppText
                type="pretendard-b"
                style={[styles.family, { fontSize: ui.body }]}
              >
                보호자
              </AppText>
              <AppText type="pretendard-s" style={{ fontSize: ui.body }}>
                로서 가족의 복약을 도울 수도,
              </AppText>
            </AppText>
            <AppText
              type="pretendard-s"
              style={[styles.bodyLine, { fontSize: ui.body }]}
            >
              <AppText
                type="pretendard-b"
                style={[styles.senior, { fontSize: ui.body }]}
              >
                시니어
              </AppText>
              <AppText type="pretendard-s" style={{ fontSize: ui.body }}>
                로서 나의 복약을 관리할 수도 있어요.
              </AppText>
            </AppText>
          </Animated.View>

          <Animated.View
            style={{
              opacity: opacityValues[3],
              transform: [{ translateY: moveValues[3] }],
            }}
          >
            <AppText
              type="pretendard-b"
              style={[styles.ctaText, { fontSize: ui.cta }]}
            >
              한번 시작해보시겠어요?
            </AppText>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.buttonWrap,
            {
              opacity: buttonOpacity,
              bottom: insets.bottom + 8,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="계속하기"
            onPress={() => router.push("/select-role")}
            disabled={!buttonEnabled}
            style={({ pressed }) => [
              styles.ctaButton,
              { opacity: !buttonEnabled ? 0.65 : pressed ? 0.92 : 1 },
            ]}
          >
            <AppText
              type="pretendard-b"
              style={[styles.buttonText, { fontSize: ui.buttonText }]}
            >
              계속하기
            </AppText>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF7",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centered: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    alignItems: "center",
  },
  hello: {
    color: "#1C1C1C",
    lineHeight: 40,
    textAlign: "center",
  },
  logoRowWrap: {
    marginTop: 22,
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  neun: {
    fontSize: 30,
    marginLeft: 4,
    lineHeight: 38,
    color: "#1D1D1D",
  },
  subtitle: {
    marginTop: 14,
    lineHeight: 32,
    textAlign: "center",
    color: "#232323",
  },
  sectionTitle: {
    marginTop: 72,
    textAlign: "center",
    color: "#1F1F1F",
    lineHeight: 30,
  },
  bodyLine: {
    marginTop: 14,
    textAlign: "center",
    color: "#1F1F1F",
    lineHeight: 30,
    maxWidth: 430,
  },
  family: {
    color: FAMILY_COLOR,
  },
  senior: {
    color: SENIOR_COLOR,
  },
  ctaText: {
    marginTop: 94,
    lineHeight: 44,
    textAlign: "center",
    color: "#171717",
  },
  buttonWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    width: undefined,
    maxWidth: 460,
    alignSelf: "center",
  },
  ctaButton: {
    minHeight: 66,
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8E7000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "#111111",
    lineHeight: 38,
  },
});
