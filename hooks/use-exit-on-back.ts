import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler } from "react-native";

/**
 * 메인/홈 류 화면 전용. 화면이 포커스된 동안 하드웨어 뒤로가기를
 * 가로채서 앱을 종료한다. 로그인 화면 등 인증 이전 화면으로 되돌아가지 못하게.
 *
 * 내부 push 된 화면 (예: /family/prescriptions, /medication-detail)에서는
 * 사용하지 말 것 — 거기선 일반 pop 동작이 필요함.
 */
export function useExitOnBack() {
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true; // 기본 동작(pop) 막음
      };
      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => sub.remove();
    }, []),
  );
}
