import AppText from "@/components/app-text";
import { useConfirm } from "@/contexts/confirm-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError } from "@/services/api";
import type { CareMode, SeniorGender } from "@/services/auth";
import { getMe, logoutKakao, MeResponse } from "@/services/auth";
import { InviteCodeResponse, issueInviteCode } from "@/services/care-relations";
import {
  LinkedSenior,
  listLinkedSeniors,
  unlinkSenior,
} from "@/services/caregivers";
import { applyNotificationPreset } from "@/services/notification-settings";
import { createSenior } from "@/services/seniors";
import { updateSeniorProfile } from "@/services/users";
import { resolveProfileImage } from "@/utils/profile-image";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SENIOR_AVATAR = require("../../assets/images/pf/pfimg2.png");
const FEEDBACK_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSe0M3RI8XUrQDW8x0x4P_Wa_Dp2BC49hf9YVctUNqUho7VrWA/viewform?pli=1";

// TODO: 백엔드 이메일 필드 추가되면 me.email 사용
const PLACEHOLDER_EMAIL = "이메일 미연동";

export default function FamilyProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const confirm = useConfirm();
  useRequireAuth();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [seniors, setSeniors] = useState<LinkedSenior[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteSenior, setInviteSenior] = useState<LinkedSenior | null>(null);
  const [editingSenior, setEditingSenior] = useState<LinkedSenior | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const nickname = me?.nickname ?? "";
  const myAvatarSource = resolveProfileImage({
    profileImage: me?.profileImage ?? null,
    profileImageUrl: me?.profileImageUrl ?? null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, list] = await Promise.all([
        getMe(true).catch(() => null),
        listLinkedSeniors().catch((e) => {
          console.log("[family-profile] listLinkedSeniors failed:", e);
          return [] as LinkedSenior[];
        }),
      ]);
      if (meRes) setMe(meRes);
      setSeniors(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openInviteModal = (senior: LinkedSenior) => {
    setInviteSenior(senior);
  };

  const closeInviteModal = () => {
    setInviteSenior(null);
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: "로그아웃",
      message: "정말 로그아웃 하시겠어요?",
      confirmText: "로그아웃",
      danger: true,
    });
    if (!ok) return;
    try {
      await logoutKakao();
    } finally {
      // 네비게이션 스택 완전 초기화 — 뒤로가기로 보호자 메인에 돌아오지 못하게.
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "family-login" }],
        }),
      );
    }
  };

  const handleUnlink = async (senior: LinkedSenior) => {
    const ok = await confirm({
      title: "연동 해제",
      message: `${senior.nickname}님과의 연동을 해제하시겠어요?`,
      confirmText: "해제",
      danger: true,
    });
    if (!ok) return;
    try {
      await unlinkSenior(senior.id);
      await load();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "연동 해제에 실패했어요";
      await confirm({
        title: "해제 실패",
        message: msg,
        confirmText: "확인",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <AppText type="pretendard-b" style={styles.pageTitle}>
          내 정보
        </AppText>

        {/* 보호자 카드 */}
        <View style={styles.userCard}>
          <View style={styles.avatarRing}>
            <Image
              source={myAvatarSource}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText type="pretendard-b" style={styles.userName}>
              {nickname || " "}
            </AppText>
            <AppText type="pretendard-m" style={styles.userEmail}>
              {PLACEHOLDER_EMAIL}
            </AppText>
          </View>
          <Pressable
            onPress={() => router.push("/settings/edit-profile" as any)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.editMyBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="create-outline" size={18} color="#666" />
          </Pressable>
        </View>

        {/* 연동된 시니어 관리 */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <AppText type="pretendard-b" style={styles.sectionTitle}>
              연동된 시니어 관리
            </AppText>
            <Pressable
              onPress={() => setAddOpen(true)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.addSeniorBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="add" size={20} color="#5BC4AE" />
            </Pressable>
          </View>
          <View style={styles.seniorListCard}>
            {loading && (
              <View style={styles.seniorEmpty}>
                <ActivityIndicator size="small" color="#FFD24D" />
              </View>
            )}
            {!loading && seniors.length === 0 && (
              <AppText type="pretendard-m" style={styles.seniorEmptyText}>
                연동된 시니어가 없어요
              </AppText>
            )}
            {!loading &&
              seniors.map((senior, idx) => (
                <SeniorRow
                  key={senior.id}
                  senior={senior}
                  showDivider={idx < seniors.length - 1}
                  onUnlink={() => handleUnlink(senior)}
                  onManage={() => openInviteModal(senior)}
                />
              ))}
          </View>
        </View>

        {/* 설정 */}
        <View style={styles.section}>
          <AppText type="pretendard-b" style={styles.sectionTitle}>
            설정
          </AppText>
          <View style={styles.settingsGroup}>
            <SettingRow
              icon="settings-outline"
              iconColor="#5BC4AE"
              iconBg="#D6F1EA"
              label="모니터링 / 알림 설정"
              onPress={() => router.push("/settings/monitoring" as any)}
            />
            <SettingRow
              icon="restaurant-outline"
              iconColor="#5BC4AE"
              iconBg="#D6F1EA"
              label="복약시간 설정"
              onPress={() => router.push("/settings/senior-meal-times" as any)}
            />
            <SettingRow
              icon="information-circle-outline"
              iconColor="#F8B835"
              iconBg="#FFF1C8"
              label="앱 정보"
              onPress={() => router.push("/settings/app-info" as any)}
            />
            <SettingRow
              icon="help-circle-outline"
              iconColor="#F8B835"
              iconBg="#FFF1C8"
              label="문의하기"
              onPress={() => void Linking.openURL(FEEDBACK_URL)}
            />
            <SettingRow
              icon="log-out-outline"
              iconColor="#888"
              iconBg="#F0EDE0"
              label="로그아웃"
              onPress={handleLogout}
            />
            <SettingRow
              icon="remove-circle-outline"
              iconColor="#C95C5C"
              iconBg="#FCEBEB"
              label="회원탈퇴"
              onPress={() => router.push("/settings/withdraw" as any)}
            />
          </View>
        </View>
      </ScrollView>

      <InviteCodeModal
        senior={inviteSenior}
        onClose={closeInviteModal}
        onOpenEdit={(senior) => {
          setInviteSenior(null);
          setEditingSenior(senior);
        }}
      />
      <EditSeniorProfileModal
        senior={editingSenior}
        onClose={() => setEditingSenior(null)}
        onSaved={async () => {
          setEditingSenior(null);
          await load();
        }}
      />
      <AddSeniorModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={async () => {
          setAddOpen(false);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function AddSeniorModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const confirm = useConfirm();
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<SeniorGender | null>(null);
  const [careMode, setCareMode] = useState<CareMode | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 모달 닫힐 때 폼 리셋
  useEffect(() => {
    if (!visible) {
      setNickname("");
      setGender(null);
      setCareMode(null);
      setSubmitting(false);
    }
  }, [visible]);

  const canSubmit =
    nickname.trim().length > 0 && !!gender && !!careMode && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createSenior({
        nickname: nickname.trim(),
        gender: gender!,
        careMode: careMode!,
      });
      // 시니어 엔티티엔 careMode 저장되지만 notification-settings 는 기본값으로 생성되어
      // 모니터링 화면 inferredPreset 추론이 어긋남 → 생성 직후 preset 도 같이 적용.
      try {
        await applyNotificationPreset(created.seniorId, careMode!);
      } catch (presetErr) {
        console.log("[add-senior] applyNotificationPreset failed:", presetErr);
        // preset 실패해도 시니어는 이미 생성됨 — 다음 모니터링 화면에서 수동 조정 가능
      }
      onCreated();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "시니어 추가에 실패했어요";
      await confirm({
        title: "추가 실패",
        message: msg,
        confirmText: "확인",
      });
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* 배경 탭 시 입력값 유실 막기 위해 onClose 대신 키보드만 내린다 — 닫기는 X 버튼으로 */}
      <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={addStyles.kav}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHead}>
              <AppText type="pretendard-b" style={styles.modalTitle}>
                시니어 추가
              </AppText>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color="#666" />
              </Pressable>
            </View>

            <AppText type="pretendard-m" style={styles.modalDesc}>
              관리할 시니어의 정보를 입력해주세요.
            </AppText>

            <View style={addStyles.fieldGroup}>
              <AppText type="pretendard-b" style={addStyles.label}>
                닉네임
              </AppText>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                placeholder="예: 김장군"
                placeholderTextColor="#BBB"
                maxLength={10}
                style={addStyles.input}
              />
            </View>

            <View style={addStyles.fieldGroup}>
              <AppText type="pretendard-b" style={addStyles.label}>
                성별
              </AppText>
              <View style={addStyles.choiceRow}>
                {(
                  [
                    { key: "MALE", label: "남" },
                    { key: "FEMALE", label: "여" },
                  ] as { key: SeniorGender; label: string }[]
                ).map((opt) => {
                  const on = gender === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setGender(opt.key)}
                      style={[addStyles.choiceBtn, on && addStyles.choiceBtnOn]}
                    >
                      <AppText
                        type="pretendard-b"
                        style={[
                          addStyles.choiceText,
                          on && addStyles.choiceTextOn,
                        ]}
                      >
                        {opt.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={addStyles.fieldGroup}>
              <AppText type="pretendard-b" style={addStyles.label}>
                케어 모드
              </AppText>
              <View style={addStyles.modeCol}>
                {(
                  [
                    {
                      key: "AUTONOMOUS",
                      title: "기본 관리 모드",
                      desc: "꼭 필요한 알림만",
                    },
                    {
                      key: "MANAGED",
                      title: "집중 관리 모드",
                      desc: "실시간 확인과 빠른 경고",
                    },
                  ] as { key: CareMode; title: string; desc: string }[]
                ).map((opt) => {
                  const on = careMode === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setCareMode(opt.key)}
                      style={[addStyles.modeBtn, on && addStyles.modeBtnOn]}
                    >
                      <View style={{ flex: 1 }}>
                        <AppText
                          type="pretendard-b"
                          style={[
                            addStyles.modeTitle,
                            on && addStyles.modeTitleOn,
                          ]}
                        >
                          {opt.title}
                        </AppText>
                        <AppText type="pretendard-m" style={addStyles.modeDesc}>
                          {opt.desc}
                        </AppText>
                      </View>
                      {on && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#F8B835"
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.modalCopyBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <AppText type="pretendard-b" style={styles.modalCopyText}>
                  취소
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.modalPrimaryBtn,
                  !canSubmit && styles.modalPrimaryBtnDisabled,
                  pressed && canSubmit && { opacity: 0.85 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#222" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color="#222" />
                    <AppText
                      type="pretendard-b"
                      style={styles.modalPrimaryText}
                    >
                      추가하기
                    </AppText>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const addStyles = StyleSheet.create({
  kav: {
    width: "100%",
    alignItems: "center",
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: "#444",
  },
  input: {
    height: 46,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: "#222",
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#E5E0CE",
    borderRadius: 10,
  },
  choiceRow: {
    flexDirection: "row",
    gap: 8,
  },
  choiceBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E0CE",
    backgroundColor: "#FAFAF6",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceBtnOn: {
    borderColor: "#F8B835",
    backgroundColor: "#FFF4C7",
  },
  choiceText: {
    fontSize: 15,
    color: "#888",
  },
  choiceTextOn: {
    color: "#171717",
  },
  modeCol: {
    gap: 8,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E0CE",
    backgroundColor: "#FAFAF6",
  },
  modeBtnOn: {
    borderColor: "#F8B835",
    backgroundColor: "#FFF9E1",
  },
  modeTitle: {
    fontSize: 15,
    color: "#444",
  },
  modeTitleOn: {
    color: "#171717",
  },
  modeDesc: {
    marginTop: 2,
    fontSize: 12,
    color: "#888",
  },
});

const REISSUE_COOLDOWN_MS = 30_000;

// 모듈 레벨 캐시 — 모달이 unmount돼도 쿨다운/코드가 유지됨.
// 같은 세션 내에서만 의미 있으면 충분해서 SecureStore 까지는 필요 없음.
interface InviteCache {
  data: InviteCodeResponse;
  issuedAt: number;
}
const inviteCache = new Map<number, InviteCache>();

function getRemainingCooldownSec(seniorId: number): number {
  const c = inviteCache.get(seniorId);
  if (!c) return 0;
  const elapsed = Date.now() - c.issuedAt;
  if (elapsed >= REISSUE_COOLDOWN_MS) return 0;
  return Math.ceil((REISSUE_COOLDOWN_MS - elapsed) / 1000);
}

function InviteCodeModal({
  senior,
  onClose,
  onOpenEdit,
}: {
  senior: LinkedSenior | null;
  onClose: () => void;
  onOpenEdit: (senior: LinkedSenior) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InviteCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldownTicker = (initialSeconds: number) => {
    setCooldown(initialSeconds);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    if (initialSeconds <= 0) return;
    cooldownTimer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          cooldownTimer.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const visible = senior !== null;

  const fetchCode = async (sId: number) => {
    setLoading(true);
    setError(null);
    setData(null);
    setCopied(false);
    try {
      const res = await issueInviteCode(sId);
      setData(res);
      inviteCache.set(sId, { data: res, issuedAt: Date.now() });
      startCooldownTicker(REISSUE_COOLDOWN_MS / 1000);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.toUserMessage()
          : "초대 코드 발급에 실패했어요";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!senior) {
      setData(null);
      setError(null);
      setCopied(false);
      setCooldown(0);
      if (cooldownTimer.current) {
        clearInterval(cooldownTimer.current);
        cooldownTimer.current = null;
      }
      return;
    }
    const sId = Number(senior.id);
    const cached = inviteCache.get(sId);
    const remaining = getRemainingCooldownSec(sId);
    if (cached && remaining > 0) {
      // 쿨다운 중이면 캐시된 코드 보여주고 카운트다운만 이어감 — 재발급 호출 X
      setData(cached.data);
      setError(null);
      setCopied(false);
      startCooldownTicker(remaining);
    } else {
      // 캐시 없음 or 쿨다운 끝남 → 새 코드 발급
      void fetchCode(sId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senior]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const handleReissue = () => {
    if (cooldown > 0) return;
    if (senior) void fetchCode(Number(senior.id));
  };

  const handleCopy = async () => {
    if (!data?.inviteCode) return;
    await Clipboard.setStringAsync(data.inviteCode);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => {
      setCopied(false);
      copyTimer.current = null;
    }, 1500);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHead}>
            <AppText type="pretendard-b" style={styles.modalTitle}>
              {senior?.nickname}님 초대 코드
            </AppText>
            <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}>
              <Ionicons name="close" size={20} color="#666" />
            </Pressable>
          </View>

          <AppText type="pretendard-m" style={styles.modalDesc}>
            아래 코드를 시니어에게 알려드리세요.{"\n"}
            발급 후 5분간 유효해요.
          </AppText>

          {loading && (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#FFD24D" />
            </View>
          )}

          {!loading && error && (
            <AppText type="pretendard-m" style={styles.modalError}>
              {error}
            </AppText>
          )}

          {!loading && data && (
            <>
              <View style={styles.codeBox}>
                <AppText type="extrabold" style={styles.codeText}>
                  {data.inviteCode}
                </AppText>
              </View>
              <AppText type="pretendard-r" style={styles.expiresText}>
                {formatExpires(data.expiresAt)}까지 유효해요
              </AppText>
            </>
          )}

          <View style={styles.modalActions}>
            <Pressable
              onPress={handleCopy}
              disabled={!data?.inviteCode}
              style={({ pressed }) => [
                styles.modalCopyBtn,
                copied && styles.modalCopyBtnDone,
                !data?.inviteCode && { opacity: 0.5 },
                pressed && data?.inviteCode && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={16}
                color={copied ? "#5BC4AE" : "#222"}
              />
              <AppText
                type="pretendard-b"
                style={[
                  styles.modalCopyText,
                  copied && styles.modalCopyTextDone,
                ]}
              >
                {copied ? "복사됨" : "복사"}
              </AppText>
            </Pressable>
            <Pressable
              onPress={handleReissue}
              disabled={cooldown > 0 || loading}
              style={({ pressed }) => [
                styles.modalPrimaryBtn,
                (cooldown > 0 || loading) && styles.modalPrimaryBtnDisabled,
                pressed && cooldown === 0 && !loading && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name="refresh"
                size={16}
                color={cooldown > 0 ? "#888" : "#222"}
              />
              <AppText type="pretendard-b" style={styles.modalPrimaryText}>
                {cooldown > 0 ? `재발급 (${cooldown}초)` : "재발급"}
              </AppText>
            </Pressable>
          </View>

          {/* 프로필 수정 (닉네임/성별) 진입 — 코드 영역과 분리해서 하단에 별도 배치 */}
          {senior && (
            <Pressable
              onPress={() => onOpenEdit(senior)}
              style={({ pressed }) => [
                styles.editProfileBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="create-outline" size={16} color="#5BC4AE" />
              <AppText type="pretendard-b" style={styles.editProfileBtnText}>
                {senior.nickname}님 정보 수정
              </AppText>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function formatExpires(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return m === 0 ? `${h}시` : `${h}시 ${String(m).padStart(2, "0")}분`;
}

function SeniorRow({
  senior,
  showDivider,
  onUnlink,
  onManage,
}: {
  senior: LinkedSenior;
  showDivider: boolean;
  onUnlink: () => void;
  onManage: () => void;
}) {
  return (
    <View style={[styles.seniorRow, showDivider && styles.seniorRowDivider]}>
      <View style={styles.seniorTop}>
        <View style={styles.seniorAvatar}>
          <Image
            source={resolveProfileImage({
              profileImage: senior.profileImage ?? null,
              profileImageUrl: senior.profileImageUrl ?? null,
              fallback: SENIOR_AVATAR,
            })}
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>
        <AppText type="pretendard-b" style={styles.seniorName}>
          {senior.nickname}
        </AppText>
      </View>
      <View style={styles.seniorActions}>
        <Pressable
          onPress={onManage}
          style={({ pressed }) => [
            styles.actionPill,
            styles.linkPill,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="link" size={14} color="#5BC4AE" />
          <AppText type="pretendard-b" style={styles.linkText}>
            정보 관리
          </AppText>
        </Pressable>
        <Pressable
          onPress={onUnlink}
          style={({ pressed }) => [
            styles.actionPill,
            styles.unlinkPill,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="unlink" size={14} color="#E14B4B" />
          <AppText type="pretendard-b" style={styles.unlinkText}>
            연동 해제
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function SettingRow({
  icon,
  iconColor,
  iconBg,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        pressed && { backgroundColor: "#FBF7EC" },
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <AppText type="pretendard-b" style={styles.settingLabel}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color="#BBB" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 18,
  },
  pageTitle: {
    fontSize: 28,
    color: "#222",
    paddingHorizontal: 4,
  },

  /* ── 보호자 카드 ── */
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  userName: {
    fontSize: 20,
    color: "#222",
  },
  userEmail: {
    fontSize: 12,
    color: "#888",
  },

  /* ── 섹션 공통 ── */
  section: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#222",
    paddingHorizontal: 4,
  },
  addSeniorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F7F2",
    borderWidth: 1.5,
    borderColor: "#BDEFEA",
    justifyContent: "center",
    alignItems: "center",
  },

  /* ── 시니어 리스트 ── */
  seniorListCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    overflow: "hidden",
  },
  seniorEmpty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  seniorEmptyText: {
    paddingVertical: 24,
    textAlign: "center",
    color: "#888",
    fontSize: 14,
  },
  seniorRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  seniorRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECDB",
  },
  seniorTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  seniorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  seniorName: {
    flex: 1,
    fontSize: 18,
    color: "#222",
  },
  infoBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  seniorActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  linkPill: {
    backgroundColor: "#E8F7F2",
    borderColor: "#BDEFEA",
  },
  linkText: {
    fontSize: 14,
    color: "#5BC4AE",
  },
  unlinkPill: {
    backgroundColor: "#FCEBEB",
    borderColor: "#F4C7C7",
  },
  unlinkText: {
    fontSize: 14,
    color: "#E14B4B",
  },

  /* ── 설정 ── */
  settingsGroup: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECDB",
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: "#222",
  },

  /* ── 초대 코드 모달 ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 22,
    gap: 14,
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    color: "#222",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F2EA",
    justifyContent: "center",
    alignItems: "center",
  },
  modalDesc: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  modalLoading: {
    paddingVertical: 24,
    alignItems: "center",
  },
  modalError: {
    fontSize: 13,
    color: "#E14B4B",
    textAlign: "center",
    paddingVertical: 16,
  },
  codeBox: {
    backgroundColor: "#FFF8E0",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE9A8",
  },
  codeText: {
    fontSize: 36,
    color: "#222",
    letterSpacing: 6,
  },
  expiresText: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
  },
  modalSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#BDEFEA",
    backgroundColor: "#FFF",
  },
  modalSecondaryText: {
    fontSize: 14,
    color: "#5BC4AE",
  },
  modalPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFD24D",
  },
  modalPrimaryBtnDisabled: {
    backgroundColor: "#F0EDE0",
  },
  modalPrimaryText: {
    fontSize: 14,
    color: "#222",
  },
  modalCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  modalCopyBtnDone: {
    borderColor: "#BDEFEA",
    backgroundColor: "#E8F7F2",
  },
  modalCopyText: {
    fontSize: 14,
    color: "#222",
  },
  modalCopyTextDone: {
    color: "#5BC4AE",
  },

  /* ── 프로필 수정 진입 버튼 (코드 영역 아래 분리 배치) ── */
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#BDEFEA",
    backgroundColor: "#FFF",
    marginTop: 4,
  },
  editProfileBtnText: {
    fontSize: 14,
    color: "#5BC4AE",
  },

  /* ── 보호자 본인 프로필 카드의 편집 아이콘 (우측 상단) ── */
  editMyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F2EA",
    justifyContent: "center",
    alignItems: "center",
  },
});

/* ────────── EditSeniorProfileModal — 보호자가 시니어 nickname/gender 수정 ────────── */

type EditGenderLabel = "남" | "여" | "비공개";
const EDIT_GENDERS: EditGenderLabel[] = ["남", "여", "비공개"];
const EDIT_LABEL_TO_API: Record<EditGenderLabel, SeniorGender> = {
  남: "MALE",
  여: "FEMALE",
  비공개: "UNKNOWN",
};
const EDIT_API_TO_LABEL: Record<SeniorGender, EditGenderLabel> = {
  MALE: "남",
  FEMALE: "여",
  OTHER: "비공개",
  UNKNOWN: "비공개",
};

function EditSeniorProfileModal({
  senior,
  onClose,
  onSaved,
}: {
  senior: LinkedSenior | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const confirm = useConfirm();
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<EditGenderLabel>("비공개");
  const [submitting, setSubmitting] = useState(false);

  // 모달 열릴 때마다 senior 기준으로 폼 초기화
  useEffect(() => {
    if (senior) {
      setNickname(senior.nickname);
      // LinkedSenior 에 gender 가 있다면 매핑, 없으면 비공개
      const g = (senior as LinkedSenior & { gender?: SeniorGender }).gender;
      setGender(g ? EDIT_API_TO_LABEL[g] : "비공개");
      setSubmitting(false);
    }
  }, [senior]);

  const trimmed = nickname.trim();
  const canSubmit = trimmed.length > 0 && !submitting && senior != null;

  const handleSubmit = async () => {
    if (!canSubmit || !senior) return;
    setSubmitting(true);
    try {
      await updateSeniorProfile(senior.id, {
        nickname: trimmed,
        gender: EDIT_LABEL_TO_API[gender],
      });
      onSaved();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "수정에 실패했어요";
      await confirm({
        title: "수정 실패",
        message: msg,
        confirmText: "확인",
      });
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={senior !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHead}>
            <AppText type="pretendard-b" style={styles.modalTitle}>
              시니어 정보 수정
            </AppText>
            <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}>
              <Ionicons name="close" size={20} color="#666" />
            </Pressable>
          </View>

          <AppText type="pretendard-m" style={styles.modalDesc}>
            시니어의 닉네임과 성별을 수정할 수 있어요.
            {"\n"}
            프로필 사진은 시니어 본인만 변경할 수 있어요.
          </AppText>

          <View style={editProfStyles.fieldGroup}>
            <AppText type="pretendard-b" style={editProfStyles.label}>
              닉네임
            </AppText>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="시니어 닉네임"
              placeholderTextColor="#BBB"
              maxLength={10}
              style={editProfStyles.input}
            />
          </View>

          <View style={editProfStyles.fieldGroup}>
            <AppText type="pretendard-b" style={editProfStyles.label}>
              성별
            </AppText>
            <View style={editProfStyles.genderRow}>
              {EDIT_GENDERS.map((g) => {
                const on = gender === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      editProfStyles.genderBtn,
                      on && editProfStyles.genderBtnOn,
                    ]}
                  >
                    <AppText
                      type="pretendard-b"
                      style={[
                        editProfStyles.genderText,
                        on && editProfStyles.genderTextOn,
                      ]}
                    >
                      {g}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalCopyBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <AppText type="pretendard-b" style={styles.modalCopyText}>
                취소
              </AppText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.modalPrimaryBtn,
                !canSubmit && styles.modalPrimaryBtnDisabled,
                pressed && canSubmit && { opacity: 0.85 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#222" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#222" />
                  <AppText type="pretendard-b" style={styles.modalPrimaryText}>
                    저장
                  </AppText>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const editProfStyles = StyleSheet.create({
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, color: "#444" },
  input: {
    height: 46,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: "#222",
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#E5E0CE",
    borderRadius: 10,
  },
  genderRow: { flexDirection: "row", gap: 8 },
  genderBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  genderBtnOn: { borderColor: "#5BC4AE", backgroundColor: "#E8F7F2" },
  genderText: { fontSize: 14, color: "#888" },
  genderTextOn: { color: "#222" },
});
