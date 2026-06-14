import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { saveSongsToDevice, shareSongs } from "../utils/backup";
import { getFolders, getSavedSongs } from "../utils/storage";

type SavedSong = {
  title: string;
  artist: string;
  lyrics: string;
  romaji?: string;
  syncedLyrics?: string | null;
  duration?: number;
  folders?: string[];
};

// Stable identity for a saved song. Matches the key scheme used in library.tsx
// and the title+artist dedupe in saveSong.
const songKey = (s: { title: string; artist: string }) => s.title + s.artist;

export default function ExportSelectScreen() {
  const router = useRouter();

  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Active folder filter; null = All. Filtering only narrows the visible list —
  // it does not clear the selection, which persists across folder switches.
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  // Set of songKey() values that are checked. Empty by default — the user picks
  // what to export.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Which action is in flight, if any — disables both buttons and labels the
  // active one ("Sharing…" / "Saving…").
  const [busy, setBusy] = useState<null | "share" | "save">(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [saved, fldrs] = await Promise.all([getSavedSongs(), getFolders()]);
      if (!cancelled) {
        setSongs(saved);
        setFolders(fldrs);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSongs = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return songs.filter((song) => {
      const matchesQuery =
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query);
      const matchesFolder =
        activeFolder === null ||
        (Array.isArray(song.folders) && song.folders.includes(activeFolder));
      return matchesQuery && matchesFolder;
    });
  }, [songs, searchQuery, activeFolder]);

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

  // Map a failed export result to a user-facing alert. "permission" means the
  // user dismissed the Android folder picker, which is not an error — stay quiet.
  const reportFailure = (stage?: string) => {
    if (stage === "permission") return;
    if (stage === "unavailable") {
      Alert.alert("Unavailable", "Sharing is not available on this device.");
    } else if (stage === "write") {
      Alert.alert(
        "Export failed",
        "Could not write the backup file. Check device storage.",
      );
    } else {
      Alert.alert("Export failed", "Could not open the share sheet.");
    }
  };

  const runExport = async (
    action: "share" | "save",
    fn: (songs: SavedSong[]) => Promise<{ ok: boolean; stage?: string }>,
  ) => {
    if (selected.size === 0 || busy) return;
    const chosen = songs.filter((s) => selected.has(songKey(s)));
    setBusy(action);
    try {
      const result = await fn(chosen);
      if (result.ok) {
        if (action === "save") {
          Alert.alert("Saved", "Your backup has been saved.");
        }
        router.back();
        return;
      }
      reportFailure(result.stage);
    } finally {
      setBusy(null);
    }
  };

  const handleShare = () => runExport("share", shareSongs);
  const handleSave = () => runExport("save", saveSongsToDevice);

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

          {folders.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsRow}
              contentContainerStyle={styles.chipsContent}
            >
              <TouchableOpacity
                onPress={() => setActiveFolder(null)}
                style={[styles.chip, activeFolder === null && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    activeFolder === null && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {folders.map((name) => {
                const active = activeFolder === name;
                return (
                  <TouchableOpacity
                    key={name}
                    onPress={() => setActiveFolder(name)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

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
            <Text style={styles.footerCount}>
              {selected.size} song{selected.size === 1 ? "" : "s"} selected
            </Text>
            <View style={styles.footerButtons}>
              <TouchableOpacity
                onPress={handleShare}
                disabled={selected.size === 0 || busy !== null}
                style={[
                  styles.actionBtn,
                  styles.shareBtn,
                  (selected.size === 0 || busy !== null) && styles.actionBtnDisabled,
                ]}
              >
                <Text style={styles.shareBtnText}>
                  {busy === "share" ? "Sharing…" : "Share"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={selected.size === 0 || busy !== null}
                style={[
                  styles.actionBtn,
                  styles.saveBtn,
                  { marginLeft: 12 },
                  (selected.size === 0 || busy !== null) && styles.actionBtnDisabled,
                ]}
              >
                <Text style={styles.saveBtnText}>
                  {busy === "save" ? "Saving…" : "Save to device"}
                </Text>
              </TouchableOpacity>
            </View>
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

  chipsRow: { marginBottom: 14, flexGrow: 0 },
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
  footerCount: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  footerButtons: { flexDirection: "row" },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: { opacity: 0.5 },
  shareBtn: { backgroundColor: "#1DB954" },
  shareBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  saveBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1DB954",
  },
  saveBtnText: { color: "#1DB954", fontSize: 16, fontWeight: "bold" },
});
