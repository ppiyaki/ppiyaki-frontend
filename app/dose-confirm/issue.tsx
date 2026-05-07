import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DoseConfirmIssueScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { uri, attempts, scheduleId, targetDate } = useLocalSearchParams<{
    uri?: string;
    attempts?: string;
    scheduleId?: string;
    targetDate?: string;
  }>();

  const attemptCount = Number(attempts ?? "1");
  const showFamilyHelp = attemptCount >= 2;

  const handleRetry = () => {
    router.replace({
      pathname: "/dose-confirm/camera" as any,
      params: {
        attempts: String(attemptCount + 1),
        scheduleId,
        targetDate,
      },
    });
  };

  const handleAskFamily = async () => {
    const ok = await confirm({
      title: "보호자에게 알릴까요?",
      message:
        "보호자에게 도움을 요청하는 알림이 전송돼요.\n잠시 뒤 보호자가 연락드릴 거예요.",
      confirmText: "도움 요청",
    });
    if (!ok) return;
    // TODO: 보호자 알림 API 연결
    router.replace("/(tabs)" as any);
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
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="help-circle" size={42} color="#F8B835" />
          </View>
        </View>

        <AppText type="extrabold" style={styles.title}>
          {showFamilyHelp
            ? "약 확인이 잘 안 되네요"
            : "약 개수가 조금 다른 것 같아요"}
        </AppText>
        <AppText type="pretendard-m" style={styles.desc}>
          {showFamilyHelp
            ? "사진을 다시 찍거나, 보호자에게\n도움을 요청해보세요"
            : "조금 더 밝은 곳에서 다시 한 번\n찍어볼까요?"}
        </AppText>

        {uri && (
          <View style={styles.imageBox}>
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.imageDim} />
            <View style={styles.imageBadge}>
              <AppText type="pretendard-b" style={styles.imageBadgeText}>
                방금 찍은 사진
              </AppText>
            </View>
          </View>
        )}

        <View style={styles.tipCard}>
          <AppText type="pretendard-b" style={styles.tipTitle}>
            이렇게 다시 찍어보세요
          </AppText>
          <TipBullet text="조명이 밝은 곳으로 이동해주세요" />
          <TipBullet text="약을 손바닥 위에 올리고 가까이서 찍어주세요" />
          <TipBullet text="흔들리지 않게 천천히 찍어주세요" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {showFamilyHelp && (
          <Pressable
            onPress={handleAskFamily}
            style={({ pressed }) => [
              styles.helpBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons name="people" size={22} color="#FFF" />
            <AppText type="pretendard-b" style={styles.helpBtnText}>
              보호자에게 도움 요청하기
            </AppText>
          </Pressable>
        )}
        <Pressable
          onPress={handleRetry}
          style={({ pressed }) => [
            styles.retryBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="camera-reverse" size={22} color="#222" />
          <AppText type="pretendard-b" style={styles.retryBtnText}>
            다시 찍기
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function TipBullet({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipDot} />
      <AppText type="pretendard-m" style={styles.tipText}>
        {text}
      </AppText>
    </View>
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
    paddingBottom: 20,
    gap: 14,
  },
  iconWrap: {
    alignItems: "center",
    paddingVertical: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF4C7",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    color: "#222",
    textAlign: "center",
  },
  desc: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 6,
  },
  imageBox: {
    width: "100%",
    aspectRatio: 1.6,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F4F2EA",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  imageBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  imageBadgeText: {
    fontSize: 11,
    color: "#FFF",
  },
  tipCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    gap: 8,
  },
  tipTitle: {
    fontSize: 14,
    color: "#222",
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#F8B835",
  },
  tipText: {
    fontSize: 13,
    color: "#555",
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  helpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#E14B4B",
  },
  helpBtnText: {
    fontSize: 16,
    color: "#FFF",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFD24D",
  },
  retryBtnText: {
    fontSize: 16,
    color: "#222",
  },
});
