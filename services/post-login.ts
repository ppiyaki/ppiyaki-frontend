import { getMe } from "./auth";
import { syncMealTimesFromServer } from "./user-settings";

export type AuthRoute = "onboarding" | "senior" | "family";

/**
 * /me 결과에 따라 다음에 갈 라우트 결정.
 * - isOnboarded=false → 온보딩
 * - role=SENIOR → 시니어 메인
 * - 그 외 (CAREGIVER/FAMILY 등) → 보호자 메인
 *
 * 부수 효과: mealTimes를 로컬 캐시에 동기화한다.
 */
export async function resolveAuthRoute(): Promise<AuthRoute> {
  const me = await getMe();
  await syncMealTimesFromServer(me.mealTimes);
  if (!me.isOnboarded) return "onboarding";
  if (me.role === "SENIOR") return "senior";
  return "family";
}

export const ROUTE_PATHS: Record<AuthRoute, string> = {
  onboarding: "/signup/nickname",
  senior: "/(tabs)",
  family: "/family",
};
