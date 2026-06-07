import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { getMe } from "@/services/auth";
import { upsertMedicationLog } from "@/services/medication-logs";
import { listMedicines } from "@/services/medicines";
import { listSchedules } from "@/services/schedules";
import {
  getMealTimes,
  MealSlot,
  ServerMealSlot,
} from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Tip {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  desc: string;
}

const TIPS: Tip[] = [
  {
    icon: "hand-left",
    iconColor: "#F8B835",
    iconBg: "#FFF1C8",
    title: "손바닥 위에 약을 올려주세요",
    desc: "또는 평평한 곳에 약을 올려두세요",
  },
  {
    icon: "sunny",
    iconColor: "#F8B835",
    iconBg: "#FFF1C8",
    title: "밝은 곳에서 찍어주세요",
    desc: "어두우면 약이 잘 안 보여요",
  },
  {
    icon: "scan",
    iconColor: "#5BC4AE",
    iconBg: "#D6F1EA",
    title: "약이 모두 잘 보이게 찍어주세요",
    desc: "가까이서 찍으면 더 정확해요",
  },
];

/** "HH:mm:ss" → 분(minutes) */
function toMinutes(hms: string): number {
  const [h, m] = hms.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 현재 시각에 가장 가까운 (지났거나 1시간 이내) 슬롯 결정 */
function pickActiveSlot(
  mealMinutes: Record<MealSlot, number>,
  nowMin: number,
): MealSlot {
  const order: MealSlot[] = ["morning", "noon", "night"];
  // 1순위: 슬롯시각 ± 90분 윈도우 (가장 가까운 것)
  let best: { slot: MealSlot; diff: number } | null = null;
  for (const s of order) {
    const diff = Math.abs(nowMin - mealMinutes[s]);
    if (diff <= 90 && (!best || diff < best.diff)) {
      best = { slot: s, diff };
    }
  }
  if (best) return best.slot;
  // 2순위: 시각순 — 다음 예정 슬롯
  for (const s of order) {
    if (nowMin <= mealMinutes[s]) return s;
  }
  // 3순위: 가장 늦은 슬롯 (자정 직전 등)
  return "night";
}

export default function DoseConfirmIntroScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const {
    scheduleId: paramScheduleId,
    targetDate: paramTargetDate,
    mealSlot: paramMealSlot,
  } = useLocalSearchParams<{
    scheduleId?: string;
    targetDate?: string;
    mealSlot?: string;
  }>();
  if (__DEV__) {
    console.log("[dose-confirm/intro] params:", {
      paramScheduleId,
      paramTargetDate,
      paramMealSlot,
    });
  }
  const [resolvedScheduleId, setResolvedScheduleId] = useState<string | null>(
    paramScheduleId ?? null,
  );
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(!paramScheduleId);
  const [canSkipPhoto, setCanSkipPhoto] = useState(false);
  const [skipping, setSkipping] = useState(false);

  // 시니어가 AUTONOMOUS 모드면 사진 없이 인증 허용
  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        setCanSkipPhoto(me.careMode === "AUTONOMOUS");
      } catch (e) {
        console.log("[dose-confirm/intro] getMe failed:", e);
      }
    })();
  }, []);

  // scheduleId 가 안 넘어왔으면 슬롯 정보로 매칭 후 첫 schedule 사용.
  // 1순위: 알림 payload 의 mealSlot (BREAKFAST/LUNCH/DINNER) — 정확
  // 2순위: 현재 시각 기준 추론 (홈에서 직접 인증 진입한 경우)
  useEffect(() => {
    if (paramScheduleId) return;
    let cancelled = false;
    void (async () => {
      try {
        let serverSlot: ServerMealSlot | null = null;

        if (
          paramMealSlot === "BREAKFAST" ||
          paramMealSlot === "LUNCH" ||
          paramMealSlot === "DINNER"
        ) {
          // 알림에서 mealSlot 받아온 케이스 — 정확하므로 mealTimes 안 봐도 됨
          serverSlot = paramMealSlot;
          if (__DEV__) {
            console.log("[dose-confirm/intro] using mealSlot from payload:", serverSlot);
          }
        } else {
          // 홈에서 직접 진입한 케이스 — 현재 시각 기준 추론
          const meals = await getMealTimes();
          const mealMinutes: Record<MealSlot, number> = {
            morning: toMinutes(meals.morning),
            noon: toMinutes(meals.noon),
            night: toMinutes(meals.night),
          };
          const now = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes();
          const targetSlot: MealSlot = pickActiveSlot(mealMinutes, nowMin);
          serverSlot =
            targetSlot === "morning"
              ? "BREAKFAST"
              : targetSlot === "noon"
                ? "LUNCH"
                : "DINNER";
          if (__DEV__) {
            console.log("[dose-confirm/intro] inferred slot from now:", serverSlot);
          }
        }

        const meds = await listMedicines();
        // 약별 schedule 조회 → 결정된 슬롯에 해당하는 첫 schedule 사용
        for (const m of meds.responses) {
          const s = await listSchedules(m.id);
          const match = s.responses.find((x) => x.mealSlot === serverSlot);
          if (match) {
            if (!cancelled) setResolvedScheduleId(String(match.id));
            return;
          }
        }
        if (!cancelled) {
          // 매칭 안 됨 — 임시로 첫 schedule이라도 사용 (fallback)
          for (const m of meds.responses) {
            const s = await listSchedules(m.id);
            if (s.responses[0]) {
              setResolvedScheduleId(String(s.responses[0].id));
              return;
            }
          }
          setResolveError("등록된 복약 일정이 없어요");
        }
      } catch (e) {
        console.log("[dose-confirm/intro] resolve schedule failed:", e);
        if (!cancelled) setResolveError("복약 일정 정보를 불러오지 못했어요");
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paramScheduleId, paramMealSlot]);

  const scheduleId = resolvedScheduleId;
  const targetDate = paramTargetDate ?? todayIso();

  const handleSkipPhoto = async () => {
    if (!scheduleId || skipping) return;
    const ok = await confirm({
      title: "사진 없이 인증할까요?",
      message: "사진 없이 복약을 완료 처리해요.",
      confirmText: "인증하기",
    });
    if (!ok) return;
    setSkipping(true);
    try {
      await upsertMedicationLog({
        scheduleId: Number(scheduleId),
        targetDate,
        status: "TAKEN",
      });
      router.replace("/dose-confirm/success" as any);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "복약 인증에 실패했어요";
      await confirm({
        title: "인증 실패",
        message: msg,
        confirmText: "확인",
      });
      setSkipping(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="복약 인증" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroIcon}>
          <Ionicons name="camera" size={44} color="#F8B835" />
        </View>

        <AppText type="extrabold" style={styles.title}>
          약 사진을 찍어주세요
        </AppText>
        <AppText type="pretendard-m" style={styles.desc}>
          삐약이가 약 개수를 확인해드릴게요.{"\n"}
          아래 안내대로 찍으면 더 정확해요!
        </AppText>

        <View style={styles.tipList}>
          {TIPS.map((tip, idx) => (
            <View key={tip.title} style={styles.tipRow}>
              <View
                style={[styles.tipIcon, { backgroundColor: tip.iconBg }]}
              >
                <Ionicons name={tip.icon} size={22} color={tip.iconColor} />
              </View>
              <View style={styles.tipText}>
                <AppText type="pretendard-b" style={styles.tipTitle}>
                  {idx + 1}. {tip.title}
                </AppText>
                <AppText type="pretendard-m" style={styles.tipDesc}>
                  {tip.desc}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {resolveError && (
          <AppText type="pretendard-m" style={styles.resolveError}>
            {resolveError}
          </AppText>
        )}
        <Pressable
          onPress={() => {
            if (!scheduleId) return;
            router.push({
              pathname: "/dose-confirm/camera" as any,
              params: { scheduleId, targetDate },
            });
          }}
          disabled={resolving || !scheduleId || skipping}
          style={({ pressed }) => [
            styles.btn,
            (resolving || !scheduleId || skipping) && styles.btnDisabled,
            pressed && scheduleId && !skipping && { opacity: 0.85 },
          ]}
        >
          {resolving ? (
            <ActivityIndicator color="#222" />
          ) : (
            <>
              <Ionicons name="camera" size={22} color="#222" />
              <AppText type="pretendard-b" style={styles.btnText}>
                사진 찍으러 가기
              </AppText>
            </>
          )}
        </Pressable>
        {canSkipPhoto && (
          <Pressable
            onPress={handleSkipPhoto}
            disabled={resolving || !scheduleId || skipping}
            style={({ pressed }) => [
              styles.skipBtn,
              (resolving || !scheduleId || skipping) && { opacity: 0.5 },
              pressed && !skipping && { opacity: 0.7 },
            ]}
          >
            {skipping ? (
              <ActivityIndicator color="#666" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#666" />
                <AppText type="pretendard-b" style={styles.skipBtnText}>
                  사진 없이 인증하기
                </AppText>
              </>
            )}
          </Pressable>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFF4C7",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    color: "#222",
    textAlign: "center",
    marginTop: 6,
  },
  desc: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 14,
  },
  tipList: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECDB",
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    fontSize: 16,
    color: "#222",
  },
  tipDesc: {
    fontSize: 13,
    color: "#777",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#FFD24D",
  },
  btnDisabled: {
    backgroundColor: "#F0EDE0",
  },
  btnText: {
    fontSize: 18,
    color: "#222",
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E5E0CE",
  },
  skipBtnText: {
    fontSize: 15,
    color: "#444",
  },
  resolveError: {
    color: "#E14B4B",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
});
