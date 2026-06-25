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
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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

/** v0.9.8: candidate별 잔여분/총량 (단위: 정/캡슐 등). */
interface AmountState {
  total: string;
  remaining: string;
}
type AmountMap = Record<number, AmountState>;
/** 파싱 실패·정보 부족 시 사용할 안전 디폴트 */
const DEFAULT_AMOUNT = "30";

/** extractedSchedule 에서 "1일 N회" 의 N(하루 빈도) 만 추출. 못 잡으면 null. */
function parseFrequencyPerDay(schedule: string | undefined): number | null {
  if (!schedule) return null;
  const m = schedule.match(/(\d+)\s*회/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** extractedSchedule 에서 "N일분" 의 N(처방 일수) 만 추출. 못 잡으면 null. */
function parseDaysSupply(schedule: string | undefined): number | null {
  if (!schedule) return null;
  // "1일 2회 7일분" 의 "1일" 과 혼동 방지 — "일분" 패턴 우선
  const m = schedule.match(/(\d+)\s*일\s*분/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * OCR 추출 정보로 총량 추론.
 * 예: extractedSchedule="1일 2회 7일분" + extractedDosage="1정" → 2 × 7 × 1 = 14
 * 패턴 못 잡거나 0/NaN 이면 DEFAULT_AMOUNT(30) 폴백.
 */
function inferTotalAmount(
  schedule: string | undefined,
  dosage: string | undefined,
): string {
  const freq = parseFrequencyPerDay(schedule);
  const days = parseDaysSupply(schedule);
  if (freq == null || days == null) return DEFAULT_AMOUNT;
  const doseMatch = dosage?.match(/(\d+(?:\.\d+)?)/);
  const dose = doseMatch ? parseFloat(doseMatch[1]) : 1;
  const total = Math.round(freq * days * dose);
  if (!Number.isFinite(total) || total <= 0) return DEFAULT_AMOUNT;
  return String(total);
}

/**
 * 하루 빈도로 추천 슬롯 도출 (의학적 관례 따름).
 * 백엔드 LLM 이 거의 항상 전 끼니로 추천해서 의미가 없어 프론트에서 override.
 *  - 1회: 아침
 *  - 2회: 아침/저녁
 *  - 3회 이상: 아침/점심/저녁
 */
function inferSuggestedSlots(
  schedule: string | undefined,
  fallback: ServerMealSlot[] | undefined,
): ServerMealSlot[] {
  const freq = parseFrequencyPerDay(schedule);
  if (freq == null) return fallback ?? [];
  if (freq <= 1) return ["BREAKFAST"];
  if (freq === 2) return ["BREAKFAST", "DINNER"];
  return ["BREAKFAST", "LUNCH", "DINNER"];
}

export default function PrescriptionReviewScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { id, correctedCandidateId, chosenItemSeq, chosenItemName } =
    useLocalSearchParams<{
      id?: string;
      correctedCandidateId?: string;
      chosenItemSeq?: string;
      chosenItemName?: string;
    }>();
  const prescriptionId = id ? Number(id) : null;

  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyCandidateId, setBusyCandidateId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slotMap, setSlotMap] = useState<SlotMap>({});
  const [amountMap, setAmountMap] = useState<AmountMap>({});
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [draftCorrections, setDraftCorrections] = useState<
    Record<number, { itemSeq: string; itemName: string }>
  >({});
  /** candidate별 dosage 입력값 (OCR 누락분 보강용) */
  const [dosageMap, setDosageMap] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    if (!prescriptionId) return;
    setLoading(true);
    try {
      const data = await getPrescription(prescriptionId);
      if (__DEV__) {
        console.log("[prescription] detail received:", {
          id: data.id,
          status: data.status,
          maskedImageUrl: data.maskedImageUrl,
          hasMaskedImageUrl: typeof data.maskedImageUrl === "string",
          candidatesCount: data.candidates.length,
        });
      }
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

  // detail 로드 후 candidate 별 초기 슬롯
  //  - 보호자가 이미 confirm 한 적 있으면 그걸로
  //  - 아니면 extractedSchedule 의 "N회" 로 추론한 슬롯 (백엔드의 전 끼니 기본값보다 정확)
  useEffect(() => {
    if (!detail) return;
    setSlotMap((prev) => {
      const next: SlotMap = { ...prev };
      for (const c of detail.candidates) {
        if (next[c.id]) continue; // 사용자가 이미 만진 candidate는 보존
        const seed: ServerMealSlot[] =
          c.confirmedMealSlots ??
          inferSuggestedSlots(c.extractedSchedule, c.suggestedMealSlots);
        next[c.id] = new Set(seed.map(fromServerSlot));
      }
      return next;
    });
    // candidate별 초기 잔여분 = OCR 추출 정보로 추론 (예: "1일 2회 7일분" + "1정" → 14)
    setAmountMap((prev) => {
      const next: AmountMap = { ...prev };
      for (const c of detail.candidates) {
        if (next[c.id]) continue;
        const inferred = inferTotalAmount(
          c.extractedSchedule,
          c.extractedDosage,
        );
        next[c.id] = { total: inferred, remaining: inferred };
      }
      return next;
    });
    // v0.9.12: candidate별 초기 dosage = OCR 추출값 (없으면 빈 문자열)
    setDosageMap((prev) => {
      const next: Record<number, string> = { ...prev };
      for (const c of detail.candidates) {
        if (next[c.id] !== undefined) continue;
        next[c.id] = c.extractedDosage ?? "";
      }
      return next;
    });
  }, [detail]);

  useEffect(() => {
    const candidateId = correctedCandidateId
      ? Number(correctedCandidateId)
      : null;
    const seq = Array.isArray(chosenItemSeq) ? chosenItemSeq[0] : chosenItemSeq;
    const name = Array.isArray(chosenItemName)
      ? chosenItemName[0]
      : chosenItemName;
    if (!candidateId || !seq || !name) return;
    setDraftCorrections((prev) => ({
      ...prev,
      [candidateId]: { itemSeq: seq, itemName: name },
    }));
  }, [correctedCandidateId, chosenItemName, chosenItemSeq]);

  // EXACT 매칭이라도 자동 ACCEPT 하지 않는다.
  // 백엔드가 제안한 suggestedMealSlots 가 "전 끼니" 인 경우가 많은데, 시니어가 점심만
  // 드시는 식이면 그대로 등록되어 잘못된 schedule 이 생성됨. 보호자가 시간대를 확인
  // 후 직접 수락하도록 한다 (slot/ dosage 는 이미 effect 에서 pre-fill 됨 → 보통 1탭).

  const updateDosage = (candidateId: number, value: string) => {
    setDosageMap((prev) => ({ ...prev, [candidateId]: value }));
  };

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
      });
      return;
    }
    if (e instanceof ApiError && e.code === "USER_002") {
      await confirm({
        title: "복약 시간이 필요해요",
        message:
          "선택한 복약 시간(아침/점심/저녁)이 시니어 프로필에 설정되어 있지 않아요.\n복약 시간은 시니어가 처음으로 로그인할때 자동으로 설정돼요",
        confirmText: "확인",
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
    });
  };

  const handleDecide = async (
    candidateId: number,
    decision: Exclude<CaregiverDecision, "PENDING">,
    chosenItemSeq?: string,
  ) => {
    if (!prescriptionId) return;
    // ACCEPTED 시 슬롯 1개 이상 선택 필수 (회색 버튼이지만 탭은 가능 → 여기서 가드)
    if (decision !== "REJECTED" && (slotMap[candidateId]?.size ?? 0) === 0) {
      await confirm({
        title: "복약 시간대를 선택해주세요",
        message:
          "이 약을 언제 드시는지 (아침/점심/저녁)\n하나 이상 골라주세요.",
        confirmText: "확인",
      });
      return;
    }
    setBusyCandidateId(candidateId);
    try {
      // ACCEPTED/MANUALLY_CORRECTED일 때만 confirmedMealSlots / dosage 함께 전송
      const confirmedMealSlots =
        decision === "REJECTED"
          ? undefined
          : Array.from(slotMap[candidateId] ?? []).map(toServerSlot);
      const dosageInput = dosageMap[candidateId]?.trim();
      const dosage =
        decision === "REJECTED" || !dosageInput ? undefined : dosageInput;
      if (__DEV__) {
        console.log("[prescription] decide candidate:", {
          candidateId,
          decision,
          slotMapRaw: Array.from(slotMap[candidateId] ?? []),
          confirmedMealSlots,
          dosage,
        });
      }
      await decideCandidate(prescriptionId, candidateId, decision, {
        chosenItemSeq,
        confirmedMealSlots,
        dosage,
      });
      // 전체 재조회 대신 해당 candidate 의 decision 만 로컬 패치 — 슬롯/잔여분/dosage 입력 유지
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              candidates: prev.candidates.map((c) =>
                c.id === candidateId
                  ? {
                      ...c,
                      caregiverDecision: decision,
                      ...(chosenItemSeq
                        ? { caregiverChosenItemSeq: chosenItemSeq }
                        : {}),
                      ...(confirmedMealSlots ? { confirmedMealSlots } : {}),
                      ...(dosage ? { extractedDosage: dosage } : {}),
                    }
                  : c,
              ),
            }
          : prev,
      );
      if (decision === "MANUALLY_CORRECTED") {
        setDraftCorrections((prev) => {
          const next = { ...prev };
          delete next[candidateId];
          return next;
        });
      }
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
      if (__DEV__) {
        console.log(
          "[prescription] confirm result candidates:",
          result.candidates.map((c) => ({
            id: c.id,
            decision: c.caregiverDecision,
            createdMedicineId: c.createdMedicineId,
            confirmedMealSlots: c.confirmedMealSlots,
          })),
        );
      }
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
        {detail.maskedImageUrl && (
          <View style={styles.imageCard}>
            <AppText type="pretendard-b" style={styles.imageCardTitle}>
              처방전 원본
            </AppText>
            <Pressable
              onPress={() => setImageViewerOpen(true)}
              style={({ pressed }) => [
                styles.prescriptionImageButton,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Image
                source={{ uri: detail.maskedImageUrl }}
                style={styles.prescriptionImage}
                resizeMode="contain"
                onLoadStart={() =>
                  console.log(
                    "[prescription] image load start:",
                    detail.maskedImageUrl,
                  )
                }
                onLoad={() => console.log("[prescription] image loaded OK")}
                onError={(e) =>
                  console.log(
                    "[prescription] image load FAILED:",
                    e.nativeEvent,
                    "url:",
                    detail.maskedImageUrl,
                  )
                }
              />
              <View style={styles.zoomBadge}>
                <Ionicons name="search" size={14} color="#FFF" />
                <AppText type="pretendard-b" style={styles.zoomBadgeText}>
                  크게 보기
                </AppText>
              </View>
            </Pressable>
            <AppText type="pretendard-m" style={styles.imageCardHint}>
              개인정보는 자동 마스킹되어 있어요
            </AppText>
          </View>
        )}

        {detail.candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            draftCorrection={draftCorrections[c.id]}
            busy={busyCandidateId === c.id}
            selectedSlots={slotMap[c.id] ?? new Set()}
            amount={
              amountMap[c.id] ?? {
                total: DEFAULT_AMOUNT,
                remaining: DEFAULT_AMOUNT,
              }
            }
            dosage={dosageMap[c.id] ?? c.extractedDosage ?? ""}
            onToggleSlot={(slot) => toggleSlot(c.id, slot)}
            onChangeAmount={(field, value) => updateAmount(c.id, field, value)}
            onChangeDosage={(value) => updateDosage(c.id, value)}
            onAccept={() => {
              const draft = draftCorrections[c.id];
              return draft
                ? handleDecide(c.id, "MANUALLY_CORRECTED", draft.itemSeq)
                : handleDecide(c.id, "ACCEPTED");
            }}
            onReject={() => handleDecide(c.id, "REJECTED")}
            onCorrect={() => handleManualCorrect(c.id)}
          />
        ))}

        <Pressable
          onPress={handleAddManual}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
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

      <Modal
        visible={imageViewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerOpen(false)}
      >
        {/* RN Modal 은 앱 루트 GestureHandlerRootView 바깥의 별도 네이티브 윈도우에
            렌더되므로, 모달 안에서 gesture-handler 제스처가 동작하려면 자체
            GestureHandlerRootView 로 감싸야 한다 (안드로이드에서 핀치/팬 먹통 방지). */}
        <GestureHandlerRootView style={styles.imageViewer}>
          <Pressable
            onPress={() => setImageViewerOpen(false)}
            style={({ pressed }) => [
              styles.imageViewerClose,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </Pressable>
          {detail.maskedImageUrl && (
            <View style={styles.imageViewerContent}>
              <ZoomablePrescriptionImage uri={detail.maskedImageUrl} />
            </View>
          )}
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
}

function ZoomablePrescriptionImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(nextScale, 1), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.02) reset();
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      translateX.value = savedX.value + event.translationX;
      translateY.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.02) {
        reset();
        return;
      }
      scale.value = withTiming(2);
      savedScale.value = 2;
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.Image
        source={{ uri }}
        style={[styles.imageViewerImage, animatedStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
}

function CandidateCard({
  candidate,
  draftCorrection,
  busy,
  selectedSlots,
  amount,
  dosage,
  onToggleSlot,
  onChangeAmount,
  onChangeDosage,
  onAccept,
  onReject,
  onCorrect,
}: {
  candidate: PrescriptionCandidate;
  draftCorrection?: { itemSeq: string; itemName: string };
  busy: boolean;
  selectedSlots: Set<MealSlot>;
  amount: AmountState;
  dosage: string;
  onToggleSlot: (slot: MealSlot) => void;
  onChangeAmount: (field: keyof AmountState, value: string) => void;
  onChangeDosage: (value: string) => void;
  onAccept: () => void;
  onReject: () => void;
  onCorrect: () => void;
}) {
  const decided = candidate.caregiverDecision;
  const display =
    draftCorrection?.itemName ??
    candidate.matchedItemName ??
    candidate.extractedName ??
    "이름 미확인";
  const notRejected = decided !== "REJECTED";

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
              {draftCorrection ? "다른 약 선택됨" : `매칭: ${candidate.matchType}`}
              {!draftCorrection && candidate.matchReason
                ? ` (${candidate.matchReason})`
                : ""}
            </AppText>
          )}
          {draftCorrection && !candidate.matchType && (
            <AppText type="pretendard-r" style={styles.cardMatch}>
              다른 약 선택됨
            </AppText>
          )}
        </View>
      </View>

      {notRejected && (
        <View style={styles.amountBox}>
          <AppText type="pretendard-b" style={styles.amountTitle}>
            1회 복용량
            {!candidate.extractedDosage && (
              <AppText type="pretendard-r" style={styles.dosageHint}>
                {"  "}OCR 미인식 — 직접 입력해주세요
              </AppText>
            )}
          </AppText>
          <View style={styles.dosageRow}>
            <TextInput
              value={dosage}
              onChangeText={onChangeDosage}
              editable={decided === "PENDING"}
              placeholder="예: 1정, 1캡슐, 10ml"
              placeholderTextColor="#BBB"
              maxLength={20}
              allowFontScaling={false}
              style={[
                styles.dosageInput,
                decided !== "PENDING" && {
                  backgroundColor: "#F4F2EA",
                  color: "#888",
                },
                !candidate.extractedDosage &&
                  !dosage.trim() && { borderColor: "#E14B4B" },
              ]}
            />
          </View>
        </View>
      )}

      {notRejected && (
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

      {notRejected && (() => {
        // 백엔드의 suggestedMealSlots 가 거의 항상 전 끼니 라서 의미가 없음 →
        // extractedSchedule 의 빈도(N회) 로 의학적 관례 따라 다시 추론한 슬롯을 표시.
        const aiSuggested = inferSuggestedSlots(
          candidate.extractedSchedule,
          candidate.suggestedMealSlots,
        );
        return (
        <View style={styles.slotPickerBox}>
          <AppText type="pretendard-b" style={styles.slotPickerTitle}>
            복용 시간대 선택
            {aiSuggested.length > 0 && (
              <AppText type="pretendard-r" style={styles.slotPickerHint}>
                {"  "}AI 추천 표시됨
              </AppText>
            )}
          </AppText>
          <View style={styles.slotRow}>
            {SLOT_ORDER.map((slot) => {
              const on = selectedSlots.has(slot);
              const suggested = aiSuggested.includes(toServerSlot(slot));
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
                  {suggested && !on && <View style={styles.suggestDot} />}
                </Pressable>
              );
            })}
          </View>
        </View>
        );
      })()}

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
              (busy || selectedSlots.size === 0) && styles.acceptBtnDisabled,
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
        allowFontScaling={false}
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
  imageCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    gap: 10,
    alignItems: "center",
  },
  imageCardTitle: {
    fontSize: 15,
    color: "#222",
    alignSelf: "flex-start",
  },
  prescriptionImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#F4F2EA",
  },
  prescriptionImageButton: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: "#F4F2EA",
    overflow: "hidden",
  },
  zoomBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  zoomBadgeText: {
    fontSize: 12,
    color: "#FFF",
  },
  imageViewer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  imageViewerClose: {
    position: "absolute",
    top: 54,
    right: 18,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerScroll: {
    flex: 1,
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 96,
  },
  imageViewerImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#F4F2EA",
  },
  imageCardHint: {
    fontSize: 12,
    color: "#888",
    alignSelf: "flex-start",
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
  dosageHint: {
    fontSize: 11,
    color: "#E14B4B",
  },
  dosageRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dosageInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Pretendard-Medium",
    color: "#222",
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#F1ECDB",
    borderRadius: 8,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  amountInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Pretendard-Bold",
    color: "#222",
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#F1ECDB",
    borderRadius: 8,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
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
  acceptBtnDisabled: {
    borderColor: "#D8D5C5",
    backgroundColor: "#D8D5C5",
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
