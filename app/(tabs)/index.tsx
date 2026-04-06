import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* 메인 화면 */}
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요, 김복순님! 🐥</Text>
      </View>
      <View style={styles.content}>
        <Text style={{ fontSize: 80 }}>🐥</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>약 먹었다고 알려주기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F2", padding: 20 },
  header: { marginTop: 40, alignItems: "center" },
  greeting: { fontSize: 28, fontWeight: "bold", color: "#2C3E50" },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  button: {
    backgroundColor: "#FFD24D",
    padding: 20,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
    marginTop: 30,
  },
  buttonText: { fontSize: 22, fontWeight: "bold", color: "#2C3E50" },
});
