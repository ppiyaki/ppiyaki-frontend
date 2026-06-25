import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import TermsFooter from "@/components/terms-footer";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ArticleSection {
  title: string;
  body: string[];
}

const ARTICLES: ArticleSection[] = [
  {
    title: "제1조 (목적 및 서비스의 성격)",
    body: [
      "1. 본 약관은 ‘둥지’ 팀(이하 “회사”)이 제공하는 복약 관리 지원 서비스 ‘삐약이’(이하 “서비스”)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.",
      "2. ‘삐약이’는 사용자의 자발적인 복약 일정 관리를 돕는 ‘비의료 보조 시스템’이며, 어떠한 경우에도 의사 또는 약사의 전문적인 진단, 처방, 복약 지도를 대체할 수 없습니다.",
    ],
  },
  {
    title: "제2조 (의료 행위의 금지 및 사용자의 주의 의무)",
    body: [
      "1. 서비스 내에서 제공되는 의약품 관련 정보는 사용자가 현재 등록한 특정 처방전을 기준으로 구동되는 단편적인 참고 자료일 뿐입니다.",
      "2. 과거 병력 파악의 한계: 회사는 의료법 및 개인정보보호법에 따라 사용자가 시스템에 직접 입력하여 밝히지 않은 과거 병력이나 현재 진단받지 않은 기타 질환에 대해서는 알 수 없습니다. 따라서 시스템의 안내는 사용자의 전체적인 건강 상태를 대변하지 않습니다.",
      "3. 최종 확인 의무: 사용자는 시스템이 자동 추출하여 화면에 표출한 정보(약품명, 용법, 용량 등)를 실제 종이 처방전 및 약봉투와 대조하여 최종적으로 일치 여부를 확인하고 승인할 책임이 있습니다. 사용자의 최종 확인 이후 발생한 사고에 대해 회사는 책임을 지지 않습니다.",
    ],
  },
  {
    title: "제3조 (자동화 시스템의 한계 및 회사의 면책)",
    body: [
      "1. 회사는 전자적 정보 추출 및 데이터 단순 매칭 방식을 활용하여 서비스를 제공합니다. 그러나 사용자의 촬영 환경(조도, 흔들림 등) 및 자동화 시스템의 본질적인 전산 처리 한계로 인해 결과물에 일부 오인식, 누락, 오류가 발생할 수 있습니다.",
      "2. 공공 데이터의 한계: 시스템이 연동하는 의약품 허가 사항 데이터는 가능한 모든 임상적 상황이 나열된 포괄적 정보입니다. 처방전에 질병분류기호가 기재되어 있지 않은 실무 관례상, 시스템은 개별 환자의 구체적인 질환명을 특정할 수 없으므로, 안내된 정보 이상의 추가적인 질환 상담이나 추론은 불가능합니다.",
      "3. 인과관계의 단절: 회사는 앱을 통해 제공되는 정보의 완전성을 보증하지 않으며, 해당 정보로 인해 발생한 사용자의 신체적·재산상 손해에 대해 책임을 지지 않음을 명시적으로 안내하고 사전 동의를 받습니다. 정보의 정확성을 위해 반드시 실제 의사 또는 약사와의 상담을 권장합니다.",
      "4. 회사는 국가 기관 오픈 API 및 외부 인프라 서버의 장애·점검, 통신사 네트워크 단절로 인한 알림 지연에 대해서는 일체의 법적 책임을 지지 않습니다.",
    ],
  },
  {
    title: "제4조 (가족 안전망 및 긴급 알림의 제한)",
    body: [
      "1. 서비스에서 제공하는 ‘긴급 이상 탐지 알림(미복용 알림)’은 보호자의 모니터링을 보조하는 수단일 뿐입니다.",
      "2. 본 서비스는 응급의료 시스템이 아니며, 기기 상태나 네트워크 환경에 따라 알림 발송이 실패할 수 있습니다. 시니어의 신변 안전에 대한 최종 확인 의무는 연동된 보호자에게 있습니다.",
    ],
  },
  {
    title: "제5조 (리워드 시스템 및 어뷰징 금지)",
    body: [
      "1. 사용자는 복약 인증을 통해 가상 재화(‘알’)를 획득할 수 있습니다.",
      "2. 부정 행위 금지: 약품이 아닌 사물을 촬영하거나, 타인의 사진을 도용하는 등 부정한 방법으로 ‘알’을 획득할 경우, 회사는 사전 통보 없이 해당 계정의 재화를 몰수하고 이용을 제한할 수 있습니다.",
      "3. 리워드 정책은 회사 정책에 따라 변경되거나 중단될 수 있습니다.",
    ],
  },
];

export default function TermsScreen() {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="서비스 이용약관" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
      >
        {ARTICLES.map((article) => (
          <View key={article.title} style={styles.articleBlock}>
            <AppText type="pretendard-b" style={styles.articleTitle}>
              {article.title}
            </AppText>
            {article.body.map((line, i) => (
              <AppText
                key={`${article.title}-${i}`}
                type="pretendard-r"
                style={styles.articleBody}
              >
                {line}
              </AppText>
            ))}
          </View>
        ))}

        <View style={styles.footerNote}>
          <AppText type="pretendard-r" style={styles.footerNoteText}>
            본 약관은 서비스 운영 정책에 따라 사전 고지 후 변경될 수 있습니다.
          </AppText>
        </View>

        <TermsFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  articleBlock: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    padding: 14,
    gap: 8,
  },
  articleTitle: {
    fontSize: 15,
    color: "#171717",
  },
  articleBody: {
    fontSize: 13,
    color: "#333",
    lineHeight: 20,
  },
  footerNote: {
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  footerNoteText: {
    fontSize: 12,
    color: "#888",
  },
});
