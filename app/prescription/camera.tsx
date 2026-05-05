import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrescriptionCameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [taking, setTaking] = useState(false);

  const handleCapture = async () => {
    if (taking) return;
    setTaking(true);
    try {
      await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    } catch (e) {
      // 프로토타입: 무시
    }
    // 프로토타입: 50% 확률로 성공/실패 분기
    const success = Math.random() > 0.3;
    setTaking(false);
    if (success) {
      router.replace("/prescription/result");
    } else {
      router.replace("/prescription/failed");
    }
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

        <View style={styles.shutterWrap}>
          <Pressable
            onPress={handleCapture}
            disabled={taking}
            style={({ pressed }) => [
              styles.shutter,
              (pressed || taking) && styles.shutterPressed,
            ]}
          >
            <Ionicons name="camera" size={22} color="#333" />
            <AppText type="pretendard-b" style={styles.shutterText}>
              찍기
            </AppText>
          </Pressable>
        </View>
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
