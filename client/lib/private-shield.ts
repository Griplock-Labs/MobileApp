import { 
  Keypair, 
  PublicKey, 
  Transaction, 
  LAMPORTS_PER_SOL,
  VersionedTransaction,
  TransactionMessage,
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

export interface ShieldResult {
  success: boolean;
  signature?: string;
  error?: string;
}

// Minimum balance required for shield (fees + rent + buffer)
const MIN_SHIELD_BALANCE = 0.003 * LAMPORTS_PER_SOL; // 0.003 SOL minimum
// Rent-exempt minimum for account to stay on-chain (~0.00089 SOL) + tx fee buffer
const RENT_EXEMPT_MINIMUM = 890880; // ~0.00089 SOL rent-exempt minimum
const TX_FEE_BUFFER = 10000; // Extra buffer for tx fees

export async function shieldFromStealthAddress(
  stealthKeypair: Keypair,
  recipientPubkey: PublicKey,
  lamports: number
): Promise<ShieldResult> {
  try {
    console.log('[PrivateShield] Starting shield from stealth address...');
    console.log('[PrivateShield] Stealth:', stealthKeypair.publicKey.toBase58());
    console.log('[PrivateShield] Recipient:', recipientPubkey.toBase58());
    console.log('[PrivateShield] Amount:', lamports / LAMPORTS_PER_SOL, 'SOL');

    if (lamports < MIN_SHIELD_BALANCE) {
      return {
        success: false,
        error: `Minimum balance required: ${MIN_SHIELD_BALANCE / LAMPORTS_PER_SOL} SOL`,
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

    // Total fees = tx fee + rent-exempt minimum (payer needs to keep some balance)
    const totalReserved = RENT_EXEMPT_MINIMUM + TX_FEE_BUFFER;
    
    // Build transaction first to calculate exact fee
    const tempCompressIx = await LightSystemProgram.compress({
      payer: stealthKeypair.publicKey,
      toAddress: recipientPubkey,
      lamports: lamports - totalReserved, // Temporary amount
      outputStateTreeInfo: treeInfo,
    });

    // Create message to calculate fee
    const message = new TransactionMessage({
      payerKey: stealthKeypair.publicKey,
      recentBlockhash: blockhash,
      instructions: [tempCompressIx],
    }).compileToV0Message();

    // Calculate exact fee
    const feeResult = await conn.getFeeForMessage(message);
    const txFee = feeResult.value || 5000;
    
    console.log('[PrivateShield] Calculated tx fee:', txFee, 'lamports');
    console.log('[PrivateShield] Rent-exempt reserve:', RENT_EXEMPT_MINIMUM, 'lamports');

    // Calculate shield amount: total - tx fee - rent exempt minimum - buffer
    const shieldAmount = lamports - txFee - RENT_EXEMPT_MINIMUM - TX_FEE_BUFFER;

    console.log('[PrivateShield] Shield amount after fees:', shieldAmount / LAMPORTS_PER_SOL, 'SOL');

    if (shieldAmount <= 0) {
      return {
        success: false,
        error: 'Balance too low to cover transaction fees',
      };
    }

    // Build final transaction with correct amount
    const compressIx = await LightSystemProgram.compress({
      payer: stealthKeypair.publicKey,
      toAddress: recipientPubkey,
      lamports: shieldAmount,
      outputStateTreeInfo: treeInfo,
    });

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: stealthKeypair.publicKey,
    });

    transaction.add(compressIx);
    transaction.sign(stealthKeypair);

    const signature = await conn.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    await conn.confirmTransaction(signature, 'confirmed');

    console.log('[PrivateShield] Shield successful! Signature:', signature);

    return {
      success: true,
      signature,
    };
  } catch (error) {
    console.error('[PrivateShield] Shield failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Shield failed',
    };
  }
}

export async function getCompressedBalance(publicKey: PublicKey): Promise<number> {
  try {
    const rpc = getLightRpc();
    const balance = await rpc.getCompressedBalanceByOwner(publicKey);
    return balance ? Number(balance) / LAMPORTS_PER_SOL : 0;
  } catch (error) {
    console.error('[PrivateShield] Get compressed balance failed:', error);
    return 0;
  }
}
