import AppText from "@/components/app-text";
import { getMe } from "@/services/auth";
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

export default function HomeScreen() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string>("");

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const me = await getMe();
          if (!cancelled) setNickname(me.nickname);
        } catch {
          // 무시
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

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
            900
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
          <View style={styles.notifDot} />
        </Pressable>
      </View>

      {/* 캐릭터 영역 */}
      <View style={styles.characterSection}>
        <View style={styles.characterWrap}>
          <Image
            source={require("../../assets/images/character/Senior3.png")}
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
            <AppText type="pretendard-m" style={styles.bubbleText}>
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
            90
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
  },
  characterWrap: {
    alignItems: "center",
  },
  characterImg: {
    width: 238,
    height: 244,
  },
  bubble: {
    position: "absolute",
    top: 8,
    right: -30,
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E8D88C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  bubbleTail: {
    position: "absolute",
    bottom: -8,
    left: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#E8D88C",
  },
  bubbleText: {
    fontSize: 14,
    color: "#333",
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
