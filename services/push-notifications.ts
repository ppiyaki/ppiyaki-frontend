import messaging from "@react-native-firebase/messaging";
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

/**
 * 포그라운드 푸시 도착 시 시스템 배너 + 사운드 + 뱃지 표시.
 * 모듈 로드 시 1회 설정 (앱 부팅 시 root layout 가 이 모듈 import 함).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function detectPlatform(): DevicePlatform {
  if (Platform.OS === "ios") return "IOS";
  if (Platform.OS === "android") return "ANDROID";
  return "WEB";
}

/**
 * 권한 요청 → FCM 토큰 발급 → 백엔드 등록.
 * 인증되지 않았거나 권한 거절 시 조용히 종료. 실패해도 throw 하지 않음.
 *
 * Android: google-services.json 통해 Firebase 가 자동 초기화 → FCM 토큰 발급.
 * iOS: GoogleService-Info.plist + APNs 키 (Firebase Console) 통해 Firebase iOS bridge
 *      가 APNs 토큰을 받아 FCM 토큰으로 변환. messaging().getToken() 으로 양쪽 모두
 *      동일한 FCM 토큰 형식 획득.
 */
export async function setupPushAndRegister(): Promise<void> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    // 권한 요청 — expo-notifications 와 firebase messaging 양쪽 다 같은 OS 권한을
    // 본다. 일관성 위해 expo-notifications API 로 처리.
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

    // iOS는 APNs 토큰 등록이 선행돼야 FCM 토큰 발급 가능
    if (Platform.OS === "ios") {
      await messaging().registerDeviceForRemoteMessages();
    }

    const token = await messaging().getToken();
    if (typeof token !== "string" || token.length === 0) {
      console.log("[push] empty FCM token");
      return;
    }

    if (__DEV__) {
      console.log(
        "[push] FCM token acquired:",
        Platform.OS,
        token.slice(0, 16) + "...",
      );
    }

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
