import { Ionicons } from "@expo/vector-icons";
import { getRecordingPermissionsAsync, RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import RomajiFyLogo from "../components/RomajiFyLogo";
import { searchTracks } from "../services/lyricsApi";
import { recognizeMusic } from "../services/shazamApi";
import { getApiKey, getRapidApiKey, getRecordingDuration } from "../utils/storage";

type TrackResult = {
  romanizedLyrics: null;
  id: string | number;
  trackName: string;
  artistName: string;
  plainLyrics: string;
  syncedLyrics?: string | null;
  duration?: number;
};

const PAGE_SIZE = 10;

const cleanText = (text: string | null | undefined): string => {
  if (!text) return "";
  let cleaned = text.toLowerCase();

  // Try removing parentheses and brackets
  const noParentheses = cleaned
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s+/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~]/g, "");

  if (noParentheses.length > 0) {
    return noParentheses;
  }

  // Fallback to just removing punctuation and spaces if the string became empty
  return cleaned
    .replace(/\s+/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~]/g, "");
};

const isMostlyMatched = (
  item: any,
  target: { title: string | null; artist: string | null; duration: number | null }
): boolean => {
  if (target.duration && item.duration) {
    const durationDiff = Math.abs(item.duration - target.duration);
    if (durationDiff > 15) return false;
  }

  const cleanedItemTitle = cleanText(item.trackName || item.name);
  const cleanedTargetTitle = cleanText(target.title);

  const cleanedItemArtist = cleanText(item.artistName);
  const cleanedTargetArtist = cleanText(target.artist);

  // Check if titles are highly similar (one contains the other)
  const titleMatches =
    cleanedItemTitle.includes(cleanedTargetTitle) ||
    cleanedTargetTitle.includes(cleanedItemTitle);

  // Check if artists are highly similar (one contains the other)
  const artistMatches =
    cleanedItemArtist.includes(cleanedTargetArtist) ||
    cleanedTargetArtist.includes(cleanedItemArtist);

  return titleMatches && artistMatches;
};

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  // Full result set from LRCLIB; we paginate this locally because the API
  // doesn't support limit/offset — it always returns every match in one shot.
  const [allResults, setAllResults] = useState<TrackResult[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  // Music recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(3);
  const [recognitionResult, setRecognitionResult] = useState<{
    title: string;
    artist: string;
    offset: number | null;
    timeskew: number | null;
  } | null>(null);

  const timerRef = useRef<any>(null);
  const activeRecordingDurationRef = useRef(7);
  const router = useRouter();

  // Initialize recorder
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

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

  // Cleanup timers and recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recorder && recorder.isRecording) {
        recorder.stop().catch(() => {});
      }
    };
  }, [recorder]);

  const startRecording = async () => {
    const rapidKey = await getRapidApiKey();
    if (!rapidKey || rapidKey.trim() === "") {
      Alert.alert(
        "Shazam Key Required",
        "Please add your Shazam RapidAPI key in Settings to recognize songs.\n\n (look for the 'x-rapidapi-key' field).",
        [
          {
            text: "Get Free Key",
            onPress: async () => {
              const url =
                "https://rapidapi.com/diyorbekkanal/api/shazam-api-free/playground/apiendpoint_4349b50d-a267-47c7-823e-49b8e8680883";
              const canOpen = await Linking.canOpenURL(url);
              if (!canOpen) {
                Alert.alert("Error", "Unable to open RapidAPI in a browser.");
                return;
              }
              await Linking.openURL(url);
            },
          },
          { text: "Go to Settings", onPress: goToSettings },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    try {
      const permission = await getRecordingPermissionsAsync();
      let granted = permission.granted;
      if (!granted) {
        const req = await requestRecordingPermissionsAsync();
        granted = req.granted;
      }
      if (!granted) {
        Alert.alert("Permission Denied", "Microphone access is required to recognize songs.");
        return;
      }

      const duration = await getRecordingDuration();
      activeRecordingDurationRef.current = duration;

      setRecognitionResult(null);
      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
      setRecordingTimeLeft(duration);

      const countdownInterval = setInterval(() => {
        setRecordingTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Stop recording when dynamic duration is up
            setTimeout(() => {
              stopRecordingAndIdentify();
            }, 50);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timerRef.current = countdownInterval;
    } catch {
      Alert.alert("Error", "Could not start audio recording.");
    }
  };

  const stopRecordingAndIdentify = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setIsIdentifying(true);
    let audioUri: string | null = null;

    try {
      await recorder.stop();
      audioUri = recorder.uri;

      if (!audioUri) {
        throw new Error("No recording file found.");
      }

      const recordingStoppedTime = Date.now();

      // Perform music recognition using the custom fetch shazamApi
      const response = await recognizeMusic(audioUri);

      if (response && response.found && response.title && response.artist) {
        setRecognitionResult({
          title: response.title,
          artist: response.artist,
          offset: response.offset,
          timeskew: response.timeskew,
        });

        // Fill search bar with track name and artist name
        const displayQuery = `${response.title} ${response.artist}`;
        setQuery(displayQuery);
        const searchQuery = displayQuery;

        // Perform auto background search on LRCLIB
        setLoading(true);
        let data: TrackResult[] = [];

        const searchData = await searchTracks(searchQuery);

        const target = {
          title: response.title,
          artist: response.artist,
          duration: response.duration,
        };

        // Find if there is a match in search results that is highly similar (mostly matched)
        const bestMatch = searchData.find((item: any) => isMostlyMatched(item, target));

        if (bestMatch) {
          // Map the best match to the top of the array
          const mappedBest: TrackResult = {
            id: bestMatch.id,
            trackName: bestMatch.trackName || bestMatch.name || response.title,
            artistName: bestMatch.artistName || response.artist,
            plainLyrics: bestMatch.plainLyrics || "",
            syncedLyrics: bestMatch.syncedLyrics || null,
            duration: bestMatch.duration || response.duration || 0,
            romanizedLyrics: null,
          };

          // Map the remaining results
          const mappedOthers = searchData
            .filter((item: any) => item.id !== bestMatch.id)
            .map((item: any) => ({
              id: item.id,
              trackName: item.trackName || item.name || response.title,
              artistName: item.artistName || response.artist,
              plainLyrics: item.plainLyrics || "",
              syncedLyrics: item.syncedLyrics || null,
              duration: item.duration || 0,
              romanizedLyrics: null,
            }));

          data = [mappedBest, ...mappedOthers];
        } else {
          data = searchData.map((item: any) => ({
            id: item.id,
            trackName: item.trackName || item.name || response.title,
            artistName: item.artistName || response.artist,
            plainLyrics: item.plainLyrics || "",
            syncedLyrics: item.syncedLyrics || null,
            duration: item.duration || 0,
            romanizedLyrics: null,
          }));
        }

        setAllResults(data);
        setVisibleCount(PAGE_SIZE);
        setLoading(false);

        if (data && data.length > 0) {
          // Navigate immediately to the first result
          // Add the 3s recording duration plus the dynamic network latency to the offset.
          const topMatch = data[0];
          const networkDelay = (Date.now() - recordingStoppedTime) / 1000;
          const adjustedStartTime = (response.offset || 0) + networkDelay + activeRecordingDurationRef.current;

          router.push({
            pathname: "/lyric",
            params: {
              artist: topMatch.artistName,
              title: topMatch.trackName,
              lyrics: topMatch.plainLyrics,
              syncedLyrics: topMatch.syncedLyrics || null,
              duration: topMatch.duration || 0,
              preComputedRomaji: topMatch.romanizedLyrics || null,
              startTime: adjustedStartTime,
              isFromMic: "true",
            },
          });
        } else {
          const networkDelay = (Date.now() - recordingStoppedTime) / 1000;
          const totalDelay = networkDelay + activeRecordingDurationRef.current;
          Alert.alert(
            "Song Identified",
            `Found: "${response.title}" by ${response.artist}\nOffset: ${response.offset ? response.offset.toFixed(2) : "0"}s (+${totalDelay.toFixed(1)}s delay applied)\nTimeskew: ${response.timeskew ? response.timeskew.toFixed(5) : "0"}\n\nCould not find matching lyrics in the database.`,
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert("Identification Failed", "Could not recognize this song. Please try again.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "An error occurred during song recognition.");
    } finally {
      setLoading(false);
      setIsIdentifying(false);
      if (audioUri) {
        FileSystem.deleteAsync(audioUri, { idempotent: true }).catch(() => {});
      }
    }
  };

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

        <TouchableOpacity
          style={[
            styles.micButton,
            isRecording && styles.micButtonActive,
            isIdentifying && styles.micButtonDisabled,
          ]}
          onPress={isRecording ? stopRecordingAndIdentify : startRecording}
          disabled={isIdentifying}
          accessibilityLabel="Record audio for recognition"
        >
          {isIdentifying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name={isRecording ? "stop" : "mic"} size={20} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {isRecording && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>
            🔴 Listening for music... ({recordingTimeLeft}s)
          </Text>
        </View>
      )}

      {isIdentifying && (
        <View style={[styles.statusBanner, styles.statusBannerIdentifying]}>
          <ActivityIndicator size="small" color="#1DB954" style={{ marginRight: 8 }} />
          <Text style={styles.statusText}>
            🔍 Recognizing song via Shazam...
          </Text>
        </View>
      )}

      {recognitionResult && (
        <View style={styles.resultBanner}>
          <View style={styles.resultBannerHeader}>
            <Text style={styles.resultBannerTitle}>🎵 Last Recognized Song</Text>
            <TouchableOpacity onPress={() => setRecognitionResult(null)}>
              <Text style={{ color: "#aaa", fontSize: 12 }}>Clear</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.resultText}>
            <Text style={{ fontWeight: "bold", color: "#fff" }}>{recognitionResult.title}</Text> by {recognitionResult.artist}
          </Text>
          <Text style={styles.statsText}>
            ⏱ Offset: {recognitionResult.offset ? recognitionResult.offset.toFixed(2) : "0"}s | Timeskew: {recognitionResult.timeskew ? recognitionResult.timeskew.toFixed(5) : "0"}
          </Text>
        </View>
      )}

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
                    syncedLyrics: item.syncedLyrics || null,
                    duration: item.duration || 0,
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
  micButton: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#444",
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: "#FF3B30",
    borderColor: "#FF3B30",
  },
  micButtonDisabled: {
    opacity: 0.6,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 0.5,
    borderColor: "#FF3B30",
    justifyContent: "center",
  },
  statusBannerIdentifying: {
    borderColor: "#1DB954",
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  resultBanner: {
    backgroundColor: "#1E1E1E",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 0.5,
    borderColor: "#444",
  },
  resultBannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  resultBannerTitle: {
    color: "#1DB954",
    fontWeight: "bold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  resultText: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 4,
  },
  statsText: {
    color: "#888",
    fontSize: 12,
  },
});
