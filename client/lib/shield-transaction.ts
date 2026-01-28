import { 
  Keypair, 
  PublicKey, 
  Transaction, 
  LAMPORTS_PER_SOL,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { getConnection, getRecentBlockhash } from './solana-rpc';
import { 
  Rpc, 
  createRpc, 
  LightSystemProgram,
  selectStateTreeInfo,
} from '@lightprotocol/stateless.js';

let lightRpc: Rpc | null = null;

function getLightRpc(): Rpc {
  if (!lightRpc) {
    const conn = getConnection();
    lightRpc = createRpc(conn.rpcEndpoint, conn.rpcEndpoint);
  }
  return lightRpc;
}

export interface CreateShieldTxResult {
  success: boolean;
  unsignedTx?: string;
  shieldAmount?: number;
  txFee?: number;
  error?: string;
}

export interface CreateUnshieldTxResult {
  success: boolean;
  unsignedTx?: string;
  unshieldAmount?: number;
  txFee?: number;
  error?: string;
}

export interface BroadcastResult {
  success: boolean;
  signature?: string;
  error?: string;
}

const RENT_EXEMPT_MINIMUM = 890880;
const TX_FEE_BUFFER = 10000;
const MIN_SHIELD_AMOUNT = 0.001 * LAMPORTS_PER_SOL;

export async function createShieldTransaction(
  ownerPubkey: PublicKey,
  amountLamports: number
): Promise<CreateShieldTxResult> {
  try {
    console.log('[ShieldTx] Creating shield transaction...');
    console.log('[ShieldTx] Owner:', ownerPubkey.toBase58());
    console.log('[ShieldTx] Amount:', amountLamports / LAMPORTS_PER_SOL, 'SOL');

    if (amountLamports < MIN_SHIELD_AMOUNT) {
      return {
        success: false,
        error: `Minimum shield amount: ${MIN_SHIELD_AMOUNT / LAMPORTS_PER_SOL} SOL`,
      };
    }

    const rpc = getLightRpc();
    const conn = getConnection();
    const blockhash = await getRecentBlockhash();

    const stateTreeInfos = await rpc.getStateTreeInfos();
    const treeInfo = selectStateTreeInfo(stateTreeInfos);

    if (!treeInfo) {
      return {
        success: false,
        error: 'No state tree available',
      };
    }

    const compressIx = await LightSystemProgram.compress({
      payer: ownerPubkey,
      toAddress: ownerPubkey,
      lamports: amountLamports,
      outputStateTreeInfo: treeInfo,
    });

    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 500000,
    });

    const message = new TransactionMessage({
      payerKey: ownerPubkey,
      recentBlockhash: blockhash,
      instructions: [computeBudgetIx, compressIx],
    }).compileToV0Message();

    const feeResult = await conn.getFeeForMessage(message);
    const txFee = feeResult.value || 5000;

    const transaction = new VersionedTransaction(message);
    const unsignedTx = Buffer.from(transaction.serialize()).toString('base64');

    console.log('[ShieldTx] Unsigned tx created, fee:', txFee);

    return {
      success: true,
      unsignedTx,
      shieldAmount: amountLamports,
      txFee,
    };
  } catch (error) {
    console.error('[ShieldTx] Create shield tx failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create shield transaction',
    };
  }
}

