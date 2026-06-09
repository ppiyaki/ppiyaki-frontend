import { SignupProvider } from "@/contexts/signup-context";
import { getMe } from "@/services/auth";
import { ROUTE_PATHS } from "@/services/post-login";
import { getAccessToken } from "@/services/token-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";

export default function SignupLayout() {
  const router = useRouter();
  const { prefillNickname } = useLocalSearchParams<{
    prefillNickname?: string;
  }>();

  useEffect(() => {
    if (prefillNickname) return;
    let cancelled = false;
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        const me = await getMe(true);
        if (cancelled) return;
        if (me.role === "SENIOR") {
          router.replace(ROUTE_PATHS.senior as any);
          return;
        }
        if (
          me.nickname?.trim() ||
          (me.isOnboarded === true &&
            (me.role === "CAREGIVER" || me.role === "FAMILY"))
        ) {
          router.replace(ROUTE_PATHS.family as any);
        }
      } catch {
        // 토큰이 무효하면 기존 온보딩 화면을 그대로 둔다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prefillNickname, router]);

  return (
    <SignupProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SignupProvider>
  );
}
