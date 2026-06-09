import AppText from "@/components/app-text";
import { PET_STAGES, stageIndex } from "@/data/pet-stages";
import { useExitOnBack } from "@/hooks/use-exit-on-back";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError } from "@/services/api";
import { getMe } from "@/services/auth";
import {
  DailyDashboard,
  SlotStatus,
  getDashboardDaily,
} from "@/services/dashboard";
import { listNotifications } from "@/services/notifications";
import { PetMe, getMyPet } from "@/services/pets";
import { ServerMealSlot } from "@/services/user-settings";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MenuItem = {
  label: string;
  icon: ImageSourcePropType;
  description: string;
  arrowBg: string;
  arrowColor: string;
  href?: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    label: "처방전 등록",
    icon: require("../../assets/images/icon/prescript.png"),
    description: " ",
    arrowBg: "#FFF1C8",
    arrowColor: "#F8B835",
    href: "/prescription/intro",
  },
  {
    label: "내 약",
    icon: require("../../assets/images/icon/medicine.png"),
    description: " ",
    arrowBg: "#D6F1EA",
    arrowColor: "#5BC4AE",
    href: "/medications",
  },
  {
    label: "삐약이 성장기록",
    icon: require("../../assets/images/icon/ppiyaki.png"),
    description: " ",
    arrowBg: "#FFF1C8",
    arrowColor: "#F8B835",
    href: "/growth",
  },
  {
    label: "내 정보",
    icon: require("../../assets/images/icon/profile.png"),
    description: " ",
    arrowBg: "#D6F1EA",
    arrowColor: "#5BC4AE",
    href: "/profile",
  },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HomeScreen() {
  const router = useRouter();
  useRequireAuth();
  useExitOnBack();
  const [nickname, setNickname] = useState<string>("");
  const [pet, setPet] = useState<PetMe | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [daily, setDaily] = useState<DailyDashboard | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [me, petRes, notifRes] = await Promise.all([
          getMe().catch(() => null),
          getMyPet().catch((e) => {
            if (e instanceof ApiError && e.status === 404) return null;
            console.log("[home] pet fetch failed:", e);
            return null;
          }),
          listNotifications({ size: 20 }).catch(() => null),
        ]);
        if (cancelled) return;
        if (me) setNickname(me.nickname);
        if (petRes) {
          if (__DEV__) {
            console.log("[home] pet:", {
              point: petRes.point,
              level: petRes.level,
              stage: petRes.stage,
              streak: petRes.streak,
            });
          }
          setPet(petRes);
        }
        setHasUnread(
          notifRes ? notifRes.responses.some((n) => !n.isRead) : false,
        );

        // 시니어 본인의 오늘 복약 현황 — daily dashboard 를 자기 id 로 호출
        if (me?.id != null) {
          try {
            const res = await getDashboardDaily(me.id, todayIso());
            if (!cancelled) setDaily(res);
          } catch (e) {
            console.log("[home] daily fetch failed:", e);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [router]),
  );

  const streak = pet?.streak ?? 0;
  const point = pet?.point ?? 0;
  const currentStage = pet
    ? PET_STAGES[stageIndex(pet.stage)]
    : PET_STAGES[0];

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.pointsBadge}>
          <AppText type="pretendard-b" style={styles.pointsText}>
            {point}
          </AppText>
          <MaterialCommunityIcons
            name="egg-outline"
            size={18}
            color="#F8B835"
          />
        </View>
        <Pressable
          onPress={() => router.push("/notifications" as any)}
          style={styles.notifBtn}
        >
          <Ionicons name="notifications-outline" size={32} color="#555" />
          {hasUnread && <View style={styles.notifDot} />}
        </Pressable>
      </View>

      {/* 오늘 복약 현황 — 헤더 아래 가로 배치. 탭하면 알림함으로 */}
      <Pressable
        onPress={() => router.push("/notifications" as any)}
        style={({ pressed }) => [
          styles.todayRow,
          pressed && { opacity: 0.8 },
        ]}
      >
        <TodayChip slot="BREAKFAST" daily={daily} />
        <TodayChip slot="LUNCH" daily={daily} />
        <TodayChip slot="DINNER" daily={daily} />
      </Pressable>

      {/* 캐릭터 영역 */}
      <View style={styles.characterSection}>
        <View style={styles.characterWrap}>
          <Image
            source={currentStage.image}
            style={styles.characterImg}
            resizeMode="contain"
          />
          <Pressable
            onPress={() => router.push("/chat" as any)}
            style={({ pressed }) => [
              styles.bubble,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Image
              source={require("../../assets/images/icon/ppiyaki.png")}
              style={styles.bubbleIcon}
              resizeMode="contain"
            />
            <AppText type="pretendard-b" style={styles.bubbleText}>
              대화하기
            </AppText>
            <View style={styles.bubbleTail} />
          </Pressable>
        </View>
      </View>

      {/* 사용자 정보 카드 */}
      <View style={styles.infoCard}>
        <View style={styles.userBlock}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color="#5BC4AE" />
          </View>
          <AppText type="pretendard-b" style={styles.userName}>
            {nickname ? `${nickname} 님` : "  "}
          </AppText>
        </View>
        <View style={styles.divider} />
        <View style={styles.streakRow}>
          <AppText type="pretendard-m" style={styles.streakLabel}>
            연속 복약{" "}
          </AppText>
          <AppText type="extrabold" style={styles.streakNum}>
            {streak}
          </AppText>
          <AppText type="pretendard-m" style={styles.streakUnit}>
            일
          </AppText>
        </View>
      </View>

      {/* 메뉴 그리드 */}
      <View style={styles.grid}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.gridRow}>
            {MENU_ITEMS.slice(row * 2, row * 2 + 2).map((item) => (
              <MenuBtn
                key={item.label}
                item={item}
                onPress={
                  item.href ? () => router.push(item.href as any) : undefined
                }
              />
            ))}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const SLOT_META: Record<
  ServerMealSlot,
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  BREAKFAST: { icon: "sunny", label: "아침" },
  LUNCH: { icon: "restaurant", label: "점심" },
  DINNER: { icon: "moon", label: "저녁" },
};

