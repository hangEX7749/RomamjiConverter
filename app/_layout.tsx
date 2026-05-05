import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar"; // The system bar controller
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS === "android") {
      const isDark = colorScheme === "dark";

      // 1. Set the root view background color.
      // This fills the space behind the transparent navigation bar.
      SystemUI.setBackgroundColorAsync(isDark ? "#1a1a1a" : "#ffffff");

      // 2. Set the style of the navigation bar buttons
      // 'light' makes buttons white (for dark background)
      // 'dark' makes buttons dark (for light background)
      NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");

      // 3. Optional: Set the behavior to stay "edge-to-edge" but stable
      NavigationBar.setBehaviorAsync("inset-touch");
    }
  }, [colorScheme]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* 'index' is your main search screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        <Stack.Screen name="library" options={{ headerShown: false }} />

        {/* 'lyric' is the sub-page you created */}
        <Stack.Screen
          name="lyric"
          options={{
            // presentation: "modal",
            // title: "Lyrics",
            // headerStyle: {
            //   backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#fff",
            // },
            // headerTintColor: colorScheme === "dark" ? "#fff" : "#000",
            headerShown: false,
          }}
        />
      </Stack>

      {/* This controls the TOP system bar (clock, battery) */}
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
