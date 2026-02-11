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
import PrivateSendScreen from "@/screens/PrivateSendScreen";
import SendScreen from "@/screens/SendScreen";
import PrivateSendProcessScreen from "@/screens/PrivateSendProcessScreen";
import ShieldProcessScreen from "@/screens/ShieldProcessScreen";
import ProcessingScreen from "@/screens/ProcessingScreen";
import SuccessScreen from "@/screens/SuccessScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import DeriveWalletScreen from "@/screens/DeriveWalletScreen";
import V2SetupScreen from "@/screens/V2SetupScreen";
import V2UnlockScreen from "@/screens/V2UnlockScreen";

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

export type PrivateSendActionParams = {
  source: 'public' | 'shielded';
  recipientAddress: string;
  amount: number;
  walletAddress: string;
};

export type SendActionParams = {
  recipientAddress: string;
  amount: number;
  walletAddress: string;
};

export type RootStackParamList = {
  Home: undefined;
  Wallet: undefined;
  QRScanner: { sessionId: string };
  NFCReader: { sessionId?: string; shieldAction?: ShieldActionParams; privateSendAction?: PrivateSendActionParams; sendAction?: SendActionParams };
  PINInput: { 
    sessionId: string; 
    nfcData: string;
    cardAction?: CardActionParams;
    privacyAction?: PrivacyActionParams;
    shieldAction?: ShieldActionParams;
    privateSendAction?: PrivateSendActionParams;
    sendAction?: SendActionParams;
  };
  SignConfirm: undefined;
  CardAction: undefined;
  PrivacyAction: undefined;
  Receive: undefined;
  ReceivePrivately: undefined;
  WalletDetail: undefined;
  ShieldAmount: { walletAddress: string };
  UnshieldAmount: { walletAddress: string };
  PrivateSend: { walletAddress: string };
  Send: { walletAddress: string };
  PrivateSendProcess: { 
    privateSendAction: PrivateSendActionParams;
    keypairSecretKey: number[];
  };
  ShieldProcess: {
    shieldAction: ShieldActionParams;
    keypairSecretKey: number[];
  };
  Processing: {
    actionType: 'shield' | 'unshield' | 'privateSend' | 'send';
    amount: number;
    source?: 'public' | 'shielded';
    recipient?: string;
    keypairSecretKey: number[];
    unsignedTx?: string;
    walletAddress: string;
  };
  Success: { actionType?: 'shield' | 'unshield' | 'privateSend' | 'privateReceive' | 'send'; amount?: number; amountReceived?: number; signature?: string };
  Settings: undefined;
  DeriveWallet: { nfcData: string };
  V2Setup: { nfcUid: string };
  V2Unlock: {
    nfcUid: string;
    walletProfile: {
      walletId: string;
      nfcUidHash: string;
      address: string;
      createdAt: string;
      authPolicy: {
        pinRequired: boolean;
        secretRequired: boolean;
      };
    };
    shieldAction?: ShieldActionParams;
    privateSendAction?: PrivateSendActionParams;
    sendAction?: SendActionParams;
  };
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
        name="PrivateSend"
        component={PrivateSendScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Send"
        component={SendScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrivateSendProcess"
        component={PrivateSendProcessScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ShieldProcess"
        component={ShieldProcessScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Processing"
        component={ProcessingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Success"
        component={SuccessScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DeriveWallet"
        component={DeriveWalletScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="V2Setup"
        component={V2SetupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="V2Unlock"
        component={V2UnlockScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
