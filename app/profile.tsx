import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { getMe, logoutKakao } from "@/services/auth";
import { PetMe, getMyPet } from "@/services/pets";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface MainAction {
  label: string;
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  onPress?: () => void;
}

interface SubMenuRow {
  label: string;
  onPress?: () => void;
}

function formatToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const [nickname, setNickname] = useState<string>("");
  const [pet, setPet] = useState<PetMe | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [me, petRes] = await Promise.all([
          getMe().catch(() => null),
          getMyPet().catch((e) => {
            if (e instanceof ApiError && e.status === 404) return null;
            console.log("[profile] pet fetch failed:", e);
            return null;
          }),
        ]);
        if (cancelled) return;
        if (me) setNickname(me.nickname);
        if (petRes) setPet(petRes);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const streak = pet?.streak ?? 0;

  const handleLogout = async () => {
    const ok = await confirm({
      title: "로그아웃",
      message: "정말 로그아웃 하시겠어요?",
      confirmText: "로그아웃",
      danger: true,
    });
    if (!ok) return;
    try {
      await logoutKakao();
    } finally {
      router.replace("/family-login");
    }
  };

  const handleWithdraw = () => {
    router.push("/settings/senior-withdraw" as any);
  };

  const mainActions: MainAction[] = [
    {
      label: "내 정보 수정",
      icon: "create-outline",
      iconColor: "#F8B835",
      iconBg: "#FFF1C8",
      onPress: () => router.push("/settings/edit-profile" as any),
    },
    {
      label: "식사 시간 설정",
      icon: "time-outline",
      iconColor: "#F8B835",
      iconBg: "#FFF4C7",
      onPress: () => router.push("/settings/meal-times" as any),
    },
    {
      label: "앱 정보",
      icon: "information-circle-outline",
      iconColor: "#5BC4AE",
      iconBg: "#D6F1EA",
      onPress: () => router.push("/settings/app-info" as any),
    },
  ];

  const subMenu: SubMenuRow[] = [
    { label: "내 보호자 정보" },
    { label: "문의 및 신고" },
    { label: "계정 나가기", onPress: handleLogout },
  ];

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="내 정보" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 요약 카드 */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.avatarRing}>
              <Image
                source={require("../assets/images/pf/pfimg4.png")}
                style={styles.avatar}
                resizeMode="cover"
              />
            </View>
            <View style={styles.cardInfo}>
              <AppText type="pretendard-b" style={styles.userName}>
                {nickname ? `${nickname}님` : " "}
              </AppText>
              <View style={styles.streakBadge}>
                <AppText type="pretendard-m" style={styles.streakLabel}>
                  연속 복약{" "}
                </AppText>
                <AppText type="extrabold" style={styles.streakNum}>
                  {streak}
                </AppText>
                <AppText type="pretendard-m" style={styles.streakLabel}>
                  일
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.cardBottom}>
            <Image
              source={require("../assets/images/card_text.png")}
              style={styles.cardBrandImg}
              resizeMode="contain"
            />
            <AppText type="pretendard-m" style={styles.cardDate}>
              {formatToday()}
            </AppText>
          </View>
        </View>

        {/* 자주 쓰는 메뉴 */}
        <View style={styles.section}>
          <AppText type="pretendard-b" style={styles.sectionTitle}>
            자주 쓰는 메뉴
          </AppText>
          <View style={styles.actionGroup}>
            {mainActions.map((action) => (
              <ActionButton key={action.label} action={action} />
            ))}
          </View>
        </View>

        {/* 기타 */}
        <View style={styles.section}>
          <AppText type="pretendard-b" style={styles.sectionTitle}>
            기타
          </AppText>
          <View style={styles.subMenuCard}>
            {subMenu.map((row, idx) => (
              <SubMenuItem
                key={row.label}
                row={row}
                showDivider={idx < subMenu.length - 1}
              />
            ))}
          </View>
        </View>

        {/* 위험 영역 */}
        <Pressable
          onPress={handleWithdraw}
          style={({ pressed }) => [
            styles.dangerRow,
            pressed && { opacity: 0.6 },
          ]}
        >
          <View style={styles.dangerTextWrap}>
            <AppText type="pretendard-b" style={styles.dangerLabel}>
              회원탈퇴
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C95C5C" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ action }: { action: MainAction }) {
  return (
    <Pressable
      onPress={action.onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        pressed && { backgroundColor: "#FBF7EC" },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: action.iconBg }]}>
        <Ionicons name={action.icon} size={26} color={action.iconColor} />
      </View>
      <AppText type="pretendard-b" style={styles.actionLabel}>
        {action.label}
      </AppText>
      <Ionicons name="chevron-forward" size={20} color="#BBB" />
    </Pressable>
  );
}

function SubMenuItem({
  row,
  showDivider,
}: {
  row: SubMenuRow;
  showDivider: boolean;
}) {
  return (
    <Pressable
      onPress={row.onPress}
      style={({ pressed }) => [
        styles.subMenuRow,
        showDivider && styles.subMenuDivider,
        pressed && { backgroundColor: "#FBF7EC" },
      ]}
    >
      <AppText type="pretendard-b" style={styles.subMenuLabel}>
        {row.label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color="#BBB" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 24,
  },

  /* ── 프로필 카드 ── */
  card: {
    backgroundColor: "#FEE68A",
    borderRadius: 26,
    padding: 22,
    gap: 14,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 26,
    color: "#222",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    alignSelf: "flex-start",
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 6,
  },
  streakLabel: {
    fontSize: 14,
    color: "#5A4500",
  },
  streakNum: {
    fontSize: 18,
    color: "#E9824A",
    marginHorizontal: 2,
  },
  cardSubText: {
    fontSize: 16,
    color: "#5A4500",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  cardBrandImg: {
    width: 100,
    height: 24,
  },
  cardDate: {
    fontSize: 16,
    color: "#FB974E",
  },

  /* ── 섹션 공통 ── */
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    color: "#222",
    paddingHorizontal: 4,
  },

  /* ── 자주 쓰는 메뉴 ── */
  actionGroup: {
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 22,
    color: "#222",
  },

  /* ── 기타 (서브 메뉴) ── */
  subMenuCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    overflow: "hidden",
  },
  subMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 76,
  },
  subMenuDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEE7D6",
  },
  subMenuLabel: {
    flex: 1,
    fontSize: 21,
    color: "#222",
  },

  /* ── 위험 영역 ── */
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 8,
  },
  dangerTextWrap: {
    flex: 1,
    gap: 2,
  },
  dangerLabel: {
    fontSize: 17,
    color: "#C95C5C",
  },
  dangerDesc: {
    fontSize: 13,
    color: "#A07474",
  },
});
