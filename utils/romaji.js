import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey } from "../utils/storage"; // Import the helper

const hasJapaneseCharacters = (text) => {
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japaneseRegex.test(text);
};

export const convertToRomaji = async (japaneseText) => {
  if (!japaneseText || japaneseText === "No lyrics found.") return "";

  if (!hasJapaneseCharacters(japaneseText)) {
    return japaneseText;
  }

  // 1. DYNAMICALLY GET THE KEY FROM STORAGE
  const userApiKey = await getApiKey();

  if (!userApiKey) {
    alert("Please add your Gemini API Key in settings first!");
    return japaneseText;
  }

  try {
    // 2. INITIALIZE GEMINI WITH THE USER'S KEY
    const genAI = new GoogleGenerativeAI(userApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const prompt = `Task: Convert Japanese to Romaji. Maintain original line breaks and keep English words as-is. Do not provide original text. 
    Input: ${japaneseText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text().trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return japaneseText;
  }
};
