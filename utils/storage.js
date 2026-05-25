import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@my_stored_lyrics";
const API_KEY_STORAGE_KEY = "@gemini_api_key";

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

export const getAllSongs = async () => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    console.error("Error fetching all songs", e);
    return [];
  }
};

export const getSavedSongs = async () => {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  return existing ? JSON.parse(existing) : [];
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
