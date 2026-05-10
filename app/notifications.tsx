import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { ApiError } from "@/services/api";
import {
  NotificationCategory,
  NotificationItem,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { ComponentProps, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type IconSpec =
  | { family: "ionicons"; name: IoniconName }
  | { family: "material"; name: ComponentProps<typeof MaterialCommunityIcons>["name"] };

interface DateGroup {
  date: string;
  items: NotificationItem[];
}

const CATEGORY_META: Record<
  NotificationCategory,
  { icon: IconSpec; color: string; bg: string }
> = {
  MEDICATION_REMINDER: {
    icon: { family: "material", name: "pill" },
    color: "#F8B835",
    bg: "#FFF4D6",
  },
  MEDICATION_DELAY: {
    icon: { family: "ionicons", name: "alarm" },
    color: "#E14B4B",
    bg: "#FCE4E4",
  },
  DUR_WARNING: {
    icon: { family: "ionicons", name: "warning" },
    color: "#E14B4B",
    bg: "#FCE4E4",
  },
  FAMILY_SAFETY: {
    icon: { family: "ionicons", name: "people" },
    color: "#4799E0",
    bg: "#DDEBF8",
  },
  MEDICATION_COMPLETE: {
    icon: { family: "ionicons", name: "checkmark-circle" },
    color: "#5BC4AE",
    bg: "#D6F1EA",
  },
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listNotifications();
      setItems(res.responses);
      setCursor(res.nextCursor);
      setHasNext(res.hasNext);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.toUserMessage()
          : "알림을 불러오지 못했어요",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!hasNext || cursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listNotifications({ cursor });
      setItems((prev) => [...prev, ...res.responses]);
      setCursor(res.nextCursor);
      setHasNext(res.hasNext);
    } catch (e) {
      console.log("[notif] load more failed:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (id: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, isRead: true, readAt: new Date().toISOString() } : it,
      ),
    );
    try {
      await markNotificationRead(id);
    } catch (e) {
      console.log("[notif] mark read failed:", e);
    }
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true, readAt: now })));
    try {
      await markAllNotificationsRead();
    } catch (e) {
      console.log("[notif] mark all read failed:", e);
    }
  };

  const groups = groupByDate(items);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <PageHeader
        title="알림"
        rightSlot={
          items.some((it) => !it.isRead) ? (
            <Pressable
              onPress={markAllRead}
              style={({ pressed }) => [
                styles.markBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <AppText type="pretendard-b" style={styles.markText}>
                모두 읽음
              </AppText>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color="#FFD24D" />
          </View>
        )}

        {!loading && error && (
          <View style={styles.stateBox}>
            <Ionicons name="alert-circle" size={28} color="#E14B4B" />
            <AppText type="pretendard-m" style={styles.stateText}>
              {error}
            </AppText>
          </View>
        )}

        {!loading && !error && groups.length === 0 && (
          <View style={styles.stateBox}>
            <Ionicons name="notifications-off" size={32} color="#BBB" />
            <AppText type="pretendard-m" style={styles.stateText}>
              새 알림이 없어요
            </AppText>
          </View>
        )}

        {!loading &&
          !error &&
          groups.map((group) => (
            <View key={group.date} style={styles.group}>
              <AppText type="pretendard-b" style={styles.dateLabel}>
                {group.date}
              </AppText>
              {group.items.map((item) => (
                <NotifCard
                  key={item.id}
                  item={item}
                  onMarkRead={() => markRead(item.id)}
                />
              ))}
            </View>
          ))}

        {!loading && !error && hasNext && (
          <Pressable
            onPress={loadMore}
            disabled={loadingMore}
            style={({ pressed }) => [
              styles.moreBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color="#5BC4AE" />
            ) : (
              <AppText type="pretendard-b" style={styles.moreBtnText}>
                더 보기
              </AppText>
            )}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotifCard({
  item,
  onMarkRead,
}: {
  item: NotificationItem;
  onMarkRead: () => void;
}) {
  const router = useRouter();
  const meta = CATEGORY_META[item.category];
  const showConfirm =
    item.category === "MEDICATION_REMINDER" && !item.isRead;

  return (
    <Pressable
      onPress={() => {
        if (!item.isRead) onMarkRead();
      }}
      style={({ pressed }) => [
        styles.card,
        !item.isRead && styles.cardUnread,
        pressed && { backgroundColor: "#FBF7EC" },
      ]}
    >
      <Image
        source={require("../assets/images/character/Senior3.png")}
        style={styles.avatar}
        resizeMode="contain"
      />
      <View style={{ flex: 1 }}>
        <AppText type="pretendard-b" style={styles.cardTitle}>
          {item.title}
        </AppText>
        {!!item.body && (
          <AppText type="pretendard-r" style={styles.cardSubtitle}>
            {item.body}
          </AppText>
        )}
        <View style={[styles.timePill, { backgroundColor: meta.bg }]}>
          {meta.icon.family === "ionicons" ? (
            <Ionicons name={meta.icon.name} size={13} color={meta.color} />
          ) : (
            <MaterialCommunityIcons
              name={meta.icon.name}
              size={13}
              color={meta.color}
            />
          )}
          <AppText type="pretendard-b" style={[styles.timeText, { color: meta.color }]}>
            {formatTime(item.createdAt)}
          </AppText>
        </View>
      </View>
      {showConfirm ? (
        <Pressable
          onPress={() => {
            onMarkRead();
            router.push("/dose-confirm/intro" as any);
          }}
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <AppText type="pretendard-b" style={styles.confirmText}>
            확인
          </AppText>
        </Pressable>
      ) : item.isRead ? (
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark" size={18} color="#AAA" />
        </View>
      ) : null}
    </Pressable>
  );
}

function groupByDate(items: NotificationItem[]): DateGroup[] {
  const map = new Map<string, NotificationItem[]>();
  for (const it of items) {
    const date = it.createdAt.slice(0, 10);
    const arr = map.get(date) ?? [];
    arr.push(it);
    map.set(date, arr);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${m}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFCF3" },
  scroll: { padding: 16, paddingBottom: 24 },

  markBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E8F7F2",
  },
  markText: { fontSize: 13, color: "#5BC4AE" },

  stateBox: { paddingVertical: 60, alignItems: "center", gap: 8 },
  stateText: { fontSize: 14, color: "#888" },

  group: { marginBottom: 16 },
  dateLabel: {
    fontSize: 14,
    color: "#444",
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDE8D6",
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  cardUnread: { borderColor: "#FFD24D", backgroundColor: "#FFFCEF" },
  avatar: { width: 48, height: 48 },
  cardTitle: { fontSize: 14, color: "#171717" },
  cardSubtitle: { fontSize: 12, color: "#888", marginTop: 2 },
  timePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  timeText: { fontSize: 11 },

  confirmBtn: {
    backgroundColor: "#FFD045",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  confirmText: { fontSize: 13, color: "#333" },
  doneBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },

  moreBtn: {
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BDEFEA",
    backgroundColor: "#FFF",
    marginTop: 4,
  },
  moreBtnText: { fontSize: 14, color: "#5BC4AE" },
});
