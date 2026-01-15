import { Keypair, PublicKey, Connection } from '@solana/web3.js';

const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

export interface ZKCompressionResult {
  success: boolean;
  signature: string | null;
  error: string | null;
}

export async function compressTokens(
  keypair: Keypair,
  mint: string,
  amount: number
): Promise<ZKCompressionResult> {
  try {
    console.log('[ZK] Starting compress transaction...');
    console.log('[ZK] Mint:', mint);
    console.log('[ZK] Amount:', amount);
    console.log('[ZK] Owner:', keypair.publicKey.toBase58());

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

    const lightSdk = await import('@lightprotocol/stateless.js');
    const compressedToken = await import('@lightprotocol/compressed-token');

    const rpc = lightSdk.createRpc(SOLANA_RPC_URL, SOLANA_RPC_URL);
    const mintPubkey = new PublicKey(mint);
    const amountLamports = BigInt(Math.floor(amount * 1e9));

    // @ts-expect-error - Light Protocol SDK types may vary, using dynamic import
    const result = await compressedToken.compress(
      rpc,
      keypair,
      mintPubkey,
      amountLamports,
      keypair,
      keypair.publicKey
    );

    const signature = typeof result === 'string' ? result : (result as { txId?: string }).txId || null;

    console.log('[ZK] Compress transaction confirmed:', signature);

    return {
      success: true,
      signature,
      error: null,
    };
  } catch (error) {
    console.error('[ZK] Compress failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      signature: null,
      error: errorMessage,
    };
  }
}

export async function decompressTokens(
  keypair: Keypair,
  mint: string,
  amount: number
): Promise<ZKCompressionResult> {
  try {
    console.log('[ZK] Starting decompress transaction...');
    console.log('[ZK] Mint:', mint);
    console.log('[ZK] Amount:', amount);
    console.log('[ZK] Owner:', keypair.publicKey.toBase58());

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

    const lightSdk = await import('@lightprotocol/stateless.js');
    const compressedToken = await import('@lightprotocol/compressed-token');

    const rpc = lightSdk.createRpc(SOLANA_RPC_URL, SOLANA_RPC_URL);
    const mintPubkey = new PublicKey(mint);
    const amountLamports = BigInt(Math.floor(amount * 1e9));

    // @ts-expect-error - Light Protocol SDK types may vary, using dynamic import
    const result = await compressedToken.decompress(
      rpc,
      keypair,
      mintPubkey,
      amountLamports,
      keypair,
      keypair.publicKey
    );

    const signature = typeof result === 'string' ? result : (result as { txId?: string }).txId || null;

    console.log('[ZK] Decompress transaction confirmed:', signature);

    return {
      success: true,
      signature,
      error: null,
    };
  } catch (error) {
    console.error('[ZK] Decompress failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      signature: null,
      error: errorMessage,
    };
  }
}
