export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const ALL_WEEKDAYS: Weekday[] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
};

const WEEKDAY_SET = new Set<Weekday>(ALL_WEEKDAYS);

/** API daysOfWeek 값을 요일 배열 또는 "DAILY"로 파싱 */
export function parseDaysOfWeek(value: string): Weekday[] | "DAILY" {
  if (value === "DAILY") return "DAILY";
  return value
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is Weekday => WEEKDAY_SET.has(s as Weekday));
}

/** 요일 배열 → API에 보낼 daysOfWeek 문자열 */
export function formatDaysOfWeek(days: Weekday[]): string {
  if (days.length === 0) return "DAILY";
  if (days.length === 7) return "DAILY";
  // ALL_WEEKDAYS 순서대로 정렬
  return ALL_WEEKDAYS.filter((d) => days.includes(d)).join(",");
}

/** 사용자 표시용 — "DAILY" → "매일", "MON,WED,FRI" → "월·수·금" */
export function describeDaysOfWeek(value: string): string {
  if (value === "DAILY") return "매일";
  const parsed = parseDaysOfWeek(value);
  if (parsed === "DAILY") return "매일";
  return parsed.map((d) => WEEKDAY_LABELS[d]).join("·");
}
