import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal, // Imported Modal for the settings UI
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  deleteSong,
  getApiKey,
  getSavedSongs,
  saveApiKey,
  saveSong,
} from "../utils/storage";

export default function LibraryScreen() {
  const [savedSongs, setSavedSongs] = useState<
    Array<{ title: string; artist: string; lyrics: string; romaji?: string }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // New States for API Key management
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");

  const router = useRouter();

  const loadSongs = async () => {
    const songs = await getSavedSongs();
    setSavedSongs(songs);
  };

  // Fetch the existing API key when modal opens
  const openApiKeySettings = async () => {
    setDropdownVisible(false);
    const savedKey = await getApiKey();
    setApiKeyInput(savedKey || "");
    setApiKeyModalVisible(true);
  };

  const handleSaveApiKey = async () => {
    const trimmedKey = apiKeyInput.trim();
    const success = await saveApiKey(trimmedKey);
    if (success) {
      Alert.alert(
        "Success",
        trimmedKey ? "API Key updated!" : "API Key cleared.",
      );
      setApiKeyModalVisible(false);
    } else {
      Alert.alert("Error", "Failed to save the API key.");
    }
  };

  useEffect(() => {
    loadSongs();
  }, []);

  const filteredSongs = savedSongs.filter((song) => {
    const query = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query)
    );
  });

  const confirmDelete = (title: any, artist: any) => {
    Alert.alert("Delete Song", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = await deleteSong(title, artist);
          setSavedSongs(updated);
        },
      },
    ]);
  };

  const handleExport = async () => {
    try {
      const allSongs = await getSavedSongs();
      if (allSongs.length === 0) {
        alert("No songs to export!");
        return;
      }

      const timestamp = new Date().getTime();
      const fileUri =
        FileSystem.documentDirectory + `lyrics_backup_${timestamp}.json`;
      const jsonString = JSON.stringify(allSongs);

      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        alert("Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("Export Error:", error);
      alert("An error occurred during export.");
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const selectedFileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(selectedFileUri);
      const songsToImport = JSON.parse(fileContent);

      for (const song of songsToImport) {
        await saveSong(song);
      }

      await loadSongs();
      alert(`Successfully imported ${songsToImport.length} songs!`);
    } catch (error) {
      console.error("Import Error:", error);
      alert("Failed to import. Please ensure the file is a valid JSON backup.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Navigation & Options Header Row */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View>
          <TouchableOpacity
            onPress={() => setDropdownVisible((v) => !v)}
            style={styles.backupToggleBtn}
          >
            <Text style={styles.backupToggleText}>Options ▾</Text>
          </TouchableOpacity>

          {dropdownVisible && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                onPress={openApiKeySettings}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownText}>🔑 Gemini API Key</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                onPress={() => {
                  setDropdownVisible(false);
                  handleExport();
                }}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownText}>⬆ Export backup</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                onPress={() => {
                  setDropdownVisible(false);
                  handleImport();
                }}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownText}>⬇ Import backup</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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

      <FlatList
        data={filteredSongs}
        keyExtractor={(item) => item.title + item.artist}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery
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
                  },
                })
              }
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.artist}>{item.artist}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmDelete(item.title, item.artist)}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* --- API KEY MANAGEMENT MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={apiKeyModalVisible}
        onRequestClose={() => setApiKeyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Gemini API Key Settings</Text>
            <Text style={styles.modalSubtext}>
              Insert your personal Gemini API key here. Leave it blank and save
              to delete/remove it.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Paste your AIzaSy... key here"
              placeholderTextColor="#555"
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              secureTextEntry={true} // Obscures key text for privacy
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setApiKeyModalVisible(false)}
                style={[styles.modalBtn, styles.modalCancelBtn]}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveApiKey}
                style={[styles.modalBtn, styles.modalSaveBtn]}
              >
                <Text style={styles.modalSaveBtnText}>Save Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: "#333",
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  backButton: {
    backgroundColor: "#0F0F0F",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: "flex-end",
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
  deleteText: { color: "#ff4444", fontWeight: "bold", marginLeft: 10 },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backupToggleBtn: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#444",
  },
  backupToggleText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownMenu: {
    position: "absolute",
    right: 0,
    top: 40,
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#333",
    minWidth: 170,
    zIndex: 999,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    color: "#fff",
    fontSize: 14,
  },
  dropdownDivider: {
    height: 0.5,
    backgroundColor: "#333",
    marginHorizontal: 12,
  },

  // --- New Styling for the Settings Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    borderWidth: 0.5,
    borderColor: "#333",
  },
  modalHeader: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalSubtext: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "#101010",
    color: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: {
    backgroundColor: "transparent",
  },
  modalCancelBtnText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    backgroundColor: "#1DB954",
  },
  modalSaveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
