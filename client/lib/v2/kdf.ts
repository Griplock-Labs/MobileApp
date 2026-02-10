import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { getRandomValues } from 'expo-crypto';
import type { Bytes, KdfParams } from './types';
import { utf8Encode } from './encoding';

const DEFAULT_PBKDF2_ITERS = 600000;

const DEFAULT_KDF_PARAMS: KdfParams = {
  algo: 'pbkdf2',
  pbkdf2Iters: DEFAULT_PBKDF2_ITERS,
};

export function getDefaultKdfParams(): KdfParams {
  return { ...DEFAULT_KDF_PARAMS };
}

export function generateSalt(length: number = 32): Bytes {
  const salt = new Uint8Array(length);
  getRandomValues(salt);
  return salt;
}

export function deriveUserKey(
  pin: string | undefined,
  secret: string | undefined,
  salt: Bytes,
  params: KdfParams
): Bytes {
  const input = `${pin ?? ''}:${secret ?? ''}`;
  const inputBytes = utf8Encode(input);

  if (params.algo === 'pbkdf2') {
    const iters = params.pbkdf2Iters ?? DEFAULT_PBKDF2_ITERS;
    return pbkdf2(sha256, inputBytes, salt, { c: iters, dkLen: 32 });
  }

  if (params.algo === 'argon2id') {
    console.warn('Argon2id not available, falling back to PBKDF2 with high iterations');
    const iters = DEFAULT_PBKDF2_ITERS;
    return pbkdf2(sha256, inputBytes, salt, { c: iters, dkLen: 32 });
  }

  throw new Error(`Unsupported KDF algorithm: ${params.algo}`);
}

export function deriveDeviceKey(walletId: string): Bytes {
  const seed = utf8Encode(`griplock:device:${walletId}`);
  const key = new Uint8Array(32);
  getRandomValues(key);
  return key;
}

export function clearSensitiveData(...arrays: Bytes[]): void {
  for (const arr of arrays) {
    arr.fill(0);
  }
}
