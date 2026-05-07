import { apiFetch } from "./api";

export interface MedicationSchedule {
  id: number;
  medicineId: number;
  scheduledTime: string; // "HH:mm:ss"
  dosage: string;
  daysOfWeek: string; // "DAILY" 또는 "MON,WED,FRI"
  startDate: string; // ISO date
  endDate: string | null;
  createdAt: string;
}

export interface CreateScheduleBody {
  scheduledTime: string; // "HH:mm" 또는 "HH:mm:ss"
  dosage: string;
  daysOfWeek?: string;
  startDate?: string;
  endDate?: string;
}

/** 복약 일정 등록 */
export async function createSchedule(
  medicineId: number,
  body: CreateScheduleBody,
): Promise<MedicationSchedule> {
  return apiFetch<MedicationSchedule>(
    `/api/v1/medicines/${medicineId}/schedules`,
    { method: "POST", json: body },
  );
}

/** 복약 일정 목록 조회 */
export async function listSchedules(
  medicineId: number,
): Promise<{ responses: MedicationSchedule[] }> {
  return apiFetch(`/api/v1/medicines/${medicineId}/schedules`);
}

/** 복약 일정 단건 조회 */
export async function getSchedule(
  medicineId: number,
  scheduleId: number,
): Promise<MedicationSchedule> {
  return apiFetch<MedicationSchedule>(
    `/api/v1/medicines/${medicineId}/schedules/${scheduleId}`,
  );
}

/** 복약 일정 부분 수정 */
export async function updateSchedule(
  medicineId: number,
  scheduleId: number,
  body: Partial<CreateScheduleBody>,
): Promise<MedicationSchedule> {
  return apiFetch<MedicationSchedule>(
    `/api/v1/medicines/${medicineId}/schedules/${scheduleId}`,
    { method: "PATCH", json: body },
  );
}

/** 복약 일정 삭제 */
export async function deleteSchedule(
  medicineId: number,
  scheduleId: number,
): Promise<void> {
  await apiFetch<void>(
    `/api/v1/medicines/${medicineId}/schedules/${scheduleId}`,
    { method: "DELETE" },
  );
}
