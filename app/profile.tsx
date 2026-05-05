import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { logoutKakao } from "@/services/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MenuRow {
  label: string;
  danger?: boolean;
  onPress?: () => void;
}

export default function ProfileScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try {
            await logoutKakao();
          } finally {
            router.replace("/family-login");
          }
        },
      },
    ]);
  };

  const menuRows: MenuRow[] = [
    { label: "내 정보 수정" },
    { label: "내 보호자 정보" },
    { label: "알림 끄기/켜기" },
    { label: "문의 및 신고" },
    { label: "로그아웃", onPress: handleLogout },
    { label: "회원탈퇴", danger: true },
  ];

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="내 정보" />

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={styles.avatarWrap}>
              <Image
                source={require("../assets/images/Senior.png")}
                style={styles.avatar}
                resizeMode="contain"
              />
              <AppText type="pretendard-r" style={styles.avatarLabel}>
                성체 삐약이
              </AppText>
            </View>
            <View style={styles.cardInfo}>
              <AppText type="pretendard-b" style={styles.userName}>
                김복순님
              </AppText>
              <AppText type="pretendard-r" style={styles.userMeta}>
                60세/여
              </AppText>
              <View style={styles.streakRow}>
                <AppText type="pretendard-r" style={styles.streakLabel}>
                  연속 복약 일수{" "}
                </AppText>
                <AppText type="extrabold" style={styles.streakNum}>
                  90일
                </AppText>
              </View>
            </View>
            <View style={styles.cardSticker} />
          </View>

          <View style={styles.cardBottomRow}>
            <AppText type="pretendard-b" style={styles.cardBrand}>
              삐약이 카드
            </AppText>
            <AppText type="pretendard-r" style={styles.cardDate}>
              2026.04.28
            </AppText>
          </View>
        </View>

        <View style={styles.menu}>
          {menuRows.map((row) => (
            <Pressable
              key={row.label}
              onPress={row.onPress}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && { backgroundColor: "#FBF7EC" },
              ]}
            >
              <AppText
                type="pretendard-m"
                style={[styles.menuLabel, row.danger && { color: "#E14B4B" }]}
              >
                {row.label}
              </AppText>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={row.danger ? "#E14B4B" : "#BBB"}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FEFDFB" },
  content: { flex: 1, padding: 16 },

  card: {
    backgroundColor: "#FFD045",
    marginTop: 24,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardTopRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: { alignItems: "center", marginRight: 14 },
  avatar: { width: 78, height: 78 },
  avatarLabel: { fontSize: 11, color: "#5A4500", marginTop: 2 },
  cardInfo: { flex: 1 },
  userName: { fontSize: 20, color: "#171717" },
  userMeta: { fontSize: 13, color: "#5A4500", marginTop: 2 },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#FFFCE5",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  streakLabel: { fontSize: 12, color: "#5A4500" },
  streakNum: { fontSize: 14, color: "#E14B4B" },
  cardSticker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
  },

  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    marginBottom: 12,
  },
  cardBrand: { fontSize: 16, color: "#E14B4B" },
  cardDate: { fontSize: 13, color: "#7A5C00" },

  menu: { marginTop: 40, gap: 20 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EAD6",
  },
  menuLabel: { fontSize: 16, color: "#222" },
});
