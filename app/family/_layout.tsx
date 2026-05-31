import {
  NOTIFICATION_UPDATED_EVENT,
  listNotifications,
} from "@/services/notifications";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { DeviceEventEmitter, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const POLL_INTERVAL_MS = 30_000;

export default function FamilyTabLayout() {
  const insets = useSafeAreaInsets();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await listNotifications({ size: 20 });
        if (!cancelled) {
          setHasUnread(res.responses.some((n) => !n.isRead));
        }
      } catch {
        // 무시 — 일시 실패는 표시 안 함
      }
    };
    void check();
    const timer = setInterval(check, POLL_INTERVAL_MS);
    // 알림 화면에서 읽음 처리 직후 즉시 뱃지 갱신
    const sub = DeviceEventEmitter.addListener(NOTIFICATION_UPDATED_EVENT, () => {
      void check();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#5BC4AE",
        tabBarInactiveTintColor: "#999",
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Pretendard-Medium",
        },
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F1ECDB",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: "기록",
          tabBarIcon: ({ color }) => (
            <Ionicons name="clipboard-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "알림",
          tabBarIcon: ({ color }) => (
            <View>
              <Ionicons name="notifications-outline" size={24} color={color} />
              {hasUnread && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#E14B4B",
                    borderWidth: 1.5,
                    borderColor: "#FFF",
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "내 정보",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="medications"
        options={{ href: null }}
      />
    </Tabs>
  );
}
