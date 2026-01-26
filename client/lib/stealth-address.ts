import { Keypair, PublicKey } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha2';
import { x25519 } from '@noble/curves/ed25519';
import { getRandomValues } from 'expo-crypto';
import { bytesToHex, hexToBytes } from './crypto';

export interface StealthAddressResult {
  stealthAddress: PublicKey;
  ephemeralPublicKey: string;
  sharedSecret: Uint8Array;
}

export interface RecipientKeys {
  spendPublicKey: PublicKey;
  viewPublicKey: Uint8Array;
}

export function generateEphemeralKeypair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const privateKey = new Uint8Array(32);
  getRandomValues(privateKey);
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

export function deriveStealthAddress(
  recipientSpendPubkey: PublicKey,
  recipientViewPubkeyHex: string,
  ephemeralPrivateKey: Uint8Array
): StealthAddressResult {
  const recipientViewPubkey = hexToBytes(recipientViewPubkeyHex);
  
  const sharedSecret = x25519.getSharedSecret(ephemeralPrivateKey, recipientViewPubkey);
  
  const stealthScalar = sha256(
    new Uint8Array([
      ...sharedSecret,
      ...recipientSpendPubkey.toBytes(),
    ])
  );
  
  const stealthKeypair = Keypair.fromSeed(stealthScalar);
  
  const ephemeralPublicKey = bytesToHex(x25519.getPublicKey(ephemeralPrivateKey));
  
  return {
    stealthAddress: stealthKeypair.publicKey,
    ephemeralPublicKey,
    sharedSecret,
  };
}

export function recoverStealthKeypair(
  viewPrivateKey: Uint8Array,
  spendKeypair: Keypair,
  ephemeralPublicKeyHex: string
): Keypair {
  const ephemeralPublicKey = hexToBytes(ephemeralPublicKeyHex);
  
  const sharedSecret = x25519.getSharedSecret(viewPrivateKey, ephemeralPublicKey);
  
  const stealthScalar = sha256(
    new Uint8Array([
      ...sharedSecret,
      ...spendKeypair.publicKey.toBytes(),
    ])
  );
  
  return Keypair.fromSeed(stealthScalar);
}

export interface StealthPaymentData {
  stealthAddress: string;
  ephemeralPublicKey: string;
  amount: number;
  mint?: string;
}

export function createStealthPaymentData(
  recipientSpendPubkey: PublicKey,
  recipientViewPubkeyHex: string,
  amount: number,
  mint?: string
): StealthPaymentData {
  const ephemeral = generateEphemeralKeypair();
  const result = deriveStealthAddress(
    recipientSpendPubkey,
    recipientViewPubkeyHex,
    ephemeral.privateKey
  );
  
  return {
    stealthAddress: result.stealthAddress.toBase58(),
    ephemeralPublicKey: result.ephemeralPublicKey,
    amount,
    mint,
  };
}

export interface ViewKeypair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  publicKeyHex: string;
}

export function deriveViewKeypair(spendKeypair: Keypair): ViewKeypair {
  const viewSeed = sha256(
    new Uint8Array([
      ...spendKeypair.secretKey.slice(0, 32),
      ...new TextEncoder().encode('GRIPLOCK_VIEW_KEY'),
    ])
  );
  
  const privateKey = viewSeed;
  const publicKey = x25519.getPublicKey(privateKey);
  
  return {
    privateKey,
    publicKey,
    publicKeyHex: bytesToHex(publicKey),
  };
}

export interface StealthReceiveAddress {
  address: string;
  publicKey: PublicKey;
  keypair: Keypair;
  index: number;
}

export function generateStealthReceiveAddress(
  spendKeypair: Keypair,
  index: number
): StealthReceiveAddress {
  const seed = sha256(
    new Uint8Array([
      ...spendKeypair.secretKey.slice(0, 32),
      ...new TextEncoder().encode(`GRIPLOCK_STEALTH_${index}`),
    ])
  );
  
  const stealthKeypair = Keypair.fromSeed(seed);
  
  return {
    address: stealthKeypair.publicKey.toBase58(),
    publicKey: stealthKeypair.publicKey,
    keypair: stealthKeypair,
    index,
  };
}

export function claimFromStealthAddress(
  stealthKeypair: Keypair,
  destinationPubkey: PublicKey,
  lamports: number
): { fromKeypair: Keypair; toPubkey: PublicKey; lamports: number } {
  return {
    fromKeypair: stealthKeypair,
    toPubkey: destinationPubkey,
    lamports,
  };
}
