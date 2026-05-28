import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { getMe } from "@/services/auth";
import { resolveSeniorId } from "@/services/caregivers";
import { createMedicine } from "@/services/medicines";
import { createSchedule, parseDosageQuantity } from "@/services/schedules";
import { MealSlot, toServerSlot } from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SLOT_ORDER: MealSlot[] = ["morning", "noon", "night"];
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

export default function ManualMedicineSetupScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { itemSeq, itemName } = useLocalSearchParams<{
    itemSeq?: string;
    itemName?: string;
  }>();

  const [dosage, setDosage] = useState("");
  const [total, setTotal] = useState("30");
  const [remaining, setRemaining] = useState("30");
  const [slots, setSlots] = useState<Set<MealSlot>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  // 보호자가 호출하는 경우 시니어 ID 필요. 시니어 본인은 undefined.
  const [resolvingSenior, setResolvingSenior] = useState(true);
  const [seniorId, setSeniorId] = useState<number | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (me.role === "CAREGIVER") {
          const sId = await resolveSeniorId();
          setSeniorId(sId);
        }
      } catch (e) {
        console.log("[manual-setup] resolve senior failed:", e);
      } finally {
        setResolvingSenior(false);
      }
    })();
  }, []);

  const toggleSlot = (slot: MealSlot) => {
    setSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

  const totalNum = parseInt(total, 10);
  const remainingNum = parseInt(remaining, 10);
  const canSubmit =
    !!itemName &&
    dosage.trim().length > 0 &&
    !isNaN(totalNum) &&
    totalNum > 0 &&
    !isNaN(remainingNum) &&
    remainingNum >= 0 &&
    remainingNum <= totalNum &&
    slots.size > 0 &&
    !submitting &&
    !resolvingSenior;

  const handleSubmit = async () => {
    if (!canSubmit || !itemName) return;
    setSubmitting(true);
    try {
      const medicine = await createMedicine({
        seniorId,
        name: itemName,
        totalAmount: totalNum,
        remainingAmount: remainingNum,
        itemSeq,
      });
      // 선택한 슬롯마다 스케줄 생성
      const trimmedDosage = dosage.trim();
      const dosageQuantity = parseDosageQuantity(trimmedDosage);
      for (const slot of slots) {
        await createSchedule(medicine.id, {
          mealSlot: toServerSlot(slot),
          dosage: trimmedDosage,
          dosageQuantity,
        });
      }
      await confirm({
        title: "등록 완료",
        message: `${itemName} 약이 등록됐어요`,
        confirmText: "확인",
        cancelText: "닫기",
      });
      // 호출자 역할 별로 메인 화면으로 이동
      try {
        const me = await getMe();
        if (me.role === "CAREGIVER") router.replace("/family" as any);
        else router.replace("/(tabs)" as any);
      } catch {
        router.replace("/(tabs)" as any);
      }
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "약 등록에 실패했어요";
      await confirm({
        title: "등록 실패",
        message: msg,
        confirmText: "확인",
        cancelText: "닫기",
      });
      setSubmitting(false);
    }
  };

  const updateAmount = (
    setter: (v: string) => void,
    raw: string,
  ) => {
    setter(raw.replace(/[^0-9]/g, ""));
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="약 정보 입력" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.nameCard}>
          <View style={styles.pillIcon}>
            <Ionicons name="medkit" size={22} color="#F8B835" />
          </View>
          <AppText
            type="pretendard-b"
            style={styles.nameText}
            numberOfLines={2}
          >
            {itemName ?? "이름 정보 없음"}
          </AppText>
        </View>

        <View style={styles.field}>
          <AppText type="pretendard-b" style={styles.label}>
            1회 복용량
          </AppText>
          <TextInput
            value={dosage}
            onChangeText={setDosage}
            placeholder="예: 1정, 1캡슐, 10ml"
            placeholderTextColor="#BBB"
            maxLength={20}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText type="pretendard-b" style={styles.label}>
            잔여분 / 총량
          </AppText>
          <View style={styles.amountRow}>
            <View style={styles.amountField}>
              <AppText type="pretendard-r" style={styles.amountLabel}>
                잔여
              </AppText>
              <TextInput
                value={remaining}
                onChangeText={(v) => updateAmount(setRemaining, v)}
                keyboardType="number-pad"
                maxLength={4}
                style={[styles.input, styles.amountInput]}
              />
            </View>
            <AppText type="pretendard-m" style={styles.amountSlash}>
              /
            </AppText>
            <View style={styles.amountField}>
              <AppText type="pretendard-r" style={styles.amountLabel}>
                총량
              </AppText>
              <TextInput
                value={total}
                onChangeText={(v) => updateAmount(setTotal, v)}
                keyboardType="number-pad"
                maxLength={4}
                style={[styles.input, styles.amountInput]}
              />
            </View>
            <AppText type="pretendard-m" style={styles.amountUnit}>
              정
            </AppText>
          </View>
        </View>

        <View style={styles.field}>
          <AppText type="pretendard-b" style={styles.label}>
            복용 시간대 (여러 개 선택 가능)
          </AppText>
          <View style={styles.slotRow}>
            {SLOT_ORDER.map((slot) => {
              const on = slots.has(slot);
              return (
                <Pressable
                  key={slot}
                  onPress={() => toggleSlot(slot)}
                  style={[
                    styles.slotBtn,
                    on && {
                      borderColor: SLOT_COLOR[slot],
                      backgroundColor: SLOT_BG[slot],
                    },
                  ]}
                >
                  <Ionicons
                    name={SLOT_ICON[slot]}
                    size={18}
                    color={on ? SLOT_COLOR[slot] : "#BBB"}
                  />
                  <AppText
                    type="pretendard-b"
                    style={[
                      styles.slotBtnText,
                      on && { color: SLOT_COLOR[slot] },
                    ]}
                  >
                    {SLOT_LABEL[slot]}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.btn,
            !canSubmit && styles.btnDisabled,
            pressed && canSubmit && { opacity: 0.85 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#222" />
          ) : (
            <AppText type="pretendard-b" style={styles.btnText}>
              약 등록하기
            </AppText>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  nameCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  pillIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF1C8",
    justifyContent: "center",
    alignItems: "center",
  },
  nameText: {
    flex: 1,
    fontSize: 17,
    color: "#222",
    lineHeight: 22,
  },

  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#333",
    paddingHorizontal: 4,
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: "#222",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E0CE",
    borderRadius: 12,
  },

  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amountField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  amountLabel: {
    fontSize: 12,
    color: "#666",
  },
  amountInput: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Pretendard-Bold",
  },
  amountSlash: {
    fontSize: 18,
    color: "#999",
  },
  amountUnit: {
    fontSize: 13,
    color: "#666",
  },

  slotRow: {
    flexDirection: "row",
    gap: 8,
  },
  slotBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
  },
  slotBtnText: {
    fontSize: 14,
    color: "#888",
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  btn: {
    height: 56,
    backgroundColor: "#FFD24D",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    backgroundColor: "#F0EDE0",
  },
  btnText: {
    fontSize: 17,
    color: "#222",
  },
});
