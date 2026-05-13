import AppText from "@/components/app-text";
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
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterKey = "all" | "warning" | "done";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "warning", label: "긴급 경고" },
  { key: "done", label: "복약 완료" },
];

const WARNING_CATEGORIES: NotificationCategory[] = [
  "MEDICATION_DELAY",
  "DUR_WARNING",
  "FAMILY_SAFETY",
];
const DONE_CATEGORIES: NotificationCategory[] = ["MEDICATION_COMPLETE"];

interface DateGroup {
  date: string;
  items: NotificationItem[];
}

type IconMeta = {
  family: "ionicons" | "material";
  name:
    | ComponentProps<typeof Ionicons>["name"]
    | ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  bg: string;
};

const ICON_META: Record<NotificationCategory, IconMeta> = {
  MEDICATION_REMINDER: {
    family: "material",
    name: "pill",
    color: "#F8B835",
    bg: "#FFF1C8",
  },
  MEDICATION_DELAY: {
    family: "ionicons",
    name: "alarm",
    color: "#E14B4B",
    bg: "#FCE4E4",
  },
  DUR_WARNING: {
    family: "ionicons",
    name: "warning",
    color: "#F8B835",
    bg: "#FFF4C7",
  },
  FAMILY_SAFETY: {
    family: "ionicons",
    name: "people",
    color: "#4799E0",
    bg: "#DDEBF8",
  },
  MEDICATION_COMPLETE: {
    family: "ionicons",
    name: "happy-outline",
    color: "#5BC4AE",
    bg: "#D6F1EA",
  },
};

export default function FamilyNotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
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
      const res = await listNotifications({ size: 50 });
      if (__DEV__) {
        console.log(
          "[family-notif] list response:",
          JSON.stringify(
            {
              count: res.responses.length,
              nextCursor: res.nextCursor,
              hasNext: res.hasNext,
              items: res.responses.map((n) => ({
                id: n.id,
                category: n.category,
                seniorId: n.seniorId,
                title: n.title,
                body: n.body,
                createdAt: n.createdAt,
                readAt: n.readAt,
                takenAt: n.takenAt,
              })),
            },
            null,
            2,
          ),
        );
      }
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
      const res = await listNotifications({ size: 50, cursor });
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

  const filtered = items.filter((it) => matchesFilter(it.category, filter));
  const groups = groupByDate(filtered);
  const hasUnread = items.some((it) => !it.isRead);

  const handleNotifPress = (item: NotificationItem) => {
    if (!item.isRead) void markRead(item.id);
    if (item.category === "DUR_WARNING" || item.category === "MEDICATION_DELAY") {
      router.push("/family/prescriptions" as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <AppText type="pretendard-b" style={styles.headerTitle}>
          알림
        </AppText>
        <Pressable
          onPress={markAllRead}
          disabled={!hasUnread}
          style={({ pressed }) => [
            styles.markBtn,
            !hasUnread && { opacity: 0.5 },
            pressed && hasUnread && { backgroundColor: "#D6F1EA" },
          ]}
        >
          <AppText
            type="pretendard-b"
            style={styles.markText}
            numberOfLines={1}
          >
            모두 읽음
          </AppText>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterPill,
              filter === f.key && styles.filterPillOn,
            ]}
          >
            <AppText
              type="pretendard-b"
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextOn,
              ]}
            >
              {f.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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
          groups.map((g) => (
            <View key={g.date} style={styles.group}>
              <AppText type="pretendard-b" style={styles.groupDate}>
                {formatDateLabel(g.date)}
              </AppText>
              {g.items.map((it) => (
                <NotifCard
                  key={it.id}
                  item={it}
                  onPress={() => handleNotifPress(it)}
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
  onPress,
}: {
  item: NotificationItem;
  onPress: () => void;
}) {
  const meta = ICON_META[item.category];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !item.isRead && styles.cardUnread,
        pressed && { backgroundColor: "#FBF7EC" },
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: meta.bg }]}>
        {meta.family === "ionicons" ? (
          <Ionicons
            name={meta.name as ComponentProps<typeof Ionicons>["name"]}
            size={22}
            color={meta.color}
          />
        ) : (
          <MaterialCommunityIcons
            name={meta.name as ComponentProps<typeof MaterialCommunityIcons>["name"]}
            size={22}
            color={meta.color}
          />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText type="pretendard-b" style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </AppText>
        {!!item.body && (
          <AppText
            type="pretendard-r"
            style={styles.cardBody}
            numberOfLines={2}
          >
            {item.body}
          </AppText>
        )}
      </View>
      <View style={styles.cardRight}>
        <AppText type="pretendard-m" style={styles.cardTime}>
          {formatTime(item.createdAt)}
        </AppText>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
    </Pressable>
  );
}

function matchesFilter(
  category: NotificationCategory,
  filter: FilterKey,
): boolean {
  if (filter === "all") return true;
  if (filter === "warning") return WARNING_CATEGORIES.includes(category);
  if (filter === "done") return DONE_CATEGORIES.includes(category);
  return true;
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

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${m}월 ${day}일 (${dow})`;
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
  safe: { flex: 1, backgroundColor: "#FFFDF6" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    color: "#222",
  },
  markBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#E8F7F2",
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { fontSize: 13, color: "#5BC4AE" },

  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  filterPillOn: { backgroundColor: "#FFD24D", borderColor: "#FFD24D" },
  filterText: { fontSize: 14, color: "#777" },
  filterTextOn: { color: "#222" },

  scroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 18 },
  stateBox: { paddingVertical: 60, alignItems: "center", gap: 8 },
  stateText: { fontSize: 14, color: "#888" },

  group: { gap: 8 },
  groupDate: { fontSize: 15, color: "#222", paddingHorizontal: 4 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  cardUnread: {
    backgroundColor: "#FFFCEF",
    borderColor: "#FFD24D",
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 14,
    color: "#222",
    lineHeight: 20,
  },
  cardBody: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  cardTime: { fontSize: 12, color: "#777" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD24D",
  },

  moreBtn: {
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BDEFEA",
    backgroundColor: "#FFF",
  },
  moreBtnText: { fontSize: 14, color: "#5BC4AE" },
});
