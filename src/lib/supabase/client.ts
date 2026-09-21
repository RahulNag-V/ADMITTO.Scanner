import { createClient, SupabaseClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Strip trailing /rest/v1, /rest/v1/, or ending slashes
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

const DEFAULT_CLIENT_SUPABASE_URL = 'https://vifgaafjgzahqxuxtdar.supabase.co';
const DEFAULT_CLIENT_SUPABASE_ANON_KEY = 'sb_publishable_N40WjzqQ56ZVFuBdDKs34Q_Hopg04S2';

const envSupabaseUrl: string =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL)) ||
  '';

const envSupabaseAnonKey: string =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY)) ||
  '';

const normalizedUrl = normalizeSupabaseUrl(envSupabaseUrl);
export const SUPABASE_URL =
  normalizedUrl && !normalizedUrl.includes('your-project-id')
    ? normalizedUrl
    : DEFAULT_CLIENT_SUPABASE_URL;

const normalizedKey = (envSupabaseAnonKey || '').trim();
export const SUPABASE_ANON_KEY =
  normalizedKey && !normalizedKey.includes('your-anon-key') && !normalizedKey.includes('your-')
    ? normalizedKey
    : DEFAULT_CLIENT_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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
