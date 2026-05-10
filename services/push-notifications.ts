import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  DevicePlatform,
  registerDeviceToken,
  unregisterDeviceToken,
} from "./devices";
import { getAccessToken } from "./token-storage";

const TOKEN_ID_KEY = "fcmTokenId";

function detectPlatform(): DevicePlatform {
  if (Platform.OS === "ios") return "IOS";
  if (Platform.OS === "android") return "ANDROID";
  return "WEB";
}

/**
 * 권한 요청 → 디바이스 토큰 발급 → 백엔드 등록.
 * 인증되지 않았거나 권한 거절 시 조용히 종료. 실패해도 throw 하지 않음.
 *
 * 안드로이드는 google-services.json이 있어야 FCM 토큰 발급됨.
 * iOS는 APNS 토큰. 백엔드가 FCM/APNS 둘 다 받도록 구성되어 있어야 한다.
 */
export async function setupPushAndRegister(): Promise<void> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("[push] permission not granted");
      return;
    }

    const tokenRes = await Notifications.getDevicePushTokenAsync();
    const token = tokenRes.data;
    if (typeof token !== "string" || token.length === 0) return;

    const result = await registerDeviceToken(token, detectPlatform());
    await SecureStore.setItemAsync(TOKEN_ID_KEY, String(result.tokenId));
  } catch (e) {
    console.log("[push] setup failed:", e);
  }
}

/**
 * 저장된 tokenId로 백엔드 비활성화 + 로컬 캐시 삭제.
 * 로그아웃 직전에 호출. 실패해도 무시 (서버 멱등).
 */
export async function tearDownPush(): Promise<void> {
  let idStr: string | null = null;
  try {
    idStr = await SecureStore.getItemAsync(TOKEN_ID_KEY);
    if (idStr) {
      await unregisterDeviceToken(Number(idStr));
    }
  } catch (e) {
    console.log("[push] teardown failed:", e);
  } finally {
    if (idStr) {
      await SecureStore.deleteItemAsync(TOKEN_ID_KEY).catch(() => {
        // 무시
      });
    }
  }
}
