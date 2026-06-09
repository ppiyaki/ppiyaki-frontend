import { getMe } from "./auth";
import {
  DEFAULT_MEAL_TIMES,
  setMealTimes,
  syncMealTimesFromServer,
} from "./user-settings";

export type AuthRoute = "onboarding" | "senior" | "family";

/**
 * /me 결과에 따라 다음에 갈 라우트 결정.
 * - role=SENIOR → 시니어 메인
 * - 기존 닉네임이 있거나 isOnboarded=true인 CAREGIVER/FAMILY → 보호자 메인
 * - 그 외 isOnboarded=false → 온보딩
 *
 * 부수 효과:
 *  1) mealTimes를 로컬 캐시에 동기화한다.
 *  2) 시니어 본인이고 서버 mealTimes가 null이면 디폴트 값을 자동 PUT.
 *     (백엔드가 디폴트 INSERT를 처리하기 전까지의 워크어라운드)
 */
export async function resolveAuthRoute(): Promise<AuthRoute> {
  const me = await getMe();
  await syncMealTimesFromServer(me.mealTimes);
  if (me.role === "SENIOR" && !me.mealTimes) {
    try {
      await setMealTimes(DEFAULT_MEAL_TIMES);
    } catch (e) {
      console.log("[post-login] default mealTimes seed failed:", e);
    }
  }
  if (me.role === "SENIOR") return "senior";
  if (me.nickname?.trim()) return "family";
  if (
    me.isOnboarded === true &&
    (me.role === "CAREGIVER" || me.role === "FAMILY")
  ) {
    return "family";
  }
  if (me.isOnboarded === false) return "onboarding";
  return "family";
}

export const ROUTE_PATHS: Record<AuthRoute, string> = {
  onboarding: "/signup/terms",
  senior: "/(tabs)",
  family: "/family",
};
