import AppText from "@/components/app-text";
import { PET_STAGES, stageIndex } from "@/data/pet-stages";
import { ApiError } from "@/services/api";
import { PetMe, getMyPet } from "@/services/pets";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const REWARD_POINTS = 10;

export default function DoseConfirmSuccessScreen() {
  const router = useRouter();
  const [pet, setPet] = useState<PetMe | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const p = await getMyPet();
        if (!cancelled) setPet(p);
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) {
          console.log("[dose-confirm/success] pet fetch failed:", e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentStage = pet
    ? PET_STAGES[stageIndex(pet.stage)]
    : PET_STAGES[0];
  const streak = pet?.streak ?? 0;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.center}>
        <Animated.View
          entering={ZoomIn.duration(400)}
          style={styles.charWrap}
        >
          <Image
            source={currentStage.image}
            style={styles.char}
            resizeMode="contain"
          />
          <View style={styles.successBadge}>
            <Ionicons name="checkmark" size={26} color="#FFF" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <AppText type="extrabold" style={styles.title}>
            참 잘하셨어요!
          </AppText>
          <AppText type="pretendard-m" style={styles.desc}>
            오늘의 복약을 완료했어요
          </AppText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.rewardCard}
        >
          <View style={styles.rewardIconBox}>
            <MaterialCommunityIcons
              name="egg-outline"
              size={32}
              color="#F8B835"
            />
          </View>
          <View style={styles.rewardText}>
            <AppText type="pretendard-m" style={styles.rewardLabel}>
              알 보상을 받았어요!
            </AppText>
            <AppText type="extrabold" style={styles.rewardValue}>
              +{REWARD_POINTS}알
            </AppText>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(550).duration(400)}
          style={styles.streakRow}
        >
          <Ionicons name="flame" size={16} color="#5BC4AE" />
          <AppText type="pretendard-b" style={styles.streakText}>
            {streak}일 연속 복약 도전 중!
          </AppText>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.replace("/(tabs)" as any)}
          style={({ pressed }) => [
            styles.btn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <AppText type="pretendard-b" style={styles.btnText}>
            홈으로 돌아가기
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  charWrap: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  char: {
    width: 180,
    height: 180,
  },
  successBadge: {
    position: "absolute",
    right: 14,
    bottom: 18,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#5BC4AE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFDF6",
  },
  title: {
    fontSize: 28,
    color: "#222",
    textAlign: "center",
    marginBottom: 4,
  },
  desc: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF4C7",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#FFE9A8",
    marginTop: 8,
  },
  rewardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  rewardText: {
    gap: 2,
  },
  rewardLabel: {
    fontSize: 13,
    color: "#7A5C00",
  },
  rewardValue: {
    fontSize: 22,
    color: "#F8B835",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  streakText: {
    fontSize: 14,
    color: "#5BC4AE",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  btn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFD24D",
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    fontSize: 17,
    color: "#222",
  },
});
