import AppText from "@/components/app-text";
import SignupProgress from "@/components/signup-progress";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const router = useRouter();
  const [medConfirm, setMedConfirm] = useState(true);
  const [medWarning, setMedWarning] = useState(false);
  const [reportDaily, setReportDaily] = useState(true);
  const [reportMonthly, setReportMonthly] = useState(true);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <SignupProgress step={3} />
      <View style={styles.inner}>
        <AppText type="pretendard-b" style={styles.title}>
          보호자 알림 설정
        </AppText>
        <AppText type="pretendard-r" style={styles.desc}>
          보호자의 복약 확인/경고 알림 수신여부와{"\n"}
          리포트 주기를 설정할 수 있어요.{"\n"}
          (나중에 설정에서 변경 가능)
        </AppText>

        <View style={styles.card}>
          <View style={styles.personRow}>
            <Image
            source={require("../../assets/images/Profile.png")}
            style={styles.avatar}
            resizeMode="cover"
          />
            <AppText type="pretendard-b" style={styles.personName}>
              김복순 (여)
            </AppText>
          </View>

          <AppText type="pretendard-b" style={styles.sectionTitle}>
            알림
          </AppText>
          <View style={styles.toggleGroup}>
            <ToggleRow
              label="복약 확인"
              value={medConfirm}
              onChange={setMedConfirm}
            />
            <ToggleRow
              label="복약 경고"
              value={medWarning}
              onChange={setMedWarning}
            />
          </View>

          <View style={styles.divider} />

          <AppText type="pretendard-b" style={styles.sectionTitle}>
            리포트
          </AppText>
          <View style={styles.toggleGroup}>
            <ToggleRow
              label="일간"
              value={reportDaily}
              onChange={setReportDaily}
            />
            <ToggleRow
              label="월간"
              value={reportMonthly}
              onChange={setReportMonthly}
            />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.btn}
          onPress={() => router.push("/signup/complete" as any)}
        >
          <AppText type="pretendard-b" style={styles.btnText}>
            다음
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={toggle.row}>
      <AppText type="pretendard-r" style={toggle.label}>
        {label}
      </AppText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#E0E0E0", true: "#FFD24D" }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E0E0E0"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  title: {
    fontSize: 22,
    color: "#171717",
    marginBottom: 10,
  },
  desc: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFD24D",
    padding: 18,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  personName: {
    fontSize: 16,
    color: "#171717",
  },
  sectionTitle: {
    fontSize: 14,
    color: "#333333",
    marginBottom: 12,
  },
  toggleGroup: {
    gap: 4,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0EDE0",
    marginVertical: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 8,
  },
  btn: {
    height: 54,
    backgroundColor: "#FFD24D",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    fontSize: 18,
    color: "#171717",
  },
});

const toggle = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  label: {
    fontSize: 15,
    color: "#444444",
  },
});
