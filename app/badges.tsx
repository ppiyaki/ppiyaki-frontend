import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Badge, BADGES } from "@/data/badges";
import { Ionicons } from "@expo/vector-icons";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BadgesScreen() {
  const unlockedCount = BADGES.filter((b) => b.unlocked).length;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="칭찬 뱃지" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 진행 요약 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryText}>
            <AppText type="pretendard-m" style={styles.summaryLabel}>
              지금까지 받은 뱃지
            </AppText>
            <View style={styles.summaryRow}>
              <AppText type="extrabold" style={styles.summaryNum}>
                {unlockedCount}
              </AppText>
              <AppText type="pretendard-m" style={styles.summaryTotal}>
                / {BADGES.length}개
              </AppText>
            </View>
          </View>
          <Ionicons name="trophy" size={44} color="#F8B835" />
        </View>

        {/* 뱃지 리스트 */}
        <View style={styles.list}>
          {BADGES.map((badge) => (
            <BadgeRow key={badge.key} badge={badge} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BadgeRow({ badge }: { badge: Badge }) {
  return (
    <View style={[styles.row, !badge.unlocked && styles.rowLocked]}>
      <View style={styles.imgWrap}>
        <Image
          source={badge.image}
          style={[styles.img, !badge.unlocked && styles.imgLocked]}
          resizeMode="contain"
        />
        {!badge.unlocked && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={14} color="#FFF" />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <AppText type="pretendard-b" style={styles.label}>
          {badge.label.replace(/\n/g, " ")}
        </AppText>
        <AppText type="pretendard-m" style={styles.description}>
          {badge.description}
        </AppText>
        <View style={styles.conditionRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: badge.unlocked ? "#5BC4AE" : "#BBB" },
            ]}
          />
          <AppText type="pretendard-m" style={styles.condition}>
            {badge.unlocked ? "획득 완료" : badge.condition}
          </AppText>
        </View>
      </View>
    </View>
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
    paddingBottom: 32,
    gap: 16,
  },

  /* ── 요약 카드 ── */
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEE68A",
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  summaryText: {
    gap: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#5A4500",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  summaryNum: {
    fontSize: 32,
    color: "#222",
  },
  summaryTotal: {
    fontSize: 16,
    color: "#5A4500",
  },
  /* ── 리스트 ── */
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  rowLocked: {
    backgroundColor: "#FAFAF6",
  },
  imgWrap: {
    width: 72,
    height: 72,
    justifyContent: "center",
    alignItems: "center",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  imgLocked: {
    opacity: 0.35,
  },
  lockBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#BBB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  body: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 17,
    color: "#222",
  },
  description: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  conditionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  condition: {
    fontSize: 12,
    color: "#888",
  },
});