function TodayChip({
  slot,
  daily,
}: {
  slot: ServerMealSlot;
  daily: DailyDashboard | null;
}) {
  const status: SlotStatus =
    daily?.slots.find((s) => s.slot === slot)?.status ?? "NOT_SCHEDULED";

  // 상태별 색상 + 배지 아이콘
  let iconColor = "#BBB"; // 기본(PENDING/NOT_SCHEDULED)
  let badgeColor: string | null = null;
  let badgeIcon: keyof typeof Ionicons.glyphMap = "checkmark";
  if (status === "PERFECT") {
    iconColor = "#5BC4AE";
    badgeColor = "#5BC4AE";
    badgeIcon = "checkmark";
  } else if (status === "DELAYED") {
    iconColor = "#F8B835";
    badgeColor = "#F8B835";
    badgeIcon = "time";
  } else if (status === "MISSED") {
    iconColor = "#E14B4B";
    badgeColor = "#E14B4B";
    badgeIcon = "close";
  }

  const meta = SLOT_META[slot];
  return (
    <View style={styles.todayChip}>
      <View style={styles.todayIconWrap}>
        <Ionicons name={meta.icon} size={20} color={iconColor} />
        {badgeColor && (
          <View style={[styles.todayBadge, { backgroundColor: badgeColor }]}>
            <Ionicons name={badgeIcon} size={10} color="#FFF" />
          </View>
        )}
      </View>
      <AppText type="pretendard-m" style={styles.todayLabel}>
        {meta.label}
      </AppText>
    </View>
  );
}

function MenuBtn({ item, onPress }: { item: MenuItem; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuBtn,
        pressed && styles.menuBtnPressed,
      ]}
    >
      <Image source={item.icon} style={styles.menuIcon} resizeMode="contain" />
      <AppText type="pretendard-b" style={styles.menuLabel}>
        {item.label}
      </AppText>
      <View style={styles.menuFooter}>
        <AppText type="pretendard-r" style={styles.menuDesc}>
          {item.description}
        </AppText>
        <View style={[styles.arrowCircle, { backgroundColor: item.arrowBg }]}>
          <Ionicons name="chevron-forward" size={14} color={item.arrowColor} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FDFCF3",
  },

  /* ── 헤더 ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  logo: {
    width: 80,
    height: 32,
  },
  pointsBadge: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  pointsText: {
    fontSize: 18,
    color: "#222",
  },
  notifBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  notifDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4848",
  },

  /* ── 캐릭터 ── */
  characterSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // 짧은 화면에서 캐릭터가 헤더/카드 영역으로 침범하지 않도록 클리핑
    overflow: "hidden",
  },
  characterWrap: {
    alignItems: "center",
    // 캐릭터 비율 유지하며 부모(characterSection) 안에 들어가도록 flex 기반 크기
    flex: 1,
    width: 238,
    maxHeight: 244,
    justifyContent: "center",
  },
  characterImg: {
    // 부모 가용 공간만큼 채우되 원본 크기 초과는 안 됨. resizeMode="contain" 으로 비율 유지.
    flex: 1,
    width: "100%",
    maxWidth: 238,
    maxHeight: 244,
  },
  bubble: {
    position: "absolute",
    top: 4,
    right: -36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFD24D",
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#E8B935",
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 5,
  },
  bubbleTail: {
    position: "absolute",
    bottom: -10,
    left: 24,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#E8B935",
  },
  bubbleText: {
    fontSize: 18,
    color: "#5A4500",
  },
  bubbleIcon: {
    width: 24,
    height: 24,
  },

  /* ── 오늘 복약 상태 (헤더 아래 가로 배치) ── */
  todayRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  todayChip: {
    alignItems: "center",
    gap: 4,
    minWidth: 48,
  },
  todayIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F1ECDB",
    justifyContent: "center",
    alignItems: "center",
  },
  todayBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FDFCF3",
  },
  todayLabel: {
    fontSize: 12,
    color: "#666",
  },

  /* ── 사용자 정보 카드 ── */
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  userBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D6F1EA",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 17,
    color: "#222",
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E5E5",
    marginHorizontal: 12,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flex: 1,
    justifyContent: "flex-end",
  },
  streakLabel: {
    fontSize: 14,
    color: "#444",
  },
  streakNum: {
    fontSize: 30,
    color: "#F8B835",
    lineHeight: 34,
    marginHorizontal: 2,
  },
  streakUnit: {
    fontSize: 14,
    color: "#444",
    marginLeft: 2,
  },

  /* ── 메뉴 그리드 ── */
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  menuBtn: {
    flex: 1,
    aspectRatio: 1,
    // 넓은 화면(iPad 호환 모드 등)에서 버튼이 정사각형 유지하려고 무한정 커져
    // 캐릭터/헤더 영역을 짓누르는 걸 방지. 일반 휴대폰에선 영향 없음.
    maxHeight: 150,
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  menuBtnPressed: {
    backgroundColor: "#FBF7EC",
    transform: [{ scale: 0.97 }],
  },
  menuIcon: {
    width: 60,
    height: 60,
    alignSelf: "flex-start",
  },
  menuLabel: {
    fontSize: 18,
    color: "#222",
    marginTop: 4,
  },
  menuFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuDesc: {
    fontSize: 11,
    color: "#888",
    flex: 1,
  },
  arrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
});
