import AppText from "@/components/app-text";
import SignupProgress from "@/components/signup-progress";
import { useSignup } from "@/contexts/signup-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NicknameScreen() {
  const router = useRouter();
  const { prefillNickname } = useLocalSearchParams<{
    prefillNickname?: string;
  }>();
  const { nickname: ctxNickname, setNickname: setCtxNickname } = useSignup();
  const [nickname, setNickname] = useState(
    ctxNickname || prefillNickname || "",
  );
  // 라우터 param prefill 도 context 에 반영 (다음 단계 진행 시 일관성)
  useEffect(() => {
    if (!ctxNickname && prefillNickname) {
      setCtxNickname(prefillNickname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const trimmed = nickname.trim();
  const canProceed = trimmed.length > 0;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <SignupProgress step={1} />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inner}>
          <AppText type="pretendard-b" style={styles.title}>
            닉네임 입력
          </AppText>
          <AppText type="pretendard-r" style={styles.desc}>
            삐약이에서 사용할 닉네임을 정해주세요!{"\n"}
            그냥 이름이어도, 개성있는 닉네임이어도 좋아요.
          </AppText>

          <View style={styles.spacer} />

          <View style={styles.inputSection}>
            <AppText type="pretendard-m" style={styles.inputLabel}>
              닉네임
            </AppText>
            <TextInput
              style={styles.input}
              placeholder="삐약이"
              placeholderTextColor="#AAAAAA"
              value={nickname}
              onChangeText={setNickname}
              maxLength={12}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.btn, !canProceed && styles.btnDisabled]}
            disabled={!canProceed}
            onPress={() => {
              setCtxNickname(trimmed);
              router.push("/signup/seniors" as any);
            }}
          >
            <AppText type="pretendard-b" style={styles.btnText}>
              다음
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  kav: {
    flex: 1,
    justifyContent: "space-between",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  title: {
    fontSize: 22,
    color: "#171717",
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 22,
  },
  spacer: {
    flex: 1,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    color: "#333333",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Pretendard-Regular",
    color: "#171717",
    backgroundColor: "#FFFFFF",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
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
