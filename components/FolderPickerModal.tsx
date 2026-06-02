import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  createFolder,
  getFolders,
  getSongFolders,
  setSongFolders,
} from "../utils/storage";
import NameInputModal from "./NameInputModal";

type Props = {
  visible: boolean;
  title: string;
  artist: string;
  // Called when the modal closes. `changed` is true if membership was saved.
  onClose: (changed: boolean) => void;
};

// Checklist of all library folders for a single song, with inline folder
// creation. Shared by the library rows and the saved-song viewer.
export default function FolderPickerModal({
  visible,
  title,
  artist,
  onClose,
}: Props) {
  const [folders, setFolders] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [naming, setNaming] = useState(false);

  const load = useCallback(async () => {
    const [all, mine] = await Promise.all([
      getFolders(),
      getSongFolders(title, artist),
    ]);
    setFolders(all);
    setSelected(new Set(mine));
  }, [title, artist]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCreate = async (name: string) => {
    const status = await createFolder(name);
    setNaming(false);
    if (status === "created" || status === "exists") {
      setFolders(await getFolders());
      // Auto-check the (new or existing) folder for this song.
      setSelected((prev) => new Set(prev).add(name.trim()));
    }
  };

  const handleDone = async () => {
    await setSongFolders(title, artist, [...selected]);
    onClose(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => onClose(false)}
    >
      <TouchableWithoutFeedback onPress={() => onClose(false)}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <Text style={styles.heading}>Add to folders</Text>
              <Text style={styles.subheading} numberOfLines={1}>
                {title}
              </Text>

              <ScrollView style={styles.list}>
                {folders.length === 0 ? (
                  <Text style={styles.empty}>
                    No folders yet. Create one below.
                  </Text>
                ) : (
                  folders.map((name) => {
                    const checked = selected.has(name);
                    return (
                      <TouchableOpacity
                        key={name}
                        style={styles.row}
                        onPress={() => toggle(name)}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            checked && styles.checkboxChecked,
                          ]}
                        >
                          {checked && (
                            <Ionicons name="checkmark" size={15} color="#fff" />
                          )}
                        </View>
                        <Text style={styles.rowText}>{name}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}

                <TouchableOpacity
                  style={styles.newRow}
                  onPress={() => setNaming(true)}
                >
                  <Ionicons name="add" size={18} color="#1DB954" />
                  <Text style={styles.newText}>New folder…</Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      <NameInputModal
        visible={naming}
        title="New folder"
        placeholder="Folder name"
        confirmLabel="Create"
        onCancel={() => setNaming(false)}
        onSubmit={handleCreate}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1E1E1E",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 34,
    maxHeight: "75%",
  },
  heading: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  subheading: { color: "#888", fontSize: 13, marginTop: 4, marginBottom: 14 },
  list: { flexGrow: 0 },
  empty: { color: "#666", fontSize: 14, paddingVertical: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  checkboxChecked: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  rowText: { color: "#fff", fontSize: 15 },
  newRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  newText: { color: "#1DB954", fontSize: 15, fontWeight: "600", marginLeft: 8 },
  doneBtn: {
    backgroundColor: "#1DB954",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  doneText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
