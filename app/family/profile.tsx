import AppText from "@/components/app-text";
import { useConfirm } from "@/contexts/confirm-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError } from "@/services/api";
import { getMe, logoutKakao } from "@/services/auth";
import { InviteCodeResponse, issueInviteCode } from "@/services/care-relations";
import {
  LinkedSenior,
  listLinkedSeniors,
  unlinkSenior,
} from "@/services/caregivers";
import { createSenior } from "@/services/seniors";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
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

  const [nickname, setNickname] = useState<string>("");
  const [seniors, setSeniors] = useState<LinkedSenior[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteSenior, setInviteSenior] = useState<LinkedSenior | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [me, list] = await Promise.all([
        getMe().catch(() => null),
        listLinkedSeniors().catch((e) => {
          console.log("[family-profile] listLinkedSeniors failed:", e);
          return [] as LinkedSenior[];
        }),
      ]);
      if (me) setNickname(me.nickname);
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
        cancelText: "닫기",
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
              source={require("../../assets/images/pf/pfimg1.png")}
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
              label="문의 및 신고"
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

      <InviteCodeModal senior={inviteSenior} onClose={closeInviteModal} />
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
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 모달 닫힐 때 폼 리셋
  useEffect(() => {
    if (!visible) {
      setNickname("");
      setYear("");
      setMonth("");
      setDay("");
      setSubmitting(false);
    }
  }, [visible]);

  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  const validDate =
    !isNaN(yearNum) &&
    yearNum >= 1900 &&
    yearNum <= new Date().getFullYear() &&
    !isNaN(monthNum) &&
    monthNum >= 1 &&
    monthNum <= 12 &&
    !isNaN(dayNum) &&
    dayNum >= 1 &&
    dayNum <= 31;
  const canSubmit = nickname.trim().length > 0 && validDate && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const birthDate = `${String(yearNum).padStart(4, "0")}-${String(
      monthNum,
    ).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    setSubmitting(true);
    try {
      await createSenior({ nickname: nickname.trim(), birthDate });
      onCreated();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.toUserMessage() : "시니어 추가에 실패했어요";
      await confirm({
        title: "추가 실패",
        message: msg,
        confirmText: "확인",
        cancelText: "닫기",
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
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
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
              생년월일
            </AppText>
            <View style={addStyles.dateRow}>
              <TextInput
                value={year}
                onChangeText={(t) =>
                  setYear(t.replace(/[^0-9]/g, "").slice(0, 4))
                }
                keyboardType="number-pad"
                maxLength={4}
                placeholder="YYYY"
                placeholderTextColor="#BBB"
                style={[addStyles.input, addStyles.dateInputYear]}
              />
              <TextInput
                value={month}
                onChangeText={(t) =>
                  setMonth(t.replace(/[^0-9]/g, "").slice(0, 2))
                }
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
                placeholderTextColor="#BBB"
                style={[addStyles.input, addStyles.dateInputMonthDay]}
              />
              <TextInput
                value={day}
                onChangeText={(t) =>
                  setDay(t.replace(/[^0-9]/g, "").slice(0, 2))
                }
                keyboardType="number-pad"
                maxLength={2}
                placeholder="DD"
                placeholderTextColor="#BBB"
                style={[addStyles.input, addStyles.dateInputMonthDay]}
              />
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
                  <AppText type="pretendard-b" style={styles.modalPrimaryText}>
                    추가하기
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

const addStyles = StyleSheet.create({
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
  dateRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateInputYear: {
    flex: 1.4,
    textAlign: "center",
  },
  dateInputMonthDay: {
    flex: 1,
    textAlign: "center",
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
}: {
  senior: LinkedSenior | null;
  onClose: () => void;
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
            source={SENIOR_AVATAR}
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>
        <AppText type="pretendard-b" style={styles.seniorName}>
          {senior.nickname}
        </AppText>
        <Pressable hitSlop={10} style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={22} color="#777" />
        </Pressable>
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
});
