import { apiFetch } from "./api";

export interface ReminderResponse {
  scheduleId: number;
  userId: number;
  targetDate: string;
  medicineId: number;
  medicineName: string;
  scheduledTime: string;
  sent: boolean;
  sentAt: string | null;
  status: string;
}

/** 복약 알림 발송 (수동 트리거) */
export async function sendReminder(
  scheduleId: number,
  body: {
    userId: number;
    targetDate: string;
    force?: boolean;
    message?: string;
  },
): Promise<ReminderResponse> {
  return apiFetch<ReminderResponse>(
    `/api/v1/medication-schedules/${scheduleId}/reminders/send`,
    { method: "POST", json: body },
  );
}
