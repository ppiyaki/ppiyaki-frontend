import { apiFetch } from "./api";
import type { UserRole } from "./auth";

export type CareMode = "MANAGED" | "AUTONOMOUS";

export interface LinkedSenior {
  id: number;
  nickname: string;
  // TODO: 명세 본문 받으면 추가 필드 매핑 필요
}

export interface OnboardingProfileBody {
  nickname: string;
  role: UserRole;
  // TODO: 백엔드 명세 본문 받으면 보호자/시니어별 추가 필드 반영
}

/** 초기 온보딩 프로필 설정 (가입 직후 1회) */
export async function setOnboardingProfile(
  body: OnboardingProfileBody,
): Promise<unknown> {
  return apiFetch("/api/v1/users/me/profile", {
    method: "POST",
    json: body,
  });
}

/** 보호자의 연결된 시니어 목록 조회 */
export async function listLinkedSeniors(): Promise<{
  responses: LinkedSenior[];
}> {
  return apiFetch("/api/v1/users/me/seniors");
}

/**
 * 임시 dev 폴백 시니어.
 * TODO(backend): listLinkedSeniors(GET /users/me/seniors) 구현되면 폴백 제거.
 * care_relations은 DB에 살아있지만 보호자 입장에서 시니어 ID를 발견할 API가 없어서,
 * 테스트 보호자 토큰(17)에 매칭되는 시니어(16)를 fallback으로 둔다.
 */
const DEV_FALLBACK_SENIOR: LinkedSenior = {
  id: 16,
  nickname: "어르신",
};

/**
 * 보호자가 사용할 첫 시니어 객체를 얻는다.
 * 1) listLinkedSeniors 정상 → 첫 시니어
 * 2) 실패(404 등) → __DEV__이면 DEV_FALLBACK_SENIOR, 아니면 null
 */
export async function resolveLinkedSenior(): Promise<LinkedSenior | null> {
  try {
    const res = await listLinkedSeniors();
    const first = res.responses[0];
    if (first) return first;
  } catch (e) {
    if (__DEV__) {
      console.log(
        "[caregivers] listLinkedSeniors failed, using DEV fallback:",
        e,
      );
    }
  }
  return __DEV__ ? DEV_FALLBACK_SENIOR : null;
}

/** ID만 필요한 경우 — resolveLinkedSenior와 동일 폴백 적용 */
export async function resolveSeniorId(): Promise<number | undefined> {
  const s = await resolveLinkedSenior();
  return s?.id;
}

/** 시니어 연동 해제 */
export async function unlinkSenior(seniorId: number): Promise<void> {
  await apiFetch<void>(`/api/v1/caregivers/me/seniors/${seniorId}`, {
    method: "DELETE",
  });
}

/** 시니어 보호자 승인 모드 변경 (보호자만) */
export async function updateSeniorCareMode(
  seniorId: number,
  careMode: CareMode,
): Promise<{ userId: number; careMode: CareMode }> {
  return apiFetch(`/api/v1/users/${seniorId}/care-mode`, {
    method: "PATCH",
    json: { careMode },
  });
}
