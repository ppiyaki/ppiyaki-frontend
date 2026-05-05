import AppText from "@/components/app-text";
import { useRouter } from "expo-router";
import {
    Image,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Role = "senior" | "family";

export default function SelectRoleScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const compact = width < 360 || height < 760;

  const handlePickRole = (role: Role) => {
    if (role === "senior") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace("/senior-connect" as any);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace("/family-login" as any);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={[styles.container, { paddingTop: compact ? 68 : 88 }]}>
        <AppText
          type="pretendard-b"
          style={[styles.title, { fontSize: compact ? 28 : 28 }]}
        >
          사용 목적을 선택하세요
        </AppText>

        <View
          style={[
            styles.row,
            { marginTop: compact ? 28 : 38, gap: compact ? 10 : 16 },
          ]}
        >
          <RoleImageButton
            source={require("../assets/images/SeniorBtn.png")}
            label="시니어"
            onPress={() => handlePickRole("senior")}
          />
          <RoleImageButton
            source={require("../assets/images/FamilyBtn.png")}
            label="보호자"
            onPress={() => handlePickRole("family")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function RoleImageButton({
  source,
  label,
  onPress,
}: {
  source: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleButton,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <Image source={source} resizeMode="contain" style={styles.roleImage} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FEFDFB",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  title: {
    lineHeight: 50,
    textAlign: "center",
    color: "#171717",
  },
  row: {
    width: "100%",
    maxWidth: 560,
    flexDirection: "row",
    justifyContent: "center",
  },
  roleButton: {
    flex: 1,
    maxWidth: 268,
  },
  roleImage: {
    width: "100%",
    height: undefined,
    aspectRatio: 0.5,
  },
});
