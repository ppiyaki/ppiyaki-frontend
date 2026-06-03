import AppText from "@/components/app-text";
import SeniorSummaryHeader from "@/components/senior-summary-header";
import { ApiError } from "@/services/api";
import { resolveLinkedSenior } from "@/services/caregivers";
import {
  DailyDashboard,
  DailySlot,
  DayStatus,
  getDashboardDaily,
  getDashboardMonthly,
  getDashboardWeekly,
  MonthlyDashboard,
  SlotStatus,
  WeeklyDashboard,
  WeeklyDay,
} from "@/services/dashboard";
import {
  fromServerSlot,
  getMealTimes,
  MealSlot,
  MealTimes,
} from "@/services/user-settings";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { ComponentProps, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type Period = "day" | "week" | "month";
type IoniconName = ComponentProps<typeof Ionicons>["name"];

const DEFAULT_SENIOR_IMAGE: ImageSourcePropType = require("../../assets/images/pf/pfimg2.png");

/* ────────────────────── helpers: 날짜 ────────────────────── */

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toYearMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** 일요일 시작 weekStart 계산 */
function getWeekStart(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

const KOREAN_DOW = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateLabelKo(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${KOREAN_DOW[d.getDay()]})`;
}

/* ────────────────────── helpers: 색상 ────────────────────── */

interface Palette {
  color: string;
  bg: string;
}

/**
 * 백엔드가 시간 지난 PENDING 을 MISSED 로 전이 안 시키는 케이스 보정.
 * mealTime + GRACE_MIN 이 현재보다 과거면 시각적으로 MISSED 취급.
 * 백엔드가 수정되면 이 함수 제거하면 됨.
 */
const MISSED_GRACE_MIN = 60;
function effectiveSlotStatus(
  status: SlotStatus,
  mealTimeHms: string | null | undefined,
  dateIso: string,
): SlotStatus {
  if (status !== "PENDING") return status;
  if (!mealTimeHms) return status;
  const [h, m] = mealTimeHms.split(":").map((x) => parseInt(x, 10) || 0);
  const slotDate = new Date(dateIso);
  slotDate.setHours(h, m + MISSED_GRACE_MIN, 0, 0);
  return slotDate < new Date() ? "MISSED" : "PENDING";
}

function paletteForStatus(s: DayStatus | SlotStatus): Palette {
  switch (s) {
    case "PERFECT":
      return { color: "#5BC4AE", bg: "#E8F7F2" };
    case "DELAYED":
      // 지연되었지만 인증 완료 — 노랑
      return { color: "#F8B835", bg: "#FFF4C7" };
    case "MISSED":
      return { color: "#E14B4B", bg: "#FCEBEB" };
    case "PENDING":
    case "FUTURE":
    case "NOT_SCHEDULED":
    default:
      // 예정/미래/일정없음 — 회색
      return { color: "#CFCFCF", bg: "#F4F2EA" };
  }
}

const SLOT_LABEL: Record<MealSlot, string> = {
  morning: "아침",
  noon: "점심",
  night: "저녁",
};

const SLOT_ICON: Record<MealSlot, IoniconName> = {
  morning: "sunny",
  noon: "restaurant",
  night: "moon",
};

/* ────────────────────── 메인 ────────────────────── */

export default function FamilyRecordScreen() {
  // 알림 탭에서 특정 날짜로 진입할 수 있도록 URL 파라미터 지원.
  // 예: /family/record?date=2026-05-30 → 그 날짜의 일간 기록 표시
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;
  const focusedDate =
    dateParam && isoDateRe.test(dateParam) ? dateParam : null;

  // 날짜 파라미터가 있으면 일간 탭을 자동으로 선택
  const [period, setPeriod] = useState<Period>(focusedDate ? "day" : "day");
  const [seniorId, setSeniorId] = useState<number | null>(null);
  const [seniorName, setSeniorName] = useState<string>("어르신");
  const [caregiverName, setCaregiverName] = useState<string>("");
  const [daysLeft, setDaysLeft] = useState<number>(0);

  // dateParam이 바뀌면 day 탭으로 강제 전환 (다른 탭에 있던 상태로 알림 탭하면)
  useEffect(() => {
    if (focusedDate) setPeriod("day");
  }, [focusedDate]);

  // 시니어 ID 부트스트랩
  useEffect(() => {
    void (async () => {
      const s = await resolveLinkedSenior();
      if (s) {
        setSeniorId(s.id);
        setSeniorName(s.nickname);
      }
    })();
  }, []);

  // 헤더용 추가 정보 (caregiverName, remainingDays) — 일간 대시보드 응답 활용
  useEffect(() => {
    if (seniorId === null) return;
    let cancelled = false;
    const today = toIsoDate(new Date());
    void (async () => {
      try {
        const res = await getDashboardDaily(seniorId, today);
        if (cancelled) return;
        setCaregiverName(res.header.caregiverName ?? "");
        setDaysLeft(res.header.remainingDays ?? 0);
      } catch (e) {
        console.log("[record] header fetch failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seniorId]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.fixedTop}>
        <SeniorSummaryHeader
          name={seniorName}
          caregiver={caregiverName}
          daysLeft={daysLeft}
          image={DEFAULT_SENIOR_IMAGE}
        />
        <PeriodToggle value={period} onChange={setPeriod} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={period} entering={FadeIn.duration(180)}>
          {seniorId === null ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#FFD24D" />
            </View>
          ) : period === "day" ? (
            <DailyView seniorId={seniorId} date={focusedDate} />
          ) : period === "week" ? (
            <WeeklyView seniorId={seniorId} />
          ) : (
            <MonthlyView seniorId={seniorId} />
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ────────────────────── 토글 ────────────────────── */

function PeriodToggle({
  value,
  onChange,
}: {
  value: Period;
  onChange: (v: Period) => void;
}) {
  const items: { key: Period; label: string }[] = [
    { key: "day", label: "일간" },
    { key: "week", label: "주간" },
    { key: "month", label: "월간" },
  ];
  return (
    <View style={s.toggle}>
      {items.map((it) => {
        const on = value === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={[s.togglePill, on && s.togglePillOn]}
          >
            <AppText
              type="pretendard-b"
              style={[s.toggleText, on && s.toggleTextOn]}
            >
              {it.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ────────────────────── 일간 ────────────────────── */

function DailyView({
  seniorId,
  date,
}: {
  seniorId: number;
  // 특정 날짜 조회 — null/undefined 면 오늘
  date?: string | null;
}) {
  const [data, setData] = useState<DailyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const targetDate = date ?? toIsoDate(new Date());
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const res = await getDashboardDaily(seniorId, targetDate);
          if (__DEV__) {
            console.log("[record/daily] response:", {
              seniorId,
              targetDate,
              dayStatus: res.dayStatus,
              slots: res.slots.map((sl) => ({
                slot: sl.slot,
                status: sl.status,
                mealTime: sl.mealTime,
                takenAt: sl.takenAt,
                medicinesCount: sl.medicines.length,
              })),
            });
          }
          if (!cancelled) setData(res);
        } catch (e) {
          if (!cancelled) {
            setError(
              e instanceof ApiError
                ? e.toUserMessage()
                : "일간 기록을 불러오지 못했어요",
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [seniorId, date]),
  );

  if (loading) {
    return (
      <View style={s.loadingBoxInline}>
        <ActivityIndicator size="large" color="#FFD24D" />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={s.errorBox}>
        <AppText type="pretendard-m" style={s.errorText}>
          {error ?? "데이터가 없어요"}
        </AppText>
      </View>
    );
  }

  const completed = data.slots.filter(
    (slot) => slot.status === "PERFECT" || slot.status === "DELAYED",
  ).length;
  const totalScheduled = data.slots.filter(
    (slot) => slot.status !== "NOT_SCHEDULED",
  ).length;

  return (
    <View style={{ gap: 14 }}>
      <SectionTitle title="일간 성취도" />

      <View style={s.dailyCard}>
        <View style={s.achieveText}>
          <AppText type="pretendard-m" style={s.achieveDesc}>
            오늘 {totalScheduled}회 중{" "}
            <AppText type="extrabold" style={{ color: "#5BC4AE" }}>
              {completed}회
            </AppText>{" "}
            복용 완료
          </AppText>
        </View>

        <View style={s.photoRow}>
          {data.slots.map((slot) => (
            <PhotoSlot key={slot.slot} slot={slot} dateIso={data.date} />
          ))}
        </View>
      </View>

      <View style={s.sectionTitleRow}>
        <AppText type="pretendard-b" style={s.sectionTitle}>
          상세 복약 정보
        </AppText>
      </View>

      <View style={s.pillCard}>
        {data.medicines.length === 0 ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <AppText type="pretendard-m" style={{ color: "#888" }}>
              등록된 약이 없어요
            </AppText>
          </View>
        ) : (
          data.medicines.map((m, idx) => (
            <PillRow
              key={m.medicineId}
              name={m.name}
              activeSlots={m.slots.map(fromServerSlot)}
              showDivider={idx < data.medicines.length - 1}
            />
          ))
        )}
      </View>
    </View>
  );
}

function PhotoSlot({ slot, dateIso }: { slot: DailySlot; dateIso: string }) {
  const effective = effectiveSlotStatus(slot.status, slot.mealTime, dateIso);
  const palette = paletteForStatus(effective);
  const localSlot = fromServerSlot(slot.slot);
  const done = effective === "PERFECT" || effective === "DELAYED";
  return (
    <View style={s.photoSlot}>
      <View
        style={[
          s.photoBox,
          { backgroundColor: palette.bg },
        ]}
      >
        {slot.photoUrl ? (
          <Image
            source={{ uri: slot.photoUrl }}
            style={{ width: "100%", height: "100%", borderRadius: 14 }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name="camera"
            size={36}
            color={done ? "#999" : "#BBB"}
          />
        )}
      </View>
      <View style={s.photoLabelRow}>
        <AppText type="pretendard-b" style={s.photoLabel}>
          {SLOT_LABEL[localSlot]}
        </AppText>
        <StatusDotMini status={effective} />
      </View>
    </View>
  );
}

function StatusDotMini({ status }: { status: SlotStatus }) {
  if (status === "PERFECT") {
    return (
      <View style={[s.photoCheckMini, { backgroundColor: "#5BC4AE" }]}>
        <Ionicons name="checkmark" size={10} color="#FFF" />
      </View>
    );
  }
  if (status === "DELAYED") {
    return (
      <View style={[s.photoCheckMini, { backgroundColor: "#F8B835" }]}>
        <Ionicons name="time" size={10} color="#FFF" />
      </View>
    );
  }
  if (status === "MISSED") {
    return (
      <View style={[s.photoCheckMini, { backgroundColor: "#E14B4B" }]}>
        <Ionicons name="close" size={10} color="#FFF" />
      </View>
    );
  }
  // PENDING / NOT_SCHEDULED — 빈 dot
  return <View style={s.photoCheckEmpty} />;
}

function PillRow({
  name,
  activeSlots,
  showDivider,
}: {
  name: string;
  activeSlots: MealSlot[];
  showDivider: boolean;
}) {
  const slots: MealSlot[] = ["morning", "noon", "night"];
  return (
    <View style={[s.pillRow, showDivider && s.pillRowDivider]}>
      <View style={s.pillIcon}>
        <MaterialCommunityIcons name="pill" size={20} color="#5BC4AE" />
      </View>
      <AppText type="pretendard-b" style={s.pillName} numberOfLines={1}>
        {name}
      </AppText>
      <View style={s.slotRow}>
        {slots.map((slot) => {
          const on = activeSlots.includes(slot);
          return (
            <View
              key={slot}
              style={[s.slotBadge, on ? s.slotBadgeOn : s.slotBadgeOff]}
            >
              <Ionicons
                name={SLOT_ICON[slot]}
                size={14}
                color={on ? "#F8B835" : "#CCC"}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ────────────────────── 주간 ────────────────────── */

function WeeklyView({ seniorId }: { seniorId: number }) {
  const [data, setData] = useState<WeeklyDashboard | null>(null);
  const [meals, setMeals] = useState<MealTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const weekStart = toIsoDate(getWeekStart(new Date()));
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const [res, mt] = await Promise.all([
            getDashboardWeekly(seniorId, weekStart),
            getMealTimes(),
          ]);
          if (__DEV__) {
            console.log(
              "[record/weekly] response:",
              JSON.stringify(
                {
                  seniorId,
                  weekStart: res.weekStart,
                  weekEnd: res.weekEnd,
                  adherenceRate: res.adherenceRate,
                  days: res.days,
                },
                null,
                2,
              ),
            );
          }
          if (!cancelled) {
            setData(res);
            setMeals(mt);
          }
        } catch (e) {
          if (!cancelled) {
            setError(
              e instanceof ApiError
                ? e.toUserMessage()
                : "주간 기록을 불러오지 못했어요",
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [seniorId]),
  );

  if (loading) {
    return (
      <View style={s.loadingBoxInline}>
        <ActivityIndicator size="large" color="#FFD24D" />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={s.errorBox}>
        <AppText type="pretendard-m" style={s.errorText}>
          {error ?? "데이터가 없어요"}
        </AppText>
      </View>
    );
  }

  const adherence =
    data.adherenceRate === null ? "—" : `${data.adherenceRate.toFixed(2)}%`;
  const adherenceFillPct = data.adherenceRate ?? 0;
  const todayIso = toIsoDate(new Date());

  return (
    <View style={{ gap: 14 }}>
      <AppText type="pretendard-b" style={s.sectionTitle}>
        주간 성취도
      </AppText>

      <View style={s.weekCard}>
        <View style={s.weekHeadRow}>
          <View style={s.weekChartIcon}>
            <Ionicons name="bar-chart" size={28} color="#5BC4AE" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.weekTitleRow}>
              <AppText type="pretendard-b" style={s.weekTitle}>
                금주 복약 이행률
              </AppText>
              <AppText type="extrabold" style={s.weekPercent}>
                {adherence}
              </AppText>
            </View>
            <View style={s.weekProgressTrack}>
              <View
                style={[
                  s.weekProgressFill,
                  { width: `${adherenceFillPct}%` },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={s.weekDayRow}>
          {data.days.map((d) => (
            <WeekDayCell
              key={d.date}
              day={d}
              isToday={d.date === todayIso}
            />
          ))}
        </View>
      </View>

      <AppText type="pretendard-b" style={s.sectionTitle}>
        상세일지 ({formatDateLabelKo(data.weekStart)} ~{" "}
        {formatDateLabelKo(data.weekEnd)})
      </AppText>

      <View style={{ gap: 8 }}>
        {data.days.map((row) => (
          <WeekDetailCard
            key={row.date}
            row={row}
            isToday={row.date === todayIso}
            todayIso={todayIso}
            meals={meals}
          />
        ))}
      </View>
    </View>
  );
}

function WeekDayCell({
  day,
  isToday,
}: {
  day: WeeklyDay;
  isToday: boolean;
}) {
  const dayNum = new Date(day.date).getDate();
  const dow = KOREAN_DOW[new Date(day.date).getDay()];
  return (
    <View style={s.weekDayCell}>
      {isToday && (
        <View style={s.todayBubble}>
          <AppText type="extrabold" style={s.todayBubbleText}>
            {dayNum}
          </AppText>
        </View>
      )}
      <AppText type="pretendard-b" style={s.weekDayLabel}>
        {dow}
      </AppText>
      <StatusDot status={day.dayStatus} />
    </View>
  );
}

function StatusDot({ status }: { status: DayStatus }) {
  if (status === "PERFECT") {
    return (
      <View style={[s.statusDot, { backgroundColor: "#5BC4AE" }]}>
        <Ionicons name="checkmark" size={14} color="#FFF" />
      </View>
    );
  }
  if (status === "DELAYED") {
    return (
      <View style={[s.statusDot, { backgroundColor: "#F8B835" }]}>
        <Ionicons name="alert" size={14} color="#FFF" />
      </View>
    );
  }
  if (status === "MISSED") {
    return (
      <View style={[s.statusDot, { backgroundColor: "#E14B4B" }]}>
        <Ionicons name="close" size={14} color="#FFF" />
      </View>
    );
  }
  // PENDING / FUTURE — 빈 점선 dot
  return <View style={[s.statusDot, s.statusDotEmpty]} />;
}

function WeekDetailCard({
  row,
  isToday,
  todayIso,
  meals,
}: {
  row: WeeklyDay;
  isToday: boolean;
  todayIso: string;
  meals: MealTimes | null;
}) {
  const isFuture = row.dayStatus === "FUTURE";
  const isPast = row.date < todayIso;
  return (
    <View
      style={[
        s.detailRow,
        isToday && s.detailRowToday,
        isFuture && s.detailRowFuture,
      ]}
    >
      <View style={{ flex: 1 }}>
        <AppText
          type="pretendard-b"
          style={[s.detailDate, isFuture && s.detailDateFuture]}
        >
          {formatDateLabelKo(row.date)}
        </AppText>
      </View>
      {(["BREAKFAST", "LUNCH", "DINNER"] as const).map((slot) => {
        const marker = row.slots.find((m) => m.slot === slot);
        const raw: SlotStatus = marker?.status ?? "NOT_SCHEDULED";
        // 과거 날짜 PENDING → MISSED 로 강제
        // 오늘 PENDING → mealTime + grace 지났는지 체크
        let effective: SlotStatus = raw;
        if (raw === "PENDING") {
          if (isPast) {
            effective = "MISSED";
          } else if (isToday && meals) {
            const mt =
              slot === "BREAKFAST"
                ? meals.morning
                : slot === "LUNCH"
                  ? meals.noon
                  : meals.night;
            effective = effectiveSlotStatus(raw, mt, row.date);
          }
        }
        return <DetailIcon key={slot} kind={slot} status={effective} />;
      })}
    </View>
  );
}

function DetailIcon({
  kind,
  status,
}: {
  kind: "BREAKFAST" | "LUNCH" | "DINNER";
  status: SlotStatus;
}) {
  const palette = paletteForStatus(status);
  const iconName: IoniconName =
    kind === "BREAKFAST"
      ? "sunny"
      : kind === "LUNCH"
        ? "restaurant"
        : "moon";
  return (
    <View style={[s.detailIconBox, { backgroundColor: palette.bg }]}>
      <Ionicons name={iconName} size={20} color={palette.color} />
    </View>
  );
}

/* ────────────────────── 월간 ────────────────────── */

function MonthlyView({ seniorId }: { seniorId: number }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [data, setData] = useState<MonthlyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ym = toYearMonth(cursor);
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await getDashboardMonthly(seniorId, ym);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof ApiError
              ? e.toUserMessage()
              : "월간 기록을 불러오지 못했어요",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seniorId, cursor]);

  const monthLabel = `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;

  const goPrev = () => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  };
  const goNext = () => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  };

  const todayIso = toIsoDate(new Date());

  return (
    <View style={{ gap: 14 }}>
      <View style={s.sectionTitleRow}>
        <View style={s.sectionIcon}>
          <Ionicons name="bar-chart" size={16} color="#5BC4AE" />
        </View>
        <AppText type="pretendard-b" style={s.sectionTitle}>
          월간 성취도
        </AppText>
      </View>

      <View style={s.monthCard}>
        <View style={s.monthHeader}>
          <AppText type="pretendard-b" style={s.monthLabel}>
            {monthLabel}
          </AppText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={goPrev} style={s.monthNavBtn}>
              <Ionicons name="chevron-back" size={18} color="#515151" />
            </Pressable>
            <Pressable onPress={goNext} style={s.monthNavBtn}>
              <Ionicons name="chevron-forward" size={18} color="#515151" />
            </Pressable>
          </View>
        </View>

        <View style={s.weekHeader}>
          {KOREAN_DOW.map((d) => (
            <AppText key={d} type="pretendard-r" style={s.weekHeaderText}>
              {d}
            </AppText>
          ))}
        </View>

        {loading ? (
          <View style={s.loadingBoxInline}>
            <ActivityIndicator size="small" color="#FFD24D" />
          </View>
        ) : error || !data ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <AppText type="pretendard-m" style={s.errorText}>
              {error ?? "데이터가 없어요"}
            </AppText>
          </View>
        ) : (
          <Calendar
            cursor={cursor}
            statusByDate={Object.fromEntries(
              data.days.map((d) => [d.date, d.dayStatus]),
            )}
            todayIso={todayIso}
          />
        )}
      </View>
    </View>
  );
}

