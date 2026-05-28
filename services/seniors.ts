import { apiFetch } from "./api";

export interface CreateSeniorBody {
  /** 시니어 닉네임 */
  nickname: string;
  /** 생년월일 yyyy-MM-dd */
  birthDate: string;
}

export interface CreateSeniorResponse {
  seniorId: number;
  careRelationId: number;
  petId: number;
}

/**
 * 보호자가 시니어 계정을 대리 생성.
 * CareRelation + 기본 Pet도 함께 생성된다. 호출자는 CAREGIVER 권한 필요.
 */
export async function createSenior(
  body: CreateSeniorBody,
): Promise<CreateSeniorResponse> {
  return apiFetch<CreateSeniorResponse>("/api/v1/seniors", {
    method: "POST",
    json: body,
  });
}

/**
 * 보호자가 관리 중인 시니어를 강제 로그아웃.
 * 204 No Content. 해당 시니어의 보호자가 아니면 403.
 */
export async function forceLogoutSenior(seniorId: number): Promise<void> {
  await apiFetch<void>(`/api/v1/seniors/${seniorId}/logout`, {
    method: "DELETE",
  });
}
