import { apiFetch } from "./api";

export type WarningLevel = "INFO" | "WARN" | "CRITICAL" | string;

export interface DurWarningItem {
  type?: string;
  withMedicine?: string;
  severity?: string;
  description?: string;
  rawText?: string;
}

export interface DurCheckResponse {
  id: number;
  medicineId: number;
  checkedAt: string;
  warningLevel?: WarningLevel;
  warningText?: string;
  warnings: DurWarningItem[];
  fromCache: boolean;
}

/** DUR 점검 트리거 (신규 점검) */
export async function runDurCheck(
  medicineId: number,
  healthProfileId?: number,
): Promise<DurCheckResponse> {
  return apiFetch<DurCheckResponse>(
    `/api/v1/medicines/${medicineId}/dur-check`,
    {
      method: "POST",
      json: { healthProfileId },
    },
  );
}

/** 최신 DUR 점검 결과 조회 (캐시) */
export async function getLatestDurCheck(
  medicineId: number,
): Promise<DurCheckResponse> {
  return apiFetch<DurCheckResponse>(
    `/api/v1/medicines/${medicineId}/dur-check/latest`,
  );
}

/** DUR 점검 이력 조회 */
export async function listDurChecks(
  medicineId: number,
  limit = 10,
): Promise<{ responses: DurCheckResponse[] }> {
  return apiFetch(`/api/v1/medicines/${medicineId}/dur-checks`, {
    query: { limit },
  });
}
