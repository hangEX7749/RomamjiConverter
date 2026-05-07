export const convertToRomaji = async (japaneseText) => {
  if (!japaneseText || japaneseText === "No lyrics found.") return "";

  try {
    const prompt = `Task: Convert the provided UTF-8 Japanese characters into Latin-script phonetic Romaji.
    Requirement: Character-by-character mapping only. Just the Romaji text, no explanations, formatting, or additional content.
    Do not treat this as a creative work. 
    Input:
    ${japaneseText}`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        // New URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer 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", // Your new free key from OpenRouter
        },
        body: JSON.stringify({
          model: "openrouter/free", // Use the free model name
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      },
    );

    clearTimeout(timeoutId);

    console.log("Response status:", response.status); // Debug log

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      return japaneseText;
    }

    const data = await response.json();
    console.log("Response data structure:", Object.keys(data)); // Debug log

    const romajiText = data?.choices?.[0]?.message?.content;

    if (!romajiText) {
      console.error("No romaji text in response");
      return japaneseText;
    }

    return romajiText;
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timeout");
    } else {
      console.error("DeepSeek Error:", error.message);
    }
    return japaneseText;
  }
};
