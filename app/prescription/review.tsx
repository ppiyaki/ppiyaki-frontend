import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { getMe } from "@/services/auth";
import {
  CaregiverDecision,
  confirmPrescription,
  decideCandidate,
  getPrescription,
  MedicineAmountInput,
  PrescriptionCandidate,
  PrescriptionDetail,
} from "@/services/prescriptions";
import {
  fromServerSlot,
  MealSlot,
  ServerMealSlot,
  toServerSlot,
} from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

/** v0.9.3: candidate별 보호자가 선택한 confirmedMealSlots 로컬 상태 */
type SlotMap = Record<number, Set<MealSlot>>;

/** v0.9.8: candidate별 잔여분/총량 (단위: 정/캡슐 등). 디폴트 30. */
interface AmountState {
  total: string;
  remaining: string;
}
type AmountMap = Record<number, AmountState>;
const DEFAULT_AMOUNT = "30";

export default function PrescriptionReviewScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const prescriptionId = id ? Number(id) : null;

  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyCandidateId, setBusyCandidateId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slotMap, setSlotMap] = useState<SlotMap>({});
  const [amountMap, setAmountMap] = useState<AmountMap>({});

  const load = useCallback(async () => {
    if (!prescriptionId) return;
    setLoading(true);
    try {
      const data = await getPrescription(prescriptionId);
      setDetail(data);
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // detail 로드 후 candidate 별 초기 슬롯 = confirmedMealSlots ?? suggestedMealSlots
  useEffect(() => {
    if (!detail) return;
    setSlotMap((prev) => {
      const next: SlotMap = { ...prev };
      for (const c of detail.candidates) {
        if (next[c.id]) continue; // 사용자가 이미 만진 candidate는 보존
        const seed: ServerMealSlot[] =
          c.confirmedMealSlots ?? c.suggestedMealSlots ?? [];
        next[c.id] = new Set(seed.map(fromServerSlot));
      }
      return next;
    });
    // v0.9.8: candidate별 초기 잔여분 = 디폴트 30/30
    setAmountMap((prev) => {
      const next: AmountMap = { ...prev };
      for (const c of detail.candidates) {
        if (next[c.id]) continue;
        next[c.id] = { total: DEFAULT_AMOUNT, remaining: DEFAULT_AMOUNT };
      }
      return next;
    });
  }, [detail]);

  const toggleSlot = (candidateId: number, slot: MealSlot) => {
    setSlotMap((prev) => {
      const cur = new Set(prev[candidateId] ?? []);
      if (cur.has(slot)) cur.delete(slot);
      else cur.add(slot);
      return { ...prev, [candidateId]: cur };
    });
  };

  const updateAmount = (
    candidateId: number,
    field: keyof AmountState,
    value: string,
  ) => {
    // 숫자만 허용 (빈 문자열도 허용 — 입력 도중 케이스)
    const cleaned = value.replace(/[^0-9]/g, "");
    setAmountMap((prev) => {
      const cur = prev[candidateId] ?? {
        total: DEFAULT_AMOUNT,
        remaining: DEFAULT_AMOUNT,
      };
      const next = { ...cur, [field]: cleaned };
      // total이 변하면 remaining이 total보다 크지 않게 자동 보정
      if (field === "total") {
        const t = parseInt(cleaned, 10);
        const r = parseInt(next.remaining, 10);
        if (!isNaN(t) && !isNaN(r) && r > t) next.remaining = cleaned;
      }
      return { ...prev, [candidateId]: next };
    });
  };

  const showApiError = async (e: unknown) => {
    if (e instanceof ApiError && e.code === "CARE_004") {
      await confirm({
        title: "보호자 검토 대기 중이에요",
        message:
          "처방전이 등록되었어요!\n보호자가 검토해드릴 때까지 잠시만 기다려주세요.",
        confirmText: "확인",
        cancelText: "닫기",
      });
      return;
    }
    if (e instanceof ApiError && e.code === "USER_002") {
      await confirm({
        title: "식사 시간이 필요해요",
        message:
          "선택한 식사 시간(아침/점심/저녁)이 어르신 프로필에 설정되어 있지 않아요.\n프로필에서 식사 시간을 먼저 설정해주세요.",
        confirmText: "확인",
        cancelText: "닫기",
      });
      return;
    }
    const msg =
      e instanceof ApiError
        ? e.toUserMessage()
        : e instanceof Error
          ? e.message
          : "처리에 실패했어요";
    await confirm({
      title: "처리 실패",
      message: msg,
      confirmText: "확인",
      cancelText: "닫기",
    });
  };

  const handleDecide = async (
    candidateId: number,
    decision: Exclude<CaregiverDecision, "PENDING">,
    chosenItemSeq?: string,
  ) => {
    if (!prescriptionId) return;
    setBusyCandidateId(candidateId);
    try {
      // ACCEPTED/MANUALLY_CORRECTED일 때만 confirmedMealSlots 함께 전송
      const confirmedMealSlots =
        decision === "REJECTED"
          ? undefined
          : Array.from(slotMap[candidateId] ?? []).map(toServerSlot);
      await decideCandidate(prescriptionId, candidateId, decision, {
        chosenItemSeq,
        confirmedMealSlots,
      });
      await load();
    } catch (e) {
      await showApiError(e);
    } finally {
      setBusyCandidateId(null);
    }
  };

  const handleManualCorrect = (candidateId: number) => {
    if (!prescriptionId) return;
    router.push({
      pathname: "/prescription/search" as any,
      params: {
        prescriptionId: String(prescriptionId),
        candidateId: String(candidateId),
        mode: "correct",
      },
    });
  };

  const handleAddManual = () => {
    if (!prescriptionId) return;
    router.push({
      pathname: "/prescription/search" as any,
      params: {
        prescriptionId: String(prescriptionId),
        mode: "add",
      },
    });
  };

  const handleConfirmAll = async () => {
    if (!prescriptionId || !detail) return;
    const allDecided = detail.candidates.every(
      (c) => c.caregiverDecision !== "PENDING",
    );
    if (!allDecided) {
      await confirm({
        title: "검토가 필요해요",
        message:
          "아직 결정하지 않은 약이 있어요.\n모두 확인 후 다시 시도해주세요.",
        confirmText: "확인",
        cancelText: "닫기",
      });
      return;
    }

    setSubmitting(true);
    try {
      // v0.9.3: 서버가 confirmedMealSlots 기반으로 schedule 자동 생성
      // v0.9.8: ACCEPTED/MANUALLY_CORRECTED candidate별 잔여분 함께 전송
      const medicineAmounts: MedicineAmountInput[] = detail.candidates
        .filter(
          (c) =>
            c.caregiverDecision === "ACCEPTED" ||
            c.caregiverDecision === "MANUALLY_CORRECTED",
        )
        .map((c) => {
          const a = amountMap[c.id] ?? {
            total: DEFAULT_AMOUNT,
            remaining: DEFAULT_AMOUNT,
          };
          const total = parseInt(a.total, 10) || 0;
          const remaining = Math.min(parseInt(a.remaining, 10) || 0, total);
          return {
            candidateId: c.id,
            totalAmount: total,
            remainingAmount: remaining,
          };
        });
      const result = await confirmPrescription(prescriptionId, medicineAmounts);
      const accepted = result.candidates.filter(
        (c) =>
          c.caregiverDecision !== "REJECTED" && c.createdMedicineId !== null,
      );
      const scheduled = accepted.filter(
        (c) => (c.confirmedMealSlots?.length ?? 0) > 0,
      ).length;
      const pending = accepted.length - scheduled;

      const lines: string[] = [];
      if (scheduled > 0) {
        lines.push(`${scheduled}개 약의 복약 시간이 자동으로 설정됐어요.`);
      }
      if (pending > 0) {
        lines.push(`${pending}개 약은 시간을 직접 설정해주세요.`);
      }
      if (lines.length === 0) lines.push("처방전 확정이 완료됐어요.");

      await confirm({
        title: "확정 완료",
        message: lines.join("\n"),
        confirmText: "확인",
        cancelText: "닫기",
      });

      // 호출자 역할에 따라 분기 — 시니어/보호자 영역은 절대 교차 X
      let targetRoute = "/(tabs)";
      try {
        const me = await getMe();
        if (me.role === "CAREGIVER") targetRoute = "/family";
      } catch {
        // 무시 — 기본 /(tabs)
      }
      router.replace(targetRoute as any);
    } catch (e) {
      await showApiError(e);
      setSubmitting(false);
    }
  };

  if (loading || !detail) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={["top", "left", "right", "bottom"]}
      >
        <PageHeader title="처방전 검토" />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FFD24D" />
        </View>
      </SafeAreaView>
    );
  }

  const decidedCount = detail.candidates.filter(
    (c) => c.caregiverDecision !== "PENDING",
  ).length;
  const total = detail.candidates.length;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="처방전 검토" />

      <View style={styles.progressRow}>
        <AppText type="pretendard-m" style={styles.progressText}>
          검토 완료{" "}
          <AppText type="extrabold" style={styles.progressNum}>
            {decidedCount}
          </AppText>{" "}
          / {total}
        </AppText>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: total ? `${(decidedCount / total) * 100}%` : "0%" },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {detail.candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            busy={busyCandidateId === c.id}
            selectedSlots={slotMap[c.id] ?? new Set()}
            amount={
              amountMap[c.id] ?? {
                total: DEFAULT_AMOUNT,
                remaining: DEFAULT_AMOUNT,
              }
            }
            onToggleSlot={(slot) => toggleSlot(c.id, slot)}
            onChangeAmount={(field, value) => updateAmount(c.id, field, value)}
            onAccept={() => handleDecide(c.id, "ACCEPTED")}
            onReject={() => handleDecide(c.id, "REJECTED")}
            onCorrect={() => handleManualCorrect(c.id)}
          />
        ))}

        <Pressable
          onPress={handleAddManual}
          style={({ pressed }) => [
            styles.addBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="add-circle-outline" size={20} color="#5BC4AE" />
          <AppText type="pretendard-b" style={styles.addBtnText}>
            누락된 약 추가하기
          </AppText>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleConfirmAll}
          disabled={submitting}
          style={({ pressed }) => [
            styles.confirmBtn,
            decidedCount < total && styles.confirmBtnDisabled,
            pressed && decidedCount === total && { opacity: 0.85 },
          ]}
        >
          <AppText type="pretendard-b" style={styles.confirmBtnText}>
            {submitting ? "확정 중..." : "확정하기"}
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CandidateCard({
  candidate,
  busy,
  selectedSlots,
  amount,
  onToggleSlot,
  onChangeAmount,
  onAccept,
  onReject,
  onCorrect,
}: {
  candidate: PrescriptionCandidate;
  busy: boolean;
  selectedSlots: Set<MealSlot>;
  amount: AmountState;
  onToggleSlot: (slot: MealSlot) => void;
  onChangeAmount: (field: keyof AmountState, value: string) => void;
  onAccept: () => void;
  onReject: () => void;
  onCorrect: () => void;
}) {
  const decided = candidate.caregiverDecision;
  const display =
    candidate.matchedItemName ?? candidate.extractedName ?? "이름 미확인";
  const showSlotPicker = decided === "PENDING" || decided !== "REJECTED";
  const showAmountPicker = decided !== "REJECTED";

  return (
    <View
      style={[
        styles.card,
        decided === "ACCEPTED" && styles.cardAccepted,
        decided === "MANUALLY_CORRECTED" && styles.cardCorrected,
        decided === "REJECTED" && styles.cardRejected,
      ]}
    >
      <View style={styles.cardHead}>
        <View style={styles.pillIcon}>
          <Ionicons name="medkit" size={20} color="#F8B835" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText
            type="pretendard-b"
            style={styles.cardName}
            numberOfLines={2}
          >
            {display}
          </AppText>
          {(candidate.extractedDosage || candidate.extractedSchedule) && (
            <AppText type="pretendard-m" style={styles.cardMeta}>
              {[candidate.extractedDosage, candidate.extractedSchedule]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
          )}
          {candidate.matchType && (
            <AppText type="pretendard-r" style={styles.cardMatch}>
              매칭: {candidate.matchType}
              {candidate.matchReason ? ` (${candidate.matchReason})` : ""}
            </AppText>
          )}
        </View>
      </View>

      {showAmountPicker && (
        <View style={styles.amountBox}>
          <AppText type="pretendard-b" style={styles.amountTitle}>
            잔여분 / 총량
          </AppText>
          <View style={styles.amountRow}>
            <AmountField
              label="잔여"
              value={amount.remaining}
              onChange={(v) => onChangeAmount("remaining", v)}
              editable={decided === "PENDING"}
            />
            <AppText type="pretendard-m" style={styles.amountSlash}>
              /
            </AppText>
            <AmountField
              label="총량"
              value={amount.total}
              onChange={(v) => onChangeAmount("total", v)}
              editable={decided === "PENDING"}
            />
            <AppText type="pretendard-m" style={styles.amountUnit}>
              정
            </AppText>
          </View>
        </View>
      )}

      {showSlotPicker && decided !== "REJECTED" && (
        <View style={styles.slotPickerBox}>
          <AppText type="pretendard-b" style={styles.slotPickerTitle}>
            복용 시간대 선택
            {(candidate.suggestedMealSlots?.length ?? 0) > 0 && (
              <AppText type="pretendard-r" style={styles.slotPickerHint}>
                {"  "}AI 추천 표시됨
              </AppText>
            )}
          </AppText>
          <View style={styles.slotRow}>
            {SLOT_ORDER.map((slot) => {
              const on = selectedSlots.has(slot);
              const suggested =
                candidate.suggestedMealSlots?.includes(toServerSlot(slot)) ??
                false;
              return (
                <Pressable
                  key={slot}
                  onPress={() => onToggleSlot(slot)}
                  disabled={decided !== "PENDING"}
                  style={[
                    styles.slotBtn,
                    on && {
                      borderColor: SLOT_COLOR[slot],
                      backgroundColor: SLOT_BG[slot],
                    },
                    decided !== "PENDING" && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons
                    name={SLOT_ICON[slot]}
                    size={16}
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
                  {suggested && !on && (
                    <View style={styles.suggestDot} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {decided === "PENDING" ? (
        <View style={styles.actionRow}>
          <Pressable
            onPress={onReject}
            disabled={busy}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.rejectBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="close" size={16} color="#E14B4B" />
            <AppText type="pretendard-b" style={styles.rejectText}>
              제외
            </AppText>
          </Pressable>
          <Pressable
            onPress={onCorrect}
            disabled={busy}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.correctBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="search" size={16} color="#F8B835" />
            <AppText type="pretendard-b" style={styles.correctText}>
              다른 약
            </AppText>
          </Pressable>
          <Pressable
            onPress={onAccept}
            disabled={busy}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.acceptBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="checkmark" size={16} color="#FFF" />
            <AppText type="pretendard-b" style={styles.acceptText}>
              맞아요
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.decidedRow}>
          <DecisionBadge decision={decided} />
          <Pressable
            onPress={onCorrect}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <AppText type="pretendard-b" style={styles.changeText}>
              변경
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function AmountField({
  label,
  value,
  onChange,
  editable,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
}) {
  return (
    <View style={styles.amountField}>
      <AppText type="pretendard-r" style={styles.amountFieldLabel}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        keyboardType="number-pad"
        maxLength={4}
        style={[
          styles.amountInput,
          !editable && { backgroundColor: "#F4F2EA", color: "#888" },
        ]}
      />
    </View>
  );
}

function DecisionBadge({ decision }: { decision: CaregiverDecision }) {
  const meta = (() => {
    if (decision === "ACCEPTED")
      return { color: "#5BC4AE", bg: "#D6F1EA", label: "확인 완료" };
    if (decision === "MANUALLY_CORRECTED")
      return { color: "#F8B835", bg: "#FFF1C8", label: "다른 약으로 변경" };
    return { color: "#E14B4B", bg: "#FCEBEB", label: "제외됨" };
  })();
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <AppText
        type="pretendard-b"
        style={[styles.badgeText, { color: meta.color }]}
      >
        {meta.label}
      </AppText>
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

  /* 진행률 */
  progressRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  progressText: {
    fontSize: 13,
    color: "#444",
  },
  progressNum: {
    fontSize: 14,
    color: "#5BC4AE",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F0EDE0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#5BC4AE",
  },

  /* 리스트 */
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    gap: 12,
  },
  cardAccepted: {
    borderColor: "#BDEFEA",
    backgroundColor: "#F4FBF9",
  },
  cardCorrected: {
    borderColor: "#FFE9A8",
    backgroundColor: "#FFFAE5",
  },
  cardRejected: {
    borderColor: "#F4C7C7",
    backgroundColor: "#FCF3F3",
    opacity: 0.85,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pillIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF1C8",
    justifyContent: "center",
    alignItems: "center",
  },
  cardName: {
    fontSize: 16,
    color: "#222",
  },
  cardMeta: {
    fontSize: 13,
    color: "#666",
  },
  cardMatch: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },

  /* 잔여분 입력 */
  amountBox: {
    gap: 6,
  },
  amountTitle: {
    fontSize: 12,
    color: "#444",
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
  amountFieldLabel: {
    fontSize: 12,
    color: "#666",
  },
  amountInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: "Pretendard-Bold",
    color: "#222",
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#F1ECDB",
    borderRadius: 8,
    textAlign: "center",
  },
  amountSlash: {
    fontSize: 16,
    color: "#999",
  },
  amountUnit: {
    fontSize: 12,
    color: "#666",
    marginLeft: -2,
  },

  /* 슬롯 선택 */
  slotPickerBox: {
    gap: 8,
  },
  slotPickerTitle: {
    fontSize: 12,
    color: "#444",
  },
  slotPickerHint: {
    fontSize: 11,
    color: "#888",
  },
  slotRow: {
    flexDirection: "row",
    gap: 6,
  },
  slotBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    backgroundColor: "#FAFAF6",
  },
  slotBtnText: {
    fontSize: 12,
    color: "#888",
  },
  suggestDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFD24D",
    marginLeft: 2,
  },

  actionRow: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  rejectBtn: {
    borderColor: "#F4C7C7",
    backgroundColor: "#FFF",
  },
  rejectText: {
    fontSize: 13,
    color: "#E14B4B",
  },
  correctBtn: {
    borderColor: "#FFE9A8",
    backgroundColor: "#FFF",
  },
  correctText: {
    fontSize: 13,
    color: "#F8B835",
  },
  acceptBtn: {
    borderColor: "#5BC4AE",
    backgroundColor: "#5BC4AE",
  },
  acceptText: {
    fontSize: 13,
    color: "#FFF",
  },

  decidedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
  },
  changeText: {
    fontSize: 13,
    color: "#5BC4AE",
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#BDEFEA",
    backgroundColor: "#FFF",
    marginTop: 4,
  },
  addBtnText: {
    fontSize: 14,
    color: "#5BC4AE",
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1ECDB",
  },
  confirmBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFD24D",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#F0EDE0",
  },
  confirmBtnText: {
    fontSize: 17,
    color: "#222",
  },
});
