import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  WebRTCSession,
  ConnectionStatus,
  createInitialSession,
  initializeWebRTCFromQR,
  sendEncryptedWalletData,
  sendWalletAddress as sendWalletAddressRaw,
  sendAttemptUpdate,
  cleanupSession,
} from '@/lib/webrtc';

interface WebRTCContextValue {
  session: WebRTCSession;
  status: ConnectionStatus;
  compressedAnswer: string | null;
  nfcData: string | null;
  walletAddress: string | null;
  initializeFromQR: (qrData: string) => Promise<void>;
  setNfcData: (data: string) => void;
  sendWalletData: (pin: string, nfcDataOverride?: string) => boolean;
  sendWalletAddress: (address: string) => boolean;
  setWalletAddress: (address: string) => void;
  notifyAttemptUpdate: (attempts: number, maxAttempts: number, isLockedOut: boolean) => boolean;
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

  const cleanupInternal = useCallback(() => {
    cleanupSession(sessionRef.current);
    sessionRef.current = createInitialSession();
    setStatus('disconnected');
    setCompressedAnswer(null);
    setNfcDataState(null);
    setWalletAddressState(null);
    setLastMessage(null);
  }, []);

  const initializeFromQR = useCallback(async (qrData: string) => {
    console.log('[WebRTC] initializeFromQR called');
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

  const cleanup = cleanupInternal;

  return (
    <WebRTCContext.Provider
      value={{
        session: sessionRef.current,
        status,
        compressedAnswer,
        nfcData,
        walletAddress,
        initializeFromQR,
        setNfcData,
        sendWalletData,
        sendWalletAddress,
        setWalletAddress,
        notifyAttemptUpdate,
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
