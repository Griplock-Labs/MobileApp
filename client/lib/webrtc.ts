import Peer, { DataConnection } from 'peerjs';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface WebRTCSession {
  peer: Peer | null;
  connection: DataConnection | null;
  peerId: string | null;
  status: ConnectionStatus;
  walletSent: boolean;
}

export function createInitialSession(): WebRTCSession {
  return {
    peer: null,
    connection: null,
    peerId: null,
    status: 'disconnected',
    walletSent: false,
  };
}

function parseQRCode(qrData: string): string {
  if (!qrData.startsWith('griplock:')) {
    throw new Error('Invalid QR code - not a GRIPLOCK QR');
  }
  return qrData.replace('griplock:', '');
}

export async function initializeWebRTCFromQR(
  qrData: string,
  onStatusChange: (status: ConnectionStatus) => void,
  onMessage: (message: unknown) => void,
  onDisconnect?: (reason: 'peer_closed' | 'connection_failed' | 'data_channel_closed') => void
): Promise<WebRTCSession> {
  const session = createInitialSession();

  try {
    onStatusChange('connecting');
    session.status = 'connecting';

    const dashboardPeerId = parseQRCode(qrData);
    session.peerId = dashboardPeerId;
    console.log('[PeerJS] Connecting to dashboard peer:', dashboardPeerId);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('[PeerJS] Connection timeout');
        reject(new Error('Connection timeout - could not connect to dashboard'));
      }, 15000);

      session.peer = new Peer();

      session.peer.on('open', (id) => {
        console.log('[PeerJS] Connected to signaling server, our ID:', id);

        session.connection = session.peer!.connect(dashboardPeerId, {
          reliable: true,
        });

        session.connection.on('open', () => {
          console.log('[PeerJS] DataConnection opened - P2P ready!');
          clearTimeout(timeout);
          session.status = 'connected';
          onStatusChange('connected');
          resolve(session);
        });

        session.connection.on('data', (data) => {
          console.log('[PeerJS] Received data:', data);
          try {
            const msg = typeof data === 'string' ? JSON.parse(data) : data;
            onMessage(msg);

            if (msg.type === 'disconnect') {
              console.log('[PeerJS] Dashboard sent disconnect');
              session.status = 'disconnected';
              onStatusChange('disconnected');
              onDisconnect?.('peer_closed');
            }
          } catch {
            onMessage(data);
          }
        });

        session.connection.on('close', () => {
          console.log('[PeerJS] Connection closed');
          session.status = 'disconnected';
          onStatusChange('disconnected');
          onDisconnect?.('data_channel_closed');
        });

        session.connection.on('error', (err) => {
          console.error('[PeerJS] Connection error:', err);
          clearTimeout(timeout);
          session.status = 'failed';
          onStatusChange('failed');
          onDisconnect?.('connection_failed');
          reject(err);
        });
      });

      session.peer.on('error', (err) => {
        console.error('[PeerJS] Peer error:', err);
        clearTimeout(timeout);
        session.status = 'failed';
        onStatusChange('failed');
        reject(err);
      });

      session.peer.on('disconnected', () => {
        console.log('[PeerJS] Disconnected from signaling server');
      });
    });
  } catch (error) {
    console.error('[PeerJS] Initialization failed:', error);
    cleanupSession(session);
    session.status = 'failed';
    onStatusChange('failed');
    throw error;
  }
}

function sendMessage(session: WebRTCSession, message: object): boolean {
  if (!session.connection?.open) {
    console.log('[PeerJS] Connection not open, cannot send');
    return false;
  }

  try {
    session.connection.send(JSON.stringify(message));
    return true;
  } catch (err) {
    console.error('[PeerJS] Send error:', err);
    return false;
  }
}

export function sendWalletAddress(
  session: WebRTCSession,
  walletAddress: string
): boolean {
  const message = {
    type: 'wallet_connected',
    address: walletAddress,
  };

  console.log('[PeerJS] Sending wallet_connected');
  const success = sendMessage(session, message);

  if (success) {
    session.walletSent = true;
  }

  return success;
}

export function sendAttemptUpdate(
  session: WebRTCSession,
  attempts: number,
  maxAttempts: number,
  isLockedOut: boolean,
  lockoutEndTime?: number
): boolean {
  const message = {
    type: 'attempt_update',
    attempts,
    maxAttempts,
    remaining: maxAttempts - attempts,
    isLockedOut,
    lockoutEndTime,
    timestamp: Date.now(),
  };

  return sendMessage(session, message);
}

export interface SignResponse {
  type: 'sign_response';
  action: 'compress' | 'decompress';
  success: boolean;
  signature: string | null;
  error: string | null;
}

export function sendSignResponse(
  session: WebRTCSession,
  action: 'compress' | 'decompress',
  success: boolean,
  signature: string | null,
  error: string | null
): boolean {
  const message: SignResponse = {
    type: 'sign_response',
    action,
    success,
    signature,
    error,
  };

  console.log('[PeerJS] Sending sign_response:', message);
  return sendMessage(session, message);
}

export function sendDisconnect(session: WebRTCSession): boolean {
  const message = {
    type: 'disconnect',
    reason: 'user_initiated',
    timestamp: Date.now(),
  };

  console.log('[PeerJS] Sending disconnect message');
  return sendMessage(session, message);
}

export function cleanupSession(session: WebRTCSession, sendDisconnectMsg = true): void {
  if (sendDisconnectMsg && session.connection?.open) {
    sendDisconnect(session);
  }

  if (session.connection) {
    session.connection.close();
    session.connection = null;
  }

  if (session.peer) {
    session.peer.destroy();
    session.peer = null;
  }

  session.peerId = null;
  session.status = 'disconnected';
  session.walletSent = false;
}
