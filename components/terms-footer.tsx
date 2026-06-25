import { StyleSheet, View } from "react-native";
import AppText from "./app-text";

/** 약관 페이지 하단 공통 푸터 — 서비스 제공자/문의 이메일 표기 */
export default function TermsFooter() {
  return (
    <View style={styles.container}>
      <AppText type="pretendard-r" style={styles.line}>
        서비스 제공자: 개발팀 둥지
      </AppText>
      <AppText type="pretendard-r" style={styles.line}>
        이메일: ppiyaki0304@gmail.com
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 8,
    gap: 2,
  },
  line: {
    fontSize: 12,
    color: "#888",
    lineHeight: 18,
  },
});
