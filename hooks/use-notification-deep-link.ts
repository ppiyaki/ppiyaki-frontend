import * as Notifications from "expo-notifications";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

/**
 * FCM/시스템 알림을 탭했을 때 카테고리별로 적절한 화면으로 이동.
 *
 * - cold start (앱 종료 상태에서 알림 탭으로 실행): getLastNotificationResponseAsync 로 1회 처리
 * - 포그라운드/백그라운드 탭: addNotificationResponseReceivedListener 로 실시간 처리
 *
 * 같은 알림 응답이 두 경로 모두에서 잡힐 수 있으므로 actionIdentifier+date 로 중복 처리 방지.
 *
 * 안드로이드 cold start 멈춤(빈 노란 화면) 대응:
 * cold start 시 진입점인 app/index.tsx 는 인증 상태를 확인한 뒤 <Redirect> 로 실제 화면
 * ((tabs)/family/onboarding 등)으로 보낸다. 이 redirect 가 끝나기 전에 딥링크가
 * router.push 를 호출하면 redirect 와 push 가 충돌해 index 의 로딩 화면(노란 배경)에서
 * 멈춘다.
 * → 루트 내비게이터가 마운트되고(navState.key) "index 에서 실제 화면으로 넘어간"
 *   상태(settled)가 될 때까지 딥링크 push 를 보류했다가, 정착되는 순간 처리한다.
 */
export function useNotificationDeepLink() {
  const router = useRouter();
  const navState = useRootNavigationState();

  // 루트 스택이 마운트됐고, 현재 최상위 라우트가 더 이상 "index"(스플래시/라우팅 게이트)가
  // 아니면 = 인증 라우팅이 끝나 실제 화면에 정착된 것으로 본다.
  const currentRootRoute =
    navState && typeof navState.index === "number"
      ? navState.routes?.[navState.index]?.name
      : undefined;
  const settled = !!navState?.key && !!currentRootRoute && currentRootRoute !== "index";

  const handledRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Notifications.NotificationResponse | null>(null);

  useEffect(() => {
    const navigateForResponse = (
      response: Notifications.NotificationResponse,
    ) => {
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
          if (pId != null) {
            router.push({
              pathname: "/prescription/review" as any,
              params: { id: String(pId) },
            });
          }
          break;
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
          router.push({
            pathname: "/dose-confirm/intro" as any,
            params: {
              ...(scheduleId != null ? { scheduleId: String(scheduleId) } : {}),
              ...(targetDate ? { targetDate } : {}),
              ...(mealSlot ? { mealSlot } : {}),
            },
          });
          break;
        }
        // 나머지 카테고리는 기본 동작 (앱만 열림)
        default:
          break;
      }
    };

    const handleResponse = (response: Notifications.NotificationResponse) => {
      // 중복 처리 방지 — identifier + 발급 시각으로 키 구성
      const id =
        response.notification.request.identifier +
        ":" +
        String(response.notification.date);
      if (handledRef.current.has(id)) return;

      // 인증 라우팅이 끝나기 전(index 단계)이면 보류 — settled 되면 effect 재실행 시 flush
      if (!settled) {
        pendingRef.current = response;
        return;
      }

      handledRef.current.add(id);
      navigateForResponse(response);
    };

    // 라우팅이 정착되는 순간, 보류해둔 응답 처리
    if (settled && pendingRef.current) {
      const pending = pendingRef.current;
      pendingRef.current = null;
      handleResponse(pending);
    }

    // cold start — 앱이 종료된 상태에서 알림으로 실행됐을 때
    void (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) handleResponse(last);
      } catch (e) {
        console.log("[push-deep-link] cold-start read failed:", e);
      }
    })();

    // 포그라운드/백그라운드에서 알림 탭
    const sub = Notifications.addNotificationResponseReceivedListener(
      handleResponse,
    );
    return () => sub.remove();
  }, [router, settled]);
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
