import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { getMe, ProfileImageIndex, SeniorGender } from "@/services/auth";
import { uploadImage } from "@/services/upload";
import { updateMyProfile } from "@/services/users";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

type GenderLabel = "남" | "여" | "비공개";

interface PresetImage {
  index: ProfileImageIndex;
  source: ImageSourcePropType;
}

const PRESETS: PresetImage[] = [
  { index: 1, source: require("../../assets/images/pf/pfimg1.png") },
  { index: 2, source: require("../../assets/images/pf/pfimg2.png") },
  { index: 3, source: require("../../assets/images/pf/pfimg3.png") },
  { index: 4, source: require("../../assets/images/pf/pfimg4.png") },
  { index: 5, source: require("../../assets/images/pf/pfimg5.png") },
  { index: 6, source: require("../../assets/images/pf/pfimg6.png") },
];

const GENDERS: GenderLabel[] = ["남", "여", "비공개"];

// 백엔드 enum ↔ 한글 라벨 매핑
const LABEL_TO_API: Record<GenderLabel, SeniorGender> = {
  남: "MALE",
  여: "FEMALE",
  비공개: "UNKNOWN",
};
const API_TO_LABEL: Record<SeniorGender, GenderLabel> = {
  MALE: "남",
  FEMALE: "여",
  OTHER: "비공개",
  UNKNOWN: "비공개",
};

