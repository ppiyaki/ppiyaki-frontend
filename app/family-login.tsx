import AppText from "@/components/app-text";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FamilyLoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.logoBox}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <View style={styles.spacer} />

        <Pressable
          style={({ pressed }) => [
            styles.kakaoBtn,
            pressed && styles.kakaoBtnPressed,
          ]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Image
            source={require("../assets/images/KakaoLogin.png")}
            style={styles.kakaoImg}
            resizeMode="contain"
          />
        </Pressable>

        <View style={styles.signupRow}>
          <AppText type="pretendard-r" style={styles.signupText}>
            아직 계정이 없어요{"  "}
          </AppText>
          <Pressable onPress={() => router.push("/signup/nickname" as any)}>
            <AppText type="pretendard-b" style={styles.signupLink}>
              {">"} 회원가입하기
            </AppText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FCF5D9",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },
  logoBox: {
    width: 180,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8C88A",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFDF7",
  },
  logoImg: {
    width: 156,
    height: 64,
  },
  spacer: {
    flex: 1,
  },
  kakaoBtn: {
    width: "100%",
    marginBottom: 18,
  },
  kakaoBtnPressed: {
    opacity: 0.88,
  },
  kakaoImg: {
    width: "100%",
    height: 54,
  },
  signupRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  signupText: {
    fontSize: 14,
    color: "#888888",
  },
  signupLink: {
    fontSize: 14,
    color: "#4799E0",
    textDecorationLine: "underline",
  },
});
