import AppText from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MENU_ITEMS = [
  { label: "처방전 등록", emoji: "📋" },
  { label: "내 약", emoji: "💊" },
  { label: "삐약이 상점", emoji: "🛍️" },
  { label: "내 정보", emoji: "👤" },
];

export default function HomeScreen() {
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
            900🥚
          </AppText>
        </View>
        <Pressable style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={32} color="#555" />
        </Pressable>
      </View>

      {/* 캐릭터 영역 */}
      <View style={styles.characterSection}>
        <View style={styles.characterWrap}>
          <Image
            source={require("../../assets/images/Senior.png")}
            style={styles.characterImg}
            resizeMode="contain"
          />
          <Pressable
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

      {/* 사용자 정보 */}
      <View style={styles.infoRow}>
        <AppText type="pretendard-m" style={styles.userName}>
          김복순 님
        </AppText>
        <View style={styles.streakRow}>
          <AppText type="pretendard-r" style={styles.streakLabel}>
            복약 연속{" "}
          </AppText>
          <AppText type="extrabold" style={styles.streakNum}>
            90
          </AppText>
          <AppText type="pretendard-r" style={styles.streakUnit}>
            일
          </AppText>
        </View>
      </View>

      {/* 메뉴 그리드 */}
      <View style={styles.grid}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.gridRow}>
            {MENU_ITEMS.slice(row * 2, row * 2 + 2).map((item) => (
              <MenuBtn key={item.label} label={item.label} emoji={item.emoji} />
            ))}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

function MenuBtn({ label, emoji }: { label: string; emoji: string }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuBtn,
        pressed && styles.menuBtnPressed,
      ]}
    >
      <AppText style={styles.menuEmoji}>{emoji}</AppText>
      <AppText type="pretendard-s" style={styles.menuLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF7",
  },

  /* ── 헤더 ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logo: {
    width: 80,
    height: 32,
  },
  pointsBadge: {
    flex: 1,
    alignItems: "center",
  },
  pointsText: {
    fontSize: 16,
    color: "#333",
  },
  notifBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
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

  /* ── 사용자 정보 ── */
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  userName: {
    fontSize: 17,
    color: "#444",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  streakLabel: {
    fontSize: 14,
    color: "#777",
  },
  streakNum: {
    fontSize: 32,
    color: "#F88835",
    lineHeight: 36,
  },
  streakUnit: {
    fontSize: 14,
    color: "#777",
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
    aspectRatio: 1.3,
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EDE8D6",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  menuBtnPressed: {
    backgroundColor: "#FBF7EC",
    transform: [{ scale: 0.97 }],
  },
  menuEmoji: {
    fontSize: 32,
  },
  menuLabel: {
    fontSize: 15,
    color: "#333",
  },
});
