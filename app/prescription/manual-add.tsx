import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { MfdsMedicine, searchMfdsMedicines } from "@/services/medicines";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ManualMedicineAddScreen() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MfdsMedicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length === 0) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await searchMfdsMedicines(q.trim());
      setResults(res.responses);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const handlePick = (med: MfdsMedicine) => {
    router.push({
      pathname: "/prescription/manual-setup" as any,
      params: {
        itemSeq: med.itemSeq,
        itemName: med.itemName,
      },
    });
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="약 직접 등록" />

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="약 이름을 입력해주세요"
          placeholderTextColor="#BBB"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={6}>
            <Ionicons name="close-circle" size={18} color="#BBB" />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#FFD24D" />
          </View>
        )}

        {!loading && searched && results.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="search" size={28} color="#BBB" />
            <AppText type="pretendard-m" style={styles.emptyText}>
              검색 결과가 없어요
            </AppText>
          </View>
        )}

        {!loading && !searched && (
          <View style={styles.tipCard}>
            <AppText type="pretendard-b" style={styles.tipTitle}>
              💡 검색 팁
            </AppText>
            <AppText type="pretendard-m" style={styles.tipText}>
              {`정확한 약 이름이 아니어도 일부만 입력해도 돼요.\n예: "타이레놀", "아스피린"`}
            </AppText>
          </View>
        )}

        {results.map((med) => (
          <Pressable
            key={med.itemSeq}
            onPress={() => handlePick(med)}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: "#FBF7EC" },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <AppText
                type="pretendard-b"
                style={styles.rowName}
                numberOfLines={2}
              >
                {med.itemName}
              </AppText>
              {med.entpName && (
                <AppText type="pretendard-m" style={styles.rowMeta}>
                  {med.entpName}
                </AppText>
              )}
              {med.mainIngr && (
                <AppText
                  type="pretendard-r"
                  style={styles.rowIngr}
                  numberOfLines={1}
                >
                  {med.mainIngr}
                </AppText>
              )}
              {med.etcOtcCode && (
                <View style={styles.tagRow}>
                  <View style={styles.tag}>
                    <AppText type="pretendard-b" style={styles.tagText}>
                      {med.etcOtcCode}
                    </AppText>
                  </View>
                  {med.formName && (
                    <View style={styles.tag}>
                      <AppText type="pretendard-m" style={styles.tagText}>
                        {med.formName}
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#BBB" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Pretendard-Medium",
    color: "#222",
    padding: 0,
  },

  scroll: {
    padding: 16,
    gap: 8,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyBox: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
  },

  tipCard: {
    backgroundColor: "#FFF8E0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FFE9A8",
    gap: 4,
  },
  tipTitle: {
    fontSize: 13,
    color: "#5A4500",
  },
  tipText: {
    fontSize: 12,
    color: "#7A5C00",
    lineHeight: 18,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  rowName: {
    fontSize: 15,
    color: "#222",
  },
  rowMeta: {
    fontSize: 12,
    color: "#666",
  },
  rowIngr: {
    fontSize: 11,
    color: "#999",
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#F4F2EA",
  },
  tagText: {
    fontSize: 10,
    color: "#666",
  },
});
