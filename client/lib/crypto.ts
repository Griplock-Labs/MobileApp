import pako from 'pako';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { gcm } from '@noble/ciphers/aes.js';
import { getRandomValues } from 'expo-crypto';
import { Keypair } from '@solana/web3.js';

export interface QROfferData {
  type: string;
  sdp?: string;
  pk: string;
  sessionId: string;
  wsUrl?: string;
}

export interface AnswerPayload {
  type: string;
  sdp: string;
  pk: string;
}

export interface EncryptedPayload {
  type: 'encrypted_wallet';
  payload: {
    nonce: string;
    ciphertext: string;
    senderPublicKey: string;
  };
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function decompressOffer(qrData: string): QROfferData {
  const base64 = qrData.replace('griplock:', '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decompressed = pako.inflate(bytes, { to: 'string' });
  return JSON.parse(decompressed);
}

export function compressAnswer(payload: AnswerPayload): string {
  const json = JSON.stringify(payload);
  const compressed = pako.deflate(json);
  let binary = '';
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  return 'griplock:' + btoa(binary);
}

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export function generateKeyPair(): KeyPair {
  const privateKey = new Uint8Array(32);
  getRandomValues(privateKey);
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

export function deriveSharedSecret(privateKey: Uint8Array, peerPublicKeyHex: string): Uint8Array {
  const peerPublicKey = hexToBytes(peerPublicKeyHex);
  const sharedPoint = x25519.getSharedSecret(privateKey, peerPublicKey);
  const sharedSecret = hkdf(sha256, sharedPoint, undefined, new TextEncoder().encode('griplock/shared'), 32);
  return new Uint8Array(sharedSecret);
}

export function encryptPayload(
  sharedSecret: Uint8Array,
  data: { nfcId: string; pin: string },
  senderPublicKey: Uint8Array
): EncryptedPayload {
  const payload = JSON.stringify(data);
  const nonce = new Uint8Array(12);
  getRandomValues(nonce);
  const aes = gcm(sharedSecret, nonce);
  const ciphertext = aes.encrypt(new TextEncoder().encode(payload));

  return {
    type: 'encrypted_wallet',
    payload: {
      nonce: bytesToHex(nonce),
      ciphertext: bytesToHex(ciphertext),
      senderPublicKey: bytesToHex(senderPublicKey),
    },
  };
}

export interface WalletConnectedPayload {
  type: 'wallet_connected';
  payload: {
    nonce: string;
    ciphertext: string;
    senderPublicKey: string;
  };
}

export function encryptWalletAddress(
  sharedSecret: Uint8Array,
  walletAddress: string,
  senderPublicKey: Uint8Array
): WalletConnectedPayload {
  const payload = JSON.stringify({ walletAddress });
  const nonce = new Uint8Array(12);
  getRandomValues(nonce);
  const aes = gcm(sharedSecret, nonce);
  const ciphertext = aes.encrypt(new TextEncoder().encode(payload));

  return {
    type: 'wallet_connected',
    payload: {
      nonce: bytesToHex(nonce),
      ciphertext: bytesToHex(ciphertext),
      senderPublicKey: bytesToHex(senderPublicKey),
    },
  };
}

export function clearSensitiveData(...arrays: Uint8Array[]): void {
  for (const arr of arrays) {
    arr.fill(0);
  }
}

export function normalizeNfcTagId(tagId: string): string {
  return tagId.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
}

export function deriveSolanaAddress(nfcData: string, pin: string): string {
  const normalizedNfc = normalizeNfcTagId(nfcData);
  const combined = `griplock_${normalizedNfc}:${pin}`;
  const seed = sha256(new TextEncoder().encode(combined));
  const keypair = Keypair.fromSeed(seed);
  return keypair.publicKey.toBase58();
}
