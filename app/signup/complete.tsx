import AppText from "@/components/app-text";
import SignupProgress from "@/components/signup-progress";
import { useSignup } from "@/contexts/signup-context";
import { ApiError } from "@/services/api";
import { issueInviteCode } from "@/services/care-relations";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const REISSUE_COOLDOWN_SECONDS = 30;

export default function SignupCompleteScreen() {
  const router = useRouter();
  const { issuedCodes, updateIssuedCode } = useSignup();
  const [copiedSeniorId, setCopiedSeniorId] = useState<number | null>(null);
  const [cooldownMap, setCooldownMap] = useState<Record<number, number>>({});
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const ensureCooldownTicker = () => {
    if (cooldownTimerRef.current) return;
    cooldownTimerRef.current = setInterval(() => {
      setCooldownMap((prev) => {
        const next: Record<number, number> = {};
        let any = false;
        for (const [k, v] of Object.entries(prev)) {
          if (v > 1) {
            next[Number(k)] = v - 1;
            any = true;
          }
        }
        if (!any && cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
        return next;
      });
    }, 1000);
  };

  const handleCopy = async (seniorId: number, code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedSeniorId(seniorId);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => {
      setCopiedSeniorId(null);
      copiedTimerRef.current = null;
    }, 1500);
  };

  const handleReissue = async (seniorId: number) => {
    if ((cooldownMap[seniorId] ?? 0) > 0) return;
    updateIssuedCode(seniorId, { inviteCode: null, error: null });
    try {
      const r = await issueInviteCode(seniorId);
      updateIssuedCode(seniorId, { inviteCode: r.inviteCode, error: null });
      setCooldownMap((prev) => ({
        ...prev,
        [seniorId]: REISSUE_COOLDOWN_SECONDS,
      }));
      ensureCooldownTicker();
    } catch (err) {
      updateIssuedCode(seniorId, {
        inviteCode: null,
        error:
          err instanceof ApiError
            ? err.toUserMessage()
            : "코드 발급에 실패했어요",
      });
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <SignupProgress step={5} totalSteps={5} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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
          아래 6자리 코드를 시니어에게 알려드리세요.{"\n"}
          시니어는 코드를 입력하면 바로 시작할 수 있어요.{"\n"}
          코드는 발급 후 5분간 유효해요.
        </AppText>

        <View style={styles.codesList}>
          {issuedCodes.map((c) => {
            const copied = copiedSeniorId === c.seniorId;
            return (
              <View key={c.seniorId} style={styles.codeCard}>
                <AppText type="pretendard-b" style={styles.codeNickname}>
                  {c.nickname}
                </AppText>
                {c.error ? (
                  <AppText type="pretendard-m" style={styles.codeErrorText}>
                    {c.error}
                  </AppText>
                ) : c.inviteCode ? (
                  <View style={styles.codeRow}>
                    <AppText type="extrabold" style={styles.codeBig}>
                      {c.inviteCode}
                    </AppText>
                    <Pressable
                      onPress={() => handleCopy(c.seniorId, c.inviteCode!)}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.copyBtn,
                        copied && styles.copyBtnCopied,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Ionicons
                        name={copied ? "checkmark" : "copy-outline"}
                        size={18}
                        color={copied ? "#5BC4AE" : "#666"}
                      />
                      <AppText
                        type="pretendard-b"
                        style={[
                          styles.copyBtnText,
                          copied && styles.copyBtnTextCopied,
                        ]}
                      >
                        {copied ? "복사됨" : "복사"}
                      </AppText>
                    </Pressable>
                  </View>
                ) : (
                  <ActivityIndicator color="#5BC4AE" />
                )}
                <Pressable
                  onPress={() => handleReissue(c.seniorId)}
                  disabled={(cooldownMap[c.seniorId] ?? 0) > 0}
                  style={({ pressed }) => [
                    styles.codeReissueBtn,
                    (cooldownMap[c.seniorId] ?? 0) > 0 && { opacity: 0.5 },
                    pressed &&
                      (cooldownMap[c.seniorId] ?? 0) === 0 && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons name="refresh" size={14} color="#5BC4AE" />
                  <AppText type="pretendard-b" style={styles.codeReissueText}>
                    {(cooldownMap[c.seniorId] ?? 0) > 0
                      ? `재발급 (${cooldownMap[c.seniorId]}초)`
                      : "재발급"}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.btn}
          onPress={() => router.replace("/family" as any)}
        >
          <AppText type="pretendard-b" style={styles.btnText}>
            홈으로 이동
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
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  imageRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    paddingRight: 56,
  },
  familyImg: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 26,
    color: "#171717",
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    color: "#555555",
    textAlign: "center",
    lineHeight: 22,
  },
  codesList: {
    gap: 12,
    marginTop: 8,
  },
  codeCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    alignItems: "center",
    gap: 10,
  },
  codeNickname: {
    fontSize: 16,
    color: "#222",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  codeBig: {
    fontSize: 36,
    color: "#222",
    letterSpacing: 6,
    backgroundColor: "#FFF8E0",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  copyBtnCopied: {
    borderColor: "#BDEFEA",
    backgroundColor: "#E8F7F2",
  },
  copyBtnText: {
    fontSize: 13,
    color: "#666",
  },
  copyBtnTextCopied: {
    color: "#5BC4AE",
  },
  codeErrorText: {
    fontSize: 13,
    color: "#E14B4B",
    textAlign: "center",
  },
  codeReissueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#BDEFEA",
    backgroundColor: "#FFF",
  },
  codeReissueText: {
    fontSize: 13,
    color: "#5BC4AE",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 8,
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
