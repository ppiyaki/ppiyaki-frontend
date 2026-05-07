import * as KakaoLogin from "@react-native-seoul/kakao-login";
import { apiFetch } from "./api";
import {
  clearTokens,
  getRefreshToken,
  saveTokens,
} from "./token-storage";

export type UserRole = "SENIOR" | "CAREGIVER" | "FAMILY" | string;

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  isOnboarded: boolean;
}

export interface ServerMealTimes {
  breakfast: string; // "HH:mm:ss"
  lunch: string;
  dinner: string;
}

export interface MeResponse {
  id: number;
  nickname: string;
  role: UserRole | null;
  isOnboarded: boolean;
  mealTimes?: ServerMealTimes | null;
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

  const data = await apiFetch<AuthResponse>("/api/v1/auth/kakao", {
    method: "POST",
    skipAuth: true,
    json: { idToken },
  });

  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

/**
 * 현재 로그인한 사용자 정보 조회 (역할 분기에 사용).
 * 결과는 메모리 캐시되며, force=true 또는 로그아웃 시 클리어.
 */
let cachedMe: MeResponse | null = null;

export async function getMe(force = false): Promise<MeResponse> {
  if (cachedMe && !force) return cachedMe;
  cachedMe = await apiFetch<MeResponse>("/api/v1/users/me");
  return cachedMe;
}

export function clearMeCache() {
  cachedMe = null;
}

/**
 * 서버에 refreshToken 폐기 요청 + 카카오 SDK 로그아웃 + 로컬 토큰 삭제.
 * 서버는 멱등성 보장이라 실패해도 클라이언트 정리는 진행.
 */
export async function logoutKakao() {
  const refreshToken = await getRefreshToken();
  try {
    await KakaoLogin.logout();
  } catch {
    // 카카오 측 실패는 무시
  }
  if (refreshToken) {
    try {
      await apiFetch<void>("/api/v1/auth/logout", {
        method: "POST",
        skipAuth: true,
        skipRefresh: true,
        json: { refreshToken },
      });
    } catch {
      // 서버 호출 실패해도 클라 토큰은 삭제
    }
  }
  await clearTokens();
  clearMeCache();
}
