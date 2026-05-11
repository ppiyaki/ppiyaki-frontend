import { apiFetch, API_BASE } from "./api";
import { getAccessToken } from "./token-storage";

export interface ChatSession {
  sessionId: number;
}

/* ────────── 채팅 화면 모듈 캐시 ──────────
 * 화면 재진입 시 대화/세션 유지용. 로그인 전환·로그아웃에서 비워야 함. */

export type ChatMessage =
  | { id: string; role: "user"; text?: string; imageUri?: string; time: string }
  | { id: string; role: "ai"; text: string; time: string };

export const chatCache: {
  messages: ChatMessage[];
  sessionId: number | null;
} = {
  messages: [],
  sessionId: null,
};

export function clearChatCache() {
  chatCache.messages = [];
  chatCache.sessionId = null;
}

/** 채팅 세션 생성 */
export async function createChatSession(): Promise<ChatSession> {
  return apiFetch<ChatSession>("/api/v1/chat/sessions", {
    method: "POST",
  });
}

/**
 * SSE 헬퍼 — fetch는 RN에서 SSE를 지원하지 않으므로
 * EventSource polyfill 또는 react-native-sse 라이브러리가 필요함.
 *
 * 우선은 chunk 단위 처리를 위해 ReadableStream 기반 fetch만 정의해두고,
 * 실제 SSE 처리는 사용 시점에 결정 (라이브러리 추가 또는 ReadableStream 파싱).
 */

interface SseHandlers {
  onChunk: (data: string) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

/**
 * SSE 응답 파싱 — `data: ...` 라인에서 chunk 추출하고 [DONE]에서 종료.
 * 각 chunk를 onChunk로 전달.
 *
 * 백엔드 포맷:
 *  - 텍스트 응답: 평문 토큰 (`data: 더`, `data:죄`) — 콜론 다음 공백이 콘텐츠라 그대로 전달
 *  - 음성 응답: JSON (`data:{"text":"...","audio":"<base64>"}`) — text 만 추출, audio는 버림
 */
function parseSseChunks(text: string, handlers: SseHandlers): boolean {
  let done = false;
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5);
    const trimmed = data.trim();
    if (trimmed === "[DONE]") {
      done = true;
      break;
    }
    if (trimmed === "") continue;

    // JSON 페이로드 (음성 응답) — text 만 뽑고 audio 등 부가 필드는 무시
    if (trimmed.startsWith("{")) {
      try {
        const obj = JSON.parse(trimmed) as { text?: unknown };
        if (typeof obj.text === "string" && obj.text.length > 0) {
          handlers.onChunk(obj.text);
        }
        continue;
      } catch {
        // JSON 파싱 실패 시 평문 폴백
      }
    }

    handlers.onChunk(data);
  }
  return done;
}

async function streamSse(
  path: string,
  init: RequestInit,
  handlers: SseHandlers,
): Promise<void> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    Accept: "text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  if (__DEV__) {
    console.log("[sse] →", path, "method=", init.method ?? "GET");
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (e) {
    if (__DEV__) console.log("[sse] fetch threw:", e);
    handlers.onError?.(e instanceof Error ? e : new Error("네트워크 오류"));
    return;
  }
  if (__DEV__) {
    console.log("[sse] ← status", res.status, "ok=", res.ok);
  }
  if (!res.ok) {
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      // 무시
    }
    if (__DEV__) {
      console.log(
        "[sse] error body (first 500):",
        bodyText.slice(0, 500),
      );
    }
    handlers.onError?.(
      new Error(
        `SSE 연결 실패 (${res.status})${
          bodyText ? ` — ${bodyText.slice(0, 200)}` : ""
        }`,
      ),
    );
    return;
  }

  // 1) ReadableStream 시도 (RN에서는 보통 미지원)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reader = (res.body as any)?.getReader?.();
  if (reader) {
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (parseSseChunks(event, handlers)) {
          handlers.onDone?.();
          return;
        }
      }
    }
    handlers.onDone?.();
    return;
  }

  // 2) 폴백: ReadableStream 미지원 → 전체 텍스트 받은 후 일괄 파싱
  // 스트리밍 효과는 없지만 응답은 정상 수신
  try {
    const text = await res.text();
    if (__DEV__) {
      console.log(
        "[chat] SSE raw text (first 500 chars):",
        text.slice(0, 500),
      );
    }
    parseSseChunks(text, handlers);
    handlers.onDone?.();
  } catch (e) {
    handlers.onError?.(e instanceof Error ? e : new Error("응답 파싱 실패"));
  }
}

