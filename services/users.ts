import { apiFetch } from "./api";
import {
  clearMeCache,
  MeResponse,
  ProfileImageIndex,
  SeniorGender,
} from "./auth";

/**
 * 본인 프로필 수정 (시니어/보호자 공용).
 * - 시니어: nickname/profileImage/profileImageObjectKey/gender 모두 수정 가능
 * - 보호자: gender 미전송 (백엔드가 보호자에게는 무시). 사진/닉네임만 변경
 *
 * profileImage 와 profileImageObjectKey 는 상호 배타.
 * 커스텀 업로드 → POST /api/v1/uploads/presigned (purpose=PROFILE_IMAGE) 로 objectKey 발급 받은 뒤 전달.
 */
export interface UpdateMyProfileBody {
  nickname: string;
  profileImage?: ProfileImageIndex;
  profileImageObjectKey?: string;
  gender?: SeniorGender;
}

export async function updateMyProfile(
  body: UpdateMyProfileBody,
): Promise<MeResponse> {
  const res = await apiFetch<MeResponse>("/api/v1/users/me", {
    method: "PUT",
    json: body,
  });
  // /me 캐시 무효화 — 다음 getMe() 호출 시 fresh fetch
  clearMeCache();
  return res;
}

/**
 * 보호자가 연동된 시니어의 nickname/gender 대신 수정.
 *  - 활성 CareRelation 없으면 403
 *  - 프로필 사진은 본인만 변경 가능 (이 API에서 불가)
 */
export interface UpdateSeniorProfileBody {
  nickname: string;
  gender: SeniorGender;
}

export async function updateSeniorProfile(
  seniorId: number,
  body: UpdateSeniorProfileBody,
): Promise<MeResponse> {
  return apiFetch<MeResponse>(`/api/v1/users/${seniorId}`, {
    method: "PUT",
    json: body,
  });
}
