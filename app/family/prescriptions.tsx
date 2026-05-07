import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { ApiError } from "@/services/api";
import {
  listPrescriptions,
  PrescriptionStatus,
  PrescriptionSummary,
} from "@/services/prescriptions";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterKey = "pending" | "confirmed" | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "pending", label: "검토 대기" },
  { key: "confirmed", label: "확정 완료" },
  { key: "all", label: "전체" },
];

export default function FamilyPrescriptionsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [items, setItems] = useState<PrescriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (key: FilterKey) => {
    setLoading(true);
    setError(null);
    try {
      const status: PrescriptionStatus | undefined =
        key === "pending"
          ? "PENDING_REVIEW"
          : key === "confirmed"
            ? "CONFIRMED"
            : undefined;
      const res = await listPrescriptions(status);
      setItems(res.responses);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.toUserMessage()
          : "처방전 목록을 불러오지 못했어요",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(filter);
    }, [load, filter]),
  );

  const handleFilterChange = (key: FilterKey) => {
    setFilter(key);
    void load(key);
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="처방전 검토" />

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const on = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => handleFilterChange(f.key)}
              style={[styles.filterPill, on && styles.filterPillOn]}
            >
              <AppText
                type="pretendard-b"
                style={[styles.filterText, on && styles.filterTextOn]}
              >
                {f.label}
              </AppText>
            </Pressable>
          );
        })}
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
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={28} color="#E14B4B" />
            <AppText type="pretendard-m" style={styles.errorText}>
              {error}
            </AppText>
            <Pressable
              onPress={() => void load(filter)}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <AppText type="pretendard-b" style={styles.retryText}>
                다시 시도
              </AppText>
            </Pressable>
          </View>
        )}

        {!loading && !error && items.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={36} color="#BBB" />
            <AppText type="pretendard-m" style={styles.emptyText}>
              {filter === "pending"
                ? "검토할 처방전이 없어요"
                : "처방전이 없어요"}
            </AppText>
          </View>
        )}

        {!loading &&
          !error &&
          items.map((p) => (
            <PrescriptionRow
              key={p.id}
              item={p}
              onPress={() =>
                router.push({
                  pathname:
                    p.status === "PENDING_REVIEW"
                      ? "/prescription/review"
                      : ("/prescription/result" as any),
                  params: { id: String(p.id) },
                })
              }
            />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function PrescriptionRow({
  item,
  onPress,
}: {
  item: PrescriptionSummary;
  onPress: () => void;
}) {
  const meta = STATUS_META[item.status] ?? STATUS_META.CONFIRMED;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: "#FBF7EC" },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText type="pretendard-b" style={styles.cardTitle}>
          처방전 #{item.id}
        </AppText>
        <AppText type="pretendard-m" style={styles.cardDate}>
          {formatDate(item.createdAt)}
        </AppText>
      </View>
      <View
        style={[styles.statusPill, { backgroundColor: meta.pillBg }]}
      >
        <AppText
          type="pretendard-b"
          style={[styles.statusText, { color: meta.color }]}
        >
          {meta.label}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#BBB" />
    </Pressable>
  );
}

const STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    pillBg: string;
    icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  }
> = {
  PENDING_REVIEW: {
    label: "검토 필요",
    color: "#F8B835",
    bg: "#FFF1C8",
    pillBg: "#FFF4C7",
    icon: "alert-circle",
  },
  CONFIRMED: {
    label: "확정",
    color: "#5BC4AE",
    bg: "#D6F1EA",
    pillBg: "#E8F7F2",
    icon: "checkmark-circle",
  },
  REJECTED: {
    label: "폐기",
    color: "#E14B4B",
    bg: "#FCEBEB",
    pillBg: "#FCEBEB",
    icon: "close-circle",
  },
  PROCESSING: {
    label: "처리 중",
    color: "#888",
    bg: "#F4F2EA",
    pillBg: "#F4F2EA",
    icon: "time",
  },
  PROCESSING_FAILED: {
    label: "처리 실패",
    color: "#E14B4B",
    bg: "#FCEBEB",
    pillBg: "#FCEBEB",
    icon: "alert-circle",
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${min}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFDF6" },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 10,
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
    fontSize: 13,
    color: "#888",
  },
  filterTextOn: {
    color: "#222",
  },

  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },

  loadingBox: { paddingVertical: 60, alignItems: "center" },
  errorBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  errorText: { fontSize: 14, color: "#666" },
  retryBtn: {
    backgroundColor: "#FFD24D",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { fontSize: 14, color: "#222" },
  emptyBox: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 14, color: "#888" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    color: "#222",
  },
  cardDate: {
    fontSize: 12,
    color: "#888",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
  },
});
