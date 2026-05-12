import { resolveAuthRoute, ROUTE_PATHS } from "@/services/post-login";
import { getAccessToken } from "@/services/token-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * 앱 진입점. 저장된 토큰이 있으면 적절한 메인 화면으로,
 * 없으면 온보딩 인트로로 라우팅.
 */
export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) setTarget("/onboarding");
        return;
      }
      try {
        const route = await resolveAuthRoute();
        if (!cancelled) setTarget(ROUTE_PATHS[route]);
      } catch {
        if (!cancelled) setTarget("/onboarding");
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
