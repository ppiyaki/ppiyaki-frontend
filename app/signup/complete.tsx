import AppText from "@/components/app-text";
import SignupProgress from "@/components/signup-progress";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupCompleteScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <SignupProgress step={4} />
      <View style={styles.inner}>
        <View style={styles.imageRow}>
          <Image
            source={require("../../assets/images/Family.png")}
            style={styles.familyImg}
            resizeMode="contain"
          />
        </View>
        <AppText type="extrabold" style={styles.title}>
          가입 완료!
        </AppText>
        <AppText type="pretendard-r" style={styles.desc}>
          오늘부터 삐약이가 복약 관리를 도와드릴게요!
        </AppText>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.btn} onPress={() => router.replace("/(tabs)")}>
          <AppText type="pretendard-b" style={styles.btnText}>
            회원가입 완료
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  imageRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 28,
    paddingRight: 56,
  },
  familyImg: {
    width: 230,
    height: 230,
  },
  title: {
    fontSize: 30,
    color: "#171717",
    marginBottom: 14,
    textAlign: "center",
  },
  desc: {
    fontSize: 15,
    color: "#555555",
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  btn: {
    height: 54,
    backgroundColor: "#FFD24D",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    fontSize: 18,
    color: "#171717",
  },
});
