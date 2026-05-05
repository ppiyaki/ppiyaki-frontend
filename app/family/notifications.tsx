import AppText from "@/components/app-text";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterKey = "all" | "warning" | "done";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "warning", label: "긴급 경고" },
  { key: "done", label: "복약 완료" },
];

type IconKind = "warning" | "celebrate" | "delay";

interface NotifItem {
  id: string;
  kind: IconKind;
  title: string;
  time: string;
  unread?: boolean;
}

interface NotifGroup {
  date: string;
  items: NotifItem[];
}

const GROUPS: NotifGroup[] = [
  {
    date: "3월 22일 (금)",
    items: [
      {
        id: "1",
        kind: "warning",
        title: "새로 등록된 처방전에\n연령 금기 주의 약물이 포함되어 있습니다.",
        time: "오후 2:30",
      },
      {
        id: "2",
        kind: "celebrate",
        title: "축하합니다! 김장군님이\n모든 복약을 완료하셨습니다!",
        time: "오후 6:30",
      },
    ],
  },
  {
    date: "3월 23일 (토)",
    items: [
      {
        id: "3",
        kind: "delay",
        title: "김장군님이 아침 약 복용\n시간을 30분 넘겼습니다.",
        time: "오전 9:30",
      },
      {
        id: "4",
        kind: "celebrate",
        title: "축하합니다! 김장군님이\n모든 복약을 완료하셨습니다!",
        time: "오후 6:30",
      },
    ],
  },
  {
    date: "3월 24일 (일)",
    items: [
      {
        id: "5",
        kind: "celebrate",
        title: "축하합니다! 김장군님이\n모든 복약을 완료하셨습니다!",
        time: "오후 6:30",
        unread: true,
      },
    ],
  },
];

export default function FamilyNotificationsScreen() {
  const [filter, setFilter] = useState<FilterKey>("all");

  const visible = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => matchesFilter(item, filter)),
  })).filter((g) => g.items.length > 0);

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

      {/* 필터 탭 */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterPill, filter === f.key && styles.filterPillOn]}
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
        {visible.map((group) => (
          <View key={group.date} style={styles.group}>
            <AppText type="pretendard-b" style={styles.groupDate}>
              {group.date}
            </AppText>
            {group.items.map((item) => (
              <NotifCard key={item.id} item={item} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function matchesFilter(item: NotifItem, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "warning")
    return item.kind === "warning" || item.kind === "delay";
  if (filter === "done") return item.kind === "celebrate";
  return true;
}

const ICON_META: Record<
  IconKind,
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

function NotifCard({ item }: { item: NotifItem }) {
  const meta = ICON_META[item.kind];
  return (
    <Pressable
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
        {item.unread && <View style={styles.unreadDot} />}
        <AppText type="pretendard-m" style={styles.cardTime}>
          {item.time}
        </AppText>
        <Ionicons name="chevron-forward" size={16} color="#5BC4AE" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },

  /* ── 헤더 ── */
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
  markText: {
    fontSize: 13,
    color: "#5BC4AE",
  },

  /* ── 필터 ── */
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
  filterPillOn: {
    backgroundColor: "#FFD24D",
    borderColor: "#FFD24D",
  },
  filterText: {
    fontSize: 14,
    color: "#777",
  },
  filterTextOn: {
    color: "#222",
  },

  /* ── 리스트 ── */
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 18,
  },
  group: {
    gap: 8,
  },
  groupDate: {
    fontSize: 15,
    color: "#222",
    paddingHorizontal: 4,
  },
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
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFD24D",
    marginRight: 4,
  },
  cardTime: {
    fontSize: 12,
    color: "#777",
  },
});
