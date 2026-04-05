import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import "react-native-reanimated";

void SplashScreen.preventAutoHideAsync();

const CUSTOM_SPLASH_DURATION_MS = 2000;

export default function RootLayout() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCustomSplash(false);
    }, CUSTOM_SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleSplashLayout = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  if (showCustomSplash) {
    return (
      <View style={styles.splashContainer} onLayout={handleSplashLayout}>
        <Image
          source={require("../assets/images/splashimg.png")}
          style={styles.splashImage}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
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
});
