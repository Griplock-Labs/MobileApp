export type Bytes = Uint8Array;
export type WalletId = string;

export type KdfAlgo = 'argon2id' | 'pbkdf2';

export type KdfParams = {
  algo: KdfAlgo;
  mem_kib?: number;
  iters?: number;
  parallelism?: number;
  pbkdf2Iters?: number;
};

export type AeadAlgo = 'xchacha20poly1305' | 'aes256gcm';

export type AeadParams = {
  algo: AeadAlgo;
};

export type ShareLocation = 'file' | 'gdrive' | 'device' | 'passkey';

export type ShamirShare = {
  index: number;
  value: Bytes;
  threshold: 2;
  shareCount: 3;
};

export type EncryptedBlob = {
  version: 1;
  aead: AeadParams;
  nonce: string;
  ciphertext: string;
};

export type KdfEnvelope = {
  version: 1;
  kdf: KdfParams;
  salt: string;
  pinPolicy: {
    pinRequired: boolean;
    secretRequired: boolean;
  };
};

export type RecoveryFileObject = {
  schema: 'griplock.recovery.v2';
  walletId: WalletId;
  createdAt: string;
  updatedAt: string;
  shareA: {
    location: ShareLocation;
    shamirIndex: number;
    kdf: KdfEnvelope;
    enc: EncryptedBlob;
  };
  shareCBackup: {
    shamirIndex: number;
    enc: EncryptedBlob;
  };
  nfc: {
    uidHash: string;
    lastPairedAt?: string;
  };
  passkey: {
    credentialId: string;
    rpId: string;
  };
  device: {
    deviceIdHint?: string;
  };
};

export type DeviceRecoveryObject = {
  schema: 'griplock.recovery.v2';
  walletId: WalletId;
  shareB: {
    location: 'device';
    shamirIndex: number;
    enc: EncryptedBlob;
  };
  session?: {
    encSessionKey?: EncryptedBlob;
    expiresAt?: string;
  };
};

export type PasskeyWrappedShare = {
  walletId: WalletId;
  shareC: {
    location: 'passkey';
    shamirIndex: number;
    enc: EncryptedBlob;
  };
  passkey: {
    credentialId: string;
    rpId: string;
  };
};

export type AuthPolicy = {
  pinRequired: boolean;
  secretRequired: boolean;
};

export type WalletProfile = {
  walletId: WalletId;
  nfcUidHash: string;
  address: string;
  createdAt: string;
  authPolicy: AuthPolicy;
};

export type WalletIndex = {
  schema: 'griplock.wallets.v2';
  profiles: Record<string, WalletProfile>;
};
