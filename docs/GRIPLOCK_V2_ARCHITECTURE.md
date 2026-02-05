# GRIPLOCK V2 Architecture

> Secure Ephemeral Wallet System with 2-of-3 Threshold Recovery

---

## 0. TL;DR

| Aspect | V1 (Legacy) | V2 (New) |
|--------|-------------|----------|
| **Wallet Source** | Deterministic from PIN/NFC/Secret | Secure random 32 bytes (`MASTER_SECRET`) |
| **PIN/SECRET/NFC Role** | Creates wallet | Policy unlock / intent gate only |
| **Recovery Model** | None (memorize inputs) | 2-of-3 threshold (Shamir) |
| **Recovery Shares** | N/A | Google Drive + Device + Passkey |
| **Crypto** | SHA256 (fast, vulnerable) | Argon2id/scrypt + AEAD |
| **NFC UID** | Part of key derivation | Physical presence only |

---

## 1. Goals & Non-Goals

### Goals

- **No deterministic wallet derivation from human input** — wallet root is pure entropy
- **No seed phrase UX** — users don't manage 12/24 words
- **Recovery without paper** — resilient to human error, non-custodial
- **Offline brute-force resistance** — if Drive blob leaks, attacker can't crack it
- **Factor rotation** — change PIN/Secret, re-pair NFC without changing wallet address

### Non-Goals

- **Guaranteed recovery** if user loses ALL factors (Drive locked + device gone + passkey reset)
- **NFC UID as cryptographic secret** — UIDs are not secure, easily skimmed

---

## 2. Threat Model

### Attacker Capabilities

| Threat | Description |
|--------|-------------|
| Drive Dump | Attacker obtains encrypted blobs from Google Drive |
| Device Theft | File system access without biometric/unlock |
| NFC Skimming | Near-field read of NFC UID |
| Offline Brute Force | Attempt to crack PIN/Secret without rate limiting |

### Defenses

| Defense | Mechanism |
|---------|-----------|
| Threshold Security | No single share sufficient for reconstruction |
| Heavy KDF | PIN/Secret always through Argon2id/scrypt + unique salt |
| Hardware-Backed Passkey | Private key non-exportable from Secure Enclave |
| AEAD Encryption | Confidentiality + integrity for all shares |
| Rate Limiting | Optional time-delay before sweep operations |

---

## 3. Cryptographic Primitives

### Recommended Stack

| Purpose | Algorithm | Notes |
|---------|-----------|-------|
| **KDF** | Argon2id | Mobile-tuned params (64 MiB mem, 3 iters) |
| **KDF Alt** | scrypt | If Argon2id unavailable |
| **AEAD** | XChaCha20-Poly1305 | Preferred (24-byte nonce) |
| **AEAD Alt** | AES-256-GCM | Acceptable (12-byte nonce) |
| **Hash** | SHA-256 | For fingerprints, non-secret data |
| **Secret Sharing** | Shamir 2-of-3 | Threshold reconstruction |

### Critical Rules

```
❌ NEVER: SHA256(PIN + ...) as key derivation (too fast)
❌ NEVER: NFC UID as encryption key
✅ ALWAYS: KDF with high memory cost + salt
✅ ALWAYS: NFC UID only for metadata/intent gate
```

---

## 4. Data Structures

### 4.1 Core Types

```typescript
type Bytes = Uint8Array;
type WalletId = string; // UUIDv4 or 16-byte base64url

type KdfParams = {
  algo: "argon2id" | "scrypt";
  // Argon2id
  mem_kib?: number;      // e.g., 65536 (64 MiB)
  iters?: number;        // e.g., 3
  parallelism?: number;  // e.g., 1-2
  // scrypt
  N?: number;
  r?: number;
  p?: number;
};

type AeadParams = {
  algo: "xchacha20poly1305" | "aes256gcm";
};

type ShareLocation = "gdrive" | "device" | "passkey";
```

### 4.2 Master Root & Shares

```typescript
type MasterSecret = Bytes; // 32 bytes (pure entropy)

type ShamirShare = {
  index: number;      // 1, 2, or 3
  value: Bytes;       // Share bytes
  threshold: 2;       // Minimum shares to reconstruct
  shareCount: 3;      // Total shares
};
```

### 4.3 Encrypted Containers