function Calendar({
  cursor,
  statusByDate,
  todayIso,
}: {
  cursor: Date;
  statusByDate: Record<string, DayStatus>;
  todayIso: string;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDayOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      d,
    ).padStart(2, "0")}`;
    cells.push(iso);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={{ gap: 6 }}>
      {rows.map((row, idx) => (
        <View key={idx} style={s.calendarRow}>
          {row.map((iso, ci) => (
            <CalendarCell
              key={ci}
              iso={iso}
              status={iso ? statusByDate[iso] : undefined}
              isToday={iso === todayIso}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function CalendarCell({
  iso,
  status,
  isToday,
}: {
  iso: string | null;
  status: DayStatus | undefined;
  isToday: boolean;
}) {
  if (!iso) return <View style={s.calendarCell} />;
  const dateNum = new Date(iso).getDate();

  let bg = "transparent";
  let textColor = "#444";
  if (isToday) {
    bg = "#222";
    textColor = "#FFF";
  } else if (status === "PERFECT") {
    bg = "#5BC4AE";
    textColor = "#FFF";
  } else if (status === "DELAYED") {
    bg = "#F8B835";
    textColor = "#FFF";
  } else if (status === "MISSED") {
    bg = "#E14B4B";
    textColor = "#FFF";
  }
  // PENDING / FUTURE / NOT_SCHEDULED — 빈칸 (textColor만)

  return (
    <View style={s.calendarCell}>
      <View style={[s.calendarDot, { backgroundColor: bg }]}>
        <AppText
          type={isToday ? "pretendard-b" : "pretendard-r"}
          style={[s.calendarText, { color: textColor }]}
        >
          {dateNum}
        </AppText>
      </View>
    </View>
  );
}

/* ────────────────────── 공통 helpers ────────────────────── */

function SectionTitle({ title }: { title: string }) {
  return (
    <AppText type="pretendard-b" style={s.sectionTitle}>
      {title}
    </AppText>
  );
}

/* ────────────────────── styles ────────────────────── */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  fixedTop: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  loadingBox: {
    paddingVertical: 80,
    alignItems: "center",
  },
});

const s = StyleSheet.create({
  /* 토글 */
  toggle: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  togglePill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 999,
  },
  togglePillOn: {
    backgroundColor: "#FFD24D",
  },
  toggleText: {
    fontSize: 14,
    color: "#888",
  },
  toggleTextOn: {
    color: "#222",
  },

  /* 섹션 공통 */
  sectionTitle: {
    fontSize: 18,
    color: "#222",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D6F1EA",
    justifyContent: "center",
    alignItems: "center",
  },

  /* 일간 */
  dailyCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  achieveText: {
    flex: 1,
    gap: 4,
  },
  achieveDesc: {
    fontSize: 14,
    color: "#555",
  },
  photoRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoSlot: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  photoBox: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  photoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  photoLabel: {
    fontSize: 14,
    color: "#222",
  },
  photoCheckMini: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  photoCheckEmpty: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#CCC",
  },

  /* 알약 리스트 */
  pillCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pillRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECDB",
  },
  pillIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D6F1EA",
    justifyContent: "center",
    alignItems: "center",
  },
  pillName: {
    flex: 1,
    fontSize: 14,
    color: "#222",
  },
  slotRow: {
    flexDirection: "row",
    gap: 4,
  },
  slotBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  slotBadgeOn: {
    backgroundColor: "#FFF4C7",
  },
  slotBadgeOff: {
    backgroundColor: "#F4F2EA",
  },

  /* 주간 */
  weekCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 18,
    gap: 18,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  weekHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  weekChartIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D6F1EA",
    justifyContent: "center",
    alignItems: "center",
  },
  weekTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  weekTitle: {
    fontSize: 15,
    color: "#222",
  },
  weekPercent: {
    fontSize: 22,
    color: "#5BC4AE",
  },
  weekProgressTrack: {
    height: 8,
    backgroundColor: "#F0EDE0",
    borderRadius: 4,
    overflow: "hidden",
  },
  weekProgressFill: {
    height: "100%",
    backgroundColor: "#5BC4AE",
  },
  weekDayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekDayCell: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  weekDayLabel: {
    fontSize: 14,
    color: "#444",
  },
  todayBubble: {
    position: "absolute",
    top: -18,
    backgroundColor: "#222",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 26,
    alignItems: "center",
  },
  todayBubbleText: {
    fontSize: 11,
    color: "#FFF",
  },
  statusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  statusDotEmpty: {
    borderWidth: 1.5,
    borderColor: "#D6F1EA",
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },

  /* 주간 detail */
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  detailRowToday: {
    backgroundColor: "#FFF8E0",
    borderColor: "#FFE9A8",
  },
  detailRowFuture: {
    backgroundColor: "#FAFAF6",
    borderColor: "#EFEFE5",
  },
  detailDate: {
    fontSize: 14,
    color: "#222",
  },
  detailDateFuture: {
    color: "#BBB",
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  /* 월간 */
  monthCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthLabel: {
    fontSize: 17,
    color: "#222",
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F1ECDB",
    justifyContent: "center",
    alignItems: "center",
  },
  weekHeader: {
    flexDirection: "row",
  },
  weekHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#666",
  },
  calendarRow: {
    flexDirection: "row",
  },
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarText: {
    fontSize: 13,
  },

  /* loading/error */
  loadingBoxInline: {
    paddingVertical: 60,
    alignItems: "center",
  },
  errorBox: {
    paddingVertical: 60,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#888",
  },
});
