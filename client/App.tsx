import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";

import { useFonts as useGoogleFonts, Orbitron_700Bold } from "@expo-google-fonts/orbitron";
import {
  Inter_400Regular,
  Inter_500Medium,
} from "@expo-google-fonts/inter";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Colors } from "@/constants/theme";
import { WebRTCProvider } from "@/context/WebRTCContext";

SplashScreen.preventAutoHideAsync();

const GriplockDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.backgroundRoot,
    card: Colors.dark.backgroundDefault,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.primary,
  },
};

export default function App() {
  const [customFontsLoaded] = useFonts({
    "CircularStd-Black": require("../assets/fonts/CircularStd-Black.ttf"),
    "CircularStd-Bold": require("../assets/fonts/CircularStd-Bold.ttf"),
    "CircularStd-Medium": require("../assets/fonts/CircularStd-Medium.ttf"),
    "CircularStd-Book": require("../assets/fonts/CircularStd-Book.ttf"),
    "AstroSpace": require("../assets/fonts/AstroSpace.ttf"),
  });

  const [googleFontsLoaded, fontError] = useGoogleFonts({
    Orbitron_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const fontsLoaded = customFontsLoaded && googleFontsLoaded;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WebRTCProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.root}>
              <KeyboardProvider>
                <NavigationContainer theme={GriplockDarkTheme}>
                  <RootStackNavigator />
                </NavigationContainer>
                <StatusBar style="light" />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </WebRTCProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
});
