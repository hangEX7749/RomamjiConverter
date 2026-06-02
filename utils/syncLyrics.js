/**
 * Parses an LRC formatted string into an array of lyric line objects.
 * @param {string} lrcString Raw LRC format string.
 * @returns {Array<{time: number, text: string}>} Sorted array of timestamped lyric lines.
 */
export const parseLrc = (lrcString) => {
  if (!lrcString) return [];

  const lines = lrcString.split(/\r?\n/);
  const result = [];

  // Regex to match timestamps like [00:12.34], [00:12.345], or [00:12]
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    // Ignore ID tags like [ar: Artist], [ti: Title], [al: Album], etc.
    if (/^\[[a-z]{2,}:/.test(line.trim())) continue;

    // Find all timestamps in the line (a line can contain multiple timestamps)
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    // Extract the text content by removing all timestamps from the line
    const lyricText = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, "").trim();

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisecondsStr = match[3] || "0";

      // Pad milliseconds component correctly (e.g. .9 -> 900ms, .93 -> 930ms, .930 -> 930ms)
      let milliseconds = 0;
      if (millisecondsStr.length === 1) {
        milliseconds = parseInt(millisecondsStr, 10) * 100;
      } else if (millisecondsStr.length === 2) {
        milliseconds = parseInt(millisecondsStr, 10) * 10;
      } else if (millisecondsStr.length === 3) {
        milliseconds = parseInt(millisecondsStr, 10);
      }

      const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;

      result.push({
        time: totalSeconds,
        text: lyricText,
      });
    }
  }

  // Sort by timestamp in ascending order
  result.sort((a, b) => a.time - b.time);
  return result;
};

/**
 * Aligns plain-text Romaji translation line-by-line with original synced lyrics' timestamps.
 * @param {string} plainRomaji Multi-line plain Romaji string.
 * @param {string} syncedLyrics Multi-line original Japanese synced lyrics in LRC format.
 * @returns {string} Timestamped Romaji synced lyrics string.
 */
export const alignRomajiWithTimestamps = (plainRomaji, syncedLyrics) => {
  if (!plainRomaji || !syncedLyrics) return "";

  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  const originalLines = syncedLyrics.split(/\r?\n/);
  const romajiLines = plainRomaji.split(/\r?\n/);

  let romajiIndex = 0;
  const resultLines = [];

  for (let i = 0; i < originalLines.length; i++) {
    const line = originalLines[i];

    // Identify if the line has timestamps
    const matches = line.match(timeRegex);
    if (!matches) {
      // Keep metadata tag lines or empty non-sync lines as-is
      resultLines.push(line);
      continue;
    }

    // Extract text content of original line
    const originalText = line.replace(timeRegex, "").trim();
    if (!originalText) {
      // Keep empty synchronized lines (e.g. pauses)
      resultLines.push(line);
      continue;
    }

    // Find the next non-empty romaji translation line
    while (romajiIndex < romajiLines.length && !romajiLines[romajiIndex].trim()) {
      romajiIndex++;
    }

    if (romajiIndex < romajiLines.length) {
      // Re-attach original timestamp prefix to the romaji translation line
      const timestampPrefix = matches.join("");
      resultLines.push(`${timestampPrefix} ${romajiLines[romajiIndex].trim()}`);
      romajiIndex++;
    } else {
      // Fallback if translations run out: retain original line
      resultLines.push(line);
    }
  }

  return resultLines.join("\n");
};
