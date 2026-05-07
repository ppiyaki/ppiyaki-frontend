import type { MealSlot } from "./user-settings";

const SLOT_KEYWORDS: Record<MealSlot, string[]> = {
  morning: ["아침", "오전", "조식"],
  noon: ["점심", "정오", "낮", "중식"],
  night: ["저녁", "밤", "취침전", "자기전", "석식"],
};

const FREQ_TO_SLOTS: { regex: RegExp; slots: MealSlot[] }[] = [
  // 횟수 + 명시적 시간대가 둘 다 있을 수도 있어서 explicit 우선 처리 후 fallback
  { regex: /(1일|하루)\s*1회/, slots: [] },
  { regex: /(1일|하루)\s*2회/, slots: ["morning", "night"] },
  { regex: /(1일|하루)\s*3회/, slots: ["morning", "noon", "night"] },
  { regex: /(1일|하루)\s*4회/, slots: ["morning", "noon", "night"] }, // 4회는 매핑 불가, 3슬롯으로 폴백
];

/**
 * extractedSchedule 자유 텍스트를 슬롯 배열로 변환.
 *
 * 우선순위:
 * 1. 명시적 시간대 키워드 (아침/점심/저녁) 추출
 * 2. 횟수 패턴 (1일 N회) → 기본 매핑
 * 3. 매칭 실패 시 빈 배열
 *
 * 예시:
 *   "1일 3회 식후"      → ["morning", "noon", "night"]
 *   "아침 식전"         → ["morning"]
 *   "1일 1회 저녁"      → ["night"]
 *   "1일 2회"           → ["morning", "night"]
 *   "필요시"            → []
 */
export function parseExtractedSchedule(
  text: string | null | undefined,
): MealSlot[] {
  if (!text) return [];
  const normalized = text.trim();

  // 1) 명시적 시간대 키워드
  const explicit: MealSlot[] = [];
  (Object.keys(SLOT_KEYWORDS) as MealSlot[]).forEach((slot) => {
    if (SLOT_KEYWORDS[slot].some((k) => normalized.includes(k))) {
      explicit.push(slot);
    }
  });
  if (explicit.length > 0) return dedupe(explicit);

  // 2) 횟수 패턴
  for (const pattern of FREQ_TO_SLOTS) {
    if (pattern.regex.test(normalized) && pattern.slots.length > 0) {
      return [...pattern.slots];
    }
  }

  return [];
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
