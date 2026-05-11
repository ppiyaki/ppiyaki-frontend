import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Badge, BADGES } from "@/data/badges";
import { ApiError } from "@/services/api";
import { getMe } from "@/services/auth";
import { getMyPet, PetMe, PetStage } from "@/services/pets";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface Stage {
  key: PetStage;
  label: string;
  image: ImageSourcePropType;
  threshold: number;
  /** {name} 자리에 시니어 닉네임이 들어감 */
  message: string;
}

const STAGES: Stage[] = [
  {
    key: "EGG",
    label: "알",
    image: require("../assets/images/character/Senior1.png"),
    threshold: 0,
    message: "{name}님, 저와 함께 건강한 습관을 만들어봐요!",
  },
  {
    key: "CRACKED_EGG",
    label: "금 간 알",
    image: require("../assets/images/character/Senior2.png"),
    threshold: 3,
    message: "조금만 더 힘내세요!\n곧 세상 밖으로 나갈 것 같아요!",
  },
  {
    key: "BABY",
    label: "아기 삐약이",
    image: require("../assets/images/character/Senior3.png"),
    threshold: 7,
    message: "덕분에 제가 태어났어요!\n우리 계속 같이 힘내요!",
  },
  {
    key: "HEALTHY",
    label: "건강 삐약이",
    image: require("../assets/images/character/Senior4.png"),
    threshold: 14,
    message: "이제 저도 건강해졌어요.\n{name}님도 몸이 가뿐하시죠?",
  },
  {
    key: "GUARDIAN",
    label: "수호 삐약이",
    image: require("../assets/images/character/Senior5.png"),
    threshold: 30,
    message: "{name}은 진정한 건강 왕!\n제가 계속 지켜드릴게요.",
  },
  {
    key: "EMPEROR",
    label: "황제 삐약이",
    image: require("../assets/images/character/Senior6.png"),
    threshold: 100,
    message: "{name}님의 꾸준함은 정말 멋져요!\n당신을 존경합니다.",
  },
];

function formatStageMessage(template: string, name: string): string {
  const safeName = name.trim().length > 0 ? name : "어르신";
  return template.replaceAll("{name}", safeName);
}

