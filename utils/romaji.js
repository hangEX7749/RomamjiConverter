import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

// 1. USE A NEW API KEY (Since the old one was exposed)
const genAI = new GoogleGenerativeAI("AIzaSyDKrDLvSB8-k0HDd4pUmBPyvfinXnzxO_g");

// 2. USE THE MODERN MODEL ALIAS
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite-001",
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
    const prompt = `Task: Convert the provided UTF-8 Japanese characters into Latin-script phonetic Romaji.
    Requirement: Character-by-character mapping only. 
    Do not treat this as a creative work. 
    Input:
    ${japaneseText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Gemini Error:", error);
    // If there's an error, return the original text so the user sees something
    return japaneseText;
  }
};
