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
