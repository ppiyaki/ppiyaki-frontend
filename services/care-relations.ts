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
