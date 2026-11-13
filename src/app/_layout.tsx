
import { ThemedView } from "@/components/themed-view";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, useColorScheme } from "react-native";
import { i18nReady } from "@/i18n";

LogBox.ignoreAllLogs();

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const [loaded] = useFonts({
    "Oswald-Bold": require("../../assets/fonts/Oswald-Bold.ttf"),
    "Oswald-Medium": require("../../assets/fonts/Oswald-Medium.ttf"),
    "Oswald-Regular": require("../../assets/fonts/Oswald-Regular.ttf"),
  });

  const [languageLoaded, setLanguageLoaded] = useState(false);

  const colorScheme = useColorScheme();

  useEffect(() => {
    let isMounted = true;

    i18nReady
      .then(() => {
        if (isMounted) {
          setLanguageLoaded(true);
        }
      })
      .catch((error) => {
        console.error("Dil sistemi başlatılamadı:", error);

        if (isMounted) {
          setLanguageLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (loaded && languageLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, languageLoaded]);

  if (!loaded || !languageLoaded) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#121212" },
          statusBarStyle: "light",
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </ThemeProvider>
  );
}
