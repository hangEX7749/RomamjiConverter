import { getRapidApiKey } from "../utils/storage";

const SHAZAM_API_URL = "https://shazam-api-free.p.rapidapi.com/shazam/recognize/";
const SHAZAM_API_HOST = "shazam-api-free.p.rapidapi.com";

/**
 * Recognizes music from a local audio file URI.
 * @param {string} audioUri Local file system URI of the recorded audio snippet.
 * @returns {Promise<{status: boolean, found: boolean, title: string|null, artist: string|null, album: string|null, duration: number|null, offset: number|null, timeskew: number|null, trackData: any}>}
 */
export const recognizeMusic = async (audioUri) => {
  if (!audioUri) {
    throw new Error("No audio URI provided for recognition");
  }

  // Load custom key from storage
  const savedKey = await getRapidApiKey();
  if (!savedKey || savedKey.trim() === "") {
    throw new Error("Please add your Shazam RapidAPI key in Settings first!");
  }
  const apiKey = savedKey.trim();

  const data = new FormData();

  const uriNoQuery = String(audioUri).split("?")[0];
  const dot = uriNoQuery.lastIndexOf(".");
  const ext = dot !== -1 ? uriNoQuery.slice(dot + 1).toLowerCase() : "";

  const mimeType =
    ext === "m4a" || ext === "mp4" ? "audio/mp4" :
    ext === "mp3" ? "audio/mpeg" :
    ext === "wav" ? "audio/wav" :
    ext === "ogg" || ext === "opus" ? "audio/ogg" :
    "application/octet-stream";

  // In React Native, FormData file attachment requires this specific object structure:
  // @ts-ignore
  data.append("upload_file", {
    uri: audioUri,
    type: mimeType,
    name: `recording${ext ? `.${ext}` : ""}`,
  });

  const options = {
    method: "POST",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": SHAZAM_API_HOST,
    },
    body: data,
  };

  const response = await fetch(SHAZAM_API_URL, options);
  if (!response.ok) {
    const errorText = await response.text();
    let friendlyMessage = `Shazam API error (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      const msg = parsed?.detail?.message || parsed?.message;
      if (msg) {
        if (msg.toLowerCase() === "could not be determined") {
          friendlyMessage = "Song not recognized, please try again";
        } else {
          friendlyMessage = msg;
        }
      } else {
        friendlyMessage = errorText;
      }
    } catch (e) {
      friendlyMessage = errorText;
    }
    throw new Error(friendlyMessage);
  }

  const result = await response.json();

  // If the API explicitly returns a search failure structure
  if (result && result.detail && result.detail.status === false) {
    const msg = result.detail?.message;
    if (msg && msg.toLowerCase() === "could not be determined") {
      throw new Error("Song not recognized, please try again");
    }
    throw new Error(msg || "Music recognition failed.");
  }

  // The endpoint response shape has status: boolean and result object
  if (result && result.status && result.result) {
    const track = result.result.track;
    const matches = result.result.matches || [];
    const firstMatch = matches[0] || {};

    // Parse album name from attributes or sections metadata
    let album = track?.attributes?.albumName || null;
    if (!album && track?.sections) {
      const songSection = track.sections.find((s) => s.type === "SONG");
      if (songSection?.metadata) {
        const albumMeta = songSection.metadata.find((m) => m.title === "Album");
        if (albumMeta) {
          album = albumMeta.text;
        }
      }
    }

    // Parse duration (in seconds) from attributes or sections metadata
    let duration = null;
    if (track?.attributes?.durationInMillis) {
      duration = Math.round(track.attributes.durationInMillis / 1000);
    }
    if (!duration && track?.sections) {
      const songSection = track.sections.find((s) => s.type === "SONG");
      if (songSection?.metadata) {
        const durationMeta = songSection.metadata.find(
          (m) => m.title === "Duration" || m.title === "Length"
        );
        if (durationMeta && durationMeta.text) {
          const parts = durationMeta.text.split(":");
          if (parts.length === 2) {
            duration = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          } else if (parts.length === 3) {
            duration = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
          }
        }
      }
    }

    return {
      status: true,
      found: !!track,
      title: track?.title || null,
      artist: track?.subtitle || null,
      album: album || null,
      duration: duration || null,
      offset: firstMatch.offset !== undefined ? Number(firstMatch.offset) : null,
      timeskew: firstMatch.timeskew !== undefined ? Number(firstMatch.timeskew) : null,
      trackData: track || null,
    };
  }

  return {
    status: false,
    found: false,
    title: null,
    artist: null,
    album: null,
    duration: null,
    offset: null,
    timeskew: null,
    trackData: null,
  };
};
