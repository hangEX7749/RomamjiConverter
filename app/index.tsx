import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { searchTracks } from "../services/lyricsApi";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    {
      id: string | number;
      trackName: string;
      artistName: string;
      plainLyrics: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setPage(1); // Reset to page 1

    const data = await searchTracks(query, 1);
    setResults(data);
    setHasMore(data.length === 10); // Check if there are more results
    setLoading(false);
  };

  // Load next page
  const handleLoadMore = async () => {
    if (loadingMore || results.length === 0 || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    const newData = await searchTracks(query, nextPage);

    if (newData.length > 0) {
      setResults([...results, ...newData]); // Add new songs to the existing list
      setPage(nextPage);

      setHasMore(newData.length === 10);
    } else {
      setHasMore(false); // No more results
    }
    setLoadingMore(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.push("./library")}
        style={{ alignSelf: "flex-end", marginBottom: 10 }}
      >
        <Text style={{ color: "#1DB954", fontWeight: "bold" }}>
          📚 View Library
        </Text>
      </TouchableOpacity>

      <Text style={styles.header}>Song Search</Text>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Search song or artist..."
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
                  },
                })
              }
            >
              <Text style={styles.trackName}>{item.trackName}</Text>
              <Text style={styles.artistName}>{item.artistName}</Text>
            </TouchableOpacity>
          )}
          // --- Pagination UI ---
          ListFooterComponent={() =>
            /* Only show button if there are results AND hasMore is true */
            results.length > 0 && hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More Results</Text>
                )}
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
  header: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 },
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

  // Pagination Styles
  loadMoreButton: {
    padding: 15,
    backgroundColor: "#333",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  loadMoreText: { color: "#fff", fontWeight: "600" },
  endMessage: {
    padding: 20,
    alignItems: "center",
  },
  endText: {
    color: "#555",
    fontSize: 14,
    fontStyle: "italic",
  },
});