```typescript
type EncryptedBlob = {
  version: 1;
  aead: AeadParams;
  nonce: Bytes;        // 12 bytes (GCM) or 24 bytes (XChaCha)
  ciphertext: Bytes;   // Includes auth tag
  aad?: Bytes;         // Optional associated data
};

type KdfEnvelope = {
  version: 1;
  kdf: KdfParams;
  salt: Bytes;         // Random 16-32 bytes
  pinPolicy: {
    pinRequired: boolean;
    secretRequired: boolean;
  };
};
```

### 4.4 Storage Objects

#### Google Drive Object

```typescript
type DriveRecoveryObject = {
  schema: "griplock.recovery.v2";
  walletId: WalletId;
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp

  // Share A: Encrypted with K_user (PIN/Secret)
  shareA: {
    location: "gdrive";
    shamirIndex: number;
    kdf: KdfEnvelope;
    enc: EncryptedBlob;
  };

  // NFC metadata (UID hash only, not secret)
  nfc: {
    uidHash: string;        // hex(SHA256(normalizedUID))
    lastPairedAt?: string;
  };

  // Passkey binding (public metadata)
  passkey: {
    credentialId: string;   // base64url
    rpId: string;           // e.g., app domain
  };

  device: {
    deviceIdHint?: string;  // Optional, non-sensitive
  };
};
```

#### Device Object (SecureStore/Keychain)

```typescript
type DeviceRecoveryObject = {
  schema: "griplock.recovery.v2";
  walletId: WalletId;

  // Share B: Encrypted with device key
  shareB: {
    location: "device";
    shamirIndex: number;
    enc: EncryptedBlob;
  };

  // Optional session cache
  session?: {
    encSessionKey?: EncryptedBlob;
    expiresAt?: string;
  };
};
```

#### Passkey-Wrapped Share

```typescript
type PasskeyWrappedShare = {
  walletId: WalletId;

  // Share C: Encrypted with passkey-derived key
  shareC: {
    location: "passkey";
    shamirIndex: number;
    enc: EncryptedBlob;
  };

  passkey: {
    credentialId: string;
    rpId: string;
  };
};
```

---

## 5. Key Derivation & Access Policies

### 5.1 User Key (K_user)

Derived from PIN and/or Secret using heavy KDF:

```
K_user = Argon2id(
  input = UTF8(PIN + ":" + SECRET),
  salt  = randomSalt,
  params = {
    mem_kib: 65536,    // 64 MiB
    iters: 3,
    parallelism: 1
  }
) → 32 bytes
```

#### Auth Level Modes

| Mode | Input | Policy |
|------|-------|--------|
| PIN Only | `PIN + ":"` | Enforce rate limiting |
| Secret Only | `":" + SECRET` | Require strong secret |
| Maximum | `PIN + ":" + SECRET` | Both required |

### 5.2 Device Key (K_dev)

- Generated by Secure Enclave / Android Keystore
- Non-exportable
- Used to encrypt Share B

### 5.3 NFC UID Role

| Use | Allowed |
|-----|---------|
| Intent gating ("tap required") | ✅ |
| Session confirmation | ✅ |
| Metadata hash storage | ✅ |
| Encrypt shares | ❌ |
| Derive K_user | ❌ |

---

## 6. Protocol Flows

### 6.1 Wallet Provisioning (Create)

```
┌─────────────────────────────────────────────────────────────┐
│                    WALLET CREATION FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. COLLECT AUTH SETUP                                       │
│     ├── NFC tap → read UID for pairing metadata              │
│     ├── PIN and/or Secret (per auth level)                   │
│     └── Register Passkey (FaceID/TouchID)                    │
│                                                              │
│  2. GENERATE ROOT                                            │
│     └── MASTER_SECRET = SecureRandom(32 bytes)               │
│                                                              │
│  3. SPLIT INTO SHARES                                        │
│     └── (A, B, C) = ShamirSplit(MASTER_SECRET, k=2, n=3)     │
│                                                              │
│  4. ENCRYPT & STORE                                          │
│     ├── Share A → encrypt(K_user) → Google Drive             │
│     ├── Share B → encrypt(K_dev)  → Device SecureStore       │
│     └── Share C → passkey wrap    → Store alongside Drive    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Normal Unlock / Sign

```
┌─────────────────────────────────────────────────────────────┐
│                    UNLOCK / SIGN FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  MINIMUM POLICY:                                             │
│  1. Tap NFC (physical intent gate)                           │
│  2. Passkey OR PIN/Secret (based on auth level)              │
│  3. Decrypt MASTER_SECRET from session cache                 │
│     OR reconstruct from 2 shares on demand                   │
│                                                              │
│  PRACTICAL OPTIMIZATION:                                     │
│  • After successful auth, derive sessionKey                  │
│  • Cache short-lived in SecureStore                          │
│  • Avoid share reconstruction every transaction              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Recovery Scenarios

