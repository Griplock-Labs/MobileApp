# GRIPLOCK V2 Architecture

> Secure Ephemeral Wallet System with 2-of-3 Threshold Recovery

---

## Table of Contents

- [0. TL;DR](#0-tldr)
- [1. Goals & Non-Goals](#1-goals--non-goals)
- [2. Threat Model](#2-threat-model)
- [3. Cryptographic Primitives](#3-cryptographic-primitives)
- [4. Data Structures](#4-data-structures)
  - [4.1 Core Types](#41-core-types)
  - [4.2 Master Root & Shares](#42-master-root--shares)
  - [4.3 Encrypted Containers](#43-encrypted-containers)
  - [4.4 Storage Objects](#44-storage-objects)
- [5. Key Derivation & Access Policies](#5-key-derivation--access-policies)
  - [5.1 User Key (K_user)](#51-user-key-k_user)
  - [5.2 Device Key (K_dev)](#52-device-key-k_dev)
  - [5.3 NFC UID Role](#53-nfc-uid-role)
- [6. Protocol Flows](#6-protocol-flows)
  - [6.1 Wallet Provisioning](#61-wallet-provisioning-create)
  - [6.2 Normal Unlock / Sign](#62-normal-unlock--sign)
  - [6.3 Recovery Scenarios](#63-recovery-scenarios)
- [7. Pseudocode (Engineer-Ready)](#7-pseudocode-engineer-ready)
  - [7.1 Create Wallet](#71-create-wallet)
  - [7.2 Recover Wallet](#72-recover-wallet-drive--passkey)
  - [7.3 Rotate PIN/Secret](#73-rotate-pinsecret)
  - [7.4 Legacy Migration](#74-legacy-migration)
- [8. Implementation Notes](#8-implementation-notes)
- [9. Visual: Share Distribution](#9-visual-share-distribution)
- [10. Recovery Matrix](#10-recovery-matrix)
- [11. Legacy V1 Formula Reference](#11-legacy-v1-formula-reference)
- [12. Share A Storage Phases](#12-share-a-storage-phases)
- [13. Multi-NFC Wallet Support](#13-multi-nfc-wallet-support)
- [14. UI Flows](#14-ui-flows)
- [15. StorageProvider Abstraction](#15-storageprovider-abstraction)
- [16. Future Scaling — Execution & Agent Layer](#16-future-scaling--execution--agent-layer)
  - [16.1 Execution Policy Layer](#161-execution-policy-layer)
  - [16.2 Human Intent Gating](#162-human-intent-gating)
  - [16.3 Agent Execution Compatibility](#163-agent-execution-compatibility)
  - [16.4 Programmable Authorization](#164-programmable-authorization)
  - [16.5 Multi-Wallet & Multi-Chain Expansion](#165-multi-wallet--multi-chain-expansion)
  - [16.6 Autonomous Workflow Infrastructure](#166-autonomous-workflow-infrastructure)
  - [16.7 Custody Boundary Preservation](#167-custody-boundary-preservation)
  - [16.8 Summary](#168-summary)

---

## 0. TL;DR

| Aspect | V1 (Legacy) | V2 (New) |
|--------|-------------|----------|
| **Wallet Source** | Deterministic from PIN/NFC/Secret | Secure random 32 bytes (`MASTER_SECRET`) |
| **PIN/SECRET/NFC Role** | Creates wallet | Policy unlock / intent gate only |
| **Recovery Model** | None (memorize inputs) | 2-of-3 threshold (Shamir) |
| **Recovery Shares** | N/A | Recovery File (MVP) / Google Drive (Phase 2) + Device + Passkey |
| **Share A Storage** | N/A | MVP: Manual file export/import. Phase 2: Google Drive auto-sync |
| **Recovery File** | N/A | Contains Share A + encrypted Share C (passkey fallback) |
| **Passkey Sync** | N/A | iCloud Keychain / Google Password Manager (primary), file fallback |
| **Multi-NFC** | Single NFC | Multiple NFC cards, each = separate wallet profile |
| **Server Custody** | N/A | None — fully non-custodial, no server-held shares |
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

type ShareLocation = "file" | "gdrive" | "device" | "passkey";
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

#### Recovery File Object (Share A + Share C Backup)

The recovery file is a portable encrypted blob that contains **both Share A and an encrypted copy of Share C**. This ensures recovery is possible even when the passkey doesn't sync to a new device.

```typescript
type RecoveryFileObject = {
  schema: "griplock.recovery.v2";
  walletId: WalletId;
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp

  // Share A: Encrypted with K_user (PIN/Secret)
  shareA: {
    location: "file";
    shamirIndex: number;
    kdf: KdfEnvelope;
    enc: EncryptedBlob;
  };

  // Share C backup: Also encrypted with K_user
  // Fallback when passkey doesn't sync to new device
  shareCBackup: {
    shamirIndex: number;
    enc: EncryptedBlob;  // Encrypted with same K_user as Share A
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

// Phase 2: Google Drive auto-sync uses same object structure
// but stored in Google Drive App Data folder (hidden from user)
type DriveRecoveryObject = RecoveryFileObject;
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
│     ├── Share A → encrypt(K_user) → Recovery File            │
│     ├── Share B → encrypt(K_dev)  → Device SecureStore       │
│     ├── Share C → passkey wrap    → Device SecureStore        │
│     └── Share C → encrypt(K_user) → Recovery File (backup)   │
│                                                              │
│  5. EXPORT RECOVERY FILE                                     │
│     ├── MVP: User saves file manually (Drive/iCloud/etc)     │
│     └── Phase 2: Auto-sync to Google Drive App Data folder   │
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
│  PRIMARY PATH (Passkey synced via iCloud/Google):              │
│  Available: Recovery File (Share A + C backup) + Synced       │
│             Passkey (Share C)                                  │
│  Steps:                                                       │
│  1. Import recovery file on new device                        │
│  2. Enter PIN/Secret → decrypt Share A                        │
│  3. Authenticate with synced Passkey → unwrap Share C         │
│  4. Reconstruct MASTER_SECRET from A + C                      │
│  5. Re-provision Device Share B                               │
│                                                               │
│  FALLBACK PATH (Passkey NOT synced):                          │
│  Available: Recovery File (Share A + C backup)                │
│  Steps:                                                       │
│  1. Import recovery file on new device                        │
│  2. Enter PIN/Secret → decrypt Share A AND Share C backup     │
│  3. Reconstruct MASTER_SECRET from A + C                      │
│  4. Re-provision Device Share B                               │
│  5. Register new Passkey, re-wrap Share C                     │
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

  // 7) Also encrypt Share C with K_user for recovery file backup
  const encShareC_backup = aeadEncrypt(shareC.value, K_user, aadFrom(walletId + ":shareC"));

  const recoveryFileObj: RecoveryFileObject = {
    schema: "griplock.recovery.v2",
    walletId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    shareA: {
      location: "file",
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
    shareCBackup: {
      shamirIndex: shareC.index,
      enc: encShareC_backup
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

  // MVP: Export as file for user to save
  // Phase 2: Auto-upload to Google Drive App Data folder
  exportRecoveryFile(walletId, recoveryFileObj);

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

### 7.2 Recover Wallet (From Recovery File)

```typescript
function recoverFromFile(input: {
  recoveryFile: RecoveryFileObject,
  pin?: string,
  secret?: string,
  passkeyAvailable: boolean,  // true if passkey synced to new device
  requireNfcTap?: boolean
}): { masterSecret: Bytes, address: string } {

  // Intent gate (optional)
  if (input.requireNfcTap) {
    requireNfcPresence();
  }

  const fileObj = input.recoveryFile;

  // 1) Decrypt Share A using K_user
  const saltA = fileObj.shareA.kdf.salt;
  const kdfParams = fileObj.shareA.kdf.kdf;

  const K_user = argon2id(
    utf8((input.pin ?? "") + ":" + (input.secret ?? "")),
    saltA,
    kdfParams
  );

  const shareA_value = aeadDecrypt(
    fileObj.shareA.enc,
    K_user,
    aadFrom(fileObj.walletId)
  );
  const shareA: ShamirShare = {
    index: fileObj.shareA.shamirIndex,
    value: shareA_value,
    threshold: 2,
    shareCount: 3
  };

  let shareC: ShamirShare;

  if (input.passkeyAvailable) {
    // PRIMARY PATH: Passkey synced via iCloud/Google
    const shareC_value = passkeyUnwrapShare(
      fileObj.walletId,
      fileObj.passkey.credentialId,
      fileObj.passkey.rpId
    );
    shareC = {
      index: fileObj.shareCBackup.shamirIndex,
      value: shareC_value,
      threshold: 2,
      shareCount: 3
    };
  } else {
    // FALLBACK PATH: Decrypt Share C backup from recovery file
    const shareC_value = aeadDecrypt(
      fileObj.shareCBackup.enc,
      K_user,
      aadFrom(fileObj.walletId + ":shareC")
    );
    shareC = {
      index: fileObj.shareCBackup.shamirIndex,
      value: shareC_value,
      threshold: 2,
      shareCount: 3
    };
  }

  // 3) Reconstruct MASTER_SECRET
  const MASTER_SECRET = shamirCombine([shareA, shareC]);

  // 4) Derive wallet
  const keypair = solanaKeypairFromSeed(MASTER_SECRET);

  // 5) Re-provision device share & new passkey if needed
  // (handled by caller after successful reconstruction)

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
    │  Recovery File  │   │ Device Keychain │   │ Device Keychain │
    │  (User exports) │   │ (Local HW)      │   │ (Passkey-bound) │
    └────────┬────────┘   └─────────────────┘   └────────┬────────┘
             │                                           │
             │           ┌─────────────────┐             │
             └──────────▶│  Recovery File  │◀────────────┘
                         │  contains both  │  (Share C backup
                         │  A + C backup   │   also encrypted
                         └────────┬────────┘   with K_user)
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │  MVP: Manual    │         │  Phase 2:       │
          │  File Export    │         │  Google Drive   │
          │  (Save anywhere)│         │  Auto-Sync      │
          └─────────────────┘         └─────────────────┘
```

### Passkey Sync Strategy

```
┌──────────────────────────────────────────────────────────────┐
│  PASSKEY SYNC (Primary recovery path for phone lost)         │
│                                                               │
│  Apple ecosystem:                                             │
│  • Passkey auto-syncs via iCloud Keychain                    │
│  • Available on new Apple device after iCloud login          │
│                                                               │
│  Google ecosystem:                                            │
│  • Passkey auto-syncs via Google Password Manager            │
│  • Available on new Android device after Google login        │
│                                                               │
│  Cross-ecosystem:                                             │
│  • Passkey does NOT sync between Apple ↔ Android             │
│  • Recovery File fallback kicks in (A + C from file)          │
│                                                               │
│  IMPORTANT: No server-held shares. Fully non-custodial.       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. Recovery Matrix

| Scenario | Available | Missing | Recoverable? | Notes |
|----------|-----------|---------|--------------|-------|
| Phone lost (passkey synced) | A (File) + C (Synced Passkey) | B (Device) | ✅ Yes | Primary path |
| Phone lost (passkey NOT synced) | A + C backup (both from Recovery File) | B (Device), C (Passkey) | ✅ Yes | Fallback — PIN/Secret decrypts both A & C from file |
| PIN forgotten | B (Device) + C (Passkey) | A (encrypted) | ✅ Yes | Passkey + device auth |
| Passkey reset | A (File) + B (Device) | C (Passkey) | ✅ Yes | PIN/Secret + device key |
| File compromised | A + C (ciphertexts) | B, decryption keys | ❌ Attack fails | Argon2id protects |
| Device + Passkey lost | A + C (from file) | B (Device) | ✅ Yes | PIN/Secret decrypts file |
| File lost + device OK | B (Device) + C (Passkey) | A (File) | ✅ Yes | Re-export new file |
| All lost | None | A, B, C | ❌ Unrecoverable | Transfer assets to new wallet |

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

## 12. Share A Storage Phases

### Phase 1: MVP — Manual File Export/Import

The recovery file is exported as an encrypted JSON blob that the user saves manually.

```
┌──────────────────────────────────────────────────────────────┐
│  SHARE A STORAGE — MVP (Phase 1)                              │
│                                                               │
│  CREATE:                                                      │
│  1. Encrypt Share A + Share C → Recovery File                │
│  2. System share sheet opens                                  │
│  3. User saves to: Files, AirDrop, Email, Drive, etc.        │
│                                                               │
│  RECOVER:                                                     │
│  1. User opens app on new/same device                        │
│  2. Tap "Import Recovery File"                               │
│  3. Document picker → select .griplock file                  │
│  4. Enter PIN/Secret to decrypt                              │
│                                                               │
│  File format: griplock-{walletId-short}.enc                   │
│  Content: JSON (RecoveryFileObject) → base64                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Phase 2: Google Drive Auto-Sync

Upgrade path: Same `RecoveryFileObject` structure, stored in Google Drive App Data folder.

```
┌──────────────────────────────────────────────────────────────┐
│  SHARE A STORAGE — Google Drive (Phase 2)                     │
│                                                               │
│  CREATE:                                                      │
│  1. User connects Google account (OAuth)                     │
│  2. Auto-upload encrypted blob to Drive App Data folder      │
│  3. Hidden from user's Drive UI                              │
│  4. Optional: also save locally as backup                    │
│                                                               │
│  RECOVER:                                                     │
│  1. User logs into Google on new device                      │
│  2. App auto-downloads recovery blob                         │
│  3. Enter PIN/Secret to decrypt                              │
│                                                               │
│  UPGRADE FROM MVP:                                            │
│  1. App detects local recovery file exists                   │
│  2. Banner: "Sync to Google Drive?"                          │
│  3. OAuth → upload existing file → Drive becomes primary      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### StorageProvider Abstraction

Clean upgrade path between phases:

```typescript
interface ShareAStorage {
  save(walletId: WalletId, blob: RecoveryFileObject): Promise<void>;
  load(walletId?: WalletId): Promise<RecoveryFileObject>;
  exists(walletId?: WalletId): Promise<boolean>;
  delete(walletId: WalletId): Promise<void>;
}

class LocalFileStorage implements ShareAStorage {
  // MVP: expo-file-system + expo-sharing + expo-document-picker
  async save(walletId, blob) { /* export via share sheet */ }
  async load() { /* import via document picker */ }
  async exists() { /* check local cache */ }
  async delete(walletId) { /* remove local cache */ }
}

class GoogleDriveStorage implements ShareAStorage {
  // Phase 2: expo-auth-session + Google Drive API
  async save(walletId, blob) { /* upload to App Data folder */ }
  async load(walletId) { /* download from App Data folder */ }
  async exists(walletId) { /* check Drive for file */ }
  async delete(walletId) { /* remove from Drive */ }
}
```

---

## 13. Multi-NFC Wallet Support

Each NFC card maps to a separate wallet profile. The NFC UID serves as a wallet identifier/index, NOT a cryptographic input.

### Data Structure

```typescript
type WalletProfile = {
  walletId: WalletId;
  nfcUidHash: string;          // SHA256(normalizedUID) — lookup key
  address: string;             // Solana public key
  createdAt: string;
  authPolicy: {
    pinRequired: boolean;
    secretRequired: boolean;
  };
  // Share B stored in SecureStore keyed by walletId
  // Share C (passkey-wrapped) stored in SecureStore keyed by walletId
  // Recovery file exported per wallet
};

type WalletIndex = {
  schema: "griplock.wallets.v2";
  profiles: Record<string, WalletProfile>;  // key = nfcUidHash
};

// Stored in SecureStore as: "griplock:wallet_index"
```

### Flow

```
┌──────────────────────────────────────────────────────────────┐
│  MULTI-NFC WALLET SUPPORT                                     │
│                                                               │
│  NFC TAP → Read UID                                          │
│     │                                                        │
│     ├── UID hash found in wallet index?                      │
│     │   ├── YES → Load wallet profile → Ask PIN → Unlock     │
│     │   └── NO  → "New NFC card detected"                    │
│     │             → Setup new wallet flow                     │
│     │             → Register in wallet index                  │
│                                                               │
│  Each NFC card has:                                           │
│  • Own MASTER_SECRET                                         │
│  • Own 3 Shamir shares                                       │
│  • Own PIN/Secret                                            │
│  • Own Passkey registration                                  │
│  • Own Recovery File: griplock-{walletId-short}.enc          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 14. UI Flows

### 14.1 Wallet Creation (Setup)

```
┌──────────────────────────────────────────────────────────────┐
│  WALLET CREATION UI FLOW                                      │
│                                                               │
│  Screen 1: NFC Tap                                           │
│  └── "Tap your GRIPLOCK card to begin"                       │
│  └── Read NFC UID → check wallet index                       │
│  └── New card → proceed to setup                             │
│                                                               │
│  Screen 2: Set PIN                                           │
│  └── 6-digit PIN input                                       │
│  └── Confirm PIN                                             │
│                                                               │
│  Screen 3: Optional Secret                                   │
│  └── "Add an extra passphrase?" (toggle)                     │
│  └── If yes: enter secret, confirm secret                    │
│                                                               │
│  Screen 4: Passkey Setup                                     │
│  └── System FaceID/TouchID registration prompt               │
│  └── ✅ "Passkey created"                                    │
│                                                               │
│  Screen 5: Export Recovery File                              │
│  └── "Back up your recovery file"                            │
│  └── [Download Recovery File] → system share sheet           │
│  └── ✅ "Recovery file saved. Keep it safe!"                 │
│                                                               │
│  Screen 6: Success                                           │
│  └── "Wallet created!" + public address                      │
│  └── [Go to Wallet] button                                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 14.2 Unlock (Day-to-Day)

```
┌──────────────────────────────────────────────────────────────┐
│  UNLOCK UI FLOW                                               │
│                                                               │
│  Screen 1: NFC Tap                                           │
│  └── "Tap your GRIPLOCK card"                                │
│  └── Read UID → lookup wallet profile                        │
│                                                               │
│  Screen 2: Enter PIN (+ Secret if configured)                │
│  └── PIN keypad                                              │
│  └── Derive K_user → decrypt Share B (device)                │
│  └── Auto-trigger Passkey (FaceID/TouchID)                   │
│  └── Decrypt Share C                                         │
│                                                               │
│  Screen 3: Wallet Home                                       │
│  └── Balance, actions, transaction history                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 14.3 Recovery

```
┌──────────────────────────────────────────────────────────────┐
│  RECOVERY UI FLOW                                             │
│                                                               │
│  Screen 1: Recovery Options                                  │
│  └── [Import Recovery File]                                  │
│  └── [Restore from Google Drive] (Phase 2)                   │
│                                                               │
│  Screen 2: Import File                                       │
│  └── Document picker → select .griplock file                 │
│  └── Parse RecoveryFileObject                                │
│                                                               │
│  Screen 3: Enter PIN/Secret                                  │
│  └── Based on pinPolicy in file                              │
│  └── Decrypt Share A + Share C backup                        │
│                                                               │
│  Screen 4: Reconstruct                                       │
│  └── Shamir combine (A + C) → MASTER_SECRET                  │
│  └── Derive Solana keypair                                   │
│  └── Show recovered address                                  │
│                                                               │
│  Screen 5: Re-provision                                      │
│  └── Generate new Device key → encrypt Share B               │
│  └── Register new Passkey → wrap Share C                     │
│  └── Export new recovery file (optional)                     │
│                                                               │
│  Screen 6: Transfer Assets                                   │
│  └── "For security, transfer assets to a new wallet"         │
│  └── [Create New Wallet] → sweep assets                      │
│  └── Or [Keep Current Wallet] (user choice)                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 14.4 Google Drive Upgrade (Phase 2)

```
┌──────────────────────────────────────────────────────────────┐
│  GOOGLE DRIVE UPGRADE UI FLOW                                 │
│                                                               │
│  Trigger: App update + local recovery file detected          │
│                                                               │
│  Banner: "Sync backup to Google Drive for easier recovery?"  │
│  └── [Connect Google Drive] → OAuth login                    │
│  └── Auto-upload existing recovery file                      │
│  └── ✅ "Synced! Your backup is now on Google Drive"          │
│                                                               │
│  New wallet creation after upgrade:                           │
│  └── Replaces manual file export with auto-sync              │
│  └── Optional: [Also save locally] for redundancy            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 15. StorageProvider Abstraction

See Section 12 for the `ShareAStorage` interface and implementations. The abstraction layer ensures:

1. **Zero crypto changes** when upgrading from MVP file export to Google Drive
2. **Backward compatible** — users with manual files can still import them
3. **Provider-agnostic** — could extend to iCloud, Dropbox, etc. in the future
4. **Testable** — mock storage provider for unit tests

### Provider Selection Logic

```typescript
function getStorageProvider(): ShareAStorage {
  if (googleDriveConnected()) {
    return new GoogleDriveStorage();
  }
  return new LocalFileStorage();
}
```

---

## 16. Future Scaling — Execution & Agent Layer

Griplock v2's architecture is designed not only for secure wallet custody and recovery, but also for future execution scalability.

By separating wallet root ownership from authentication and execution permissions, Griplock enables programmable transaction workflows without altering the underlying key model.

Wallet derivation remains anchored to a random on-device master secret, while execution logic can evolve independently through policy and intent layers.

### 16.1 Execution Policy Layer

Authentication factors such as NFC, PIN, Secret, and Passkeys form a programmable policy framework governing transaction execution.

Execution policies may define:

- Multi-factor signing requirements
- Transaction value escalation rules
- Time-delayed execution windows
- Session-bound authorization scopes
- Risk-tiered approval thresholds

This allows execution logic to scale without requiring wallet rotation or recovery changes.

### 16.2 Human Intent Gating

Griplock introduces a physical verification layer to ensure that transaction execution always reflects human intent.

NFC operates as an execution confirmation mechanism rather than a cryptographic key.

**Intent gating properties:**

- Physical tap required for high-risk actions
- Prevents remote or silent execution
- Confirms user presence at signing time
- Acts as a safeguard against automated misuse

This model ensures autonomous systems cannot finalize execution without user awareness.

### 16.3 Agent Execution Compatibility

Griplock v2 is designed to support AI agent–initiated transaction workflows.

Agents function as execution initiators, not custodians.

**Security boundaries:**

- Agents never access MASTER_SECRET
- Agents cannot derive private keys
- Execution rights are policy-scoped
- Human verification remains enforceable

**Execution flow:**

```
Agent proposes transaction
         ↓
Policy engine evaluates conditions
         ↓
Authentication requirements triggered
         ↓
Human intent verification (if required)
         ↓
Transaction executed
```

### 16.4 Programmable Authorization

Execution permissions may be dynamically defined across contexts.

| Scenario | Required Authorization |
|----------|------------------------|
| Low-value transfer | PIN |
| High-value transfer | NFC + PIN |
| Contract execution | NFC + Passkey |
| Agent-initiated action | NFC + Passkey |

Policies remain upgradeable without modifying wallet roots or recovery shares.

### 16.5 Multi-Wallet & Multi-Chain Expansion

A single MASTER_SECRET may derive multiple wallet contexts.

**Supported scaling models:**

- Multi-account wallets
- Chain-specific derivation paths
- Context-bound execution rules
- Agent-scoped wallet permissions

This enables ecosystem expansion without duplicating custody infrastructure.

### 16.6 Autonomous Workflow Infrastructure

Griplock's execution layer supports programmable transaction automation.

**Potential workflows include:**

- Subscription payments
- Treasury operations
- Scheduled transfers
- Agent-managed execution pipelines

All automated execution remains subject to policy validation and human gating.

### 16.7 Custody Boundary Preservation

Despite execution scalability, custody guarantees remain unchanged.

**System invariants:**

- MASTER_SECRET never exposed to agents
- Recovery shares remain isolated
- Execution permissions are revocable
- Policy overrides require authentication

Execution scalability does not weaken self-custody assurances.

### 16.8 Summary

Griplock v2 extends beyond wallet security into programmable execution infrastructure.

By separating custody from execution, the architecture enables:

- Agent-compatible transaction workflows
- Policy-driven authentication escalation
- Human-gated autonomous systems
- Multi-wallet and multi-chain scaling

All while preserving full self-custody and eliminating seed phrase dependency.

---

*Document Version: 2.2*
*Last Updated: 2026-02-10*
