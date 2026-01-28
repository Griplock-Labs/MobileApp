import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Colors, Fonts } from "@/constants/theme";

import HomeScreen from "@/screens/HomeScreen";
import QRScannerScreen from "@/screens/QRScannerScreen";
import NFCReaderScreen from "@/screens/NFCReaderScreen";
import PINInputScreen from "@/screens/PINInputScreen";
import SignConfirmScreen from "@/screens/SignConfirmScreen";
import CardActionScreen from "@/screens/CardActionScreen";
import PrivacyActionScreen from "@/screens/PrivacyActionScreen";
import WalletScreen from "@/screens/WalletScreen";
import ReceivePrivatelyScreen from "@/screens/ReceivePrivatelyScreen";
import ReceiveScreen from "@/screens/ReceiveScreen";
import WalletDetailScreen from "@/screens/WalletDetailScreen";
import ShieldAmountScreen from "@/screens/ShieldAmountScreen";
import UnshieldAmountScreen from "@/screens/UnshieldAmountScreen";
import SuccessScreen from "@/screens/SuccessScreen";

export type CardActionParams = {
  actionId: string;
  actionType: 'lock' | 'unlock';
  cardPan: string;
  cardholderName: string;
  expiresAt: string;
};

export type PrivacyActionParams = {
  actionId: string;
  actionType: 'shield' | 'unshield';
  walletAddress: string;
  symbol: string;
  amount: number;
  mint: string;
  expiresAt: string;
};

export type ShieldActionParams = {
  type: 'shield' | 'unshield';
  amount: number;
  unsignedTx: string;
  txFee: number;
  walletAddress: string;
};

export type RootStackParamList = {
  Home: undefined;
  Wallet: undefined;
  QRScanner: { sessionId: string };
  NFCReader: { sessionId?: string; shieldAction?: ShieldActionParams };
  PINInput: { 
    sessionId: string; 
    nfcData: string;
    cardAction?: CardActionParams;
    privacyAction?: PrivacyActionParams;
    shieldAction?: ShieldActionParams;
  };
  SignConfirm: undefined;
  CardAction: undefined;
  PrivacyAction: undefined;
  Receive: undefined;
  ReceivePrivately: undefined;
  WalletDetail: undefined;
  ShieldAmount: { walletAddress: string };
  UnshieldAmount: { walletAddress: string };
  Success: { actionType?: 'shield' | 'unshield'; amount?: number; signature?: string };
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
        name="Wallet"
        component={WalletScreen}
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
      <Stack.Screen
        name="PrivacyAction"
        component={PrivacyActionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Receive"
        component={ReceiveScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReceivePrivately"
        component={ReceivePrivatelyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WalletDetail"
        component={WalletDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ShieldAmount"
        component={ShieldAmountScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UnshieldAmount"
        component={UnshieldAmountScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Success"
        component={SuccessScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
