import { createClient, SupabaseClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Strip trailing /rest/v1, /rest/v1/, or ending slashes
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env as any)[key] || '';
    }
  } catch {
    // fallback
  }
  return '';
};

const rawSupabaseUrl =
  getEnvVar('VITE_SUPABASE_URL') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL') ||
  getEnvVar('SUPABASE_URL');

const rawSupabaseAnonKey =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  getEnvVar('SUPABASE_ANON_KEY');

export const SUPABASE_URL = normalizeSupabaseUrl(rawSupabaseUrl);
export const SUPABASE_ANON_KEY = rawSupabaseAnonKey.trim();

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('your-project-id') || SUPABASE_ANON_KEY.includes('your-anon-key')) {
    return null;
  }
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.error('[Supabase Client] Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseClient;
}

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  url: string;
  error?: string;
}

export function validateSupabaseConfig(): SupabaseConfigStatus {
  const hasUrl = Boolean(SUPABASE_URL && !SUPABASE_URL.includes('your-project-id'));
  const hasAnonKey = Boolean(SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('your-anon-key'));

  if (!hasUrl && !hasAnonKey) {
    return {
      isConfigured: false,
      hasUrl: false,
      hasAnonKey: false,
      url: '',
      error: 'Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment configuration.',
    };
  }
  if (!hasUrl) {
    return {
      isConfigured: false,
      hasUrl: false,
      hasAnonKey: true,
      url: '',
      error: 'Invalid or missing VITE_SUPABASE_URL.',
    };
  }
  if (!hasAnonKey) {
    return {
      isConfigured: false,
      hasUrl: true,
      hasAnonKey: false,
      url: SUPABASE_URL,
      error: 'Invalid or missing VITE_SUPABASE_ANON_KEY.',
    };
  }

  return {
    isConfigured: true,
    hasUrl: true,
    hasAnonKey: true,
    url: SUPABASE_URL,
  };
}

export const isSupabaseConfigured = (): boolean => {
  return validateSupabaseConfig().isConfigured;
};
