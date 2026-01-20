import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Colors, Fonts } from "@/constants/theme";

import HomeScreen from "@/screens/HomeScreen";
import QRScannerScreen from "@/screens/QRScannerScreen";
import NFCReaderScreen from "@/screens/NFCReaderScreen";
import PINInputScreen from "@/screens/PINInputScreen";
import SignConfirmScreen from "@/screens/SignConfirmScreen";
import CardActionScreen from "@/screens/CardActionScreen";

export type CardActionParams = {
  actionId: string;
  actionType: 'lock' | 'unlock';
  cardPan: string;
  cardholderName: string;
  expiresAt: string;
};

export type RootStackParamList = {
  Home: undefined;
  QRScanner: { sessionId: string };
  NFCReader: { sessionId?: string };
  PINInput: { 
    sessionId: string; 
    nfcData: string;
    cardAction?: CardActionParams;
  };
  SignConfirm: undefined;
  CardAction: undefined;
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
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PINInput"
        component={PINInputScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignConfirm"
        component={SignConfirmScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CardAction"
        component={CardActionScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
