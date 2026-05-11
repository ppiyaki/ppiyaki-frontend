import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import {
  ChatMessage,
  chatCache,
  createChatSession,
  streamSessionPhotoMessage,
  streamSessionTextMessage,
  streamSessionVoiceMessage,
} from "@/services/chat";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${m}`;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>(chatCache.messages);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(chatCache.sessionId);
  const [inputOpen, setInputOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // expo-audio 녹음 훅 — m4a 형식이 chat.ts streamSessionVoiceMessage 기대값과 일치
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // 마운트 시 마이크 권한 + 오디오 모드 준비
  useEffect(() => {
    void (async () => {
      try {
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (!perm.granted) {
          console.log("[chat] mic permission denied");
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      } catch (e) {
        console.log("[chat] audio init failed:", e);
      }
    })();
  }, []);

  // 화면 벗어날 때 TTS 정지
  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  // messages/session 변경 시 캐시 갱신
  useEffect(() => {
    chatCache.messages = messages;
  }, [messages]);
  useEffect(() => {
    chatCache.sessionId = sessionId;
  }, [sessionId]);

  // 세션이 없을 때만 새로 생성
  useEffect(() => {
    if (sessionId !== null) return;
    void (async () => {
      try {
        const s = await createChatSession();
        setSessionId(s.sessionId);
      } catch (e) {
        console.log("[chat] session create failed:", e);
      }
    })();
  }, [sessionId]);

  const speakText = (msgId: string, text: string) => {
    if (!text) return;
    void Speech.stop();
    setSpeakingId(msgId);
    Speech.speak(text, {
      language: "ko-KR",
      rate: 0.95,
      onDone: () => setSpeakingId((cur) => (cur === msgId ? null : cur)),
      onStopped: () => setSpeakingId((cur) => (cur === msgId ? null : cur)),
      onError: () => setSpeakingId((cur) => (cur === msgId ? null : cur)),
    });
  };

  const buildAiHandlers = (aiId: string) => {
    let accumulated = "";
    return {
      onChunk: (chunk: string) => {
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId && m.role === "ai"
              ? { ...m, text: m.text + chunk }
              : m,
          ),
        );
      },
      onDone: () => {
        setStreaming(false);
        if (accumulated.length === 0) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId && m.role === "ai" && !m.text
                ? { ...m, text: "응답을 받지 못했어요. 다시 시도해주세요." }
                : m,
            ),
          );
          return;
        }
        speakText(aiId, accumulated);
      },
      onError: (err: Error) => {
        console.log("[chat] stream error:", err);
        const fallback =
          err.message && err.message.length > 0
            ? `응답을 받지 못했어요\n(${err.message})`
            : "응답을 받지 못했어요. 다시 시도해주세요.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId && m.role === "ai"
              ? { ...m, text: m.text || fallback }
              : m,
          ),
        );
        setStreaming(false);
      },
    };
  };

  const inferPhotoMime = (uri: string): string => {
    const lower = uri.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    return "image/jpeg";
  };

  /**
   * nginx client_max_body_size(기본 1MB) 우회용 리사이즈.
   * 가로 1280px로 리사이즈 + JPEG 70% — 보통 200~500KB로 떨어진다.
   */
  const compressPhoto = async (
    uri: string,
  ): Promise<{ uri: string; mime: string }> => {
    try {
      const ctx = ImageManipulator.ImageManipulator.manipulate(uri);
      ctx.resize({ width: 1280 });
      const ref = await ctx.renderAsync();
      const image = await ref.saveAsync({
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.7,
      });
      return { uri: image.uri, mime: "image/jpeg" };
    } catch (e) {
      console.log("[chat] image compress failed, sending original:", e);
      return { uri, mime: inferPhotoMime(uri) };
    }
  };

  const handleSend = async () => {
    if (!sessionId || streaming) return;
    const text = inputText.trim();
    const photoUri = pendingImage;
    if (!text && !photoUri) return;

    const now = new Date();
    const userId = `u-${now.getTime()}`;
    const aiId = `a-${now.getTime() + 1}`;

    setMessages((prev) => [
      ...prev,
      {
        id: userId,
        role: "user",
        text: text || undefined,
        imageUri: photoUri ?? undefined,
        time: formatTime(now),
      },
      { id: aiId, role: "ai", text: "", time: formatTime(now) },
    ]);
    setInputText("");
    setInputOpen(false);
    setPendingImage(null);
    setStreaming(true);

    const handlers = buildAiHandlers(aiId);

    try {
      if (photoUri) {
        const compressed = await compressPhoto(photoUri);
        await streamSessionPhotoMessage(
          sessionId,
          compressed,
          handlers,
          text || undefined,
        );
      } else {
        await streamSessionTextMessage(sessionId, text, handlers);
      }
    } catch (e) {
      console.log("[chat] stream throw:", e);
      setStreaming(false);
    }
  };

  const startRecording = async () => {
    if (!sessionId || streaming || recording) return;
    try {
      void Speech.stop();
      setSpeakingId(null);
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecording(true);
    } catch (e) {
      console.log("[chat] start recording failed:", e);
      setRecording(false);
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recording || !sessionId) {
      setRecording(false);
      return;
    }
    setRecording(false);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) return;

      const now = new Date();
      const userId = `u-${now.getTime()}`;
      const aiId = `a-${now.getTime() + 1}`;

      setMessages((prev) => [
        ...prev,
        {
          id: userId,
          role: "user",
          text: "🎤 음성 메시지",
          time: formatTime(now),
        },
        { id: aiId, role: "ai", text: "", time: formatTime(now) },
      ]);
      setStreaming(true);

      const handlers = buildAiHandlers(aiId);
      try {
        await streamSessionVoiceMessage(sessionId, uri, handlers);
      } catch (e) {
        console.log("[chat] voice stream throw:", e);
        setStreaming(false);
      }
    } catch (e) {
      console.log("[chat] stop recording failed:", e);
      setStreaming(false);
    }
  };

  const handleMicPress = () => {
    if (recording) void stopRecordingAndSend();
    else void startRecording();
  };

  const handleSpeakAi = (msgId: string, text: string) => {
    if (!text) return;
    if (speakingId === msgId) {
      void Speech.stop();
      setSpeakingId(null);
      return;
    }
    speakText(msgId, text);
  };

  const openCamera = async () => {
    setPickerOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingImage(result.assets[0].uri);
    }
  };

  const openLibrary = async () => {
    setPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingImage(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader title="대화하기" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled={inputOpen}
        style={{ flex: 1 }}
      >
        {/* 채팅 영역 */}
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, idx) => {
            if (msg.role === "user") {
              return <UserMessage key={msg.id} message={msg} />;
            }
            const isLast = idx === messages.length - 1;
            return (
              <AiMessage
                key={msg.id}
                message={msg}
                speaking={speakingId === msg.id}
                streaming={streaming && isLast}
                onSpeak={() => handleSpeakAi(msg.id, msg.text)}
              />
            );
          })}
        </ScrollView>

        {/* 사진 미리보기 */}
        {pendingImage && (
          <View style={styles.preview}>
            <Image source={{ uri: pendingImage }} style={styles.previewImg} />
            <View style={styles.previewBody}>
              <AppText type="pretendard-b" style={styles.previewTitle}>
                이 사진에 대해 물어볼 수 있어요
              </AppText>
              <AppText type="pretendard-r" style={styles.previewDesc}>
                바로 보내거나 질문을 입력해보세요
              </AppText>
            </View>
            <Pressable
              onPress={handleSend}
              disabled={!sessionId || streaming}
              style={({ pressed }) => [
                styles.previewSend,
                (!sessionId || streaming) && styles.previewSendDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="send" size={16} color="#FFF" />
            </Pressable>
            <Pressable
              onPress={() => setPendingImage(null)}
              hitSlop={10}
              style={styles.previewClose}
            >
              <Ionicons name="close" size={18} color="#666" />
            </Pressable>
          </View>
        )}

        {/* 하단 입력 패널 (직접 입력 모드 / 음성 모드) */}
        <SafeAreaView edges={["bottom"]} style={styles.dockWrap}>
          {inputOpen ? (
            <View style={styles.inputBar}>
              <Pressable
                onPress={() => {
                  setInputOpen(false);
                  setInputText("");
                }}
                hitSlop={6}
                style={styles.inputCloseBtn}
              >
                <Ionicons name="close" size={20} color="#666" />
              </Pressable>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="궁금한 걸 입력해주세요"
                placeholderTextColor="#BBB"
                multiline
                autoFocus
                style={styles.inputBarField}
              />
              <Pressable
                onPress={handleSend}
                disabled={
                  !sessionId ||
                  streaming ||
                  (!inputText.trim() && !pendingImage)
                }
                style={({ pressed }) => [
                  styles.inputBarSendBtn,
                  (!sessionId ||
                    streaming ||
                    (!inputText.trim() && !pendingImage)) &&
                    styles.inputBarSendBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Ionicons
                  name={streaming ? "hourglass" : "send"}
                  size={20}
                  color="#FFF"
                />
              </Pressable>
            </View>
          ) : (
            <View style={styles.dock}>
              <View style={styles.dockHint}>
                <View style={styles.wave} />
                <AppText type="pretendard-m" style={styles.dockHintText}>
                  아래 노란 마이크를 눌러 질문해보세요
                </AppText>
                <View style={styles.wave} />
              </View>

              <View style={styles.dockRow}>
                <DockBtn
                  label="사진 추가"
                  icon="camera"
                  onPress={() => setPickerOpen(true)}
                />
                <Pressable
                  onPress={handleMicPress}
                  disabled={!sessionId || streaming}
                  style={({ pressed }) => [
                    styles.micBtn,
                    recording && styles.micBtnOn,
                    (!sessionId || streaming) && { opacity: 0.5 },
                    pressed && { transform: [{ scale: 0.96 }] },
                  ]}
                >
                  <Ionicons
                    name={recording ? "stop" : "mic"}
                    size={40}
                    color="#1F1F1F"
                  />
                </Pressable>
                <DockBtn
                  label="다시 듣기"
                  icon="volume-high"
                  onPress={() => {
                    const lastAi = [...messages]
                      .reverse()
                      .find((m) => m.role === "ai" && m.text);
                    if (lastAi && lastAi.role === "ai") {
                      handleSpeakAi(lastAi.id, lastAi.text);
                    }
                  }}
                />
              </View>

              {recording ? (
                <AppText type="pretendard-b" style={styles.micLabel}>
                  듣고 있어요…
                </AppText>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.keypadBtn,
                    pressed && { backgroundColor: "#FFF4C7" },
                  ]}
                  onPress={() => setInputOpen(true)}
                >
                  <Ionicons name="keypad" size={20} color="#1F1F1F" />
                  <AppText type="pretendard-b" style={styles.keypadText}>
                    직접 입력하기
                  </AppText>
                  <Ionicons name="chevron-forward" size={18} color="#888" />
                </Pressable>
              )}
            </View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* 사진 선택 바텀시트 */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <AppText type="pretendard-b" style={styles.sheetTitle}>
              사진을 어떻게 추가할까요?
            </AppText>
            <Pressable
              onPress={openCamera}
              style={({ pressed }) => [
                styles.sheetBtn,
                pressed && styles.sheetBtnPressed,
              ]}
            >
              <Ionicons name="camera" size={26} color="#5BC4AE" />
              <AppText type="pretendard-b" style={styles.sheetBtnText}>
                카메라로 찍기
              </AppText>
            </Pressable>
            <Pressable
              onPress={openLibrary}
              style={({ pressed }) => [
                styles.sheetBtn,
                pressed && styles.sheetBtnPressed,
              ]}
            >
              <Ionicons name="images" size={26} color="#5BC4AE" />
              <AppText type="pretendard-b" style={styles.sheetBtnText}>
                앨범에서 고르기
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setPickerOpen(false)}
              style={styles.sheetCancel}
            >
              <AppText type="pretendard-m" style={styles.sheetCancelText}>
                취소
              </AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function UserMessage({
  message,
}: {
  message: Extract<ChatMessage, { role: "user" }>;
}) {
  return (
    <View style={styles.userRow}>
      <View style={styles.userCol}>
        {message.text && (
          <View style={styles.userBubble}>
            <AppText type="pretendard-b" style={styles.userText}>
              {message.text}
            </AppText>
          </View>
        )}
        {message.imageUri && (
          <Image
            source={{ uri: message.imageUri }}
            style={styles.userImage}
            resizeMode="cover"
          />
        )}
        <AppText type="pretendard-r" style={styles.timeRight}>
          {message.time}
        </AppText>
      </View>
    </View>
  );
}

function AiMessage({
  message,
  speaking,
  streaming,
  onSpeak,
}: {
  message: Extract<ChatMessage, { role: "ai" }>;
  speaking: boolean;
  streaming: boolean;
  onSpeak: () => void;
}) {
  const empty = !message.text;
  return (
    <View style={styles.aiRow}>
      <View style={styles.aiAvatarWrap}>
        <Image
          source={require("../assets/images/pf/pfimg1.png")}
          style={styles.aiAvatar}
          resizeMode="cover"
        />
      </View>
      <View style={styles.aiCol}>
        <AppText type="pretendard-b" style={styles.aiName}>
          삐약이
        </AppText>
        <View style={styles.aiBubble}>
          {streaming && empty ? (
            <View style={styles.thinkingRow}>
              <ActivityIndicator size="small" color="#5BC4AE" />
              <AppText type="pretendard-b" style={styles.thinkingText}>
                답변을 준비하고 있어요…
              </AppText>
            </View>
          ) : (
            <AppText type="pretendard-b" style={styles.aiText}>
              {message.text}
              {streaming && (
                <AppText type="pretendard-b" style={styles.streamCaret}>
                  {" "}
                  ▍
                </AppText>
              )}
            </AppText>
          )}
          {!streaming && !empty && (
            <Pressable
              onPress={onSpeak}
              disabled={!message.text}
              style={({ pressed }) => [
                styles.listenBtn,
                speaking && { backgroundColor: "#D6F1EA" },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name={speaking ? "stop" : "volume-high"}
                size={16}
                color="#5BC4AE"
              />
              <AppText type="pretendard-b" style={styles.listenText}>
                {speaking ? "멈추기" : "다시 듣기"}
              </AppText>
            </Pressable>
          )}
        </View>
        <AppText type="pretendard-r" style={styles.timeLeft}>
          {message.time}
        </AppText>
      </View>
    </View>
  );
}

function DockBtn({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dockBtn,
        pressed && { transform: [{ scale: 0.96 }], backgroundColor: "#F4FBF9" },
      ]}
    >
      <Ionicons name={icon} size={26} color="#5BC4AE" />
      <AppText type="pretendard-b" style={styles.dockBtnLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF6",
  },

  /* 헤더 */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    color: "#171717",
  },
  headerRight: {
    width: 44,
  },

  /* 채팅 */
  chat: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 16,
  },
  userRow: {
    alignItems: "flex-end",
  },
  userCol: {
    maxWidth: "82%",
    alignItems: "flex-end",
    gap: 6,
  },
  userBubble: {
    backgroundColor: "#D6F1EA",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  userText: {
    fontSize: 19,
    color: "#1F1F1F",
    lineHeight: 26,
  },
  userImage: {
    width: 220,
    height: 220,
    borderRadius: 20,
    backgroundColor: "#EEE",
  },
  timeRight: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },

  aiRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  aiAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF4C7",
    overflow: "hidden",
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    justifyContent: "center",
    alignItems: "center",
  },
  aiAvatar: {
    width: "100%",
    height: "100%",
  },
  aiCol: {
    flex: 1,
    alignItems: "flex-start",
    gap: 4,
  },
  aiName: {
    fontSize: 18,
    color: "#1F1F1F",
    marginLeft: 4,
  },
  aiBubble: {
    backgroundColor: "#FFF4C7",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    maxWidth: "100%",
    gap: 12,
  },
  aiText: {
    fontSize: 20,
    color: "#1F1F1F",
    lineHeight: 30,
  },
  listenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  listenText: {
    fontSize: 14,
    color: "#5BC4AE",
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  thinkingText: {
    fontSize: 16,
    color: "#5BC4AE",
  },
  streamCaret: {
    color: "#5BC4AE",
  },
  timeLeft: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
    marginLeft: 4,
  },

  /* 사진 미리보기 */
  preview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    gap: 12,
  },
  previewImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#EEE",
  },
  previewBody: {
    flex: 1,
    gap: 2,
  },
  previewTitle: {
    fontSize: 15,
    color: "#1F1F1F",
  },
  previewDesc: {
    fontSize: 12,
    color: "#777",
  },
  previewClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F4F2EA",
    justifyContent: "center",
    alignItems: "center",
  },
  previewSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#5BC4AE",
    justifyContent: "center",
    alignItems: "center",
  },
  previewSendDisabled: {
    backgroundColor: "#BBB",
  },

  /* 하단 도크 */
  dock: {
    backgroundColor: "#FFF",
    marginHorizontal: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F1ECDB",
    alignItems: "center",
    gap: 12,
  },
  dockHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wave: {
    width: 18,
    height: 12,
    backgroundColor: "#D6F1EA",
    borderRadius: 4,
  },
  dockHintText: {
    fontSize: 14,
    color: "#5BC4AE",
  },
  dockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  dockBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#BDEFEA",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  dockBtnLabel: {
    fontSize: 12,
    color: "#1F1F1F",
  },
  micBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFD24D",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFF4C7",
  },
  micBtnOn: {
    backgroundColor: "#FFB800",
  },
  micLabel: {
    fontSize: 16,
    color: "#1F1F1F",
  },
  keypadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FAFAF6",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  keypadText: {
    fontSize: 15,
    color: "#1F1F1F",
  },

  /* dock wrapper (SafeArea bottom + 키보드 영역) */
  dockWrap: {
    backgroundColor: "#FFFDF6",
  },

  /* 직접 입력 인라인 바 */
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F1ECDB",
  },
  inputCloseBtn: {
    width: 40,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  inputBarField: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#F1ECDB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    fontFamily: "Pretendard-Medium",
    color: "#222",
    textAlignVertical: "top",
  },
  inputBarSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFD24D",
    justifyContent: "center",
    alignItems: "center",
  },
  inputBarSendBtnDisabled: {
    backgroundColor: "#F0EDE0",
  },

  /* 바텀시트 */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 32,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    color: "#171717",
    textAlign: "center",
    marginBottom: 8,
  },
  sheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    height: 60,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#FAFAF6",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  sheetBtnPressed: {
    backgroundColor: "#F4FBF9",
  },
  sheetBtnText: {
    fontSize: 17,
    color: "#1F1F1F",
  },
  sheetCancel: {
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  sheetCancelText: {
    fontSize: 16,
    color: "#888",
  },
});
