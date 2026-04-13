import AppText from "@/components/app-text";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Image,
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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.inner}>
        <View style={styles.logoBox}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <Image
          source={require("../assets/images/Senior.png")}
          style={styles.character}
          resizeMode="contain"
        />

        <AppText type="pretendard-m" style={styles.desc}>
          보호자에게 받은 코드를 입력해주세요
        </AppText>

        <OtpInput value={code} onChange={setCode} inputRef={inputRef} />
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, !canConnect && styles.btnDisabled]}
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
    <Pressable
      style={otp.wrapper}
      onPress={() => inputRef.current?.focus()}
    >
      {/* 보이지 않는 실제 입력 필드 — 전체 영역 커버 */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\s/g, ""))}
        maxLength={6}
        keyboardType="default"
        autoCapitalize="none"
        autoCorrect={false}
        caretHidden
        style={otp.hidden}
      />

      {/* 시각적 박스 6개 */}
      <View style={otp.row} pointerEvents="none">
        {Array.from({ length: 6 }, (_, i) => (
          <View
            key={i}
            style={[
              otp.box,
              value.length === i && otp.boxCurrent,
              value[i] !== undefined && otp.boxFilled,
            ]}
          >
            <AppText type="pretendard-b" style={otp.char}>
              {value[i] ?? ""}
            </AppText>
          </View>
        ))}
      </View>
    </Pressable>
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
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logoBox: {
    width: 170,
    height: 68,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    backgroundColor: "#FAFAFA",
  },
  logoImg: {
    width: 148,
    height: 52,
  },
  character: {
    width: 190,
    height: 190,
    marginBottom: 28,
  },
  desc: {
    fontSize: 16,
    color: "#444444",
    marginBottom: 24,
    textAlign: "center",
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
    backgroundColor: "#E8E8E8",
  },
  btnText: {
    fontSize: 18,
    color: "#171717",
  },
  btnTextDisabled: {
    color: "#BBBBBB",
  },
});

const otp = StyleSheet.create({
  wrapper: {
    width: "100%",
    height: 60,
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
    height: 60,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
  },
  boxCurrent: {
    borderColor: "#FFD24D",
    backgroundColor: "#FFFDF5",
  },
  boxFilled: {
    borderColor: "#AAAAAA",
    backgroundColor: "#ffffff",
  },
  char: {
    fontSize: 22,
    color: "#171717",
  },
});
