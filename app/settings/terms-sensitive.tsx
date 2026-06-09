import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Section {
  title: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    title: "1. 민감정보 수집 항목",
    body: [
      "• 처방전 사진 (원본은 OCR·AI 분석 직후 삭제, 개인정보 마스킹본은 보존)",
      "• 약품명 및 식약처 매칭 정보",
      "• 복약 일정·시간·복용량",
      "• 복약 인증 기록 (인증 시각, 사진, AI 검증 결과 등)",
    ],
  },
  {
    title: "2. 민감정보 수집·이용 목적",
    body: [
      "1. 복약 일정 자동 생성 및 알림 발송",
      "2. 복약 인증 사진의 자동 검증(약품 개수 일치 여부 확인 등)",
      "3. 연동된 보호자의 복약 모니터링 지원",
      "4. 처방전 검토 요청 및 약물 금기·중복 위험 안내",
    ],
  },
  {
    title: "3. 보유·이용 기간",
    body: [
      "1. 원칙: 회원 탈퇴 또는 동의 철회 시까지 보유합니다.",
      "2. 처방전 원본 이미지는 OCR·AI 분석 직후 즉시 삭제됩니다.",
      "3. 개인정보가 마스킹된 처방전 이미지와 복약 기록은 회원 탈퇴 시까지 보존됩니다.",
    ],
  },
  {
    title: "4. 비식별 처리 및 활용",
    body: [
      "1. 회사는 사용자가 업로드한 처방전 이미지 및 복약 데이터를 개인 식별 정보가 제거된 형태로 비식별화 처리할 수 있습니다.",
      "2. 비식별화된 데이터는 서비스의 전산 처리 정밀도 향상 및 자동화 알고리즘 고도화를 위한 분석 자료로 활용될 수 있습니다.",
    ],
  },
  {
    title: "5. 동의 거부 권리 및 거부 시 불이익",
    body: [
      "1. 사용자는 본 동의를 거부할 권리가 있습니다.",
      "2. 다만, 동의 거부 시 처방전 등록·복약 관리 등 주요 서비스 이용이 불가능합니다.",
    ],
  },
];

export default function TermsSensitiveScreen() {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="민감정보(건강) 수집" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
      >
        <AppText type="pretendard-r" style={styles.intro}>
          ‘둥지’ 팀(이하 “회사”)은 개인정보 보호법 제23조에 따라 사용자의
          건강 관련 민감정보를 아래와 같이 수집·이용하고자 합니다.
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
