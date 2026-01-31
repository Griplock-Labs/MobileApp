import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import Constants from 'expo-constants';

const HELIUS_RPC_URL = process.env.EXPO_PUBLIC_HELIUS_RPC_URL || Constants.expoConfig?.extra?.HELIUS_RPC_URL;

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    if (!HELIUS_RPC_URL) {
      throw new Error('HELIUS_RPC_URL is not configured');
    }
    connection = new Connection(HELIUS_RPC_URL, 'confirmed');
  }
  return connection;
}

export interface BalanceInfo {
  sol: number;
  lamports: number;
}

export async function getBalance(publicKey: PublicKey): Promise<BalanceInfo> {
  const conn = getConnection();
  const lamports = await conn.getBalance(publicKey);
  return {
    sol: lamports / LAMPORTS_PER_SOL,
    lamports,
  };
}

export async function getRecentBlockhash(): Promise<string> {
  const conn = getConnection();
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  return blockhash;
}

export interface TokenBalance {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
}

export async function getTokenBalances(publicKey: PublicKey): Promise<TokenBalance[]> {
  const conn = getConnection();
  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  });

  return tokenAccounts.value.map((account) => {
    const info = account.account.data.parsed.info;
    return {
      mint: info.mint,
      amount: info.tokenAmount.amount,
      decimals: info.tokenAmount.decimals,
      uiAmount: info.tokenAmount.uiAmount || 0,
    };
  });
}

export async function sendAndConfirmTransaction(
  signedTxBase64: string
): Promise<{ signature: string; success: boolean; error?: string }> {
  try {
    const conn = getConnection();
    const { VersionedTransaction } = await import('@solana/web3.js');
    
    const txBuffer = Buffer.from(signedTxBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);
    
    const signature = await conn.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    const confirmation = await conn.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      return {
        signature,
        success: false,
        error: JSON.stringify(confirmation.value.err),
      };
    }
    
    return { signature, success: true };
  } catch (error) {
    console.error('[RPC] Send transaction failed:', error);
    return {
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}
