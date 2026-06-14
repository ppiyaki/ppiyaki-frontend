import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { withdrawMe } from "@/services/auth";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const WARNINGS = [
  "지금까지 챙긴 복약 기록과 받은 뱃지가 모두 삭제돼요",
  "삐약이의 성장 단계와 보유한 알이 사라져요",
  "연결된 보호자가 더 이상 시니어를 돌볼 수 없게 돼요",
  "탈퇴 후에는 정보를 되돌릴 수 없어요",
];

export default function SeniorWithdrawScreen() {
  const navigation = useNavigation();
  const confirm = useConfirm();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleWithdraw = async () => {
    if (submitting) return;
    const ok = await confirm({
      title: "정말 탈퇴할까요?",
      message:
        "탈퇴하면 지금까지 챙긴 복약 기록이\n모두 사라지고 복구할 수 없어요.",
      confirmText: "탈퇴하기",
      danger: true,
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await withdrawMe();
      // 네비게이션 스택 완전 초기화 — 뒤로가기로 탈퇴된 계정 화면에 못 돌아오게.
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "select-role" }],
        }),
      );
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "회원탈퇴에 실패했어요.";
      await confirm({
        title: "회원탈퇴 실패",
        message: msg,
        confirmText: "확인",
      });
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="회원탈퇴" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle" size={42} color="#E14B4B" />
          </View>
        </View>

        <AppText type="extrabold" style={styles.title}>
          삐약이를 떠나실 건가요?
        </AppText>

        <View style={styles.warningCard}>
          {WARNINGS.map((text) => (
            <View key={text} style={styles.warningRow}>
              <View style={styles.dot} />
              <AppText type="pretendard-m" style={styles.warningText}>
                {text}
              </AppText>
            </View>
          ))}
        </View>

        <AppText type="pretendard-m" style={styles.subText}>
          시니어의 정보는 탈퇴 후 즉시 삭제되며,{"\n"}
          동일한 계정으로 다시 가입해도 복구할 수 없어요.
        </AppText>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => setAgreed((v) => !v)}
          style={styles.checkRow}
          hitSlop={6}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed && <Ionicons name="checkmark" size={16} color="#FFF" />}
          </View>
          <AppText type="pretendard-m" style={styles.checkText}>
            위 유의사항을 모두 확인하였고, 탈퇴를 진행합니다.
          </AppText>
        </Pressable>

        <Pressable
          onPress={handleWithdraw}
          disabled={!agreed || submitting}
          style={({ pressed }) => [
            styles.btn,
            (!agreed || submitting) && styles.btnDisabled,
            pressed && agreed && !submitting && { opacity: 0.85 },
          ]}
        >
          <AppText type="pretendard-b" style={styles.btnText}>
            회원탈퇴
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
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
    paddingBottom: 24,
    gap: 16,
  },
  iconWrap: {
    alignItems: "center",
    paddingVertical: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FCEBEB",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    color: "#222",
    textAlign: "center",
    marginBottom: 4,
  },

  warningCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    gap: 10,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E14B4B",
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },
  subText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
    marginTop: 4,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1ECDB",
    backgroundColor: "#FFFDF6",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CCC",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxOn: {
    backgroundColor: "#E14B4B",
    borderColor: "#E14B4B",
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    color: "#444",
  },
  btn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#E14B4B",
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    backgroundColor: "#E5C0C0",
  },
  btnText: {
    fontSize: 17,
    color: "#FFF",
  },
});
