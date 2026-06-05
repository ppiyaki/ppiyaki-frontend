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
  /**
   * 음성 메시지 전용 — LLM 응답 전에 STT 결과(사용자가 말한 텍스트)가 1회 도착.
   * 백엔드 포맷: `data:{"type":"transcription","text":"..."}`
   */
  onTranscription?: (text: string) => void;
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

    // JSON 페이로드 (음성/사진 응답) — text 만 뽑고 audio 등 부가 필드는 무시
    // type === "transcription" 이면 사용자 STT 결과 (음성 메시지 1회). 그 외는 AI 응답.
    if (trimmed.startsWith("{")) {
      try {
        const obj = JSON.parse(trimmed) as {
          type?: unknown;
          text?: unknown;
        };
        if (
          obj.type === "transcription" &&
          typeof obj.text === "string" &&
          obj.text.length > 0
        ) {
          handlers.onTranscription?.(obj.text);
          continue;
        }
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

/**
 * SSE 스트리밍 — React Native 환경 대응.
 *
 * RN의 fetch 는 `res.body.getReader()` 를 지원하지 않아 전체 응답을 모은 뒤에야
 * 콜백이 호출됨(=스트리밍 효과 없음). 그래서 XMLHttpRequest 의 onreadystatechange
 * (readyState === 3 LOADING) 를 활용해 응답이 도착하는 대로 점진적으로 파싱한다.
 *
 * 동작:
 * - xhr.responseText 는 누적이라 마지막으로 읽은 offset 이후만 잘라 buffer 에 붙임
 * - SSE 이벤트 구분자(`\n\n`) 단위로 끊어 parseSseChunks 호출
 * - `[DONE]` 만나면 abort + onDone
 * - HTTP 에러는 readyState === 4 DONE 시점에 본문 같이 묶어 onError
 */
async function streamSse(
  path: string,
  init: RequestInit,
  handlers: SseHandlers,
): Promise<void> {
  const token = await getAccessToken();

  if (__DEV__) {
    console.log("[sse] →", path, "method=", init.method ?? "GET");
  }

  return new Promise<void>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? "GET", `${API_BASE}${path}`);

    // 헤더 적용 — init.headers 는 Content-Type 등을 포함할 수 있고,
    // multipart/form-data 의 경우 Content-Type 을 자동 설정해야 하므로 set 하지 않음.
    const initHeaders =
      (init.headers as Record<string, string> | undefined) ?? {};
    for (const [k, v] of Object.entries(initHeaders)) {
      try {
        xhr.setRequestHeader(k, v);
      } catch {
        // 일부 헤더는 set 불가 — 무시
      }
    }
    xhr.setRequestHeader("Accept", "text/event-stream");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    let lastIndex = 0;
    let buffer = "";
    let settled = false;

    const settle = (kind: "done" | "error", err?: Error) => {
      if (settled) return;
      settled = true;
      if (kind === "error") {
        handlers.onError?.(err ?? new Error("네트워크 오류"));
      } else {
        handlers.onDone?.();
      }
      resolve();
    };

    const drain = () => {
      // 도착한 누적 응답에서 새 영역만 잘라 buffer 에 누적
      const fresh = xhr.responseText.slice(lastIndex);
      if (!fresh) return false;
      lastIndex = xhr.responseText.length;
      buffer += fresh;
      // SSE 이벤트 단위(`\n\n`)로 파싱
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (parseSseChunks(event, handlers)) {
          // [DONE] 만남 → 즉시 종료
          try {
            xhr.abort();
          } catch {
            // noop
          }
          settle("done");
          return true;
        }
      }
      return false;
    };

    xhr.onreadystatechange = () => {
      if (settled) return;
      // readyState 3: 본문이 도착하는 중 — 진짜 스트리밍 지점
      if (xhr.readyState === 3) {
        if (xhr.status >= 400) return; // 에러는 4 에서 처리
        drain();
        return;
      }
      // readyState 4: 응답 완전 종료
      if (xhr.readyState === 4) {
        if (__DEV__) {
          console.log("[sse] ← status", xhr.status);
        }
        if (xhr.status >= 400) {
          const body = (xhr.responseText ?? "").slice(0, 200);
          settle(
            "error",
            new Error(
              `SSE 연결 실패 (${xhr.status})${body ? ` — ${body}` : ""}`,
            ),
          );
          return;
        }
        // 잔여 데이터 처리
        const reachedDone = drain();
        if (reachedDone) return;
        // [DONE] 없이 끝났을 때 마지막 버퍼도 한 번 더 파싱
        if (buffer.trim().length > 0) {
          parseSseChunks(buffer, handlers);
          buffer = "";
        }
        settle("done");
      }
    };

    xhr.onerror = () => {
      if (__DEV__) console.log("[sse] xhr.onerror");
      settle("error", new Error("네트워크 오류"));
    };
    xhr.ontimeout = () => {
      settle("error", new Error("응답 시간 초과"));
    };

    try {
      // init.body 는 string | FormData | Blob 등 — XHR 가 그대로 처리
      xhr.send((init.body as XMLHttpRequestBodyInit | null) ?? null);
    } catch (e) {
      if (__DEV__) console.log("[sse] xhr.send threw:", e);
      settle("error", e instanceof Error ? e : new Error("요청 전송 실패"));
    }
  });
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
