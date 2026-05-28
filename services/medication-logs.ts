import { apiFetch } from "./api";

export type LogStatus = "TAKEN" | "MISSED" | "PENDING";
export type PillCountStatus =
  | "COUNT_MATCH"
  | "COUNT_MISMATCH"
  | "COUNT_UNKNOWN"
  | "COUNT_FAILED"
  | null;

export interface MedicationLog {
  id: number;
  seniorId: number;
  scheduleId: number;
  targetDate: string; // ISO date
  takenAt: string | null;
  status: LogStatus;
  photoUrl: string | null;
  pillCountStatus: PillCountStatus;
  isProxy: boolean;
  confirmedByUserId: number;
  createdAt: string;
}

export interface UpsertLogBody {
  scheduleId: number;
  targetDate: string;
  takenAt?: string;
  status: LogStatus;
  /**
   * 형식: {purpose}/{userId}/{uuid}.{ext}.
   * 사진 보존 의도라면 이전 objectKey를 그대로 다시 보내야 함.
   * null/undefined로 보내면 기존 사진이 NULL로 덮어써짐.
   */
  photoObjectKey?: string;
}

/**
 * 복약 기록 업서트 (자연 키: scheduleId + targetDate).
 * Phase 2: status=TAKEN && photoObjectKey != null이면 서버가 동기로 Vision 검증 (3~6s).
 * 클라이언트는 30s timeout 권장.
 */
export async function upsertMedicationLog(
  body: UpsertLogBody,
): Promise<MedicationLog> {
  return apiFetch<MedicationLog>("/api/v1/medication-logs", {
    method: "PUT",
    json: body,
    // Vision API 호출 시 p95 ~6s, 여유롭게 30s
    timeout: 30_000,
  });
}

/**
 * 복약 기록 기간별 조회. (to - from) <= 31일.
 * seniorId 생략 시 요청자 본인.
 */
export async function listMedicationLogs(params: {
  from: string; // ISO date
  to: string; // ISO date
  seniorId?: number;
}): Promise<{ responses: MedicationLog[] }> {
  return apiFetch("/api/v1/medication-logs", {
    query: params,
  });
}
