import AppText from "@/components/app-text";
import SeniorSummaryHeader from "@/components/senior-summary-header";
import { useExitOnBack } from "@/hooks/use-exit-on-back";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getMe } from "@/services/auth";
import { LinkedSenior, listLinkedSeniors } from "@/services/caregivers";
import {
  DailyDashboard,
  DailySlot,
  WeeklyDashboard,
  getDashboardDaily,
  getDashboardWeekly,
} from "@/services/dashboard";
import { listMedicines, Medicine } from "@/services/medicines";
import { listPrescriptions } from "@/services/prescriptions";
import { ServerMealSlot } from "@/services/user-settings";
import { resolveProfileImage } from "@/utils/profile-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type DoseStatus = "done" | "upcoming" | "missed";

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

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const SLOT_LABEL: Record<ServerMealSlot, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
};

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekStart(today: Date): string {
  const d = new Date(today);
  d.setDate(d.getDate() - d.getDay()); // 일요일로
  return toIsoDate(d);
}

function trimMealTime(hms: string | null | undefined): string {
  if (!hms) return "—";
  return hms.slice(0, 5); // "HH:mm:ss" → "HH:mm"
}

function mapDailySlotToDose(slot: DailySlot): Dose {
  const meds =
    slot.medicines.length === 0
      ? "복약 없음"
      : slot.medicines
          .map((m) => m.name)
          .slice(0, 2)
          .join(", ") +
        (slot.medicines.length > 2 ? ` 외 ${slot.medicines.length - 2}개` : "");
  let status: DoseStatus;
  if (slot.status === "PERFECT" || slot.status === "DELAYED") status = "done";
  else if (slot.status === "MISSED") status = "missed";
  else status = "upcoming"; // PENDING, NOT_SCHEDULED
  return {
    time: trimMealTime(slot.mealTime),
    label: SLOT_LABEL[slot.slot],
    meds,
    status,
  };
}

/** 오늘 기준 weekly.days 에서 뒤에서부터 연속 PERFECT 일수 카운트 */
function calcStreakFromWeekly(weekly: WeeklyDashboard): number {
  let count = 0;
  for (let i = weekly.days.length - 1; i >= 0; i--) {
    const d = weekly.days[i];
    if (d.dayStatus === "FUTURE") continue;
    if (d.dayStatus === "PERFECT") count += 1;
    else break;
  }
  return count;
}

