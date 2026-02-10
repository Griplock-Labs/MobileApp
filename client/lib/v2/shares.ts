import { getRandomValues } from 'expo-crypto';
import { sha256 } from '@noble/hashes/sha2';
import { Keypair } from '@solana/web3.js';
import { shamirSplit, shamirCombine } from './shamir';
import { aeadEncrypt, aeadDecrypt, aadFrom } from './aead';
import { deriveUserKey, generateSalt, getDefaultKdfParams, clearSensitiveData } from './kdf';
import { bytesToBase64, base64ToBytes, bytesToHex } from './encoding';
import type {
  Bytes,
  WalletId,
  ShamirShare,
  RecoveryFileObject,
  DeviceRecoveryObject,
  PasskeyWrappedShare,
  KdfEnvelope,
  WalletProfile,
} from './types';

function generateWalletId(): WalletId {
  const bytes = new Uint8Array(16);
  getRandomValues(bytes);
  return bytesToHex(bytes);
}

function normalizeNfcUid(uid: string): string {
  return uid.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
}

function hashNfcUid(uid: string): string {
  const normalized = normalizeNfcUid(uid);
  const hash = sha256(new TextEncoder().encode(normalized));
  return bytesToHex(hash);
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface CreateWalletInput {
  pin?: string;
  secret?: string;
  nfcUid: string;
  deviceKey: Bytes;
}

export interface CreateWalletResult {
  walletId: WalletId;
  address: string;
  recoveryFile: RecoveryFileObject;
  deviceObject: DeviceRecoveryObject;
  passkeyShare: {
    index: number;
    value: Bytes;
  };
  walletProfile: WalletProfile;
}

export function createWallet(input: CreateWalletInput): CreateWalletResult {
  const walletId = generateWalletId();

  const masterSecret = new Uint8Array(32);
  getRandomValues(masterSecret);

  const keypair = Keypair.fromSeed(masterSecret);
  const address = keypair.publicKey.toBase58();

  const shares = shamirSplit(masterSecret, 2, 3);
  const shareA = shares[0];
  const shareB = shares[1];
  const shareC = shares[2];

  const saltA = generateSalt(32);
  const kdfParams = getDefaultKdfParams();
  const K_user = deriveUserKey(input.pin, input.secret, saltA, kdfParams);

  const encShareA = aeadEncrypt(shareA.value, K_user, aadFrom(walletId));
  const encShareC_backup = aeadEncrypt(shareC.value, K_user, aadFrom(`${walletId}:shareC`));

  const encShareB = aeadEncrypt(shareB.value, input.deviceKey, aadFrom(walletId));

  const nfcUidHash = hashNfcUid(input.nfcUid);

  const kdfEnvelope: KdfEnvelope = {
    version: 1,
    kdf: kdfParams,
    salt: bytesToBase64(saltA),
    pinPolicy: {
      pinRequired: !!input.pin,
      secretRequired: !!input.secret,
    },
  };

  const recoveryFile: RecoveryFileObject = {
    schema: 'griplock.recovery.v2',
    walletId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    shareA: {
      location: 'file',
      shamirIndex: shareA.index,
      kdf: kdfEnvelope,
      enc: encShareA,
    },
    shareCBackup: {
      shamirIndex: shareC.index,
      enc: encShareC_backup,
    },
    nfc: {
      uidHash: nfcUidHash,
      lastPairedAt: nowIso(),
    },
    passkey: {
      credentialId: '',
      rpId: '',
    },
    device: {},
  };

  const deviceObject: DeviceRecoveryObject = {
    schema: 'griplock.recovery.v2',
    walletId,
    shareB: {
      location: 'device',
      shamirIndex: shareB.index,
      enc: encShareB,
    },
  };

  const walletProfile: WalletProfile = {
    walletId,
    nfcUidHash,
    address,
    createdAt: nowIso(),
    authPolicy: {
      pinRequired: !!input.pin,
      secretRequired: !!input.secret,
    },
  };

  clearSensitiveData(masterSecret, K_user);

  return {
    walletId,
    address,
    recoveryFile,
    deviceObject,
    passkeyShare: {
      index: shareC.index,
      value: shareC.value,
    },
    walletProfile,
  };
}

export interface RecoverFromFileInput {
  recoveryFile: RecoveryFileObject;
  pin?: string;
  secret?: string;
  passkeyShareValue?: Bytes;
}

export interface RecoverResult {
  walletId: WalletId;
  address: string;
  masterSecret: Bytes;
}

export function recoverFromFile(input: RecoverFromFileInput): RecoverResult {
  const fileObj = input.recoveryFile;

  const saltA = base64ToBytes(fileObj.shareA.kdf.salt);
  const kdfParams = fileObj.shareA.kdf.kdf;

  const K_user = deriveUserKey(input.pin, input.secret, saltA, kdfParams);

  const shareA_value = aeadDecrypt(fileObj.shareA.enc, K_user, aadFrom(fileObj.walletId));
  const shareA: ShamirShare = {
    index: fileObj.shareA.shamirIndex,
    value: shareA_value,
    threshold: 2,
    shareCount: 3,
  };

  let shareC: ShamirShare;

  if (input.passkeyShareValue) {
    shareC = {
      index: fileObj.shareCBackup.shamirIndex,
      value: input.passkeyShareValue,
      threshold: 2,
      shareCount: 3,
    };
  } else {
    const shareC_value = aeadDecrypt(
      fileObj.shareCBackup.enc,
      K_user,
      aadFrom(`${fileObj.walletId}:shareC`)
    );
    shareC = {
      index: fileObj.shareCBackup.shamirIndex,
      value: shareC_value,
      threshold: 2,
      shareCount: 3,
    };
  }

  const masterSecret = shamirCombine([shareA, shareC]);

  const keypair = Keypair.fromSeed(masterSecret);

  clearSensitiveData(K_user);

  return {
    walletId: fileObj.walletId,
    address: keypair.publicKey.toBase58(),
    masterSecret,
  };
}

export function unlockWithDeviceAndPasskey(
  deviceObject: DeviceRecoveryObject,
  deviceKey: Bytes,
  passkeyShareValue: Bytes,
  passkeyShareIndex: number
): RecoverResult {
  const shareB_value = aeadDecrypt(
    deviceObject.shareB.enc,
    deviceKey,
    aadFrom(deviceObject.walletId)
  );

  const shareB: ShamirShare = {
    index: deviceObject.shareB.shamirIndex,
    value: shareB_value,
    threshold: 2,
    shareCount: 3,
  };

  const shareC: ShamirShare = {
    index: passkeyShareIndex,
    value: passkeyShareValue,
    threshold: 2,
    shareCount: 3,
  };

  const masterSecret = shamirCombine([shareB, shareC]);
  const keypair = Keypair.fromSeed(masterSecret);

  return {
    walletId: deviceObject.walletId,
    address: keypair.publicKey.toBase58(),
    masterSecret,
  };
}

export function unlockWithPinAndDevice(
  recoveryFile: RecoveryFileObject,
  deviceObject: DeviceRecoveryObject,
  deviceKey: Bytes,
  pin?: string,
  secret?: string
): RecoverResult {
  const saltA = base64ToBytes(recoveryFile.shareA.kdf.salt);
  const kdfParams = recoveryFile.shareA.kdf.kdf;
  const K_user = deriveUserKey(pin, secret, saltA, kdfParams);

  const shareA_value = aeadDecrypt(
    recoveryFile.shareA.enc,
    K_user,
    aadFrom(recoveryFile.walletId)
  );
  const shareA: ShamirShare = {
    index: recoveryFile.shareA.shamirIndex,
    value: shareA_value,
    threshold: 2,
    shareCount: 3,
  };

  const shareB_value = aeadDecrypt(
    deviceObject.shareB.enc,
    deviceKey,
    aadFrom(deviceObject.walletId)
  );
  const shareB: ShamirShare = {
    index: deviceObject.shareB.shamirIndex,
    value: shareB_value,
    threshold: 2,
    shareCount: 3,
  };

  const masterSecret = shamirCombine([shareA, shareB]);
  const keypair = Keypair.fromSeed(masterSecret);

  clearSensitiveData(K_user);

  return {
    walletId: recoveryFile.walletId,
    address: keypair.publicKey.toBase58(),
    masterSecret,
  };
}
