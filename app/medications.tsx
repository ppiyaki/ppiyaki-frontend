import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TimeOfDay = "morning" | "noon" | "night";

interface Medication {
  name: string;
  brand: string;
  times: TimeOfDay[];
}

interface Hospital {
  name: string;
  daysLeft: number;
  medications: Medication[];
}

const HOSPITALS: Hospital[] = [
  {
    name: "서울성심병원",
    daysLeft: 24,
    medications: [
      { name: "혈압약", brand: "에이비씨정 5mg", times: ["morning", "night"] },
      { name: "당뇨약", brand: "에이비씨정 5mg", times: ["morning", "noon"] },
    ],
  },
  {
    name: "삼육서울병원",
    daysLeft: 3,
    medications: [
      {
        name: "고지혈증약",
        brand: "에이비씨정 5mg",
        times: ["morning", "night"],
      },
    ],
  },
];

const TIME_META: Record<TimeOfDay, { icon: string; bg: string }> = {
  morning: { icon: "☀️", bg: "#FFF4D6" },
  noon: { icon: "🍽️", bg: "#E5F5D5" },
  night: { icon: "🌙", bg: "#E0E0E8" },
};

export default function MedicationsScreen() {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="내 약 정보" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.summaryRow}>
          <SummaryBox label="현재 복약 중" value="4종" />
          <SummaryBox label="곧 소진" value="1종" highlight />
        </View>

        {HOSPITALS.map((hospital) => (
          <HospitalSection key={hospital.name} hospital={hospital} />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <AppText type="pretendard-b" style={styles.ctaText}>
            삐약이에게 물어보기
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SummaryBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryBox}>
      <AppText type="pretendard-r" style={styles.summaryLabel}>
        {label}
      </AppText>
      <AppText
        type="extrabold"
        style={[styles.summaryValue, highlight && { color: "#F88835" }]}
      >
        {value}
      </AppText>
    </View>
  );
}

function HospitalSection({ hospital }: { hospital: Hospital }) {
  const [open, setOpen] = useState(true);
  const lowStock = hospital.daysLeft <= 7;

  return (
    <View style={styles.hospitalSection}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.hospitalHeader}
      >
        <View style={styles.hospitalLeft}>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color="#444"
          />
          <AppText type="pretendard-b" style={styles.hospitalName}>
            {hospital.name}
          </AppText>
        </View>
        <AppText
          type="pretendard-b"
          style={[styles.daysLeft, { color: lowStock ? "#E14B4B" : "#5BB04A" }]}
        >
          {hospital.daysLeft}일분 남음
        </AppText>
      </Pressable>

      {open &&
        hospital.medications.map((med) => (
          <MedicationCard key={med.name} medication={med} />
        ))}
    </View>
  );
}

function MedicationCard({ medication }: { medication: Medication }) {
  return (
    <View style={styles.medCard}>
      <View style={styles.medThumb}>
        <AppText style={{ fontSize: 30 }}>💊</AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText type="pretendard-b" style={styles.medName}>
          {medication.name}
        </AppText>
        <AppText type="pretendard-r" style={styles.medBrand}>
          {medication.brand}
        </AppText>
        <View style={styles.timeRow}>
          {medication.times.map((t) => (
            <View
              key={t}
              style={[styles.timePill, { backgroundColor: TIME_META[t].bg }]}
            >
              <AppText style={{ fontSize: 14 }}>{TIME_META[t].icon}</AppText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FEFDFB" },
  scroll: { padding: 16, paddingBottom: 24 },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  summaryBox: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDE8D6",
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryLabel: { fontSize: 13, color: "#666" },
  summaryValue: { fontSize: 22, color: "#171717" },

  hospitalSection: { marginBottom: 18 },
  hospitalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  hospitalLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  hospitalName: { fontSize: 15, color: "#171717" },
  daysLeft: { fontSize: 14 },

  medCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDE8D6",
    padding: 12,
    marginTop: 8,
    gap: 12,
  },
  medThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FBF7EC",
    justifyContent: "center",
    alignItems: "center",
  },
  medName: { fontSize: 15, color: "#171717" },
  medBrand: { fontSize: 12, color: "#888", marginTop: 2 },
  timeRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  cta: {
    backgroundColor: "#E8E0C0",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { fontSize: 17, color: "#333" },
});
