import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { searchTracks } from "../services/lyricsApi";
import { getApiKey, saveApiKey } from "../utils/storage";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    {
      romanizedLyrics: null;
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

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");

  // 1. Add state to track if API key is missing
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  const router = useRouter();

  // 2. Separate function to check API key status
  const checkApiKeyStatus = async () => {
    const key = await getApiKey();
    if (!key) {
      setIsApiKeyMissing(true);
    } else {
      setIsApiKeyMissing(false);
    }
  };

  // 3. Check key status on mount
  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const handleSearch = async () => {
    if (!query) return;

    // 4. Warn user before wasting network requests if key is missing
    if (isApiKeyMissing) {
      Alert.alert(
        "API Key Required",
        "Please configure your Gemini API Key in 'Options' to turn Japanese lyrics into Romaji.",
        [{ text: "OK" }],
      );
    }

    setLoading(true);
    setPage(1);

    const data = await searchTracks(query, 1);
    setResults(data);
    setHasMore(data.length === 10);
    setLoading(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || results.length === 0 || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    const newData = await searchTracks(query, nextPage);

    if (newData.length > 0) {
      setResults([...results, ...newData]);
      setPage(nextPage);
      setHasMore(newData.length === 10);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

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
      checkApiKeyStatus(); // 5. Refresh status immediately after updating
    } else {
      Alert.alert("Error", "Failed to save the API key.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.push("./library")}>
          <Text style={styles.libraryText}>📚 View Library</Text>
        </TouchableOpacity>

        <View>
          <TouchableOpacity
            onPress={() => setDropdownVisible((v) => !v)}
            style={styles.optionsToggleBtn}
          >
            <Text style={styles.optionsToggleText}>Options ▾</Text>
          </TouchableOpacity>

          {dropdownVisible && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                onPress={openApiKeySettings}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownText}>🔑 Gemini API Key</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* 6. Visual Warning banner if API key is missing */}
      {isApiKeyMissing && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={openApiKeySettings}
        >
          <Text style={styles.warningText}>
            ⚠️ Gemini API Key missing. Tap here to set it up.
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.header}>Song Search</Text>

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
              secureTextEntry={true}
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

  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  libraryText: { color: "#1DB954", fontWeight: "bold" },
  optionsToggleBtn: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#444",
  },
  optionsToggleText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  dropdownMenu: {
    position: "absolute",
    right: 0,
    top: 35,
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#333",
    minWidth: 160,
    zIndex: 999,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  dropdownItem: { padding: 12 },
  dropdownText: { color: "#fff", fontSize: 14 },

  // --- New Styling for the Warning Banner ---
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
  modalCancelBtn: { backgroundColor: "transparent" },
  modalCancelBtnText: { color: "#aaa", fontSize: 14, fontWeight: "600" },
  modalSaveBtn: { backgroundColor: "#1DB954" },
  modalSaveBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});
