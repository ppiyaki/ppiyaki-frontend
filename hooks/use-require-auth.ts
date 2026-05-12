import { getAccessToken } from "@/services/token-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";

/**
 * 인증 필수 화면에서 사용. 화면이 포커스될 때마다 access token 존재 여부 확인.
 * 토큰 없으면 (= 로그아웃 상태) 즉시 진입점 `/` 로 회수.
 * `/` 에서 다시 토큰 체크 후 적절한 미인증 라우트로 redirect.
 */
export function useRequireAuth() {
  const router = useRouter();
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const token = await getAccessToken();
        if (!token && !cancelled) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          router.replace("/" as any);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [router]),
  );
}
