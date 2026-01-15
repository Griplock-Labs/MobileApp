import {
  decompressOffer,
  generateKeyPair,
  deriveSharedSecret,
  encryptPayload,
  encryptWalletAddress,
  clearSensitiveData,
  bytesToHex,
  type QROfferData,
  type EncryptedPayload,
  type WalletConnectedPayload,
  type KeyPair,
} from './crypto';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface WebRTCSession {
  websocket: WebSocket | null;
  keyPair: KeyPair | null;
  sharedSecret: Uint8Array | null;
  dashboardPublicKey: string | null;
  sessionId: string | null;
  status: ConnectionStatus;
  compressedAnswer: string | null;
  walletSent: boolean;
}

export function createInitialSession(): WebRTCSession {
  return {
    websocket: null,
    keyPair: null,
    sharedSecret: null,
    dashboardPublicKey: null,
    sessionId: null,
    status: 'disconnected',
    compressedAnswer: null,
    walletSent: false,
  };
}

export async function initializeWebRTCFromQR(
  qrData: string,
  onStatusChange: (status: ConnectionStatus) => void,
  onMessage: (message: unknown) => void
): Promise<WebRTCSession> {
  const session = createInitialSession();

  try {
    onStatusChange('connecting');
    session.status = 'connecting';

    const offerData: QROfferData = decompressOffer(qrData);
    
    session.dashboardPublicKey = offerData.pk;
    session.sessionId = offerData.sessionId;

    session.keyPair = generateKeyPair();
    session.sharedSecret = deriveSharedSecret(session.keyPair.privateKey, offerData.pk);

    // Use wsUrl from QR code directly (DO NOT append sessionId to path!)
    // Dashboard expects sessionId in message payload, not URL
    let wsUrl: string;
    if (offerData.wsUrl) {
      wsUrl = offerData.wsUrl;
    } else {
      const host = process.env.EXPO_PUBLIC_DOMAIN;
      if (!host) {
        throw new Error('Server URL not found in QR code. Please scan a new QR code from the dashboard.');
      }
      const wsProtocol = host.includes('localhost') ? 'ws' : 'wss';
      wsUrl = `${wsProtocol}://${host}/ws`;
    }

    console.log('[WS] Connecting to:', wsUrl);
    session.websocket = new WebSocket(wsUrl);

    session.websocket.onopen = () => {
      console.log('[WS] Connection opened');
      const registerMsg = {
        type: 'register',
        role: 'mobile',
        sessionId: offerData.sessionId
      };
      console.log('[WS] Sending register:', JSON.stringify(registerMsg));
      session.websocket?.send(JSON.stringify(registerMsg));
    };

    session.websocket.onmessage = (event) => {
      console.log('[WS] Raw message received:', event.data);
      try {
        const msg = JSON.parse(event.data);
        console.log('[WS] Parsed message:', JSON.stringify(msg));
        
        if (msg.type === 'registered' || (msg.type === 'ack' && msg.received === 'register')) {
          console.log('[WS] Registration confirmed - setting status to connected');
          session.status = 'connected';
          onStatusChange('connected');
        }
        
        if (msg.type === 'error') {
          console.log('[WS] Error message received');
          session.status = 'failed';
          onStatusChange('failed');
        }
        
        onMessage(msg);
      } catch {
        console.log('[WS] Failed to parse message');
        onMessage(event.data);
      }
    };

    session.websocket.onerror = (err) => {
      console.log('[WS] Error occurred:', err);
      if (!session.walletSent) {
        session.status = 'failed';
        onStatusChange('failed');
      } else {
        console.log('[WS] Error after wallet sent - ignoring (session complete)');
      }
    };

    session.websocket.onclose = (event) => {
      console.log('[WS] Connection closed, code:', event.code, 'reason:', event.reason);
      if (session.walletSent) {
        console.log('[WS] Connection closed after wallet sent - session complete');
        session.status = 'disconnected';
        onStatusChange('disconnected');
      } else if (session.status !== 'failed') {
        session.status = 'disconnected';
        onStatusChange('disconnected');
      }
    };

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      const checkConnection = () => {
        if (session.websocket?.readyState === WebSocket.OPEN) {
          clearTimeout(timeout);
          resolve();
        } else if (session.websocket?.readyState === WebSocket.CLOSED) {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });

    return session;
  } catch (error) {
    cleanupSession(session);
    session.status = 'failed';
    onStatusChange('failed');
    throw error;
  }
}

export function sendEncryptedWalletData(
  session: WebRTCSession,
  nfcId: string,
  pin: string
): boolean {
  if (!session.websocket || session.websocket.readyState !== WebSocket.OPEN) {
    console.log('[sendWalletData] WebSocket not ready:', session.websocket?.readyState);
    return false;
  }

  if (!session.sharedSecret || !session.keyPair) {
    console.log('[sendWalletData] Missing keys:', { hasSecret: !!session.sharedSecret, hasKeyPair: !!session.keyPair });
    return false;
  }

  const encryptedPayload: EncryptedPayload = encryptPayload(
    session.sharedSecret,
    { nfcId, pin },
    session.keyPair.publicKey
  );

  session.websocket.send(JSON.stringify(encryptedPayload));

  clearSensitiveData(session.sharedSecret, session.keyPair.privateKey);
  session.sharedSecret = null;
  session.keyPair = null;
  session.dashboardPublicKey = null;

  return true;
}

export function sendWalletAddress(
  session: WebRTCSession,
  walletAddress: string
): boolean {
  if (!session.websocket || session.websocket.readyState !== WebSocket.OPEN) {
    console.log('[sendWalletAddress] WebSocket not ready:', session.websocket?.readyState);
    return false;
  }

  const message = {
    type: 'wallet_connected',
    address: walletAddress,
  };

  console.log('[sendWalletAddress] Sending wallet_connected message:', message);
  session.websocket.send(JSON.stringify(message));

  session.walletSent = true;

  if (session.sharedSecret) {
    clearSensitiveData(session.sharedSecret);
    session.sharedSecret = null;
  }
  if (session.keyPair) {
    clearSensitiveData(session.keyPair.privateKey);
    session.keyPair = null;
  }
  session.dashboardPublicKey = null;

  return true;
}

export function sendAttemptUpdate(
  session: WebRTCSession,
  attempts: number,
  maxAttempts: number,
  isLockedOut: boolean
): boolean {
  if (!session.websocket || session.websocket.readyState !== WebSocket.OPEN) {
    return false;
  }

  const message = {
    type: 'attempt_update',
    attempts,
    maxAttempts,
    remaining: maxAttempts - attempts,
    isLockedOut,
    timestamp: Date.now(),
  };

  session.websocket.send(JSON.stringify(message));
  return true;
}

export function cleanupSession(session: WebRTCSession): void {
  if (session.websocket) {
    session.websocket.close();
    session.websocket = null;
  }

  if (session.keyPair) {
    clearSensitiveData(session.keyPair.privateKey);
    session.keyPair = null;
  }

  if (session.sharedSecret) {
    clearSensitiveData(session.sharedSecret);
    session.sharedSecret = null;
  }

  session.dashboardPublicKey = null;
  session.sessionId = null;
  session.status = 'disconnected';
}
