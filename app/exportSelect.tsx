import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { exportSongs } from "../utils/backup";
import { getSavedSongs } from "../utils/storage";

type SavedSong = {
  title: string;
  artist: string;
  lyrics: string;
  romaji?: string;
  syncedLyrics?: string | null;
  duration?: number;
};

// Stable identity for a saved song. Matches the key scheme used in library.tsx
// and the title+artist dedupe in saveSong.
const songKey = (s: { title: string; artist: string }) => s.title + s.artist;

export default function ExportSelectScreen() {
  const router = useRouter();

  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Set of songKey() values that are checked. Empty by default — the user picks
  // what to export.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getSavedSongs();
      if (!cancelled) setSongs(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSongs = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query),
    );
  }, [songs, searchQuery]);

  // The Select-all toggle acts on the currently filtered list: it selects every
  // filtered song unless they are all already selected, in which case it clears
  // them.
  const filteredKeys = useMemo(
    () => filteredSongs.map(songKey),
    [filteredSongs],
  );
  const allFilteredSelected =
    filteredKeys.length > 0 && filteredKeys.every((k) => selected.has(k));

  const toggleSong = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredKeys.forEach((k) => next.delete(k));
      } else {
        filteredKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const handleExport = async () => {
    if (selected.size === 0 || exporting) return;
    const chosen = songs.filter((s) => selected.has(songKey(s)));
    setExporting(true);
    try {
      const result = await exportSongs(chosen);
      if (result.ok) {
        router.back();
        return;
      }
      if (result.stage === "unavailable") {
        Alert.alert("Unavailable", "Sharing is not available on this device.");
      } else if (result.stage === "write") {
        Alert.alert(
          "Export failed",
          "Could not write the backup file. Check device storage.",
        );
      } else {
        Alert.alert("Export failed", "Could not open the share sheet.");
      }
    } finally {
      setExporting(false);
    }
  };

  const isEmpty = songs.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Export</Text>
        <View style={{ width: 60 }} />
      </View>

      {isEmpty ? (
        <Text style={styles.emptyText}>Your library is empty.</Text>
      ) : (
        <>
          <View style={styles.controlsRow}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search by title or artist..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            <TouchableOpacity
              onPress={toggleSelectAll}
              style={styles.selectAllBtn}
              disabled={filteredKeys.length === 0}
            >
              <Text style={styles.selectAllText}>
                {allFilteredSelected ? "Clear" : "Select all"}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredSongs}
            keyExtractor={songKey}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No matching songs found.</Text>
            }
            renderItem={({ item }) => {
              const key = songKey(item);
              const checked = selected.has(key);
              return (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => toggleSong(key)}
                >
                  <View
                    style={[styles.checkbox, checked && styles.checkboxChecked]}
                  >
                    {checked && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.artist}>{item.artist}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleExport}
              disabled={selected.size === 0 || exporting}
              style={[
                styles.exportBtn,
                (selected.size === 0 || exporting) && styles.exportBtnDisabled,
              ]}
            >
              <Text style={styles.exportBtnText}>
                {exporting
                  ? "Exporting…"
                  : `Export ${selected.size} song${selected.size === 1 ? "" : "s"}`}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  backText: { color: "#1DB954", fontSize: 14, fontWeight: "bold" },
  pageTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  controlsRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  searchBar: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: "#333",
  },
  selectAllBtn: {
    marginLeft: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  selectAllText: { color: "#1DB954", fontSize: 13, fontWeight: "700" },

  item: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  checkboxChecked: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  title: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  artist: { color: "#888", fontSize: 14 },

  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },

  footer: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 30,
  },
  exportBtn: {
    backgroundColor: "#1DB954",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  exportBtnDisabled: { backgroundColor: "#1E1E1E", opacity: 0.6 },
  exportBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