export default function FamilyHomeScreen() {
  const router = useRouter();
  useRequireAuth();
  useExitOnBack();

  const [pendingCount, setPendingCount] = useState(0);
  const [seniors, setSeniors] = useState<LinkedSenior[]>([]);
  const [selectedSeniorId, setSelectedSeniorId] = useState<number | null>(null);
  const [caregiverName, setCaregiverName] = useState("보호자");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [daily, setDaily] = useState<DailyDashboard | null>(null);
  const [weekly, setWeekly] = useState<WeeklyDashboard | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** 화면 재진입마다 +1 — 시니어 변경 외 외부 변경(mealTimes 등) 후에도 dashboard 재조회 */
  const [refreshKey, setRefreshKey] = useState(0);

  const senior = seniors.find((s) => s.id === selectedSeniorId) ?? null;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // 시니어 변경이 없어도 다른 설정 화면(메뉴얼 시간 등) 다녀온 직후 재진입 시
      // 대시보드를 다시 받아오도록 트리거.
      setRefreshKey((k) => k + 1);

      // 0) 온보딩 미완료 사용자 가드
      // 백엔드가 isOnboarded=true 로 잘못 보내도, 실제로 닉네임이 없으면
      // 4단계를 안 거친 상태로 간주하고 회수.
      (async () => {
        try {
          const me = await getMe(true); // force=true: 캐시 무시하고 fresh fetch
          if (cancelled) return;
          if (__DEV__) {
            console.log("[family-home] /me response:", {
              id: me.id,
              nickname: me.nickname,
              role: me.role,
              isOnboarded: me.isOnboarded,
              hasIsOnboardedField: "isOnboarded" in me,
            });
          }
          const noNickname =
            me.nickname == null || me.nickname.trim().length === 0;
          if (me.isOnboarded === false || noNickname) {
            if (__DEV__) {
              console.log(
                "[family-home] onboarding incomplete → redirect (isOnboarded:",
                me.isOnboarded,
                "nickname:",
                me.nickname,
                ")",
              );
            }
            router.replace("/signup/terms" as any);
            return;
          }
          setCaregiverName(me.nickname);
        } catch (e) {
          console.log("[family-home] getMe failed:", e);
        }
      })();

      // 2) 연동된 시니어 목록 로드. 선택된 시니어가 있고 여전히 목록에 있으면 유지,
      //    아니면 첫 번째로 폴백. 시니어 미연동이면 본인 처방전만 카운트.
      (async () => {
        try {
          const list = await listLinkedSeniors();
          if (cancelled) return;
          setSeniors(list);
          setSelectedSeniorId((prev) => {
            if (prev != null && list.some((s) => s.id === prev)) return prev;
            return list[0]?.id ?? null;
          });
          if (list.length === 0) {
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
            setSeniors([]);
            setSelectedSeniorId(null);
            setMedicines([]);
            setDaily(null);
            setWeekly(null);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  // 선택된 시니어가 바뀔 때마다 그 시니어의 약물/처방전/대시보드 다시 fetch
  useEffect(() => {
    if (selectedSeniorId == null) {
      setMedicines([]);
      setDaily(null);
      setWeekly(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const sId = selectedSeniorId;
      const today = new Date();
      const todayIso = toIsoDate(today);
      const weekStartIso = getWeekStart(today);
      const [meds, pres, dailyRes, weeklyRes] = await Promise.all([
        listMedicines(sId).catch(() => ({ responses: [] as Medicine[] })),
        listPrescriptions("PENDING_REVIEW", sId).catch(() => ({
          responses: [],
        })),
        getDashboardDaily(sId, todayIso).catch((e) => {
          console.log("[family-home] daily dashboard failed:", e);
          return null;
        }),
        getDashboardWeekly(sId, weekStartIso).catch((e) => {
          console.log("[family-home] weekly dashboard failed:", e);
          return null;
        }),
      ]);
      if (cancelled) return;
      setMedicines(meds.responses);
      setPendingCount(pres.responses.length);
      setDaily(dailyRes);
      setWeekly(weeklyRes);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSeniorId, refreshKey]);

  const doses: Dose[] = daily?.slots.map(mapDailySlotToDose) ?? [];
  const completed = doses.filter((d) => d.status === "done").length;
  const streakDays = weekly ? calcStreakFromWeekly(weekly) : 0;

  const seniorName = senior?.nickname ?? "어르신";
  // 백엔드 응답에 senior의 profileImage / profileImageUrl 포함됨. 둘 다 없으면 fallback.
  const seniorImage = senior
    ? resolveProfileImage({
        profileImage: senior.profileImage ?? null,
        profileImageUrl: senior.profileImageUrl ?? null,
        fallback: getSeniorImage(senior.id),
      })
    : FALLBACK_SENIOR_IMAGE;
  // 백엔드가 dosage 고려해서 계산한 잔여 일수.
  // 정/캡슐 raw count(`Medicine.remainingAmount`)와 다른 값이라 절대 직접 min 계산 X.
  // 기록 페이지와 같은 소스를 써서 일치시킴.
  const remainingDays = daily?.header.remainingDays ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 시니어 요약 카드 — 2명 이상이면 chevron + 드롭다운 picker 노출 */}
        <SeniorSummaryHeader
          name={seniorName}
          caregiver={caregiverName}
          daysLeft={remainingDays}
          image={seniorImage}
          onPressName={
            seniors.length > 1 ? () => setPickerOpen(true) : undefined
          }
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
            {doses.length === 0 ? (
              <AppText type="pretendard-m" style={styles.doseEmpty}>
                오늘 복약 일정이 없어요
              </AppText>
            ) : (
              doses.map((dose, idx) => (
                <DoseRow
                  key={`${dose.time}-${dose.label}`}
                  dose={dose}
                  isLast={idx === doses.length - 1}
                />
              ))
            )}
          </View>

          <View style={styles.journeyFooter}>
            <AppText type="pretendard-b" style={styles.journeySummary}>
              총{" "}
              <AppText type="extrabold" style={{ color: "#4799E0" }}>
                {doses.length}
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
            {WEEK_DAYS.map((day, idx) => {
              const dayInfo = weekly?.days[idx];
              const on = dayInfo?.dayStatus === "PERFECT";
              return (
                <View key={day} style={styles.weekItem}>
                  <AppText type="pretendard-m" style={styles.weekLabel}>
                    {day}
                  </AppText>
                  <View
                    style={[
                      styles.weekDot,
                      on ? styles.weekDotOn : styles.weekDotOff,
                    ]}
                  />
                </View>
              );
            })}
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

          {medicines.length === 0 ? (
            <View style={styles.medEmpty}>
              <AppText type="pretendard-m" style={styles.medEmptyText}>
                등록된 약이 없어요
              </AppText>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push("/family/medications" as any)}
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
                  {medicines[0].name}
                </AppText>
                <AppText type="pretendard-m" style={styles.medRemaining}>
                  {/* remainingAmount는 정/캡슐 raw 개수. "일분"으로 표시하면
                      잔여 일수와 혼동되므로 단순 개수로 표기. */}
                  잔여 {medicines[0].remainingAmount}개
                  {medicines.length > 1
                    ? ` · 외 ${medicines.length - 1}종`
                    : ""}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BBB" />
            </Pressable>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <AppText type="pretendard-b" style={styles.pickerTitle}>
              시니어 선택
            </AppText>
            {seniors.map((s) => {
              const on = s.id === selectedSeniorId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setSelectedSeniorId(s.id);
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.pickerRow,
                    on && styles.pickerRowOn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.pickerAvatarRing}>
                    <Image
                      source={resolveProfileImage({
                        profileImage: s.profileImage ?? null,
                        profileImageUrl: s.profileImageUrl ?? null,
                        fallback: getSeniorImage(s.id),
                      })}
                      style={styles.pickerAvatar}
                      resizeMode="cover"
                    />
                  </View>
                  <AppText
                    type={on ? "pretendard-b" : "pretendard-m"}
                    style={[styles.pickerName, on && styles.pickerNameOn]}
                    numberOfLines={1}
                  >
                    {s.nickname}
                  </AppText>
                  {on && (
                    <Ionicons name="checkmark" size={20} color="#5BC4AE" />
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

function DoseRow({ dose, isLast }: { dose: Dose; isLast: boolean }) {
  const done = dose.status === "done";
  const missed = dose.status === "missed";
  return (
    <View style={styles.doseRow}>
      <AppText type="pretendard-m" style={styles.doseTime}>
        {dose.time}
      </AppText>
      <View style={styles.doseMarker}>
        <View
          style={[
            styles.doseDot,
            done && styles.doseDotDone,
            !done && !missed && styles.doseDotPending,
            missed && styles.doseDotMissed,
          ]}
        >
          {done && <Ionicons name="checkmark" size={18} color="#FFF" />}
          {missed && <Ionicons name="close" size={18} color="#FFF" />}
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
            done && styles.doseStatusDone,
            !done && !missed && styles.doseStatusPending,
            missed && styles.doseStatusMissed,
          ]}
        >
          {done ? "완료" : missed ? "누락" : "예정"}
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
  doseDotMissed: {
    backgroundColor: "#E14B4B",
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
  doseStatusMissed: {
    color: "#E14B4B",
  },
  doseEmpty: {
    paddingVertical: 24,
    textAlign: "center",
    color: "#888",
    fontSize: 13,
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

  /* ── 시니어 선택 picker ── */
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  pickerSheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 10,
  },
  pickerTitle: {
    fontSize: 18,
    color: "#222",
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
  },
  pickerRowOn: {
    borderColor: "#5BC4AE",
    backgroundColor: "#F4FBF9",
  },
  pickerAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  pickerAvatar: {
    width: "100%",
    height: "100%",
  },
  pickerName: {
    flex: 1,
    fontSize: 16,
    color: "#444",
  },
  pickerNameOn: {
    color: "#222",
  },
});
