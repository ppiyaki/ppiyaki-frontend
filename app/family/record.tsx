import AppText from "@/components/app-text";
import SeniorSummaryHeader from "@/components/senior-summary-header";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Period = "day" | "week" | "month";
type DoseStatus = "done" | "warn" | "miss" | "ongoing" | "none";
type IoniconName = ComponentProps<typeof Ionicons>["name"];

const SENIOR = {
  name: "김장군",
  caregiver: "김철수",
  daysLeft: 3,
  image: require("../../assets/images/pf/pfimg2.png"),
};

export default function FamilyRecordScreen() {
  const [period, setPeriod] = useState<Period>("day");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.fixedTop}>
        <SeniorSummaryHeader
          name={SENIOR.name}
          caregiver={SENIOR.caregiver}
          daysLeft={SENIOR.daysLeft}
          image={SENIOR.image}
        />
        <PeriodToggle value={period} onChange={setPeriod} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {period === "day" && <DailyView />}
        {period === "week" && <WeeklyView />}
        {period === "month" && <MonthlyView />}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ──────────────────────── 토글 ──────────────────────── */

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

/* ──────────────────────── 일간 ──────────────────────── */

interface DailyDose {
  slot: "morning" | "noon" | "night";
  label: string;
  photo?: ImageSourcePropType;
  done: boolean;
}

const DAILY_DOSES: DailyDose[] = [
  { slot: "morning", label: "아침", done: true },
  { slot: "noon", label: "점심", done: true },
  { slot: "night", label: "저녁", done: false },
];

interface PillItem {
  id: string;
  name: string;
  schedule: ("morning" | "noon" | "night")[];
}

const PILLS: PillItem[] = [
  {
    id: "1",
    name: "지스로맥스정250mg",
    schedule: ["morning"],
  },
  {
    id: "2",
    name: "엘도신캡슐",
    schedule: ["morning", "night"],
  },
  {
    id: "3",
    name: "코슈정",
    schedule: ["morning"],
  },
  {
    id: "4",
    name: "바실리스캡슐",
    schedule: ["noon"],
  },
  {
    id: "5",
    name: "소화제",
    schedule: ["morning", "night"],
  },
];

function DailyView() {
  const total = DAILY_DOSES.length;
  const completed = DAILY_DOSES.filter((d) => d.done).length;
  const percent = Math.round((completed / total) * 100);

  return (
    <View style={{ gap: 14 }}>
      <SectionTitle title="일간 성취도" />

      <View style={s.dailyCard}>
        <View style={s.achieveRow}>
          {/* <View style={s.percentCircle}>
            <AppText type="extrabold" style={s.percentNum}>
              {percent}%
            </AppText>
            <AppText type="pretendard-m" style={s.percentLabel}>
              오늘 성취도
            </AppText>
          </View> */}
          <View style={s.achieveText}>
            {/* <AppText type="pretendard-b" style={s.achieveTitle}>
              {percent >= 80
                ? "잘하고 있어요!"
                : percent >= 50
                  ? "조금 더 힘내요!"
                  : "복약을 챙겨주세요"}
            </AppText> */}
            <AppText type="pretendard-m" style={s.achieveDesc}>
              오늘 {total}회 중{" "}
              <AppText type="extrabold" style={{ color: "#5BC4AE" }}>
                {completed}회
              </AppText>{" "}
              복용 완료
            </AppText>
          </View>
        </View>

        <View style={s.photoRow}>
          {DAILY_DOSES.map((d) => (
            <PhotoSlot key={d.slot} dose={d} />
          ))}
        </View>
      </View>

      <View style={s.sectionTitleRow}>
        <AppText type="pretendard-b" style={s.sectionTitle}>
          상세 복약 정보
        </AppText>
        <Pressable
          hitSlop={10}
          style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="add" size={18} color="#F8B835" />
        </Pressable>
      </View>

      <View style={s.pillCard}>
        {PILLS.map((p, idx) => (
          <PillRow key={p.id} pill={p} showDivider={idx < PILLS.length - 1} />
        ))}
      </View>
    </View>
  );
}

