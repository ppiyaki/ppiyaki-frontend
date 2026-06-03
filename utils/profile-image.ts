import { ImageSourcePropType } from "react-native";
import type { ProfileImageIndex } from "@/services/auth";

// 기본 프사 1~6 — assets 내 pfimg1~6 매핑.
// require 는 모듈 로드 시점에 평가되어야 해서 객체로 박아둠.
const PRESET_IMAGES: Record<ProfileImageIndex, ImageSourcePropType> = {
  1: require("../assets/images/pf/pfimg1.png"),
  2: require("../assets/images/pf/pfimg2.png"),
  3: require("../assets/images/pf/pfimg3.png"),
  4: require("../assets/images/pf/pfimg4.png"),
  5: require("../assets/images/pf/pfimg5.png"),
  6: require("../assets/images/pf/pfimg6.png"),
};

const DEFAULT_FALLBACK: ImageSourcePropType = require("../assets/images/pf/pfimg1.png");

/**
 * MeResponse 의 profileImage(1~6 인덱스) / profileImageUrl(presigned URL) 을 보고
 * 화면에 띄울 이미지 소스를 결정.
 *
 *  - profileImageUrl 우선 (커스텀 업로드)
 *  - 없으면 profileImage 인덱스로 기본 프사
 *  - 둘 다 없으면 fallback (pfimg1)
 */
export function resolveProfileImage(opts: {
  profileImage?: number | null;
  profileImageUrl?: string | null;
  fallback?: ImageSourcePropType;
}): ImageSourcePropType {
  if (opts.profileImageUrl) {
    return { uri: opts.profileImageUrl };
  }
  const idx = opts.profileImage;
  if (idx != null && idx >= 1 && idx <= 6) {
    return PRESET_IMAGES[idx as ProfileImageIndex];
  }
  return opts.fallback ?? DEFAULT_FALLBACK;
}
