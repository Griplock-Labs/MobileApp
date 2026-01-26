import { 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL,
  TransactionInstruction 
} from '@solana/web3.js';
import { getConnection, getRecentBlockhash, sendAndConfirmTransaction } from './solana-rpc';
import { createStealthPaymentData, StealthPaymentData } from './stealth-address';

export interface PrivateTransferParams {
  senderKeypair: Keypair;
  recipientSpendPubkey: PublicKey;
  recipientViewPubkeyHex: string;
  amountSol: number;
  mint?: string;
}

export interface PrivateTransferResult {
  success: boolean;
  signature?: string;
  stealthData?: StealthPaymentData;
  error?: string;
}

export async function createPrivateTransfer(
  params: PrivateTransferParams
): Promise<PrivateTransferResult> {
  try {
    const { senderKeypair, recipientSpendPubkey, recipientViewPubkeyHex, amountSol } = params;
    
    console.log('[PrivateTransfer] Creating stealth payment...');
    console.log('[PrivateTransfer] Sender:', senderKeypair.publicKey.toBase58());
    console.log('[PrivateTransfer] Amount:', amountSol, 'SOL');
    
    const stealthData = createStealthPaymentData(
      recipientSpendPubkey,
      recipientViewPubkeyHex,
      amountSol,
      params.mint
    );
    
    console.log('[PrivateTransfer] Stealth address:', stealthData.stealthAddress);
    console.log('[PrivateTransfer] Ephemeral key:', stealthData.ephemeralPublicKey.slice(0, 16) + '...');
    
    const stealthPubkey = new PublicKey(stealthData.stealthAddress);
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    
    const blockhash = await getRecentBlockhash();
    
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderKeypair.publicKey,
    });
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: stealthPubkey,
        lamports,
      })
    );
    
    transaction.add(
      createMemoInstruction(
        `stealth:${stealthData.ephemeralPublicKey}`,
        senderKeypair.publicKey
      )
    );
    
    transaction.sign(senderKeypair);
    
    const serialized = transaction.serialize();
    const signedTxBase64 = Buffer.from(serialized).toString('base64');
    
    console.log('[PrivateTransfer] Transaction signed, sending...');
    
    const result = await sendAndConfirmTransaction(signedTxBase64);
    
    if (result.success) {
      console.log('[PrivateTransfer] Success! Signature:', result.signature);
      return {
        success: true,
        signature: result.signature,
        stealthData,
      };
    } else {
      console.error('[PrivateTransfer] Failed:', result.error);
      return {
        success: false,
        error: result.error,
      };
    }
  } catch (error) {
    console.error('[PrivateTransfer] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function createMemoInstruction(
  memo: string,
  signer: PublicKey
): TransactionInstruction {
  const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, 'utf-8'),
  });
}

export interface ScanStealthPaymentsParams {
  viewPrivateKey: Uint8Array;
  spendKeypair: Keypair;
  startSlot?: number;
}

export async function scanForStealthPayments(
  walletAddress: PublicKey,
  limit: number = 100
): Promise<{ ephemeralKey: string; amount: number; slot: number }[]> {
  try {
    const conn = getConnection();
    const signatures = await conn.getSignaturesForAddress(walletAddress, { limit });
    
    const stealthPayments: { ephemeralKey: string; amount: number; slot: number }[] = [];
    
    for (const sig of signatures) {
      try {
        const tx = await conn.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (tx?.meta?.logMessages) {
          for (const log of tx.meta.logMessages) {
            if (log.includes('stealth:')) {
              const match = log.match(/stealth:([a-f0-9]+)/);
              if (match) {
                const preBalance = tx.meta.preBalances[0] || 0;
                const postBalance = tx.meta.postBalances[0] || 0;
                const amount = (postBalance - preBalance) / LAMPORTS_PER_SOL;
                
                stealthPayments.push({
                  ephemeralKey: match[1],
                  amount,
                  slot: sig.slot,
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('[ScanStealth] Error parsing tx:', sig.signature);
      }
    }
    
    return stealthPayments;
  } catch (error) {
    console.error('[ScanStealth] Error:', error);
    return [];
  }
}