#### Phone Lost

```
┌──────────────────────────────────────────────────────────────┐
│  RECOVERY: Phone Lost                                         │
│                                                               │
│  Available: Drive (Share A) + Passkey (Share C)               │
│  Missing:   Device (Share B)                                  │
│                                                               │
│  Steps:                                                       │
│  1. Login to Google Drive on new device                       │
│  2. Authenticate with Passkey (FaceID on new device)          │
│  3. Reconstruct MASTER_SECRET from A + C                      │
│  4. Re-provision Device Share B                               │
│  5. Re-pair NFC card                                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### PIN/Secret Forgotten

```
┌──────────────────────────────────────────────────────────────┐
│  RECOVERY: PIN/Secret Forgotten                               │
│                                                               │
│  Available: Device (Share B) + Passkey (Share C)              │
│  Blocked:   Drive (Share A) - can't decrypt without PIN       │
│                                                               │
│  Steps:                                                       │
│  1. Authenticate with Passkey                                 │
│  2. Use Device Share B (already on device)                    │
│  3. Reconstruct MASTER_SECRET from B + C                      │
│  4. Force set new PIN/Secret                                  │
│  5. Re-encrypt Share A with new K_user                        │
│  6. Upload new Drive object                                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Drive Compromised

```
┌──────────────────────────────────────────────────────────────┐
│  THREAT: Drive Blob Leaked                                    │
│                                                               │
│  Attacker has: Share A ciphertext                             │
│  Attacker lacks:                                              │
│  • K_user (needs PIN/Secret + heavy KDF)                      │
│  • Device key (hardware-bound)                                │
│  • Passkey private key (non-exportable)                       │
│                                                               │
│  Result: Cannot reach 2 shares → SAFE                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Passkey Reset

```
┌──────────────────────────────────────────────────────────────┐
│  RECOVERY: Passkey Reset/Lost                                 │
│                                                               │
│  Available: Drive (Share A) + Device (Share B)                │
│  Missing:   Passkey (Share C)                                 │
│                                                               │
│  Steps:                                                       │
│  1. Enter PIN/Secret to decrypt Share A                       │
│  2. Device key decrypts Share B                               │
│  3. Reconstruct MASTER_SECRET from A + B                      │
│  4. Register new Passkey                                      │
│  5. Re-wrap Share C with new Passkey                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Pseudocode (Engineer-Ready)

### 7.1 Create Wallet

```typescript
function createWallet(auth: {
  pin?: string,
  secret?: string,
  passkeyCredentialId: string,
  rpId: string,
  nfcUid?: string
}): { walletId: WalletId, address: string } {

  const walletId = uuidv4();

  // 1) Generate root from pure entropy
  const MASTER_SECRET = secureRandomBytes(32);

  // 2) Derive Solana keypair
  const keypair = solanaKeypairFromSeed(MASTER_SECRET);
  const address = keypair.publicKey.toBase58();

  // 3) Split into 2-of-3 shares
  const shares = shamirSplit(MASTER_SECRET, { threshold: 2, shares: 3 });
  const shareA = shares[0]; // index 1
  const shareB = shares[1]; // index 2
  const shareC = shares[2]; // index 3

  // 4) Encrypt Share A with user key
  const saltA = secureRandomBytes(16);
  const kdfParams = tunedArgon2idParams();
  const K_user = argon2id(
    utf8((auth.pin ?? "") + ":" + (auth.secret ?? "")),
    saltA,
    kdfParams
  );
  const encShareA = aeadEncrypt(shareA.value, K_user, aadFrom(walletId));

  // 5) Encrypt Share B with device keystore key
  const K_dev = deviceKeystoreGetOrCreateSymKey(`griplock:${walletId}`);
  const encShareB = aeadEncrypt(shareB.value, K_dev, aadFrom(walletId));

  // 6) Wrap Share C with passkey
  const passkeyWrap = passkeyWrapShare(
    walletId,
    shareC.value,
    auth.passkeyCredentialId,
    auth.rpId
  );

  // 7) Persist to storage locations
  const driveObj: DriveRecoveryObject = {
    schema: "griplock.recovery.v2",
    walletId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    shareA: {
      location: "gdrive",
      shamirIndex: shareA.index,
      kdf: {
        version: 1,
        kdf: kdfParams,
        salt: saltA,
        pinPolicy: {
          pinRequired: !!auth.pin,
          secretRequired: !!auth.secret
        }
      },
      enc: encShareA
    },
    nfc: {
      uidHash: auth.nfcUid ? sha256Hex(normalizeUid(auth.nfcUid)) : "",
      lastPairedAt: auth.nfcUid ? nowIso() : undefined
    },
    passkey: {
      credentialId: auth.passkeyCredentialId,
      rpId: auth.rpId
    },
    device: {}
  };

  uploadToGoogleDrive(walletId, driveObj);

  const deviceObj: DeviceRecoveryObject = {
    schema: "griplock.recovery.v2",
    walletId,
    shareB: {
      location: "device",
      shamirIndex: shareB.index,
      enc: encShareB
    }
  };
  secureStoreSet(`griplock:${walletId}:recovery`, JSON.stringify(deviceObj));

  storePasskeyWrappedShare(walletId, passkeyWrap);

  return { walletId, address };
}
```

