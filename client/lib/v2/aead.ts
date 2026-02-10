import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { getRandomValues } from 'expo-crypto';
import type { Bytes, EncryptedBlob } from './types';
import { bytesToBase64, base64ToBytes } from './encoding';

const XCHACHA_NONCE_LENGTH = 24;

export function aeadEncrypt(
  plaintext: Bytes,
  key: Bytes,
  aad?: Bytes
): EncryptedBlob {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes');
  }

  const nonce = new Uint8Array(XCHACHA_NONCE_LENGTH);
  getRandomValues(nonce);

  const cipher = xchacha20poly1305(key, nonce, aad);
  const ciphertext = cipher.encrypt(plaintext);

  return {
    version: 1,
    aead: { algo: 'xchacha20poly1305' },
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(ciphertext),
  };
}

export function aeadDecrypt(
  blob: EncryptedBlob,
  key: Bytes,
  aad?: Bytes
): Bytes {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes');
  }

  const nonce = base64ToBytes(blob.nonce);
  const ciphertext = base64ToBytes(blob.ciphertext);

  if (blob.aead.algo !== 'xchacha20poly1305') {
    throw new Error(`Unsupported AEAD algorithm: ${blob.aead.algo}`);
  }

  const cipher = xchacha20poly1305(key, nonce, aad);
  return cipher.decrypt(ciphertext);
}

export function aadFrom(context: string): Bytes {
  return new TextEncoder().encode(`griplock:v2:${context}`);
}
