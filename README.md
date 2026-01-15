# GRIPLOCK Mobile

Mobile companion app for the GRIPLOCK ephemeral crypto wallet system.

## Download

### APK v1.0 Beta

[Download APK](https://expo.dev/artifacts/eas/bV3TdeHmrS8yz6YYHAmWmt.apk)

## Overview

GRIPLOCK is a fully decentralized ephemeral crypto wallet system. Users scan QR codes from the GRIPLOCK dashboard, tap their NFC card, and enter a PIN to derive a wallet address cryptographically. The wallet exists only in memory during the active session.

## Features

- QR code scanning from GRIPLOCK dashboard
- NFC card reading (requires physical hardware)
- 6-digit PIN entry with attempt limiting
- End-to-end encrypted communication (X25519 + AES-GCM)
- Cryptographic wallet derivation (SHA256)
- Dark cyberpunk aesthetic

## Tech Stack

- React Native + Expo
- React Navigation 7+
- @noble/curves, @noble/ciphers, @noble/hashes for cryptography
- WebSocket for real-time communication

## Security

- No persistent wallet storage (ephemeral by design)
- Max 5 PIN attempts per session
- Exponential backoff lockout after failed attempts
- Fully client-side - no backend stores sensitive data

## How It Works

1. Scan QR code from dashboard (contains WebSocket URL)
2. Tap GRIPLOCK NFC card
3. Enter 6-digit PIN
4. Wallet derived locally: `SHA256(griplock_{nfc_id}:{pin})`
5. Wallet address sent encrypted to dashboard

## Requirements

- Android device with NFC support
- Physical GRIPLOCK NFC card
- Connection to GRIPLOCK dashboard

## License

MIT
