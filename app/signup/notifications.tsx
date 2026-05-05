import AppText from "@/components/app-text";
import SignupProgress from "@/components/signup-progress";
import { CareMode, useSignup } from "@/contexts/signup-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ModeDef = {
  key: CareMode;
  title: string;
  subtitle: string;
  points: string[];
  recommend: string;
  color: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MODES: ModeDef[] = [
  {
    key: "intensive",
    title: "집중 안심 모드",
    subtitle: "실시간 확인과 빠른 경고",
    points: [
      "복약 완료 즉시 알림",
      "30분 이상 지연 시 경고",
      "일간·주간·월간 리포트 알림",
    ],
    recommend: "건강을 실시간으로 체크할 필요가 있는 어르신",
    color: "#F8B835",
    bg: "#FFF4C7",
    icon: "shield-checkmark",
  },
  {
    key: "basic",
    title: "기본 건강 알림 모드",
    subtitle: "꼭 필요한 알림만",
    points: ["경고 없이 복약 확인 알림만 제공", "일간·월간 리포트 알림"],
    recommend: "일상 속 간단한 복약 확인이 필요한 어르신",
    color: "#5BC4AE",
    bg: "#D6F1EA",
    icon: "leaf",
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { seniors, careModes, setCareMode } = useSignup();

  const allSelected =
    seniors.length > 0 && seniors.every((s) => careModes[s.id]);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <SignupProgress step={3} />

      <View style={styles.header}>
        <AppText type="pretendard-b" style={styles.title}>
          시니어를 어떻게 돌볼까요?
        </AppText>
        <AppText type="pretendard-r" style={styles.desc}>
          복잡한 알림 설정은 삐약이가 알맞게 맞춰드릴게요.{"\n"}
          나중에 언제든 변경할 수 있어요.
        </AppText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {seniors.map((senior) => (
          <View key={senior.id} style={styles.seniorBlock}>
            <View style={styles.seniorRow}>
              <Image
                source={require("../../assets/images/Profile.png")}
                style={styles.avatar}
                resizeMode="cover"
              />
              <AppText type="pretendard-b" style={styles.seniorName}>
                {senior.name || "이름 없음"}
                {senior.gender ? ` (${senior.gender})` : ""}
              </AppText>
            </View>

            <View style={styles.modeGroup}>
              {MODES.map((mode) => (
                <ModeCard
                  key={mode.key}
                  mode={mode}
                  selected={careModes[senior.id] === mode.key}
                  onSelect={() => setCareMode(senior.id, mode.key)}
                />
              ))}
            </View>
          </View>
        ))}

        <AppText type="pretendard-r" style={styles.note}>
          세부 알림은 가입 후 내 정보 &gt; 알림 설정에서 변경할 수 있어요.
        </AppText>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, !allSelected && styles.btnDisabled]}
          disabled={!allSelected}
          onPress={() => router.push("/signup/complete" as any)}
        >
          <AppText type="pretendard-b" style={styles.btnText}>
            다음
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ModeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: ModeDef;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        modeStyles.card,
        selected && {
          borderColor: mode.color,
          backgroundColor: mode.bg,
        },
      ]}
    >
      <View style={modeStyles.head}>
        <View style={[modeStyles.iconBox, { backgroundColor: mode.bg }]}>
          <Ionicons name={mode.icon} size={20} color={mode.color} />
        </View>
        <View style={modeStyles.headText}>
          <AppText type="pretendard-b" style={modeStyles.title}>
            {mode.title}
          </AppText>
          <AppText type="pretendard-r" style={modeStyles.subtitle}>
            {mode.subtitle}
          </AppText>
        </View>
        <View
          style={[modeStyles.radio, selected && { borderColor: mode.color }]}
        >
          {selected && (
            <View
              style={[modeStyles.radioDot, { backgroundColor: mode.color }]}
            />
          )}
        </View>
      </View>

      {selected && (
        <View style={modeStyles.details}>
          {mode.points.map((p) => (
            <View key={p} style={modeStyles.bulletRow}>
              <Ionicons name="checkmark" size={14} color={mode.color} />
              <AppText type="pretendard-r" style={modeStyles.bulletText}>
                {p}
              </AppText>
            </View>
          ))}
          <AppText type="pretendard-r" style={modeStyles.recommend}>
            추천: {mode.recommend}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    color: "#171717",
    marginBottom: 10,
  },
  desc: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 20,
  },
  seniorBlock: {
    gap: 12,
  },
  seniorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  seniorName: {
    fontSize: 16,
    color: "#171717",
  },
  modeGroup: {
    gap: 10,
  },
  note: {
    fontSize: 12,
    color: "#999999",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 8,
  },
  btn: {
    height: 54,
    backgroundColor: "#FFD24D",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    fontSize: 18,
    color: "#171717",
  },
});

const modeStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#EAEAEA",
    padding: 14,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    color: "#171717",
  },
  subtitle: {
    fontSize: 12,
    color: "#777777",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D5D5D5",
    justifyContent: "center",
    alignItems: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    gap: 6,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bulletText: {
    fontSize: 13,
    color: "#444444",
  },
  recommend: {
    fontSize: 12,
    color: "#666666",
    marginTop: 6,
  },
});
