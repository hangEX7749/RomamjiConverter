import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { DEFAULT_FONT_PREFS, getFontPrefs } from "../utils/storage";

// Map our portable family token to a font name that actually resolves on each
// platform. `undefined` lets RN fall back to the platform's system font.
const FAMILY_MAP: Record<string, string | undefined> = {
  system: undefined,
  serif: Platform.OS === "ios" ? "Georgia" : "serif",
  monospace: Platform.OS === "ios" ? "Menlo" : "monospace",
};

export type LyricFontPrefs = {
  fontSize: number;
  fontFamily: string; // token, not resolved
  lineHeight: number;
  autoScroll: boolean;
  highlightColor?: string;
};

export type ResolvedLyricFont = {
  fontSize: number;
  lineHeight: number;
  fontFamily: string | undefined;
  autoScroll: boolean;
  highlightColor: string;
};

// Loads the saved lyric typography prefs and re-loads them whenever the screen
// regains focus, so changes made in Settings take effect immediately on return.
export function useLyricFont(): ResolvedLyricFont {
  const [prefs, setPrefs] = useState<LyricFontPrefs>(DEFAULT_FONT_PREFS);

  useEffect(() => {
    getFontPrefs().then(setPrefs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getFontPrefs().then(setPrefs);
    }, []),
  );

  return {
    fontSize: prefs.fontSize,
    lineHeight: prefs.lineHeight,
    fontFamily: FAMILY_MAP[prefs.fontFamily],
    autoScroll: prefs.autoScroll ?? true,
    highlightColor: prefs.highlightColor || "#FFFFFF",
  };
}
