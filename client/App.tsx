import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer, DarkTheme, NavigationContainerRef } from "@react-navigation/native";
import { logScreenView, logSessionStart } from "@/lib/analytics";
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
import { GeistMono_400Regular } from "@expo-google-fonts/geist-mono";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Colors } from "@/constants/theme";
import { WebRTCProvider } from "@/context/WebRTCContext";
import { AuthPreferenceProvider, useAuthPreference } from "@/context/AuthPreferenceContext";
import AuthLevelModal, { AuthLevel } from "@/components/AuthLevelModal";
import SecretSetupModal from "@/components/SecretSetupModal";

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

function AuthSetupWrapper({ children }: { children: React.ReactNode }) {
  const { isFirstLaunch, isLoading, authLevel, setAuthLevel, setSecret, completeFirstLaunch, requiresSecret, hasSecret } = useAuthPreference();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [pendingAuthLevel, setPendingAuthLevel] = useState<AuthLevel | null>(null);

  useEffect(() => {
    if (!isLoading && isFirstLaunch) {
      setShowAuthModal(true);
    }
  }, [isLoading, isFirstLaunch]);

  const handleAuthLevelSelect = async (level: AuthLevel) => {
    await setAuthLevel(level);
    setShowAuthModal(false);
    
    if (level === "nfc_secret" || level === "nfc_pin_secret") {
      setPendingAuthLevel(level);
      setShowSecretModal(true);
    } else {
      await completeFirstLaunch();
    }
  };

  const handleSecretConfirm = async (secret: string) => {
    await setSecret(secret);
    setShowSecretModal(false);
    setPendingAuthLevel(null);
    await completeFirstLaunch();
  };

  if (isLoading) {
    return <View style={styles.root} />;
  }

  return (
    <>
      {children}
      <AuthLevelModal
        visible={showAuthModal}
        onClose={() => {}}
        onSelect={handleAuthLevelSelect}
        currentLevel={authLevel || undefined}
        isFirstTime={isFirstLaunch}
      />
      <SecretSetupModal
        visible={showSecretModal}
        onClose={() => {}}
        onConfirm={handleSecretConfirm}
        isUpdate={false}
      />
    </>
  );
}

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const routeNameRef = useRef<string | undefined>(undefined);

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
    GeistMono_400Regular,
  });

  const fontsLoaded = customFontsLoaded && googleFontsLoaded;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      logSessionStart();
    }
  }, [fontsLoaded, fontError]);

  const onNavigationReady = () => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
  };

  const onNavigationStateChange = () => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (previousRouteName !== currentRouteName && currentRouteName) {
      logScreenView(currentRouteName);
    }
    routeNameRef.current = currentRouteName;
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthPreferenceProvider>
          <WebRTCProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={styles.root}>
                <KeyboardProvider>
                  <AuthSetupWrapper>
                    <NavigationContainer 
                      ref={navigationRef}
                      theme={GriplockDarkTheme}
                      onReady={onNavigationReady}
                      onStateChange={onNavigationStateChange}
                    >
                      <RootStackNavigator />
                    </NavigationContainer>
                    <StatusBar style="light" />
                  </AuthSetupWrapper>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </WebRTCProvider>
        </AuthPreferenceProvider>
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
