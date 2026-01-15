import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  WebRTCSession,
  ConnectionStatus,
  createInitialSession,
  initializeWebRTCFromQR,
  sendEncryptedWalletData,
  sendWalletAddress as sendWalletAddressRaw,
  sendAttemptUpdate,
  sendSignResponse as sendSignResponseRaw,
  cleanupSession,
} from '@/lib/webrtc';
import { Keypair } from '@solana/web3.js';

export interface DashboardDisconnectInfo {
  reason: 'user_logout' | 'session_expired' | null;
  address: string | null;
  timestamp: number | null;
}

export interface SignRequest {
  type: 'sign_request';
  action: 'compress' | 'decompress';
  mint: string;
  symbol: string;
  amount: number;
  timestamp: number;
}

interface WebRTCContextValue {
  session: WebRTCSession;
  status: ConnectionStatus;
  compressedAnswer: string | null;
  nfcData: string | null;
  walletAddress: string | null;
  dashboardDisconnect: DashboardDisconnectInfo;
  pendingSignRequest: SignRequest | null;
  solanaKeypair: Keypair | null;
  initializeFromQR: (qrData: string) => Promise<void>;
  setNfcData: (data: string) => void;
  sendWalletData: (pin: string, nfcDataOverride?: string) => boolean;
  sendWalletAddress: (address: string) => boolean;
  setWalletAddress: (address: string) => void;
  setSolanaKeypair: (keypair: Keypair) => void;
  notifyAttemptUpdate: (attempts: number, maxAttempts: number, isLockedOut: boolean) => boolean;
  sendSignResponse: (action: 'compress' | 'decompress', success: boolean, signature: string | null, error: string | null) => boolean;
  clearPendingSignRequest: () => void;
  cleanup: () => void;
  lastMessage: unknown;
}

const WebRTCContext = createContext<WebRTCContextValue | null>(null);

export function WebRTCProvider({ children }: { children: React.ReactNode }) {
  const sessionRef = useRef<WebRTCSession>(createInitialSession());
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [compressedAnswer, setCompressedAnswer] = useState<string | null>(null);
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

  const cleanupInternal = useCallback(() => {
    cleanupSession(sessionRef.current);
    sessionRef.current = createInitialSession();
    setStatus('disconnected');
    setCompressedAnswer(null);
    setNfcDataState(null);
    setWalletAddressState(null);
    setLastMessage(null);
    setDashboardDisconnect({ reason: null, address: null, timestamp: null });
    setPendingSignRequest(null);
    setSolanaKeypairState(null);
  }, []);

  const initializeFromQR = useCallback(async (qrData: string) => {
    console.log('[WebRTC] initializeFromQR called');
    setDashboardDisconnect({ reason: null, address: null, timestamp: null });
    try {
      const newSession = await initializeWebRTCFromQR(
        qrData,
        (newStatus) => {
          console.log('[WebRTC] Status changed to:', newStatus);
          setStatus(newStatus);
        },
        (message) => {
          console.log('[WebRTC] Message received:', JSON.stringify(message));
          setLastMessage(message);
          
          if (typeof message === 'object' && message !== null && 'type' in message) {
            const msg = message as { type: string; reason?: string; address?: string; timestamp?: number };
            if (msg.type === 'dashboard_disconnected') {
              console.log('[WebRTC] Dashboard disconnected:', msg.reason);
              setDashboardDisconnect({
                reason: (msg.reason as 'user_logout' | 'session_expired') || null,
                address: msg.address || null,
                timestamp: msg.timestamp || null,
              });
            }
            
            if (msg.type === 'sign_request') {
              console.log('[WebRTC] Sign request received:', msg);
              const signReq = message as SignRequest;
              setPendingSignRequest(signReq);
            }
          }
        }
      );
      sessionRef.current = newSession;
      setCompressedAnswer(newSession.compressedAnswer);
      console.log('[WebRTC] Session initialized, hasSecret:', !!newSession.sharedSecret);
    } catch (error) {
      console.error('[WebRTC] Failed to initialize:', error);
      sessionRef.current = createInitialSession();
      setStatus('disconnected');
      setCompressedAnswer(null);
      throw error;
    }
  }, []);

  const setNfcData = useCallback((data: string) => {
    setNfcDataState(data);
  }, []);

  const sendWalletData = useCallback((pin: string, nfcDataOverride?: string): boolean => {
    const data = nfcDataOverride || nfcData;
    console.log('[sendWalletData] Called with data:', data, 'status:', status);
    console.log('[sendWalletData] Session:', { 
      hasWebsocket: !!sessionRef.current.websocket,
      wsState: sessionRef.current.websocket?.readyState,
      hasSecret: !!sessionRef.current.sharedSecret,
      hasKeyPair: !!sessionRef.current.keyPair
    });
    if (!data) {
      console.log('[sendWalletData] No NFC data available');
      return false;
    }
    return sendEncryptedWalletData(sessionRef.current, data, pin);
  }, [nfcData, status]);

  const setWalletAddress = useCallback((address: string) => {
    setWalletAddressState(address);
  }, []);

  const sendWalletAddress = useCallback((address: string): boolean => {
    return sendWalletAddressRaw(sessionRef.current, address);
  }, []);

  const notifyAttemptUpdate = useCallback((attempts: number, maxAttempts: number, isLockedOut: boolean): boolean => {
    return sendAttemptUpdate(sessionRef.current, attempts, maxAttempts, isLockedOut);
  }, []);

  const setSolanaKeypair = useCallback((keypair: Keypair) => {
    setSolanaKeypairState(keypair);
  }, []);

  const sendSignResponse = useCallback((
    action: 'compress' | 'decompress',
    success: boolean,
    signature: string | null,
    error: string | null
  ): boolean => {
    return sendSignResponseRaw(sessionRef.current, action, success, signature, error);
  }, []);

  const clearPendingSignRequest = useCallback(() => {
    setPendingSignRequest(null);
  }, []);

  const cleanup = cleanupInternal;

  return (
    <WebRTCContext.Provider
      value={{
        session: sessionRef.current,
        status,
        compressedAnswer,
        nfcData,
        walletAddress,
        dashboardDisconnect,
        pendingSignRequest,
        solanaKeypair,
        initializeFromQR,
        setNfcData,
        sendWalletData,
        sendWalletAddress,
        setWalletAddress,
        setSolanaKeypair,
        notifyAttemptUpdate,
        sendSignResponse,
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
