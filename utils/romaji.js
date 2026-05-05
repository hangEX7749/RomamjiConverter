import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

// 1. USE A NEW API KEY (Since the old one was exposed)
const genAI = new GoogleGenerativeAI("");

// 2. USE THE MODERN MODEL ALIAS
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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
    const prompt = `Perform a linguistic transliteration of the following Japanese text into Romaji script. 
    Transliterate character by character. 
    Do not add commentary. 
    Output only the Romaji transliteration:
    
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
