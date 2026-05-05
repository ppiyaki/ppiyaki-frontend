import AppText from "@/components/app-text";
import { Modal, Pressable, StyleSheet, View } from "react-native";

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  danger,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <AppText type="pretendard-b" style={styles.title}>
            {title}
          </AppText>
          {message ? (
            <AppText type="pretendard-m" style={styles.message}>
              {message}
            </AppText>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                styles.cancelBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <AppText type="pretendard-b" style={styles.cancelText}>
                {cancelText}
              </AppText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                danger ? styles.dangerBtn : styles.confirmBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <AppText
                type="pretendard-b"
                style={danger ? styles.dangerText : styles.confirmText}
              >
                {confirmText}
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    gap: 10,
  },
  title: {
    fontSize: 18,
    color: "#222",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#F4F2EA",
  },
  cancelText: {
    fontSize: 15,
    color: "#555",
  },
  confirmBtn: {
    backgroundColor: "#FFD24D",
  },
  confirmText: {
    fontSize: 15,
    color: "#222",
  },
  dangerBtn: {
    backgroundColor: "#E14B4B",
  },
  dangerText: {
    fontSize: 15,
    color: "#FFF",
  },
});
