import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// 1. USE A NEW API KEY (Since the old one was exposed)
const genAI = new GoogleGenerativeAI(API_KEY);

// 2. USE THE MODERN MODEL ALIAS
const model = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite",
});

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

export const convertToRomaji = async (japaneseText) => {
  if (!japaneseText || japaneseText === "No lyrics found.") return "";

  try {
    const prompt = `Task: Convert Japanese to Romaji. Maintain original line breaks and keep English words as-is. Do not provide original text. 
    Input: ${japaneseText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Just a simple trim is usually enough now!
    return response.text().trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return japaneseText;
  }
};