### 7.2 Recover Wallet (Drive + Passkey)

```typescript
function recoverWithDriveAndPasskey(input: {
  walletId: WalletId,
  pin?: string,
  secret?: string,
  requireNfcTap?: boolean
}): { masterSecret: Bytes, address: string } {

  // Intent gate (optional)
  if (input.requireNfcTap) {
    requireNfcPresence();
  }

  // 1) Fetch Drive object
  const driveObj = downloadFromGoogleDrive(input.walletId);

  // 2) Decrypt Share A using K_user
  const saltA = driveObj.shareA.kdf.salt;
  const kdfParams = driveObj.shareA.kdf.kdf;

  const K_user = argon2id(
    utf8((input.pin ?? "") + ":" + (input.secret ?? "")),
    saltA,
    kdfParams
  );

  const shareA_value = aeadDecrypt(
    driveObj.shareA.enc,
    K_user,
    aadFrom(input.walletId)
  );
  const shareA: ShamirShare = {
    index: driveObj.shareA.shamirIndex,
    value: shareA_value,
    threshold: 2,
    shareCount: 3
  };

  // 3) Unwrap Share C with passkey (biometric)
  const shareC_value = passkeyUnwrapShare(
    input.walletId,
    driveObj.passkey.credentialId,
    driveObj.passkey.rpId
  );
  const shareC: ShamirShare = {
    index: 3,
    value: shareC_value,
    threshold: 2,
    shareCount: 3
  };

  // 4) Reconstruct MASTER_SECRET
  const MASTER_SECRET = shamirCombine([shareA, shareC]);

  // 5) Derive wallet
  const keypair = solanaKeypairFromSeed(MASTER_SECRET);
  return {
    masterSecret: MASTER_SECRET,
    address: keypair.publicKey.toBase58()
  };
}
```

### 7.3 Rotate PIN/Secret

```typescript
function rotateUserFactors(
  walletId: WalletId,
  oldPin: string,
  oldSecret: string,
  newPin: string,
  newSecret: string
) {
  const driveObj = downloadFromGoogleDrive(walletId);

  // Decrypt with old credentials
  const K_old = argon2id(
    utf8(oldPin + ":" + oldSecret),
    driveObj.shareA.kdf.salt,
    driveObj.shareA.kdf.kdf
  );
  const shareA_value = aeadDecrypt(
    driveObj.shareA.enc,
    K_old,
    aadFrom(walletId)
  );

  // Encrypt with new credentials
  const saltNew = secureRandomBytes(16);
  const params = tunedArgon2idParams();
  const K_new = argon2id(utf8(newPin + ":" + newSecret), saltNew, params);
  const encNew = aeadEncrypt(shareA_value, K_new, aadFrom(walletId));

  // Update Drive object
  driveObj.shareA.kdf.salt = saltNew;
  driveObj.shareA.kdf.kdf = params;
  driveObj.shareA.kdf.pinPolicy = {
    pinRequired: !!newPin,
    secretRequired: !!newSecret
  };
  driveObj.shareA.enc = encNew;
  driveObj.updatedAt = nowIso();

  uploadToGoogleDrive(walletId, driveObj);
}
```

### 7.4 Legacy Migration

