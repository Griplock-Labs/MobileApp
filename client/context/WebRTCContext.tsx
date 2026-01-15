import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  RelaySession,
  ConnectionStatus,
  createInitialSession,
  initializeFromQR as initializeRelayFromQR,
  sendWalletAddress as sendWalletAddressRaw,
  sendAttemptUpdate,
  sendSignResult as sendSignResultRaw,
  cleanupSession,
  sendDisconnect as sendDisconnectRaw,
} from '@/lib/websocket-relay';
import { Keypair } from '@solana/web3.js';

export type DisconnectReason = 'peer_closed' | 'connection_failed' | 'room_expired' | 'user_initiated' | 'dashboard_disconnected';

export interface DashboardDisconnectInfo {
  reason: 'user_logout' | 'session_expired' | null;
  address: string | null;
  timestamp: number | null;
}

export interface PeerDisconnectInfo {
  reason: DisconnectReason | null;
  timestamp: number | null;
}

export interface SignRequest {
  type: 'sign_request';
  requestId: string;
  action: 'compress' | 'decompress';
  mint: string;
  symbol: string;
  amount: number;
  timestamp: number;
}

interface WebRTCContextValue {
  session: RelaySession;
  status: ConnectionStatus;
  nfcData: string | null;
  walletAddress: string | null;
  dashboardDisconnect: DashboardDisconnectInfo;
  peerDisconnect: PeerDisconnectInfo;
  pendingSignRequest: SignRequest | null;
  solanaKeypair: Keypair | null;
  initializeFromQR: (qrData: string) => Promise<void>;
  setNfcData: (data: string) => void;
  sendWalletData: (pin: string, nfcDataOverride?: string) => boolean;
  sendWalletAddress: (address: string) => boolean;
  setWalletAddress: (address: string) => void;
  setSolanaKeypair: (keypair: Keypair) => void;
  notifyAttemptUpdate: (attempts: number, maxAttempts: number, isLockedOut: boolean, lockoutEndTime?: number) => boolean;
  sendSignResult: (requestId: string, action: 'compress' | 'decompress', success: boolean, signature?: string, error?: string) => boolean;
  sendDisconnect: () => boolean;
  clearPendingSignRequest: () => void;
  cleanup: (sendDisconnectMsg?: boolean) => void;
  lastMessage: unknown;
}

const WebRTCContext = createContext<WebRTCContextValue | null>(null);

