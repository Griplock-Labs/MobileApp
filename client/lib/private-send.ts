import { Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha2';
import { x25519 } from '@noble/curves/ed25519';
import { getRandomValues } from 'expo-crypto';
import { getConnection } from './solana-rpc';

export interface PrivateSendParams {
  senderWallet: Keypair;
  recipientAddress: string;
  amountSol: number;
}

export interface PrivateSendResult {
  success: boolean;
  signature?: string;
  stealthAddress?: string;
  error?: string;
}

export function generateEphemeralKeypair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  console.log('[PrivateSend] Generating ephemeral keypair...');
  const privateKey = new Uint8Array(32);
  getRandomValues(privateKey);
  const publicKey = x25519.getPublicKey(privateKey);
  console.log('[PrivateSend] Ephemeral keypair generated');
  return { privateKey, publicKey };
}

export function deriveStealthKeypair(
  ephemeralPrivateKey: Uint8Array,
  recipientPubkey: PublicKey
): Keypair {
  console.log('[PrivateSend] Deriving stealth keypair for recipient:', recipientPubkey.toBase58());
  const stealthSeed = sha256(
    new Uint8Array([
      ...ephemeralPrivateKey,
      ...recipientPubkey.toBytes(),
      ...new TextEncoder().encode('GRIPLOCK_STEALTH_SEND'),
    ])
  );
  
  const keypair = Keypair.fromSeed(stealthSeed);
  console.log('[PrivateSend] Stealth address generated:', keypair.publicKey.toBase58());
  return keypair;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export async function createPrivateSendTransaction(
  params: PrivateSendParams
): Promise<PrivateSendResult> {
  try {
    const { senderWallet, recipientAddress, amountSol } = params;
    const recipientPubkey = new PublicKey(recipientAddress);
    const lamports = solToLamports(amountSol);
    
    const ephemeral = generateEphemeralKeypair();
    const stealthKeypair = deriveStealthKeypair(ephemeral.privateKey, recipientPubkey);
    
    const connection = getConnection();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
    const STEALTH_RENT = 890880;
    const TOTAL_LAMPORTS = lamports + STEALTH_RENT;
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = senderWallet.publicKey;
    
    tx.add(
      SystemProgram.transfer({
        fromPubkey: senderWallet.publicKey,
        toPubkey: stealthKeypair.publicKey,
        lamports: TOTAL_LAMPORTS,
      })
    );
    
    tx.add(
      SystemProgram.transfer({
        fromPubkey: stealthKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports: lamports,
      })
    );
    
    tx.sign(senderWallet, stealthKeypair);
    
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });
    
    return {
      success: true,
      signature,
      stealthAddress: stealthKeypair.publicKey.toBase58(),
    };
  } catch (error) {
    console.error('Private send failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function createPrivateSendFromShielded(
  senderWallet: Keypair,
  recipientAddress: string,
  amountSol: number
): Promise<PrivateSendResult> {
  console.log('[PrivateSend] === createPrivateSendFromShielded START ===');
  console.log('[PrivateSend] Sender:', senderWallet.publicKey.toBase58());
  console.log('[PrivateSend] Recipient:', recipientAddress);
  console.log('[PrivateSend] Amount SOL:', amountSol);
  
  try {
    const recipientPubkey = new PublicKey(recipientAddress);
    const lamports = solToLamports(amountSol);
    console.log('[PrivateSend] Lamports:', lamports);
    
    console.log('[PrivateSend] Step 1: Generating ephemeral keypair...');
    const ephemeral = generateEphemeralKeypair();
    
    console.log('[PrivateSend] Step 2: Deriving stealth keypair...');
    const stealthKeypair = deriveStealthKeypair(ephemeral.privateKey, recipientPubkey);
    
    console.log('[PrivateSend] Step 3: Getting connection and blockhash...');
    const connection = getConnection();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    console.log('[PrivateSend] Blockhash:', blockhash);
    
    console.log('[PrivateSend] Step 4: Building transaction...');
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = senderWallet.publicKey;
    
    console.log('[PrivateSend] Adding instruction 1: Sender -> Stealth (' + lamports + ' lamports)');
    tx.add(
      SystemProgram.transfer({
        fromPubkey: senderWallet.publicKey,
        toPubkey: stealthKeypair.publicKey,
        lamports: lamports,
      })
    );
    
    console.log('[PrivateSend] Adding instruction 2: Stealth -> Recipient (' + lamports + ' lamports, full amount)');
    tx.add(
      SystemProgram.transfer({
        fromPubkey: stealthKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports: lamports,
      })
    );
    
    console.log('[PrivateSend] Step 5: Signing transaction with sender + stealth keypair...');
    tx.sign(senderWallet, stealthKeypair);
    console.log('[PrivateSend] Transaction signed');
    
    console.log('[PrivateSend] Step 6: Broadcasting transaction...');
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    console.log('[PrivateSend] Transaction sent, signature:', signature);
    
    console.log('[PrivateSend] Step 7: Confirming transaction...');
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });
    console.log('[PrivateSend] Transaction confirmed!');
    
    console.log('[PrivateSend] === SUCCESS ===');
    console.log('[PrivateSend] Signature:', signature);
    console.log('[PrivateSend] Stealth Address:', stealthKeypair.publicKey.toBase58());
    
    return {
      success: true,
      signature,
      stealthAddress: stealthKeypair.publicKey.toBase58(),
    };
  } catch (error) {
    console.error('[PrivateSend] === FAILED ===');
    console.error('[PrivateSend] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export interface UnsignedPrivateSendTx {
  unsignedTx: string;
  stealthKeypair: {
    publicKey: string;
    secretKey: string;
  };
  recipientAddress: string;
  amountLamports: number;
}

export async function buildUnsignedPrivateSendTx(
  senderPubkey: PublicKey,
  recipientAddress: string,
  amountSol: number
): Promise<{ success: boolean; data?: UnsignedPrivateSendTx; error?: string }> {
  try {
    const recipientPubkey = new PublicKey(recipientAddress);
    const lamports = solToLamports(amountSol);
    
    const ephemeral = generateEphemeralKeypair();
    const stealthKeypair = deriveStealthKeypair(ephemeral.privateKey, recipientPubkey);
    
    const connection = getConnection();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = senderPubkey;
    
    tx.add(
      SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: stealthKeypair.publicKey,
        lamports: lamports,
      })
    );
    
    tx.add(
      SystemProgram.transfer({
        fromPubkey: stealthKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports: lamports - 5000,
      })
    );
    
    const serialized = tx.serialize({ requireAllSignatures: false });
    const unsignedTxBase64 = Buffer.from(serialized).toString('base64');
    
    return {
      success: true,
      data: {
        unsignedTx: unsignedTxBase64,
        stealthKeypair: {
          publicKey: stealthKeypair.publicKey.toBase58(),
          secretKey: Buffer.from(stealthKeypair.secretKey).toString('base64'),
        },
        recipientAddress,
        amountLamports: lamports,
      },
    };
  } catch (error) {
    console.error('Build unsigned private send tx failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function signAndBroadcastPrivateSend(
  unsignedTxBase64: string,
  senderWallet: Keypair,
  stealthSecretKeyBase64: string
): Promise<PrivateSendResult> {
  try {
    const txBuffer = Buffer.from(unsignedTxBase64, 'base64');
    const tx = Transaction.from(txBuffer);
    
    const stealthSecretKey = Buffer.from(stealthSecretKeyBase64, 'base64');
    const stealthKeypair = Keypair.fromSecretKey(stealthSecretKey);
    
    tx.sign(senderWallet, stealthKeypair);
    
    const connection = getConnection();
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });
    
    return {
      success: true,
      signature,
      stealthAddress: stealthKeypair.publicKey.toBase58(),
    };
  } catch (error) {
    console.error('Sign and broadcast private send failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
