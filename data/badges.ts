import { ImageSourcePropType } from "react-native";

export interface Badge {
  key: string;
  image: ImageSourcePropType;
  label: string;
  description: string;
  condition: string;
  unlocked: boolean;
}

export const BADGES: Badge[] = [
  {
    key: "first-step",
    image: require("../assets/images/badge/badge1.png"),
    label: "천리길도\n한 걸음부터",
    description: "첫 복약을 시작했어요",
    condition: "첫 복약 시작 시 자동 획득",
    unlocked: true,
  },
  {
    key: "miracle-morning",
    image: require("../assets/images/badge/badge2.png"),
    label: "진정한\n미라클 모닝",
    description: "7일 연속 아침약을 정시에 복용했어요",
    condition: "7일 연속 아침약 정시 복용",
    unlocked: false,
  },
  {
    key: "family-link",
    image: require("../assets/images/badge/badge3.png"),
    label: "가족 연결고리",
    description: "보호자와 계정을 연동했어요",
    condition: "보호자 연동 후 첫 안부 알림 수신",
    unlocked: false,
  },
  {
    key: "guardian",
    image: require("../assets/images/badge/badge4.png"),
    label: "건강 수호자",
    description: "한 달간 모든 복약을 챙겼어요",
    condition: "30일간 미복용 없이 100% 달성",
    unlocked: true,
  },
  {
    key: "best-friend",
    image: require("../assets/images/badge/badge5.png"),
    label: "삐약이 단짝",
    description: "삐약이에게 5번 이상 질문했어요",
    condition: "음성 대화 5회 이상",
    unlocked: true,
  },
];
