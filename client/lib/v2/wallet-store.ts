import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha2';
import type {
  WalletId,
  WalletIndex,
  WalletProfile,
  DeviceRecoveryObject,
  RecoveryFileObject,
  PasskeyWrappedShare,
  Bytes,
} from './types';
import { bytesToHex } from './encoding';

const WALLET_INDEX_KEY = 'griplock.wallet_index';
const DEVICE_OBJ_PREFIX = 'griplock.device.';
const PASSKEY_SHARE_PREFIX = 'griplock.passkey.';
const DEVICE_KEY_PREFIX = 'griplock.devkey.';
const RECOVERY_DATA_PREFIX = 'griplock.recovery.';

export async function getWalletIndex(): Promise<WalletIndex> {
  const raw = await SecureStore.getItemAsync(WALLET_INDEX_KEY);
  if (!raw) {
    return { schema: 'griplock.wallets.v2', profiles: {} };
  }
  return JSON.parse(raw);
}

export async function saveWalletIndex(index: WalletIndex): Promise<void> {
  await SecureStore.setItemAsync(WALLET_INDEX_KEY, JSON.stringify(index));
}

export async function addWalletProfile(profile: WalletProfile): Promise<void> {
  const index = await getWalletIndex();
  index.profiles[profile.nfcUidHash] = profile;
  await saveWalletIndex(index);
}

export async function getWalletByNfcUid(nfcUid: string): Promise<WalletProfile | null> {
  const normalized = nfcUid.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  const hash = bytesToHex(sha256(new TextEncoder().encode(normalized)));
  const index = await getWalletIndex();
  return index.profiles[hash] ?? null;
}

export async function getWalletByNfcHash(nfcUidHash: string): Promise<WalletProfile | null> {
  const index = await getWalletIndex();
  return index.profiles[nfcUidHash] ?? null;
}

export async function getAllWallets(): Promise<WalletProfile[]> {
  const index = await getWalletIndex();
  return Object.values(index.profiles);
}

export async function saveDeviceObject(obj: DeviceRecoveryObject): Promise<void> {
  const key = `${DEVICE_OBJ_PREFIX}${obj.walletId}`;
  await SecureStore.setItemAsync(key, JSON.stringify(obj));
}

export async function getDeviceObject(walletId: WalletId): Promise<DeviceRecoveryObject | null> {
  const key = `${DEVICE_OBJ_PREFIX}${walletId}`;
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function savePasskeyShare(share: PasskeyWrappedShare): Promise<void> {
  const key = `${PASSKEY_SHARE_PREFIX}${share.walletId}`;
  await SecureStore.setItemAsync(key, JSON.stringify(share));
}

export async function getPasskeyShare(walletId: WalletId): Promise<PasskeyWrappedShare | null> {
  const key = `${PASSKEY_SHARE_PREFIX}${walletId}`;
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function saveDeviceKey(walletId: WalletId, deviceKey: Bytes): Promise<void> {
  const key = `${DEVICE_KEY_PREFIX}${walletId}`;
  await SecureStore.setItemAsync(key, bytesToHex(deviceKey));
}

export async function getDeviceKey(walletId: WalletId): Promise<Bytes | null> {
  const key = `${DEVICE_KEY_PREFIX}${walletId}`;
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  const bytes = new Uint8Array(raw.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(raw.substr(i * 2, 2), 16);
  }
  return bytes;
}

export async function saveRecoveryData(walletId: WalletId, recoveryFile: RecoveryFileObject): Promise<void> {
  const key = `${RECOVERY_DATA_PREFIX}${walletId}`;
  await SecureStore.setItemAsync(key, JSON.stringify(recoveryFile));
}

export async function getRecoveryData(walletId: WalletId): Promise<RecoveryFileObject | null> {
  const key = `${RECOVERY_DATA_PREFIX}${walletId}`;
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function deleteWallet(walletId: WalletId, nfcUidHash: string): Promise<void> {
  const index = await getWalletIndex();
  delete index.profiles[nfcUidHash];
  await saveWalletIndex(index);

  await SecureStore.deleteItemAsync(`${DEVICE_OBJ_PREFIX}${walletId}`);
  await SecureStore.deleteItemAsync(`${PASSKEY_SHARE_PREFIX}${walletId}`);
  await SecureStore.deleteItemAsync(`${DEVICE_KEY_PREFIX}${walletId}`);
  await SecureStore.deleteItemAsync(`${RECOVERY_DATA_PREFIX}${walletId}`);
}

export function hashNfcUid(uid: string): string {
  const normalized = uid.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  return bytesToHex(sha256(new TextEncoder().encode(normalized)));
}
