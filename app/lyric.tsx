import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import SyncedLyricsPlayer from "../components/SyncedLyricsPlayer";
import { useLyricFont } from "../hooks/use-lyric-font";
import { convertToRomaji } from "../utils/romaji";
import { saveSong } from "../utils/storage";
import { alignRomajiWithTimestamps } from "../utils/syncLyrics";

export default function LyricsScreen() {
  const { artist, title, lyrics, preComputedRomaji, syncedLyrics, duration, startTime, isFromMic } = useLocalSearchParams();
  const router = useRouter();
  const lyricFont = useLyricFont();

  // State to manage which version to show
  const [displayedLyrics, setDisplayedLyrics] = useState(lyrics);
  const [romajiCache, setRomajiCache] = useState(preComputedRomaji || null);
  const [isRomajiActive, setIsRomajiActive] = useState(false);
  const [converting, setConverting] = useState(false);

  const cleanSyncedLyrics = syncedLyrics && syncedLyrics !== "null" ? (syncedLyrics as string) : null;
  const parsedDuration = duration ? Number(duration) : undefined;
  const parsedStartTime = startTime ? Number(startTime) : 0;

  const alignedSyncedLyrics = useMemo(() => {
    if (isRomajiActive && romajiCache && cleanSyncedLyrics) {
      return alignRomajiWithTimestamps(romajiCache as string, cleanSyncedLyrics);
    }
    return cleanSyncedLyrics;
  }, [isRomajiActive, romajiCache, cleanSyncedLyrics]);

  // Automatically trigger conversion to Romaji on mount if identified via mic
  useEffect(() => {
    if (preComputedRomaji) {
      setDisplayedLyrics(preComputedRomaji);
      setIsRomajiActive(true);
      return;
    }

    if (isFromMic === "true") {
      const autoTranslate = async () => {
        if (!lyrics || lyrics === "No lyrics found.") return;
        setConverting(true);
        try {
          const result = await convertToRomaji(lyrics as string);
          if (result && result.trim().length > 0) {
            setRomajiCache(result);
            setDisplayedLyrics(result);
            setIsRomajiActive(true);
          }
        } catch {
          // Auto-translation failed silently
        } finally {
          setConverting(false);
        }
      };

      autoTranslate();
    }
  }, [lyrics, preComputedRomaji, isFromMic]);

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
    }

    Alert.alert(
      "Convert Lyrics",
      "Would you like to convert these lyrics to Romaji?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Convert",
          onPress: async () => {
            // EVERYTHING that should happen after clicking "Convert" goes here
            setConverting(true);
            try {
              const result = await convertToRomaji(lyrics);
              if (result && result.trim().length > 0) {
                setRomajiCache(result);
                setDisplayedLyrics(result);
                setIsRomajiActive(true);
              } else {
                alert("Could not convert lyrics at this time.");
              }
            } catch (error) {
              alert("An error occurred during conversion.");
            } finally {
              setConverting(false);
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    // We construct the object to include both original and converted lyrics
    const songToSave = {
      artist,
      title,
      lyrics, // Always save the original
      romaji: romajiCache, // This will be null if never converted, or the string if it was
      syncedLyrics: cleanSyncedLyrics,
      duration: parsedDuration,
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

        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>💾 Save Song</Text>
        </TouchableOpacity>

        {/* Romaji Toggle Button */}
        <TouchableOpacity
          onPress={handleToggleRomaji}
          style={[styles.romajiBtn, isRomajiActive && styles.romajiBtnActive]}
          disabled={converting}
        >
          {converting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.romajiBtnText}>
              {isRomajiActive ? "Show Original" : "Convert to Romaji"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <SyncedLyricsPlayer
        title={title as string}
        artist={artist as string}
        lyrics={displayedLyrics as string}
        syncedLyrics={alignedSyncedLyrics}
        duration={parsedDuration}
        lyricStyle={lyricFont}
        autoScroll={lyricFont.autoScroll}
        initialTime={parsedStartTime}
      />
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
