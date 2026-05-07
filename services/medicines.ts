import { apiFetch } from "./api";

export interface Medicine {
  id: number;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  prescriptionId: number | null;
  durWarningText: string | null;
  createdAt: string;
}

export interface MfdsMedicine {
  itemSeq: string;
  itemName: string;
  entpName?: string;
  mainIngr?: string;
  formName?: string;
  etcOtcCode?: string;
  className?: string;
}

/** 식약처 약물 검색 (수동 보정 / 수동 추가용) */
export async function searchMfdsMedicines(
  q: string,
  limit = 10,
): Promise<{ responses: MfdsMedicine[] }> {
  return apiFetch("/api/v1/medicines/search", {
    query: { q, limit },
  });
}

/** 본인 또는 시니어 약물 목록 조회 */
export async function listMedicines(
  seniorId?: number,
): Promise<{ responses: Medicine[] }> {
  return apiFetch("/api/v1/medicines", {
    query: { seniorId },
  });
}

/** 약물 단건 상세 조회 */
export async function getMedicine(medicineId: number): Promise<Medicine> {
  return apiFetch<Medicine>(`/api/v1/medicines/${medicineId}`);
}

/** 약물 수동 등록 */
export async function createMedicine(body: {
  seniorId?: number;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  durWarningText?: string;
}): Promise<Medicine> {
  return apiFetch<Medicine>("/api/v1/medicines", {
    method: "POST",
    json: body,
  });
}

/** 약물 부분 수정 */
export async function updateMedicine(
  medicineId: number,
  body: Partial<{
    name: string;
    totalAmount: number;
    remainingAmount: number;
    durWarningText: string;
  }>,
): Promise<Medicine> {
  return apiFetch<Medicine>(`/api/v1/medicines/${medicineId}`, {
    method: "PATCH",
    json: body,
  });
}

/** 약물 삭제 (연관 schedule cascade) */
export async function deleteMedicine(
  medicineId: number,
): Promise<{ deletedMedicineId: number; deletedScheduleCount: number }> {
  return apiFetch(`/api/v1/medicines/${medicineId}`, { method: "DELETE" });
}
