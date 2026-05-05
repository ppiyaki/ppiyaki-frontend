import AppText from "@/components/app-text";
import KakaoLoginButton from "@/components/kakao-login-button";
import { loginWithKakao } from "@/services/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FamilyLoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      const { isOnboarded } = await loginWithKakao();
      if (isOnboarded) {
        router.replace("/(tabs)");
      } else {
        router.replace("/signup/nickname" as any);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "로그인에 실패했습니다.";
      Alert.alert("로그인 실패", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.container}>
        <View style={styles.logoBox}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <View style={styles.spacer} />

        <KakaoLoginButton onPress={handleKakaoLogin} loading={loading} />

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
    backgroundColor: "#FEFDFB",
  },
  logoImg: {
    width: 156,
    height: 64,
  },
  spacer: {
    flex: 1,
  },
  signupRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
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
