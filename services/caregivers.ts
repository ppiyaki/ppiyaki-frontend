import { apiFetch } from "./api";
import type { SeniorGender, UserRole } from "./auth";

export type CareMode = "MANAGED" | "AUTONOMOUS";

export interface LinkedSenior {
  id: number;
  nickname: string;
  /** yyyy-MM-dd */
  birthDate: string;
  gender: SeniorGender;
  careMode: CareMode;
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

/** 보호자의 연결된 시니어 목록 조회. 응답은 raw 배열. */
export async function listLinkedSeniors(): Promise<LinkedSenior[]> {
  return apiFetch<LinkedSenior[]>("/api/v1/care-relations/seniors");
}

/** 보호자가 사용할 첫 시니어. 연결된 시니어가 없거나 조회 실패 시 null. */
export async function resolveLinkedSenior(): Promise<LinkedSenior | null> {
  try {
    const list = await listLinkedSeniors();
    return list[0] ?? null;
  } catch (e) {
    console.log("[caregivers] listLinkedSeniors failed:", e);
    return null;
  }
}

/** ID만 필요한 경우 */
export async function resolveSeniorId(): Promise<number | undefined> {
  const s = await resolveLinkedSenior();
  return s?.id;
}

/**
 * 보호자 ↔ 시니어 연동 해제.
 *  - 204 No Content 성공
 *  - 403 CAREGIVER 권한 없음
 *  - 404 활성 CareRelation 없음
 */
export async function unlinkSenior(seniorId: number): Promise<void> {
  await apiFetch<void>(`/api/v1/care-relations/seniors/${seniorId}`, {
    method: "DELETE",
  });
}

/**
 * 시니어 보호자 승인 모드 변경 (보호자만).
 * 백엔드가 PATCH 미지원(405) — PUT 사용. 경로/메서드는 백엔드와 재확인 필요.
 */
export async function updateSeniorCareMode(
  seniorId: number,
  careMode: CareMode,
): Promise<{ userId: number; careMode: CareMode }> {
  return apiFetch(`/api/v1/users/${seniorId}/care-mode`, {
    method: "PUT",
    json: { careMode },
  });
}
