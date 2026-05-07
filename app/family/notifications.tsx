import AppText from "@/components/app-text";
import { ApiError } from "@/services/api";
import { listMedicationLogs } from "@/services/medication-logs";
import { listPrescriptions } from "@/services/prescriptions";
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

type NotifKind = "warning" | "celebrate" | "delay";

interface NotifItem {
  id: string;
  kind: NotifKind;
  title: string;
  time: string;
  date: string;
  onPress?: () => void;
}

interface DateGroup {
  date: string;
  items: NotifItem[];
}

export default function FamilyNotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items: NotifItem[] = [];

      // 1) 처방전 검토 대기 → warning
      try {
        const pres = await listPrescriptions("PENDING_REVIEW");
        for (const p of pres.responses) {
          items.push({
            id: `pres-${p.id}`,
            kind: "warning",
            title: `검토 대기 중인 처방전이 있어요\n어르신이 등록한 처방전을 확인해주세요`,
            time: formatTime(p.createdAt),
            date: formatDateLabel(p.createdAt),
            onPress: () => router.push("/family/prescriptions" as any),
          });
        }
      } catch (e) {
        console.log("[notif] prescriptions failed:", e);
      }

      // 2) 최근 7일 복약 기록 → 누락은 delay, 완료는 celebrate
      try {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 6);
        const logs = await listMedicationLogs({
          from: toIsoDate(weekAgo),
          to: toIsoDate(today),
        });

        for (const log of logs.responses) {
          const baseTime = log.takenAt ?? log.createdAt;
          if (log.status === "MISSED") {
            items.push({
              id: `log-miss-${log.id}`,
              kind: "delay",
              title: `복약 시간을 놓쳤어요\n시간을 다시 확인해주세요`,
              time: formatTime(baseTime),
              date: formatDateLabel(baseTime),
            });
          } else if (
            log.status === "TAKEN" &&
            log.aiStatus === "COUNT_MATCH"
          ) {
            items.push({
              id: `log-done-${log.id}`,
              kind: "celebrate",
              title: `어르신이 복약을 완료하셨어요!`,
              time: formatTime(baseTime),
              date: formatDateLabel(baseTime),
            });
          } else if (
            log.status === "TAKEN" &&
            log.aiStatus === "COUNT_MISMATCH"
          ) {
            items.push({
              id: `log-mismatch-${log.id}`,
              kind: "warning",
              title: `복약 인증 사진의 개수가 달라요\n확인이 필요해요`,
              time: formatTime(baseTime),
              date: formatDateLabel(baseTime),
            });
          }
        }
      } catch (e) {
        console.log("[notif] logs failed:", e);
      }

      // 시간 역순 정렬 → 날짜 그룹화
      items.sort((a, b) => (a.date < b.date ? 1 : -1));
      const grouped = groupByDate(items);
      setGroups(grouped);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.toUserMessage()
          : "알림을 불러오지 못했어요",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => matchesFilter(it, filter)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <AppText type="pretendard-b" style={styles.headerTitle}>
          알림
        </AppText>
        <Pressable
          style={({ pressed }) => [
            styles.markBtn,
            pressed && { backgroundColor: "#D6F1EA" },
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

      {/* 필터 */}
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
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#FFD24D" />
          </View>
        )}

        {!loading && error && (
          <View style={styles.emptyBox}>
            <Ionicons name="alert-circle" size={28} color="#E14B4B" />
            <AppText type="pretendard-m" style={styles.emptyText}>
              {error}
            </AppText>
          </View>
        )}

        {!loading && !error && visibleGroups.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off" size={32} color="#BBB" />
            <AppText type="pretendard-m" style={styles.emptyText}>
              새 알림이 없어요
            </AppText>
          </View>
        )}

        {!loading &&
          !error &&
          visibleGroups.map((g) => (
            <View key={g.date} style={styles.group}>
              <AppText type="pretendard-b" style={styles.groupDate}>
                {g.date}
              </AppText>
              {g.items.map((it) => (
                <NotifCard key={it.id} item={it} />
              ))}
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotifCard({ item }: { item: NotifItem }) {
  const meta = ICON_META[item.kind];
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.card,
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
          <MaterialCommunityIcons name="pill" size={22} color={meta.color} />
        )}
      </View>
      <AppText type="pretendard-m" style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </AppText>
      <View style={styles.cardRight}>
        <AppText type="pretendard-m" style={styles.cardTime}>
          {item.time}
        </AppText>
        {item.onPress && (
          <Ionicons name="chevron-forward" size={16} color="#5BC4AE" />
        )}
      </View>
    </Pressable>
  );
}

const ICON_META: Record<
  NotifKind,
  {
    name: ComponentProps<typeof Ionicons>["name"] | "pill";
    family: "ionicons" | "material";
    color: string;
    bg: string;
  }
> = {
  warning: {
    name: "warning",
    family: "ionicons",
    color: "#F8B835",
    bg: "#FFF4C7",
  },
  celebrate: {
    name: "happy-outline",
    family: "ionicons",
    color: "#5BC4AE",
    bg: "#D6F1EA",
  },
  delay: {
    name: "pill",
    family: "material",
    color: "#F8B835",
    bg: "#FFF1C8",
  },
};

function matchesFilter(item: NotifItem, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "warning")
    return item.kind === "warning" || item.kind === "delay";
  if (filter === "done") return item.kind === "celebrate";
  return true;
}

function groupByDate(items: NotifItem[]): DateGroup[] {
  const map = new Map<string, NotifItem[]>();
  for (const it of items) {
    const arr = map.get(it.date) ?? [];
    arr.push(it);
    map.set(it.date, arr);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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
  loadingBox: { paddingVertical: 60, alignItems: "center" },
  emptyBox: { paddingVertical: 60, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, color: "#888" },

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
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    color: "#222",
    lineHeight: 20,
  },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardTime: { fontSize: 12, color: "#777" },
});
