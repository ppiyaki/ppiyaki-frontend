import AppText from "@/components/app-text";
import PageHeader from "@/components/page-header";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Message =
  | { id: string; role: "user"; text?: string; imageUri?: string; time: string }
  | { id: string; role: "ai"; text: string; time: string };

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    text: "이거 약이랑 먹어도 되니",
    imageUri:
      "https://images.unsplash.com/photo-1622597467836-f3e6707e1191?w=400",
    time: "오후 3:02",
  },
  {
    id: "2",
    role: "ai",
    text:
      "아니요! 김복순님이 드시는 혈압약과 함께 드시면 안 돼요.\n" +
      "음료 속 자몽 성분이 약 효과를 너무 강하게 만들 수 있어요.\n" +
      "약 드시고 2시간 뒤에 드시는 것이 좋아요.",
    time: "오후 3:02",
  },
];

export default function ChatScreen() {
  const [messages] = useState<Message[]>(INITIAL_MESSAGES);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <PageHeader title="대화하기" />

      {/* 채팅 영역 */}
      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((msg) =>
          msg.role === "user" ? (
            <UserMessage key={msg.id} message={msg} />
          ) : (
            <AiMessage key={msg.id} message={msg} />
          ),
        )}
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
              마이크를 누르고 질문해보세요
            </AppText>
          </View>
          <Pressable
            onPress={() => setPendingImage(null)}
            hitSlop={10}
            style={styles.previewClose}
          >
            <Ionicons name="close" size={18} color="#666" />
          </Pressable>
        </View>
      )}

      {/* 하단 입력 패널 */}
      <View style={styles.dock}>
        <View style={styles.dockHint}>
          <View style={styles.wave} />
          <AppText type="pretendard-m" style={styles.dockHintText}>
            버튼을 누르고 질문해보세요
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
            onPress={() => setRecording((r) => !r)}
            style={({ pressed }) => [
              styles.micBtn,
              recording && styles.micBtnOn,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <Ionicons
              name={recording ? "stop" : "mic"}
              size={40}
              color="#1F1F1F"
            />
          </Pressable>
          <DockBtn label="다시 듣기" icon="volume-high" onPress={() => {}} />
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
            onPress={() => {}}
          >
            <Ionicons name="keypad" size={20} color="#1F1F1F" />
            <AppText type="pretendard-b" style={styles.keypadText}>
              직접 입력하기
            </AppText>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </Pressable>
        )}
      </View>

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
  message: Extract<Message, { role: "user" }>;
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

function AiMessage({ message }: { message: Extract<Message, { role: "ai" }> }) {
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
          <AppText type="pretendard-b" style={styles.aiText}>
            {message.text}
          </AppText>
          <Pressable style={styles.listenBtn}>
            <Ionicons name="volume-high" size={16} color="#5BC4AE" />
            <AppText type="pretendard-b" style={styles.listenText}>
              자세히 듣기
            </AppText>
          </Pressable>
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
