import { Platform } from 'react-native';

let analytics: any = null;
let isInitialized = false;

async function initializeAnalytics() {
  if (isInitialized) return;
  
  try {
    const firebaseAnalytics = await import('@react-native-firebase/analytics');
    analytics = firebaseAnalytics.default();
    isInitialized = true;
    console.log('[Analytics] Firebase Analytics initialized');
  } catch (error) {
    console.log('[Analytics] Firebase not available (expected in Expo Go)');
    isInitialized = true;
  }
}

initializeAnalytics();

export async function logScreenView(screenName: string, screenClass?: string) {
  try {
    if (analytics) {
      await analytics.logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
      console.log(`[Analytics] Screen: ${screenName}`);
    }
  } catch (error) {
    // Silent fail
  }
}

export async function logEvent(eventName: string, params?: Record<string, any>) {
  try {
    if (analytics) {
      await analytics.logEvent(eventName, params);
      console.log(`[Analytics] Event: ${eventName}`, params || '');
    }
  } catch (error) {
    // Silent fail
  }
}

export async function logNFCTap(success: boolean) {
  await logEvent('nfc_tap', {
    success,
    platform: Platform.OS,
  });
}

export async function logPINAttempt(success: boolean, attemptNumber: number) {
  await logEvent('pin_attempt', {
    success,
    attempt_number: attemptNumber,
  });
}

export async function logWalletDerived() {
  await logEvent('wallet_derived', {
    timestamp: Date.now(),
  });
}

export async function logSignTransaction(type: string, success: boolean) {
  await logEvent('sign_transaction', {
    type,
    success,
  });
}

export async function logShieldUnshield(action: 'shield' | 'unshield', success: boolean, amount?: number) {
  await logEvent('shield_unshield', {
    action,
    success,
    amount_sol: amount,
  });
}

export async function logPrivateSend(success: boolean, amount?: number) {
  await logEvent('private_send', {
    success,
    amount_sol: amount,
  });
}

export async function logQRScanned(success: boolean) {
  await logEvent('qr_scanned', {
    success,
  });
}

export async function logSessionStart() {
  await logEvent('session_start', {
    timestamp: Date.now(),
    platform: Platform.OS,
  });
}

export async function logSessionEnd(durationMs: number) {
  await logEvent('session_end', {
    duration_ms: durationMs,
    platform: Platform.OS,
  });
}

export async function logError(errorType: string, errorMessage: string) {
  await logEvent('app_error', {
    error_type: errorType,
    error_message: errorMessage.substring(0, 100),
  });
}
