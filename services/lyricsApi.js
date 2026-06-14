import axios from "axios";

// LRCLIB's /api/search endpoint does NOT support server-side pagination —
// it returns the full match array for the query in a single response. So we
// fetch once per search and let the UI paginate the results locally.
export const searchTracks = async (query) => {
  if (!query) return [];

  try {
    const response = await axios.get(`https://lrclib.net/api/search`, {
      params: { q: query },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Search Error:", error);
    return [];
  }
};
