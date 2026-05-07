import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DoseConfirmPreviewScreen() {
  const router = useRouter();
  const { uri, scheduleId, targetDate, attempts } = useLocalSearchParams<{
    uri?: string;
    scheduleId?: string;
    targetDate?: string;
    attempts?: string;
  }>();

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="사진 확인" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <AppText type="extrabold" style={styles.title}>
          잘 찍혔나요?
        </AppText>
        <AppText type="pretendard-m" style={styles.desc}>
          약이 또렷하게 보이는지 확인해주세요
        </AppText>

        <View style={styles.imageBox}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={42} color="#BBB" />
            </View>
          )}
        </View>

        <View style={styles.checklistCard}>
          <ChecklistRow text="약이 또렷하게 보이나요?" />
          <ChecklistRow text="약이 모두 사진에 들어왔나요?" />
          <ChecklistRow text="너무 어둡거나 흐릿하지 않나요?" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() =>
            router.replace({
              pathname: "/dose-confirm/camera" as any,
              params: { scheduleId, targetDate, attempts },
            })
          }
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="camera-reverse" size={20} color="#222" />
          <AppText type="pretendard-b" style={styles.btnSecondaryText}>
            다시 찍기
          </AppText>
        </Pressable>
        <Pressable
          onPress={() =>
            router.replace({
              pathname: "/dose-confirm/analyzing" as any,
              params: { uri, scheduleId, targetDate, attempts },
            })
          }
          style={({ pressed }) => [
            styles.btn,
            styles.btnPrimary,
            pressed && { opacity: 0.85 },
          ]}
        >
          <AppText type="pretendard-b" style={styles.btnPrimaryText}>
            확인 완료
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ChecklistRow({ text }: { text: string }) {
  return (
    <View style={styles.checklistRow}>
      <View style={styles.checkBullet}>
        <Ionicons name="checkmark" size={12} color="#FFF" />
      </View>
      <AppText type="pretendard-m" style={styles.checklistText}>
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
    paddingTop: 12,
    paddingBottom: 20,
    gap: 14,
  },
  title: {
    fontSize: 24,
    color: "#222",
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 6,
  },
  imageBox: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 22,
    backgroundColor: "#FFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  checklistCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    gap: 10,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#5BC4AE",
    justifyContent: "center",
    alignItems: "center",
  },
  checklistText: {
    fontSize: 14,
    color: "#444",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 56,
    borderRadius: 14,
  },
  btnSecondary: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E5E0CE",
  },
  btnSecondaryText: {
    fontSize: 15,
    color: "#222",
  },
  btnPrimary: {
    backgroundColor: "#FFD24D",
  },
  btnPrimaryText: {
    fontSize: 16,
    color: "#222",
  },
});
