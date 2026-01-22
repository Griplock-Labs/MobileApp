import { Keypair } from '@solana/web3.js';

export interface SignTransactionResult {
  success: boolean;
  signedTx: string | null;
  error: string | null;
}

export async function signUnsignedTransaction(
  keypair: Keypair,
  unsignedTxBase64: string
): Promise<SignTransactionResult> {
  try {
    console.log('[ZK] Signing unsigned transaction...');
    console.log('[ZK] Owner:', keypair.publicKey.toBase58());
    
    const { VersionedTransaction } = await import('@solana/web3.js');
    
    const txBuffer = Buffer.from(unsignedTxBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);
    
    transaction.sign([keypair]);
    
    const signedTxBase64 = Buffer.from(transaction.serialize()).toString('base64');
    
    console.log('[ZK] Transaction signed successfully');
    
    return {
      success: true,
      signedTx: signedTxBase64,
      error: null,
    };
  } catch (error) {
    console.error('[ZK] Sign transaction failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign transaction';
    return {
      success: false,
      signedTx: null,
      error: errorMessage,
    };
  }
}
