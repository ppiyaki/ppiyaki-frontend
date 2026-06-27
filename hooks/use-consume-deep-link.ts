import { consumePendingDeepLink } from "@/services/pending-deep-link";
import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * 인증 후 메인 레이아웃(시니어 (tabs) / 보호자 family)이 마운트되는 시점에
 * cold start 로 보류된 알림 딥링크가 있으면 꺼내서 이동한다.
 *
 * 이 시점엔 내비게이터가 완전히 준비돼 있고 메인 화면이 스택에 깔려 있으므로,
 * push 한 화면에서 뒤로가기 하면 홈으로 정상 복귀한다.
 */
export function useConsumeDeepLink() {
  const router = useRouter();

  useEffect(() => {
    const link = consumePendingDeepLink();
    if (!link) return;
    router.push({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pathname: link.pathname as any,
      params: link.params,
    });
  }, [router]);
}
