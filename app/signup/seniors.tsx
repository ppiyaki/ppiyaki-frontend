import AppText from "@/components/app-text";
import SignupProgress from "@/components/signup-progress";
import { Gender, Senior, useSignup } from "@/contexts/signup-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GENDERS: Gender[] = ["남", "여", "비공개"];

export default function SeniorsScreen() {
  const router = useRouter();
  const { seniors: ctxSeniors, setSeniors: setCtxSeniors } = useSignup();
  const [seniors, setSeniors] = useState<Senior[]>(
    ctxSeniors.length > 0 ? ctxSeniors : [{ id: "1", name: "", gender: null }],
  );

  const addSenior = () => {
    if (seniors.length >= 3) return;
    setSeniors((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", gender: null },
    ]);
  };

  const removeSenior = (id: string) => {
    if (seniors.length <= 1) return;
    setSeniors((prev) => prev.filter((s) => s.id !== id));
  };

  const updateField = (
    id: string,
    field: "name" | "gender",
    value: string | Gender,
  ) => {
    setSeniors((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <SignupProgress step={2} />
      <View style={styles.header}>
        <AppText type="pretendard-b" style={styles.title}>
          보호자 입력
        </AppText>
        <AppText type="pretendard-r" style={styles.desc}>
          복약을 관리할 시니어의 수와 정보를 설정해주세요.{"\n"}
          연결 코드는 회원가입이 끝나면 바로 발급 가능!
        </AppText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {seniors.map((senior) => (
          <SeniorCard
            key={senior.id}
            senior={senior}
            canRemove={seniors.length > 1}
            onRemove={() => removeSenior(senior.id)}
            onChangeName={(v) => updateField(senior.id, "name", v)}
            onChangeGender={(g) => updateField(senior.id, "gender", g)}
          />
        ))}

        <Pressable
          style={[styles.addBtn, seniors.length >= 3 && styles.addBtnDisabled]}
          onPress={addSenior}
          disabled={seniors.length >= 3}
        >
          <AppText
            type="pretendard-m"
            style={[
              styles.addBtnText,
              seniors.length >= 3 && styles.addBtnTextDisabled,
            ]}
          >
            + 보호자 추가
          </AppText>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.btn}
          onPress={() => {
            setCtxSeniors(seniors);
            router.push("/signup/notifications" as any);
          }}
        >
          <AppText type="pretendard-b" style={styles.btnText}>
            다음
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SeniorCard({
  senior,
  canRemove,
  onRemove,
  onChangeName,
  onChangeGender,
}: {
  senior: Senior;
  canRemove: boolean;
  onRemove: () => void;
  onChangeName: (v: string) => void;
  onChangeGender: (g: Gender) => void;
}) {
  return (
    <View style={card.container}>
      <View style={card.topRow}>
        <Image
          source={require("../../assets/images/Profile.png")}
          style={card.avatar}
          resizeMode="cover"
        />
        <View style={card.spacer} />
        {canRemove && (
          <Pressable onPress={onRemove} hitSlop={10}>
            <AppText type="pretendard-r" style={card.removeText}>
              ✕
            </AppText>
          </Pressable>
        )}
      </View>

      <AppText type="pretendard-m" style={card.label}>
        이름/닉네임
      </AppText>
      <TextInput
        style={card.input}
        placeholder="최대 10글자까지 입력 가능"
        placeholderTextColor="#BBBBBB"
        maxLength={10}
        value={senior.name}
        onChangeText={onChangeName}
      />

      <AppText type="pretendard-m" style={[card.label, { marginTop: 14 }]}>
        성별
      </AppText>
      <View style={card.genderRow}>
        {GENDERS.map((g) => (
          <Pressable
            key={g}
            style={[card.genderBtn, senior.gender === g && card.genderBtnOn]}
            onPress={() => onChangeGender(g)}
          >
            <AppText
              type="pretendard-m"
              style={[
                card.genderText,
                senior.gender === g && card.genderTextOn,
              ]}
            >
              {g}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 14,
  },
  title: {
    fontSize: 22,
    color: "#171717",
    marginBottom: 8,
  },
  desc: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 12,
  },
  addBtn: {
    height: 54,
    backgroundColor: "#EEECE0",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: {
    opacity: 0.45,
  },
  addBtnText: {
    fontSize: 15,
    color: "#777777",
  },
  addBtnTextDisabled: {
    color: "#AAAAAA",
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

const card = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFD24D",
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  spacer: {
    flex: 1,
  },
  removeText: {
    fontSize: 18,
    color: "#AAAAAA",
  },
  label: {
    fontSize: 14,
    color: "#444444",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    height: 46,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: "#171717",
    backgroundColor: "#FAFAFA",
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  genderBtnOn: {
    borderColor: "#FFD24D",
    backgroundColor: "#FFF9E6",
  },
  genderText: {
    fontSize: 14,
    color: "#888888",
  },
  genderTextOn: {
    color: "#171717",
    fontFamily: "Pretendard-SemiBold",
  },
});