function PhotoSlot({ dose }: { dose: DailyDose }) {
  return (
    <View style={s.photoSlot}>
      <View style={[s.photoBox, dose.done ? s.photoBoxDone : s.photoBoxEmpty]}>
        {dose.photo ? (
          <Image
            source={dose.photo}
            style={{ width: "100%", height: "100%", borderRadius: 14 }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name="camera"
            size={36}
            color={dose.done ? "#999" : "#BBB"}
          />
        )}
      </View>
      <View style={s.photoLabelRow}>
        <AppText type="pretendard-b" style={s.photoLabel}>
          {dose.label}
        </AppText>
        {dose.done ? (
          <View style={s.photoCheckMint}>
            <Ionicons name="checkmark" size={10} color="#FFF" />
          </View>
        ) : (
          <View style={s.photoCheckEmpty} />
        )}
      </View>
    </View>
  );
}

function PillRow({
  pill,
  showDivider,
}: {
  pill: PillItem;
  showDivider: boolean;
}) {
  const slots: ("morning" | "noon" | "night")[] = ["morning", "noon", "night"];
  return (
    <View style={[s.pillRow, showDivider && s.pillRowDivider]}>
      <View style={s.pillIcon}>
        <MaterialCommunityIcons name="pill" size={20} color="#5BC4AE" />
      </View>
      <AppText type="pretendard-b" style={s.pillName} numberOfLines={1}>
        {pill.name}
      </AppText>
      <View style={s.slotRow}>
        {slots.map((slot) => {
          const on = pill.schedule.includes(slot);
          return (
            <View
              key={slot}
              style={[s.slotBadge, on ? s.slotBadgeOn : s.slotBadgeOff]}
            >
              <Ionicons
                name={
                  slot === "morning"
                    ? "sunny"
                    : slot === "noon"
                      ? "restaurant"
                      : "moon"
                }
                size={14}
                color={on ? "#F8B835" : "#CCC"}
              />
            </View>
          );
        })}
      </View>
      <View style={s.pillTail}>
        <MaterialCommunityIcons name="pill" size={18} color="#5BC4AE" />
      </View>
    </View>
  );
}

/* ──────────────────────── 주간 ──────────────────────── */

interface WeekDay {
  label: string;
  status: DoseStatus;
  isToday?: boolean;
  date?: number;
}

const WEEK: WeekDay[] = [
  { label: "일", status: "done" },
  { label: "월", status: "done" },
  { label: "화", status: "done" },
  { label: "수", status: "ongoing", isToday: true },
  { label: "목", status: "none" },
  { label: "금", status: "none" },
  { label: "토", status: "none" },
];

interface WeekDetailRow {
  date: string;
  morning: DoseStatus;
  noon: DoseStatus;
  night: DoseStatus;
  pill: DoseStatus;
  isToday?: boolean;
}

const WEEK_DETAIL: WeekDetailRow[] = [
  {
    date: "3월 22일 (일)",
    morning: "done",
    noon: "done",
    night: "done",
    pill: "done",
  },
  {
    date: "3월 23일 (월)",
    morning: "done",
    noon: "done",
    night: "done",
    pill: "done",
  },
  {
    date: "3월 24일 (화)",
    morning: "done",
    noon: "done",
    night: "done",
    pill: "done",
  },
  {
    date: "3월 25일 (수)",
    morning: "done",
    noon: "done",
    night: "ongoing",
    pill: "ongoing",
    isToday: true,
  },
  {
    date: "3월 26일 (목)",
    morning: "none",
    noon: "none",
    night: "none",
    pill: "none",
  },
  {
    date: "3월 27일 (금)",
    morning: "none",
    noon: "none",
    night: "none",
    pill: "none",
  },
  {
    date: "3월 28일 (토)",
    morning: "none",
    noon: "none",
    night: "none",
    pill: "none",
  },
];

function WeeklyView() {
  const successCount = WEEK.filter((d) => d.status === "done").length;
  const elapsed = WEEK.filter((d) => d.status !== "none").length;
  const percent =
    elapsed > 0 ? ((successCount / elapsed) * 100).toFixed(2) : "0";

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
                {percent}%
              </AppText>
            </View>
            <View style={s.weekProgressTrack}>
              <View
                style={[
                  s.weekProgressFill,
                  {
                    width: `${
                      elapsed > 0 ? (successCount / elapsed) * 100 : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={s.weekDayRow}>
          {WEEK.map((d, idx) => (
            <WeekDayCell key={idx} day={d} />
          ))}
        </View>
      </View>

      <AppText type="pretendard-b" style={s.sectionTitle}>
        상세일지 (3월 22일 ~ 28일)
      </AppText>

      <View style={{ gap: 8 }}>
        {WEEK_DETAIL.map((row) => (
          <WeekDetailCard key={row.date} row={row} />
        ))}
      </View>
    </View>
  );
}

function WeekDayCell({ day }: { day: WeekDay }) {
  return (
    <View style={s.weekDayCell}>
      {day.isToday && day.date != null && (
        <View style={s.todayBubble}>
          <AppText type="extrabold" style={s.todayBubbleText}>
            {day.date}
          </AppText>
        </View>
      )}
      <AppText type="pretendard-b" style={s.weekDayLabel}>
        {day.label}
      </AppText>
      <StatusDot status={day.status} />
    </View>
  );
}

function StatusDot({ status }: { status: DoseStatus }) {
  if (status === "done") {
    return (
      <View style={[s.statusDot, { backgroundColor: "#5BC4AE" }]}>
        <Ionicons name="checkmark" size={14} color="#FFF" />
      </View>
    );
  }
  if (status === "warn") {
    return (
      <View style={[s.statusDot, { backgroundColor: "#F8B835" }]}>
        <Ionicons name="alert" size={14} color="#FFF" />
      </View>
    );
  }
  if (status === "miss") {
    return (
      <View style={[s.statusDot, { backgroundColor: "#E14B4B" }]}>
        <Ionicons name="close" size={14} color="#FFF" />
      </View>
    );
  }
  if (status === "ongoing") {
    return (
      <View
        style={[
          s.statusDot,
          {
            backgroundColor: "#FFF",
            borderWidth: 2,
            borderColor: "#5BC4AE",
          },
        ]}
      >
        <Ionicons name="time" size={14} color="#5BC4AE" />
      </View>
    );
  }
  return <View style={[s.statusDot, s.statusDotEmpty]} />;
}

function WeekDetailCard({ row }: { row: WeekDetailRow }) {
  const isFuture = row.morning === "none" && !row.isToday;
  return (
    <View
      style={[
        s.detailRow,
        row.isToday && s.detailRowToday,
        isFuture && s.detailRowFuture,
      ]}
    >
      <View style={{ flex: 1 }}>
        <AppText
          type="pretendard-b"
          style={[s.detailDate, isFuture && s.detailDateFuture]}
        >
          {row.date}
        </AppText>
      </View>
      <DetailIcon kind="morning" status={row.morning} />
      <DetailIcon kind="noon" status={row.noon} />
      <DetailIcon kind="night" status={row.night} />
      <DetailIcon kind="pill" status={row.pill} />
    </View>
  );
}

function DetailIcon({
  kind,
  status,
}: {
  kind: "morning" | "noon" | "night" | "pill";
  status: DoseStatus;
}) {
  const palette = paletteFor(status);
  const iconName: IoniconName | "pill" =
    kind === "morning"
      ? "sunny"
      : kind === "noon"
        ? "restaurant"
        : kind === "night"
          ? "moon"
          : "pill";
  return (
    <View
      style={[
        s.detailIconBox,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      {iconName === "pill" ? (
        <MaterialCommunityIcons name="pill" size={20} color={palette.color} />
      ) : (
        <Ionicons name={iconName} size={20} color={palette.color} />
      )}
    </View>
  );
}

function paletteFor(status: DoseStatus) {
  if (status === "done")
    return { color: "#5BC4AE", bg: "#E8F7F2", border: "transparent" };
  if (status === "warn")
    return { color: "#F8B835", bg: "#FFF4C7", border: "transparent" };
  if (status === "miss")
    return { color: "#E14B4B", bg: "#FCEBEB", border: "transparent" };
  if (status === "ongoing")
    return { color: "#5BC4AE", bg: "#E8F7F2", border: "transparent" };
  return { color: "#CFCFCF", bg: "#F4F2EA", border: "transparent" };
}

/* ──────────────────────── 월간 ──────────────────────── */

const MONTH_LABEL = "2026년 6월";
const FIRST_DAY_OFFSET = 3; // 6/1이 수요일
const DAYS_IN_MONTH = 30;

const MONTH_STATUS: Record<number, DoseStatus> = {
  6: "done",
  7: "done",
  8: "done",
  9: "warn",
  10: "done",
  11: "miss",
  12: "done",
  13: "done",
  14: "done",
  15: "done",
  16: "done",
  17: "done",
  18: "done",
  19: "done",
  20: "done",
  21: "warn",
  22: "done",
  23: "done",
  24: "done",
};
const TODAY_DATE = 25;

function MonthlyView() {
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
            {MONTH_LABEL}
          </AppText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable style={s.monthNavBtn}>
              <Ionicons name="chevron-back" size={18} color="#5BC4AE" />
            </Pressable>
            <Pressable style={s.monthNavBtn}>
              <Ionicons name="chevron-forward" size={18} color="#5BC4AE" />
            </Pressable>
          </View>
        </View>

        <View style={s.weekHeader}>
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <AppText key={d} type="pretendard-m" style={s.weekHeaderText}>
              {d}
            </AppText>
          ))}
        </View>

        <Calendar />
      </View>

      <View style={s.sectionTitleRow}>
        <View style={s.sectionIcon}>
          <Ionicons name="clipboard-outline" size={16} color="#5BC4AE" />
        </View>
        <AppText type="pretendard-b" style={s.sectionTitle}>
          월간 상세일지
        </AppText>
      </View>

      <MonthDetailCard
        date="6월 9일 (목)"
        statuses={["warn", "done", "warn", "warn"]}
        accent="warn"
      />
      <MonthDetailCard
        date="6월 11일 (토)"
        statuses={["miss", "done", "miss", "miss"]}
        accent="miss"
      />
    </View>
  );
}

function Calendar() {
  const cells: (number | null)[] = [];
  for (let i = 0; i < FIRST_DAY_OFFSET; i++) cells.push(null);
  for (let d = 1; d <= DAYS_IN_MONTH; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={{ gap: 6 }}>
      {rows.map((row, idx) => (
        <View key={idx} style={s.calendarRow}>
          {row.map((d, ci) => (
            <CalendarCell key={ci} date={d} />
          ))}
        </View>
      ))}
    </View>
  );
}

function CalendarCell({ date }: { date: number | null }) {
  if (date == null) return <View style={s.calendarCell} />;
  const status = MONTH_STATUS[date];
  const isToday = date === TODAY_DATE;

  let bg = "transparent";
  let textColor = "#444";
  if (isToday) {
    bg = "#222";
    textColor = "#FFF";
  } else if (status === "done") {
    bg = "#5BC4AE";
    textColor = "#FFF";
  } else if (status === "warn") {
    bg = "#F8B835";
    textColor = "#FFF";
  } else if (status === "miss") {
    bg = "#E14B4B";
    textColor = "#FFF";
  }

  return (
    <View style={s.calendarCell}>
      <View style={[s.calendarDot, { backgroundColor: bg }]}>
        <AppText
          type={status || isToday ? "pretendard-b" : "pretendard-m"}
          style={[s.calendarText, { color: textColor }]}
        >
          {date}
        </AppText>
      </View>
    </View>
  );
}

function MonthDetailCard({
  date,
  statuses,
  accent,
}: {
  date: string;
  statuses: DoseStatus[];
  accent: "warn" | "miss" | "done";
}) {
  const accentColor =
    accent === "warn" ? "#F8B835" : accent === "miss" ? "#E14B4B" : "#5BC4AE";
  return (
    <View style={[s.monthDetail, { borderColor: accentColor }]}>
      <View style={[s.monthDetailBar, { backgroundColor: accentColor }]} />
      <AppText type="extrabold" style={s.monthDetailDate}>
        {date}
      </AppText>
      <View style={s.monthDetailRow}>
        {(["morning", "noon", "night", "pill"] as const).map((kind, idx) => (
          <MonthDetailBadge key={kind} kind={kind} status={statuses[idx]} />
        ))}
      </View>
    </View>
  );
}

function MonthDetailBadge({
  kind,
  status,
}: {
  kind: "morning" | "noon" | "night" | "pill";
  status: DoseStatus;
}) {
  const palette = paletteFor(status);
  const labelMap = {
    morning: "아침",
    noon: "점심",
    night: "저녁",
    pill: "복용",
  };
  return (
    <View style={s.monthDetailBadge}>
      <View style={[s.monthDetailIconBox, { backgroundColor: palette.bg }]}>
        {kind === "pill" ? (
          <MaterialCommunityIcons name="pill" size={22} color={palette.color} />
        ) : (
          <Ionicons
            name={
              kind === "morning"
                ? "sunny"
                : kind === "noon"
                  ? "restaurant"
                  : "moon"
            }
            size={22}
            color={palette.color}
          />
        )}
      </View>
      <AppText type="pretendard-m" style={s.monthDetailLabel}>
        {labelMap[kind]}
      </AppText>
    </View>
  );
}

/* ──────────────────────── 공통 helpers ──────────────────────── */

function SectionTitle({ title }: { title: string }) {
  return (
    <AppText type="pretendard-b" style={s.sectionTitle}>
      {title}
    </AppText>
  );
}

/* ──────────────────────── styles ──────────────────────── */

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
  addBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFF1C8",
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
  achieveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  percentCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: "#5BC4AE",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  percentNum: {
    fontSize: 26,
    color: "#5BC4AE",
  },
  percentLabel: {
    fontSize: 11,
    color: "#5BC4AE",
    marginTop: -2,
  },
  achieveText: {
    flex: 1,
    gap: 4,
  },
  achieveTitle: {
    fontSize: 18,
    color: "#222",
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
  photoBoxDone: {
    backgroundColor: "#E8F7F2",
  },
  photoBoxEmpty: {
    backgroundColor: "#F4F2EA",
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
  photoCheckMint: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#5BC4AE",
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
  pillTail: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#5BC4AE",
    justifyContent: "center",
    alignItems: "center",
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

  /* 월간 detail */
  monthDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingRight: 14,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  monthDetailBar: {
    width: 4,
    alignSelf: "stretch",
    marginRight: 6,
  },
  monthDetailDate: {
    fontSize: 16,
    color: "#222",
    width: 100,
  },
  monthDetailRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  monthDetailBadge: {
    alignItems: "center",
    gap: 4,
  },
  monthDetailIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  monthDetailLabel: {
    fontSize: 11,
    color: "#666",
  },
});
