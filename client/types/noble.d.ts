declare module '@noble/curves/ed25519' {
  export const x25519: {
    getPublicKey(privateKey: Uint8Array): Uint8Array;
    getSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array;
  };
}

declare module '@noble/hashes/hkdf.js' {
  export function hkdf(
    hash: { create(): unknown },
    ikm: Uint8Array,
    salt: Uint8Array | undefined,
    info: Uint8Array,
    length: number
  ): Uint8Array;
}

declare module '@noble/hashes/sha2.js' {
  export const sha256: {
    create(): unknown;
    (data: Uint8Array): Uint8Array;
  };
}

declare module '@noble/ciphers/aes' {
  interface GCM {
    encrypt(data: Uint8Array): Uint8Array;
    decrypt(data: Uint8Array): Uint8Array;
  }
  export function gcm(key: Uint8Array, nonce: Uint8Array): GCM;
}
