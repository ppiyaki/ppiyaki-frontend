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
    title: "1. 수집하는 개인정보 항목",
    body: [
      "• 닉네임 (서비스 내 표시용 이름)",
      "• 가입 식별 정보 (카카오 회원번호 또는 로컬 로그인 아이디)",
      "• 성별 (보호자가 시니어 등록 시 입력)",
      "• 생년월일 (보호자가 시니어 등록 시 입력)",
      "• 보호자-시니어 연동을 위한 초대 코드",
    ],
  },
  {
    title: "2. 개인정보 수집·이용 목적",
    body: [
      "1. 회원 식별 및 본인 확인",
      "2. 보호자-시니어 연동 관계 형성 및 유지",
      "3. 복약 관리, 알림 발송 등 서비스 제공",
      "4. 부정 이용 방지 및 분쟁 발생 시 대응",
    ],
  },
  {
    title: "3. 보유·이용 기간",
    body: [
      "1. 원칙: 회원 탈퇴 또는 동의 철회 시까지 보유합니다.",
      "2. 다만, 관련 법령에 따라 보존 의무가 있는 경우 해당 법령에서 정한 기간 동안 보존합니다.",
    ],
  },
  {
    title: "4. 동의 거부 권리 및 거부 시 불이익",
    body: [
      "1. 사용자는 본 동의를 거부할 권리가 있습니다.",
      "2. 다만, 동의 거부 시 회원 가입 및 서비스 이용이 불가능합니다.",
    ],
  },
];

export default function TermsPrivacyScreen() {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="개인정보 수집 및 이용" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
      >
        <AppText type="pretendard-r" style={styles.intro}>
          ‘둥지’ 팀(이하 “회사”)은 개인정보 보호법 제15조에 따라 아래와 같이
          개인정보를 수집·이용하고자 합니다.
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
