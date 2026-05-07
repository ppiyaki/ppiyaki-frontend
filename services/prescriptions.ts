import { apiFetch } from "./api";

export type PrescriptionStatus =
  | "PROCESSING"
  | "PENDING_REVIEW"
  | "CONFIRMED"
  | "REJECTED"
  | "PROCESSING_FAILED";

export type CaregiverDecision =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "MANUALLY_CORRECTED";

export type MatchType = "EXACT" | "FUZZY" | "NONE" | string;

export interface PrescriptionCandidate {
  id: number;
  ocrRawText?: string;
  extractedName?: string;
  extractedDosage?: string;
  extractedSchedule?: string;
  matchedItemSeq?: string;
  matchedItemName?: string;
  matchType?: MatchType;
  matchReason?: string;
  caregiverDecision: CaregiverDecision;
  caregiverChosenItemSeq?: string | null;
  createdMedicineId?: number | null;
}

export interface PrescriptionDetail {
  id: number;
  ownerId: number;
  status: PrescriptionStatus;
  maskedImageObjectKey?: string | null;
  failureReason?: string | null;
  candidates: PrescriptionCandidate[];
  createdAt: string;
}

export interface PrescriptionSummary {
  id: number;
  status: PrescriptionStatus;
  createdAt: string;
}

/** 처방전 OCR 등록 — presigned 업로드 후 받은 objectKey 전달 */
export async function registerPrescription(
  objectKey: string,
): Promise<PrescriptionDetail> {
  return apiFetch<PrescriptionDetail>("/api/v1/prescriptions", {
    method: "POST",
    json: { objectKey },
    // OCR + AI 추출은 5~10s 소요, 여유롭게 60s
    timeout: 60_000,
  });
}

/** 처방전 목록 조회 (status로 필터 가능) */
export async function listPrescriptions(
  status?: PrescriptionStatus,
): Promise<{ responses: PrescriptionSummary[] }> {
  return apiFetch("/api/v1/prescriptions", {
    query: { status },
  });
}

/** 처방전 상세 조회 */
export async function getPrescription(
  prescriptionId: number,
): Promise<PrescriptionDetail> {
  return apiFetch<PrescriptionDetail>(
    `/api/v1/prescriptions/${prescriptionId}`,
  );
}

/** 처방전 후보 결정 (ACCEPTED / REJECTED / MANUALLY_CORRECTED) */
export async function decideCandidate(
  prescriptionId: number,
  candidateId: number,
  decision: Exclude<CaregiverDecision, "PENDING">,
  chosenItemSeq?: string,
): Promise<void> {
  await apiFetch<void>(
    `/api/v1/prescriptions/${prescriptionId}/medicines/${candidateId}`,
    {
      method: "PATCH",
      json: {
        decision,
        chosenItemSeq:
          decision === "MANUALLY_CORRECTED" ? chosenItemSeq : undefined,
      },
    },
  );
}

/** 처방전 전체 확인 → CONFIRMED 전이 + Medicine 생성 */
export async function confirmPrescription(
  prescriptionId: number,
): Promise<PrescriptionDetail> {
  return apiFetch<PrescriptionDetail>(
    `/api/v1/prescriptions/${prescriptionId}/confirm`,
    { method: "POST" },
  );
}

/** 처방전 폐기 (REJECTED) */
export async function discardPrescription(
  prescriptionId: number,
): Promise<void> {
  await apiFetch<void>(
    `/api/v1/prescriptions/${prescriptionId}/reject`,
    { method: "POST" },
  );
}

/** 보호자 수동 약물 추가 (식약처 검색 결과 사용) */
export async function addManualCandidate(
  prescriptionId: number,
  body: {
    itemSeq: string;
    itemName: string;
    dosage?: string;
    schedule?: string;
  },
): Promise<PrescriptionDetail> {
  return apiFetch<PrescriptionDetail>(
    `/api/v1/prescriptions/${prescriptionId}/medicines`,
    {
      method: "POST",
      json: body,
    },
  );
}
