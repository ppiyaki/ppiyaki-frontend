import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { ApiError } from "@/services/api";
import { resolveLinkedSenior } from "@/services/caregivers";
import { describeDaysOfWeek } from "@/services/days-of-week";
import { listMedicines, Medicine } from "@/services/medicines";
import { listSchedules, MedicationSchedule } from "@/services/schedules";
import { fromServerSlot, MealSlot } from "@/services/user-settings";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

interface MedicineWithSchedules {
  medicine: Medicine;
  schedules: MedicationSchedule[];
}

const SLOT_LABEL: Record<MealSlot, string> = {
  morning: "아침",
  noon: "점심",
  night: "저녁",
};

const SLOT_ICON: Record<MealSlot, keyof typeof Ionicons.glyphMap> = {
  morning: "sunny",
  noon: "restaurant",
  night: "moon",
};

const SLOT_COLOR: Record<MealSlot, string> = {
  morning: "#F8B835",
  noon: "#5BC4AE",
  night: "#6B6B8A",
};

const SLOT_BG: Record<MealSlot, string> = {
  morning: "#FFF4D6",
  noon: "#D6F1EA",
  night: "#E0E0E8",
};

export default function FamilyMedicationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MedicineWithSchedules[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seniorName, setSeniorName] = useState<string>("어르신");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const senior = await resolveLinkedSenior();
      if (!senior) {
        setError("연결된 시니어가 없어요");
        setItems([]);
        return;
      }
      setSeniorName(senior.nickname);
      const listResp = await listMedicines(senior.id);
      const withSchedules = await Promise.all(
        listResp.responses.map(async (medicine) => {
          try {
            const s = await listSchedules(medicine.id);
            return { medicine, schedules: s.responses };
          } catch {
            return { medicine, schedules: [] };
          }
        }),
      );
      setItems(withSchedules);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.toUserMessage()
          : "약 목록을 불러오지 못했어요",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );

  const totalCount = items.length;
  const lowStockCount = items.filter(
    (it) => it.medicine.remainingAmount <= 7,
  ).length;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title={`${seniorName} 님 약 정보`} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <SummaryBox label="현재 복약 중" value={`${totalCount}종`} />
          <SummaryBox
            label="곧 소진"
            value={`${lowStockCount}종`}
            highlight={lowStockCount > 0}
          />
        </View>

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

        {!loading && !error && items.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="pill" size={32} color="#BBB" />
            <AppText type="pretendard-m" style={styles.emptyText}>
              등록된 약이 없어요
            </AppText>
          </View>
        )}

        {!loading && !error && items.length > 0 && (
          <View style={{ gap: 10 }}>
            {items.map((it) => (
              <MedicineCard
                key={it.medicine.id}
                item={it}
                onPress={() =>
                  router.push({
                    pathname: "/medication-detail" as any,
                    params: { id: String(it.medicine.id) },
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MedicineCard({
  item,
  onPress,
}: {
  item: MedicineWithSchedules;
  onPress: () => void;
}) {
  const { medicine, schedules } = item;
  const lowStock = medicine.remainingAmount <= 7;
  const slotsActive = new Set<MealSlot>();
  for (const s of schedules) slotsActive.add(fromServerSlot(s.mealSlot));
  const daysLabel =
    schedules.length > 0 ? describeDaysOfWeek(schedules[0].daysOfWeek) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.medCard,
        pressed && { backgroundColor: "#FBF7EC" },
      ]}
    >
      <View style={styles.medThumb}>
        <MaterialCommunityIcons name="pill" size={28} color="#5BC4AE" />
      </View>
      <View style={{ flex: 1 }}>
        <AppText
          type="pretendard-b"
          style={styles.medName}
          numberOfLines={1}
        >
          {medicine.name}
        </AppText>
        <View style={styles.medRow}>
          <AppText
            type="pretendard-m"
            style={[styles.medRemaining, lowStock && { color: "#E14B4B" }]}
          >
            잔여 {medicine.remainingAmount}일분
          </AppText>
          {daysLabel && (
            <>
              <View style={styles.dot} />
              <AppText type="pretendard-m" style={styles.medDays}>
                {daysLabel}
              </AppText>
            </>
          )}
        </View>
        {schedules.length > 0 ? (
          <View style={styles.slotRow}>
            {(["morning", "noon", "night"] as MealSlot[]).map((slot) => {
              const on = slotsActive.has(slot);
              return (
                <View
                  key={slot}
                  style={[
                    styles.slotPill,
                    on
                      ? { backgroundColor: SLOT_BG[slot] }
                      : styles.slotPillOff,
                  ]}
                >
                  <Ionicons
                    name={SLOT_ICON[slot]}
                    size={12}
                    color={on ? SLOT_COLOR[slot] : "#CCC"}
                  />
                  {on && (
                    <AppText
                      type="pretendard-b"
                      style={[
                        styles.slotPillText,
                        { color: SLOT_COLOR[slot] },
                      ]}
                    >
                      {SLOT_LABEL[slot]}
                    </AppText>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.pendingPill}>
            <AppText type="pretendard-b" style={styles.pendingText}>
              시간 미정
            </AppText>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#BBB" />
    </Pressable>
  );
}

function SummaryBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryBox}>
      <AppText type="pretendard-r" style={styles.summaryLabel}>
        {label}
      </AppText>
      <AppText
        type="extrabold"
        style={[styles.summaryValue, highlight && { color: "#E14B4B" }]}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFDF6" },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryBox: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    gap: 4,
  },
  summaryLabel: { fontSize: 12, color: "#777" },
  summaryValue: { fontSize: 20, color: "#222" },

  loadingBox: { paddingVertical: 60, alignItems: "center" },
  emptyBox: { paddingVertical: 60, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, color: "#888" },

  medCard: {
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
  medThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D6F1EA",
    justifyContent: "center",
    alignItems: "center",
  },
  medName: { fontSize: 15, color: "#222" },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  medRemaining: { fontSize: 12, color: "#777" },
  medDays: { fontSize: 12, color: "#777" },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CCC",
  },
  slotRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  slotPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  slotPillOff: { backgroundColor: "#F4F2EA" },
  slotPillText: { fontSize: 11 },
  pendingPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#FFF1C8",
    borderRadius: 8,
    marginTop: 6,
  },
  pendingText: { fontSize: 11, color: "#7A5C00" },
});
