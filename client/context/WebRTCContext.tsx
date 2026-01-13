import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  WebRTCSession,
  ConnectionStatus,
  createInitialSession,
  initializeWebRTCFromQR,
  sendEncryptedWalletData,
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
  sendWalletData: (pin: string) => boolean;
  setWalletAddress: (address: string) => void;
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
    try {
      const newSession = await initializeWebRTCFromQR(
        qrData,
        (newStatus) => setStatus(newStatus),
        (message) => setLastMessage(message)
      );
      sessionRef.current = newSession;
      setCompressedAnswer(newSession.compressedAnswer);
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      sessionRef.current = createInitialSession();
      setStatus('disconnected');
      setCompressedAnswer(null);
      throw error;
    }
  }, []);

  const setNfcData = useCallback((data: string) => {
    setNfcDataState(data);
  }, []);

  const sendWalletData = useCallback((pin: string): boolean => {
    if (!nfcData) {
      console.error('No NFC data available');
      return false;
    }
    return sendEncryptedWalletData(sessionRef.current, nfcData, pin);
  }, [nfcData]);

  const setWalletAddress = useCallback((address: string) => {
    setWalletAddressState(address);
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
        setWalletAddress,
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
