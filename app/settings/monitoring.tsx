import AnimatedToggle from "@/components/animated-toggle";
import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { ApiError } from "@/services/api";
import type { CareMode } from "@/services/auth";
import {
  LinkedSenior,
  listLinkedSeniors,
  updateSeniorCareMode,
} from "@/services/caregivers";
import {
  NotificationSettings,
  applyNotificationPreset,
  getNotificationSettings,
  updateNotificationSettings,
} from "@/services/notification-settings";
import { resolveProfileImage } from "@/utils/profile-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FALLBACK_IMG = require("../../assets/images/pf/pfimg2.png");

type IconSpec =
  | {
      family: "ionicons";
      name: ComponentProps<typeof Ionicons>["name"];
    }
  | {
      family: "material";
      name: ComponentProps<typeof MaterialCommunityIcons>["name"];
    };

interface ToggleRow {
  key:
    | "durWarningEnabled"
    | "medicationDelayEnabled"
    | "familySafetyEnabled"
    | "medicationCompleteEnabled";
  label: string;
  description: string;
}

interface SettingGroup {
  title: string;
  icon: IconSpec;
  iconColor: string;
  iconBg: string;
  rows: ToggleRow[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: "복약 알림",
    icon: { family: "material", name: "pill" },
    iconColor: "#F8B835",
    iconBg: "#FFF1C8",
    rows: [
      {
        key: "medicationDelayEnabled",
        label: "미복약/지연 알림",
        description: "임계 시간 안에 복약 인증이 없으면 알림을 받아요",
      },
      {
        key: "medicationCompleteEnabled",
        label: "복약 완료 알림",
        description: "시니어가 모든 복약을 완료하면 알림이 와요",
      },
      {
        key: "durWarningEnabled",
        label: "금기 위험 알림",
        description: "함께 먹으면 안 되거나 중복된 약이 발견되면 알림을 받아요",
      },
    ],
  },
  {
    title: "가족 안전망",
    icon: { family: "ionicons", name: "people" },
    iconColor: "#4799E0",
    iconBg: "#DDEBF8",
    rows: [
      {
        key: "familySafetyEnabled",
        label: "앱 미접속 알림",
        description: "시니어가 일정 시간 앱을 안 켜시면 알림을 받아요",
      },
    ],
  },
];

