import { getMetadata, setMetadata, getAdmittoDB } from './idb';
import { CachedEvent } from './types';

const DEVICE_UUID_KEY = 'admitto_device_uuid';
const OFFLINE_AUTH_KEY = 'admitto_offline_auth';

/**
 * Generate or retrieve a persistent cryptographically secure device UUID.
 */
export async function getOrCreateDeviceUuid(): Promise<string> {
  try {
    const existing = await getMetadata<string>(DEVICE_UUID_KEY);
    if (existing) {
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem('admitto_device_uuid', existing); } catch { /* ignore */ }
      }
      return existing;
    }

    let newUuid: string;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      newUuid = crypto.randomUUID();
    } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      newUuid = [...bytes].map((b, i) => ([4, 6, 8, 10].includes(i) ? `-${b.toString(16).padStart(2, '0')}` : b.toString(16).padStart(2, '0'))).join('');
    } else {
      newUuid = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    }

    await setMetadata(DEVICE_UUID_KEY, newUuid);
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('admitto_device_uuid', newUuid); } catch { /* ignore */ }
    }
    return newUuid;
  } catch {
    return 'fallback-device-' + Date.now();
  }
}

export interface OfflineAuthContext {
  scannerId: string;
  scannerName: string;
  scannerEmail: string;
  eventId: string;
  role: 'SCANNER' | 'ADMIN';
  token: string;
  expiresAt: string;
  deviceUuid: string;
}

/**
 * Save active offline authorization context when online.
 */
export async function saveOfflineAuthContext(context: OfflineAuthContext): Promise<void> {
  await setMetadata(OFFLINE_AUTH_KEY, context);
}

/**
 * Retrieve active offline authorization context.
 */
export async function getOfflineAuthContext(): Promise<OfflineAuthContext | null> {
  return getMetadata<OfflineAuthContext>(OFFLINE_AUTH_KEY);
}

/**
 * Clear offline authorization context.
 */
export async function clearOfflineAuthContext(): Promise<void> {
  const db = await getAdmittoDB();
  await db.delete('terminal_metadata', OFFLINE_AUTH_KEY);
}

/**
 * Validates whether an offline event bundle exists and is unexpired.
 */
export function isBundleExpired(bundle: CachedEvent | null): boolean {
  if (!bundle || !bundle.expires_at) return true;
  const expiryTime = new Date(bundle.expires_at).getTime();
  return Number.isNaN(expiryTime) || Date.now() >= expiryTime;
}