```typescript
// Reconstruct legacy wallet address (V1 formula)
function importLegacyWallet(legacy: {
  pin?: string,
  secret?: string,
  nfcUid: string
}): { legacyAddress: string } {
  const data = `${legacy.pin ?? ""}_griplock_${normalizeUid(legacy.nfcUid)}_${legacy.secret ?? ""}`;
  const seed = sha256Bytes(utf8(data));
  const legacyKeypair = solanaKeypairFromSeed(seed);
  return { legacyAddress: legacyKeypair.publicKey.toBase58() };
}

// Migrate assets to V2 wallet
function migrateLegacyToV2(legacyKeypair: Keypair, newV2Address: string) {
  // Sweep all assets from legacy to new V2 wallet
  sweepAllAssets(legacyKeypair, newV2Address);
  // Mark legacy wallet as read-only
  markLegacyReadOnly();
}
```

---

## 8. Implementation Notes

### Library Recommendations

| Platform | KDF | AEAD | Keystore |
|----------|-----|------|----------|
| React Native | `react-native-argon2` | `@noble/ciphers` | `expo-secure-store` |
| iOS Native | `CryptoKit` | `CryptoKit` | `Keychain` |
| Android | `Tink` | `Tink` | `AndroidKeystore` |

### Mobile-Tuned Argon2id Params

```typescript
const tunedArgon2idParams = (): KdfParams => ({
  algo: "argon2id",
  mem_kib: 65536,    // 64 MiB (adjust for low-end devices)
  iters: 3,          // Time cost
  parallelism: 1     // Single thread for mobile
});
```

### Passkey Implementation Notes

- WebAuthn/FIDO2 for cross-platform
- `expo-local-authentication` for biometric trigger
- Private key never leaves Secure Enclave
- Use `largeBlob` extension if available for share storage
- Otherwise, encrypt share with key derived from assertion

### Rate Limiting

```typescript
const PIN_ATTEMPT_LIMIT = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Exponential backoff between attempts
const getDelayMs = (attempts: number) =>
  Math.min(1000 * Math.pow(2, attempts), 60000);
```

### Cleanup Sensitive Data

```typescript
function clearSensitiveData(...arrays: Uint8Array[]): void {
  for (const arr of arrays) {
    arr.fill(0);
  }
}

// Always clear after use:
// clearSensitiveData(MASTER_SECRET, K_user, shareA_value);
```

---

## 9. Visual: Share Distribution

```
                    ┌─────────────────────────────────────┐
                    │         MASTER_SECRET               │
                    │       (32 bytes entropy)            │
                    └───────────────┬─────────────────────┘
                                    │
                         Shamir Split (2-of-3)
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │    SHARE A      │   │    SHARE B      │   │    SHARE C      │
    │   (index: 1)    │   │   (index: 2)    │   │   (index: 3)    │
    └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
             │                     │                     │
             ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │  Encrypt with   │   │  Encrypt with   │   │  Wrap with      │
    │  K_user (PIN)   │   │  K_dev (HW)     │   │  Passkey        │
    └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
             │                     │                     │
             ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │  Google Drive   │   │ Device Keychain │   │ Passkey-bound   │
    │   (Cloud)       │   │ (Local HW)      │   │ (Biometric)     │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## 10. Recovery Matrix

| Scenario | Available | Missing | Recoverable? |
|----------|-----------|---------|--------------|
| Phone lost | A (Drive) + C (Passkey) | B (Device) | ✅ Yes |
| PIN forgotten | B (Device) + C (Passkey) | A (encrypted) | ✅ Yes |
| Passkey reset | A (Drive) + B (Device) | C (Passkey) | ✅ Yes |
| Drive compromised | A (ciphertext) | B, C | ❌ Attack fails |
| Device + Passkey lost | A (Drive) | B, C | ❌ Need 2 shares |
| All lost | None | A, B, C | ❌ Unrecoverable |

---

## 11. Legacy V1 Formula Reference

For backward compatibility during migration:

```
V1_SEED = SHA256("{PIN}_griplock_{NFC_ID}_{SECRET}")
V1_KEYPAIR = Solana.Keypair.fromSeed(V1_SEED)
```

**⚠️ V1 Vulnerabilities:**
- Fast hash (no KDF) → vulnerable to offline brute force
- NFC UID as key material → skimming risk
- No recovery mechanism → lose inputs = lose wallet
- Factor change = new wallet address

---

*Document Version: 2.0*
*Last Updated: 2026-02-05*
