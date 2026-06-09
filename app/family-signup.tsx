import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { signupLocal } from "@/services/auth";
import { ROUTE_PATHS } from "@/services/post-login";
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
  // 아이디: 영문/숫자/언더스코어/하이픈 4~30자
  const idFormatValid = /^[A-Za-z0-9_-]{4,30}$/.test(trimmedId);
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const passwordValid = password.length >= 8;
  const nicknameValid = trimmedNick.length > 0;
  const canSubmit =
    idFormatValid &&
    passwordValid &&
    passwordsMatch &&
    nicknameValid &&
    !submitting;

  // disabled 상태에서 무엇이 부족한지 한 줄 안내 — 가장 우선순위 높은 미충족 항목 1개만
  const disabledReason: string = (() => {
    if (trimmedId.length === 0) return "아이디를 입력해주세요";
    if (trimmedId.length < 4) return "아이디는 4자 이상 입력해주세요";
    if (!idFormatValid)
      return "아이디는 영문/숫자/_/- 만 사용할 수 있어요";
    if (password.length === 0) return "비밀번호를 입력해주세요";
    if (!passwordValid) return "비밀번호는 8자 이상 입력해주세요";
    if (passwordConfirm.length === 0) return "비밀번호 확인을 입력해주세요";
    if (!passwordsMatch) return "비밀번호가 일치하지 않아요";
    if (!nicknameValid) return "닉네임을 입력해주세요";
    return "";
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await signupLocal(trimmedId, password, trimmedNick);
      // 카카오/로컬 모두 4단계 온보딩으로 이동
      // 로컬 가입 시 입력한 닉네임을 4단계 1번 화면에 prefill
      router.replace({
        pathname: ROUTE_PATHS.onboarding as any,
        params: { prefillNickname: trimmedNick },
      });
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
            hint="영문/숫자 4~30자"
            valid={trimmedId.length === 0 || idFormatValid}
            errorText={
              trimmedId.length > 0 && !idFormatValid
                ? trimmedId.length < 4
                  ? "4자 이상 입력해주세요"
                  : "영문/숫자/_/- 만 사용할 수 있어요"
                : ""
            }
          >
            <TextInput
              value={loginId}
              onChangeText={setLoginId}
              placeholder="예: ppiyaki_user"
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
            errorText={
              password.length > 0 && !passwordValid
                ? "8자 이상 입력해주세요"
                : ""
            }
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
          {!canSubmit && !!disabledReason && (
            <AppText
              type="pretendard-m"
              style={styles.disabledHint}
            >
              {disabledReason}
            </AppText>
          )}
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
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 140,
    minHeight: 720,
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
  disabledHint: {
    fontSize: 13,
    color: "#AA7A1A",
    textAlign: "center",
    marginBottom: 10,
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
