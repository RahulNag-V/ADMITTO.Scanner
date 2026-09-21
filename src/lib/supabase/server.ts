import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://vifgaafjgzahqxuxtdar.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZmdhYWZqZ3phaHF4dXh0ZGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NDY2NjMsImV4cCI6MjEwNDIyMjY2M30.dP-RFo-xhAsyNS0i8a-gnau4n3CBNN3ce4hANARPi8Y';
export const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZmdhYWZqZ3phaHF4dXh0ZGFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODY0NjY2MywiZXhwIjoyMTA0MjIyNjYzfQ.OpfnzOIQDMUTNTP8mV8j3ChjxwowkPH67xoYorEMn04';

function isPlaceholder(val?: string): boolean {
  if (!val) return true;
  const s = val.trim().toLowerCase();
  return (
    !s ||
    s.includes('your-project-id') ||
    s.includes('your-anon-key') ||
    s.includes('your-service-role') ||
    s.includes('your-') ||
    s.includes('placeholder')
  );
}

function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

export function getSupabaseServerUrl(): string {
  const rawUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const normalized = normalizeSupabaseUrl(rawUrl);
  if (isPlaceholder(normalized)) {
    return DEFAULT_SUPABASE_URL;
  }
  return normalized;
}

export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  if (isPlaceholder(key)) {
    return DEFAULT_SUPABASE_SERVICE_ROLE_KEY;
  }
  return key;
}

export function getSupabaseAnonKey(): string {
  const key = (
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    ''
  );
  if (isPlaceholder(key)) {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  return key;
}

let serverSupabaseClient: SupabaseClient | null = null;
let serverAdminSupabaseClient: SupabaseClient | null = null;

/**
 * Standard server-side Supabase client.
 * Uses SERVICE_ROLE_KEY if available (bypassing RLS for backend workflows),
 * otherwise falls back to ANON_KEY.
 */
export function getServerSupabase(): SupabaseClient | null {
  const url = getSupabaseServerUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const anonKey = getSupabaseAnonKey();
  const activeKey = !isPlaceholder(serviceRoleKey)
    ? serviceRoleKey
    : !isPlaceholder(anonKey)
    ? anonKey
    : DEFAULT_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !activeKey || isPlaceholder(url) || isPlaceholder(activeKey)) {
    return null;
  }

  if (!serverSupabaseClient) {
    try {
      serverSupabaseClient = createClient(url, activeKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } catch (err) {
      console.error('[Server Supabase] Error creating client:', err);
      return null;
    }
  }
  return serverSupabaseClient;
}

/**
 * Privileged server-side Admin client requiring the confidential SUPABASE_SERVICE_ROLE_KEY.
 */
export function getServerSupabaseAdmin(): SupabaseClient | null {
  const url = getSupabaseServerUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const activeKey = !isPlaceholder(serviceRoleKey)
    ? serviceRoleKey
    : DEFAULT_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !activeKey || isPlaceholder(url) || isPlaceholder(activeKey)) {
    return null;
  }

  if (!serverAdminSupabaseClient) {
    try {
      serverAdminSupabaseClient = createClient(url, activeKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } catch (err) {
      console.error('[Server Supabase Admin] Error creating admin client:', err);
      return null;
    }
  }
  return serverAdminSupabaseClient;
}

export function isServerSupabaseActive(): boolean {
  return getServerSupabase() !== null;
}

export async function testServerSupabaseHealth(): Promise<{
  connected: boolean;
  url: string;
  hasServiceRoleKey: boolean;
  hasAnonKey: boolean;
  authWorking: boolean;
  message: string;
}> {
  const url = getSupabaseServerUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const anonKey = getSupabaseAnonKey();
  const client = getServerSupabase();

  if (!client || !url) {
    return {
      connected: false,
      url: url,
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasAnonKey: Boolean(anonKey),
      authWorking: false,
      message: 'Supabase credentials missing or placeholder values in environment.',
    };
  }

  try {
    const { error: authErr } = await client.auth.getSession();
    if (authErr) {
      return {
        connected: false,
        url,
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasAnonKey: Boolean(anonKey),
        authWorking: false,
        message: `Supabase auth handshake error: ${authErr.message}`,
      };
    }

    return {
      connected: true,
      url,
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasAnonKey: Boolean(anonKey),
      authWorking: true,
      message: 'Supabase connection established and operational.',
    };
  } catch (err: any) {
    return {
      connected: false,
      url,
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasAnonKey: Boolean(anonKey),
      authWorking: false,
      message: `Connection test failed: ${err.message || String(err)}`,
    };
  }
}
