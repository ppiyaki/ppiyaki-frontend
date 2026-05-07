import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { clearTokens, saveTokens } from "@/services/token-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Role = "senior" | "caregiver";

export default function DevLoginScreen() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("senior");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanToken = token.replace(/\s/g, "");
  const canSubmit = cleanToken.length > 0 && !loading;

  const handleInject = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      // 기존 토큰 깔끔히 지우고 새로 저장
      await clearTokens();
      // 테스트용: refreshToken 자리는 빈 문자열로 두고 access만 사용
      await saveTokens(cleanToken, "");
      console.log(
        "[dev-login] token saved, length:",
        cleanToken.length,
        "first 30:",
        cleanToken.slice(0, 30),
      );
      const targetPath = role === "senior" ? "/(tabs)" : "/family";
      router.replace(targetPath as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "토큰 적용에 실패했어요";
      Alert.alert("DEV 로그인 실패", msg);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="DEV 토큰 주입" />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.warnBanner}>
            <Ionicons name="warning" size={18} color="#F8B835" />
            <AppText type="pretendard-m" style={styles.warnText}>
              개발용 화면이에요. 백엔드에서 발급한 테스트 토큰을 직접 주입해서
              로그인을 우회합니다.
            </AppText>
          </View>

          <AppText type="pretendard-b" style={styles.sectionTitle}>
            역할 선택
          </AppText>
          <View style={styles.roleRow}>
            <RoleBtn
              label="시니어"
              active={role === "senior"}
              onPress={() => setRole("senior")}
            />
            <RoleBtn
              label="보호자"
              active={role === "caregiver"}
              onPress={() => setRole("caregiver")}
            />
          </View>

          <AppText type="pretendard-b" style={styles.sectionTitle}>
            Access Token
          </AppText>
          <TextInput
            value={token}
            onChangeText={setToken}
            placeholder="eyJhbGciOiJIUzUxMiJ9..."
            placeholderTextColor="#BBB"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.tokenInput}
          />

          <View style={styles.tipCard}>
            <AppText type="pretendard-b" style={styles.tipTitle}>
              💡 사용 방법
            </AppText>
            <AppText type="pretendard-m" style={styles.tipText}>
              1. 백엔드에서 받은 테스트 토큰을 위에 붙여넣기{"\n"}
              2. 실제 역할이 토큰과 일치하는지만 골라주세요{"\n"}
              3. 적용을 누르면 저장 후 자동으로 해당 메인 화면으로 이동
            </AppText>
            <AppText type="pretendard-r" style={styles.tipNote}>
              실제 role은 백엔드 /me 응답을 기준으로 라우팅됩니다.
            </AppText>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleInject}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.btn,
              !canSubmit && styles.btnDisabled,
              pressed && canSubmit && { opacity: 0.85 },
            ]}
          >
            <AppText type="pretendard-b" style={styles.btnText}>
              {loading ? "적용 중..." : "토큰 적용 후 진입"}
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.roleBtn, active && styles.roleBtnOn]}
    >
      <AppText
        type="pretendard-b"
        style={[styles.roleBtnText, active && styles.roleBtnTextOn]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  kav: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },

  warnBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF8E0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FFE9A8",
    marginBottom: 6,
  },
  warnText: {
    flex: 1,
    fontSize: 13,
    color: "#7A5C00",
    lineHeight: 19,
  },

  sectionTitle: {
    fontSize: 15,
    color: "#222",
    paddingHorizontal: 4,
    marginTop: 6,
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  roleBtnOn: {
    borderColor: "#5BC4AE",
    backgroundColor: "#E8F7F2",
  },
  roleBtnText: {
    fontSize: 15,
    color: "#888",
  },
  roleBtnTextOn: {
    color: "#222",
  },

  tokenInput: {
    minHeight: 110,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 12,
    fontFamily: "Pretendard-Regular",
    color: "#222",
    textAlignVertical: "top",
  },

  tipCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    gap: 6,
    marginTop: 8,
  },
  tipTitle: {
    fontSize: 13,
    color: "#222",
  },
  tipText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  tipNote: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  btn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#FFD24D",
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    backgroundColor: "#F0EDE0",
  },
  btnText: {
    fontSize: 16,
    color: "#222",
  },
});
