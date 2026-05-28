import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLyricFont } from "../hooks/use-lyric-font";
import { saveSong } from "../utils/storage";

export default function SavedLyricsScreen() {
  const { artist, title, lyrics, preComputedRomaji } = useLocalSearchParams();
  const router = useRouter();
  const lyricFont = useLyricFont();

  // State to manage which version to show
  const [displayedLyrics, setDisplayedLyrics] = useState(lyrics);
  const [romajiCache, setRomajiCache] = useState(preComputedRomaji || null);
  const [isRomajiActive, setIsRomajiActive] = useState(false);
  const [converting, setConverting] = useState(false);

  const handleToggleRomaji = async () => {
    // If we are currently showing Romaji, switch back to original
    if (isRomajiActive) {
      setDisplayedLyrics(lyrics);
      setIsRomajiActive(false);
      return;
    }

    // If we already converted it before, just use the cache
    if (romajiCache) {
      setDisplayedLyrics(romajiCache);
      setIsRomajiActive(true);
      return;
    } else {
      alert("Could not convert lyrics at this time.");
    }
  };

  const handleSave = async () => {
    // We construct the object to include both original and converted lyrics
    const songToSave = {
      artist,
      title,
      lyrics, // Always save the original
      romaji: romajiCache, // This will be null if never converted, or the string if it was
      isFavorite: true,
    };

    const result = await saveSong(songToSave);

    if (result === "saved") {
      alert("Song saved! You can view the Romaji in your library.");
    } else if (result === "exists") {
      alert("This song is already in your library.");
    }
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

        {romajiCache && (
          <TouchableOpacity
            onPress={handleToggleRomaji}
            style={[styles.romajiBtn, isRomajiActive && styles.romajiBtnActive]}
          >
            <Text style={styles.romajiBtnText}>
              {isRomajiActive ? "Show Original" : "Show Romaji"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.artist}>{artist}</Text>

      <ScrollView
        style={styles.lyricsContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lyricsText, lyricFont]}>
          {displayedLyrics || "No lyrics available for this track."}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  backText: { color: "#1DB954", fontSize: 14, fontWeight: "bold" },

  romajiBtn: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1DB954",
  },
  romajiBtnActive: {
    backgroundColor: "#1DB954",
  },
  romajiBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },

  title: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  artist: { color: "#888", fontSize: 18, marginBottom: 20 },
  lyricsContainer: { flex: 1 },
  lyricsText: {
    color: "#E0E0E0",
    fontSize: 18,
    lineHeight: 30,
    paddingBottom: 50,
  },
  saveBtn: {
    backgroundColor: "#1DB954",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});
