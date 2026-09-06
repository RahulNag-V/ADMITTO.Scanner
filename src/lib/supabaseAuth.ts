/**
 * ADMITTO Supabase Auth Helper
 * ─────────────────────────────────────────────────────────────────
 * Complete, production-ready Supabase Auth wrapper supporting:
 *  - Email + Password login & signup
 *  - Real Google OAuth (signInWithOAuth)
 *  - Email verification handling & resending
 *  - Password reset / recovery
 *  - Session management & token retrieval
 *  - Client-safe (uses only ANON / publishable key)
 */
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase/client';

// ─── Human-readable Error Mapping ──────────────────────────────────
export function mapAuthError(error: any): string {
  if (!error) return 'An unknown error occurred.';
  const msg: string = error?.message || error?.error_description || String(error) || '';
  const code: string = error?.code || '';

  if (code === 'invalid_credentials' || msg.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'Please verify your email address. Check your inbox for the confirmation link.';
  }
  if (msg.includes('User already registered') || code === 'user_already_exists') {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('Password should be at least') || msg.includes('password_too_short')) {
    return 'Password must be at least 6 characters long.';
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network connection error. Please check your internet and try again.';
  }
  if (msg.includes('expired') || code === 'otp_expired') {
    return 'Your verification or reset link has expired. Please request a new one.';
  }
  if (msg.toLowerCase().includes('weak password')) {
    return 'Password is too weak. Please include letters, numbers, and symbols.';
  }
  if (msg.includes('For security purposes')) {
    return 'For security purposes, please wait a minute before requesting another email.';
  }

  return msg || 'Authentication failed. Please try again.';
}

// ─── Return Types ─────────────────────────────────────────────────
export interface AuthResult {
  user: User | null;
  session: Session | null;
  needsEmailVerification?: boolean;
}

// ─── Core Auth Operations ─────────────────────────────────────────

/**
 * Sign in with email and password.
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw new Error(mapAuthError(error));
  }

  return { user: data.user, session: data.session };
}

/**
 * Sign up with email, password, and full name.
 * Respects Supabase email confirmation settings.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult & { needsEmailVerification: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  const origin = window.location.origin;
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        name: fullName.trim(),
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(mapAuthError(error));
  }

  // If email confirmation is enabled in Supabase project:
  // session is null, user is returned with confirmed_at = null
  const isEmailConfirmed = Boolean(data.user?.email_confirmed_at || data.session);
  const needsEmailVerification = !isEmailConfirmed && Boolean(data.user);

  return {
    user: data.user,
    session: data.session,
    needsEmailVerification,
  };
}

/**
 * Real Google OAuth Sign-in using Supabase Auth.
 */
export async function signInWithGoogle(returnTo?: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  // Pre-flight check: Verify if Google provider is enabled in Supabase project
  // to avoid redirecting the user to a raw JSON 400 error page
  try {
    const origin = window.location.origin;
    const checkRes = await fetch(
      `${(supabase as any).supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${origin}/auth/callback`)}`,
      {
        method: 'GET',
        headers: {
          apikey: (supabase as any).supabaseKey,
        },
      }
    );

    if (checkRes.status === 400) {
      const data = await checkRes.json().catch(() => null);
      if (
        data?.msg?.includes('provider is not enabled') ||
        data?.error_code === 'validation_failed'
      ) {
        throw new Error(
          'Google Sign-In is not enabled in your Supabase project dashboard yet. Please enable Google in Supabase Dashboard → Authentication → Providers → Google, or sign in with your Email & Password below.'
        );
      }
    }
  } catch (err: any) {
    if (err.message?.includes('Google Sign-In is not enabled')) {
      throw err;
    }
    // Network or other non-blocking errors fall through to regular OAuth attempt
  }

  const origin = window.location.origin;
  const callbackUrl = new URL(`${origin}/auth/callback`);
  if (returnTo) {
    callbackUrl.searchParams.set('returnTo', returnTo);
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Error(mapAuthError(error));
  }
}

/**
 * Resend email confirmation / verification link.
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const origin = window.location.origin;
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(mapAuthError(error));
  }
}

/**
 * Send password reset email.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const origin = window.location.origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    throw new Error(mapAuthError(error));
  }
}

/**
 * Update user's password (used on /reset-password screen after recovery).
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(mapAuthError(error));
  }
}

/**
 * Sign out current session.
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Get current cached session.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/**
 * Get current user.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

/**
 * Get the current JWT access token for API requests.
 */
export async function getCurrentAccessToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
}

/**
 * Subscribe to Supabase Auth state changes.
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

/**
 * Check if Supabase client is available.
 */
export function isSupabaseAvailable(): boolean {
  return getSupabaseClient() !== null;
}
