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
