# GRIPLOCK Mobile - Release Notes

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
