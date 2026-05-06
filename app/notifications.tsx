import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ComponentProps } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TimeOfDay = "morning" | "noon" | "night";
type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface NotifItem {
  title: string;
  subtitle: string;
  time: TimeOfDay;
  status: "pending" | "done";
}

interface NotifGroup {
  date: string;
  items: NotifItem[];
}

const NOTIF_GROUPS: NotifGroup[] = [
  {
    date: "2026-03-28",
    items: [
      {
        title: "삐~약드실 시간이에요~",
        subtitle: "당뇨약 포함 4정",
        time: "morning",
        status: "pending",
      },
      {
        title: "아침약 드실 시간이에요!",
        subtitle: "혈압약 포함 12정",
        time: "morning",
        status: "done",
      },
    ],
  },
  {
    date: "2026-03-27",
    items: [
      {
        title: "저녁약 잊지 않으셨죠?><",
        subtitle: "혈압약 포함 12정",
        time: "night",
        status: "done",
      },
      {
        title: "삐~약드실 시간이에요~",
        subtitle: "당뇨약 포함 4정",
        time: "noon",
        status: "done",
      },
      {
        title: "아침약 드실 시간이에요!",
        subtitle: "혈압약 포함 12정",
        time: "morning",
        status: "done",
      },
    ],
  },
];

const TIME_META: Record<
  TimeOfDay,
  { icon: IoniconName; color: string; bg: string }
> = {
  morning: { icon: "sunny", color: "#F8B835", bg: "#FFF4D6" },
  noon: { icon: "restaurant", color: "#5BC4AE", bg: "#D6F1EA" },
  night: { icon: "moon", color: "#6B6B8A", bg: "#E0E0E8" },
};

export default function NotificationsScreen() {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="알림" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {NOTIF_GROUPS.map((group) => (
          <View key={group.date} style={styles.group}>
            <AppText type="pretendard-b" style={styles.dateLabel}>
              {group.date}
            </AppText>
            {group.items.map((item, idx) => (
              <NotifCard key={`${group.date}-${idx}`} item={item} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotifCard({ item }: { item: NotifItem }) {
  const router = useRouter();
  return (
    <View style={styles.card}>
      <Image
        source={require("../assets/images/character/Senior3.png")}
        style={styles.avatar}
        resizeMode="contain"
      />
      <View style={{ flex: 1 }}>
        <AppText type="pretendard-b" style={styles.cardTitle}>
          {item.title}
        </AppText>
        <AppText type="pretendard-r" style={styles.cardSubtitle}>
          {item.subtitle}
        </AppText>
        <View
          style={[
            styles.timePill,
            { backgroundColor: TIME_META[item.time].bg },
          ]}
        >
          <Ionicons
            name={TIME_META[item.time].icon}
            size={13}
            color={TIME_META[item.time].color}
          />
        </View>
      </View>
      {item.status === "pending" ? (
        <Pressable
          onPress={() => router.push("/dose-confirm/intro" as any)}
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <AppText type="pretendard-b" style={styles.confirmText}>
            확인
          </AppText>
        </Pressable>
      ) : (
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark" size={18} color="#AAA" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFCF3" },
  scroll: { padding: 16, paddingBottom: 24 },

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
  avatar: { width: 48, height: 48 },
  cardTitle: { fontSize: 14, color: "#171717" },
  cardSubtitle: { fontSize: 12, color: "#888", marginTop: 2 },
  timePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },

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
});