export default function MonitoringSettingsScreen() {
  const [seniors, setSeniors] = useState<LinkedSenior[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 시니어 목록 로드
  useEffect(() => {
    void (async () => {
      try {
        const list = await listLinkedSeniors();
        setSeniors(list);
        if (list[0]) setSelectedId(list[0].id);
      } catch (e) {
        console.log("[monitoring] listLinkedSeniors failed:", e);
        setError("시니어 정보를 불러오지 못했어요");
        setLoading(false);
      }
    })();
  }, []);

  // 선택된 시니어 알림 설정 로드
  const loadSettings = useCallback(async (seniorId: number) => {
    setLoading(true);
    setError(null);
    try {
      const s = await getNotificationSettings(seniorId);
      setSettings(s);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.toUserMessage()
          : "알림 설정을 불러오지 못했어요",
      );
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    void loadSettings(selectedId);
  }, [selectedId, loadSettings]);

  const persistFull = async (next: NotificationSettings) => {
    if (selectedId == null) return;
    setSaving(true);
    try {
      const updated = await updateNotificationSettings(selectedId, {
        durWarningEnabled: next.durWarningEnabled,
        medicationDelayEnabled: next.medicationDelayEnabled,
        medicationDelayThresholdMinutes: next.medicationDelayThresholdMinutes,
        familySafetyEnabled: next.familySafetyEnabled,
        familySafetyThresholdHours: next.familySafetyThresholdHours,
        medicationCompleteEnabled: next.medicationCompleteEnabled,
        // 처방전 검토 요청 알림은 필수라 항상 TRUE 고정.
        // (백엔드 명세에서 toggle off skip 제거되면 필드 자체 제거 가능)
        prescriptionReviewRequestEnabled: true,
      });
      setSettings(updated);
    } catch (e) {
      console.log("[monitoring] update failed:", e);
      // 실패 시 원복
      if (selectedId != null) void loadSettings(selectedId);
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (key: ToggleRow["key"]) => {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    void persistFull(next);
  };

  const adjustThreshold = (
    key: "medicationDelayThresholdMinutes" | "familySafetyThresholdHours",
    delta: number,
  ) => {
    if (!settings) return;
    const next = {
      ...settings,
      [key]: Math.max(1, settings[key] + delta),
    };
    setSettings(next);
    void persistFull(next);
  };

  const selectedSenior = seniors.find((s) => s.id === selectedId) ?? null;
  const currentCareMode: CareMode | null = selectedSenior?.careMode ?? null;

  const setSeniorCareMode = async (mode: CareMode) => {
    if (selectedId == null || currentCareMode === mode) return;
    // 낙관적 갱신
    setSeniors((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, careMode: mode } : s)),
    );
    try {
      await updateSeniorCareMode(selectedId, mode);
    } catch (e) {
      console.log("[monitoring] careMode update failed:", e);
      // 실패 시 목록 재조회로 원복
      try {
        const list = await listLinkedSeniors();
        setSeniors(list);
      } catch {
        // ignore
      }
    }
  };

  const applyPreset = async (careMode: CareMode) => {
    if (selectedId == null) return;
    setSaving(true);
    try {
      const updated = await applyNotificationPreset(selectedId, careMode);
      setSettings(updated);
      // 프리셋과 careMode를 동기화 — AUTONOMOUS 프리셋이면 careMode도 AUTONOMOUS (사진 인증 여유),
      // MANAGED 프리셋이면 MANAGED (사진 인증 강제).
      void setSeniorCareMode(careMode);
    } catch (e) {
      console.log("[monitoring] preset apply failed:", e);
    } finally {
      setSaving(false);
    }
  };

  /** 현재 settings 가 AUTONOMOUS/MANAGED 프리셋과 일치하는지 추론. 사용자 정의 시 null. */
  const inferredPreset: CareMode | null = (() => {
    if (!settings) return null;
    const isAutonomous =
      settings.medicationDelayThresholdMinutes === 60 &&
      settings.familySafetyThresholdHours === 48 &&
      settings.medicationCompleteEnabled === false;
    if (isAutonomous) return "AUTONOMOUS";
    const isManaged =
      settings.medicationDelayThresholdMinutes === 30 &&
      settings.familySafetyThresholdHours === 12 &&
      settings.medicationCompleteEnabled === true;
    if (isManaged) return "MANAGED";
    return null;
  })();

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="모니터링 / 알림 설정" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 시니어 선택 */}
        {seniors.length > 0 && (
          <View style={styles.section}>
            <AppText type="pretendard-b" style={styles.sectionTitle}>
              관리 중인 시니어
            </AppText>
            <View style={styles.seniorRow}>
              {seniors.map((senior) => {
                const on = senior.id === selectedId;
                return (
                  <Pressable
                    key={senior.id}
                    onPress={() => setSelectedId(senior.id)}
                    style={[styles.seniorCard, on && styles.seniorCardOn]}
                  >
                    <View style={styles.seniorAvatar}>
                      <Image
                        source={resolveProfileImage({
                          profileImage: senior.profileImage ?? null,
                          profileImageUrl: senior.profileImageUrl ?? null,
                          fallback: FALLBACK_IMG,
                        })}
                        style={styles.seniorImg}
                        resizeMode="cover"
                      />
                    </View>
                    <AppText
                      type="pretendard-b"
                      style={[styles.seniorName, on && styles.seniorNameOn]}
                    >
                      {senior.nickname}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {loading && (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color="#FFD24D" />
          </View>
        )}

        {!loading && error && (
          <View style={styles.stateBox}>
            <Ionicons name="alert-circle" size={28} color="#E14B4B" />
            <AppText type="pretendard-m" style={styles.stateText}>
              {error}
            </AppText>
          </View>
        )}

        {!loading && !error && settings && (
          <>
            {/* 프리셋 적용 */}
            <View style={styles.section}>
              <AppText type="pretendard-b" style={styles.sectionTitle}>
                간편 모드 선택
              </AppText>
              <View style={styles.presetRow}>
                <PresetCard
                  selected={inferredPreset === "AUTONOMOUS"}
                  disabled={saving}
                  onPress={() => applyPreset("AUTONOMOUS")}
                  iconName="leaf"
                  iconColor="#5BC4AE"
                  selectedBorderColor="#5BC4AE"
                  selectedBgColor="#E8F7F2"
                  title="기본 관리 모드"
                  desc="지연 60분 / 미접속 48시간"
                />
                <PresetCard
                  selected={inferredPreset === "MANAGED"}
                  disabled={saving}
                  onPress={() => applyPreset("MANAGED")}
                  iconName="shield-checkmark"
                  iconColor="#F8B835"
                  selectedBorderColor="#F8B835"
                  selectedBgColor="#FFF4C7"
                  title="집중 관리 모드"
                  desc="지연 30분 / 미접속 12시간"
                />
              </View>
              {inferredPreset === null && (
                <View style={styles.customBadge}>
                  <Ionicons name="options" size={16} color="#4799E0" />
                  <View style={{ flex: 1 }}>
                    <AppText
                      type="pretendard-b"
                      style={styles.customBadgeTitle}
                    >
                      커스텀 알림
                    </AppText>
                    <AppText type="pretendard-r" style={styles.customBadgeDesc}>
                      세부 항목을 직접 조정한 상태예요
                    </AppText>
                  </View>
                  <View style={styles.customCheck}>
                    <Ionicons name="checkmark" size={12} color="#FFF" />
                  </View>
                </View>
              )}
            </View>

            {/* 세부 토글 */}
            {SETTING_GROUPS.map((group) => (
              <View key={group.title} style={styles.section}>
                <View style={styles.groupTitleRow}>
                  <View
                    style={[
                      styles.groupIcon,
                      { backgroundColor: group.iconBg },
                    ]}
                  >
                    {group.icon.family === "material" ? (
                      <MaterialCommunityIcons
                        name={group.icon.name}
                        size={16}
                        color={group.iconColor}
                      />
                    ) : (
                      <Ionicons
                        name={group.icon.name}
                        size={16}
                        color={group.iconColor}
                      />
                    )}
                  </View>
                  <AppText type="pretendard-b" style={styles.sectionTitle}>
                    {group.title}
                  </AppText>
                </View>
                <View style={styles.settingsCard}>
                  {group.title === "복약 알림" && (
                    <View style={[styles.settingRow, styles.settingRowDivider]}>
                      <View style={styles.settingText}>
                        <AppText
                          type="pretendard-b"
                          style={styles.settingLabel}
                        >
                          복약 인증 강제
                        </AppText>
                        <AppText type="pretendard-m" style={styles.settingDesc}>
                          켜두면 사진 인증 필수, 끄면 사진 없이도 인증 가능해요
                        </AppText>
                      </View>
                      <AnimatedToggle
                        value={currentCareMode === "MANAGED"}
                        onChange={() =>
                          void setSeniorCareMode(
                            currentCareMode === "MANAGED"
                              ? "AUTONOMOUS"
                              : "MANAGED",
                          )
                        }
                      />
                    </View>
                  )}
                  {group.rows.map((row, idx) => (
                    <View
                      key={row.key}
                      style={[
                        styles.settingRow,
                        idx < group.rows.length - 1 && styles.settingRowDivider,
                      ]}
                    >
                      <View style={styles.settingText}>
                        <AppText
                          type="pretendard-b"
                          style={styles.settingLabel}
                        >
                          {row.label}
                        </AppText>
                        <AppText type="pretendard-m" style={styles.settingDesc}>
                          {row.description}
                        </AppText>
                        {row.key === "medicationDelayEnabled" &&
                          settings.medicationDelayEnabled && (
                            <Stepper
                              label="임계 시간"
                              unit="분"
                              value={settings.medicationDelayThresholdMinutes}
                              onDecrement={() =>
                                adjustThreshold(
                                  "medicationDelayThresholdMinutes",
                                  -5,
                                )
                              }
                              onIncrement={() =>
                                adjustThreshold(
                                  "medicationDelayThresholdMinutes",
                                  5,
                                )
                              }
                            />
                          )}
                        {row.key === "familySafetyEnabled" &&
                          settings.familySafetyEnabled && (
                            <Stepper
                              label="임계 시간"
                              unit="시간"
                              value={settings.familySafetyThresholdHours}
                              onDecrement={() =>
                                adjustThreshold(
                                  "familySafetyThresholdHours",
                                  -1,
                                )
                              }
                              onIncrement={() =>
                                adjustThreshold("familySafetyThresholdHours", 1)
                              }
                            />
                          )}
                      </View>
                      <AnimatedToggle
                        value={settings[row.key]}
                        onChange={() => toggleField(row.key)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.note}>
              <Ionicons name="information-circle" size={16} color="#888" />
              <AppText type="pretendard-m" style={styles.noteText}>
                {saving ? "저장 중…" : "설정 변경 사항은 자동으로 저장돼요"}
              </AppText>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PresetCard({
  selected,
  disabled,
  onPress,
  iconName,
  iconColor,
  selectedBorderColor,
  selectedBgColor,
  title,
  desc,
}: {
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  iconName: ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  selectedBorderColor: string;
  selectedBgColor: string;
  title: string;
  desc: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.presetBtn,
        selected && {
          borderColor: selectedBorderColor,
          borderWidth: 2,
          backgroundColor: selectedBgColor,
        },
        // disabled 시 opacity 변화는 없앰 — 임계값 조정 중 깜빡임 방지.
        // 탭은 disabled prop 으로 막혀있음.
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={iconName} size={18} color={iconColor} />
      <View style={styles.presetText}>
        <AppText type="pretendard-b" style={styles.presetTitle}>
          {title}
        </AppText>
        <AppText type="pretendard-r" style={styles.presetDesc}>
          {desc}
        </AppText>
      </View>
      {selected && (
        <View
          style={[styles.presetCheck, { backgroundColor: selectedBorderColor }]}
        >
          <Ionicons name="checkmark" size={12} color="#FFF" />
        </View>
      )}
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  unit,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  unit: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <AppText type="pretendard-m" style={styles.stepperLabel}>
        {label}
      </AppText>
      <Pressable
        onPress={onDecrement}
        disabled={value <= 1}
        style={({ pressed }) => [
          styles.stepperBtn,
          value <= 1 && { opacity: 0.4 },
          pressed && value > 1 && { opacity: 0.7 },
        ]}
      >
        <Ionicons name="remove" size={16} color="#333" />
      </Pressable>
      <AppText type="pretendard-b" style={styles.stepperValue}>
        {value}
        {unit}
      </AppText>
      <Pressable
        onPress={onIncrement}
        style={({ pressed }) => [
          styles.stepperBtn,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Ionicons name="add" size={16} color="#333" />
      </Pressable>
    </View>
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
    paddingBottom: 32,
    gap: 22,
  },

  section: { gap: 12 },
  sectionTitle: {
    fontSize: 17,
    color: "#222",
    paddingHorizontal: 4,
  },
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  groupIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  stateBox: { paddingVertical: 60, alignItems: "center", gap: 8 },
  stateText: { fontSize: 14, color: "#888" },

  /* 시니어 선택 */
  seniorRow: { flexDirection: "row", gap: 10 },
  seniorCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
    backgroundColor: "#FFF",
    gap: 8,
  },
  seniorCardOn: {
    borderColor: "#5BC4AE",
    backgroundColor: "#E8F7F2",
  },
  seniorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  seniorImg: { width: "100%", height: "100%" },
  seniorName: { fontSize: 15, color: "#444" },
  seniorNameOn: { color: "#222" },

  /* 프리셋 */
  presetRow: { flexDirection: "row", gap: 10 },
  presetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  presetText: { flex: 1, gap: 2 },
  presetTitle: { fontSize: 14, color: "#222" },
  presetDesc: { fontSize: 11, color: "#777" },
  presetCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  customBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#4799E0",
    backgroundColor: "#EFF6FC",
  },
  customBadgeTitle: {
    fontSize: 14,
    color: "#222",
  },
  customBadgeDesc: {
    fontSize: 11,
    color: "#5A789B",
    marginTop: 2,
  },
  customCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4799E0",
    justifyContent: "center",
    alignItems: "center",
  },

  /* 설정 카드 */
  settingsCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECDB",
  },
  settingText: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 16, color: "#222" },
  settingDesc: { fontSize: 12, color: "#777" },

  /* 임계값 stepper */
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  stepperLabel: { fontSize: 13, color: "#666" },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F4F2EA",
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValue: {
    fontSize: 14,
    color: "#222",
    minWidth: 50,
    textAlign: "center",
  },

  /* 안내 */
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  noteText: { fontSize: 12, color: "#888" },
});
