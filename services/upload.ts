import { apiFetch } from "./api";

export type UploadPurpose = "PRESCRIPTION" | "MEDICATION_LOG" | "PROFILE_IMAGE";
export type UploadExtension = "jpg" | "jpeg" | "png" | "webp";

export interface PresignedUrlResponse {
  objectKey: string;
  presignedUrl: string;
  expiresAt: string;
}

/**
 * NCP Object Storage에 직접 업로드할 수 있는 presigned PUT URL 발급.
 */
export async function requestPresignedUrl(params: {
  purpose: UploadPurpose;
  extension: UploadExtension;
  contentType: string;
}): Promise<PresignedUrlResponse> {
  return apiFetch<PresignedUrlResponse>("/api/v1/uploads/presigned", {
    method: "POST",
    json: params,
  });
}

const EXTENSION_TO_MIME: Record<UploadExtension, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function inferExtension(uri: string): UploadExtension {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".jpeg")) return "jpeg";
  return "jpg";
}

/**
 * S3에 binary로 직접 PUT 업로드.
 */
async function putToPresignedUrl(
  presignedUrl: string,
  fileUri: string,
  contentType: string,
): Promise<void> {
  if (__DEV__) {
    console.log("[upload] S3 PUT →", presignedUrl.slice(0, 80) + "...");
  }
  const blob = await (await fetch(fileUri)).blob();
  const res = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (__DEV__) {
    console.log("[upload] S3 PUT ←", res.status);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`S3 업로드 실패 (${res.status}) ${text.slice(0, 120)}`);
  }
}

/**
 * 통합 업로드: presigned URL 발급 → S3 PUT → objectKey 반환.
 */
export async function uploadImage(
  purpose: UploadPurpose,
  fileUri: string,
): Promise<string> {
  const extension = inferExtension(fileUri);
  const contentType = EXTENSION_TO_MIME[extension];

  const { objectKey, presignedUrl } = await requestPresignedUrl({
    purpose,
    extension,
    contentType,
  });

  await putToPresignedUrl(presignedUrl, fileUri, contentType);
  return objectKey;
}
