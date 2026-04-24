import * as KakaoLogin from "@react-native-seoul/kakao-login";
import * as SecureStore from "expo-secure-store";

const API_BASE = "https://ppiyaki.store";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  isOnboarded: boolean;
}

/**
 * 카카오 SDK 로그인 → OIDC idToken 획득 → 백엔드 인증 → 토큰 저장
 */
export async function loginWithKakao(): Promise<AuthResponse> {
  const result = await KakaoLogin.login();
  const idToken = result.idToken;

  if (!idToken) {
    throw new Error(
      "카카오 ID Token을 받지 못했습니다.\n" +
        "Kakao Developers > 앱 설정 > OpenID Connect 활성화를 확인해주세요.",
    );
  }

  console.log("=== 카카오 idToken ===", idToken);

  const res = await fetch(`${API_BASE}/api/v1/auth/kakao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const body = await res.json().catch(() => ({}));
  console.log("=== 백엔드 응답 ===", res.status, JSON.stringify(body));

  if (!res.ok) {
    throw new Error(body.message ?? `로그인 실패 (${res.status})`);
  }

  const data = body as AuthResponse;

  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

// ─── 토큰 관리 ────────────────────────────────

async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync("accessToken", access);
  await SecureStore.setItemAsync("refreshToken", refresh);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync("accessToken");
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync("refreshToken");
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
}

export async function logoutKakao() {
  await KakaoLogin.logout();
  await clearTokens();
}
