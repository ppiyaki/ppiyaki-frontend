import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Gender = "남" | "여" | "비공개";

interface PresetImage {
  id: string;
  source: ImageSourcePropType;
}

const PRESETS: PresetImage[] = [
  { id: "p1", source: require("../../assets/images/pf/pfimg1.png") },
  { id: "p2", source: require("../../assets/images/pf/pfimg2.png") },
  { id: "p3", source: require("../../assets/images/pf/pfimg3.png") },
  { id: "p4", source: require("../../assets/images/pf/pfimg4.png") },
  { id: "p5", source: require("../../assets/images/pf/pfimg5.png") },
  { id: "p6", source: require("../../assets/images/pf/pfimg6.png") },
];

const GENDERS: Gender[] = ["남", "여", "비공개"];

const INITIAL = {
  name: "김복순",
  gender: "여" as Gender,
  presetId: "p4" as string | null,
  customUri: null as string | null,
};

export default function EditProfileScreen() {
  const router = useRouter();
  const confirm = useConfirm();

  const [name, setName] = useState(INITIAL.name);
  const [gender, setGender] = useState<Gender>(INITIAL.gender);
  const [presetId, setPresetId] = useState<string | null>(INITIAL.presetId);
  const [customUri, setCustomUri] = useState<string | null>(INITIAL.customUri);
  const [pickerOpen, setPickerOpen] = useState(false);

  const dirty =
    name.trim() !== INITIAL.name ||
    gender !== INITIAL.gender ||
    presetId !== INITIAL.presetId ||
    customUri !== INITIAL.customUri;

  const canSave = name.trim().length > 0 && (presetId || customUri);

  const currentImage: ImageSourcePropType | null = customUri
    ? { uri: customUri }
    : presetId
      ? PRESETS.find((p) => p.id === presetId)?.source ?? null
      : null;

  const handleSelectPreset = (id: string) => {
    setPresetId(id);
    setCustomUri(null);
  };

  const openLibrary = async () => {
    setPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCustomUri(result.assets[0].uri);
      setPresetId(null);
    }
  };

  const openCamera = async () => {
    setPickerOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCustomUri(result.assets[0].uri);
      setPresetId(null);
    }
  };

  const handleBack = async () => {
    if (!dirty) {
      router.back();
      return;
    }
    const ok = await confirm({
      title: "변경사항이 있어요",
      message: "저장하지 않고 나가면 변경한 내용이 사라져요.",
      confirmText: "나가기",
      danger: true,
    });
    if (ok) router.back();
  };

  const handleSave = () => {
    // TODO: 저장 API 연결
    router.back();
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="내 정보 수정" onBack={handleBack} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 현재 프로필 미리보기 */}
        <View style={styles.previewWrap}>
          <View style={styles.previewRing}>
            {currentImage && (
              <Image
                source={currentImage}
                style={styles.previewImg}
                resizeMode="cover"
              />
            )}
          </View>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.previewEdit,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="camera" size={16} color="#FFF" />
          </Pressable>
        </View>

        {/* 프리셋 선택 */}
        <View style={styles.section}>
          <AppText type="pretendard-b" style={styles.sectionTitle}>
            프로필 사진 고르기
          </AppText>
          <View style={styles.presetGrid}>
            {PRESETS.map((p) => {
              const on = p.id === presetId && !customUri;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => handleSelectPreset(p.id)}
                  style={[styles.presetItem, on && styles.presetItemOn]}
                >
                  <Image
                    source={p.source}
                    style={styles.presetImg}
                    resizeMode="cover"
                  />
                  {on && (
                    <View style={styles.presetCheck}>
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.uploadBtn,
              pressed && { backgroundColor: "#FBF7EC" },
            ]}
          >
            <Ionicons name="image-outline" size={18} color="#5BC4AE" />
            <AppText type="pretendard-b" style={styles.uploadText}>
              내 사진 가져오기
            </AppText>
          </Pressable>
        </View>

        {/* 이름 */}
        <View style={styles.section}>
          <AppText type="pretendard-b" style={styles.sectionTitle}>
            이름
          </AppText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력해주세요"
            placeholderTextColor="#BBB"
            maxLength={10}
          />
        </View>

        {/* 성별 */}
        <View style={styles.section}>
          <AppText type="pretendard-b" style={styles.sectionTitle}>
            성별
          </AppText>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => {
              const on = gender === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  style={[styles.genderBtn, on && styles.genderBtnOn]}
                >
                  <AppText
                    type="pretendard-b"
                    style={[styles.genderText, on && styles.genderTextOn]}
                  >
                    {g}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveBtn,
            !canSave && styles.saveBtnDisabled,
            pressed && canSave && { opacity: 0.85 },
          ]}
        >
          <AppText type="pretendard-b" style={styles.saveText}>
            저장하기
          </AppText>
        </Pressable>
      </View>

      {/* 사진 가져오기 바텀시트 */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <AppText type="pretendard-b" style={styles.sheetTitle}>
              사진을 어떻게 가져올까요?
            </AppText>
            <Pressable
              onPress={openCamera}
              style={({ pressed }) => [
                styles.sheetBtn,
                pressed && { backgroundColor: "#F4FBF9" },
              ]}
            >
              <Ionicons name="camera" size={24} color="#5BC4AE" />
              <AppText type="pretendard-b" style={styles.sheetBtnText}>
                카메라로 찍기
              </AppText>
            </Pressable>
            <Pressable
              onPress={openLibrary}
              style={({ pressed }) => [
                styles.sheetBtn,
                pressed && { backgroundColor: "#F4FBF9" },
              ]}
            >
              <Ionicons name="images" size={24} color="#5BC4AE" />
              <AppText type="pretendard-b" style={styles.sheetBtnText}>
                앨범에서 고르기
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setPickerOpen(false)}
              style={styles.sheetCancel}
            >
              <AppText type="pretendard-m" style={styles.sheetCancelText}>
                취소
              </AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 22,
  },

  /* ── 미리보기 ── */
  previewWrap: {
    alignItems: "center",
    paddingVertical: 12,
  },
  previewRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#F1ECDB",
  },
  previewImg: {
    width: "100%",
    height: "100%",
  },
  previewEdit: {
    position: "absolute",
    bottom: 8,
    transform: [{ translateX: 36 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5BC4AE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFDF6",
  },

  /* ── 섹션 공통 ── */
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#222",
    paddingHorizontal: 4,
  },

  /* ── 프리셋 그리드 ── */
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  presetItem: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#FAFAF6",
  },
  presetItemOn: {
    borderColor: "#5BC4AE",
  },
  presetImg: {
    width: "100%",
    height: "100%",
  },
  presetCheck: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#5BC4AE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#BDEFEA",
    backgroundColor: "#FFF",
  },
  uploadText: {
    fontSize: 14,
    color: "#5BC4AE",
  },

  /* ── 이름 ── */
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: "#222",
    backgroundColor: "#FFF",
  },

  /* ── 성별 ── */
  genderRow: {
    flexDirection: "row",
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  genderBtnOn: {
    borderColor: "#5BC4AE",
    backgroundColor: "#E8F7F2",
  },
  genderText: {
    fontSize: 15,
    color: "#888",
  },
  genderTextOn: {
    color: "#222",
  },

  /* ── 저장 footer ── */
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1ECDB",
    backgroundColor: "#FFFDF6",
  },
  saveBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#FFD24D",
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnDisabled: {
    backgroundColor: "#F0EDE0",
  },
  saveText: {
    fontSize: 17,
    color: "#222",
  },

  /* ── 바텀시트 ── */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 32,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 17,
    color: "#222",
    textAlign: "center",
    marginBottom: 8,
  },
  sheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  sheetBtnText: {
    fontSize: 16,
    color: "#222",
  },
  sheetCancel: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  sheetCancelText: {
    fontSize: 15,
    color: "#888",
  },
});
