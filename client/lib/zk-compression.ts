import { Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction, 
  getAccount, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createSyncNativeInstruction,
  NATIVE_MINT
} from '@solana/spl-token';

const HELIUS_RPC_URL = process.env.EXPO_PUBLIC_HELIUS_RPC_URL || process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Debug: Log which RPC is being used (mask the API key)
const maskedUrl = HELIUS_RPC_URL.replace(/api-key=[^&]+/, 'api-key=***');
console.log('[ZK-INIT] RPC URL configured:', maskedUrl);
console.log('[ZK-INIT] EXPO_PUBLIC_HELIUS_RPC_URL exists:', !!process.env.EXPO_PUBLIC_HELIUS_RPC_URL);
console.log('[ZK-INIT] HELIUS_RPC_URL exists:', !!process.env.HELIUS_RPC_URL);

const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

export interface ZKCompressionResult {
  success: boolean;
  signature: string | null;
  error: string | null;
}

function getUserFriendlyError(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('accountnotinitialized') || message.includes('account to be already initialized')) {
    return 'Your account needs to be set up first. This requires a small amount of SOL.';
  }
  
  if (message.includes('insufficient lamports')) {
    return 'Not enough SOL for transaction fees. Please add some SOL first.';
  }
  
  if (message.includes('insufficient funds') || message.includes('insufficient balance') || message.includes('amount exceeds')) {
    return 'Not enough token balance. Make sure you have the tokens in your wallet.';
  }
  
  if (message.includes('blockhash not found') || message.includes('blockhash expired')) {
    return 'Transaction expired. Please try again.';
  }
  
  if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (message.includes('simulation failed')) {
    if (message.includes('insufficient funds')) {
      return 'Not enough token balance. Make sure you have the tokens in your wallet.';
    }
    const match = error.message.match(/Error Message: ([^"]+)/);
    if (match) {
      return match[1].trim();
    }
    return 'This token does not support this feature yet.';
  }
  
  return error.message;
}

async function ensureTokenAccountExists(
  rpc: any,
  keypair: Keypair,
  mintPubkey: PublicKey
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(mintPubkey, keypair.publicKey);
  
  try {
    await getAccount(rpc, ata);
    console.log('[ZK] Token account exists:', ata.toBase58());
    return ata;
  } catch (error: any) {
    if (error.name === 'TokenAccountNotFoundError') {
      console.log('[ZK] Token account does not exist, creating...');
      
      const createAtaIx = createAssociatedTokenAccountInstruction(
        keypair.publicKey,
        ata,
        keypair.publicKey,
        mintPubkey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const { blockhash } = await rpc.getLatestBlockhash();
      const tx = new Transaction().add(createAtaIx);
      tx.recentBlockhash = blockhash;
      tx.feePayer = keypair.publicKey;
      tx.sign(keypair);
      
      const sig = await rpc.sendRawTransaction(tx.serialize());
      await rpc.confirmTransaction(sig);
      console.log('[ZK] Token account created:', sig);
      
      return ata;
    }
    throw error;
  }
}

async function wrapSolToWsol(
  rpc: any,
  keypair: Keypair,
  amountLamports: bigint
): Promise<string> {
  console.log('[ZK] Wrapping SOL to wSOL...');
  console.log('[ZK] Amount to wrap:', amountLamports.toString(), 'lamports');
  
  const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, keypair.publicKey);
  
  const tx = new Transaction();
  
  try {
    await getAccount(rpc, wsolAta);
    console.log('[ZK] wSOL account exists:', wsolAta.toBase58());
  } catch (error: any) {
    if (error.name === 'TokenAccountNotFoundError') {
      console.log('[ZK] Creating wSOL account...');
      tx.add(
        createAssociatedTokenAccountInstruction(
          keypair.publicKey,
          wsolAta,
          keypair.publicKey,
          NATIVE_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    } else {
      throw error;
    }
  }
  
  tx.add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: wsolAta,
      lamports: amountLamports,
    })
  );
  
  tx.add(createSyncNativeInstruction(wsolAta));
  
  const { blockhash } = await rpc.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = keypair.publicKey;
  tx.sign(keypair);
  
  const sig = await rpc.sendRawTransaction(tx.serialize());
  await rpc.confirmTransaction(sig);
  
  console.log('[ZK] SOL wrapped to wSOL:', sig);
  return sig;
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
    console.log('[ZK] Using RPC:', HELIUS_RPC_URL.includes('helius') ? 'Helius RPC' : 'Fallback RPC');

    const lightSdk = await import('@lightprotocol/stateless.js');
    const compressedToken = await import('@lightprotocol/compressed-token');

    const rpc = lightSdk.createRpc(HELIUS_RPC_URL, HELIUS_RPC_URL);
    const mintPubkey = new PublicKey(mint);
    const amountLamports = BigInt(Math.floor(amount * 1e9));
    
    const isNativeSol = mint === NATIVE_SOL_MINT || mint === NATIVE_MINT.toBase58();
    
    if (isNativeSol) {
      console.log('[ZK] Native SOL detected, auto-wrapping to wSOL...');
      await wrapSolToWsol(rpc, keypair, amountLamports);
    }
    
    const actualMint = isNativeSol ? NATIVE_MINT : mintPubkey;
    const sourceTokenAccount = getAssociatedTokenAddressSync(actualMint, keypair.publicKey);

    console.log('[ZK] Source token account:', sourceTokenAccount.toBase58());
    console.log('[ZK] Amount in lamports:', amountLamports.toString());

    const result = await compressedToken.compress(
      rpc,
      keypair,
      actualMint,
      amountLamports,
      keypair,
      sourceTokenAccount,
      keypair.publicKey
    );

    const signature = typeof result === 'string' ? result : String(result);

    console.log('[ZK] Compress transaction confirmed:', signature);

    return {
      success: true,
      signature,
      error: null,
    };
  } catch (error) {
    console.error('[ZK] Compress failed:', error);
    const errorMessage = error instanceof Error ? getUserFriendlyError(error) : 'Unknown error occurred';
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
    console.log('[ZK] Using RPC:', HELIUS_RPC_URL.includes('helius') ? 'Helius RPC' : 'Fallback RPC');

    const lightSdk = await import('@lightprotocol/stateless.js');
    const compressedToken = await import('@lightprotocol/compressed-token');

    const rpc = lightSdk.createRpc(HELIUS_RPC_URL, HELIUS_RPC_URL);
    const mintPubkey = new PublicKey(mint);
    const amountLamports = BigInt(Math.floor(amount * 1e9));
    
    const isNativeSol = mint === NATIVE_SOL_MINT || mint === NATIVE_MINT.toBase58();
    const actualMint = isNativeSol ? NATIVE_MINT : mintPubkey;
    
    const destinationTokenAccount = await ensureTokenAccountExists(rpc, keypair, actualMint);

    console.log('[ZK] Destination token account:', destinationTokenAccount.toBase58());
    console.log('[ZK] Amount in lamports:', amountLamports.toString());

    const result = await compressedToken.decompress(
      rpc,
      keypair,
      actualMint,
      amountLamports,
      keypair,
      destinationTokenAccount
    );

    const signature = typeof result === 'string' ? result : String(result);

    console.log('[ZK] Decompress transaction confirmed:', signature);

    return {
      success: true,
      signature,
      error: null,
    };
  } catch (error) {
    console.error('[ZK] Decompress failed:', error);
    const errorMessage = error instanceof Error ? getUserFriendlyError(error) : 'Unknown error occurred';
    return {
      success: false,
      signature: null,
      error: errorMessage,
    };
  }
}
