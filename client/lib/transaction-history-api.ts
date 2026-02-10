import { Keypair, Transaction, VersionedTransaction, VersionedMessage } from '@solana/web3.js';
import nacl from 'tweetnacl';

const DASHBOARD_URL = process.env.EXPO_PUBLIC_DASHBOARD_URL || '';

export interface PreparePrivateSendRequest {
  source: 'public' | 'shielded';
  senderPublicKey: string;
  recipientAddress: string;
  amount: number;
}

export interface PreparePrivateSendResponse {
  success: boolean;
  quoteId?: string;
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
  quoteId: string;
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
  const url = `${DASHBOARD_URL}/api/private-send/prepare`;
  console.log('[PrivateSend] DASHBOARD_URL:', DASHBOARD_URL);
  console.log('[PrivateSend] Full URL:', url);
  console.log('[PrivateSend] Request params:', params);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const contentType = response.headers.get('content-type');
    console.log('[PrivateSend] Response status:', response.status);
    console.log('[PrivateSend] Response content-type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.log('[PrivateSend] Non-JSON response (first 200 chars):', text.substring(0, 200));
      return {
        success: false,
        error: 'Server returned non-JSON response',
      };
    }
    
    const data = await response.json();
    console.log('[PrivateSend] Prepare response:', data);
    
    if (!response.ok || data.success === false) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      quoteId: data.quoteId,
      unsignedTx: data.unsignedTx,
      netAmount: data.netAmount,
      fees: data.fees,
      amountReceived: data.amountReceived,
    };
  } catch (error) {
    console.error('[PrivateSend] Prepare failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function executePrivateSend(
  params: ExecutePrivateSendRequest
): Promise<ExecutePrivateSendResponse> {
  console.log('[PrivateSend] Executing private send...');
  
  try {
    const response = await fetch(`${DASHBOARD_URL}/api/private-send/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    console.log('[PrivateSend] Execute response:', data);
    
    if (!response.ok || data.success === false) {
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
    console.error('[PrivateSend] Execute failed:', error);
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
  
  try {
    console.log('[signTransaction] Trying VersionedTransaction...');
    const versionedTx = VersionedTransaction.deserialize(txBuffer);
    versionedTx.sign([keypair]);
    const signedTx = versionedTx.serialize();
    console.log('[signTransaction] Signed as VersionedTransaction');
    return Buffer.from(signedTx).toString('base64');
  } catch (versionedError) {
    console.log('[signTransaction] VersionedTransaction failed, trying Legacy...');
    try {
      const tx = Transaction.from(txBuffer);
      tx.partialSign(keypair);
      const signedTx = tx.serialize({ requireAllSignatures: false });
      console.log('[signTransaction] Signed as Legacy Transaction');
      return Buffer.from(signedTx).toString('base64');
    } catch (legacyError) {
      console.error('[signTransaction] Both formats failed');
      throw new Error('Failed to deserialize transaction');
    }
  }
}

export type TransactionType = 'private_send' | 'shield' | 'unshield' | 'transfer' | 'receive';

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  quoteId?: string;
  senderWallet: string;
  recipientWallet: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  currentStep?: 'prepare' | 'transfer' | 'deposit' | 'withdraw' | 'complete';
  errorStep?: 'deposit' | 'withdraw' | null;
  errorMessage?: string | null;
  signature?: string | null;
  transferSignature?: string | null;
  withdrawSignature?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface HistoryResponse {
  success: boolean;
  transactions: WalletTransaction[];
  error?: string;
}

export interface RetryResponse {
  success: boolean;
  signature?: string;
  message?: string;
  error?: string;
}

export interface RefundResponse {
  success: boolean;
  signature?: string;
  amountRefunded?: number;
  message?: string;
  error?: string;
}

export function canRetryOrRefund(tx: WalletTransaction): boolean {
  if (tx.type !== 'private_send') return false;
  
  return (
    tx.status === 'failed' &&
    tx.transferSignature !== null &&
    (tx.errorStep === 'deposit' || tx.errorStep === 'withdraw' ||
     tx.currentStep === 'deposit' || tx.currentStep === 'withdraw')
  );
}

export function getTransactionLabel(type: TransactionType): string {
  switch (type) {
    case 'private_send':
      return 'PRIVATE SEND';
    case 'shield':
      return 'SHIELD';
    case 'unshield':
      return 'UNSHIELD';
    case 'transfer':
      return 'SEND';
    case 'receive':
      return 'RECEIVE';
    default:
      return 'TRANSACTION';
  }
}

export function getTransactionColor(type: TransactionType): string {
  switch (type) {
    case 'private_send':
      return '#00FFCC';
    case 'shield':
      return '#8080FF';
    case 'unshield':
      return '#FF80FF';
    case 'transfer':
      return '#FFFFFF';
    case 'receive':
      return '#00FF00';
    default:
      return '#FFFFFF';
  }
}

export async function fetchTransactionHistory(
  walletAddress: string
): Promise<HistoryResponse> {
  console.log('[TrxHistory] Fetching history for:', walletAddress);

  try {
    const response = await fetch(
      `${DASHBOARD_URL}/api/transactions/history/${walletAddress}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log('[TrxHistory] Endpoint not available (non-JSON response)');
      return {
        success: true,
        transactions: [],
      };
    }

    if (!response.ok) {
      console.log('[TrxHistory] Endpoint returned:', response.status);
      return {
        success: true,
        transactions: [],
      };
    }

    const data = await response.json();
    console.log('[TrxHistory] Response:', data.transactions?.length || 0, 'transactions');
    return data;
  } catch (error) {
    console.error('[TrxHistory] Error:', error);
    return {
      success: true,
      transactions: [],
    };
  }
}

export async function retryTransaction(quoteId: string): Promise<RetryResponse> {
  console.log('[TrxHistory] Retrying transaction:', quoteId);

  try {
    const response = await fetch(
      `${DASHBOARD_URL}/api/private-send/retry/${quoteId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    console.log('[TrxHistory] Retry response:', data);
    return data;
  } catch (error) {
    console.error('[TrxHistory] Retry error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function refundTransaction(quoteId: string): Promise<RefundResponse> {
  console.log('[TrxHistory] Refunding transaction:', quoteId);

  try {
    const response = await fetch(
      `${DASHBOARD_URL}/api/private-send/refund/${quoteId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    console.log('[TrxHistory] Refund response:', data);
    return data;
  } catch (error) {
    console.error('[TrxHistory] Refund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