export function WebRTCProvider({ children }: { children: React.ReactNode }) {
  const sessionRef = useRef<RelaySession>(createInitialSession());
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [nfcData, setNfcDataState] = useState<string | null>(null);
  const [walletAddress, setWalletAddressState] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [dashboardDisconnect, setDashboardDisconnect] = useState<DashboardDisconnectInfo>({
    reason: null,
    address: null,
    timestamp: null,
  });
  const [pendingSignRequest, setPendingSignRequest] = useState<SignRequest | null>(null);
  const [solanaKeypair, setSolanaKeypairState] = useState<Keypair | null>(null);
  const [peerDisconnect, setPeerDisconnect] = useState<PeerDisconnectInfo>({
    reason: null,
    timestamp: null,
  });

  const cleanupInternal = useCallback((sendDisconnectMsg = true) => {
    cleanupSession(sessionRef.current, sendDisconnectMsg);
    sessionRef.current = createInitialSession();
    setStatus('disconnected');
    setNfcDataState(null);
    setWalletAddressState(null);
    setLastMessage(null);
    setDashboardDisconnect({ reason: null, address: null, timestamp: null });
    setPeerDisconnect({ reason: null, timestamp: null });
    setPendingSignRequest(null);
    setSolanaKeypairState(null);
  }, []);

  const initializeFromQR = useCallback(async (qrData: string) => {
    console.log('[Relay] initializeFromQR called');
    setDashboardDisconnect({ reason: null, address: null, timestamp: null });
    setPeerDisconnect({ reason: null, timestamp: null });
    try {
      const newSession = await initializeRelayFromQR(
        qrData,
        (newStatus) => {
          console.log('[Relay] Status changed to:', newStatus);
          setStatus(newStatus);
        },
        (message) => {
          console.log('[Relay] Message received:', JSON.stringify(message));
          setLastMessage(message);
          
          if (typeof message === 'object' && message !== null && 'type' in message) {
            const msg = message as { type: string; reason?: string; address?: string; timestamp?: number };
            if (msg.type === 'dashboard_disconnected' || msg.type === 'disconnect') {
              console.log('[Relay] Dashboard/peer disconnected:', msg.reason);
              setDashboardDisconnect({
                reason: (msg.reason as 'user_logout' | 'session_expired') || null,
                address: msg.address || null,
                timestamp: msg.timestamp || null,
              });
              setPeerDisconnect({
                reason: 'dashboard_disconnected',
                timestamp: Date.now(),
              });
            }
            
            if (msg.type === 'sign_request') {
              console.log('[Relay] Sign request received:', msg);
              const signReq = message as SignRequest;
              setPendingSignRequest(signReq);
            }
          }
        },
        (reason) => {
          console.log('[Relay] Peer disconnected, reason:', reason);
          setPeerDisconnect({
            reason,
            timestamp: Date.now(),
          });
        }
      );
      sessionRef.current = newSession;
      console.log('[Relay] Session initialized successfully');
    } catch (error) {
      console.error('[Relay] Failed to initialize:', error);
      sessionRef.current = createInitialSession();
      setStatus('disconnected');
      throw error;
    }
  }, []);

  const setNfcData = useCallback((data: string) => {
    setNfcDataState(data);
  }, []);

  const sendWalletData = useCallback((pin: string, nfcDataOverride?: string): boolean => {
    const data = nfcDataOverride || nfcData;
    console.log('[sendWalletData] Called with data:', data, 'status:', status);
    if (!data) {
      console.log('[sendWalletData] No NFC data available');
      return false;
    }
    console.log('[sendWalletData] NFC data set, ready for wallet derivation');
    return true;
  }, [nfcData, status]);

  const setWalletAddress = useCallback((address: string) => {
    setWalletAddressState(address);
  }, []);

  const sendWalletAddress = useCallback((address: string): boolean => {
    return sendWalletAddressRaw(sessionRef.current, address);
  }, []);

  const notifyAttemptUpdate = useCallback((attempts: number, maxAttempts: number, isLockedOut: boolean, lockoutEndTime?: number): boolean => {
    return sendAttemptUpdate(sessionRef.current, attempts, maxAttempts, isLockedOut, lockoutEndTime);
  }, []);

  const setSolanaKeypair = useCallback((keypair: Keypair) => {
    setSolanaKeypairState(keypair);
  }, []);

  const sendSignResult = useCallback((
    requestId: string,
    action: 'compress' | 'decompress',
    success: boolean,
    signature?: string,
    error?: string
  ): boolean => {
    return sendSignResultRaw(sessionRef.current, requestId, action, success, signature, error);
  }, []);

  const clearPendingSignRequest = useCallback(() => {
    setPendingSignRequest(null);
  }, []);

  const sendDisconnect = useCallback((): boolean => {
    return sendDisconnectRaw(sessionRef.current);
  }, []);

  const cleanup = cleanupInternal;

  return (
    <WebRTCContext.Provider
      value={{
        session: sessionRef.current,
        status,
        nfcData,
        walletAddress,
        dashboardDisconnect,
        peerDisconnect,
        pendingSignRequest,
        solanaKeypair,
        initializeFromQR,
        setNfcData,
        sendWalletData,
        sendWalletAddress,
        setWalletAddress,
        setSolanaKeypair,
        notifyAttemptUpdate,
        sendSignResult,
        sendDisconnect,
        clearPendingSignRequest,
        cleanup,
        lastMessage,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTC(): WebRTCContextValue {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
}
