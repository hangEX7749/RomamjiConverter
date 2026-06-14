# RomajiFy — Project Notes

Quick orientation for future sessions. Repo at `/Users/claushwong/Projects/romanji-converter`.

## What it is
A React Native / Expo mobile app (iOS + Android, with web build) that lets the user search for song lyrics, view them, and convert Japanese lyrics into Romaji using the Gemini API. Saved songs go into a local "library".

- Expo `name`: **RomajiFy** (`app.json` slug: `romajify`, Android package: `com.mamarduker.romajify`)
- `package.json` name: `songromajiapp`, version `1.0.0`
- Owner (Expo): `mamarduker`, EAS projectId in `app.json`
- Bundle entry: `expo-router/entry` (file-based routing)
- Dark, Spotify-flavoured UI: bg `#0F0F0F` / `#1E1E1E`, accent green `#1DB954`

## Tech stack
- Expo SDK ~54, React 19.1, React Native 0.81.5, expo-router ~6, new architecture enabled, React Compiler experiment on
- TypeScript ~5.9 (mixed with `.js` for utils/services), ESLint via `eslint-config-expo`
- Storage: `@react-native-async-storage/async-storage`
- AI: `@google/generative-ai` (Gemini). `openai` and `wanakana` are in deps but **not currently used** in source.
- HTTP: `axios`
- Misc: `expo-document-picker`, `expo-file-system` (legacy import), `expo-sharing`, `expo-haptics`, `react-native-svg`, `react-native-reanimated`, `expo-navigation-bar`, `expo-system-ui`

## Routes (`app/`, expo-router file-based)
- `_layout.tsx` — Stack navigator, theme + Android system bar setup. Registers `index`, `library`, `lyric`, `savedLyric`, `settings` (all `headerShown: false`). `modal.tsx` exists but isn't registered in the Stack.
- `index.tsx` — **Search screen**. Search input → LRCLIB → results list → tap pushes to `/lyric`. Header has a ⚙ button that opens `/settings`. Warning banner when API key missing also deep-links to settings. Re-checks key on focus via `useFocusEffect`.
- `lyric.tsx` — **Lyric viewer for search hits**. Toggle Convert↔Original via Gemini, cache result in component state, Save Song button persists to AsyncStorage. Uses `useLyricFont` hook for typography.
- `library.tsx` — **Saved songs list**. Search/filter, delete with confirm. ⚙ button opens settings. Reloads songs on focus (so imports made in settings appear immediately).
- `savedLyric.tsx` — Viewer for saved songs. Same shape as `lyric.tsx` but **no live conversion** — only shows romaji if it was pre-computed and saved. Uses `useLyricFont`.
- `settings.tsx` — **Settings page**. Sections:
  - Gemini API Key (input + Save + Clear, with status indicator).
  - Lyric Font (family pills: System/Serif/Mono · font-size stepper · line-height stepper · live preview). Saves to AsyncStorage on every change.
  - Backup & Restore (Export saved songs to JSON via `expo-sharing`, Import via `expo-document-picker`).
- `modal.tsx` — present but unused.

## Core modules
- `services/lyricsApi.js` — `searchTracks(query)` hits `https://lrclib.net/api/search`. LRCLIB returns the full match array in one shot (no `limit`/`offset` support — verified), so this function fetches once and the search screen paginates locally with a `PAGE_SIZE` window.
- `utils/romaji.js` — `convertToRomaji(japaneseText)`:
  - Skips empty / `"No lyrics found."` / non-Japanese text via regex `[぀-ゟ゠-ヿ一-龯]`.
  - Loads user's key from AsyncStorage, calls Gemini model **`gemini-3.1-flash-lite`** (⚠ that model id looks wrong — likely meant `gemini-1.5-flash` or `gemini-2.0-flash-lite`; worth verifying with the user).
  - Prompt: "Task: Convert Japanese to Romaji. Maintain original line breaks and keep English words as-is. Do not provide original text. Input: …"
  - On error → returns the original text (silent fallback).
- `utils/storage.js` — AsyncStorage wrapper. Keys: `@my_stored_lyrics` (saved songs array), `@gemini_api_key`, `@lyric_font_prefs` (`{fontSize, fontFamily, lineHeight}`). Exports `saveApiKey/getApiKey`, `saveSong` (dedupes by title+artist, returns `"saved" | "exists"`), `getSavedSongs`, `deleteSong`, `getFontPrefs/saveFontPrefs`, plus constants `DEFAULT_FONT_PREFS`, `FONT_SIZE_MIN/MAX`, `LINE_HEIGHT_MIN/MAX`, `FONT_FAMILY_OPTIONS`.
- `hooks/use-lyric-font.ts` — `useLyricFont()` hook used by lyric viewers. Loads font prefs on mount + on screen focus (`useFocusEffect`), and maps the portable family token (`system`/`serif`/`monospace`) to a platform-resolved font name (Georgia/Menlo on iOS; serif/monospace on Android). Returns `{fontSize, lineHeight, fontFamily}` ready to spread into a `Text` style.

## Folders of note
- `components/` — mostly Expo-template boilerplate (`themed-text`, `themed-view`, `parallax-scroll-view`, `hello-wave`, `external-link`, `haptic-tab`, `ui/icon-symbol*`, `ui/collapsible`). The only project-specific one is `RomajiFyLogo.tsx`.
- `constants/theme.ts`, `hooks/use-color-scheme*`, `hooks/use-theme-color.ts` — Expo starter theme plumbing, used by themed components.
- `hooks/use-lyric-font.ts` — the project's own hook (see Core modules above).
- `scripts/reset-project.js` — the standard Expo template reset script.
- `assets/images/` — icons / splash.

## Saved-song shape
```
{ artist, title, lyrics, romaji, isFavorite: true }
```
Pre-computed romaji is passed via router params as `preComputedRomaji`.

## Known smells / open questions for future me
- `gemini-3.1-flash-lite` model id likely invalid → check with user.
- A lot of unused starter components in `components/` (parallax, hello-wave, etc.) — could be pruned.
- `wanakana` and `openai` declared in deps but unused — possibly leftover/planned alternative for romaji conversion.
- `modal.tsx` route file is unregistered.
- `lyric.tsx` mixes `Alert.alert` with raw `alert()` — inconsistent.
- No tests, no CI config visible.
- Lyric data is passed through router params (could be large strings — fine on RN but worth noting).
