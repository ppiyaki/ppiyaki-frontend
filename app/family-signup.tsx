import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { signupLocal } from "@/services/auth";
import { resolveAuthRoute, ROUTE_PATHS } from "@/services/post-login";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FamilySignupScreen() {
  const router = useRouter();
  const confirm = useConfirm();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmedId = loginId.trim();
  const trimmedNick = nickname.trim();
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const passwordValid = password.length >= 8;
  const canSubmit =
    trimmedId.length >= 4 &&
    passwordValid &&
    passwordsMatch &&
    trimmedNick.length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { isOnboarded } = await signupLocal(
        trimmedId,
        password,
        trimmedNick,
      );
      // 가입 성공 — isOnboarded=true면 family로, 아니면 온보딩으로
      if (!isOnboarded) {
        router.replace(ROUTE_PATHS.onboarding as any);
        return;
      }
      const route = await resolveAuthRoute();
      router.replace(ROUTE_PATHS[route] as any);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 409
          ? "이미 사용 중인 아이디예요. 다른 아이디를 써주세요."
          : e instanceof ApiError
            ? e.toUserMessage()
            : e instanceof Error
              ? e.message
              : "회원가입에 실패했어요.";
      await confirm({
        title: "가입 실패",
        message: msg,
        confirmText: "확인",
        cancelText: "닫기",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <PageHeader title="회원가입" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Field
            label="아이디"
            hint="4자 이상"
            valid={trimmedId.length === 0 || trimmedId.length >= 4}
          >
            <TextInput
              value={loginId}
              onChangeText={setLoginId}
              placeholder="아이디"
              placeholderTextColor="#AAA"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              maxLength={30}
            />
          </Field>

          <Field
            label="비밀번호"
            hint="8자 이상"
            valid={password.length === 0 || passwordValid}
          >
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              placeholderTextColor="#AAA"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.input}
              maxLength={50}
            />
          </Field>

          <Field
            label="비밀번호 확인"
            hint=""
            valid={passwordConfirm.length === 0 || passwordsMatch}
            errorText={
              passwordConfirm.length > 0 && !passwordsMatch
                ? "비밀번호가 일치하지 않아요"
                : ""
            }
          >
            <TextInput
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호 확인"
              placeholderTextColor="#AAA"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.input}
              maxLength={50}
            />
          </Field>

          <Field label="닉네임" hint="앱에서 표시되는 이름" valid={true}>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="예: 김철수"
              placeholderTextColor="#AAA"
              style={styles.input}
              maxLength={20}
            />
          </Field>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.submitBtn,
              !canSubmit && styles.submitBtnDisabled,
              pressed && canSubmit && { opacity: 0.85 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#222" />
            ) : (
              <AppText type="pretendard-b" style={styles.submitBtnText}>
                가입하기
              </AppText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  hint,
  valid,
  errorText,
  children,
}: {
  label: string;
  hint?: string;
  valid: boolean;
  errorText?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <AppText type="pretendard-b" style={styles.fieldLabel}>
          {label}
        </AppText>
        {!!hint && (
          <AppText type="pretendard-r" style={styles.fieldHint}>
            {hint}
          </AppText>
        )}
      </View>
      {children}
      {!valid && !!errorText && (
        <AppText type="pretendard-m" style={styles.fieldError}>
          {errorText}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFDF6" },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 18,
  },

  field: { gap: 6 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: "#333",
  },
  fieldHint: {
    fontSize: 12,
    color: "#999",
  },
  fieldError: {
    fontSize: 12,
    color: "#E14B4B",
    marginTop: 2,
  },

  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: "#222",
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1ECDB",
  },
  submitBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFD24D",
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#F0EDE0",
  },
  submitBtnText: {
    fontSize: 17,
    color: "#222",
  },
});
