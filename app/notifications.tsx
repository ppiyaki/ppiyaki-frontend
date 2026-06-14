import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useRequireAuth } from "@/hooks/use-require-auth";
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
  | {
      family: "material";
      name: ComponentProps<typeof MaterialCommunityIcons>["name"];
    };

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
  PRESCRIPTION_REVIEW_REQUEST: {
    icon: { family: "ionicons", name: "document-text" },
    color: "#7A6BC9",
    bg: "#E5E0F5",
  },
};

export default function NotificationsScreen() {
  useRequireAuth();
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

  const groups = groupByDate(items);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
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
  // 복약 인증 미완료 (takenAt null) 인 MEDICATION_REMINDER 만 "확인" 버튼 노출.
  // 인증 완료 시 백엔드가 takenAt 채워주고, 그 시점부터 버튼 사라짐.
  // 추가로 — 시간 지난 알림(오늘이 아닌 것)은 인증 불가. 어제·그 이전 알림에서 인증해도
  // 그 시점의 복약 상황이 아니라 의미가 없어서 button 숨김.
  const showConfirm =
    item.category === "MEDICATION_REMINDER" &&
    item.takenAt == null &&
    isToday(item.createdAt);

  return (
    <Pressable
      onPress={() => {
        // 복약 인증 대기 카드는 카드 탭으로 읽음 처리하지 않음.
        // 카드를 가볍게 만진 것만으로 인증이 사라지면 사용자가 재시도 불가.
        if (!item.isRead && item.category !== "MEDICATION_REMINDER") {
          onMarkRead();
        }
        // 처방전 검토 요청은 탭 시 검토 화면으로 이동
        if (item.category === "PRESCRIPTION_REVIEW_REQUEST") {
          const pId = parsePrescriptionId(item.payload);
          if (pId != null) {
            router.push({
              pathname: "/prescription/review" as any,
              params: { id: String(pId) },
            });
          }
        }
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
          <AppText
            type="pretendard-b"
            style={[styles.timeText, { color: meta.color }]}
          >
            {formatTime(item.createdAt)}
          </AppText>
        </View>
      </View>
      {showConfirm ? (
        <Pressable
          onPress={() => {
            // mealSlot 은 item 최상위 필드 — payload 가 아님 (백엔드 #455 스펙)
            const { scheduleId, targetDate } = parseReminderPayload(
              item.payload,
            );
            const mealSlot = item.mealSlot;
            router.push({
              pathname: "/dose-confirm/intro" as any,
              params: {
                ...(scheduleId ? { scheduleId: String(scheduleId) } : {}),
                ...(targetDate ? { targetDate } : {}),
                ...(mealSlot ? { mealSlot } : {}),
              },
            });
          }}
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <AppText type="pretendard-b" style={styles.confirmText}>
            인증하기
          </AppText>
        </Pressable>
      ) : item.category === "MEDICATION_REMINDER" && item.takenAt != null ? (
        // 복약 인증 완료 — 초록 체크
        <View style={styles.takenBadge}>
          <Ionicons name="checkmark" size={18} color="#FFF" />
        </View>
      ) : item.isRead ? (
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark" size={18} color="#AAA" />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * MEDICATION_REMINDER 알림의 payload(JSON 문자열)에서 scheduleId / targetDate 추출.
 * 백엔드 응답에 따라 둘 다 없을 수 있음 — null safe.
 *
 * 묶음 발송 대응: 새 형식은 `scheduleIds`를 JSON 배열 문자열로 보냄
 *   (예: "[123,456,789]"). 기존 단수 `scheduleId` (number) 도 호환.
 *   "인증하기" 버튼은 한 schedule만 처리하므로 첫 번째 id를 사용한다.
 */
function parseReminderPayload(payload: string | null): {
  scheduleId?: number;
  targetDate?: string;
} {
  // 백엔드 #455 (2026-06-07) 이후 payload 는 항상 null. mealSlot 은 item.mealSlot 으로
  // 옮겨감. scheduleIds/targetDate 는 구버전 호환 유지용.
  if (!payload) {
    if (__DEV__) console.log("[reminder] payload is null");
    return {};
  }
  try {
    const obj = JSON.parse(payload) as Record<string, unknown>;
    if (__DEV__) {
      console.log("[reminder] payload parsed:", obj);
    }
    const td = obj.targetDate;

    // 새 형식: scheduleIds (JSON 배열 문자열 또는 배열)
    const raw = obj.scheduleIds;
    let firstId: number | undefined;
    if (typeof raw === "string") {
      try {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr) && typeof arr[0] === "number") {
          firstId = arr[0];
        }
      } catch {
        // 무시 — 기존 형식 폴백
      }
    } else if (Array.isArray(raw) && typeof raw[0] === "number") {
      firstId = raw[0];
    }

    // 기존 단수 형식 폴백
    if (firstId === undefined) {
      const sid = obj.scheduleId;
      if (typeof sid === "number") firstId = sid;
    }

    if (__DEV__) {
      console.log("[reminder] extracted:", {
        scheduleId: firstId,
        targetDate: td,
      });
    }

    return {
      scheduleId: firstId,
      targetDate: typeof td === "string" ? td : undefined,
    };
  } catch (e) {
    if (__DEV__) console.log("[reminder] payload parse failed:", e, payload);
    return {};
  }
}

/**
 * PRESCRIPTION_REVIEW_REQUEST payload에서 prescriptionId 추출.
 * 백엔드 키 명칭이 다를 가능성에 대비해 prescriptionId/id 둘 다 시도.
 */
function parsePrescriptionId(payload: string | null): number | null {
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

/** ISO 문자열의 날짜가 로컬 타임존 기준 오늘인지 여부 */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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
  takenBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#5BC4AE",
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