export default function EditProfileScreen() {
  const router = useRouter();
  const confirm = useConfirm();

  // 서버에서 받아온 초기값 (dirty 검사용)
  const [initialName, setInitialName] = useState("");
  const [initialGender, setInitialGender] = useState<GenderLabel>("비공개");
  const [initialPresetIndex, setInitialPresetIndex] =
    useState<ProfileImageIndex | null>(null);
  const [initialServerImageUrl, setInitialServerImageUrl] = useState<
    string | null
  >(null);
  // 시니어 본인만 성별 수정 가능 — 보호자 클라이언트는 gender 미전송 (백엔드 명세)
  const [isSenior, setIsSenior] = useState(false);

  // 편집 중인 값
  const [name, setName] = useState("");
  const [gender, setGender] = useState<GenderLabel>("비공개");
  const [presetIndex, setPresetIndex] = useState<ProfileImageIndex | null>(
    null,
  );
  const [customUri, setCustomUri] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // 서버에서 현재 프로필 로드
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await getMe(true);
        if (cancelled) return;
        setIsSenior(me.role === "SENIOR");
        setInitialName(me.nickname);
        setName(me.nickname);
        const g: GenderLabel = me.gender ? API_TO_LABEL[me.gender] : "비공개";
        setInitialGender(g);
        setGender(g);
        // 프사 한 번도 설정 안 한 사용자는 미리보기/그리드가 비어보이지 않게
        // 기본값 1번 (pfimg1) 으로 preselect — 홈 카드도 동일한 fallback 사용 중
        const rawIdx = me.profileImage ?? null;
        const hasCustom = !!me.profileImageUrl;
        const idx = (
          rawIdx ?? (hasCustom ? null : 1)
        ) as ProfileImageIndex | null;
        setInitialPresetIndex(idx);
        setPresetIndex(idx);
        setInitialServerImageUrl(me.profileImageUrl ?? null);
      } catch {
        // 무시
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty =
    name.trim() !== initialName ||
    (isSenior && gender !== initialGender) ||
    presetIndex !== initialPresetIndex ||
    customUri !== null;

  // 저장 가능 조건: 닉네임 있고 + 프사가 어떤 형태로든 존재(새 프리셋/새 업로드/서버에 이미 등록된 커스텀)
  // 기존 커스텀 프사만 있고 이름만 바꿔도 저장 가능하도록 initialServerImageUrl 포함.
  const canSave =
    name.trim().length > 0 &&
    (presetIndex != null ||
      customUri != null ||
      initialServerImageUrl != null) &&
    !saving;

  // 새로 고른 사진이 있으면 우선 표시. 없으면 preset, 그것도 없으면 서버에서 받은 url
  const currentImage: ImageSourcePropType | null = customUri
    ? { uri: customUri }
    : presetIndex != null
      ? PRESETS.find((p) => p.index === presetIndex)?.source ?? null
      : initialServerImageUrl
        ? { uri: initialServerImageUrl }
        : null;

  const handleSelectPreset = (idx: ProfileImageIndex) => {
    setPresetIndex(idx);
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
      setPresetIndex(null);
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
      setPresetIndex(null);
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

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let profileImageObjectKey: string | undefined;
      // 새로 찍거나 골라온 사진이 있으면 먼저 S3 업로드 → objectKey 발급
      if (customUri) {
        profileImageObjectKey = await uploadImage("PROFILE_IMAGE", customUri);
      } else if (presetIndex == null && initialServerImageUrl) {
        // 기존에 등록된 커스텀 프사가 있고 이번에 프리셋도 안 골랐으면 그대로 유지.
        // 백엔드 PUT 이 두 필드 모두 omit 시 기본 프사로 리셋하는 동작이라,
        // presigned URL 에서 objectKey 를 직접 추출해 재전송.
        const existing = extractProfileObjectKey(initialServerImageUrl);
        if (existing) profileImageObjectKey = existing;
      }
      await updateMyProfile({
        nickname: name.trim(),
        // customUri 있으면 objectKey 만 전송 (profileImage 와 상호 배타)
        ...(profileImageObjectKey
          ? { profileImageObjectKey }
          : presetIndex != null
            ? { profileImage: presetIndex }
            : {}),
        // 시니어만 gender 전송. 보호자는 명세상 미전송.
        ...(isSenior ? { gender: LABEL_TO_API[gender] } : {}),
      });
      router.back();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "저장에 실패했어요";
      await confirm({
        title: "저장 실패",
        message: msg,
        confirmText: "확인",
      });
      setSaving(false);
    }
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
              const on = p.index === presetIndex && !customUri;
              return (
                <Pressable
                  key={p.index}
                  onPress={() => handleSelectPreset(p.index)}
                  style={styles.presetItem}
                >
                  {/* overflow:hidden 은 이미지 마스킹 + 선택 테두리에만 적용. */}
                  {/* 체크 뱃지는 이 wrap 바깥으로 빼서 잘리지 않게. */}
                  <View
                    style={[
                      styles.presetImgWrap,
                      on && styles.presetImgWrapOn,
                    ]}
                  >
                    <Image
                      source={p.source}
                      style={styles.presetImg}
                      resizeMode="cover"
                    />
                  </View>
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

        {/* 성별 — 시니어 본인만 수정 가능. 보호자는 섹션 자체 숨김. */}
        {isSenior && (
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
        )}
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
            {saving ? "저장 중..." : "저장하기"}
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

/**
 * 백엔드가 내려준 presigned GET URL 에서 profile-image objectKey 부분만 추출.
 * 형식: `profile-image/{userId}/{uuid}.{ext}` — query string / 호스트 / 버킷 모두 제외.
 * URL 형식이 바뀌면 null 반환 → 호출자가 적절히 fallback.
 */
function extractProfileObjectKey(presignedUrl: string): string | null {
  const m = presignedUrl.match(
    /profile-image\/\d+\/[A-Za-z0-9-]+\.[A-Za-z0-9]+/,
  );
  return m ? m[0] : null;
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
  // 바깥 셀 — overflow:hidden 없음. 체크 뱃지가 잘리지 않도록.
  presetItem: {
    width: "30%",
    aspectRatio: 1,
    position: "relative",
  },
  // 이미지 마스킹 + 선택 테두리만 담당
  presetImgWrap: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#FAFAF6",
  },
  presetImgWrapOn: {
    borderColor: "#5BC4AE",
  },
  presetImg: {
    width: "100%",
    height: "100%",
  },
  // 체크 뱃지는 presetItem 의 자식으로, presetImgWrap 바깥. 잘리지 않음.
  presetCheck: {
    position: "absolute",
    bottom: 0,
    right: 0,
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
