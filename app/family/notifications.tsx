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

type FilterKey = "all" | "prescription" | "done" | "warning";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "prescription", label: "처방전 검토" },
  { key: "done", label: "복약 완료" },
  { key: "warning", label: "긴급 경고" },
];

const WARNING_CATEGORIES: NotificationCategory[] = [
  "MEDICATION_DELAY",
  "DUR_WARNING",
  "FAMILY_SAFETY",
];
const DONE_CATEGORIES: NotificationCategory[] = ["MEDICATION_COMPLETE"];
const PRESCRIPTION_CATEGORIES: NotificationCategory[] = [
  "PRESCRIPTION_REVIEW_REQUEST",
];

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
  PRESCRIPTION_REVIEW_REQUEST: {
    family: "ionicons",
    name: "document-text",
    color: "#7A6BC9",
    bg: "#E5E0F5",
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
        // 카테고리별 카운트 — PRESCRIPTION_REVIEW_REQUEST 가 응답에 있는지 한눈에 확인
        const byCategory: Record<string, number> = {};
        for (const n of res.responses) {
          byCategory[n.category] = (byCategory[n.category] ?? 0) + 1;
        }
        console.log("[family-notif] categories:", byCategory);
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
        e instanceof ApiError ? e.toUserMessage() : "알림을 불러오지 못했어요",
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
        it.id === id
          ? { ...it, isRead: true, readAt: new Date().toISOString() }
          : it,
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
    setItems((prev) =>
      prev.map((it) => ({ ...it, isRead: true, readAt: now })),
    );
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
    if (item.category === "MEDICATION_DELAY") {
      // 복약 지연 알림 → 해당 날짜의 보호자 대시보드(record)로 이동.
      // payload 에 targetDate 가 있으면 그 날짜로 진입, 없으면 오늘.
      const td = parseTargetDate(item.payload);
      router.push({
        pathname: "/family/record" as any,
        params: td ? { date: td } : {},
      });
    } else if (item.category === "DUR_WARNING") {
      router.push("/family/prescriptions" as any);
    } else if (item.category === "PRESCRIPTION_REVIEW_REQUEST") {
      const pId = parseFamilyPrescriptionId(item.payload);
      if (pId != null) {
        router.push({
          pathname: "/prescription/review" as any,
          params: { id: String(pId) },
        });
      } else {
        // 백엔드가 payload에 prescriptionId 를 넣어주기 전까지 임시 fallback —
        // 처방전 목록 페이지로 이동 (보호자가 PENDING_REVIEW 처방전을 직접 선택).
        router.push("/family/prescriptions" as any);
      }
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

      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterPill, on && styles.filterPillOn]}
              >
                <AppText
                  // 선택된 탭은 굵게(bold), 비선택은 medium 으로 강약 표현.
                  // `type` 은 단일 string 만 받으므로 삼항 연산자로 분기해야 함.
                  type={on ? "pretendard-b" : "pretendard-m"}
                  style={[styles.filterText, on && styles.filterTextOn]}
                >
                  {f.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
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
  const isPrescriptionReview =
    item.category === "PRESCRIPTION_REVIEW_REQUEST";
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
            name={
              meta.name as ComponentProps<typeof MaterialCommunityIcons>["name"]
            }
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
        {isPrescriptionReview && (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.reviewBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="document-text" size={14} color="#FFF" />
            <AppText type="pretendard-b" style={styles.reviewBtnText}>
              검토하기
            </AppText>
          </Pressable>
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

/**
 * 알림 payload(JSON 문자열) 에서 targetDate (YYYY-MM-DD) 추출.
 * MEDICATION_DELAY 등에서 사용. 형식 안 맞으면 null.
 */
function parseTargetDate(payload: string | null): string | null {
  if (!payload) return null;
  try {
    const obj = JSON.parse(payload) as Record<string, unknown>;
    const td = obj.targetDate;
    if (typeof td !== "string") return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(td) ? td : null;
  } catch {
    return null;
  }
}

/** PRESCRIPTION_REVIEW_REQUEST payload에서 prescriptionId 추출. */
function parseFamilyPrescriptionId(payload: string | null): number | null {
  if (!payload) return null;
  try {
    const obj = JSON.parse(payload) as Record<string, unknown>;
    const candidates = [obj.prescriptionId, obj.id];
    for (const c of candidates) {
      if (typeof c === "number") return c;
      if (typeof c === "string") {
        const n = Number(c);
        if (!isNaN(n)) return n;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function matchesFilter(
  category: NotificationCategory,
  filter: FilterKey,
): boolean {
  if (filter === "all") return true;
  if (filter === "prescription")
    return PRESCRIPTION_CATEGORIES.includes(category);
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

  // wrapper에 명시적 height — horizontal ScrollView 가 부모 flex column 안에서
  // 세로로 늘어나는 RN 동작 회피. 빈 상태에서도 필터가 헤더 바로 아래에 고정됨.
  filterWrap: {
    height: 62,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  filterPillOn: { backgroundColor: "#FFD24D", borderColor: "#FFD24D" },
  // AppText base에 includeFontPadding:false 가 깔려있어 한글 받침이 잘림 →
  // 명시적 lineHeight + includeFontPadding 복원으로 보정.
  filterText: {
    fontSize: 14,
    color: "#777",
    lineHeight: 20,
    includeFontPadding: true,
  },
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
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#7A6BC9",
    marginTop: 6,
  },
  reviewBtnText: {
    fontSize: 12,
    color: "#FFF",
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
