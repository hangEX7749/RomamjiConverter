import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FolderPickerModal from "../components/FolderPickerModal";
import NameInputModal from "../components/NameInputModal";
import {
  createFolder,
  deleteFolder,
  deleteSong,
  getFolders,
  getSavedSongs,
  renameFolder,
} from "../utils/storage";

type SavedSong = {
  title: string;
  artist: string;
  lyrics: string;
  romaji?: string;
  syncedLyrics?: string | null;
  duration?: number;
  folders?: string[];
};

// Drives the create/rename name modal.
type NameModalState =
  | { mode: "create" }
  | { mode: "rename"; target: string }
  | null;

export default function LibraryScreen() {
  const [savedSongs, setSavedSongs] = useState<SavedSong[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [pickerSong, setPickerSong] = useState<SavedSong | null>(null);
  const [nameModal, setNameModal] = useState<NameModalState>(null);

  const router = useRouter();

  const loadData = useCallback(async () => {
    const [songs, fldrs] = await Promise.all([getSavedSongs(), getFolders()]);
    setSavedSongs(songs);
    setFolders(fldrs);
  }, []);

  // Reload on focus so imports made in Settings show up immediately.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const filteredSongs = savedSongs.filter((song) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query);
    const matchesFolder =
      activeFolder === null ||
      (Array.isArray(song.folders) && song.folders.includes(activeFolder));
    return matchesQuery && matchesFolder;
  });

  const confirmDelete = (title: string, artist: string) => {
    Alert.alert("Delete Song", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = await deleteSong(title, artist);
          setSavedSongs(updated || []);
        },
      },
    ]);
  };

  // --- Folder management ---
  const handleNameSubmit = async (value: string) => {
    if (!nameModal) return;
    if (nameModal.mode === "create") {
      const status = await createFolder(value);
      setNameModal(null);
      if (status === "exists") {
        Alert.alert("Folder exists", `A folder named "${value}" already exists.`);
      }
      await loadData();
    } else {
      const old = nameModal.target;
      const status = await renameFolder(old, value);
      setNameModal(null);
      if (status === "exists") {
        Alert.alert("Folder exists", `A folder named "${value}" already exists.`);
        return;
      }
      if (activeFolder === old) setActiveFolder(value);
      await loadData();
    }
  };

  const manageFolder = (name: string) => {
    Alert.alert(name, undefined, [
      { text: "Rename", onPress: () => setNameModal({ mode: "rename", target: name }) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            "Delete folder?",
            `"${name}" will be removed. Songs stay in your library.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  await deleteFolder(name);
                  if (activeFolder === name) setActiveFolder(null);
                  await loadData();
                },
              },
            ],
          ),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderChip = (
    label: string,
    active: boolean,
    onPress: () => void,
    onLongPress?: () => void,
  ) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={styles.iconBtn}
          accessibilityLabel="Settings"
        >
          <Text style={styles.iconBtnText}>⚙</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.header}>My Library</Text>

      <TextInput
        style={styles.searchBar}
        placeholder="Search by title or artist..."
        placeholderTextColor="#666"
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
      />

      {/* Folder filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}
      >
        {renderChip("All", activeFolder === null, () => setActiveFolder(null))}
        {folders.map((name) =>
          renderChip(
            name,
            activeFolder === name,
            () => setActiveFolder(name),
            () => manageFolder(name),
          ),
        )}
        <TouchableOpacity
          onPress={() => setNameModal({ mode: "create" })}
          style={[styles.chip, styles.chipAdd]}
          accessibilityLabel="New folder"
        >
          <Ionicons name="add" size={18} color="#1DB954" />
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={filteredSongs}
        keyExtractor={(item) => item.title + item.artist}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery || activeFolder !== null
              ? "No matching songs found."
              : "Your library is empty."}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() =>
                router.push({
                  pathname: "/savedLyric",
                  params: {
                    artist: item.artist,
                    title: item.title,
                    lyrics: item.lyrics,
                    preComputedRomaji: item.romaji,
                    syncedLyrics: item.syncedLyrics || null,
                    duration: item.duration || 0,
                  },
                })
              }
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.artist}>{item.artist}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPickerSong(item)}
              style={styles.folderBtn}
              accessibilityLabel="Add to folders"
            >
              <Ionicons name="folder-outline" size={20} color="#1DB954" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmDelete(item.title, item.artist)}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {pickerSong && (
        <FolderPickerModal
          visible={!!pickerSong}
          title={pickerSong.title}
          artist={pickerSong.artist}
          onClose={(changed) => {
            setPickerSong(null);
            if (changed) loadData();
          }}
        />
      )}

      <NameInputModal
        visible={nameModal !== null}
        title={nameModal?.mode === "rename" ? "Rename folder" : "New folder"}
        placeholder="Folder name"
        initialValue={nameModal?.mode === "rename" ? nameModal.target : ""}
        confirmLabel={nameModal?.mode === "rename" ? "Rename" : "Create"}
        onCancel={() => setNameModal(null)}
        onSubmit={handleNameSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: { color: "#fff", fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  searchBar: {
    backgroundColor: "#1E1E1E",
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: "#333",
  },
  chipsRow: { marginBottom: 16, flexGrow: 0 },
  chipsContent: { alignItems: "center", paddingRight: 10 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1E1E1E",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  chipText: { color: "#ccc", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  chipAdd: {
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#1DB954",
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  backButton: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  backText: { color: "#1DB954", fontSize: 14, fontWeight: "bold" },
  item: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  artist: { color: "#888", fontSize: 14 },
  folderBtn: { paddingHorizontal: 10 },
  deleteText: { color: "#ff4444", fontWeight: "bold", marginLeft: 4 },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  iconBtn: {
    backgroundColor: "#1E1E1E",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#444",
  },
  iconBtnText: { color: "#fff", fontSize: 18 },
});
