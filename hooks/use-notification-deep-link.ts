import { setPendingDeepLink } from "@/services/pending-deep-link";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

/** 시니어 메인(홈) 경로 */
const SENIOR_HOME = "/(tabs)";

/**
 * FCM/시스템 알림을 탭했을 때 카테고리별로 적절한 화면으로 이동.
 *
 * 동작:
 *  - MEDICATION_REMINDER(복약 알림): 곧바로 복약 인증 화면으로 보내지 않고 **시니어 홈**으로만
 *    이동한다. 자동으로 인증 화면에 진입하면 알림이 가리키는 스케줄과 화면이 실제 인증하는
 *    스케줄이 어긋나 "다른 알림이 인증되는" 문제가 생길 수 있어서, 인증은 홈에서 사용자가
 *    직접 고르게 한다.
 *  - PRESCRIPTION_REVIEW_REQUEST(처방전 검토 요청, 보호자): 처방전 검토 화면으로 이동.
 *
 * 두 진입 경로(안드로이드 cold start 멈춤 대응):
 *  - cold start (앱 종료 → 알림 탭 → 앱 실행): getLastNotificationResponseAsync.
 *    내비게이터가 준비되기 전이라 즉시 push 하면 index 의 <Redirect> 와 충돌해 멈춘다.
 *    · 복약 알림 → 시니어는 정상 라우팅으로 어차피 홈에 안착하므로 별도 처리 불필요.
 *    · 처방전 검토 → 보류 저장(setPendingDeepLink) 후, 메인 레이아웃에서 useConsumeDeepLink 가 이동.
 *  - 앱 실행 중 탭 (포그라운드/백그라운드): addNotificationResponseReceivedListener.
 *    내비게이터가 정착된 상태라 즉시 이동해도 안전.
 *
 * 같은 알림이 두 경로 모두에서 잡히는 경우를 대비해 identifier+date 로 중복 처리 방지.
 */
export function useNotificationDeepLink() {
  const router = useRouter();
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const readCategory = (
      response: Notifications.NotificationResponse,
    ): { data: Record<string, unknown>; category: string | null } => {
      const data = (response.notification.request.content.data ?? {}) as Record<
        string,
        unknown
      >;
      const category = typeof data.category === "string" ? data.category : null;
      return { data, category };
    };

    // 중복 처리 방지 — identifier + 발급 시각으로 키 구성. 처음 보는 응답이면 true.
    const isFirstTime = (
      response: Notifications.NotificationResponse,
    ): boolean => {
      const id =
        response.notification.request.identifier +
        ":" +
        String(response.notification.date);
      if (handledRef.current.has(id)) return false;
      handledRef.current.add(id);
      return true;
    };

    // 앱 실행 중 탭 → 내비게이터 준비됨 → 즉시 이동
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (!isFirstTime(response)) return;
        const { data, category } = readCategory(response);
        if (__DEV__) console.log("[push-deep-link] tap:", { category, data });

        if (category === "PRESCRIPTION_REVIEW_REQUEST") {
          const pId = parsePositiveNumber(
            data.prescriptionId ?? data.id ?? data.prescription_id,
          );
          if (pId != null) {
            router.push({
              pathname: "/prescription/review" as any,
              params: { id: String(pId) },
            });
          }
        } else if (category === "MEDICATION_REMINDER") {
          // 인증 화면으로 자동 진입하지 않고 시니어 홈으로 (잘못된 알림 인증 방지)
          router.navigate(SENIOR_HOME as any);
        }
      },
    );

    // cold start
    void (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (!last || !isFirstTime(last)) return;
        const { data, category } = readCategory(last);
        if (__DEV__) {
          console.log("[push-deep-link] cold start:", { category, data });
        }

        if (category === "PRESCRIPTION_REVIEW_REQUEST") {
          const pId = parsePositiveNumber(
            data.prescriptionId ?? data.id ?? data.prescription_id,
          );
          if (pId != null) {
            setPendingDeepLink({
              pathname: "/prescription/review",
              params: { id: String(pId) },
            });
          }
        }
        // MEDICATION_REMINDER: cold start 시 시니어는 정상 라우팅으로 홈에 안착하므로 별도 처리 없음.

        // 다음 실행 때 같은 알림이 또 launch 응답으로 잡혀 매번 이동하는 것 방지
        await Notifications.clearLastNotificationResponseAsync().catch(() => {
          // 일부 버전/플랫폼 미지원 — 무시
        });
      } catch (e) {
        console.log("[push-deep-link] cold-start read failed:", e);
      }
    })();

    return () => sub.remove();
  }, [router]);
}

function parsePositiveNumber(v: unknown): number | null {
  if (typeof v === "number" && v > 0) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!isNaN(n) && n > 0) return n;
  }
  return null;
}
