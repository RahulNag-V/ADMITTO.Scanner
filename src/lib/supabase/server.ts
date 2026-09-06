import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
    '';
  return normalizeSupabaseUrl(rawUrl);
}

export function getSupabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    ''
  );
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
  const activeKey = serviceRoleKey || anonKey;

  if (!url || !activeKey || url.includes('your-project-id') || activeKey.includes('your-')) {
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

  if (!url || !serviceRoleKey || url.includes('your-project-id') || serviceRoleKey.includes('your-service-role-key')) {
    return null;
  }

  if (!serverAdminSupabaseClient) {
    try {
      serverAdminSupabaseClient = createClient(url, serviceRoleKey, {
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
