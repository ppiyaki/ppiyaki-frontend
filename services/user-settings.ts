import * as SecureStore from "expo-secure-store";
import { apiFetch } from "./api";
import type { ServerMealTimes } from "./auth";

export type MealSlot = "morning" | "noon" | "night";
export type ServerMealSlot = "BREAKFAST" | "LUNCH" | "DINNER";

const CLIENT_TO_SERVER: Record<MealSlot, ServerMealSlot> = {
  morning: "BREAKFAST",
  noon: "LUNCH",
  night: "DINNER",
};

const SERVER_TO_CLIENT: Record<ServerMealSlot, MealSlot> = {
  BREAKFAST: "morning",
  LUNCH: "noon",
  DINNER: "night",
};

export function toServerSlot(s: MealSlot): ServerMealSlot {
  return CLIENT_TO_SERVER[s];
}

export function fromServerSlot(s: ServerMealSlot): MealSlot {
  return SERVER_TO_CLIENT[s];
}

export interface MealTimes {
  morning: string; // "HH:mm"
  noon: string;
  night: string;
}

export const DEFAULT_MEAL_TIMES: MealTimes = {
  morning: "08:00",
  noon: "13:00",
  night: "19:00",
};

const STORAGE_KEY = "meal_times";

/* ────────────────── 서버 ↔ 로컬 변환 ────────────────── */

/** 서버 형식("HH:mm:ss" + breakfast/lunch/dinner) → 로컬 형식 */
export function fromServerMealTimes(s: ServerMealTimes | null | undefined): MealTimes {
  if (!s) return DEFAULT_MEAL_TIMES;
  return {
    morning: (s.breakfast ?? "08:00:00").slice(0, 5),
    noon: (s.lunch ?? "13:00:00").slice(0, 5),
    night: (s.dinner ?? "19:00:00").slice(0, 5),
  };
}

/** 로컬 형식 → 서버 형식 */
export function toServerMealTimes(t: MealTimes): ServerMealTimes {
  return {
    breakfast: `${t.morning}:00`,
    lunch: `${t.noon}:00`,
    dinner: `${t.night}:00`,
  };
}

/* ────────────────── 로컬 캐시 ────────────────── */

/** 로컬 캐시 식사 시간 조회. 없으면 기본값. */
export async function getMealTimes(): Promise<MealTimes> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return DEFAULT_MEAL_TIMES;
  try {
    const parsed = JSON.parse(raw) as Partial<MealTimes>;
    return {
      morning: parsed.morning ?? DEFAULT_MEAL_TIMES.morning,
      noon: parsed.noon ?? DEFAULT_MEAL_TIMES.noon,
      night: parsed.night ?? DEFAULT_MEAL_TIMES.night,
    };
  } catch {
    return DEFAULT_MEAL_TIMES;
  }
}

/** 로컬에만 저장 (오프라인/임시용) */
export async function cacheMealTimesLocally(times: MealTimes): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(times));
}

/** 한 번이라도 시간을 설정했는지 (첫 설정 화면 노출 여부 결정용) */
export async function hasMealTimes(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  return raw !== null;
}

/* ────────────────── 서버 동기화 ────────────────── */

/** 서버에 식사 시간 갱신 + 로컬 캐시. /me 응답 형식으로 반환 */
export async function setMealTimes(times: MealTimes): Promise<void> {
  await apiFetch("/api/v1/users/me/meal-times", {
    method: "PUT",
    json: toServerMealTimes(times),
  });
  await cacheMealTimesLocally(times);
}

/** /me 응답의 mealTimes를 로컬 캐시에 저장 (앱 진입/dev-login 후 호출) */
export async function syncMealTimesFromServer(
  serverMealTimes: ServerMealTimes | null | undefined,
): Promise<MealTimes> {
  const local = fromServerMealTimes(serverMealTimes);
  if (serverMealTimes) {
    await cacheMealTimesLocally(local);
  }
  return local;
}

/* ────────────────── 시각 ↔ 슬롯 변환 ────────────────── */

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

function cyclicDiff(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 24 * 60 - d);
}

/**
 * 구체 시각("08:00:00" 또는 "08:00") → 가장 가까운 식사 시간대로 매핑.
 * 사용자 시간 기준으로 cyclic distance가 가장 짧은 슬롯 반환.
 */
export function timeToSlot(time: string, meals: MealTimes): MealSlot {
  const target = parseTimeToMinutes(time.slice(0, 5));
  const candidates: { slot: MealSlot; diff: number }[] = [
    { slot: "morning", diff: cyclicDiff(target, parseTimeToMinutes(meals.morning)) },
    { slot: "noon", diff: cyclicDiff(target, parseTimeToMinutes(meals.noon)) },
    { slot: "night", diff: cyclicDiff(target, parseTimeToMinutes(meals.night)) },
  ];
  candidates.sort((a, b) => a.diff - b.diff);
  return candidates[0].slot;
}

/**
 * 슬롯 → 사용자 설정 시각 ("HH:mm:ss" 형식, 서버 전송용)
 */
export function slotToTime(slot: MealSlot, meals: MealTimes): string {
  return `${meals[slot]}:00`;
}
