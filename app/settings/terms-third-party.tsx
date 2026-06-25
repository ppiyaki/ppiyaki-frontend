import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import TermsFooter from "@/components/terms-footer";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Section {
  title: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    title: "1. 제공받는 자",
    body: ["• 사용자(시니어)와 활성 연동 관계를 맺은 보호자"],
  },
  {
    title: "2. 제공 항목",
    body: [
      "• 복약 인증 여부 및 인증 시각",
      "• 복약 인증 사진 (마스킹 처리된 약품 이미지)",
      "• 미복약·지연 알림",
      "• 등록된 약 정보 및 복약 일정",
      "• 처방전 검토 요청 (관리 모드 시니어 한정)",
      "• 안부 알림 발송 기록",
    ],
  },
  {
    title: "3. 제공 목적",
    body: [
      "1. 보호자가 시니어의 복약 상황을 실시간으로 확인하고 지원",
      "2. 미복약 시 보호자 알림 발송",
      "3. 처방전 등록 시 보호자의 검토·확정 절차 진행",
      "4. 응급 상황 또는 이상 징후 조기 발견",
    ],
  },
  {
    title: "4. 제공 기간",
    body: [
      "1. 보호자와 시니어 간 활성 연동 관계가 유지되는 동안 제공됩니다.",
      "2. 시니어 또는 보호자가 연동을 해제하면 이후 데이터는 제공되지 않습니다.",
      "3. 회원 탈퇴 또는 동의 철회 시 즉시 중단됩니다.",
    ],
  },
  {
    title: "5. 동의 거부 권리 및 거부 시 불이익",
    body: [
      "1. 사용자는 본 동의를 거부할 권리가 있습니다.",
      "2. 다만, 동의 거부 시 보호자 연동 기능 및 가족 안전망 기능 이용이 불가능합니다.",
    ],
  },
];

export default function TermsThirdPartyScreen() {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="개인정보 제3자 제공" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
      >
        <AppText type="pretendard-r" style={styles.intro}>
          ‘둥지’ 팀(이하 “회사”)은 개인정보 보호법 제17조에 따라 아래와 같이
          사용자의 개인정보를 제3자(보호자)에게 제공합니다.
        </AppText>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.block}>
            <AppText type="pretendard-b" style={styles.blockTitle}>
              {s.title}
            </AppText>
            {s.body.map((line, i) => (
              <AppText
                key={`${s.title}-${i}`}
                type="pretendard-r"
                style={styles.blockBody}
              >
                {line}
              </AppText>
            ))}
          </View>
        ))}

        <TermsFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFDF6" },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  intro: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  block: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    padding: 14,
    gap: 6,
  },
  blockTitle: {
    fontSize: 15,
    color: "#171717",
    marginBottom: 2,
  },
  blockBody: {
    fontSize: 13,
    color: "#333",
    lineHeight: 20,
  },
});
