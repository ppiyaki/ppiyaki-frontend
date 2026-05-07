/**
 * 백엔드 표준 에러 코드.
 * 응답 양식: { success: false, error: { code, status, message } }
 */

export const ERROR_CODES = {
  // Common
  COMMON_001: "COMMON_001", // Invalid input

  // Auth
  AUTH_001: "AUTH_001", // Invalid token
  AUTH_002: "AUTH_002", // Token expired
  AUTH_003: "AUTH_003", // Login ID already exists
  AUTH_004: "AUTH_004", // Invalid login ID or password

  // User
  USER_001: "USER_001", // User not found

  // Medicine
  MEDICINE_001: "MEDICINE_001", // Medicine not found

  // Schedule
  SCHEDULE_001: "SCHEDULE_001", // Schedule not found
  SCHEDULE_002: "SCHEDULE_002", // Schedule does not belong to this medicine

  // Care relation
  CARE_001: "CARE_001", // No active care relation
  CARE_002: "CARE_002", // Caregiver must specify seniorId
  CARE_003: "CARE_003", // Only caregivers can specify seniorId
  CARE_004: "CARE_004", // Senior cannot mutate prescription before review window
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** 사용자에게 보여줄 친화적 메시지 매핑 */
const USER_MESSAGES: Record<string, string> = {
  COMMON_001: "입력값을 다시 확인해주세요",
  AUTH_001: "로그인이 만료되었어요. 다시 로그인해주세요",
  AUTH_002: "로그인이 만료되었어요. 다시 로그인해주세요",
  AUTH_003: "이미 사용 중인 아이디예요",
  AUTH_004: "아이디 또는 비밀번호가 맞지 않아요",
  USER_001: "사용자를 찾을 수 없어요",
  MEDICINE_001: "약물을 찾을 수 없어요",
  SCHEDULE_001: "복약 일정을 찾을 수 없어요",
  SCHEDULE_002: "잘못된 복약 일정이에요",
  CARE_001: "연동된 보호자 또는 시니어가 없어요",
  CARE_002: "어느 시니어인지 선택해주세요",
  CARE_003: "이 작업은 보호자만 할 수 있어요",
  CARE_004: "보호자 검토를 기다리고 있어요",
};

export function userFriendlyMessage(
  code: string | undefined,
  fallback?: string,
): string {
  if (code && USER_MESSAGES[code]) return USER_MESSAGES[code];
  return fallback ?? "문제가 발생했어요. 잠시 후 다시 시도해주세요";
}

export function isAuthError(code: string | undefined): boolean {
  return code === "AUTH_001" || code === "AUTH_002";
}

export function isCareError(code: string | undefined): boolean {
  return !!code && code.startsWith("CARE_");
}