export default function GrowthScreen() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string>("");
  const [pet, setPet] = useState<PetMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [petMissing, setPetMissing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        setLoading(true);
        try {
          const [me, petRes] = await Promise.all([
            getMe().catch(() => null),
            getMyPet().catch((e) => {
              if (e instanceof ApiError && e.status === 404) {
                setPetMissing(true);
                return null;
              }
              throw e;
            }),
          ]);
          if (cancelled) return;
          if (me) setNickname(me.nickname);
          if (petRes) {
            setPet(petRes);
            setPetMissing(false);
          }
        } catch (e) {
          console.log("[growth] load failed:", e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const streak = pet?.streak ?? 0;
  const point = pet?.point ?? 0;
  const currentStageIdx = pet
    ? STAGES.findIndex((s) => s.key === pet.stage)
    : getCurrentStageIdx(streak);
  const safeIdx = currentStageIdx < 0 ? 0 : currentStageIdx;
  const currentStage = STAGES[safeIdx];
  const nextStage = STAGES[safeIdx + 1];
  const progress = nextStage ? Math.min(streak / nextStage.threshold, 1) : 1;
  const daysLeft = nextStage ? Math.max(nextStage.threshold - streak, 0) : 0;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="삐약이 성장기록" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading && !pet && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#FFD24D" />
          </View>
        )}

        {!loading && (
          <>
            {/* 현재 단계 카드 */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.bubble}>
                  <AppText type="pretendard-b" style={styles.bubbleText}>
                    {streak}일째{"\n"}함께하고 있어요!
                  </AppText>
                </View>
                <Image
                  source={currentStage.image}
                  style={styles.heroChar}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.heroInfo}>
                <View style={styles.levelChip}>
                  <MaterialCommunityIcons
                    name="star-four-points"
                    size={12}
                    color="#F8B835"
                  />
                  <AppText type="pretendard-b" style={styles.levelChipText}>
                    Lv. {pet?.level ?? 0}
                  </AppText>
                </View>
                <AppText type="pretendard-b" style={styles.heroTitle}>
                  {currentStage.label}
                </AppText>
                <AppText type="pretendard-m" style={styles.heroDesc}>
                  {petMissing
                    ? "복약을 시작하면 삐약이가 깨어나요!"
                    : formatStageMessage(currentStage.message, nickname)}
                </AppText>
              </View>

              <View style={styles.statRow}>
                <StatBox
                  icon="calendar"
                  iconColor="#5BC4AE"
                  iconBg="#D6F1EA"
                  label="연속 복약"
                  value={`${streak}`}
                  unit="일"
                  valueColor="#5BC4AE"
                />
                <StatBox
                  materialIcon="egg-outline"
                  iconColor="#F8B835"
                  iconBg="#FFF1C8"
                  label="보유 알"
                  value={`${point}`}
                  unit="개"
                  valueColor="#F8B835"
                />
              </View>
            </View>

            {/* 다음 성장 단계 */}
            <View style={styles.section}>
              <AppText type="pretendard-b" style={styles.sectionTitle}>
                다음 성장 단계
              </AppText>
              <View style={styles.stageCard}>
                {nextStage ? (
                  <AppText type="pretendard-m" style={styles.stageCaption}>
                    {nextStage.label}까지{" "}
                    <AppText type="extrabold" style={styles.stageCaptionNum}>
                      {daysLeft}일
                    </AppText>{" "}
                    남았어요
                  </AppText>
                ) : (
                  <AppText type="pretendard-m" style={styles.stageCaption}>
                    최고 단계에 도달했어요!
                  </AppText>
                )}

                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress * 100}%` },
                      ]}
                    />
                  </View>
                  <AppText type="pretendard-b" style={styles.progressLabel}>
                    {streak}
                    <AppText type="pretendard-r" style={styles.progressTotal}>
                      /{nextStage?.threshold ?? streak}일
                    </AppText>
                  </AppText>
                </View>

                <View style={styles.timeline}>
                  {STAGES.map((stage, idx) => {
                    const reached = idx <= currentStageIdx;
                    const isCurrent = idx === currentStageIdx;
                    return (
                      <View key={stage.key} style={styles.timelineItem}>
                        <View
                          style={[
                            styles.stageCircle,
                            reached && styles.stageCircleReached,
                            isCurrent && styles.stageCircleCurrent,
                          ]}
                        >
                          <Image
                            source={stage.image}
                            style={[
                              styles.stageImg,
                              !reached && styles.stageImgLocked,
                            ]}
                            resizeMode="contain"
                          />
                          {reached && !isCurrent && (
                            <View style={styles.checkBadge}>
                              <Ionicons
                                name="checkmark"
                                size={10}
                                color="#FFF"
                              />
                            </View>
                          )}
                          {!reached && (
                            <View style={styles.lockBadge}>
                              <Ionicons
                                name="lock-closed"
                                size={9}
                                color="#FFF"
                              />
                            </View>
                          )}
                        </View>
                        <AppText
                          type={isCurrent ? "pretendard-b" : "pretendard-m"}
                          style={[
                            styles.stageLabel,
                            isCurrent && styles.stageLabelCurrent,
                            !reached && styles.stageLabelLocked,
                          ]}
                          numberOfLines={2}
                        >
                          {stage.label}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 칭찬 뱃지 */}
            <View style={styles.section}>
              <AppText type="pretendard-b" style={styles.sectionTitle}>
                칭찬 뱃지
              </AppText>
              <View style={styles.badgeCard}>
                <View style={styles.badgeGrid}>
                  {BADGES.slice(0, 3).map((badge) => (
                    <BadgeItem key={badge.key} badge={badge} />
                  ))}
                </View>
                <Pressable
                  onPress={() => router.push("/badges" as any)}
                  style={({ pressed }) => [
                    styles.badgeMore,
                    pressed && { backgroundColor: "#F4FBF9" },
                  ]}
                >
                  <AppText type="pretendard-b" style={styles.badgeMoreText}>
                    전체 뱃지 보기
                  </AppText>
                  <Ionicons name="chevron-forward" size={16} color="#5BC4AE" />
                </Pressable>
              </View>
            </View>

            {/* 안내 */}
            <View style={styles.note}>
              <MaterialCommunityIcons
                name="egg-outline"
                size={18}
                color="#F8B835"
              />
              <AppText type="pretendard-m" style={styles.noteText}>
                알은 복약을 잘 챙길수록 쌓여요!
              </AppText>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type MaterialName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function StatBox({
  icon,
  materialIcon,
  iconColor,
  iconBg,
  label,
  value,
  unit,
  valueColor,
}: {
  icon?: IoniconName;
  materialIcon?: MaterialName;
  iconColor?: string;
  iconBg: string;
  label: string;
  value: string;
  unit: string;
  valueColor: string;
}) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        {icon ? (
          <Ionicons name={icon} size={20} color={iconColor} />
        ) : (
          <MaterialCommunityIcons
            name={materialIcon!}
            size={22}
            color={iconColor}
          />
        )}
      </View>
      <View style={styles.statText}>
        <AppText type="pretendard-m" style={styles.statLabel}>
          {label}
        </AppText>
        <View style={styles.statValueRow}>
          <AppText
            type="extrabold"
            style={[styles.statValue, { color: valueColor }]}
          >
            {value}
          </AppText>
          <AppText type="pretendard-m" style={styles.statUnit}>
            {unit}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function BadgeItem({ badge }: { badge: Badge }) {
  return (
    <View style={styles.badgeItem}>
      <View style={styles.badgeImgWrap}>
        <Image
          source={badge.image}
          style={[styles.badgeImg, !badge.unlocked && styles.badgeImgLocked]}
          resizeMode="contain"
        />
        {!badge.unlocked && (
          <View style={styles.badgeLock}>
            <Ionicons name="lock-closed" size={12} color="#FFF" />
          </View>
        )}
      </View>
      <AppText
        type="pretendard-m"
        style={[styles.badgeLabel, !badge.unlocked && styles.badgeLabelLocked]}
      >
        {badge.label}
      </AppText>
    </View>
  );
}

function getCurrentStageIdx(streak: number): number {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (streak >= STAGES[i].threshold) return i;
  }
  return 0;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 20,
  },
  loadingBox: { paddingVertical: 80, alignItems: "center" },

  /* ── 현재 단계 카드 ── */
  heroCard: {
    backgroundColor: "#FEE68A",
    borderRadius: 26,
    padding: 20,
    gap: 14,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bubble: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#FFD24D",
    flex: 1,
    marginRight: 8,
  },
  bubbleText: {
    fontSize: 14,
    color: "#5A4500",
    textAlign: "center",
  },
  heroChar: {
    width: 130,
    height: 130,
  },
  heroInfo: {
    alignItems: "center",
    gap: 6,
  },
  levelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#FFD24D",
  },
  levelChipText: {
    fontSize: 13,
    color: "#5A4500",
  },
  heroTitle: {
    fontSize: 26,
    color: "#222",
  },
  heroDesc: {
    fontSize: 14,
    color: "#5A4500",
    textAlign: "center",
    lineHeight: 20,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statText: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#777",
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  statValue: {
    fontSize: 22,
  },
  statUnit: {
    fontSize: 13,
    color: "#555",
  },

  /* ── 섹션 공통 ── */
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    color: "#222",
    paddingHorizontal: 4,
  },

  /* ── 다음 단계 카드 ── */
  stageCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  stageCaption: {
    fontSize: 15,
    color: "#444",
  },
  stageCaptionNum: {
    fontSize: 16,
    color: "#F8B835",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 10,
    backgroundColor: "#F0EDE0",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFD24D",
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 16,
    color: "#222",
  },
  progressTotal: {
    fontSize: 12,
    color: "#888",
  },
  timeline: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timelineItem: {
    alignItems: "center",
    width: 50,
    gap: 6,
  },
  stageCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F4F2EA",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  stageCircleReached: {
    backgroundColor: "#FFF4C7",
  },
  stageCircleCurrent: {
    backgroundColor: "#FFE9A8",
    borderWidth: 2,
    borderColor: "#F8B835",
  },
  stageImg: {
    width: 36,
    height: 36,
  },
  stageImgLocked: {
    opacity: 0.35,
  },
  checkBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#5BC4AE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  lockBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#BBB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  stageLabel: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    lineHeight: 14,
  },
  stageLabelCurrent: {
    color: "#222",
  },
  stageLabelLocked: {
    color: "#AAA",
  },

  /* ── 뱃지 카드 ── */
  badgeCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  badgeGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  badgeItem: {
    alignItems: "center",
    gap: 8,
    width: 88,
  },
  badgeImgWrap: {
    width: 72,
    height: 72,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeImg: {
    width: "100%",
    height: "100%",
  },
  badgeImgLocked: {
    opacity: 0.35,
  },
  badgeLock: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#BBB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  badgeLabel: {
    fontSize: 12,
    color: "#444",
    textAlign: "center",
    lineHeight: 16,
  },
  badgeLabelLocked: {
    color: "#AAA",
  },
  badgeMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#BDEFEA",
  },
  badgeMoreText: {
    fontSize: 14,
    color: "#5BC4AE",
  },

  /* ── 안내 ── */
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  noteText: {
    fontSize: 13,
    color: "#666",
  },
});