export async function createUnshieldTransaction(
  ownerPubkey: PublicKey,
  amountLamports: number
): Promise<CreateUnshieldTxResult> {
  try {
    console.log('[UnshieldTx] Creating unshield transaction...');
    console.log('[UnshieldTx] Owner:', ownerPubkey.toBase58());
    console.log('[UnshieldTx] Amount:', amountLamports / LAMPORTS_PER_SOL, 'SOL');

    if (amountLamports < MIN_SHIELD_AMOUNT) {
      return {
        success: false,
        error: `Minimum unshield amount: ${MIN_SHIELD_AMOUNT / LAMPORTS_PER_SOL} SOL`,
      };
    }

    const rpc = getLightRpc();
    const conn = getConnection();
    const blockhash = await getRecentBlockhash();

    console.log('[UnshieldTx] Fetching compressed accounts...');
    const compressedAccounts = await rpc.getCompressedAccountsByOwner(ownerPubkey);
    
    console.log('[UnshieldTx] Raw response type:', typeof compressedAccounts);
    console.log('[UnshieldTx] Has items?', !!(compressedAccounts as any)?.items);
    
    const items = (compressedAccounts as any)?.items || [];
    console.log('[UnshieldTx] Items count:', items.length);
    
    if (items.length === 0) {
      return {
        success: false,
        error: 'No compressed balance found',
      };
    }

    console.log('[UnshieldTx] First item keys:', Object.keys(items[0] || {}));
    
    const firstHash = items[0]?.hash;
    console.log('[UnshieldTx] First hash keys:', firstHash ? Object.keys(firstHash) : 'none');
    console.log('[UnshieldTx] First hash constructor:', firstHash?.constructor?.name);

    console.log('[UnshieldTx] Getting validity proof...');
    const validityProof = await rpc.getValidityProofV0(items);
    console.log('[UnshieldTx] Validity proof type:', typeof validityProof);
    console.log('[UnshieldTx] Validity proof keys:', Object.keys(validityProof || {}));

    if (!validityProof) {
      return {
        success: false,
        error: 'Failed to get validity proof',
      };
    }

    const proofData = validityProof as any;
    const rootIndices = proofData.rootIndices || proofData.value?.rootIndices || [];
    const compressedProof = proofData.compressedProof || proofData.value?.compressedProof;

    console.log('[UnshieldTx] Root indices count:', rootIndices.length);
    console.log('[UnshieldTx] Has compressed proof:', !!compressedProof);

    const inputAccounts = items.map((acc: any) => {
      const compAcc = acc.compressedAccount || acc;
      return compAcc;
    });

    console.log('[UnshieldTx] Input accounts prepared:', inputAccounts.length);
    console.log('[UnshieldTx] First input account keys:', Object.keys(inputAccounts[0] || {}));

    console.log('[UnshieldTx] Building decompress instruction...');
    const decompressIx = await LightSystemProgram.decompress({
      payer: ownerPubkey,
      toAddress: ownerPubkey,
      lamports: amountLamports,
      inputCompressedAccounts: inputAccounts,
      recentInputStateRootIndices: rootIndices,
      recentValidityProof: compressedProof,
    });

    console.log('[UnshieldTx] Decompress instruction created');

    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 500000,
    });

    const message = new TransactionMessage({
      payerKey: ownerPubkey,
      recentBlockhash: blockhash,
      instructions: [computeBudgetIx, decompressIx],
    }).compileToV0Message();

    const feeResult = await conn.getFeeForMessage(message);
    const txFee = feeResult.value || 5000;

    const transaction = new VersionedTransaction(message);
    const unsignedTx = Buffer.from(transaction.serialize()).toString('base64');

    console.log('[UnshieldTx] Unsigned tx created, fee:', txFee);

    return {
      success: true,
      unsignedTx,
      unshieldAmount: amountLamports,
      txFee,
    };
  } catch (error: any) {
    console.error('[UnshieldTx] Create unshield tx failed:', error?.message || error);
    console.error('[UnshieldTx] Error stack:', error?.stack);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create unshield transaction',
    };
  }
}

export async function signAndBroadcastTransaction(
  keypair: Keypair,
  unsignedTxBase64: string
): Promise<BroadcastResult> {
  try {
    console.log('[Broadcast] Signing and broadcasting...');

    const txBuffer = Buffer.from(unsignedTxBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);
    
    transaction.sign([keypair]);

    const conn = getConnection();
    const signature = await conn.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    await conn.confirmTransaction(signature, 'confirmed');

    console.log('[Broadcast] Success! Signature:', signature);

    return {
      success: true,
      signature,
    };
  } catch (error) {
    console.error('[Broadcast] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to broadcast transaction',
    };
  }
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}
