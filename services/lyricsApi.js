import axios from "axios";

// Using LRCLIB Search API
export const searchTracks = async (query, page = 1) => {
  try {
    // We calculate the offset based on 10 results per page
    const offset = (page - 1) * 10;

    const response = await axios.get(`https://lrclib.net/api/search`, {
      params: { q: query },
    });
    // Return only the first 10 results
    return response.data.slice(offset, offset + 10);
  } catch (error) {
    console.error("Search Error:", error);
    return [];
  }
};
