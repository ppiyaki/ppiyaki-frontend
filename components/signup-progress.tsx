import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface SignupProgressProps {
  step: number;
  totalSteps?: number;
}

export default function SignupProgress({
  step,
  totalSteps = 4,
}: SignupProgressProps) {
  const anim = useRef(new Animated.Value((step - 1) / totalSteps)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: step / totalSteps,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, []);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    height: 4,
    backgroundColor: "#E8E8DC",
  },
  fill: {
    height: "100%",
    backgroundColor: "#72D9CF",
    borderRadius: 2,
  },
});
