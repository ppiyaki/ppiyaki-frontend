import AppText from "@/components/app-text";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import { logoutKakao } from "@/services/auth";
import { InviteCodeResponse, issueInviteCode } from "@/services/care-relations";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface LinkedSenior {
  id: string;
  name: string;
  image: ImageSourcePropType;
}

const USER = {
  name: "김철수",
  email: "chulsooK@gmail.com",
};

const LINKED_SENIORS: LinkedSenior[] = [
  {
    // dev 폴백 시니어 ID (백엔드 테스트 시니어 토큰=16)
    // TODO: listLinkedSeniors 구현되면 실제 목록으로 교체
    id: "16",
    name: "김장군",
    image: require("../../assets/images/pf/pfimg2.png"),
  },
  {
    id: "2",
    name: "김명군",
    image: require("../../assets/images/pf/pfimg3.png"),
  },
  {
    id: "3",
    name: "김복순",
    image: require("../../assets/images/pf/pfimg4.png"),
  },
];

export default function FamilyProfileScreen() {
  const router = useRouter();
  const confirm = useConfirm();

  const [inviteSenior, setInviteSenior] = useState<LinkedSenior | null>(null);

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
      router.replace("/family-login");
    }
  };

  const handleUnlink = async (name: string) => {
    const ok = await confirm({
      title: "연동 해제",
      message: `${name}님과의 연동을 해제하시겠어요?`,
      confirmText: "해제",
      danger: true,
    });
    if (!ok) return;
    // TODO: 연동 해제 API 연결
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
              {USER.name}
            </AppText>
            <AppText type="pretendard-m" style={styles.userEmail}>
              {USER.email}
            </AppText>
          </View>
        </View>

        {/* 연동된 시니어 관리 */}
        <View style={styles.section}>
          <AppText type="pretendard-b" style={styles.sectionTitle}>
            연동된 시니어 관리
          </AppText>
          <View style={styles.seniorListCard}>
            {LINKED_SENIORS.map((senior, idx) => (
              <SeniorRow
                key={senior.id}
                senior={senior}
                showDivider={idx < LINKED_SENIORS.length - 1}
                onUnlink={() => handleUnlink(senior.name)}
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
    </SafeAreaView>
  );
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

  const visible = senior !== null;

  const fetchCode = async (sId: number) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await issueInviteCode(sId);
      setData(res);
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

  // senior prop 변화 감지해서 자동 발급
  // useEffect 사용 위해 import 추가 필요
  React.useEffect(() => {
    if (senior) {
      void fetchCode(Number(senior.id));
    } else {
      setData(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senior]);

  const handleReissue = () => {
    if (senior) void fetchCode(Number(senior.id));
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
              {senior?.name}님 초대 코드
            </AppText>
            <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}>
              <Ionicons name="close" size={20} color="#666" />
            </Pressable>
          </View>

          <AppText type="pretendard-m" style={styles.modalDesc}>
            아래 코드를 시니어에게 알려드리세요.{"\n"}
            발급 후 10분간 유효해요.
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
                만료: {formatExpires(data.expiresAt)}
              </AppText>
            </>
          )}

          <View style={styles.modalActions}>
            <Pressable
              onPress={handleReissue}
              style={({ pressed }) => [
                styles.modalPrimaryBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="refresh" size={16} color="#222" />
              <AppText type="pretendard-b" style={styles.modalPrimaryText}>
                재발급
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
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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
            source={senior.image}
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>
        <AppText type="pretendard-b" style={styles.seniorName}>
          {senior.name}
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
  sectionTitle: {
    fontSize: 18,
    color: "#222",
    paddingHorizontal: 4,
  },

  /* ── 시니어 리스트 ── */
  seniorListCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    overflow: "hidden",
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
});
