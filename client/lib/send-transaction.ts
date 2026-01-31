import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

const HELIUS_RPC_URL = process.env.EXPO_PUBLIC_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';

export interface SendTransactionParams {
  keypair: Keypair;
  recipientAddress: string;
  amount: number;
}

export interface SendTransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export async function sendSolTransaction(params: SendTransactionParams): Promise<SendTransactionResult> {
  const { keypair, recipientAddress, amount } = params;

  console.log('[SendTx] === SEND TRANSACTION START ===');
  console.log('[SendTx] Sender:', keypair.publicKey.toBase58());
  console.log('[SendTx] Recipient:', recipientAddress);
  console.log('[SendTx] Amount:', amount, 'SOL');

  try {
    const connection = new Connection(HELIUS_RPC_URL, 'confirmed');

    const recipientPubkey = new PublicKey(recipientAddress);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    console.log('[SendTx] Lamports:', lamports);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    console.log('[SendTx] Blockhash:', blockhash);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;

    console.log('[SendTx] Transaction created, signing...');
    transaction.sign(keypair);

    console.log('[SendTx] Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair],
      {
        commitment: 'confirmed',
        maxRetries: 3,
      }
    );

    console.log('[SendTx] === SEND COMPLETE ===');
    console.log('[SendTx] Signature:', signature);

    return {
      success: true,
      signature,
    };
  } catch (error: any) {
    console.error('[SendTx] Error:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}