/** 단발 텍스트 대화 (세션 없이) — SSE 스트리밍 */
export function streamQuickTextMessage(
  message: string,
  handlers: SseHandlers,
): Promise<void> {
  return streamSse(
    "/api/v1/chat/messages",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    },
    handlers,
  );
}

/** 세션 내 텍스트 메시지 — SSE 스트리밍 */
export function streamSessionTextMessage(
  sessionId: number,
  message: string,
  handlers: SseHandlers,
): Promise<void> {
  return streamSse(
    `/api/v1/chat/sessions/${sessionId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    },
    handlers,
  );
}

/** 단발 음성 대화 (multipart) — SSE 스트리밍 */
export function streamQuickVoiceMessage(
  fileUri: string,
  handlers: SseHandlers,
  language = "ko",
): Promise<void> {
  const form = new FormData();
  form.append("file", {
    uri: fileUri,
    name: "audio.m4a",
    type: "audio/mp4",
  } as unknown as Blob);
  form.append("language", language);
  return streamSse(
    "/api/v1/chat/voice-messages",
    { method: "POST", body: form },
    handlers,
  );
}

/** 세션 내 음성 메시지 (multipart) — SSE 스트리밍 */
export function streamSessionVoiceMessage(
  sessionId: number,
  fileUri: string,
  handlers: SseHandlers,
  language = "ko",
): Promise<void> {
  const form = new FormData();
  form.append("file", {
    uri: fileUri,
    name: "audio.m4a",
    type: "audio/mp4",
  } as unknown as Blob);
  form.append("language", language);
  return streamSse(
    `/api/v1/chat/sessions/${sessionId}/voice-messages`,
    { method: "POST", body: form },
    handlers,
  );
}

/* ────────── photo-messages (v0.9.x) ────────── */
// 약 식별·자유질의 — 이미지는 메모리에서만 처리, S3 저장 없음.
// vision 모델이 약/비약 자체 판단 후 분기 응답.

interface PhotoPart {
  uri: string;
  /** RN가 자동 추론하지 못할 때 명시 — image/jpeg|png|webp */
  mime?: string;
  /** 파일명. 미지정 시 photo.jpg */
  name?: string;
}

function buildPhotoForm(photo: PhotoPart, message?: string): FormData {
  const form = new FormData();
  const ext = (() => {
    if (photo.mime === "image/png") return "png";
    if (photo.mime === "image/webp") return "webp";
    return "jpg";
  })();
  const fileName = photo.name ?? `photo.${ext}`;
  const fileType = photo.mime ?? "image/jpeg";
  form.append("file", {
    uri: photo.uri,
    name: fileName,
    type: fileType,
  } as unknown as Blob);
  if (message && message.trim().length > 0) {
    form.append("message", message);
  }
  return form;
}

/** 단발 사진 메시지 (임시 세션 자동 생성) — SSE 스트리밍 */
export function streamQuickPhotoMessage(
  photo: PhotoPart,
  handlers: SseHandlers,
  message?: string,
): Promise<void> {
  return streamSse(
    "/api/v1/chat/photo-messages",
    { method: "POST", body: buildPhotoForm(photo, message) },
    handlers,
  );
}

/** 세션 내 사진 메시지 — SSE 스트리밍 */
export function streamSessionPhotoMessage(
  sessionId: number,
  photo: PhotoPart,
  handlers: SseHandlers,
  message?: string,
): Promise<void> {
  return streamSse(
    `/api/v1/chat/sessions/${sessionId}/photo-messages`,
    { method: "POST", body: buildPhotoForm(photo, message) },
    handlers,
  );
}
