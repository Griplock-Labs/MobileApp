import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Colors, Fonts } from "@/constants/theme";

import HomeScreen from "@/screens/HomeScreen";
import QRScannerScreen from "@/screens/QRScannerScreen";
import NFCReaderScreen from "@/screens/NFCReaderScreen";
import PINInputScreen from "@/screens/PINInputScreen";
import SuccessScreen from "@/screens/SuccessScreen";

export type RootStackParamList = {
  Home: undefined;
  QRScanner: { sessionId: string };
  NFCReader: { sessionId: string };
  PINInput: { sessionId: string; nfcData: string };
  Success: { sessionId: string; walletAddress: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBlurEffect: "dark",
        headerTintColor: Colors.dark.primary,
        headerTitleStyle: {
          fontFamily: Fonts.heading,
          fontSize: 18,
          color: Colors.dark.text,
        },
        headerBackTitleVisible: false,
        contentStyle: {
          backgroundColor: Colors.dark.backgroundRoot,
        },
        animation: "fade",
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NFCReader"
        component={NFCReaderScreen}
        options={{ headerTitle: "Tap Card" }}
      />
      <Stack.Screen
        name="PINInput"
        component={PINInputScreen}
        options={{ headerTitle: "Enter PIN" }}
      />
      <Stack.Screen
        name="Success"
        component={SuccessScreen}
        options={{
          headerTitle: "Connected",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
