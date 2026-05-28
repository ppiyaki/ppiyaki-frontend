import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { LinkedSenior, listLinkedSeniors } from "@/services/caregivers";
import {
  DEFAULT_MEAL_TIMES,
  MealSlot,
  MealTimes,
  setSeniorMealTimes,
} from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FALLBACK_IMG = require("../../assets/images/pf/pfimg2.png");

const SLOT_META: Record<
  MealSlot,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    options: string[];
  }
> = {
  morning: {
    label: "아침",
    icon: "sunny",
    color: "#F8B835",
    bg: "#FFF4D6",
    options: generateOptions(6, 10),
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

export default function SeniorMealTimesScreen() {
  const router = useRouter();
  const confirm = useConfirm();

  const [seniors, setSeniors] = useState<LinkedSenior[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [times, setTimes] = useState<MealTimes>(DEFAULT_MEAL_TIMES);
  const [initial, setInitial] = useState<MealTimes>(DEFAULT_MEAL_TIMES);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const list = await listLinkedSeniors();
        setSeniors(list);
        if (list[0]) setSelectedId(list[0].id);
        if (list.length === 0) setError("연동된 시니어가 없어요");
      } catch (e) {
        console.log("[senior-meal-times] listLinkedSeniors failed:", e);
        setError("시니어 정보를 불러오지 못했어요");
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  // 시니어 변경 시 폼 리셋 (서버에서 현재 시간을 가져올 GET이 없어 기본값으로 시작)
  useEffect(() => {
    if (selectedId == null) return;
    setTimes(DEFAULT_MEAL_TIMES);
    setInitial(DEFAULT_MEAL_TIMES);
  }, [selectedId]);

  const dirty =
    times.morning !== initial.morning ||
    times.noon !== initial.noon ||
    times.night !== initial.night;

  const handleSave = async () => {
    if (selectedId == null || !dirty) return;
    setSaving(true);
    try {
      await setSeniorMealTimes(selectedId, times);
      setInitial(times);
      await confirm({
        title: "저장 완료",
        message: "시니어의 복약 시간이 저장됐어요",
        confirmText: "확인",
        cancelText: "닫기",
      });
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "저장에 실패했어요";
      await confirm({
        title: "저장 실패",
        message: msg,
        confirmText: "확인",
        cancelText: "닫기",
      });
    } finally {
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
      <PageHeader title="복약시간 설정" onBack={handleBack} />

      {loadingList ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FFD24D" />
        </View>
      ) : error && seniors.length === 0 ? (
        <View style={styles.stateBox}>
          <Ionicons name="alert-circle" size={28} color="#E14B4B" />
          <AppText type="pretendard-m" style={styles.stateText}>
            {error}
          </AppText>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <AppText type="pretendard-b" style={styles.sectionTitle}>
                관리 중인 시니어
              </AppText>
              <View style={styles.seniorRow}>
                {seniors.map((senior) => {
                  const on = senior.id === selectedId;
                  return (
                    <Pressable
                      key={senior.id}
                      onPress={() => setSelectedId(senior.id)}
                      style={[styles.seniorCard, on && styles.seniorCardOn]}
                    >
                      <View style={styles.seniorAvatar}>
                        <Image
                          source={FALLBACK_IMG}
                          style={styles.seniorImg}
                          resizeMode="cover"
                        />
                      </View>
                      <AppText
                        type="pretendard-b"
                        style={[styles.seniorName, on && styles.seniorNameOn]}
                      >
                        {senior.nickname}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <AppText type="extrabold" style={styles.title}>
              평소 식사 후 복약 시간을 알려주세요
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
              disabled={saving || !dirty || selectedId == null}
              style={({ pressed }) => [
                styles.btn,
                (!dirty || selectedId == null) && styles.btnSecondary,
                pressed && { opacity: 0.85 },
              ]}
            >
              <AppText
                type="pretendard-b"
                style={
                  dirty && selectedId != null
                    ? styles.btnText
                    : styles.btnSecondaryText
                }
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
  const [editing, setEditing] = useState(false);

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
        <Pressable
          onPress={() => setEditing(true)}
          hitSlop={10}
          style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="create-outline" size={20} color="#666" />
        </Pressable>
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

      <TimeEditModal
        visible={editing}
        label={meta.label}
        accentColor={meta.color}
        accentBg={meta.bg}
        initial={value}
        onClose={() => setEditing(false)}
        onSave={(v) => {
          onChange(v);
          setEditing(false);
        }}
      />
    </View>
  );
}

function TimeEditModal({
  visible,
  label,
  accentColor,
  accentBg,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  label: string;
  accentColor: string;
  accentBg: string;
  initial: string;
  onClose: () => void;
  onSave: (v: string) => void;
}) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");

  useEffect(() => {
    if (visible) {
      const [h, m] = initial.split(":");
      setHour(h ?? "");
      setMinute(m ?? "");
    }
  }, [visible, initial]);

  const hourNum = parseInt(hour, 10);
  const minuteNum = parseInt(minute, 10);
  const valid =
    !isNaN(hourNum) &&
    hourNum >= 0 &&
    hourNum <= 23 &&
    !isNaN(minuteNum) &&
    minuteNum >= 0 &&
    minuteNum <= 59;

  const handleSave = () => {
    if (!valid) return;
    const hh = String(hourNum).padStart(2, "0");
    const mm = String(minuteNum).padStart(2, "0");
    onSave(`${hh}:${mm}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <AppText type="pretendard-b" style={styles.modalTitle}>
            {label} 시간 직접 입력
          </AppText>
          <AppText type="pretendard-r" style={styles.modalDesc}>
            시: 0~23, 분: 0~59
          </AppText>

          <View style={styles.modalInputRow}>
            <TextInput
              value={hour}
              onChangeText={(t) =>
                setHour(t.replace(/[^0-9]/g, "").slice(0, 2))
              }
              keyboardType="number-pad"
              maxLength={2}
              placeholder="00"
              placeholderTextColor="#BBB"
              allowFontScaling={false}
              style={[styles.modalInput, { borderColor: accentColor }]}
            />
            <AppText type="extrabold" style={styles.modalColon}>
              :
            </AppText>
            <TextInput
              value={minute}
              onChangeText={(t) =>
                setMinute(t.replace(/[^0-9]/g, "").slice(0, 2))
              }
              keyboardType="number-pad"
              maxLength={2}
              placeholder="00"
              placeholderTextColor="#BBB"
              allowFontScaling={false}
              style={[styles.modalInput, { borderColor: accentColor }]}
            />
          </View>

          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalBtn,
                styles.modalBtnSecondary,
                pressed && { opacity: 0.85 },
              ]}
            >
              <AppText type="pretendard-b" style={styles.modalBtnSecondaryText}>
                취소
              </AppText>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!valid}
              style={({ pressed }) => [
                styles.modalBtn,
                {
                  backgroundColor: valid ? accentBg : "#F0EDE0",
                  borderColor: valid ? accentColor : "transparent",
                  borderWidth: valid ? 1.5 : 0,
                },
                pressed && valid && { opacity: 0.85 },
              ]}
            >
              <AppText
                type="pretendard-b"
                style={[
                  styles.modalBtnPrimaryText,
                  { color: valid ? accentColor : "#888" },
                ]}
              >
                확인
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
  stateBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  stateText: { fontSize: 14, color: "#888" },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 17,
    color: "#222",
    paddingHorizontal: 4,
  },

  seniorRow: { flexDirection: "row", gap: 10 },
  seniorCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
    gap: 8,
  },
  seniorCardOn: {
    borderColor: "#5BC4AE",
    backgroundColor: "#E8F7F2",
  },
  seniorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  seniorImg: { width: "100%", height: "100%" },
  seniorName: { fontSize: 15, color: "#444" },
  seniorNameOn: { color: "#222" },

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
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#F1ECDB",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    color: "#222",
  },
  modalDesc: {
    fontSize: 13,
    color: "#777",
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  modalInput: {
    width: 88,
    height: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "#FAFAF6",
    textAlign: "center",
    fontSize: 28,
    fontFamily: "Pretendard-Bold",
    color: "#222",
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  modalColon: {
    fontSize: 28,
    color: "#444",
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnSecondary: {
    backgroundColor: "#FAFAF6",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  modalBtnSecondaryText: {
    fontSize: 15,
    color: "#666",
  },
  modalBtnPrimaryText: {
    fontSize: 15,
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
