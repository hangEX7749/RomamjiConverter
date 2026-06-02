import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DEFAULT_FONT_PREFS,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  HIGHLIGHT_COLOR_OPTIONS,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
  addFolders,
  getApiKey,
  getFontPrefs,
  saveApiKey,
  saveFontPrefs,
  saveSong,
} from "../utils/storage";

const FAMILY_LABEL: Record<string, string> = {
  system: "System",
  serif: "Serif",
  monospace: "Mono",
};

const PREVIEW_FAMILY: Record<string, string | undefined> = {
  system: undefined,
  serif: Platform.OS === "ios" ? "Georgia" : "serif",
  monospace: Platform.OS === "ios" ? "Menlo" : "monospace",
};

const SAMPLE_LYRICS_LINES = [
  { text: "夜に駆ける", type: "past" },
  { text: "さよならだけだった", type: "active" },
  { text: "yoru ni kakeru", type: "future" },
  { text: "sayonara dake datta", type: "future" },
];

const isValidHex = (hex: string) => {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
};

const isColorLight = (hexColor: string) => {
  try {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180;
  } catch (e) {
    return false;
  }
};

export default function SettingsScreen() {
  const router = useRouter();

  // --- API key state ---
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(false);

  // --- Font prefs state ---
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_PREFS.fontSize);
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT_PREFS.fontFamily);
  const [lineHeight, setLineHeight] = useState(DEFAULT_FONT_PREFS.lineHeight);
  const [autoScroll, setAutoScroll] = useState(DEFAULT_FONT_PREFS.autoScroll);
  const [highlightColor, setHighlightColor] = useState(DEFAULT_FONT_PREFS.highlightColor);
  const [customHex, setCustomHex] = useState("");

  const activeIsCustom = highlightColor && !HIGHLIGHT_COLOR_OPTIONS.some(opt => opt.value.toLowerCase() === highlightColor.toLowerCase());

  const handleCustomHexChange = (text: string) => {
    let formatted = text.trim();
    if (formatted && !formatted.startsWith("#")) {
      formatted = "#" + formatted;
    }
    if (formatted.length <= 7) {
      setCustomHex(formatted);
    }
  };

  // Hydrate state from storage on mount. `loaded` gates the auto-save effect
  // so we don't immediately overwrite storage with the default values before
  // the initial read completes.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [key, prefs] = await Promise.all([getApiKey(), getFontPrefs()]);
      if (cancelled) return;
      setApiKeyInput(key || "");
      setHasKey(!!key);
      setFontSize(prefs.fontSize);
      setFontFamily(prefs.fontFamily);
      setLineHeight(prefs.lineHeight);
      setAutoScroll(prefs.autoScroll ?? false);
      const loadedColor = prefs.highlightColor || DEFAULT_FONT_PREFS.highlightColor;
      setHighlightColor(loadedColor);
      const isPredefined = HIGHLIGHT_COLOR_OPTIONS.some(opt => opt.value.toLowerCase() === loadedColor.toLowerCase());
      if (loadedColor && !isPredefined) {
        setCustomHex(loadedColor);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist font prefs on every change so the lyric viewer always sees the
  // latest values when it re-focuses.
  useEffect(() => {
    if (!loaded) return;
    saveFontPrefs({ fontSize, fontFamily, lineHeight, autoScroll, highlightColor });
  }, [fontSize, fontFamily, lineHeight, autoScroll, highlightColor, loaded]);

  // --- API key handlers ---
  const handleSaveKey = async () => {
    const trimmed = apiKeyInput.trim();
    const ok = await saveApiKey(trimmed);
    if (ok) {
      setHasKey(!!trimmed);
      Alert.alert(
        "Saved",
        trimmed ? "Gemini API key updated." : "Gemini API key cleared.",
      );
    } else {
      Alert.alert("Error", "Failed to save the API key.");
    }
  };

  const handleClearKey = async () => {
    Alert.alert("Clear API key?", "This will remove your saved Gemini API key.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await saveApiKey("");
          setApiKeyInput("");
          setHasKey(false);
        },
      },
    ]);
  };

  // --- Font handlers ---
  const bumpFontSize = (delta: number) =>
    setFontSize((v) => Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, v + delta)));
  const bumpLineHeight = (delta: number) =>
    setLineHeight((v) =>
      Math.min(LINE_HEIGHT_MAX, Math.max(LINE_HEIGHT_MIN, v + delta)),
    );
  const resetFont = () => {
    setFontSize(DEFAULT_FONT_PREFS.fontSize);
    setFontFamily(DEFAULT_FONT_PREFS.fontFamily);
    setLineHeight(DEFAULT_FONT_PREFS.lineHeight);
    setAutoScroll(DEFAULT_FONT_PREFS.autoScroll);
    setHighlightColor(DEFAULT_FONT_PREFS.highlightColor);
    setCustomHex("");
  };

  // --- Backup / restore ---
  // Export now happens on a dedicated screen where the user picks which songs
  // to include; this just navigates there.
  const handleExport = () => {
    router.push("/exportSelect");
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(uri);
      const parsed = JSON.parse(content);

      // Accept both the new envelope ({ app, version, songs }) and the legacy
      // bare-array format so older backups still import.
      const songsToImport = Array.isArray(parsed) ? parsed : parsed?.songs;
      if (!Array.isArray(songsToImport)) {
        Alert.alert("Invalid file", "The backup file is not a valid RomajiFy backup.");
        return;
      }

      let imported = 0;
      let skipped = 0;
      for (const song of songsToImport) {
        const status = await saveSong(song);
        if (status === "saved") imported++;
        else skipped++;
      }

      // Reconstruct the folder list: union the envelope's folders (v2+) with
      // every folder name referenced by an imported song, so chips reappear.
      const envelopeFolders = Array.isArray(parsed?.folders) ? parsed.folders : [];
      const songFolders = songsToImport.flatMap((s) =>
        Array.isArray(s?.folders) ? s.folders : [],
      );
      if (envelopeFolders.length || songFolders.length) {
        await addFolders([...envelopeFolders, ...songFolders]);
      }
      Alert.alert(
        "Import complete",
        `Imported ${imported} song${imported === 1 ? "" : "s"}` +
          (skipped > 0 ? `, skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.` : "."),
      );
    } catch (e) {
      console.error("Import Error:", e);
      Alert.alert(
        "Error",
        "Failed to import. Please ensure the file is a valid JSON backup.",
      );
    }
  };

  const previewFamily = PREVIEW_FAMILY[fontFamily];

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* === Gemini API Key === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gemini API Key</Text>
          <Text style={styles.sectionSubtitle}>
            Used to convert Japanese lyrics to Romaji. Stored only on this device.
            {"  "}
            <Text style={{ color: hasKey ? "#1DB954" : "#e0a300" }}>
              {hasKey ? "✓ Key saved" : "⚠ No key set"}
            </Text>
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Paste your AIzaSy... key here"
            placeholderTextColor="#555"
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.row}>
            <TouchableOpacity
              onPress={handleSaveKey}
              style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
            >
              <Text style={styles.btnPrimaryText}>Save Key</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearKey}
              style={[styles.btn, styles.btnGhost, { marginLeft: 10 }]}
              disabled={!hasKey}
            >
              <Text
                style={[
                  styles.btnGhostText,
                  !hasKey && { color: "#555" },
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* === Lyric Font === */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Lyric Font</Text>
            <TouchableOpacity onPress={resetFont}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Family pills */}
          <Text style={styles.label}>Family</Text>
          <View style={styles.row}>
            {FONT_FAMILY_OPTIONS.map((opt) => {
              const active = opt === fontFamily;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setFontFamily(opt)}
                  style={[
                    styles.pill,
                    active && styles.pillActive,
                    { marginRight: 8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      active && styles.pillTextActive,
                      { fontFamily: PREVIEW_FAMILY[opt] },
                    ]}
                  >
                    {FAMILY_LABEL[opt]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Font size stepper */}
          <Text style={styles.label}>Font size — {fontSize}pt</Text>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => bumpFontSize(-1)}
              style={[styles.stepBtn, fontSize <= FONT_SIZE_MIN && styles.stepBtnDisabled]}
              disabled={fontSize <= FONT_SIZE_MIN}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepValue}>
              <Text style={styles.stepValueText}>{fontSize}</Text>
            </View>
            <TouchableOpacity
              onPress={() => bumpFontSize(1)}
              style={[styles.stepBtn, fontSize >= FONT_SIZE_MAX && styles.stepBtnDisabled]}
              disabled={fontSize >= FONT_SIZE_MAX}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Line height stepper */}
          <Text style={styles.label}>Line height — {lineHeight}pt</Text>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => bumpLineHeight(-2)}
              style={[
                styles.stepBtn,
                lineHeight <= LINE_HEIGHT_MIN && styles.stepBtnDisabled,
              ]}
              disabled={lineHeight <= LINE_HEIGHT_MIN}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepValue}>
              <Text style={styles.stepValueText}>{lineHeight}</Text>
            </View>
            <TouchableOpacity
              onPress={() => bumpLineHeight(2)}
              style={[
                styles.stepBtn,
                lineHeight >= LINE_HEIGHT_MAX && styles.stepBtnDisabled,
              ]}
              disabled={lineHeight >= LINE_HEIGHT_MAX}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Highlight Color */}
          <Text style={styles.label}>Highlight Color</Text>
          <View style={[styles.row, { gap: 12, flexWrap: "wrap", marginBottom: 14 }]}>
            {HIGHLIGHT_COLOR_OPTIONS.map((opt) => {
              const active = opt.value.toLowerCase() === highlightColor.toLowerCase();
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setHighlightColor(opt.value)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: opt.value },
                    active ? styles.colorCircleActive : { borderColor: "#444" },
                  ]}
                  accessibilityLabel={opt.label}
                >
                  {active && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={opt.value === "#FFFFFF" || opt.value === "#EAB308" ? "#000" : "#fff"}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Custom Color Circle Slot */}
            <TouchableOpacity
              onPress={() => {
                if (isValidHex(customHex)) {
                  setHighlightColor(customHex);
                }
              }}
              style={[
                styles.colorCircle,
                { backgroundColor: isValidHex(customHex) ? customHex : "#2A2A2A" },
                activeIsCustom ? styles.colorCircleActive : { borderColor: "#444" },
              ]}
              accessibilityLabel="Custom Color"
              disabled={!isValidHex(customHex)}
            >
              {activeIsCustom ? (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={isColorLight(customHex) ? "#000" : "#fff"}
                />
              ) : !isValidHex(customHex) ? (
                <Ionicons name="add" size={16} color="#aaa" />
              ) : null}
            </TouchableOpacity>
          </View>

          {/* Custom Hex Input */}
          <Text style={styles.label}>Custom Hex Color</Text>
          <View style={[styles.row, { marginBottom: 14 }]}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="e.g. #FF5733"
              placeholderTextColor="#555"
              value={customHex}
              onChangeText={handleCustomHexChange}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={7}
            />
            {isValidHex(customHex) && (
              <TouchableOpacity
                onPress={() => setHighlightColor(customHex)}
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  { marginLeft: 10, backgroundColor: customHex },
                ]}
              >
                <Text
                  style={[
                    styles.btnPrimaryText,
                    { color: isColorLight(customHex) ? "#000" : "#fff" },
                  ]}
                >
                  Apply
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Preview */}
          <Text style={styles.label}>Preview</Text>
          <View style={styles.preview}>
            {SAMPLE_LYRICS_LINES.map((line, idx) => {
              const isActive = line.type === "active";
              const isPast = line.type === "past";
              return (
                <Text
                  key={idx}
                  style={{
                    color: (isActive || isPast) ? highlightColor : "#FFFFFF",
                    opacity: isActive ? 1.0 : (isPast ? 0.15 : 0.4),
                    fontSize,
                    lineHeight,
                    fontFamily: previewFamily,
                  }}
                >
                  {line.text}
                </Text>
              );
            })}
          </View>
        </View>

        {/* === Auto-scroll Lyrics === */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.sectionTitle}>Auto-scroll Lyrics</Text>
              <Text style={[styles.sectionSubtitle, { marginBottom: 0 }]}>
                Automatically scroll lyrics as the song plays.
              </Text>
            </View>
            <Switch
              value={autoScroll}
              onValueChange={setAutoScroll}
              trackColor={{ false: "#333", true: "#1DB954" }}
              thumbColor={Platform.OS === "android" ? (autoScroll ? "#fff" : "#888") : ""}
            />
          </View>
        </View>

        {/* === Backup & Restore === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup & Restore</Text>
          <Text style={styles.sectionSubtitle}>
            Export your saved library to a JSON file, or import a previous backup.
          </Text>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={handleExport}
              style={[styles.btn, styles.btnGhost, { flex: 1 }]}
            >
              <Text style={styles.btnGhostText}>⬆ Export backup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleImport}
              style={[styles.btn, styles.btnGhost, { flex: 1, marginLeft: 10 }]}
            >
              <Text style={styles.btnGhostText}>⬇ Import backup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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

  section: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  sectionSubtitle: {
    color: "#aaa",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 12,
  },
  resetText: { color: "#1DB954", fontSize: 13, fontWeight: "600" },
  label: {
    color: "#bbb",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: "#101010",
    color: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },

  row: { flexDirection: "row", alignItems: "center" },

  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#1DB954" },
  btnPrimaryText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#333",
  },
  btnGhostText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#101010",
  },
  pillActive: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  pillText: { color: "#ccc", fontSize: 13, fontWeight: "600" },
  pillTextActive: { color: "#fff" },

  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepBtnText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  stepValue: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValueText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  preview: {
    backgroundColor: "#0a0a0a",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    minHeight: 80,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorCircleActive: {
    borderColor: "#fff",
  },
});
