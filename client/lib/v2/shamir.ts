import { getRandomValues } from 'expo-crypto';
import type { Bytes, ShamirShare } from './types';

const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

function initGF256Tables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_LOG[x] = i;
    x = x ^ (x << 1);
    if (x >= 256) x ^= 0x11b;
  }
  for (let i = 255; i < 512; i++) {
    GF256_EXP[i] = GF256_EXP[i - 255];
  }
}

initGF256Tables();

function gf256Add(a: number, b: number): number {
  return a ^ b;
}

function gf256Mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]];
}

function gf256Div(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  if (a === 0) return 0;
  return GF256_EXP[(GF256_LOG[a] - GF256_LOG[b] + 255) % 255];
}

function evaluatePolynomial(coeffs: number[], x: number): number {
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = gf256Add(gf256Mul(result, x), coeffs[i]);
  }
  return result;
}

export function shamirSplit(
  secret: Bytes,
  threshold: number = 2,
  numShares: number = 3
): ShamirShare[] {
  if (threshold < 2 || threshold > numShares) {
    throw new Error('Invalid threshold/share count');
  }
  if (numShares > 255) {
    throw new Error('Maximum 255 shares');
  }

  const shares: ShamirShare[] = [];
  for (let i = 0; i < numShares; i++) {
    shares.push({
      index: i + 1,
      value: new Uint8Array(secret.length),
      threshold: 2 as const,
      shareCount: 3 as const,
    });
  }

  const randomCoeffs = new Uint8Array(threshold - 1);

  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    getRandomValues(randomCoeffs);
    const coeffs = [secret[byteIdx], ...Array.from(randomCoeffs)];

    for (let shareIdx = 0; shareIdx < numShares; shareIdx++) {
      const x = shareIdx + 1;
      shares[shareIdx].value[byteIdx] = evaluatePolynomial(coeffs, x);
    }
  }

  return shares;
}

export function shamirCombine(shares: ShamirShare[]): Bytes {
  if (shares.length < 2) {
    throw new Error('Need at least 2 shares to reconstruct');
  }

  const secretLength = shares[0].value.length;
  for (const share of shares) {
    if (share.value.length !== secretLength) {
      throw new Error('All shares must have same length');
    }
  }

  const result = new Uint8Array(secretLength);
  const xs = shares.map(s => s.index);

  for (let byteIdx = 0; byteIdx < secretLength; byteIdx++) {
    let secret = 0;

    for (let i = 0; i < shares.length; i++) {
      let lagrange = 1;
      for (let j = 0; j < shares.length; j++) {
        if (i === j) continue;
        const num = xs[j];
        const den = gf256Add(xs[j], xs[i]);
        lagrange = gf256Mul(lagrange, gf256Div(num, den));
      }
      secret = gf256Add(secret, gf256Mul(shares[i].value[byteIdx], lagrange));
    }

    result[byteIdx] = secret;
  }

  return result;
}

export function verifyShares(
  original: Bytes,
  shares: ShamirShare[],
  threshold: number = 2
): boolean {
  for (let i = 0; i < shares.length; i++) {
    for (let j = i + 1; j < shares.length; j++) {
      const pair = [shares[i], shares[j]];
      const reconstructed = shamirCombine(pair);
      for (let k = 0; k < original.length; k++) {
        if (reconstructed[k] !== original[k]) return false;
      }
    }
  }
  return true;
}
