import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@my_stored_lyrics";
const API_KEY_STORAGE_KEY = "@gemini_api_key";
const FONT_PREFS_KEY = "@lyric_font_prefs";

// Lyric viewer typography preferences. `fontFamily` is a token resolved to a
// real platform font inside the useLyricFont hook (system/serif/monospace).
export const DEFAULT_FONT_PREFS = {
  fontSize: 18,
  fontFamily: "system",
  lineHeight: 30,
  autoScroll: false,
};

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 32;
export const LINE_HEIGHT_MIN = 18;
export const LINE_HEIGHT_MAX = 48;
export const FONT_FAMILY_OPTIONS = ["system", "serif", "monospace"];

// Save the API key to the device
export const saveApiKey = async (key) => {
  try {
    await AsyncStorage.setItem(API_KEY_STORAGE_KEY, key);
    return true;
  } catch (e) {
    console.error("Error saving API key", e);
    return false;
  }
};

// Retrieve the API key from the device
export const getApiKey = async () => {
  try {
    return await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (e) {
    console.error("Error fetching API key", e);
    return null;
  }
};

export const saveSong = async (songData) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const songs = existing ? JSON.parse(existing) : [];

    // Check if song already exists to prevent duplicates
    const isDuplicate = songs.find(
      (s) => s.title === songData.title && s.artist === songData.artist,
    );
    if (isDuplicate) return "exists";

    songs.push(songData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    return "saved";
  } catch (e) {
    console.error("Save error", e);
  }
};

export const getSavedSongs = async () => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    console.error("Error fetching saved songs", e);
    return [];
  }
};

export const deleteSong = async (title, artist) => {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (!existing) return;
  const songs = JSON.parse(existing);
  const filtered = songs.filter(
    (s) => !(s.title === title && s.artist === artist),
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
};

export const getFontPrefs = async () => {
  try {
    const raw = await AsyncStorage.getItem(FONT_PREFS_KEY);
    if (!raw) return { ...DEFAULT_FONT_PREFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_FONT_PREFS, ...parsed };
  } catch (e) {
    console.error("Error loading font prefs", e);
    return { ...DEFAULT_FONT_PREFS };
  }
};

export const saveFontPrefs = async (prefs) => {
  try {
    const merged = { ...DEFAULT_FONT_PREFS, ...prefs };
    await AsyncStorage.setItem(FONT_PREFS_KEY, JSON.stringify(merged));
    return true;
  } catch (e) {
    console.error("Error saving font prefs", e);
    return false;
  }
};
