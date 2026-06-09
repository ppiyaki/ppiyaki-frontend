import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { getMe } from "@/services/auth";
import { describeDaysOfWeek } from "@/services/days-of-week";
import { emitMedicationUpdated } from "@/services/medication-events";
import { deleteMedicine, getMedicine, Medicine } from "@/services/medicines";
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  MedicationSchedule,
} from "@/services/schedules";
import {
  getMealTimes,
  MealSlot,
  MealTimes,
  toServerSlot,
} from "@/services/user-settings";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

const DOSAGE_UNITS = ["정", "캡슐", "포", "ml", "방울", "회"] as const;
type DosageUnit = (typeof DOSAGE_UNITS)[number];

export default function MedicationDetailScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const medicineId = id ? Number(id) : null;

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [meals, setMeals] = useState<MealTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  // 새 schedule 추가용 (보호자만)
  const [newSlot, setNewSlot] = useState<MealSlot | null>(null);
  const [newDoseAmount, setNewDoseAmount] = useState("1");
  const [newDoseUnit, setNewDoseUnit] = useState<DosageUnit>("정");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!medicineId) return;
    setLoading(true);
    try {
      const [m, s, mt, me] = await Promise.all([
        getMedicine(medicineId),
        listSchedules(medicineId),
        getMealTimes(),
        getMe().catch(() => null),
      ]);
      setMedicine(m);
      setSchedules(s.responses);
      setMeals(mt);
      setCanEdit(me?.role === "CAREGIVER");
    } finally {
      setLoading(false);
    }
  }, [medicineId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleAddSchedule = async () => {
    if (!medicineId || !newSlot) return;
    setAdding(true);
    try {
      const selectedSlot = newSlot;
      const selectedUnit = newDoseUnit;
      const quantity = parseDoseAmount(newDoseAmount);
      const dosage = `${formatDoseAmount(quantity)}${selectedUnit}`;
      const created = await createSchedule(medicineId, {
        mealSlot: toServerSlot(selectedSlot),
        dosage,
        dosageUnit: selectedUnit,
        dosageQuantity: quantity,
      });
      setNewSlot(null);
      setNewDoseAmount("1");
      setNewDoseUnit("정");
      emitMedicationUpdated();
      await load();
      setSchedules((prev) =>
        prev.map((schedule) =>
          schedule.id === created.id
            ? { ...schedule, dosageUnit: schedule.dosageUnit ?? selectedUnit }
            : schedule,
        ),
      );
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "추가에 실패했어요";
      await confirm({
        title: "추가 실패",
        message: msg,
        confirmText: "확인",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!medicineId) return;
    const ok = await confirm({
      title: "복약 시간 삭제",
      message: "이 시간을 삭제할까요?",
      confirmText: "삭제",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteSchedule(medicineId, scheduleId);
      emitMedicationUpdated();
      await load();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "삭제에 실패했어요";
      await confirm({
        title: "삭제 실패",
        message: msg,
        confirmText: "확인",
      });
    }
  };

  const handleDeleteMedicine = async () => {
    if (!medicineId) return;
    const ok = await confirm({
      title: "약 삭제",
      message: "이 약과 모든 복약 시간이 함께 삭제돼요.\n계속할까요?",
      confirmText: "삭제",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMedicine(medicineId);
      emitMedicationUpdated();
      router.back();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "삭제에 실패했어요";
      await confirm({
        title: "삭제 실패",
        message: msg,
        confirmText: "확인",
      });
    }
  };

  if (loading || !medicine) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={["top", "left", "right", "bottom"]}
      >
        <PageHeader title="약 정보" />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FFD24D" />
        </View>
      </SafeAreaView>
    );
  }

  const lowStock = medicine.remainingAmount <= 7;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="약 정보" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 약 정보 카드 */}
        <View style={styles.medCard}>
          <View style={styles.medThumb}>
            <MaterialCommunityIcons name="pill" size={32} color="#5BC4AE" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText type="extrabold" style={styles.medName}>
              {medicine.name}
            </AppText>
            <AppText
              type="pretendard-m"
              style={[styles.medRemaining, lowStock && { color: "#E14B4B" }]}
            >
              잔여 {medicine.remainingAmount} / 총 {medicine.totalAmount}일분
            </AppText>
            {medicine.prescriptionId && (
              <AppText type="pretendard-r" style={styles.medSrc}>
                처방전 #{medicine.prescriptionId}에서 등록
              </AppText>
            )}
          </View>
        </View>

        {medicine.durWarningText && (
          <View style={styles.durCard}>
            <Ionicons name="warning" size={18} color="#F8B835" />
            <AppText type="pretendard-m" style={styles.durText}>
              {medicine.durWarningText}
            </AppText>
          </View>
        )}

        {/* 복약 시간 */}
        <View style={styles.section}>
          <AppText type="pretendard-b" style={styles.sectionTitle}>
            복약 시간
          </AppText>
          {schedules.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={32} color="#BBB" />
              <AppText type="pretendard-m" style={styles.emptyText}>
                등록된 복약 시간이 없어요
              </AppText>
              <AppText type="pretendard-r" style={styles.emptySubText}>
                아래에서 시간을 추가해주세요
              </AppText>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {schedules.map((s) => (
                <ScheduleRow
                  key={s.id}
                  schedule={s}
                  onDelete={
                    canEdit ? () => handleDeleteSchedule(s.id) : undefined
                  }
                />
              ))}
            </View>
          )}
        </View>

        {/* 시간 추가 — 보호자만 */}
        {canEdit && (() => {
          // 이미 등록된 슬롯 — 이중 등록 방지용
          const existingSlots = new Set<MealSlot>(
            schedules.map((s) =>
              s.mealSlot === "BREAKFAST"
                ? "morning"
                : s.mealSlot === "LUNCH"
                  ? "noon"
                  : "night",
            ),
          );
          const allTaken = existingSlots.size === 3;
          return (
          <View style={styles.section}>
            <AppText type="pretendard-b" style={styles.sectionTitle}>
              시간 추가하기
            </AppText>
            <View style={styles.addCard}>
              {allTaken && (
                <AppText type="pretendard-m" style={styles.allTakenHint}>
                  아침·점심·저녁 모두 등록되어 있어요
                </AppText>
              )}
              <View style={styles.slotRow}>
                {(["morning", "noon", "night"] as MealSlot[]).map((slot) => {
                  const on = newSlot === slot;
                  const taken = existingSlots.has(slot);
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => {
                        if (taken) return;
                        setNewSlot(slot);
                      }}
                      disabled={taken}
                      style={[
                        styles.slotBtn,
                        on && {
                          borderColor: SLOT_COLOR[slot],
                          backgroundColor: SLOT_BG[slot],
                        },
                        taken && styles.slotBtnTaken,
                      ]}
                    >
                      <Ionicons
                        name={SLOT_ICON[slot]}
                        size={20}
                        color={
                          taken
                            ? "#CCC"
                            : on
                              ? SLOT_COLOR[slot]
                              : "#BBB"
                        }
                      />
                      <AppText
                        type="pretendard-b"
                        style={[
                          styles.slotBtnText,
                          on && { color: SLOT_COLOR[slot] },
                          taken && { color: "#BBB" },
                        ]}
                      >
                        {SLOT_LABEL[slot]}
                        {taken && (
                          <AppText type="pretendard-r" style={styles.takenMark}>
                            {" "}등록됨
                          </AppText>
                        )}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.dosageRow}>
                <AppText type="pretendard-b" style={styles.dosageLabel}>
                  복용량
                </AppText>
                <TextInput
                  value={newDoseAmount}
                  onChangeText={(value) =>
                    setNewDoseAmount(cleanDoseAmount(value))
                  }
                  placeholder="1"
                  placeholderTextColor="#BBB"
                  keyboardType="decimal-pad"
                  style={styles.dosageAmountInput}
                  maxLength={6}
                />
                <Pressable
                  onPress={() => setUnitPickerOpen(true)}
                  style={({ pressed }) => [
                    styles.unitSelect,
                    pressed && { backgroundColor: "#F4FBF9" },
                  ]}
                >
                  <AppText type="pretendard-b" style={styles.unitSelectText}>
                    {newDoseUnit}
                  </AppText>
                  <Ionicons name="chevron-down" size={16} color="#5BC4AE" />
                </Pressable>
              </View>
              <Pressable
                onPress={handleAddSchedule}
                disabled={!newSlot || adding || allTaken}
                style={({ pressed }) => [
                  styles.addBtn,
                  (!newSlot || adding || allTaken) && styles.addBtnDisabled,
                  pressed && newSlot && !allTaken && { opacity: 0.85 },
                ]}
              >
                <Ionicons name="add" size={20} color="#222" />
                <AppText type="pretendard-b" style={styles.addBtnText}>
                  {adding ? "추가 중..." : "시간 추가"}
                </AppText>
              </Pressable>
            </View>
          </View>
          );
        })()}

        {/* 약 삭제 — 보호자만 */}
        {canEdit && (
          <Pressable
            onPress={handleDeleteMedicine}
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color="#E14B4B" />
            <AppText type="pretendard-b" style={styles.deleteBtnText}>
              이 약 삭제하기
            </AppText>
          </Pressable>
        )}

        {/* 시니어 안내 */}
        {!canEdit && schedules.length === 0 && (
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle" size={18} color="#5BC4AE" />
            <AppText type="pretendard-m" style={styles.noticeText}>
              보호자가 복약 시간을 설정해드릴 거예요
            </AppText>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={unitPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setUnitPickerOpen(false)}
      >
        <Pressable
          style={styles.unitBackdrop}
          onPress={() => setUnitPickerOpen(false)}
        >
          <Pressable style={styles.unitSheet} onPress={() => {}}>
            <AppText type="pretendard-b" style={styles.unitSheetTitle}>
              복용량 단위 선택
            </AppText>
            {DOSAGE_UNITS.map((unit) => {
              const selected = unit === newDoseUnit;
              return (
                <Pressable
                  key={unit}
                  onPress={() => {
                    setNewDoseUnit(unit);
                    setUnitPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.unitOption,
                    selected && styles.unitOptionOn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <AppText
                    type="pretendard-b"
                    style={[
                      styles.unitOptionText,
                      selected && styles.unitOptionTextOn,
                    ]}
                  >
                    {unit}
                  </AppText>
                  {selected && (
                    <Ionicons name="checkmark" size={18} color="#5BC4AE" />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function cleanDoseAmount(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [first, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${first}.${rest.join("")}` : first;
}

function parseDoseAmount(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function formatDoseAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function ScheduleRow({
  schedule,
  onDelete,
}: {
  schedule: MedicationSchedule;
  onDelete?: () => void;
}) {
  const time = schedule.scheduledTime.slice(0, 5);
  const dosageText = formatScheduleDosage(schedule);
  return (
    <View style={styles.scheduleRow}>
      <View style={styles.scheduleTime}>
        <AppText type="extrabold" style={styles.scheduleTimeText}>
          {time}
        </AppText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText type="pretendard-b" style={styles.scheduleDosage}>
          {dosageText}
        </AppText>
        <AppText type="pretendard-m" style={styles.scheduleDays}>
          {describeDaysOfWeek(schedule.daysOfWeek)}
        </AppText>
      </View>
      {onDelete && (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={({ pressed }) => [
            styles.scheduleDeleteBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="close" size={18} color="#E14B4B" />
        </Pressable>
      )}
    </View>
  );
}

function formatScheduleDosage(schedule: MedicationSchedule): string {
  const raw = schedule.dosage?.trim() ?? "";
  if (!raw) return "1정";
  if (/[^0-9.]/.test(raw)) return raw;
  return `${raw}${schedule.dosageUnit ?? "정"}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFDF6" },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },

  /* 약 정보 */
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  medThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#D6F1EA",
    justifyContent: "center",
    alignItems: "center",
  },
  medName: {
    fontSize: 19,
    color: "#222",
  },
  medRemaining: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  medSrc: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },

  durCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF8E0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FFE9A8",
  },
  durText: {
    flex: 1,
    fontSize: 13,
    color: "#7A5C00",
    lineHeight: 19,
  },

  /* 섹션 공통 */
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 16,
    color: "#222",
    paddingHorizontal: 4,
  },

  emptyBox: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  emptyText: { fontSize: 14, color: "#666" },
  emptySubText: { fontSize: 12, color: "#999" },

  /* 일정 row */
  scheduleRow: {
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
  scheduleTime: {
    width: 60,
    alignItems: "center",
  },
  scheduleTimeText: {
    fontSize: 18,
    color: "#222",
  },
  scheduleDosage: { fontSize: 14, color: "#222" },
  scheduleDays: { fontSize: 12, color: "#777" },
  scheduleDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FCEBEB",
    justifyContent: "center",
    alignItems: "center",
  },

  /* 추가 카드 */
  addCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    gap: 12,
  },
  slotRow: {
    flexDirection: "row",
    gap: 8,
  },
  allTakenHint: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    paddingVertical: 4,
  },
  slotBtnTaken: {
    backgroundColor: "#F4F2EA",
    opacity: 0.6,
  },
  takenMark: {
    fontSize: 11,
    color: "#BBB",
  },
  slotBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    gap: 4,
  },
  slotBtnText: {
    fontSize: 13,
    color: "#888",
  },
  slotBtnTime: {
    fontSize: 11,
    color: "#888",
  },
  dosageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
  },
  dosageLabel: { fontSize: 14, color: "#444" },
  dosageAmountInput: {
    flex: 1,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Pretendard-Bold",
    color: "#222",
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#F1ECDB",
    borderRadius: 10,
    textAlign: "center",
  },
  unitSelect: {
    height: 42,
    minWidth: 92,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#BDEFEA",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  unitSelectText: {
    fontSize: 15,
    color: "#222",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFD24D",
  },
  addBtnDisabled: { backgroundColor: "#F0EDE0" },
  addBtnText: { fontSize: 15, color: "#222" },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  deleteBtnText: {
    fontSize: 14,
    color: "#E14B4B",
  },

  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F7F2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#BDEFEA",
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: "#5BC4AE",
  },
  unitBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  unitSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 8,
  },
  unitSheetTitle: {
    fontSize: 17,
    color: "#222",
    textAlign: "center",
    marginBottom: 8,
  },
  unitOption: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  unitOptionOn: {
    borderColor: "#5BC4AE",
    backgroundColor: "#E8F7F2",
  },
  unitOptionText: {
    fontSize: 16,
    color: "#444",
  },
  unitOptionTextOn: {
    color: "#222",
  },
});
