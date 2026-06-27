import {
  PendingDeepLink,
  setPendingDeepLink,
} from "@/services/pending-deep-link";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

/**
 * FCM/시스템 알림을 탭했을 때 카테고리별로 적절한 화면으로 이동.
 *
 * 두 경로를 분리해서 처리한다 (안드로이드 cold start 멈춤 대응):
 *  - cold start (앱 종료 상태에서 알림 탭 → 앱 실행): getLastNotificationResponseAsync.
 *    이때는 진입점 index.tsx 의 인증 라우팅이 끝나기 전이라 내비게이터가 준비되지 않았다.
 *    바로 push 하면 index 의 <Redirect> 와 충돌해 노란 로딩 화면에서 멈춘다.
 *    → 곧바로 이동하지 말고 보류 저장(setPendingDeepLink). 인증 후 메인 레이아웃에서
 *      useConsumeDeepLink() 가 꺼내 이동한다.
 *  - 앱 실행 중 탭 (포그라운드/백그라운드): addNotificationResponseReceivedListener.
 *    이미 내비게이터가 정착된 상태이므로 즉시 push 해도 안전.
 *
 * 같은 알림이 두 경로 모두에서 잡히는 경우를 대비해 identifier+date 로 중복 처리 방지.
 */
export function useNotificationDeepLink() {
  const router = useRouter();
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 응답 → 이동할 딥링크. 해당 없으면 null (앱만 열림).
    const linkForResponse = (
      response: Notifications.NotificationResponse,
    ): PendingDeepLink | null => {
      const data = (response.notification.request.content.data ?? {}) as Record<
        string,
        unknown
      >;
      const category = typeof data.category === "string" ? data.category : null;

      if (__DEV__) {
        console.log("[push-deep-link] tap:", { category, data });
      }

      switch (category) {
        case "PRESCRIPTION_REVIEW_REQUEST": {
          const pId = parsePositiveNumber(
            data.prescriptionId ?? data.id ?? data.prescription_id,
          );
          return pId != null
            ? { pathname: "/prescription/review", params: { id: String(pId) } }
            : null;
        }
        case "MEDICATION_REMINDER": {
          const scheduleId = parseScheduleIdFromFcm(data);
          const targetDate =
            typeof data.targetDate === "string" ? data.targetDate : undefined;
          // 백엔드 #455: 푸시 data 에도 mealSlot 동봉됨
          const rawMealSlot = data.mealSlot;
          const mealSlot =
            rawMealSlot === "BREAKFAST" ||
            rawMealSlot === "LUNCH" ||
            rawMealSlot === "DINNER"
              ? rawMealSlot
              : undefined;
          return {
            pathname: "/dose-confirm/intro",
            params: {
              ...(scheduleId != null ? { scheduleId: String(scheduleId) } : {}),
              ...(targetDate ? { targetDate } : {}),
              ...(mealSlot ? { mealSlot } : {}),
            },
          };
        }
        default:
          return null;
      }
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
        const link = linkForResponse(response);
        if (link) {
          router.push({
            pathname: link.pathname as any,
            params: link.params,
          });
        }
      },
    );

    // cold start → 보류 저장 (메인 레이아웃 마운트 시 useConsumeDeepLink 가 이동)
    void (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (!last || !isFirstTime(last)) return;
        const link = linkForResponse(last);
        if (link) setPendingDeepLink(link);
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

/**
 * MEDICATION_REMINDER 푸시 data 에서 scheduleId 추출.
 * 묶음 발송 대응: 새 형식은 scheduleIds (JSON 배열 문자열) — 첫 id 사용.
 * 기존 단수 scheduleId 도 호환.
 */
function parseScheduleIdFromFcm(data: Record<string, unknown>): number | null {
  const raw = data.scheduleIds;
  if (typeof raw === "string") {
    try {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr) && typeof arr[0] === "number") return arr[0];
    } catch {
      // ignore
    }
  } else if (Array.isArray(raw) && typeof raw[0] === "number") {
    return raw[0];
  }
  return parsePositiveNumber(data.scheduleId);
}
