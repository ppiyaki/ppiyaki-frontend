import { apiFetch } from "./api";
import type { ServerMealSlot } from "./user-settings";

/* ────────── 공용 enum ────────── */

export type DayStatus =
  | "PERFECT"
  | "DELAYED"
  | "MISSED"
  | "PENDING"
  | "FUTURE";

/** 슬롯 단위 status — daily/weekly에서 NOT_SCHEDULED 추가 */
export type SlotStatus =
  | "PERFECT"
  | "DELAYED"
  | "MISSED"
  | "PENDING"
  | "NOT_SCHEDULED";

/* ────────── monthly ────────── */

export interface MonthlyDay {
  date: string; // YYYY-MM-DD
  dayStatus: DayStatus;
}

export interface MonthlyDashboard {
  seniorId: number;
  yearMonth: string; // YYYY-MM
  days: MonthlyDay[];
}

/** 보호자 대시보드 월간 — yearMonth = "YYYY-MM" */
export async function getDashboardMonthly(
  seniorId: number,
  yearMonth: string,
): Promise<MonthlyDashboard> {
  return apiFetch<MonthlyDashboard>(
    `/api/v1/seniors/${seniorId}/dashboard/monthly`,
    { query: { yearMonth } },
  );
}

/* ────────── weekly ────────── */

export interface WeeklySlotMarker {
  slot: ServerMealSlot;
  status: SlotStatus;
}

export interface WeeklyDay {
  date: string; // YYYY-MM-DD
  dayStatus: DayStatus;
  slots: WeeklySlotMarker[];
}

export interface WeeklyDashboard {
  seniorId: number;
  weekStart: string; // YYYY-MM-DD (일요일 권장)
  weekEnd: string; // YYYY-MM-DD
  /** % (0~100, 소수점 둘째자리). 모두 NOT_SCHEDULED/FUTURE면 null */
  adherenceRate: number | null;
  days: WeeklyDay[];
}

/** 보호자 대시보드 주간 — weekStart = ISO YYYY-MM-DD (일요일) */
export async function getDashboardWeekly(
  seniorId: number,
  weekStart: string,
): Promise<WeeklyDashboard> {
  return apiFetch<WeeklyDashboard>(
    `/api/v1/seniors/${seniorId}/dashboard/weekly`,
    { query: { weekStart } },
  );
}

/* ────────── daily ────────── */

export interface DailySlotMedicine {
  medicineId: number;
  name: string;
  dosage: string;
}

export interface DailySlot {
  slot: ServerMealSlot;
  status: SlotStatus;
  /** "HH:mm:ss" — 시니어가 mealTimes 미설정이면 null */
  mealTime: string | null;
  takenAt: string | null; // ISO datetime
  photoUrl: string | null;
  medicines: DailySlotMedicine[];
}

export interface DailyMedicine {
  medicineId: number;
  name: string;
  slots: ServerMealSlot[];
}

export interface DailyHeader {
  seniorName: string;
  caregiverName: string;
  /** MIN(remainingAmount / dailyConsumption). 모든 medicine이 0이면 null */
  remainingDays: number | null;
}

export interface DailyDashboard {
  seniorId: number;
  date: string; // YYYY-MM-DD
  dayStatus: DayStatus;
  header: DailyHeader;
  slots: DailySlot[];
  medicines: DailyMedicine[];
}

/** 보호자 대시보드 일간 — date = ISO YYYY-MM-DD */
export async function getDashboardDaily(
  seniorId: number,
  date: string,
): Promise<DailyDashboard> {
  return apiFetch<DailyDashboard>(
    `/api/v1/seniors/${seniorId}/dashboard/daily`,
    { query: { date } },
  );
}
