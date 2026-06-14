import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
};

// A small dark-themed text-prompt modal. Used for creating and renaming
// folders since React Native's Alert.prompt is iOS-only.
export default function NameInputModal({
  visible,
  title,
  placeholder = "Name",
  initialValue = "",
  confirmLabel = "Save",
  onCancel,
  onSubmit,
}: Props) {
  const [value, setValue] = useState(initialValue);

  // Re-seed the field each time the modal is opened.
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <Text style={styles.title}>{title}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#555"
                value={value}
                onChangeText={setValue}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <View style={styles.row}>
                <TouchableOpacity
                  onPress={onCancel}
                  style={[styles.btn, styles.btnGhost]}
                >
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submit}
                  disabled={!value.trim()}
                  style={[
                    styles.btn,
                    styles.btnPrimary,
                    { marginLeft: 10 },
                    !value.trim() && styles.btnDisabled,
                  ]}
                >
                  <Text style={styles.btnPrimaryText}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    padding: 20,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 14 },
  input: {
    backgroundColor: "#101010",
    color: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 16,
  },
  row: { flexDirection: "row", justifyContent: "flex-end" },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#1DB954" },
  btnPrimaryText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  btnDisabled: { opacity: 0.5 },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#333" },
  btnGhostText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
