import { apiFetch } from "./api";
import type { ServerMealSlot } from "./user-settings";

export interface MedicationSchedule {
  id: number;
  medicineId: number;
  /** v0.9.0: BREAKFAST/LUNCH/DINNER ENUM (DB 저장값) */
  mealSlot: ServerMealSlot;
  /** v0.9.0: 시니어 mealTimes로 동적 계산되어 응답에만 포함 ("HH:mm:ss") */
  scheduledTime: string;
  dosage: string;
  daysOfWeek: string; // "DAILY" 또는 "MON,WED,FRI"
  startDate: string; // ISO date
  endDate: string | null;
  createdAt: string;
}

export interface CreateScheduleBody {
  /** v0.9.0: 절대 시각 대신 식사 슬롯으로 등록 */
  mealSlot: ServerMealSlot;
  dosage: string;
  daysOfWeek?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateScheduleBody {
  mealSlot?: ServerMealSlot;
  dosage?: string;
  daysOfWeek?: string;
  startDate?: string;
  endDate?: string | null;
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
  body: UpdateScheduleBody,
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
