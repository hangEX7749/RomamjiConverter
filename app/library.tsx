import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { deleteSong, getSavedSongs } from "../utils/storage";

type SavedSong = {
  title: string;
  artist: string;
  lyrics: string;
  romaji?: string;
};

export default function LibraryScreen() {
  const [savedSongs, setSavedSongs] = useState<SavedSong[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  const loadSongs = useCallback(async () => {
    const songs = await getSavedSongs();
    setSavedSongs(songs);
  }, []);

  // Reload on focus so imports made in Settings show up immediately when the
  // user returns to the library.
  useFocusEffect(
    useCallback(() => {
      loadSongs();
    }, [loadSongs]),
  );

  const filteredSongs = savedSongs.filter((song) => {
    const query = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query)
    );
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

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
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
  deleteText: { color: "#ff4444", fontWeight: "bold", marginLeft: 10 },
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
