import { Image, Pressable, StyleSheet } from "react-native";

interface KakaoLoginButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export default function KakaoLoginButton({
  onPress,
  loading,
}: KakaoLoginButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        pressed && styles.btnPressed,
        loading && styles.btnLoading,
      ]}
      onPress={onPress}
      disabled={loading}
    >
      <Image
        source={require("../assets/images/KakaoLogin.png")}
        style={styles.img}
        resizeMode="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: "100%",
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnLoading: {
    opacity: 0.55,
  },
  img: {
    width: "100%",
    height: 54,
  },
});
