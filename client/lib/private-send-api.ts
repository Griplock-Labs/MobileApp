import { Keypair, Transaction } from '@solana/web3.js';
import nacl from 'tweetnacl';

const DASHBOARD_URL = process.env.EXPO_PUBLIC_DASHBOARD_URL || 'https://3c523cdf-759f-4bc9-bad8-d989589f390a-00-lt9jwg5u2kqw.spock.replit.dev';

export interface PreparePrivateSendRequest {
  source: 'public' | 'shielded';
  senderPublicKey: string;
  recipientAddress: string;
  amount: number;
}

export interface PreparePrivateSendResponse {
  success: boolean;
  unsignedTx?: string;
  netAmount?: number;
  fees?: {
    network: number;
    protocol: number;
  };
  amountReceived?: number;
  error?: string;
}

export interface ExecutePrivateSendRequest {
  signedTx: string;
  encryptionSignature: string;
  source: 'public' | 'shielded';
  senderPublicKey: string;
  recipientAddress: string;
  amount: number;
}

export interface ExecutePrivateSendResponse {
  success: boolean;
  signature?: string;
  amountSent?: number;
  amountReceived?: number;
  fees?: {
    network: number;
    protocol: number;
  };
  error?: string;
}

export function signEncryptionMessage(keypair: Keypair): string {
  const message = new TextEncoder().encode('GRIPLOCK_ENCRYPTION_KEY');
  const signature = nacl.sign.detached(message, keypair.secretKey);
  return Buffer.from(signature).toString('base64');
}

export async function preparePrivateSend(
  params: PreparePrivateSendRequest
): Promise<PreparePrivateSendResponse> {
  console.log('[PrivateSendAPI] Preparing private send:', params);
  
  try {
    const response = await fetch(`${DASHBOARD_URL}/api/private-send/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    console.log('[PrivateSendAPI] Prepare response:', data);
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      unsignedTx: data.unsignedTx,
      netAmount: data.netAmount,
      fees: data.fees,
      amountReceived: data.amountReceived,
    };
  } catch (error) {
    console.error('[PrivateSendAPI] Prepare failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function executePrivateSend(
  params: ExecutePrivateSendRequest
): Promise<ExecutePrivateSendResponse> {
  console.log('[PrivateSendAPI] Executing private send...');
  
  try {
    const response = await fetch(`${DASHBOARD_URL}/api/private-send/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    console.log('[PrivateSendAPI] Execute response:', data);
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      signature: data.signature,
      amountSent: data.amountSent,
      amountReceived: data.amountReceived,
      fees: data.fees,
    };
  } catch (error) {
    console.error('[PrivateSendAPI] Execute failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export function signTransaction(
  unsignedTxBase64: string,
  keypair: Keypair
): string {
  const txBuffer = Buffer.from(unsignedTxBase64, 'base64');
  const tx = Transaction.from(txBuffer);
  tx.partialSign(keypair);
  const signedTx = tx.serialize({ requireAllSignatures: false });
  return Buffer.from(signedTx).toString('base64');
}
