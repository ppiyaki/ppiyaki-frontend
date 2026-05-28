import { apiFetch } from "./api";

export interface InviteCodeResponse {
  /** 6자리 초대 코드 (예: A1B2C3) */
  inviteCode: string;
  /** 만료 시각 ISO-8601 */
  expiresAt: string;
}

/**
 * 보호자가 관리 중인 시니어용 6자리 초대 코드 발급.
 * 시니어가 이 코드로 /auth/code-login 호출 가능. 보호자가 아니면 403.
 */
export async function issueInviteCode(
  seniorId: number,
): Promise<InviteCodeResponse> {
  return apiFetch<InviteCodeResponse>("/api/v1/care-relations/invite", {
    method: "POST",
    json: { seniorId },
  });
}

export interface LinkedCaregiver {
  id: number;
  nickname: string;
}

/**
 * 시니어 본인이 자신과 활성 CareRelation으로 연결된 보호자 목록 조회.
 *  - 403: 호출자가 SENIOR 역할이 아님
 */
export async function listLinkedCaregivers(): Promise<LinkedCaregiver[]> {
  return apiFetch<LinkedCaregiver[]>("/api/v1/care-relations/caregivers");
}

/**
 * 시니어가 보호자에게 안부 알림(하트) 전송. 푸시만 발송, 알림함 row 없음.
 *  - 쿨다운: 수신자별 60초. 429 시 응답 헤더 `Retry-After`에 남은 초.
 *  - 403 CARE_001: 활성 CareRelation 없음
 *  - 403 CARE_008: 발신자가 SENIOR가 아니거나 수신자가 CAREGIVER가 아님
 */
export async function sendWellbeingPing(caregiverId: number): Promise<void> {
  await apiFetch<void>("/api/v1/notifications/wellbeing-pings", {
    method: "POST",
    json: { caregiverId },
  });
}
