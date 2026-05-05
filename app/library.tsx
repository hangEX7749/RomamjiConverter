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

export default function LibraryScreen() {
  const [savedSongs, setSavedSongs] = useState<
    Array<{ title: string; artist: string; lyrics: string }>
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

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
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
                  pathname: "/lyric",
                  params: {
                    artist: item.artist,
                    title: item.title,
                    lyrics: item.lyrics,
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
});
