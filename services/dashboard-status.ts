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

export function effectiveSlotStatus(
  status: SlotStatus,
  mealTimeHms: string | null | undefined,
  dateIso: string,
  now = new Date(),
): SlotStatus {
  if (status !== "PENDING") return status;
  const todayIso = toIsoDate(now);
  if (dateIso < todayIso) return "MISSED";
  if (dateIso > todayIso || !mealTimeHms) return status;

  const [h, m] = mealTimeHms.split(":").map((x) => parseInt(x, 10) || 0);
  const slotDate = new Date(dateIso);
  slotDate.setHours(h, m, 0, 0);
  return slotDate < now ? "DELAYED" : "PENDING";
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
