import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { ApiError } from "@/services/api";
import {
  describeDaysOfWeek,
} from "@/services/days-of-week";
import { listMedicines, Medicine } from "@/services/medicines";
import { listSchedules, MedicationSchedule } from "@/services/schedules";
import {
  fromServerSlot,
  getMealTimes,
  MealSlot,
  MealTimes,
} from "@/services/user-settings";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type GroupMode = "prescription" | "slot";

const GROUP_MODE_KEY = "medications_group_mode";

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

export default function MedicationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MedicineWithSchedules[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mealTimes, setMealTimesState] = useState<MealTimes | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>("prescription");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stored, meals, listResp] = await Promise.all([
        SecureStore.getItemAsync(GROUP_MODE_KEY),
        getMealTimes(),
        listMedicines(),
      ]);
      if (stored === "slot" || stored === "prescription") {
        setGroupMode(stored);
      }
      setMealTimesState(meals);

      // 각 medicine별 schedules 병렬 조회
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

  const handleGroupChange = async (mode: GroupMode) => {
    setGroupMode(mode);
    await SecureStore.setItemAsync(GROUP_MODE_KEY, mode);
  };

  const handleAskBot = () => {
    router.push("/chat" as any);
  };

  const totalCount = items.length;
  const lowStockCount = items.filter(
    (it) => it.medicine.remainingAmount <= 7,
  ).length;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="내 약 정보" />

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

        <View style={styles.toggle}>
          <ToggleBtn
            label="처방전별"
            active={groupMode === "prescription"}
            onPress={() => handleGroupChange("prescription")}
          />
          <ToggleBtn
            label="시간대별"
            active={groupMode === "slot"}
            onPress={() => handleGroupChange("slot")}
          />
        </View>

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
              onPress={() => void loadAll()}
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
            <MaterialCommunityIcons
              name="pill"
              size={36}
              color="#BBB"
            />
            <AppText type="pretendard-m" style={styles.emptyText}>
              등록된 약이 아직 없어요
            </AppText>
            <AppText type="pretendard-r" style={styles.emptySubText}>
              처방전을 등록하면 자동으로 추가돼요
            </AppText>
          </View>
        )}

        {!loading &&
          !error &&
          items.length > 0 &&
          (groupMode === "prescription" ? (
            <PrescriptionGroupedList items={items} />
          ) : (
            <SlotGroupedList items={items} mealTimes={mealTimes} />
          ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleAskBot}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <AppText type="pretendard-b" style={styles.ctaText}>
            삐약이에게 물어보기
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ──────────────────────── 처방전별 그룹 ──────────────────────── */

function PrescriptionGroupedList({
  items,
}: {
  items: MedicineWithSchedules[];
}) {
  const groups = new Map<number | "manual", MedicineWithSchedules[]>();
  for (const it of items) {
    const key = it.medicine.prescriptionId ?? "manual";
    const arr = groups.get(key) ?? [];
    arr.push(it);
    groups.set(key, arr);
  }

  return (
    <View style={{ gap: 16 }}>
      {Array.from(groups.entries()).map(([key, list]) => (
        <View key={String(key)} style={styles.groupSection}>
          <AppText type="pretendard-b" style={styles.groupTitle}>
            {key === "manual" ? "직접 등록한 약" : `처방전 #${key}`}
          </AppText>
          <View style={{ gap: 8 }}>
            {list.map((it) => (
              <MedicineCard
                key={it.medicine.id}
                item={it}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/* ──────────────────────── 시간대별 그룹 ──────────────────────── */

function SlotGroupedList({
  items,
  mealTimes,
}: {
  items: MedicineWithSchedules[];
  mealTimes: MealTimes | null;
}) {
  const slotMap: Record<MealSlot, MedicineWithSchedules[]> = {
    morning: [],
    noon: [],
    night: [],
  };
  const unscheduled: MedicineWithSchedules[] = [];

  if (!mealTimes) {
    return null;
  }

  for (const it of items) {
    if (it.schedules.length === 0) {
      unscheduled.push(it);
      continue;
    }
    const slots = new Set<MealSlot>();
    for (const s of it.schedules) {
      slots.add(fromServerSlot(s.mealSlot));
    }
    slots.forEach((slot) => slotMap[slot].push(it));
  }

  const order: MealSlot[] = ["morning", "noon", "night"];

  return (
    <View style={{ gap: 16 }}>
      {order.map((slot) => {
        const list = slotMap[slot];
        if (list.length === 0) return null;
        return (
          <View key={slot} style={styles.groupSection}>
            <View style={styles.slotHeader}>
              <View
                style={[styles.slotIconWrap, { backgroundColor: SLOT_BG[slot] }]}
              >
                <Ionicons
                  name={SLOT_ICON[slot]}
                  size={18}
                  color={SLOT_COLOR[slot]}
                />
              </View>
              <AppText type="pretendard-b" style={styles.groupTitle}>
                {SLOT_LABEL[slot]}
              </AppText>
              <AppText type="pretendard-m" style={styles.slotTime}>
                {mealTimes[slot]}
              </AppText>
            </View>
            <View style={{ gap: 8 }}>
              {list.map((it) => (
                <MedicineCard
                  key={`${slot}-${it.medicine.id}`}
                  item={it}
                />
              ))}
            </View>
          </View>
        );
      })}
      {unscheduled.length > 0 && (
        <View style={styles.groupSection}>
          <AppText type="pretendard-b" style={styles.groupTitle}>
            시간 미정
          </AppText>
          <View style={{ gap: 8 }}>
            {unscheduled.map((it) => (
              <MedicineCard
                key={`pending-${it.medicine.id}`}
                item={it}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/* ──────────────────────── 약물 카드 ──────────────────────── */

function MedicineCard({
  item,
}: {
  item: MedicineWithSchedules;
}) {
  const router = useRouter();
  const { medicine, schedules } = item;
  const lowStock = medicine.remainingAmount <= 7;

  const slotsActive = new Set<MealSlot>();
  for (const s of schedules) {
    slotsActive.add(fromServerSlot(s.mealSlot));
  }

  const daysLabel =
    schedules.length > 0 ? describeDaysOfWeek(schedules[0].daysOfWeek) : null;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/medication-detail" as any,
          params: { id: String(medicine.id) },
        })
      }
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
        {schedules.length > 0 && (
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
                </View>
              );
            })}
          </View>
        )}
        {schedules.length === 0 && (
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

/* ──────────────────────── 헬퍼 컴포넌트 ──────────────────────── */

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

function ToggleBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.togglePill, active && styles.togglePillOn]}
    >
      <AppText
        type="pretendard-b"
        style={[styles.toggleText, active && styles.toggleTextOn]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFDF6" },
  scroll: { padding: 16, paddingBottom: 24, gap: 14 },

  summaryRow: { flexDirection: "row", gap: 10 },
  summaryBox: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryLabel: { fontSize: 13, color: "#666" },
  summaryValue: { fontSize: 22, color: "#171717" },

  toggle: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  togglePill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 999,
  },
  togglePillOn: {
    backgroundColor: "#FFD24D",
  },
  toggleText: {
    fontSize: 13,
    color: "#888",
  },
  toggleTextOn: {
    color: "#222",
  },

  loadingBox: {
    paddingVertical: 60,
    alignItems: "center",
  },
  errorBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
  },
  retryBtn: {
    backgroundColor: "#FFD24D",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    color: "#222",
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#666",
  },
  emptySubText: {
    fontSize: 13,
    color: "#999",
  },

  groupSection: { gap: 8 },
  groupTitle: {
    fontSize: 15,
    color: "#222",
    paddingHorizontal: 4,
  },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  slotIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  slotTime: {
    marginLeft: "auto",
    fontSize: 12,
    color: "#888",
  },

  medCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  medThumb: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#D6F1EA",
    justifyContent: "center",
    alignItems: "center",
  },
  medName: {
    fontSize: 15,
    color: "#171717",
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  medRemaining: { fontSize: 12, color: "#666" },
  medDays: { fontSize: 12, color: "#666" },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CCC",
  },

  slotRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  slotPill: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotPillOff: {
    backgroundColor: "#F4F2EA",
  },
  pendingPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF4C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  pendingText: {
    fontSize: 11,
    color: "#7A5C00",
  },

  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  cta: {
    backgroundColor: "#FFD24D",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { fontSize: 17, color: "#222" },
});
