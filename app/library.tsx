import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { deleteSong, getSavedSongs } from "../utils/storage";

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getAllSongs, saveSong } from "../utils/storage";
export default function LibraryScreen() {
  const [savedSongs, setSavedSongs] = useState<
    Array<{ title: string; artist: string; lyrics: string; romaji?: string }>
  >([]);
  const router = useRouter();

  const loadSongs = async () => {
    const songs = await getSavedSongs();
    setSavedSongs(songs);
  };

  useEffect(() => {
    loadSongs();
  }, []);

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
      const allSongs = await getAllSongs(); // Function from your utils
      if (allSongs.length === 0) {
        alert("No songs to export!");
        return;
      }

      //Current timrstamp for unique file naming
      const timestamp = new Date().getTime();

      // Define the file path
      const fileUri =
        FileSystem.documentDirectory + `lyrics_backup_${timestamp}.json`;
      const jsonString = JSON.stringify(allSongs);

      // Write the file
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      // Share the file
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

      await loadSongs(); // ← refresh the list after import

      alert(`Successfully imported ${songsToImport.length} songs!`);
    } catch (error) {
      console.error("Import Error:", error);
      alert("Failed to import. Please ensure the file is a valid JSON backup.");
    }
  };

  const [dropdownVisible, setDropdownVisible] = useState(false);

  return (
    <View style={styles.container}>
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
            <Text style={styles.backupToggleText}>Backup ▾</Text>
          </TouchableOpacity>

          {dropdownVisible && (
            <View style={styles.dropdownMenu}>
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

      <FlatList
        data={savedSongs}
        keyExtractor={(item) => item.title + item.artist}
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
                    // Pass the saved romaji back so you don't have to convert it again!
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
  backupRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 20,
  },
  secondaryBtn: {
    backgroundColor: "#1E1E1E",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  btnText: { color: "#fff", fontSize: 12 },
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
    minWidth: 160,
    zIndex: 999,
    elevation: 8, // Android shadow
    shadowColor: "#000", // iOS shadow
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
});
