import type { DayStatus, SlotStatus } from "@/services/dashboard";

export interface StatusPalette {
  color: string;
  bg: string;
  label: string;
}

export function paletteForStatus(s: DayStatus | SlotStatus): StatusPalette {
  switch (s) {
    case "PERFECT":
      return { color: "#5BC4AE", bg: "#E8F7F2", label: "정상 복용" };
    case "DELAYED":
      return { color: "#F8B835", bg: "#FFF4C7", label: "지각 복용" };
    case "MISSED":
      return { color: "#E14B4B", bg: "#FCEBEB", label: "미복용" };
    case "PENDING":
      return { color: "#CFCFCF", bg: "#F4F2EA", label: "예정" };
    case "FUTURE":
      return { color: "#CFCFCF", bg: "#F4F2EA", label: "예정" };
    case "NOT_SCHEDULED":
    default:
      return { color: "#CFCFCF", bg: "#F4F2EA", label: "일정 없음" };
  }
}

export function isTakenStatus(status: DayStatus | SlotStatus): boolean {
  return status === "PERFECT" || status === "DELAYED";
}
