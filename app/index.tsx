import { resolveAuthRoute, ROUTE_PATHS } from "@/services/post-login";
import { getAccessToken } from "@/services/token-storage";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

const ONBOARDING_SEEN_KEY = "onboarding_seen";

/**
 * 앱 진입점.
 *  - 토큰 있음 → 적절한 메인으로
 *  - 토큰 없음 + 온보딩 인트로 미시청 → /onboarding (안녕하세요 화면)
 *  - 토큰 없음 + 온보딩 인트로 시청 완료 → /select-role 로 바로 (재방문자)
 */
export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getAccessToken();
      if (!token) {
        const seen = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY).catch(
          () => null,
        );
        if (!cancelled) setTarget(seen ? "/select-role" : "/onboarding");
        return;
      }
      try {
        const route = await resolveAuthRoute();
        if (!cancelled) setTarget(ROUTE_PATHS[route]);
      } catch {
        const seen = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY).catch(
          () => null,
        );
        if (!cancelled) setTarget(seen ? "/select-role" : "/onboarding");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFD24D",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Redirect href={target as any} />;
}
