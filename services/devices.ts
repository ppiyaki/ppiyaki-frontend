import { apiFetch } from "./api";

export type DevicePlatform = "ANDROID" | "IOS" | "WEB";

export interface DeviceTokenResponse {
  tokenId: number;
  platform: DevicePlatform;
  isActive: boolean;
}

/**
 * FCM 디바이스 토큰 등록. 동일 token 재요청 시 멱등 (reactivate).
 *  - 201 Created: 등록 성공 또는 reactivate
 */
export async function registerDeviceToken(
  token: string,
  platform: DevicePlatform,
): Promise<DeviceTokenResponse> {
  return apiFetch<DeviceTokenResponse>("/api/v1/users/me/devices", {
    method: "POST",
    json: { token, platform },
  });
}

/**
 * 본인 디바이스 토큰 비활성화. 푸시 발송 대상에서 제외.
 *  - 403 NOTIFICATION_004: 본인 토큰 아님
 *  - 404 NOTIFICATION_003: 토큰 row 없음
 */
export async function unregisterDeviceToken(tokenId: number): Promise<void> {
  await apiFetch<void>(`/api/v1/users/me/devices/${tokenId}`, {
    method: "DELETE",
  });
}
