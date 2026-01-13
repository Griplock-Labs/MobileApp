# GRIPLOCK Mobile App

A React Native + Expo mobile companion app for the GRIPLOCK ephemeral crypto wallet system.

## Overview

GRIPLOCK enables secure, ephemeral Solana wallet creation through:
1. Scan QR code from GRIPLOCK dashboard
2. Tap your NFC card
3. Enter 6-digit PIN
4. Wallet derived cryptographically (exists only in memory)

## Tech Stack

- **Framework**: React Native + Expo (Development Build required for NFC)
- **Styling**: StyleSheet with cyberpunk/dark theme
- **Navigation**: React Navigation 7+
- **Crypto**: @solana/web3.js, @noble/curves, @noble/ciphers, @noble/hashes

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development (Expo Go - Limited)

```bash
npx expo start
```

Note: NFC features require a native build.

### Build APK with NFC Support

```bash
# Login to Expo
npx eas-cli login

# Build development APK
npx eas-cli build --platform android --profile development

# Build production APK
npx eas-cli build --platform android --profile production
```

## Project Structure

```
client/
├── App.tsx                 # Root app with fonts and navigation
├── components/             # Reusable UI components
├── constants/theme.ts      # Colors, typography, spacing
├── context/                # WebSocket connection state
├── hooks/                  # Custom hooks
├── lib/                    # Crypto and networking utilities
├── navigation/             # Stack navigator
└── screens/                # App screens (Home, QR, NFC, PIN, Success)

assets/images/              # App icons and illustrations
```

## Security

- No persistent wallet storage (ephemeral by design)
- End-to-end encryption using X25519 + AES-GCM
- Solana keypair derived from NFC data + PIN using Ed25519
- Session clears when returning to home screen
- Real NFC hardware required (no simulation mode)

## License

MIT
