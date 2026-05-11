import { ImageSourcePropType } from "react-native";

/**
 * 백엔드 BadgeType enum → 로컬 이미지 매핑.
 * displayName/description/condition 은 모두 API 응답 사용.
 * 알 수 없는 badgeType 은 placeholder 사용.
 */
export const BADGE_IMAGE: Record<string, ImageSourcePropType> = {
  FIRST_STEP: require("../assets/images/badge/badge1.png"),
  MIRACLE_MORNING: require("../assets/images/badge/badge2.png"),
  FAMILY_LINK: require("../assets/images/badge/badge3.png"),
  HEALTH_GUARDIAN: require("../assets/images/badge/badge4.png"),
  BUDDY: require("../assets/images/badge/badge5.png"),
};

const FALLBACK_BADGE_IMAGE: ImageSourcePropType = require("../assets/images/badge/badge1.png");

export function getBadgeImage(badgeType: string): ImageSourcePropType {
  return BADGE_IMAGE[badgeType] ?? FALLBACK_BADGE_IMAGE;
}
