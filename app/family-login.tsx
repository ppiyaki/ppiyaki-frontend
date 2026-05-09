import AppText from "@/components/app-text";
import KakaoLoginButton from "@/components/kakao-login-button";
import { ApiError } from "@/services/api";
import { loginLocal, loginWithKakao } from "@/services/auth";
import { resolveAuthRoute, ROUTE_PATHS } from "@/services/post-login";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FamilyLoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  const routeAfterAuth = async (isOnboarded: boolean) => {
    if (!isOnboarded) {
      router.replace(ROUTE_PATHS.onboarding as any);
      return;
    }
    const route = await resolveAuthRoute();
    router.replace(ROUTE_PATHS[route] as any);
  };

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      const { isOnboarded } = await loginWithKakao();
      await routeAfterAuth(isOnboarded);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "로그인에 실패했습니다.";
      Alert.alert("로그인 실패", msg);
    } finally {
      setLoading(false);
    }
  };

  const canLocalLogin =
    loginId.trim().length > 0 && password.length > 0 && !localLoading;

  const handleLocalLogin = async () => {
    if (!canLocalLogin) return;
    setLocalLoading(true);
    try {
      const { isOnboarded } = await loginLocal(loginId.trim(), password);
      await routeAfterAuth(isOnboarded);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? "아이디 또는 비밀번호가 올바르지 않아요."
          : e instanceof ApiError
            ? e.toUserMessage()
            : e instanceof Error
              ? e.message
              : "로그인에 실패했어요.";
      Alert.alert("로그인 실패", msg);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoBox}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* 로컬 로그인 폼 */}
          <View style={styles.formBox}>
            <TextInput
              value={loginId}
              onChangeText={setLoginId}
              placeholder="아이디"
              placeholderTextColor="#AAA"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              maxLength={30}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              placeholderTextColor="#AAA"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.input}
              maxLength={50}
            />
            <Pressable
              onPress={handleLocalLogin}
              disabled={!canLocalLogin}
              style={({ pressed }) => [
                styles.loginBtn,
                !canLocalLogin && styles.loginBtnDisabled,
                pressed && canLocalLogin && { opacity: 0.85 },
              ]}
            >
              {localLoading ? (
                <ActivityIndicator color="#222" />
              ) : (
                <AppText type="pretendard-b" style={styles.loginBtnText}>
                  로그인
                </AppText>
              )}
            </Pressable>
          </View>

          {/* 구분선 */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <AppText type="pretendard-r" style={styles.dividerText}>
              또는
            </AppText>
            <View style={styles.dividerLine} />
          </View>

          <KakaoLoginButton onPress={handleKakaoLogin} loading={loading} />

          <View style={styles.signupRow}>
            <AppText type="pretendard-r" style={styles.signupText}>
              아직 계정이 없어요{"  "}
            </AppText>
            <Pressable onPress={() => router.push("/family-signup" as any)}>
              <AppText type="pretendard-b" style={styles.signupLink}>
                {">"} 회원가입하기
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FCF5D9",
  },
  scroll: {
    flexGrow: 1,
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
    backgroundColor: "#FDFCF3",
    marginBottom: 40,
  },
  logoImg: {
    width: 156,
    height: 64,
  },

  formBox: {
    width: "100%",
    gap: 10,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8C88A",
    backgroundColor: "#FDFCF3",
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: "#222",
  },
  loginBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FFD24D",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  loginBtnDisabled: {
    backgroundColor: "#F0EDE0",
  },
  loginBtnText: {
    fontSize: 16,
    color: "#222",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D8C88A",
  },
  dividerText: {
    fontSize: 12,
    color: "#888",
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
