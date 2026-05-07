import {
  isAuthError,
  isCareError,
  userFriendlyMessage,
} from "./error-codes";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "./token-storage";

export const API_BASE = "https://ppiyaki.store";
const DEFAULT_TIMEOUT_MS = 12_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message?: string,
    public body?: unknown,
  ) {
    super(message ?? `API error ${status}`);
    this.name = "ApiError";
  }

  /** 사용자에게 보여줄 친화 메시지 */
  toUserMessage(fallback?: string): string {
    return userFriendlyMessage(this.code, fallback ?? this.message);
  }

  isAuthError(): boolean {
    return isAuthError(this.code);
  }

  isCareError(): boolean {
    return isCareError(this.code);
  }
}

export interface ApiOptions extends Omit<RequestInit, "signal"> {
  /** Authorization 헤더 자동 주입을 끔 (로그인/회원가입 등) */
  skipAuth?: boolean;
  /** 401 → refresh → 재시도를 끔 */
  skipRefresh?: boolean;
  /** 요청 타임아웃 (ms). 기본 30s */
  timeout?: number;
  /** JSON body 자동 직렬화 */
  json?: unknown;
  /** 쿼리 파라미터 (object → ?key=value 자동 변환) */
  query?: Record<string, string | number | boolean | undefined | null>;
}

let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw new ApiError(401, "AUTH_001", "refresh token 없음");
    }
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      await clearTokens();
      throw new ApiError(res.status, "AUTH_001", "토큰 갱신 실패");
    }
    const body = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    await saveTokens(body.accessToken, body.refreshToken);
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * 백엔드가 두 가지 에러 응답 형식을 사용함:
 *  - `{ code, message }` (명세)
 *  - `{ error: { code, message, status }, success: false }` (실측)
 * 둘 다 흡수해서 code/message 추출.
 */
function extractError(body: unknown): { code?: string; message?: string } {
  if (!body || typeof body !== "object") return {};
  const obj = body as Record<string, unknown>;
  const inner = obj.error;
  if (inner && typeof inner === "object") {
    const innerObj = inner as Record<string, unknown>;
    return {
      code: typeof innerObj.code === "string" ? innerObj.code : undefined,
      message:
        typeof innerObj.message === "string" ? innerObj.message : undefined,
    };
  }
  return {
    code: typeof obj.code === "string" ? obj.code : undefined,
    message: typeof obj.message === "string" ? obj.message : undefined,
  };
}

function buildUrl(path: string, query?: ApiOptions["query"]): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function buildHeaders(
  options: ApiOptions,
  hasJsonBody: boolean,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (!options.skipAuth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (hasJsonBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

/**
 * 통합 API 호출 함수.
 * - Authorization 헤더 자동 주입
 * - 401 시 refresh 후 자동 재시도
 * - 30s 타임아웃
 * - JSON / 쿼리 자동 처리
 *
 * 응답 본문이 비었거나 204면 undefined 반환.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const {
    skipAuth,
    skipRefresh,
    timeout = DEFAULT_TIMEOUT_MS,
    json,
    query,
    body,
    method,
    ...rest
  } = options;

  const hasJsonBody = json !== undefined;
  const requestBody = hasJsonBody ? JSON.stringify(json) : body;

  const doFetch = async (): Promise<Response> => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    try {
      return await fetch(buildUrl(path, query), {
        ...rest,
        method: method ?? (hasJsonBody ? "POST" : "GET"),
        headers: await buildHeaders({ ...options }, hasJsonBody),
        body: requestBody as BodyInit | undefined,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const logPrefix = `[api] ${method ?? (hasJsonBody ? "POST" : "GET")} ${path}`;

  let res: Response;
  try {
    if (__DEV__) {
      console.log(`${logPrefix} →`, json ?? body ?? "(no body)");
    }
    res = await doFetch();
  } catch (e) {
    if (__DEV__) console.log(`${logPrefix} ✗ network`, e);
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiError(0, "TIMEOUT", "요청 시간이 초과되었습니다");
    }
    throw new ApiError(0, "NETWORK", "네트워크 오류");
  }

  if (res.status === 401 && !skipAuth && !skipRefresh) {
    if (__DEV__) console.log(`${logPrefix} ⚠ 401 → refresh & retry`);
    try {
      await refreshAccessToken();
      res = await doFetch();
    } catch {
      throw new ApiError(401, "AUTH_001", "인증이 만료되었습니다");
    }
  }

  if (res.status === 204) {
    if (__DEV__) console.log(`${logPrefix} ← 204`);
    return undefined as T;
  }

  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    if (__DEV__) console.log(`${logPrefix} ← ${res.status}`, parsed);
    const { code, message } = extractError(parsed);
    throw new ApiError(res.status, code, message, parsed);
  }

  if (__DEV__) console.log(`${logPrefix} ← ${res.status}`);
  return parsed as T;
}
