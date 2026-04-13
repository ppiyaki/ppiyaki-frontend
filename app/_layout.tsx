import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import "react-native-reanimated";

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore splash state races during fast refresh.
});

const CUSTOM_SPLASH_DURATION_MS = 2000;

export default function RootLayout() {
  const [splashElapsed, setSplashElapsed] = useState(false);
  const [fontsLoaded] = useFonts({
    "Pretendard-Black": require("../assets/fonts/Pretendard-Black.ttf"),
    "Pretendard-Bold": require("../assets/fonts/Pretendard-Bold.ttf"),
    "Pretendard-ExtraBold": require("../assets/fonts/Pretendard-ExtraBold.ttf"),
    "Pretendard-ExtraLight": require("../assets/fonts/Pretendard-ExtraLight.ttf"),
    "Pretendard-Light": require("../assets/fonts/Pretendard-Light.ttf"),
    "Pretendard-Medium": require("../assets/fonts/Pretendard-Medium.ttf"),
    "Pretendard-Regular": require("../assets/fonts/Pretendard-Regular.ttf"),
    "Pretendard-SemiBold": require("../assets/fonts/Pretendard-SemiBold.ttf"),
    "Pretendard-Thin": require("../assets/fonts/Pretendard-Thin.ttf"),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashElapsed(true);
    }, CUSTOM_SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleSplashLayout = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {
      // Ignore duplicate hide calls during fast refresh.
    });
  }, []);

  if (!splashElapsed || !fontsLoaded) {
    return (
      <View style={styles.splashContainer} onLayout={handleSplashLayout}>
        <Image
          source={require("../assets/images/splashimg.png")}
          style={styles.splashImage}
          resizeMode="cover"
        />
        <ActivityIndicator
          size="large"
          color="#FFFFFF"
          style={styles.spinner}
        />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="select-role" />
      <Stack.Screen name="senior-connect" />
      <Stack.Screen name="family-login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#FFD24D",
  },
  splashImage: {
    width: "100%",
    height: "100%",
  },
  spinner: {
    position: "absolute",
    bottom: 64,
    alignSelf: "center",
  },
});
