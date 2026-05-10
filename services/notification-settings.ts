import { apiFetch } from "./api";
import type { CareMode } from "./auth";

export interface NotificationSettings {
  caregiverId: number;
  seniorId: number;
  durWarningEnabled: boolean;
  medicationDelayEnabled: boolean;
  medicationDelayThresholdMinutes: number;
  familySafetyEnabled: boolean;
  familySafetyThresholdHours: number;
  medicationCompleteEnabled: boolean;
}

export interface NotificationSettingsBody {
  durWarningEnabled: boolean;
  medicationDelayEnabled: boolean;
  medicationDelayThresholdMinutes: number;
  familySafetyEnabled: boolean;
  familySafetyThresholdHours: number;
  medicationCompleteEnabled: boolean;
}

/**
 * 보호자↔시니어 쌍 알림 설정 조회.
 * row 없으면 default STANDARD 프리셋으로 자동 생성 후 반환.
 *  - 403 CARE_001: 활성 CareRelation 없음
 */
export async function getNotificationSettings(
  seniorId: number,
): Promise<NotificationSettings> {
  return apiFetch<NotificationSettings>(
    `/api/v1/seniors/${seniorId}/notification-settings`,
  );
}

/**
 * 보호자↔시니어 쌍 알림 설정 전체 갱신.
 *  - 400 COMMON_001: 필드 누락 / 임계값 < 1
 *  - 403 CARE_001: 활성 CareRelation 없음
 */
export async function updateNotificationSettings(
  seniorId: number,
  body: NotificationSettingsBody,
): Promise<NotificationSettings> {
  return apiFetch<NotificationSettings>(
    `/api/v1/seniors/${seniorId}/notification-settings`,
    { method: "PUT", json: body },
  );
}

/**
 * careMode 프리셋을 알림 설정에 일괄 적용.
 *  - AUTONOMOUS: medication_delay 60분 / family_safety 48시간 / medication_complete OFF
 *  - MANAGED: medication_delay 30분 / family_safety 12시간 / medication_complete ON
 *  - 403 CARE_001: 활성 CareRelation 없음
 */
export async function applyNotificationPreset(
  seniorId: number,
  careMode: CareMode,
): Promise<NotificationSettings> {
  return apiFetch<NotificationSettings>(
    `/api/v1/seniors/${seniorId}/notification-settings/preset`,
    { method: "POST", json: { careMode } },
  );
}
