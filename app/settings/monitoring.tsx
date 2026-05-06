import AnimatedToggle from "@/components/animated-toggle";
import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Senior {
  id: string;
  name: string;
  image: ImageSourcePropType;
}

interface SeniorSettings {
  doseConfirm: boolean;
  warning: boolean;
  reportDaily: boolean;
  reportWeekly: boolean;
  reportMonthly: boolean;
}

const SENIORS: Senior[] = [
  {
    id: "1",
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
    name: "김대군",
    image: require("../../assets/images/pf/pfimg4.png"),
  },
];

const DEFAULT_SETTINGS: SeniorSettings = {
  doseConfirm: true,
  warning: true,
  reportDaily: true,
  reportWeekly: false,
  reportMonthly: true,
};

interface SettingRow {
  key: keyof SeniorSettings;
  label: string;
  description: string;
}

type IconSpec =
  | {
      family: "ionicons";
      name: ComponentProps<typeof Ionicons>["name"];
    }
  | {
      family: "material";
      name: ComponentProps<typeof MaterialCommunityIcons>["name"];
    };

interface SettingGroup {
  title: string;
  icon: IconSpec;
  iconColor: string;
  iconBg: string;
  rows: SettingRow[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: "복약 인증 알림",
    icon: { family: "material", name: "pill" },
    iconColor: "#F8B835",
    iconBg: "#FFF1C8",
    rows: [
      {
        key: "doseConfirm",
        label: "복약 확인 알림",
        description: "시니어가 복약 인증을 완료하면 알림이 와요",
      },
      {
        key: "warning",
        label: "경고 알림",
        description: "복약 인증이 지연되거나 누락되면 알림이 와요",
      },
    ],
  },
  {
    title: "리포트 알림",
    icon: { family: "ionicons", name: "document-text-outline" },
    iconColor: "#5BC4AE",
    iconBg: "#D6F1EA",
    rows: [
      {
        key: "reportDaily",
        label: "일간 리포트 알림",
        description: "매일 저녁 하루 복약 요약을 받아요",
      },
      {
        key: "reportWeekly",
        label: "주간 리포트 알림",
        description: "매주 일요일 한 주 복약 요약을 받아요",
      },
      {
        key: "reportMonthly",
        label: "월간 리포트 알림",
        description: "매달 1일 지난달 복약 요약을 받아요",
      },
    ],
  },
];

export default function MonitoringSettingsScreen() {
  const [selectedId, setSelectedId] = useState(SENIORS[0].id);
  const [allSettings, setAllSettings] = useState<
    Record<string, SeniorSettings>
  >(() =>
    Object.fromEntries(SENIORS.map((s) => [s.id, { ...DEFAULT_SETTINGS }])),
  );

  const settings = allSettings[selectedId];

  const toggle = (key: keyof SeniorSettings) => {
    setAllSettings((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], [key]: !prev[selectedId][key] },
    }));
  };

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
        <View style={styles.section}>
          <AppText type="pretendard-b" style={styles.sectionTitle}>
            관리 중인 시니어 계정
          </AppText>
          <View style={styles.seniorRow}>
            {SENIORS.map((senior) => {
              const on = senior.id === selectedId;
              return (
                <Pressable
                  key={senior.id}
                  onPress={() => setSelectedId(senior.id)}
                  style={[styles.seniorCard, on && styles.seniorCardOn]}
                >
                  <View style={styles.seniorAvatar}>
                    <Image
                      source={senior.image}
                      style={styles.seniorImg}
                      resizeMode="cover"
                    />
                  </View>
                  <AppText
                    type="pretendard-b"
                    style={[styles.seniorName, on && styles.seniorNameOn]}
                  >
                    {senior.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 세부 설정 (그룹별) */}
        {SETTING_GROUPS.map((group) => (
          <View key={group.title} style={styles.section}>
            <View style={styles.groupTitleRow}>
              <View
                style={[styles.groupIcon, { backgroundColor: group.iconBg }]}
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
              {group.rows.map((row, idx) => (
                <View
                  key={row.key}
                  style={[
                    styles.settingRow,
                    idx < group.rows.length - 1 && styles.settingRowDivider,
                  ]}
                >
                  <View style={styles.settingText}>
                    <AppText type="pretendard-b" style={styles.settingLabel}>
                      {row.label}
                    </AppText>
                    <AppText type="pretendard-m" style={styles.settingDesc}>
                      {row.description}
                    </AppText>
                  </View>
                  <AnimatedToggle
                    value={settings[row.key]}
                    onChange={() => toggle(row.key)}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.note}>
          <Ionicons name="information-circle" size={16} color="#888" />
          <AppText type="pretendard-m" style={styles.noteText}>
            설정 변경 사항은 자동으로 저장돼요
          </AppText>
        </View>
      </ScrollView>
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
    paddingBottom: 32,
    gap: 22,
  },

  /* ── 섹션 공통 ── */
  section: {
    gap: 12,
  },
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

  /* ── 시니어 선택 ── */
  seniorRow: {
    flexDirection: "row",
    gap: 10,
  },
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
  seniorImg: {
    width: "100%",
    height: "100%",
  },
  seniorName: {
    fontSize: 15,
    color: "#444",
  },
  seniorNameOn: {
    color: "#222",
  },

  /* ── 세부 설정 카드 ── */
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
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 16,
    color: "#222",
  },
  settingDesc: {
    fontSize: 12,
    color: "#777",
  },

  /* ── 안내 ── */
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  noteText: {
    fontSize: 12,
    color: "#888",
  },
});
