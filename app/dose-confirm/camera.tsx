import AppText from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, FlashMode, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DoseConfirmCameraScreen() {
  const router = useRouter();
  const { scheduleId, targetDate, attempts } = useLocalSearchParams<{
    scheduleId?: string;
    targetDate?: string;
    attempts?: string;
  }>();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<FlashMode>("off");
  const [taking, setTaking] = useState(false);

  const handleCapture = async () => {
    if (taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.7,
      });
      if (photo?.uri) {
        router.replace({
          pathname: "/dose-confirm/preview" as any,
          params: { uri: photo.uri, scheduleId, targetDate, attempts },
        });
      }
    } catch {
      // 프로토타입에서는 무시
    } finally {
      setTaking(false);
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
        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={48} color="#888" />
          <AppText type="pretendard-b" style={styles.permissionTitle}>
            카메라 권한이 필요해요
          </AppText>
          <AppText type="pretendard-m" style={styles.permissionDesc}>
            약 사진을 찍기 위해 카메라를 사용할게요
          </AppText>
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => [
              styles.permissionBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <AppText type="pretendard-b" style={styles.permissionBtnText}>
              권한 허용하기
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flash}
      />

      {/* 상단 헤더 */}
      <SafeAreaView edges={["top"]} style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons name="close" size={24} color="#FFF" />
        </Pressable>
        <AppText type="pretendard-b" style={styles.topTitle}>
          복약 인증
        </AppText>
        <Pressable
          onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons
            name={flash === "off" ? "flash-off" : "flash"}
            size={22}
            color="#FFF"
          />
        </Pressable>
      </SafeAreaView>

      {/* 가이드 박스 */}
      <View style={styles.guideWrap} pointerEvents="none">
        <View style={styles.guideBox}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <View style={styles.helperPill}>
          <AppText type="pretendard-b" style={styles.helperText}>
            이 안에 약이 보이게 찍어주세요
          </AppText>
        </View>
      </View>

      {/* 하단 셔터 */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
        <View style={styles.bottomSide} />
        <Pressable
          onPress={handleCapture}
          disabled={taking}
          style={({ pressed }) => [
            styles.shutter,
            pressed && { transform: [{ scale: 0.95 }] },
            taking && { opacity: 0.6 },
          ]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.bottomSide} />
      </SafeAreaView>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICK = 4;
const CORNER_COLOR = "#FFD24D";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },

  /* 권한 화면 */
  permissionBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  permissionTitle: {
    fontSize: 18,
    color: "#222",
    marginTop: 12,
  },
  permissionDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  permissionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFD24D",
  },
  permissionBtnText: {
    fontSize: 15,
    color: "#222",
  },

  /* 헤더 */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  topTitle: {
    flex: 1,
    fontSize: 17,
    color: "#FFF",
    textAlign: "center",
  },

  /* 가이드 박스 */
  guideWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  guideBox: {
    width: "78%",
    aspectRatio: 1,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderLeftWidth: CORNER_THICK,
    borderTopWidth: CORNER_THICK,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderRightWidth: CORNER_THICK,
    borderTopWidth: CORNER_THICK,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderLeftWidth: CORNER_THICK,
    borderBottomWidth: CORNER_THICK,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderRightWidth: CORNER_THICK,
    borderBottomWidth: CORNER_THICK,
    borderBottomRightRadius: 12,
  },
  helperPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
  },
  helperText: {
    fontSize: 13,
    color: "#FFF",
  },

  /* 셔터 */
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bottomSide: {
    flex: 1,
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFD24D",
  },
});
