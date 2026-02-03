# GRIPLOCK Mobile

Mobile companion app for the GRIPLOCK ephemeral crypto wallet system.

## What is GRIPLOCK?

GRIPLOCK is a privacy and control layer for crypto wallets, enforced through NFC-based physical intent. It reduces unwanted exposure from public wallet interactions by making access, usage, and balance availability dependent on deliberate human action — not persistent software state.

**Funds always remain on-chain. GRIPLOCK changes how and when a wallet becomes usable.**

For complete documentation, visit: **[docs.griplock.io](https://docs.griplock.io/overview/what-is-griplock)**

## Core Concepts

### Physical Intent as a Security Primitive
To activate a wallet session, a user must:
- Be physically present
- Tap an NFC card
- Confirm access locally (PIN)

This removes reliance on always-on private keys, background signers, or remote triggers.

### Ephemeral Wallet Sessions
Keys are derived locally when needed and discarded after use. There is no persistent wallet state — no background wallet, no silent signer, no long-lived session. A wallet session exists only for the duration of user intent.

## Features

- NFC + PIN wallet derivation (ephemeral by design)
- Shield/Unshield SOL (public ↔ private balance)
- Private Send via stealth addresses
- Real-time balance display (public & shielded)
- Dark cyberpunk aesthetic with ASCII loaders
- Automatic update notifications

## Tech Stack

- React Native + Expo
- React Navigation 7+
- @noble/curves, @noble/ciphers, @noble/hashes for cryptography
- Light Protocol for ZK compression
- WebSocket relay for dashboard pairing

## Security

- No persistent wallet storage
- Max 5 PIN attempts per session
- Exponential backoff lockout
- PBKDF2 with 100k iterations for key derivation
- End-to-end encrypted communication (X25519 + AES-GCM)

## Requirements

- Android device with NFC support
- Physical GRIPLOCK NFC card
- GRIPLOCK dashboard connection (for paired operations)

## Download

Get the latest APK at: **[app.griplock.io](https://app.griplock.io/)**

## Documentation

- [What is GRIPLOCK](https://docs.griplock.io/overview/what-is-griplock)
- [Design Principles](https://docs.griplock.io/overview/design-principles)
- [Physical Intent](https://docs.griplock.io/how-it-works/physical-intent)
- [Wallet Session Lifecycle](https://docs.griplock.io/how-it-works/wallet-session-lifecycle)
- [Shielded Interaction Flow](https://docs.griplock.io/how-it-works/shielded-interaction-flow)
- [Key Derivation](https://docs.griplock.io/security/key-derivation)

## License

MIT
