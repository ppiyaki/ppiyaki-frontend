import AppText from "@/components/app-text";
import KakaoLoginButton from "@/components/kakao-login-button";
import { ApiError } from "@/services/api";
import { loginLocal, loginWithKakao } from "@/services/auth";
import { resolveAuthRoute, ROUTE_PATHS } from "@/services/post-login";
import { getAccessToken } from "@/services/token-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
  // 토큰 점검 끝나기 전엔 폼 안 보임 — 깜빡임 방지 + 미완 온보딩 자동 복귀
  const [checkingToken, setCheckingToken] = useState(true);

  // 진입 시 살아있는 토큰이 있으면 (예: 회원가입 직후 뒤로가기로 복귀) 자동 라우팅.
  // - isOnboarded=false → 온보딩으로 복귀
  // - isOnboarded=true  → 메인으로 (재로그인 불필요)
  // 토큰이 없거나 /me 조회 실패면 정상 로그인 폼 노출.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) setCheckingToken(false);
        return;
      }
      try {
        const route = await resolveAuthRoute();
        if (!cancelled) {
          router.replace(ROUTE_PATHS[route] as any);
        }
      } catch {
        // 토큰이 만료/무효 → 폼 노출
        if (!cancelled) setCheckingToken(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

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

  if (checkingToken) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={["top", "left", "right", "bottom"]}
      >
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color="#FFB800" size="large" />
        </View>
      </SafeAreaView>
    );
  }

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
          {/* 상단 — 뒤로가기 */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.replace("/select-role" as any)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color="#333" />
              <AppText type="pretendard-m" style={styles.backText}>
                돌아가기
              </AppText>
            </Pressable>
          </View>

          {/* 로고 — 상단 영역 */}
          <View style={styles.logoBox}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* spacer — 로그인 컴포넌트들을 아래로 밀어내림 */}
          <View style={styles.spacer} />

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
          <View style={styles.signup}>
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
    alignItems: "stretch",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 140,
    minHeight: 760,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backText: {
    fontSize: 15,
    color: "#333",
  },
  logoBox: {
    width: "100%",
    alignItems: "center",
    marginTop: 40,
  },
  logoImg: {
    width: 200,
    height: 80,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },

  formBox: {
    width: "100%",
    gap: 10,
  },
  input: {
    height: 52,
    borderRadius: 8,
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
    borderRadius: 8,
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
  signup: {
    alignItems: "center",
    marginTop: 12,
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
