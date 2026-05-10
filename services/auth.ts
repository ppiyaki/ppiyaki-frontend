import * as KakaoLogin from "@react-native-seoul/kakao-login";
import { apiFetch } from "./api";
import { tearDownPush } from "./push-notifications";
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
 * 시니어 초대 코드 로그인. 보호자가 발급한 6자리 코드로 인증.
 *  - 인증 헤더 불필요
 *  - 401: 유효하지 않거나 만료된 코드
 *  - 429: Rate Limit (IP 기준 1분 10회 실패)
 */
export async function loginWithInviteCode(
  code: string,
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/api/v1/auth/code-login", {
    method: "POST",
    skipAuth: true,
    json: { code },
  });
  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

/* ────────── 보호자 로컬 로그인/회원가입 ────────── */

/**
 * loginId + password 로컬 로그인.
 *  - 401: ID/비밀번호 불일치 (AUTH_004)
 */
export async function loginLocal(
  loginId: string,
  password: string,
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    skipAuth: true,
    json: { loginId, password },
  });
  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

/**
 * loginId + password + nickname 로컬 회원가입. role=CAREGIVER 자동.
 *  - 가입 즉시 JWT 발급 + isOnboarded=true 응답
 *  - 409: loginId 중복 (AUTH_003)
 */
export async function signupLocal(
  loginId: string,
  password: string,
  nickname: string,
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/api/v1/auth/signup", {
    method: "POST",
    skipAuth: true,
    json: { loginId, password, nickname },
  });
  await saveTokens(data.accessToken, data.refreshToken);
  clearMeCache();
  return data;
}

/* ────────── 보호자 온보딩 ────────── */

export type SeniorGender = "MALE" | "FEMALE" | "UNKNOWN";
export type CareMode = "AUTONOMOUS" | "MANAGED";

export interface OnboardingSeniorInput {
  nickname: string;
  gender: SeniorGender;
  careMode: CareMode;
}

export interface OnboardingBody {
  nickname: string;
  seniors: OnboardingSeniorInput[];
}

export interface OnboardingResponse {
  caregiverNickname: string;
  seniors: {
    seniorId: number;
    nickname: string;
    petId: number;
  }[];
}

/**
 * 보호자 최초 온보딩.
 * 닉네임 설정 + 시니어 N명 대리 생성 한 번에. CAREGIVER 권한 필요.
 *  - 409 Conflict: 이미 온보딩 완료된 사용자
 */
export async function onboardCaregiver(
  body: OnboardingBody,
): Promise<OnboardingResponse> {
  const res = await apiFetch<OnboardingResponse>("/api/v1/onboarding", {
    method: "POST",
    json: body,
  });
  // 온보딩 후 me 캐시 무효화 (isOnboarded 변경)
  clearMeCache();
  return res;
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
  // FCM 토큰 비활성화는 access token이 살아있는 동안에 처리해야 함
  await tearDownPush();
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
