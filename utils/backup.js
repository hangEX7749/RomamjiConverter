import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

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

// Human-readable, filesystem-safe filename, e.g.
// "lyrics_backup_2026-06-02_141530.json". Avoids the opaque epoch-ms name
// while staying unique per second.
export const backupFileName = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp =
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `lyrics_backup_${stamp}.json`;
};

// Write the given songs to a backup file and open the OS share sheet.
//
// Uses cacheDirectory (not documentDirectory) so the OS can reclaim these temp
// files instead of accumulating one per export. Returns a result object so the
// caller can show a stage-specific message:
//   { ok: true }
//   { ok: false, stage: "write" | "share" | "unavailable" }
export const exportSongs = async (songs) => {
  const fileUri = FileSystem.cacheDirectory + backupFileName();
  try {
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(buildBackupEnvelope(songs)),
    );
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
