import {
  AuthSession,
  EventItem,
  Student,
  ScannerAccount,
  ScanValidationResult,
  EventStats,
  ScanAttempt,
  ActivityLog,
  OfflineQueuedScan,
  ScannerReferralCode,
  ScannerAccessRequest,
  EventScanConfig,
  UniquenessValidationResult,
} from '../types';
import { getCurrentAccessToken } from './supabaseAuth';

const TOKEN_KEY = 'admitto_auth_session';
const OFFLINE_QUEUE_KEY = 'admitto_offline_scans_queue';

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const getSession = getStoredSession;

export function saveSession(session: AuthSession | null): void {
  if (session) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function removeSession(): void {
  saveSession(null);
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const stored = getStoredSession();
  let token: string | null = null;

  if (stored?.user?.role === 'SCANNER' && stored?.token) {
    // Scanner sessions use the direct Bearer scan_tok_* token
    token = stored.token;
  } else {
    // Priority 1: Supabase JWT (admin users — auto-refreshed, never stale)
    try {
      token = await getCurrentAccessToken();
    } catch {
      // Supabase unavailable — fall through
    }

    // Priority 2: Stored session token (admin custom tokens)
    if (!token && stored?.token) {
      token = stored.token;
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (typeof localStorage !== 'undefined' && !headers['X-Device-UUID']) {
    try {
      const devUuid = localStorage.getItem('admitto_device_uuid');
      if (devUuid) {
        headers['X-Device-UUID'] = devUuid;
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      errorMsg = errData.message || errData.error || errorMsg;
    } catch {
      // Ignored
    }

    if (res.status === 401) {
      // Only dispatch session-expired if this wasn't an authentication attempt
      if (!endpoint.includes('/api/auth/')) {
        saveSession(null);
        window.dispatchEvent(new CustomEvent('admitto:session-expired'));
      }
    }

    throw new Error(errorMsg);
  }

  return res.json();
}

// Auth APIs
export const authApi = {
  login: async (emailOrCode: string, password: string, role?: 'ADMIN' | 'SCANNER') => {
    return apiFetch<{ success: boolean; session: AuthSession }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrCode, password, role }),
    });
  },

  scannerReferralLogin: async (email: string, referralCode: string, name?: string) => {
    return apiFetch<{ success: boolean; session: AuthSession; request: ScannerAccessRequest }>(
      '/api/auth/scanner-referral-login',
      {
        method: 'POST',
        body: JSON.stringify({ email, referralCode, name }),
      }
    );
  },

  register: async (name: string, email: string, password: string) => {
    return apiFetch<{ success: boolean; session: AuthSession }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  me: async () => {
    return apiFetch<{ user: AuthSession['user'] }>('/api/auth/me');
  },

  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      saveSession(null);
    }
  },

  deleteAccount: async () => {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/account', {
      method: 'DELETE',
    });
  },

  updateProfile: async (data: { name?: string; phone?: string; organization?: string; bio?: string }) => {
    return apiFetch<{ success: boolean; user: AuthSession['user']; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  sendPasswordResetCode: async (email: string) => {
    return apiFetch<{ success: boolean; message: string; cooldownSeconds?: number }>('/api/auth/send-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPasswordWithCode: async (email: string, code: string, newPassword: string) => {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/reset-password-with-code', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  },
};

// Events APIs
export const eventsApi = {
  list: async () => {
    return apiFetch<{ events: EventItem[] }>('/api/events');
  },

  get: async (id: string) => {
    return apiFetch<{ event: EventItem }>(`/api/events/${id}`);
  },

  create: async (data: Partial<EventItem>) => {
    return apiFetch<{ success: boolean; event: EventItem }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<EventItem>) => {
    return apiFetch<{ success: boolean; event: EventItem }>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string, purge: boolean = false) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/events/${id}?purge=${purge}`, {
      method: 'DELETE',
    });
  },

  getStats: async (id: string) => {
    return apiFetch<{ stats: EventStats }>(`/api/events/${id}/stats`);
  },

  updateScanConfig: async (id: string, config: EventScanConfig) => {
    return apiFetch<{ success: boolean; event: EventItem }>(`/api/events/${id}/scan-config`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
  },

  validateUniqueness: async (id: string, rows: any[], primaryKey: string, secondaryKey?: string | null) => {
    return apiFetch<UniquenessValidationResult & { success: boolean }>(`/api/events/${id}/validate-uniqueness`, {
      method: 'POST',
      body: JSON.stringify({ rows, primaryKey, secondaryKey }),
    });
  },
};

// Students APIs
export const studentsApi = {
  list: async (eventId: string, search?: string, branch?: string, filter?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (branch && branch !== 'ALL') params.set('branch', branch);
    if (filter && filter !== 'ALL') params.set('filter', filter);
    return apiFetch<{ students: Student[]; total: number }>(`/api/events/${eventId}/students?${params.toString()}`);
  },

  create: async (eventIdOrData: string | Partial<Student>, maybeData?: Partial<Student>) => {
    const eventId = typeof eventIdOrData === 'string' ? eventIdOrData : (eventIdOrData.event_id || '');
    const payload = typeof eventIdOrData === 'object' ? eventIdOrData : (maybeData || {});
    return apiFetch<{ success: boolean; student: Student }>(`/api/events/${eventId}/students`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  importCSV: async (eventId: string, attendees: Partial<Student>[], scanConfig?: EventScanConfig) => {
    return apiFetch<{ success: boolean; imported: number; duplicates: number; errors: string[] }>(
      `/api/events/${eventId}/students/import`,
      {
        method: 'POST',
        body: JSON.stringify({ attendees, scanConfig }),
      }
    );
  },

  importCsv: async (eventId: string, attendees: Partial<Student>[], scanConfig?: EventScanConfig) => {
    return studentsApi.importCSV(eventId, attendees, scanConfig);
  },

  toggleCheckIn: async (studentId: string, isCheckedIn: boolean) => {
    return apiFetch<{ success: boolean; student: Student }>(`/api/students/${studentId}/checkin-status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_checked_in: isCheckedIn }),
    });
  },

  delete: async (eventIdOrStudentId: string, maybeStudentId?: string) => {
    const url = maybeStudentId
      ? `/api/events/${eventIdOrStudentId}/students/${maybeStudentId}`
      : `/api/students/${eventIdOrStudentId}`;
    return apiFetch<{ success: boolean; message: string }>(url, {
      method: 'DELETE',
    });
  },
};

