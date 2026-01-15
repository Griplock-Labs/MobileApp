export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface RelaySession {
  websocket: WebSocket | null;
  roomId: string | null;
  secret: string | null;
  status: ConnectionStatus;
  walletSent: boolean;
}

export function createInitialSession(): RelaySession {
  return {
    websocket: null,
    roomId: null,
    secret: null,
    status: 'disconnected',
    walletSent: false,
  };
}

interface QRData {
  roomId: string;
  secret: string;
  relayUrl: string;
}

function parseQRCode(qrData: string): QRData {
  if (!qrData.startsWith('griplock:')) {
    throw new Error('Invalid QR code - not a GRIPLOCK QR');
  }

  const data = qrData.replace('griplock:', '');
  const parts = data.split(':');

  if (parts.length < 2) {
    throw new Error('Invalid QR code format - missing room ID or secret');
  }

  const roomId = parts[0];
  const secret = parts[1];
  
  // Join remaining parts back together for URL (since URL contains colons like wss://...)
  const relayUrl = parts.length > 2 ? parts.slice(2).join(':') : getDefaultRelayUrl();

  return { roomId, secret, relayUrl };
}

function getDefaultRelayUrl(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DOMAIN) {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const protocol = domain.includes('localhost') ? 'ws' : 'wss';
    const baseUrl = domain.includes(':') ? domain.split(':')[0] : domain;
    return `${protocol}://${baseUrl}:5000/ws-relay`;
  }
  return 'wss://localhost:5000/ws-relay';
}

export async function initializeFromQR(
  qrData: string,
  onStatusChange: (status: ConnectionStatus) => void,
  onMessage: (message: unknown) => void,
  onDisconnect?: (reason: 'peer_closed' | 'connection_failed' | 'room_expired') => void
): Promise<RelaySession> {
  const session = createInitialSession();

  try {
    onStatusChange('connecting');
    session.status = 'connecting';

    const { roomId, secret, relayUrl } = parseQRCode(qrData);
    session.roomId = roomId;
    session.secret = secret;

    console.log('[Relay] Connecting to:', relayUrl);
    console.log('[Relay] Room ID:', roomId);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('[Relay] Connection timeout');
        cleanupSession(session, false);
        reject(new Error('Connection timeout - could not connect to relay server'));
      }, 15000);

      session.websocket = new WebSocket(relayUrl);

      session.websocket.onopen = () => {
        console.log('[Relay] WebSocket connected');
        
        session.websocket?.send(JSON.stringify({
          type: 'join_room',
          roomId,
          secret,
        }));
      };

      session.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[Relay] Received:', message.type);

          switch (message.type) {
            case 'room_joined':
              console.log('[Relay] Successfully joined room');
              clearTimeout(timeout);
              session.status = 'connected';
              onStatusChange('connected');
              resolve(session);
              break;

            case 'error':
              console.error('[Relay] Error:', message.message);
              clearTimeout(timeout);
              session.status = 'failed';
              onStatusChange('failed');
              reject(new Error(message.message));
              break;

            case 'relayed':
              console.log('[Relay] Relayed message:', message.payload?.type);
              onMessage(message.payload);
              break;

            case 'peer_disconnected':
              console.log('[Relay] Dashboard disconnected');
              session.status = 'disconnected';
              onStatusChange('disconnected');
              onDisconnect?.('peer_closed');
              break;

            case 'room_expired':
              console.log('[Relay] Room expired');
              session.status = 'disconnected';
              onStatusChange('disconnected');
              onDisconnect?.('room_expired');
              break;
          }
        } catch (err) {
          console.error('[Relay] Parse error:', err);
        }
      };

      session.websocket.onerror = (err) => {
        console.error('[Relay] WebSocket error:', err);
        clearTimeout(timeout);
        session.status = 'failed';
        onStatusChange('failed');
        reject(new Error('WebSocket connection failed'));
      };

      session.websocket.onclose = () => {
        console.log('[Relay] WebSocket closed');
        if (session.status === 'connected') {
          session.status = 'disconnected';
          onStatusChange('disconnected');
          onDisconnect?.('connection_failed');
        }
      };
    });
  } catch (error) {
    console.error('[Relay] Initialization failed:', error);
    cleanupSession(session);
    session.status = 'failed';
    onStatusChange('failed');
    throw error;
  }
}

function sendRelay(session: RelaySession, payload: object): boolean {
  if (!session.websocket || session.websocket.readyState !== WebSocket.OPEN) {
    console.log('[Relay] WebSocket not open, cannot send');
    return false;
  }

  try {
    session.websocket.send(JSON.stringify({
      type: 'relay',
      payload,
    }));
    return true;
  } catch (err) {
    console.error('[Relay] Send error:', err);
    return false;
  }
}

export function sendWalletAddress(
  session: RelaySession,
  walletAddress: string
): boolean {
  const payload = {
    type: 'wallet_connected',
    address: walletAddress,
  };

  console.log('[Relay] Sending wallet_connected');
  const success = sendRelay(session, payload);

  if (success) {
    session.walletSent = true;
  }

  return success;
}

export function sendAttemptUpdate(
  session: RelaySession,
  attempts: number,
  maxAttempts: number,
  isLockedOut: boolean,
  lockoutEndTime?: number
): boolean {
  const payload = {
    type: 'attempt_update',
    attempts,
    maxAttempts,
    remaining: maxAttempts - attempts,
    isLockedOut,
    lockoutEndTime,
    timestamp: Date.now(),
  };

  return sendRelay(session, payload);
}

export interface SignResult {
  type: 'sign_result';
  requestId: string;
  action: 'compress' | 'decompress';
  success: boolean;
  signature?: string;
  error?: string;
}

export function sendSignResult(
  session: RelaySession,
  requestId: string,
  action: 'compress' | 'decompress',
  success: boolean,
  signature?: string,
  error?: string
): boolean {
  const payload: SignResult = {
    type: 'sign_result',
    requestId,
    action,
    success,
  };

  if (success && signature) {
    payload.signature = signature;
  }
  if (!success && error) {
    payload.error = error;
  }

  console.log('[Relay] Sending sign_result:', payload);
  return sendRelay(session, payload);
}

export function sendDisconnect(session: RelaySession, reason = 'user_initiated'): boolean {
  if (!session.websocket || session.websocket.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    session.websocket.send(JSON.stringify({
      type: 'disconnect',
      reason,
    }));
    return true;
  } catch {
    return false;
  }
}

export function cleanupSession(session: RelaySession, sendDisconnectMsg = true): void {
  if (sendDisconnectMsg && session.websocket?.readyState === WebSocket.OPEN) {
    sendDisconnect(session);
  }

  if (session.websocket) {
    session.websocket.close();
    session.websocket = null;
  }

  session.roomId = null;
  session.secret = null;
  session.status = 'disconnected';
  session.walletSent = false;
}
