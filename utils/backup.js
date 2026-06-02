import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

// Backup envelope version. Bump when the saved-song shape changes so importers
// can detect and migrate older files.
export const BACKUP_VERSION = 1;

// Wrap the songs array in a versioned envelope. Keeping app/version/exportedAt
// alongside the data lets the importer recognise the format in the future.
export const buildBackupEnvelope = (songs) => ({
  app: "RomajiFy",
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  songs,
});

// Base name (no extension) for a backup, e.g. "lyrics_backup_2026-06-02_141530".
// Human-readable and unique per second.
const backupBaseName = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp =
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `lyrics_backup_${stamp}`;
};

export const backupFileName = () => `${backupBaseName()}.json`;

// Serialise the selected songs into the backup JSON string.
const backupJson = (songs) => JSON.stringify(buildBackupEnvelope(songs));

// Write the given songs to a temp file and open the OS share sheet.
//
// Uses cacheDirectory (not documentDirectory) so the OS can reclaim these temp
// files instead of accumulating one per export. Returns a result object so the
// caller can show a stage-specific message:
//   { ok: true }
//   { ok: false, stage: "write" | "share" | "unavailable" }
export const shareSongs = async (songs) => {
  const fileUri = FileSystem.cacheDirectory + backupFileName();
  try {
    await FileSystem.writeAsStringAsync(fileUri, backupJson(songs));
  } catch (e) {
    console.error("Export Error (write):", e);
    return { ok: false, stage: "write" };
  }

  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, stage: "unavailable" };
    }
    await Sharing.shareAsync(fileUri);
  } catch (e) {
    console.error("Export Error (share):", e);
    return { ok: false, stage: "share" };
  }

  return { ok: true };
};

// Save the given songs to a user-chosen location on the device.
//
// Android uses the Storage Access Framework: the user picks a folder, then we
// create and write the backup file there. iOS has no folder-picker API, so it
// falls back to the share sheet (whose "Save to Files" is the native save).
//
// Returns:
//   { ok: true }
//   { ok: false, stage: "permission" }  // user cancelled the folder picker
//   { ok: false, stage: "write" | "share" | "unavailable" }
export const saveSongsToDevice = async (songs) => {
  if (Platform.OS !== "android") {
    return shareSongs(songs);
  }

  const SAF = FileSystem.StorageAccessFramework;
  let permission;
  try {
    permission = await SAF.requestDirectoryPermissionsAsync();
  } catch (e) {
    console.error("Export Error (permission):", e);
    return { ok: false, stage: "permission" };
  }
  if (!permission.granted) {
    // User dismissed the folder picker — not an error.
    return { ok: false, stage: "permission" };
  }

  try {
    const fileUri = await SAF.createFileAsync(
      permission.directoryUri,
      backupBaseName(),
      "application/json",
    );
    await FileSystem.writeAsStringAsync(fileUri, backupJson(songs), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (e) {
    console.error("Export Error (save write):", e);
    return { ok: false, stage: "write" };
  }

  return { ok: true };
};
