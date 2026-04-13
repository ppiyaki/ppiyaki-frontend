import AppText from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Pressable style={styles.logBtn}>
          <AppText type="pretendard-m" style={styles.logText}>
            로그
          </AppText>
        </Pressable>
        <AppText type="pretendard-b" style={styles.points}>
          900알
        </AppText>
        <Pressable style={styles.notifBtn}>
          <AppText type="pretendard-r" style={styles.notifText}>
            알림
          </AppText>
          <Ionicons name="notifications-outline" size={20} color="#444444" />
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
          <View style={styles.bubble}>
            <AppText type="pretendard-m" style={styles.bubbleText}>
              대화하기
            </AppText>
          </View>
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
            90일
          </AppText>
        </View>
      </View>

      {/* 메뉴 그리드 */}
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <MenuBtn label="처방전 등록" />
          <MenuBtn label="내 약" />
        </View>
        <View style={styles.gridRow}>
          <MenuBtn label="삐악이 상점" />
          <MenuBtn label="내 정보" />
        </View>
      </View>
    </SafeAreaView>
  );
}

function MenuBtn({ label }: { label: string }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuBtn, pressed && styles.menuBtnPressed]}
    >
      <AppText type="pretendard-m" style={styles.menuLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C8B860",
    backgroundColor: "#FFFDF7",
  },
  logText: {
    fontSize: 14,
    color: "#555555",
  },
  points: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    color: "#171717",
  },
  notifBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  notifText: {
    fontSize: 14,
    color: "#444444",
  },
  characterSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  characterWrap: {
    position: "relative",
    width: 200,
    height: 200,
  },
  characterImg: {
    width: 200,
    height: 200,
  },
  bubble: {
    position: "absolute",
    top: 12,
    right: -22,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0D480",
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleText: {
    fontSize: 13,
    color: "#333333",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  userName: {
    fontSize: 16,
    color: "#555555",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  streakLabel: {
    fontSize: 14,
    color: "#555555",
  },
  streakNum: {
    fontSize: 30,
    color: "#171717",
    lineHeight: 34,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  gridRow: {
    flexDirection: "row",
    gap: 10,
  },
  menuBtn: {
    flex: 1,
    aspectRatio: 1.15,
    backgroundColor: "#EDE8D6",
    borderRadius: 16,
    justifyContent: "flex-end",
    paddingBottom: 16,
    paddingLeft: 14,
  },
  menuBtnPressed: {
    opacity: 0.82,
  },
  menuLabel: {
    fontSize: 16,
    color: "#333333",
  },
});
