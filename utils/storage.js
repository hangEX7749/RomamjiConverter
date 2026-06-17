import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@my_stored_lyrics";
const API_KEY_STORAGE_KEY = "@gemini_api_key";
const FONT_PREFS_KEY = "@lyric_font_prefs";
const FOLDERS_KEY = "@library_folders";

// Lyric viewer typography preferences. `fontFamily` is a token resolved to a
// real platform font inside the useLyricFont hook (system/serif/monospace).
export const DEFAULT_FONT_PREFS = {
  fontSize: 18,
  fontFamily: "system",
  lineHeight: 30,
  autoScroll: true,
  highlightColor: "#FFFFFF",
};

export const HIGHLIGHT_COLOR_OPTIONS = [
  { value: "#FFFFFF", label: "White" },
  { value: "#1DB954", label: "Green" },
  { value: "#007AFF", label: "Blue" },
  { value: "#00D2FF", label: "Cyan" },
  { value: "#FF4A85", label: "Pink" },
  { value: "#E65C00", label: "Orange" },
  { value: "#A855F7", label: "Purple" },
  { value: "#EAB308", label: "Yellow" },
];

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 32;
export const LINE_HEIGHT_MIN = 18;
export const LINE_HEIGHT_MAX = 48;
export const FONT_FAMILY_OPTIONS = ["system", "serif", "monospace"];

const RAPIDAPI_KEY_STORAGE_KEY = "@rapidapi_key";

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

// Save the RapidAPI key to the device
export const saveRapidApiKey = async (key) => {
  try {
    await AsyncStorage.setItem(RAPIDAPI_KEY_STORAGE_KEY, key);
    return true;
  } catch (e) {
    console.error("Error saving RapidAPI key", e);
    return false;
  }
};

// Retrieve the RapidAPI key from the device
export const getRapidApiKey = async () => {
  try {
    return await AsyncStorage.getItem(RAPIDAPI_KEY_STORAGE_KEY);
  } catch (e) {
    console.error("Error fetching RapidAPI key", e);
    return null;
  }
};

const RECORDING_DURATION_KEY = "@shazam_recording_duration";

// Save Shazam recording duration to the device (in seconds)
export const saveRecordingDuration = async (duration) => {
  try {
    await AsyncStorage.setItem(RECORDING_DURATION_KEY, String(duration));
    return true;
  } catch (e) {
    console.error("Error saving recording duration", e);
    return false;
  }
};

// Retrieve Shazam recording duration from the device (defaults to 7s)
export const getRecordingDuration = async () => {
  try {
    const val = await AsyncStorage.getItem(RECORDING_DURATION_KEY);
    return val ? parseInt(val, 10) : 7; // Default to 7s
  } catch (e) {
    console.error("Error fetching recording duration", e);
    return 7;
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

// --- Library folders (playlist-style; a song can belong to many) ---
//
// Folders are stored as an ordered list of names under FOLDERS_KEY so empty
// folders can exist. A song's membership lives in its own `folders: string[]`
// field on the saved-song object. Names are unique case-insensitively.

const normFolderName = (name) => (name || "").trim();

export const getFolders = async () => {
  try {
    const raw = await AsyncStorage.getItem(FOLDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error fetching folders", e);
    return [];
  }
};

const writeFolders = async (folders) => {
  await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
};

// Persist mutations to the songs array in one write.
const writeSongs = async (songs) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
};

// Returns "created" | "exists" | "invalid".
export const createFolder = async (name) => {
  const clean = normFolderName(name);
  if (!clean) return "invalid";
  const folders = await getFolders();
  if (folders.some((f) => f.toLowerCase() === clean.toLowerCase())) {
    return "exists";
  }
  folders.push(clean);
  await writeFolders(folders);
  return "created";
};

// Returns "renamed" | "exists" | "missing" | "invalid".
export const renameFolder = async (oldName, newName) => {
  const clean = normFolderName(newName);
  if (!clean) return "invalid";
  const folders = await getFolders();
  const collision = folders.some(
    (f) =>
      f.toLowerCase() === clean.toLowerCase() &&
      f.toLowerCase() !== oldName.toLowerCase(),
  );
  if (collision) return "exists";
  const idx = folders.findIndex((f) => f === oldName);
  if (idx === -1) return "missing";
  folders[idx] = clean;
  await writeFolders(folders);

  // Update membership on every song that referenced the old name.
  const songs = await getSavedSongs();
  let changed = false;
  for (const s of songs) {
    if (Array.isArray(s.folders) && s.folders.includes(oldName)) {
      s.folders = s.folders.map((f) => (f === oldName ? clean : f));
      changed = true;
    }
  }
  if (changed) await writeSongs(songs);
  return "renamed";
};

// Deletes the folder but keeps the songs — only strips the tag. Returns the
// remaining folders list.
export const deleteFolder = async (name) => {
  const folders = await getFolders();
  const remaining = folders.filter((f) => f !== name);
  await writeFolders(remaining);

  const songs = await getSavedSongs();
  let changed = false;
  for (const s of songs) {
    if (Array.isArray(s.folders) && s.folders.includes(name)) {
      s.folders = s.folders.filter((f) => f !== name);
      changed = true;
    }
  }
  if (changed) await writeSongs(songs);
  return remaining;
};

// Union the given names into the folders list (used on import). Returns the
// updated list.
export const addFolders = async (names) => {
  const folders = await getFolders();
  const lower = new Set(folders.map((f) => f.toLowerCase()));
  let changed = false;
  for (const n of names) {
    const clean = normFolderName(n);
    if (clean && !lower.has(clean.toLowerCase())) {
      folders.push(clean);
      lower.add(clean.toLowerCase());
      changed = true;
    }
  }
  if (changed) await writeFolders(folders);
  return folders;
};

// Replace a song's folder membership. Returns true if the song was found.
export const setSongFolders = async (title, artist, folderNames) => {
  const songs = await getSavedSongs();
  const idx = songs.findIndex(
    (s) => s.title === title && s.artist === artist,
  );
  if (idx === -1) return false;
  songs[idx].folders = [...new Set(folderNames)];
  await writeSongs(songs);
  return true;
};

// Read a single song's current folder membership.
export const getSongFolders = async (title, artist) => {
  const songs = await getSavedSongs();
  const song = songs.find((s) => s.title === title && s.artist === artist);
  return Array.isArray(song?.folders) ? song.folders : [];
};
