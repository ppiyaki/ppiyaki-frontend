import AppText from "@/components/app-text";
import SeniorSummaryHeader from "@/components/senior-summary-header";
import { getMe } from "@/services/auth";
import { LinkedSenior, resolveLinkedSenior } from "@/services/caregivers";
import { listMedicines, Medicine } from "@/services/medicines";
import { listPrescriptions } from "@/services/prescriptions";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type DoseStatus = "done" | "upcoming";

interface Dose {
  time: string;
  label: string;
  meds: string;
  status: DoseStatus;
}

const SENIOR_IMAGES: ImageSourcePropType[] = [
  require("../../assets/images/pf/pfimg2.png"),
  require("../../assets/images/pf/pfimg3.png"),
  require("../../assets/images/pf/pfimg4.png"),
  require("../../assets/images/pf/pfimg5.png"),
  require("../../assets/images/pf/pfimg6.png"),
];

function getSeniorImage(id: number): ImageSourcePropType {
  return SENIOR_IMAGES[id % SENIOR_IMAGES.length];
}

const FALLBACK_SENIOR_IMAGE = SENIOR_IMAGES[0];

const DOSES: Dose[] = [
  {
    time: "09:00",
    label: "아침",
    meds: "혈압약, 당뇨약, ...",
    status: "done",
  },
  {
    time: "14:00",
    label: "점심",
    meds: "당뇨약",
    status: "done",
  },
  {
    time: "19:00",
    label: "저녁",
    meds: "혈압약, 당뇨약, ...",
    status: "upcoming",
  },
];

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function FamilyHomeScreen() {
  const router = useRouter();
  const completed = DOSES.filter((d) => d.status === "done").length;

  const [pendingCount, setPendingCount] = useState(0);
  const [senior, setSenior] = useState<LinkedSenior | null>(null);
  const [caregiverName, setCaregiverName] = useState("보호자");
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  // 더미 streak (logs 기반 계산은 추후 작업)
  const streakDays = 6;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      // 1) 본인 정보 (보호자 이름)
      (async () => {
        try {
          const me = await getMe();
          if (!cancelled) setCaregiverName(me.nickname);
        } catch {
          // 무시
        }
      })();

      // 2) 연결된 시니어 → 약물 + 검토 대기 처방전 (v0.9.2: seniorId 쿼리 필수)
      // resolveLinkedSenior: listLinkedSeniors 실패 시 dev 폴백 사용
      (async () => {
        try {
          const first = await resolveLinkedSenior();
          if (cancelled) return;
          setSenior(first);
          if (first) {
            try {
              const meds = await listMedicines(first.id);
              if (!cancelled) setMedicines(meds.responses);
            } catch {
              if (!cancelled) setMedicines([]);
            }
            try {
              const pres = await listPrescriptions("PENDING_REVIEW", first.id);
              if (!cancelled) setPendingCount(pres.responses.length);
            } catch {
              if (!cancelled) setPendingCount(0);
            }
          } else {
            // 시니어 미연동 → 본인 처방전 (시니어 본인 케이스 대비)
            try {
              const pres = await listPrescriptions("PENDING_REVIEW");
              if (!cancelled) setPendingCount(pres.responses.length);
            } catch {
              if (!cancelled) setPendingCount(0);
            }
          }
        } catch (e) {
          console.log("[family-home] listLinkedSeniors failed:", e);
          if (!cancelled) {
            setSenior(null);
            setMedicines([]);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const seniorName = senior?.nickname ?? "어르신";
  const seniorImage = senior
    ? getSeniorImage(senior.id)
    : FALLBACK_SENIOR_IMAGE;
  const minRemaining =
    medicines.length > 0
      ? Math.min(...medicines.map((m) => m.remainingAmount))
      : 0;
  const firstMedicine = medicines[0] ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 시니어 요약 카드 */}
        <SeniorSummaryHeader
          name={seniorName}
          caregiver={caregiverName}
          daysLeft={minRemaining}
          image={seniorImage}
        />

        {/* 검토 대기 처방전 카드 */}
        {pendingCount > 0 && (
          <Pressable
            onPress={() => router.push("/family/prescriptions" as any)}
            style={({ pressed }) => [
              styles.pendingCard,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.pendingIcon}>
              <Ionicons name="alert-circle" size={22} color="#F8B835" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText type="pretendard-b" style={styles.pendingTitle}>
                검토 대기 처방전 {pendingCount}건
              </AppText>
              <AppText type="pretendard-m" style={styles.pendingDesc}>
                시니어가 등록한 처방전을 확인해주세요
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F8B835" />
          </Pressable>
        )}

        {/* 오늘 복약 여정 */}
        <View style={styles.journeyCard}>
          <AppText type="pretendard-b" style={styles.journeyTitle}>
            {seniorName} 님의{"\n"}오늘 복약 여정
          </AppText>

          <View style={styles.timeline}>
            {DOSES.map((dose, idx) => (
              <DoseRow
                key={dose.time}
                dose={dose}
                isLast={idx === DOSES.length - 1}
              />
            ))}
          </View>

          <View style={styles.journeyFooter}>
            <AppText type="pretendard-b" style={styles.journeySummary}>
              총{" "}
              <AppText type="extrabold" style={{ color: "#4799E0" }}>
                {DOSES.length}
              </AppText>
              회 중{" "}
              <AppText type="extrabold" style={{ color: "#5BC4AE" }}>
                {completed}
              </AppText>
              회 완료
            </AppText>
            <Image
              source={require("../../assets/images/character/Senior3.png")}
              style={styles.journeyChar}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* 연속 복약 카드 */}
        <View style={styles.streakCard}>
          <View style={styles.streakHead}>
            <View style={styles.fireCircle}>
              <Ionicons name="flame" size={24} color="#5BC4AE" />
            </View>
            <AppText type="pretendard-b" style={styles.streakText}>
              현재{" "}
              <AppText type="extrabold" style={{ color: "#5BC4AE" }}>
                {streakDays}일
              </AppText>{" "}
              연속 복약 성공!
            </AppText>
          </View>

          <View style={styles.weekRow}>
            {WEEK_DAYS.map((day, idx) => (
              <View key={day} style={styles.weekItem}>
                <AppText type="pretendard-m" style={styles.weekLabel}>
                  {day}
                </AppText>
                <View
                  style={[
                    styles.weekDot,
                    idx < streakDays ? styles.weekDotOn : styles.weekDotOff,
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.challengeRow}>
            <Ionicons name="heart" size={14} color="#5BC4AE" />
            <AppText type="pretendard-m" style={styles.challengeText}>
              7일 연속 복약 도전 중!
            </AppText>
          </View>
        </View>

        {/* 현재 복용 중인 약 */}
        <View style={styles.medSection}>
          <View style={styles.medHead}>
            <View style={styles.medIconCircle}>
              <MaterialCommunityIcons name="pill" size={20} color="#F8B835" />
            </View>
            <AppText type="pretendard-b" style={styles.medTitle}>
              현재 복용 중인 약
            </AppText>
          </View>

          {firstMedicine ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/medication-detail" as any,
                  params: { id: String(firstMedicine.id) },
                })
              }
              style={({ pressed }) => [
                styles.medCard,
                pressed && { backgroundColor: "#FBF7EC" },
              ]}
            >
              <View style={styles.medThumb}>
                <MaterialCommunityIcons name="pill" size={26} color="#F8B835" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText
                  type="pretendard-b"
                  style={styles.medName}
                  numberOfLines={1}
                >
                  {firstMedicine.name}
                </AppText>
                <AppText type="pretendard-m" style={styles.medRemaining}>
                  잔여 {firstMedicine.remainingAmount}일분
                  {medicines.length > 1
                    ? ` · 외 ${medicines.length - 1}종`
                    : ""}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BBB" />
            </Pressable>
          ) : (
            <View style={styles.medEmpty}>
              <AppText type="pretendard-m" style={styles.medEmptyText}>
                등록된 약이 없어요
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DoseRow({ dose, isLast }: { dose: Dose; isLast: boolean }) {
  const done = dose.status === "done";
  return (
    <View style={styles.doseRow}>
      <AppText type="pretendard-m" style={styles.doseTime}>
        {dose.time}
      </AppText>
      <View style={styles.doseMarker}>
        <View
          style={[
            styles.doseDot,
            done ? styles.doseDotDone : styles.doseDotPending,
          ]}
        >
          {done && <Ionicons name="checkmark" size={18} color="#FFF" />}
        </View>
        {!isLast && (
          <View style={[styles.doseLine, done ? styles.doseLineDone : null]} />
        )}
      </View>
      <View style={styles.doseBody}>
        <AppText type="pretendard-b" style={styles.doseLabel}>
          {dose.label}{" "}
          <AppText type="pretendard-m" style={styles.doseMeds}>
            ({dose.meds})
          </AppText>
        </AppText>
        <AppText
          type="pretendard-m"
          style={[
            styles.doseStatus,
            done ? styles.doseStatusDone : styles.doseStatusPending,
          ]}
        >
          {done ? "완료" : "예정"}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },

  /* 검토 대기 카드 */
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF8E0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FFE9A8",
  },
  pendingIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  pendingTitle: {
    fontSize: 15,
    color: "#5A4500",
    marginBottom: 2,
  },
  pendingDesc: {
    fontSize: 12,
    color: "#7A5C00",
  },

  /* ── 오늘 복약 여정 ── */
  journeyCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  journeyTitle: {
    fontSize: 20,
    color: "#222",
    textAlign: "center",
    lineHeight: 28,
  },
  timeline: {
    paddingHorizontal: 6,
  },
  doseRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  doseTime: {
    fontSize: 13,
    color: "#444",
    width: 50,
    paddingTop: 4,
  },
  doseMarker: {
    alignItems: "center",
    width: 28,
  },
  doseDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  doseDotDone: {
    backgroundColor: "#5BC4AE",
  },
  doseDotPending: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#D5D5D5",
  },
  doseLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#D5D5D5",
    marginTop: 2,
    marginBottom: 2,
  },
  doseLineDone: {
    backgroundColor: "#5BC4AE",
  },
  doseBody: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 16,
  },
  doseLabel: {
    fontSize: 15,
    color: "#222",
  },
  doseMeds: {
    fontSize: 14,
    color: "#666",
  },
  doseStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  doseStatusDone: {
    color: "#5BC4AE",
  },
  doseStatusPending: {
    color: "#F8B835",
  },
  journeyFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1ECDB",
    paddingTop: 12,
  },
  journeySummary: {
    fontSize: 16,
    color: "#222",
    flex: 1,
    textAlign: "center",
  },
  journeyChar: {
    width: 56,
    height: 56,
    position: "absolute",
    right: 0,
    bottom: -8,
  },

  /* ── 연속 복약 ── */
  streakCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  streakHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fireCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D6F1EA",
    justifyContent: "center",
    alignItems: "center",
  },
  streakText: {
    flex: 1,
    fontSize: 16,
    color: "#222",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  weekItem: {
    alignItems: "center",
    gap: 8,
  },
  weekLabel: {
    fontSize: 13,
    color: "#444",
  },
  weekDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  weekDotOn: {
    backgroundColor: "#5BC4AE",
  },
  weekDotOff: {
    borderWidth: 1.5,
    borderColor: "#D6F1EA",
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  challengeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  challengeText: {
    fontSize: 13,
    color: "#a9a9a9",
  },

  /* ── 현재 복용 중인 약 ── */
  medSection: {
    gap: 10,
  },
  medHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  medIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF1C8",
    justifyContent: "center",
    alignItems: "center",
  },
  medTitle: {
    fontSize: 17,
    color: "#222",
  },
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FBF7EC",
    justifyContent: "center",
    alignItems: "center",
  },
  medName: {
    fontSize: 14,
    color: "#444",
  },
  medRemaining: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  medEmpty: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingVertical: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  medEmptyText: {
    fontSize: 13,
    color: "#888",
  },
});
