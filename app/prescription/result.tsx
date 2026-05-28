import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { getMe } from "@/services/auth";
import {
  discardPrescription,
  getPrescription,
  PrescriptionDetail,
} from "@/services/prescriptions";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrescriptionResultScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const prescriptionId = id ? Number(id) : null;

  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!prescriptionId) return;
    setLoading(true);
    try {
      const data = await getPrescription(prescriptionId);
      // OCR 추출 결과가 0개면 검토 불가 — 폐기 후 실패 화면으로
      if (data.candidates.length === 0) {
        try {
          await discardPrescription(prescriptionId);
        } catch (e) {
          console.log("[prescription/result] empty discard failed:", e);
        }
        router.replace("/prescription/failed");
        return;
      }
      setDetail(data);
    } catch {
      router.replace("/prescription/failed");
    } finally {
      setLoading(false);
    }
  }, [prescriptionId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConfirmCorrect = async () => {
    if (!prescriptionId) return;
    try {
      const me = await getMe();
      // 시니어 본인은 검증 권한이 없음 → 보호자 확인 대기 화면으로
      if (me.role !== "CAREGIVER") {
        router.replace("/prescription/pending-review" as any);
        return;
      }
    } catch {
      // /me 실패 시엔 일단 review로 시도 (CARE_004 떨어지면 그때 분기)
    }
    router.push({
      pathname: "/prescription/review" as any,
      params: { id: String(prescriptionId) },
    });
  };

  const handleReject = async () => {
    if (!prescriptionId) return;
    const ok = await confirm({
      title: "다시 찍을까요?",
      message: "이 처방전 결과는 폐기되고\n새로 사진을 찍어요.",
      confirmText: "다시 찍기",
      danger: true,
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await discardPrescription(prescriptionId);
      router.replace("/prescription/camera");
    } catch {
      setSubmitting(false);
    }
  };

  if (loading || !detail) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={["top", "left", "right", "bottom"]}
      >
        <PageHeader title="처방전 등록" />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FFD24D" />
          <AppText type="pretendard-m" style={styles.loadingText}>
            결과를 불러오는 중...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const detectedCount = detail.candidates.length;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="처방전 등록" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText type="pretendard-b" style={styles.title}>
              처방전 인식 결과
            </AppText>
            <View style={styles.subtitleRow}>
              <AppText type="pretendard-r" style={styles.subtitle}>
                처방전의 약이 총{" "}
              </AppText>
              <AppText type="extrabold" style={styles.countNum}>
                {detectedCount}개
              </AppText>
              <AppText type="pretendard-r" style={styles.subtitle}>
                !
              </AppText>
            </View>
            <AppText type="pretendard-r" style={styles.subtitle}>
              맞나요?
            </AppText>
          </View>
          <Image
            source={require("../../assets/images/character/Senior3.png")}
            style={styles.character}
            resizeMode="contain"
          />
        </View>

        <View style={styles.resultCard}>
          {detail.candidates.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-outline" size={32} color="#BBB" />
              <AppText type="pretendard-m" style={styles.emptyText}>
                추출된 약물이 없어요
              </AppText>
            </View>
          ) : (
            detail.candidates.map((c, idx) => (
              <View
                key={c.id}
                style={[
                  styles.candidateRow,
                  idx < detail.candidates.length - 1 && styles.candidateDivider,
                ]}
              >
                <View style={styles.candidateBullet}>
                  <AppText type="extrabold" style={styles.candidateNum}>
                    {idx + 1}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    type="pretendard-b"
                    style={styles.candidateName}
                    numberOfLines={1}
                  >
                    {c.matchedItemName ?? c.extractedName ?? "이름 미확인"}
                  </AppText>
                  {(c.extractedDosage || c.extractedSchedule) && (
                    <AppText
                      type="pretendard-m"
                      style={styles.candidateMeta}
                      numberOfLines={1}
                    >
                      {[c.extractedDosage, c.extractedSchedule]
                        .filter(Boolean)
                        .join(" · ")}
                    </AppText>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleReject}
          disabled={submitting}
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            pressed && styles.btnPressed,
          ]}
        >
          <AppText type="pretendard-b" style={styles.btnSecondaryText}>
            아니, 다시 찍을래
          </AppText>
        </Pressable>
        <Pressable
          onPress={handleConfirmCorrect}
          disabled={submitting}
          style={({ pressed }) => [
            styles.btn,
            styles.btnPrimary,
            pressed && styles.btnPressed,
          ]}
        >
          <AppText type="pretendard-b" style={styles.btnPrimaryText}>
            응, 맞아!
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FDFCF3",
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  content: {
    padding: 20,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 4,
  },
  title: {
    fontSize: 22,
    color: "#171717",
    marginBottom: 6,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  subtitle: {
    fontSize: 15,
    color: "#444",
  },
  countNum: {
    fontSize: 18,
    color: "#F88835",
  },
  character: {
    width: 84,
    height: 84,
    marginLeft: 8,
  },
  resultCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE8D6",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  candidateDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECDB",
  },
  candidateBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF1C8",
    justifyContent: "center",
    alignItems: "center",
  },
  candidateNum: {
    fontSize: 14,
    color: "#F8B835",
  },
  candidateName: {
    fontSize: 15,
    color: "#222",
  },
  candidateMeta: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnSecondary: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E5E0CE",
  },
  btnSecondaryText: {
    fontSize: 16,
    color: "#444",
  },
  btnPrimary: {
    backgroundColor: "#FFD24D",
  },
  btnPrimaryText: {
    fontSize: 17,
    color: "#222",
  },
});
