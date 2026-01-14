import {
  decompressOffer,
  generateKeyPair,
  deriveSharedSecret,
  encryptPayload,
  clearSensitiveData,
  bytesToHex,
  type QROfferData,
  type EncryptedPayload,
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
    
    // Debug logging
    console.log('=== QR Data Debug ===');
    console.log('Raw QR data length:', qrData.length);
    console.log('Parsed offer data:', JSON.stringify(offerData, null, 2));
    console.log('wsUrl from QR:', offerData.wsUrl || 'NOT FOUND');
    console.log('sessionId:', offerData.sessionId);
    console.log('pk:', offerData.pk?.substring(0, 20) + '...');
    
    session.dashboardPublicKey = offerData.pk;
    session.sessionId = offerData.sessionId;

    session.keyPair = generateKeyPair();
    session.sharedSecret = deriveSharedSecret(session.keyPair.privateKey, offerData.pk);

    // Use wsUrl from QR code directly (DO NOT append sessionId to path!)
    // Dashboard expects sessionId in message payload, not URL
    let wsUrl: string;
    if (offerData.wsUrl) {
      wsUrl = offerData.wsUrl;
      console.log('Using wsUrl from QR:', wsUrl);
    } else {
      const host = process.env.EXPO_PUBLIC_DOMAIN;
      console.log('wsUrl NOT in QR, falling back to EXPO_PUBLIC_DOMAIN:', host);
      if (!host) {
        throw new Error('Server URL not found in QR code. Please scan a new QR code from the dashboard.');
      }
      const wsProtocol = host.includes('localhost') ? 'ws' : 'wss';
      wsUrl = `${wsProtocol}://${host}/ws`;
    }

    console.log('Final WebSocket URL:', wsUrl);
    session.websocket = new WebSocket(wsUrl);

    session.websocket.onopen = () => {
      console.log('WebSocket connected');
      
      const registerMsg = {
        type: 'register',
        role: 'mobile',
        sessionId: offerData.sessionId
      };
      
      console.log('Sending register:', JSON.stringify(registerMsg));
      session.websocket?.send(JSON.stringify(registerMsg));
    };

    session.websocket.onmessage = (event) => {
      console.log('WS received:', event.data);
      
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'registered' || (msg.type === 'ack' && msg.received === 'register')) {
          console.log('Registered to session, ready for NFC tap');
          session.status = 'connected';
          onStatusChange('connected');
        }
        
        if (msg.type === 'ice-candidate') {
          console.log('ICE candidate received from dashboard');
        }
        
        if (msg.type === 'error') {
          console.error('Server error:', msg.message);
          session.status = 'failed';
          onStatusChange('failed');
        }
        
        onMessage(msg);
      } catch {
        console.log('WS received non-JSON:', event.data);
        onMessage(event.data);
      }
    };

    session.websocket.onerror = (e) => {
      console.error('WS error:', e);
      session.status = 'failed';
      onStatusChange('failed');
    };

    session.websocket.onclose = (e) => {
      console.log('WS closed:', e.code, e.reason);
      if (session.status !== 'failed') {
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
    console.error('WebSocket initialization error:', error);
    throw error;
  }
}

export function sendEncryptedWalletData(
  session: WebRTCSession,
  nfcId: string,
  pin: string
): boolean {
  if (!session.websocket || session.websocket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket not ready');
    return false;
  }

  if (!session.sharedSecret || !session.keyPair) {
    console.error('Missing encryption keys');
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
