import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import {
  CaregiverDecision,
  confirmPrescription,
  decideCandidate,
  getPrescription,
  PrescriptionCandidate,
  PrescriptionDetail,
} from "@/services/prescriptions";
import { parseExtractedSchedule } from "@/services/schedule-parser";
import { createSchedule } from "@/services/schedules";
import { getMealTimes, slotToTime } from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrescriptionReviewScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const prescriptionId = id ? Number(id) : null;

  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyCandidateId, setBusyCandidateId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      await decideCandidate(
        prescriptionId,
        candidateId,
        decision,
        chosenItemSeq,
      );
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
        message: "아직 결정하지 않은 약이 있어요.\n모두 확인 후 다시 시도해주세요.",
        confirmText: "확인",
        cancelText: "닫기",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await confirmPrescription(prescriptionId);
      const summary = await autoCreateSchedules(result.candidates);

      const messageLines: string[] = [];
      if (summary.scheduledMedicines > 0) {
        messageLines.push(
          `${summary.scheduledMedicines}개 약의 복약 시간이 자동으로 설정됐어요.`,
        );
      }
      if (summary.pendingMedicines > 0) {
        messageLines.push(
          `${summary.pendingMedicines}개 약은 시간을 직접 설정해주세요.`,
        );
      }
      if (messageLines.length === 0) {
        messageLines.push("처방전 확정이 완료됐어요.");
      }

      await confirm({
        title: "확정 완료",
        message: messageLines.join("\n"),
        confirmText: "확인",
        cancelText: "닫기",
      });

      router.replace("/(tabs)" as any);
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

interface AutoScheduleSummary {
  scheduledMedicines: number;
  pendingMedicines: number;
}

/**
 * confirm 후 candidates 보고 schedule 자동 등록.
 * - createdMedicineId가 있는 약(=ACCEPTED/MANUALLY_CORRECTED)만 처리
 * - extractedSchedule 파싱해서 슬롯 추출 → 사용자 식사 시간으로 변환
 * - 슬롯이 비면 "시간 미정" 카운트만 +1, 등록 X
 */
async function autoCreateSchedules(
  candidates: PrescriptionCandidate[],
): Promise<AutoScheduleSummary> {
  const meals = await getMealTimes();
  let scheduledMedicines = 0;
  let pendingMedicines = 0;

  for (const c of candidates) {
    if (!c.createdMedicineId) continue;

    const slots = parseExtractedSchedule(c.extractedSchedule);
    if (slots.length === 0) {
      pendingMedicines++;
      continue;
    }

    const dosage = c.extractedDosage?.trim() || "1정";
    let anySuccess = false;
    for (const slot of slots) {
      try {
        await createSchedule(c.createdMedicineId, {
          scheduledTime: slotToTime(slot, meals),
          dosage,
        });
        anySuccess = true;
      } catch (e) {
        console.log(
          `[auto-schedule] medicine=${c.createdMedicineId} slot=${slot} failed:`,
          e,
        );
      }
    }
    if (anySuccess) scheduledMedicines++;
    else pendingMedicines++;
  }

  return { scheduledMedicines, pendingMedicines };
}

function CandidateCard({
  candidate,
  busy,
  onAccept,
  onReject,
  onCorrect,
}: {
  candidate: PrescriptionCandidate;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCorrect: () => void;
}) {
  const decided = candidate.caregiverDecision;
  const display =
    candidate.matchedItemName ?? candidate.extractedName ?? "이름 미확인";

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
      <AppText type="pretendard-b" style={[styles.badgeText, { color: meta.color }]}>
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
