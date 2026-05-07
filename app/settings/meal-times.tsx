import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import {
  DEFAULT_MEAL_TIMES,
  getMealTimes,
  MealSlot,
  MealTimes,
  setMealTimes,
} from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SLOT_META: Record<
  MealSlot,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    options: string[]; // "HH:mm"
  }
> = {
  morning: {
    label: "아침",
    icon: "sunny",
    color: "#F8B835",
    bg: "#FFF4D6",
    options: generateOptions(6, 10), // 06:00 ~ 10:00
  },
  noon: {
    label: "점심",
    icon: "restaurant",
    color: "#5BC4AE",
    bg: "#D6F1EA",
    options: generateOptions(11, 14),
  },
  night: {
    label: "저녁",
    icon: "moon",
    color: "#6B6B8A",
    bg: "#E0E0E8",
    options: generateOptions(17, 21),
  },
};

function generateOptions(startHour: number, endHour: number): string[] {
  const result: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    result.push(`${String(h).padStart(2, "0")}:00`);
    if (h !== endHour) {
      result.push(`${String(h).padStart(2, "0")}:30`);
    }
  }
  return result;
}

export default function MealTimesScreen() {
  const router = useRouter();
  const confirm = useConfirm();

  const [times, setTimes] = useState<MealTimes>(DEFAULT_MEAL_TIMES);
  const [initial, setInitial] = useState<MealTimes>(DEFAULT_MEAL_TIMES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getMealTimes();
      setTimes(t);
      setInitial(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dirty =
    times.morning !== initial.morning ||
    times.noon !== initial.noon ||
    times.night !== initial.night;

  const handleSave = async () => {
    if (!dirty) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      await setMealTimes(times);
      router.back();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "저장에 실패했어요";
      await confirm({
        title: "저장 실패",
        message: msg,
        confirmText: "확인",
        cancelText: "닫기",
      });
      setSaving(false);
    }
  };

  const handleBack = async () => {
    if (!dirty) {
      router.back();
      return;
    }
    const ok = await confirm({
      title: "변경사항이 있어요",
      message: "저장하지 않고 나가면 변경한 내용이 사라져요.",
      confirmText: "나가기",
      danger: true,
    });
    if (ok) router.back();
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="식사 시간 설정" onBack={handleBack} />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FFD24D" />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <AppText type="extrabold" style={styles.title}>
              평소 식사 시간을 알려주세요
            </AppText>
            <AppText type="pretendard-m" style={styles.desc}>
              아침/점심/저녁 약 시간을{"\n"}
              자동으로 맞춰드릴게요
            </AppText>

            {(["morning", "noon", "night"] as MealSlot[]).map((slot) => (
              <SlotPicker
                key={slot}
                slot={slot}
                value={times[slot]}
                onChange={(v) => setTimes((t) => ({ ...t, [slot]: v }))}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.btn,
                !dirty && styles.btnSecondary,
                pressed && { opacity: 0.85 },
              ]}
            >
              <AppText
                type="pretendard-b"
                style={dirty ? styles.btnText : styles.btnSecondaryText}
              >
                {saving ? "저장 중..." : dirty ? "저장하기" : "변경사항 없음"}
              </AppText>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function SlotPicker({
  slot,
  value,
  onChange,
}: {
  slot: MealSlot;
  value: string;
  onChange: (v: string) => void;
}) {
  const meta = SLOT_META[slot];
  const scrollRef = useRef<ScrollView>(null);

  // 선택 변경 시 가운데로 자동 스크롤
  useEffect(() => {
    const idx = meta.options.indexOf(value);
    if (idx < 0) return;
    const CHIP_WIDTH = 80;
    scrollRef.current?.scrollTo({
      x: Math.max(0, CHIP_WIDTH * idx - CHIP_WIDTH * 1.5),
      animated: true,
    });
  }, [value, meta.options]);

  return (
    <View style={styles.slotCard}>
      <View style={styles.slotHeader}>
        <View style={[styles.slotIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <AppText type="pretendard-b" style={styles.slotLabel}>
          {meta.label}
        </AppText>
        <AppText
          type="extrabold"
          style={[styles.slotValue, { color: meta.color }]}
        >
          {value}
        </AppText>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {meta.options.map((opt) => {
          const on = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[
                styles.chip,
                on && {
                  backgroundColor: meta.bg,
                  borderColor: meta.color,
                },
              ]}
            >
              <AppText
                type={on ? "pretendard-b" : "pretendard-m"}
                style={[styles.chipText, on && { color: meta.color }]}
              >
                {opt}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  title: {
    fontSize: 24,
    color: "#222",
    marginTop: 4,
  },
  desc: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    marginBottom: 8,
  },

  slotCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    gap: 12,
  },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  slotIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  slotLabel: {
    flex: 1,
    fontSize: 17,
    color: "#222",
  },
  slotValue: {
    fontSize: 22,
  },

  chipRow: {
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
    minWidth: 72,
    alignItems: "center",
  },
  chipText: {
    fontSize: 15,
    color: "#888",
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  btn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFD24D",
    justifyContent: "center",
    alignItems: "center",
  },
  btnSecondary: {
    backgroundColor: "#F0EDE0",
  },
  btnText: {
    fontSize: 17,
    color: "#222",
  },
  btnSecondaryText: {
    fontSize: 17,
    color: "#888",
  },
});
