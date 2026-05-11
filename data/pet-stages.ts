import { ImageSourcePropType } from "react-native";
import type { PetStage } from "@/services/pets";

export interface PetStageDef {
  key: PetStage;
  label: string;
  image: ImageSourcePropType;
  threshold: number;
  /** {name} 자리에 시니어 닉네임 치환 */
  message: string;
}

export const PET_STAGES: PetStageDef[] = [
  {
    key: "EGG",
    label: "알",
    image: require("../assets/images/character/Senior1.png"),
    threshold: 0,
    message: "{name}님, 저와 함께 건강한 습관을 만들어봐요!",
  },
  {
    key: "CRACKED_EGG",
    label: "금 간 알",
    image: require("../assets/images/character/Senior2.png"),
    threshold: 3,
    message: "조금만 더 힘내세요!\n곧 세상 밖으로 나갈 것 같아요!",
  },
  {
    key: "BABY",
    label: "아기 삐약이",
    image: require("../assets/images/character/Senior3.png"),
    threshold: 7,
    message: "덕분에 제가 태어났어요!\n우리 계속 같이 힘내요!",
  },
  {
    key: "HEALTHY",
    label: "건강 삐약이",
    image: require("../assets/images/character/Senior4.png"),
    threshold: 14,
    message: "이제 저도 건강해졌어요.\n{name}님도 몸이 가뿐하시죠?",
  },
  {
    key: "GUARDIAN",
    label: "수호 삐약이",
    image: require("../assets/images/character/Senior5.png"),
    threshold: 30,
    message: "{name}은 진정한 건강 왕!\n제가 계속 지켜드릴게요.",
  },
  {
    key: "EMPEROR",
    label: "황제 삐약이",
    image: require("../assets/images/character/Senior6.png"),
    threshold: 100,
    message: "{name}님의 꾸준함은 정말 멋져요!\n당신을 존경합니다.",
  },
];

/** API의 stage enum → STAGES 인덱스. 없는 키면 EGG. */
export function stageIndex(stage: PetStage): number {
  const idx = PET_STAGES.findIndex((s) => s.key === stage);
  return idx < 0 ? 0 : idx;
}

/** streak 기반 단계 추론 (펫 응답 없을 때 fallback) */
export function stageIndexFromStreak(streak: number): number {
  for (let i = PET_STAGES.length - 1; i >= 0; i--) {
    if (streak >= PET_STAGES[i].threshold) return i;
  }
  return 0;
}

export function formatStageMessage(template: string, name: string): string {
  const safeName = name.trim().length > 0 ? name : "어르신";
  return template.replaceAll("{name}", safeName);
}