// Scanners APIs
export const scannersApi = {
  list: async (eventId: string) => {
    return apiFetch<{ scanners: ScannerAccount[] }>(`/api/events/${eventId}/scanners`);
  },

  create: async (
    eventIdOrData: string | { event_id?: string; name: string; email?: string; access_code?: string; expires_at?: string; password?: string },
    maybeData?: { name: string; email?: string; access_code?: string; expires_at?: string; password?: string }
  ) => {
    const eventId = typeof eventIdOrData === 'string' ? eventIdOrData : (eventIdOrData.event_id || '');
    const payload = typeof eventIdOrData === 'object' ? eventIdOrData : (maybeData || {});
    return apiFetch<{ success: boolean; scanner: ScannerAccount }>(`/api/events/${eventId}/scanners`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (eventId: string, scannerId: string, data: Partial<ScannerAccount>) => {
    return apiFetch<{ success: boolean; scanner: ScannerAccount }>(`/api/events/${eventId}/scanners/${scannerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  toggleActive: async (scannerId: string, isActive: boolean) => {
    return apiFetch<{ success: boolean; scanner: ScannerAccount }>(`/api/scanners/${scannerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  delete: async (eventIdOrScannerId: string, maybeScannerId?: string) => {
    const url = maybeScannerId
      ? `/api/events/${eventIdOrScannerId}/scanners/${maybeScannerId}`
      : `/api/scanners/${eventIdOrScannerId}`;
    return apiFetch<{ success: boolean; message: string }>(url, {
      method: 'DELETE',
    });
  },
};

// Central Check-in APIs
export const scanApi = {
  validate: async (eventId: string, scannedValue: string, scanType: 'QR' | 'BARCODE', clientScanId?: string, secondaryValue?: string) => {
    return apiFetch<ScanValidationResult>('/api/scan/validate', {
      method: 'POST',
      body: JSON.stringify({ eventId, scannedValue, scanType, clientScanId, secondaryValue }),
    });
  },

  batchSync: async (eventId: string, scans: OfflineQueuedScan[]) => {
    return apiFetch<{ success: boolean; processed: number; results: any[] }>('/api/scan/batch-sync', {
      method: 'POST',
      body: JSON.stringify({ eventId, scans }),
    });
  },

  getHistory: async (eventId: string, filters?: { result?: string; scannerId?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.result && filters.result !== 'ALL') params.set('result', filters.result);
    if (filters?.scannerId && filters.scannerId !== 'ALL') params.set('scannerId', filters.scannerId);
    if (filters?.search) params.set('search', filters.search);
    const res = await apiFetch<{ scans?: ScanAttempt[]; logs?: ScanAttempt[]; total: number }>(`/api/events/${eventId}/scans?${params.toString()}`);
    const scansList = res.scans || res.logs || [];
    return { scans: scansList, logs: scansList, total: res.total ?? scansList.length };
  },

  getLogs: async (eventId: string) => {
    const res = await apiFetch<{ scans?: ScanAttempt[]; logs?: ScanAttempt[]; total: number }>(`/api/events/${eventId}/scans`);
    const scansList = res.scans || res.logs || [];
    return { scans: scansList, logs: scansList, total: res.total ?? scansList.length };
  },

  getActivityLogs: async (eventId: string) => {
    return apiFetch<{ logs: ActivityLog[] }>(`/api/events/${eventId}/activity`);
  },

  clearActivityLogs: async (eventId: string) => {
    return apiFetch<{ success: boolean; message: string }>(`/api/events/${eventId}/activity`, {
      method: 'DELETE',
    });
  },

  getExportUrl: async (eventId: string) => {
    const { token } = await apiFetch<{ token: string; expiresIn: number }>(`/api/events/${eventId}/export-token`, {
      method: 'POST',
    });
    return `/api/events/${eventId}/export?token=${encodeURIComponent(token)}`;
  },

  downloadCSV: async (eventId: string, customFilename?: string) => {
    const { token } = await apiFetch<{ token: string; expiresIn: number }>(`/api/events/${eventId}/export-token`, {
      method: 'POST',
    });
    const res = await fetch(`/api/events/${eventId}/export?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      throw new Error(`Failed to export CSV: ${res.statusText}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = customFilename || `admitto-attendance-${eventId.substring(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

// Scanner Referral Codes API
export const referralCodesApi = {
  list: async (eventId: string) => {
    return apiFetch<{ codes: ScannerReferralCode[] }>(`/api/events/${eventId}/referral-codes`);
  },

  create: async (eventId: string, expiresAt?: string) => {
    return apiFetch<{ success: boolean; code: ScannerReferralCode }>(`/api/events/${eventId}/referral-codes`, {
      method: 'POST',
      body: JSON.stringify({ expiresAt }),
    });
  },

  toggle: async (eventId: string, codeId: string, status: 'ACTIVE' | 'DISABLED') => {
    return apiFetch<{ success: boolean; code: ScannerReferralCode }>(
      `/api/events/${eventId}/referral-codes/${codeId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  },
};

// Scanner Access Requests API
export const scannerAccessApi = {
  getMyAccess: async (eventId?: string) => {
    const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
    return apiFetch<{ request: ScannerAccessRequest | null }>(`/api/scanner/my-access${query}`);
  },

  requestAccess: async (referralCode: string, userName?: string) => {
    return apiFetch<{ success: boolean; request: ScannerAccessRequest }>('/api/scanner/request-access', {
      method: 'POST',
      body: JSON.stringify({ referralCode, userName }),
    });
  },

  listRequests: async (eventId: string) => {
    return apiFetch<{ requests: ScannerAccessRequest[] }>(`/api/events/${eventId}/scanner-requests`);
  },

  approve: async (
    eventId: string,
    requestId: string,
    params: { scannerId?: string; gateName?: string; durationHours?: number }
  ) => {
    return apiFetch<{ success: boolean; request: ScannerAccessRequest }>(
      `/api/events/${eventId}/scanner-requests/${requestId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  },

  reject: async (eventId: string, requestId: string, reason?: string) => {
    return apiFetch<{ success: boolean; request: ScannerAccessRequest }>(
      `/api/events/${eventId}/scanner-requests/${requestId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  },

  revoke: async (eventId: string, requestId: string) => {
    return apiFetch<{ success: boolean; request: ScannerAccessRequest }>(
      `/api/events/${eventId}/scanner-requests/${requestId}/revoke`,
      {
        method: 'POST',
      }
    );
  },

  block: async (eventId: string, requestId: string) => {
    return apiFetch<{ success: boolean; request: ScannerAccessRequest }>(
      `/api/events/${eventId}/scanner-requests/${requestId}/block`,
      {
        method: 'POST',
      }
    );
  },

  unblock: async (eventId: string, requestId: string) => {
    return apiFetch<{ success: boolean; request: ScannerAccessRequest }>(
      `/api/events/${eventId}/scanner-requests/${requestId}/unblock`,
      {
        method: 'POST',
      }
    );
  },

  deleteRequest: async (eventIdOrRequestId: string, maybeRequestId?: string) => {
    const url = maybeRequestId
      ? `/api/events/${eventIdOrRequestId}/scanner-requests/${maybeRequestId}`
      : `/api/scanner-requests/${eventIdOrRequestId}`;
    return apiFetch<{ success: boolean; message: string }>(url, {
      method: 'DELETE',
    });
  },
};

// Offline Queue Storage Helpers
export const offlineQueue = {
  get: (): OfflineQueuedScan[] => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  add: (scan: OfflineQueuedScan): OfflineQueuedScan[] => {
    const current = offlineQueue.get();
    const updated = [...current, scan];
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    return updated;
  },

  removeById: (clientScanId: string): OfflineQueuedScan[] => {
    const current = offlineQueue.get();
    const updated = current.filter((s) => s.client_scan_id !== clientScanId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    return updated;
  },

  clear: (): void => {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  },
};
