import { DeviceEventEmitter } from "react-native";
import { apiFetch } from "./api";

/**
 * 알림 읽음 상태가 갱신됐을 때 발행되는 이벤트.
 * 탭 바 뱃지 (보호자 _layout, 시니어 home) 가 이걸 구독해서 즉시 refetch.
 */
export const NOTIFICATION_UPDATED_EVENT = "notifications:updated";

export function emitNotificationsUpdated() {
  DeviceEventEmitter.emit(NOTIFICATION_UPDATED_EVENT);
}

export type NotificationCategory =
  | "MEDICATION_REMINDER"
  | "MEDICATION_DELAY"
  | "DUR_WARNING"
  | "FAMILY_SAFETY"
  | "MEDICATION_COMPLETE"
  /** careMode=MANAGED 시니어가 처방전 등록 시 활성 보호자 전원에게 발송 */
  | "PRESCRIPTION_REVIEW_REQUEST";

export interface NotificationItem {
  id: number;
  category: NotificationCategory;
  seniorId: number | null;
  title: string;
  body: string;
  payload: string | null;
  /** 알림함에서 봤는지 여부 (readAt 기반 derived). 백엔드는 readAt 만 보냄. */
  isRead: boolean;
  readAt: string | null;
  /**
   * 복약 인증 완료 시점. MEDICATION_REMINDER 한정으로 의미 있음 —
   * 해당 시니어의 같은 날짜/슬롯 복약 인증 (POST /medication-logs status=TAKEN) 시 백엔드가 채움.
   * 다른 카테고리는 항상 null.
   */
  takenAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  responses: NotificationItem[];
  nextCursor: number | null;
  hasNext: boolean;
}

/**
 * 본인 알림함 cursor 페이징 조회.
 * cursor 미지정 시 최신부터, size 미지정 시 20.
 *
 * 백엔드는 명세상 isRead 필드를 보내야 하지만 실제로는 readAt 만 응답함.
 * 여기서 isRead = (readAt !== null) 로 derive 해서 프론트가 일관되게 쓸 수 있게.
 */
export async function listNotifications(params?: {
  category?: NotificationCategory;
  cursor?: number;
  size?: number;
}): Promise<NotificationListResponse> {
  const res = await apiFetch<NotificationListResponse>(
    "/api/v1/notifications",
    {
      query: {
        category: params?.category,
        cursor: params?.cursor,
        size: params?.size,
      },
    },
  );
  return {
    ...res,
    responses: res.responses.map((n) => ({
      ...n,
      isRead: n.readAt !== null && n.readAt !== undefined,
    })),
  };
}

/**
 * 단건 알림 읽음 처리. 멱등.
 *  - 403 NOTIFICATION_002: 본인 알림 아님
 *  - 404 NOTIFICATION_001: 알림 row 없음
 */
export async function markNotificationRead(id: number): Promise<void> {
  await apiFetch<void>(`/api/v1/notifications/${id}/read`, {
    method: "PATCH",
  });
  emitNotificationsUpdated();
}

/** 본인의 미읽음 알림 일괄 읽음 처리 */
export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<void>("/api/v1/notifications/read-all", {
    method: "POST",
  });
  emitNotificationsUpdated();
}
