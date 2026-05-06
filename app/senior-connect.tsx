import AppText from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SeniorConnectScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const inputRef = useRef<TextInput>(null);
  const canConnect = code.length === 6;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inner}>
          {/* 상단 아이콘 + 헤드라인 */}
          <View style={styles.headIcon}>
            <Ionicons name="link" size={28} color="#5BC4AE" />
          </View>
          <AppText type="extrabold" style={styles.title}>
            보호자와 연결하기
          </AppText>
          <AppText type="pretendard-m" style={styles.desc}>
            보호자에게 받은 6자리 코드를 입력하면{"\n"}
            함께 복약을 챙길 수 있어요
          </AppText>

          {/* OTP 입력 */}
          <OtpInput value={code} onChange={setCode} inputRef={inputRef} />

          {/* 안내 카드 */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="information-circle" size={18} color="#F8B835" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText type="pretendard-b" style={styles.infoTitle}>
                코드를 어디서 받나요?
              </AppText>
              <AppText type="pretendard-m" style={styles.infoText}>
                보호자가 삐약이 앱에서 발급한 6자리 코드를 입력해주세요.{"\n"}
                코드는 발급 후 10분간 유효해요.
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              !canConnect && styles.btnDisabled,
              pressed && canConnect && { opacity: 0.85 },
            ]}
            disabled={!canConnect}
            onPress={() => router.replace("/(tabs)")}
          >
            <AppText
              type="pretendard-b"
              style={[styles.btnText, !canConnect && styles.btnTextDisabled]}
            >
              연결하기
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OtpInput({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef: React.RefObject<TextInput | null>;
}) {
  return (
    <Pressable style={otp.wrapper} onPress={() => inputRef.current?.focus()}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\s/g, "").toUpperCase())}
        maxLength={6}
        keyboardType="default"
        autoCapitalize="characters"
        autoCorrect={false}
        caretHidden
        style={otp.hidden}
      />
      <View style={otp.row} pointerEvents="none">
        {Array.from({ length: 6 }, (_, i) => {
          const filled = value[i] !== undefined;
          const isCurrent = value.length === i;
          return (
            <View
              key={i}
              style={[
                otp.box,
                filled && otp.boxFilled,
                isCurrent && otp.boxCurrent,
              ]}
            >
              <AppText type="extrabold" style={otp.char}>
                {value[i] ?? ""}
              </AppText>
            </View>
          );
        })}
      </View>
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
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 14,
  },
  headIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D6F1EA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    color: "#222",
    lineHeight: 34,
  },
  desc: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    marginBottom: 18,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF8E0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FFE9A8",
  },
  infoIcon: {
    paddingTop: 1,
  },
  infoTitle: {
    fontSize: 14,
    color: "#5A4500",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#7A5C00",
    lineHeight: 19,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  btn: {
    height: 56,
    backgroundColor: "#FFD24D",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    backgroundColor: "#F0EDE0",
  },
  btnText: {
    fontSize: 17,
    color: "#222",
  },
  btnTextDisabled: {
    color: "#BBB",
  },
});

const otp = StyleSheet.create({
  wrapper: {
    width: "100%",
    height: 64,
  },
  hidden: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    height: "100%",
  },
  box: {
    flex: 1,
    height: "100%",
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  boxFilled: {
    borderColor: "#5BC4AE",
    backgroundColor: "#E8F7F2",
  },
  boxCurrent: {
    borderColor: "#5BC4AE",
    borderWidth: 2,
    backgroundColor: "#FFF",
  },
  char: {
    fontSize: 24,
    color: "#222",
  },
});
