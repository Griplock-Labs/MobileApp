# GRIPLOCK Mobile - Release Notes

## v1.3.0 (February 3, 2026)

### New Features
- **Multi-Auth Level System** - User-selectable authentication modes:
  - **NFC + PIN** (Standard) - Tap card + 6-digit PIN
  - **NFC + Secret** (Enhanced) - Tap card + secret phrase (skip PIN)
  - **NFC + PIN + Secret** (Maximum) - Tap card + PIN + secret phrase
- **Settings Screen** - Configure authentication level and manage secret phrase
- **Secret Phrase Setup** - Encrypted storage in SecureStore with setup/update modal
- **First Launch Auth Selection** - Prompts user to select preferred auth level on first app launch
- **Update Checker** - Automatic detection of new app versions from GitHub releases. Shows "UPDATE AVAILABLE" on HomeScreen with tap-to-download link to https://app.griplock.io/
- **Receive Privately Improvements** - Stealth address rotation after each successful private receive, ensuring unique addresses for enhanced privacy
- **DeriveWalletScreen** - Unified full-screen wallet deriving animation across all authentication modes

### UI Components
- **AuthLevelModal** - Selection UI with security strength indicators for each auth mode
- **SecretSetupModal** - Secret phrase entry with confirmation, validation, and visibility toggle

### Improvements
- Consistent UX for wallet derivation regardless of auth mode selected
- Better address index persistence for stealth address generation
- Fixed async file operations in ReceivePrivatelyScreen (proper await on file.text())

### Bug Fixes
- Fixed NaN bug in stealth address index calculation
- Fixed file storage operations not being properly awaited

---

## v1.2.0 (January 31, 2026)

### New Features
- **Private Send** - Send SOL with full sender anonymity via Privacy Cash protocol and stealth addresses
- **Regular Send** - Direct SOL transfers to any Solana address
- **Transaction History** - Comprehensive history view showing all transaction types with retry/refund capabilities
- **Processing Screen** - Real-time status updates with ASCII loader for all transaction flows (shield/unshield/send)
- **Switch Key Button** - Quick wallet key rotation/switching functionality
- **Firebase Analytics** - Complete behavioral analytics with graceful Expo Go fallback (silent mode)
- **Version Display** - App version now shown on HomeScreen ("GRIPLOCK v1.2.0")

### Bug Fixes
- Fixed transaction signing flow edge cases
- Improved error handling for failed NFC reads
- Fixed balance refresh after transactions complete
- Corrected PIN attempt counter reset logic

### Analytics Events Tracked
- `nfc_tap` - Success/failure with error details
- `pin_attempt` - Success/failure with attempt count
- `wallet_derived` - Successful wallet derivation events
- `button_press` - Key button interactions (scan_qr, disconnect, receive, etc.)
- Automatic screen view tracking via NavigationContainer

### Technical Improvements
- EAS Build pre-install hook for google-services.json generation from base64 secret
- Analytics silently disabled in Expo Go (no crashes, console logs only)
- Processing screen with real-time status updates for all transaction types

### Required Secrets (Production Build)
```
GOOGLE_SERVICES_JSON_BASE64=<base64-encoded google-services.json>
```

---

## v1.1.0 (January 28, 2026)

### New Features
- **Mobile-Initiated Shield/Unshield** - Users can now shield (public → private) and unshield (private → public) SOL directly from the mobile app without dashboard connection
- **Standalone Wallet Access** - Mobile app can operate independently to access wallet and execute privacy transactions

### Improvements
- Updated SuccessScreen with inline SVG logo (green gradient) for better Android compatibility
- Synchronized UI styling between ShieldAmountScreen and UnshieldAmountScreen
- Corner bracket SVG input styling with MAX button across amount screens

### Bug Fixes
- Fixed Android build failure caused by corrupt PNG file (was SVG with .png extension)
- Removed unused `griplock-logo-green.png` asset

### Verified Transactions
- Shield: 0.02 SOL → TX `3VNdH2bn38uLUyzosboDvufBmE2rn6w6EotoBkahimheqXPocdffQcnEhnWGYoZGEAt5tM5w8ZXHTSfAxhFgv9zB`
- Unshield: 0.0472 SOL → TX `4ebYJ9igELPBiW2xZSgK7qNBxvgUN7Ty5MKtGVDf99iZ7eppAReqoKXnxzeWeUvma6DPX9JvW1NNBEUKR6PxPV1y`

### Technical Notes
- Requires `EXPO_PUBLIC_HELIUS_RPC_URL` environment variable for RPC connection
- NFC functionality requires native build (EAS Build)
- Light Protocol ZK compression for private balance management

---

## v1.0.5 (January 2026)

### Features
- Dashboard-triggered Shield/Unshield signing
- NFC → PIN → Verify → Sign flow with ownerPublicKey verification
- WebSocket relay connection for dashboard pairing
- Stealth address receive for private transfers
- Real-time public and private (compressed) balance display

### Security
- 6-digit PIN with max 5 attempts per session
- Exponential backoff lockout (5s, 15s, 30s, 60s)
- Ephemeral wallet - no persistent storage
- Wallet derivation: PBKDF2 with 100k iterations

---

## Build Instructions

```bash
# Development APK
npx eas-cli build --platform android --profile development

# Production APK
npx eas-cli build --platform android --profile production
```

### Required EAS Secrets
```
EXPO_PUBLIC_HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```
