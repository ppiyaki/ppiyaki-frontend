import AppText from "@/components/app-text";
import SignupProgress from "@/components/signup-progress";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface TermItem {
  key: string;
  label: string;
  required: boolean;
  /** 내용 페이지로 라우팅하려면 채워둠 — 현재는 이용약관만 별도 페이지 보유 */
  href?: string;
}

const TERMS: TermItem[] = [
  {
    key: "service",
    label: "서비스 이용약관",
    required: true,
    href: "/settings/terms",
  },
  {
    key: "privacy",
    label: "개인정보 수집 및 이용",
    required: true,
    href: "/settings/terms-privacy",
  },
  {
    key: "health",
    label: "민감정보(건강) 수집",
    required: true,
    href: "/settings/terms-sensitive",
  },
  {
    key: "third-party",
    label: "개인정보 제3자 제공 (보호자에게 복약 정보 전송)",
    required: true,
    href: "/settings/terms-third-party",
  },
];

export default function SignupTermsScreen() {
  const router = useRouter();
  // 로컬 회원가입에서 입력한 닉네임은 prefillNickname으로 넘어옴 — 다음 단계로 그대로 전달
  const { prefillNickname } = useLocalSearchParams<{
    prefillNickname?: string;
  }>();
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});

  const allChecked = useMemo(
    () => TERMS.every((t) => agreed[t.key]),
    [agreed],
  );
  const canProceed = useMemo(
    () => TERMS.filter((t) => t.required).every((t) => agreed[t.key]),
    [agreed],
  );

  const toggleAll = () => {
    if (allChecked) {
      setAgreed({});
    } else {
      const next: Record<string, boolean> = {};
      for (const t of TERMS) next[t.key] = true;
      setAgreed(next);
    }
  };

  const toggleOne = (key: string) => {
    setAgreed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <SignupProgress step={1} totalSteps={5} />

      <View style={styles.header}>
        <AppText type="pretendard-b" style={styles.title}>
          이용약관 동의
        </AppText>
        <AppText type="pretendard-r" style={styles.desc}>
          서비스 이용을 위해 약관에 동의해주세요.{"\n"}
          필수 항목에 동의해야 가입할 수 있어요.
        </AppText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 모두 동의 */}
        <Pressable
          onPress={toggleAll}
          style={({ pressed }) => [
            styles.allRow,
            pressed && { opacity: 0.85 },
          ]}
        >
          <CheckIcon checked={allChecked} large />
          <View style={{ flex: 1 }}>
            <AppText type="pretendard-b" style={styles.allLabel}>
              모두 동의
            </AppText>
            <AppText type="pretendard-r" style={styles.allDesc}>
              필수 및 선택 동의 항목에 모두 동의합니다
            </AppText>
          </View>
        </Pressable>

        <View style={styles.divider} />

        {TERMS.map((t) => (
          <View key={t.key} style={styles.itemRow}>
            <Pressable
              onPress={() => toggleOne(t.key)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.itemCheckHit,
                pressed && { opacity: 0.7 },
              ]}
            >
              <CheckIcon checked={!!agreed[t.key]} />
            </Pressable>
            <Pressable
              onPress={() => toggleOne(t.key)}
              style={styles.itemLabelHit}
            >
              <AppText type="pretendard-m" style={styles.itemLabel}>
                <AppText
                  type="pretendard-b"
                  style={t.required ? styles.required : styles.optional}
                >
                  {t.required ? "(필수) " : "(선택) "}
                </AppText>
                {t.label}
              </AppText>
            </Pressable>
            {t.href && (
              <Pressable
                onPress={() => router.push(t.href as any)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.itemViewBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <AppText type="pretendard-m" style={styles.itemViewText}>
                  보기
                </AppText>
                <Ionicons name="chevron-forward" size={14} color="#888" />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, !canProceed && styles.btnDisabled]}
          disabled={!canProceed}
          onPress={() =>
            router.push({
              pathname: "/signup/nickname" as any,
              params: prefillNickname ? { prefillNickname } : undefined,
            })
          }
        >
          <AppText type="pretendard-b" style={styles.btnText}>
            다음
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CheckIcon({ checked, large }: { checked: boolean; large?: boolean }) {
  const size = large ? 28 : 24;
  return (
    <View
      style={[
        styles.check,
        { width: size, height: size, borderRadius: size / 2 },
        checked && styles.checkOn,
      ]}
    >
      {checked && (
        <Ionicons name="checkmark" size={size * 0.6} color="#FFF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 14,
  },
  title: {
    fontSize: 22,
    color: "#171717",
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  allRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF8E0",
    borderWidth: 1.5,
    borderColor: "#FFE9A8",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  allLabel: {
    fontSize: 16,
    color: "#222",
  },
  allDesc: {
    fontSize: 12,
    color: "#7A5C00",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0EDE0",
    marginVertical: 12,
    marginHorizontal: 4,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  itemCheckHit: {
    padding: 2,
  },
  itemLabelHit: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  required: {
    color: "#222",
  },
  optional: {
    color: "#888",
  },
  itemViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  itemViewText: {
    fontSize: 12,
    color: "#888",
  },
  check: {
    borderWidth: 1.5,
    borderColor: "#D5CFB8",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkOn: {
    backgroundColor: "#FFD24D",
    borderColor: "#FFD24D",
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
  btnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    fontSize: 18,
    color: "#171717",
  },
});
