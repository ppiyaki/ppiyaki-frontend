import { apiFetch } from "./api";

export type PetStage =
  | "EGG"
  | "CRACKED_EGG"
  | "BABY"
  | "HEALTHY"
  | "GUARDIAN"
  | "EMPEROR";

export interface PetBadge {
  badgeType: string;
  displayName: string;
  description: string;
  /** ISO-8601 */
  createdAt: string;
}

export interface PetMe {
  id: number;
  point: number;
  level: number;
  stage: PetStage;
  streak: number;
  badges: PetBadge[];
}

/**
 * 본인 펫 정보 조회.
 *  - 404 PET_NOT_FOUND: 펫이 존재하지 않음
 */
export async function getMyPet(): Promise<PetMe> {
  return apiFetch<PetMe>("/api/v1/pets/me");
}

export interface BadgeTypeDef {
  badgeType: string;
  displayName: string;
  description: string;
}

/**
 * 시스템 전체 뱃지 타입 목록.
 * 명세상 인증 불필요지만 실제 서버가 401을 던지므로 토큰 함께 전송.
 */
export async function getBadgeTypes(): Promise<BadgeTypeDef[]> {
  return apiFetch<BadgeTypeDef[]>("/api/v1/pets/badges/types");
}
