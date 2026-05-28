import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { registerPrescription } from "@/services/prescriptions";
import { uploadImage } from "@/services/upload";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Phase = "idle" | "uploading" | "analyzing";

export default function PrescriptionCameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  // 동기 락 — React state는 setState 호출 후 다음 렌더까지 갱신되지 않아 빠른 더블탭이 모두 가드를 통과함.
  const capturingRef = useRef(false);

  const handleCapture = async () => {
    if (capturingRef.current || phase !== "idle") return;
    capturingRef.current = true;
    setError(null);

    // ── 1) 사진 촬영
    let photoUri: string | undefined;
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.7,
      });
      photoUri = photo?.uri;
      console.log("[prescription] 1) photo:", photoUri);
    } catch (e) {
      console.log("[prescription] 1) takePictureAsync error:", e);
      setError(`사진 촬영 실패: ${formatError(e)}`);
      capturingRef.current = false;
      return;
    }
    if (!photoUri) {
      setError("사진을 가져오지 못했어요 (uri null)");
      capturingRef.current = false;
      return;
    }

    // ── 2) Presigned URL + S3 업로드
    setPhase("uploading");
    let objectKey: string;
    try {
      objectKey = await uploadImage("PRESCRIPTION", photoUri);
      console.log("[prescription] 2) objectKey:", objectKey);
    } catch (e) {
      console.log("[prescription] 2) upload error:", e);
      setPhase("idle");
      setError(`업로드 실패: ${formatError(e)}`);
      capturingRef.current = false;
      return;
    }

    // ── 3) OCR 등록
    setPhase("analyzing");
    try {
      const detail = await registerPrescription(objectKey);
      console.log("[prescription] 3) register success:", {
        id: detail.id,
        status: detail.status,
        candidatesCount: detail.candidates.length,
      });
      router.replace({
        pathname: "/prescription/result",
        params: { id: String(detail.id) },
      });
      // 성공 시에는 화면을 떠나므로 락 해제 불필요. 그래도 방어적으로 풀어둠.
      capturingRef.current = false;
    } catch (e) {
      console.log("[prescription] 3) register error:", e);
      setPhase("idle");
      setError(`OCR 등록 실패: ${formatError(e)}`);
      capturingRef.current = false;
    }
  };

  // 에러를 사람이 읽을 수 있는 문자열로 변환
  const formatError = (e: unknown): string => {
    if (e instanceof Error) {
      const anyErr = e as Error & { status?: number; code?: string };
      const status = anyErr.status ? ` [${anyErr.status}]` : "";
      const code = anyErr.code ? ` (${anyErr.code})` : "";
      return `${e.message}${status}${code}`;
    }
    return String(e);
  };

  if (!permission) {
    return <SafeAreaView style={styles.safe} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={["top", "left", "right", "bottom"]}
      >
        <PageHeader title="처방전 등록" />
        <View style={styles.permissionBox}>
          <AppText type="pretendard-m" style={styles.permissionText}>
            카메라 권한이 필요합니다
          </AppText>
          <Pressable onPress={requestPermission} style={styles.permissionBtn}>
            <AppText type="pretendard-b" style={styles.permissionBtnText}>
              권한 허용
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const busy = phase !== "idle";
  const overlayMessage =
    phase === "uploading"
      ? "처방전 사진을 보내고 있어요..."
      : phase === "analyzing"
        ? "삐약이가 처방전을 읽고 있어요...\n잠시만 기다려주세요"
        : null;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="처방전 등록" />

      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
        />

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#FFF" />
            <AppText type="pretendard-b" style={styles.errorText}>
              {error}
            </AppText>
          </View>
        )}

        <View style={styles.shutterWrap}>
          <Pressable
            onPress={handleCapture}
            disabled={busy}
            style={({ pressed }) => [
              styles.shutter,
              (pressed || busy) && styles.shutterPressed,
            ]}
          >
            <Ionicons name="camera" size={22} color="#333" />
            <AppText type="pretendard-b" style={styles.shutterText}>
              찍기
            </AppText>
          </Pressable>
        </View>

        {overlayMessage && (
          <View style={styles.overlay} pointerEvents="auto">
            <ActivityIndicator size="large" color="#FFD24D" />
            <AppText type="pretendard-b" style={styles.overlayText}>
              {overlayMessage}
            </AppText>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FDFCF3",
  },
  cameraWrap: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  shutterWrap: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  shutter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD045",
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  shutterPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  shutterText: {
    fontSize: 17,
    color: "#333",
  },
  errorBanner: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(225,75,75,0.9)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#FFF",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 18,
  },
  overlayText: {
    fontSize: 16,
    color: "#FFF",
    textAlign: "center",
    lineHeight: 24,
  },
  permissionBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  permissionText: {
    fontSize: 16,
    color: "#444",
  },
  permissionBtn: {
    backgroundColor: "#FFD045",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: {
    fontSize: 15,
    color: "#333",
  },
});
