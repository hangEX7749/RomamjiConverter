import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import RomajiFyLogo from "../components/RomajiFyLogo";
import { searchTracks } from "../services/lyricsApi";
import { getApiKey } from "../utils/storage";

type TrackResult = {
  romanizedLyrics: null;
  id: string | number;
  trackName: string;
  artistName: string;
  plainLyrics: string;
};

const PAGE_SIZE = 10;

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  // Full result set from LRCLIB; we paginate this locally because the API
  // doesn't support limit/offset — it always returns every match in one shot.
  const [allResults, setAllResults] = useState<TrackResult[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  const router = useRouter();

  // Re-check the key whenever the screen regains focus, so the banner clears
  // immediately after the user saves a key in Settings.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const key = await getApiKey();
        if (!cancelled) setIsApiKeyMissing(!key);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleSearch = async () => {
    if (!query) return;

    if (isApiKeyMissing) {
      Alert.alert(
        "API Key Required",
        "Please add your Gemini API key in Settings to convert Japanese lyrics to Romaji.",
        [{ text: "OK" }],
      );
    }

    setLoading(true);
    const data = await searchTracks(query);
    setAllResults(data);
    setVisibleCount(PAGE_SIZE);
    setLoading(false);
  };

  const handleLoadMore = () => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, allResults.length));
  };

  const goToSettings = () => router.push("/settings");

  const results = allResults.slice(0, visibleCount);
  const hasMore = visibleCount < allResults.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.logoContainer}>
          <RomajiFyLogo width={160} height={48} />
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity
            onPress={() => router.push("./library")}
            style={styles.libraryButton}
          >
            <Text style={styles.libraryText}>📚 Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToSettings}
            style={styles.iconBtn}
            accessibilityLabel="Settings"
          >
            <Text style={styles.iconBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isApiKeyMissing && (
        <TouchableOpacity style={styles.warningBanner} onPress={goToSettings}>
          <Text style={styles.warningText}>
            ⚠️ Gemini API Key missing. Tap to open Settings.
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Search for songs..."
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1DB954" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => item.id.toString() + index}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() =>
                router.push({
                  pathname: "/lyric",
                  params: {
                    artist: item.artistName,
                    title: item.trackName,
                    lyrics: item.plainLyrics,
                    preComputedRomaji: item.romanizedLyrics || null,
                  },
                })
              }
            >
              <Text style={styles.trackName}>{item.trackName}</Text>
              <Text style={styles.artistName}>{item.artistName}</Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={() =>
            results.length > 0 && hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
              >
                <Text style={styles.loadMoreText}>Load More Results</Text>
              </TouchableOpacity>
            ) : results.length > 0 && !hasMore ? (
              <View style={styles.endMessage}>
                <Text style={styles.endText}>No more results found</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  logoContainer: {
    justifyContent: "center",
    marginLeft: -15,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  libraryButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  libraryText: {
    color: "#1DB954",
    fontWeight: "bold",
    fontSize: 14,
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
  searchBox: { flexDirection: "row", gap: 10, marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#1DB954",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  resultItem: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  trackName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  artistName: { color: "#888", fontSize: 14 },

  loadMoreButton: {
    padding: 15,
    backgroundColor: "#333",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  loadMoreText: { color: "#fff", fontWeight: "600" },
  endMessage: { padding: 20, alignItems: "center" },
  endText: { color: "#555", fontSize: 14, fontStyle: "italic" },

  warningBanner: {
    backgroundColor: "#5c4300",
    borderWidth: 1,
    borderColor: "#e0a300",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  warningText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
