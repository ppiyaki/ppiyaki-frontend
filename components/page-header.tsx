import AppText from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  style?: ViewStyle;
}

export default function PageHeader({
  title,
  onBack,
  rightSlot,
  style,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={handleBack}
        hitSlop={12}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="chevron-back" size={22} color="#333" />
        <AppText type="pretendard-m" style={styles.backLabel}>
          뒤로가기
        </AppText>
      </Pressable>

      <AppText
        type="pretendard-b"
        style={styles.title}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {title}
      </AppText>

      <View style={styles.right}>{rightSlot}</View>
    </View>
  );
}

const SIDE_WIDTH = 100;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    width: SIDE_WIDTH,
  },
  backLabel: {
    fontSize: 15,
    color: "#333",
    marginLeft: 2,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    color: "#171717",
  },
  right: {
    width: SIDE_WIDTH,
    alignItems: "flex-end",
  },
});
