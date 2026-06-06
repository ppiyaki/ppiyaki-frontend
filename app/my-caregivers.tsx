import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError } from "@/services/api";
import {
  LinkedCaregiver,
  listLinkedCaregivers,
  sendWellbeingPing,
} from "@/services/care-relations";
import { resolveProfileImage } from "@/utils/profile-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PING_COOLDOWN_MS = 60_000;

// caregiverId → 마지막 전송 시각 (Date.now()). 모듈 레벨이라 화면 재진입에도 살아있음.
const lastPingAt = new Map<number, number>();

function getRemainingPingCooldownSec(caregiverId: number): number {
  const last = lastPingAt.get(caregiverId);
  if (last == null) return 0;
  const elapsed = Date.now() - last;
  if (elapsed >= PING_COOLDOWN_MS) return 0;
  return Math.ceil((PING_COOLDOWN_MS - elapsed) / 1000);
}

export default function MyCaregiversScreen() {
  const confirm = useConfirm();

  const [caregivers, setCaregivers] = useState<LinkedCaregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<number | null>(null);
  // caregiverId → 남은 쿨다운 초. 0이면 발송 가능.
  const [cooldowns, setCooldowns] = useState<Record<number, number>>({});
  // caregiverId → 직전 발송 성공 표시 ("전송됨!")
  const [justSent, setJustSent] = useState<Record<number, boolean>>({});
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshCooldownsFromCache = useCallback(() => {
    setCooldowns((_prev) => {
      const next: Record<number, number> = {};
      for (const [id, ts] of lastPingAt.entries()) {
        const remaining = Math.max(
          0,
          Math.ceil((PING_COOLDOWN_MS - (Date.now() - ts)) / 1000),
        );
        if (remaining > 0) next[id] = remaining;
      }
      return next;
    });
  }, []);

  const ensureTicker = useCallback(() => {
    if (tickerRef.current) return;
    tickerRef.current = setInterval(() => {
      // anyActive/next 를 setState 콜백 안에서 계산하면 외부 if 체크가
      // 콜백 실행 전에 돌아 항상 false → 첫 tick 직후 ticker 가 스스로 끊긴다.
      // 그래서 계산은 바깥에서 먼저 하고, setCooldowns 는 결과만 받는다.
      const next: Record<number, number> = {};
      let anyActive = false;
      for (const [id, ts] of lastPingAt.entries()) {
        const remaining = Math.max(
          0,
          Math.ceil((PING_COOLDOWN_MS - (Date.now() - ts)) / 1000),
        );
        if (remaining > 0) {
          next[id] = remaining;
          anyActive = true;
        }
      }
      setCooldowns(next);
      if (!anyActive && tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
    }, 1000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listLinkedCaregivers();
      setCaregivers(list);
      refreshCooldownsFromCache();
      if (Object.values(cooldowns).some((v) => v > 0)) ensureTicker();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.toUserMessage()
          : "보호자 정보를 불러오지 못했어요",
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      refreshCooldownsFromCache();
      ensureTicker();
    }, [load, refreshCooldownsFromCache, ensureTicker]),
  );

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []);

  const handleSendPing = async (caregiver: LinkedCaregiver) => {
    if (sending != null) return;
    if (getRemainingPingCooldownSec(caregiver.id) > 0) return;
    setSending(caregiver.id);
    try {
      await sendWellbeingPing(caregiver.id);
      lastPingAt.set(caregiver.id, Date.now());
      setJustSent((prev) => ({ ...prev, [caregiver.id]: true }));
      setTimeout(() => {
        setJustSent((prev) => {
          const next = { ...prev };
          delete next[caregiver.id];
          return next;
        });
      }, 2500);
      refreshCooldownsFromCache();
      ensureTicker();
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        // 다른 기기에서 이미 보낸 경우 등 — 쿨다운 동기화 시도
        lastPingAt.set(caregiver.id, Date.now());
        refreshCooldownsFromCache();
        ensureTicker();
        await confirm({
          title: "잠시 후에 다시 보내주세요",
          message: "방금 안부를 보낸 직후에는 잠시 쉬어주세요.",
          confirmText: "확인",
        });
      } else {
        const msg =
          e instanceof ApiError
            ? e.toUserMessage()
            : "안부 전송에 실패했어요";
        await confirm({
          title: "전송 실패",
          message: msg,
          confirmText: "확인",
        });
      }
    } finally {
      setSending(null);
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="내 보호자" />

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color="#FFD24D" />
        </View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Ionicons name="alert-circle" size={32} color="#E14B4B" />
          <AppText type="pretendard-m" style={styles.stateText}>
            {error}
          </AppText>
        </View>
      ) : caregivers.length === 0 ? (
        <View style={styles.stateBox}>
          <Ionicons name="people-outline" size={36} color="#BBB" />
          <AppText type="pretendard-b" style={styles.emptyTitle}>
            연결된 보호자가 없어요
          </AppText>
          <AppText type="pretendard-m" style={styles.emptyDesc}>
            보호자에게 연결 코드를 받으면{"\n"}
            여기에 보호자가 표시돼요
          </AppText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <AppText type="extrabold" style={styles.title}>
            보호자에게{"\n"}
            안부를 전해보세요
          </AppText>
          <AppText type="pretendard-m" style={styles.desc}>
            하트 버튼을 누르면 보호자에게 알림이 가요
          </AppText>

          {caregivers.map((c) => {
            const cd = cooldowns[c.id] ?? 0;
            const isSending = sending === c.id;
            const showJustSent = !!justSent[c.id];
            const disabled = cd > 0 || isSending;
            return (
              <View key={c.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatarRing}>
                    <Image
                      source={resolveProfileImage({
                        profileImage: c.profileImage ?? null,
                        profileImageUrl: c.profileImageUrl ?? null,
                      })}
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <AppText type="pretendard-r" style={styles.cardRole}>
                      나의 보호자
                    </AppText>
                    <AppText type="pretendard-b" style={styles.cardName}>
                      {c.nickname}
                    </AppText>
                  </View>
                </View>

                <Pressable
                  onPress={() => handleSendPing(c)}
                  disabled={disabled}
                  style={({ pressed }) => [
                    styles.pingBtn,
                    showJustSent && styles.pingBtnDone,
                    disabled && !showJustSent && styles.pingBtnCooldown,
                    pressed && !disabled && { opacity: 0.85 },
                  ]}
                >
                  {isSending ? (
                    <ActivityIndicator color="#FFF" />
                  ) : showJustSent ? (
                    <>
                      <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                      <AppText
                        type="pretendard-b"
                        style={styles.pingBtnText}
                      >
                        전송됐어요!
                      </AppText>
                    </>
                  ) : cd > 0 ? (
                    <>
                      <Ionicons name="time-outline" size={22} color="#888" />
                      <AppText
                        type="pretendard-b"
                        style={[styles.pingBtnText, { color: "#888" }]}
                      >
                        {cd}초 후 다시 보낼 수 있어요
                      </AppText>
                    </>
                  ) : (
                    <>
                      <Ionicons name="heart" size={24} color="#FFF" />
                      <AppText
                        type="pretendard-b"
                        style={styles.pingBtnText}
                      >
                        안부 보내기
                      </AppText>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },
  stateBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 18,
    color: "#222",
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 26,
    color: "#171717",
    lineHeight: 36,
    marginTop: 4,
  },
  desc: {
    fontSize: 16,
    color: "#555",
    marginBottom: 4,
    lineHeight: 22,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    padding: 18,
    gap: 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#F1ECDB",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardRole: {
    fontSize: 13,
    color: "#888",
  },
  cardName: {
    fontSize: 22,
    color: "#222",
  },

  pingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#E9824A",
  },
  pingBtnCooldown: {
    backgroundColor: "#F0EDE0",
  },
  pingBtnDone: {
    backgroundColor: "#5BC4AE",
  },
  pingBtnText: {
    fontSize: 18,
    color: "#FFF",
  },
});
