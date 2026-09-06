import React, { useEffect, useState } from 'react';
import { getCurrentSession } from '../../lib/supabaseAuth';
import { getSupabaseClient, SUPABASE_URL } from '../../lib/supabase/client';
import { saveSession } from '../../lib/api';
import { AuthSession } from '../../types';
import { AppLogo } from '../../components/common/AppLogo';
import {
  AlertCircle,
  LogIn,
  ArrowLeft,
  ExternalLink,
  KeyRound,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AuthCallbackPageProps {
  onAuthSuccess: (session: AuthSession, returnTo?: string) => void;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export const AuthCallbackPage: React.FC<AuthCallbackPageProps> = ({
  onAuthSuccess,
  onNavigateLogin,
  onNavigateHome,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isGoogleOAuthError, setIsGoogleOAuthError] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(true);

  const activeSupabaseUrl =
    SUPABASE_URL ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    '';
  const supabaseRedirectUri = activeSupabaseUrl
    ? `${activeSupabaseUrl.replace(/\/+$/, '')}/auth/v1/callback`
    : 'https://<your-project-id>.supabase.co/auth/v1/callback';

  const handleCopyUri = () => {
    navigator.clipboard.writeText(supabaseRedirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2500);
  };

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        // Check for error parameters in URL (search or hash)
        const rawError = searchParams.get('error') || hashParams.get('error');
        const rawDesc =
          searchParams.get('error_description') || hashParams.get('error_description');
        const rawCode = searchParams.get('error_code') || hashParams.get('error_code');

        if (rawError || rawDesc) {
          const decodedDesc = decodeURIComponent(rawDesc || rawError || 'Authentication failed');

          if (
            decodedDesc.includes('Unable to exchange external code') ||
            decodedDesc.includes('4/0A') ||
            rawCode === 'unexpected_failure'
          ) {
            setIsGoogleOAuthError(true);
            setError(
              'Google OAuth credentials mismatch. Google was unable to exchange the authorization code with Supabase.'
            );
            setErrorDetails(decodedDesc);
            return;
          }

          setError(decodedDesc);
          setErrorDetails(rawCode ? `Error code: ${rawCode}` : null);
          return;
        }

        const supabase = getSupabaseClient();

        // If PKCE authorization code is present in query parameters, exchange it explicitly
        const authCode = searchParams.get('code');
        if (authCode && supabase) {
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
              authCode
            );
            if (!exchangeError && data?.session) {
              if (isMounted) processSession(data.session);
              return;
            }
          } catch {
            // Fallback to checking session
          }
        }

        // Retrieve existing session from client
        let session = await getCurrentSession();

        if (!session?.user) {
          // Give Supabase client a moment to parse hash fragments
          await new Promise((resolve) => setTimeout(resolve, 800));
          session = await getCurrentSession();
        }

        if (!session?.user) {
          throw new Error('Could not establish an authenticated session. Please try logging in again.');
        }

        if (isMounted) {
          processSession(session);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Authentication callback failed.');
        }
      }
    }

    function processSession(session: any) {
      const user = session.user;
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User';

      const admittoSession: AuthSession = {
        token: session.access_token,
        user: {
          id: user.id,
          email: user.email || '',
          name: fullName,
          role: 'ADMIN',
        },
      };

      saveSession(admittoSession);

      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('returnTo') || undefined;

      onAuthSuccess(admittoSession, returnTo);
    }

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      id="auth-callback-page"
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white"
    >
      <button
        type="button"
        onClick={onNavigateHome}
        className="fixed top-4 left-4 sm:top-6 sm:left-8 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 text-xs font-medium text-slate-300 hover:text-white backdrop-blur-md shadow-lg transition-all cursor-pointer group"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Home</span>
      </button>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/20 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 relative z-10 text-center my-auto">
        <div className="inline-flex items-center gap-3 justify-center">
          <AppLogo size="md" className="shadow-xl shadow-orange-500/20" />
          <span className="text-2xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            ADMITTO
          </span>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-white/10 backdrop-blur-2xl text-left">
          {error ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-['Space_Grotesk']">
                    Authentication Issue
                  </h2>
                  <p className="text-xs text-rose-300">{error}</p>
                </div>
              </div>

              {/* Google OAuth Mismatch Explanation & Solution */}
              {isGoogleOAuthError && (
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      How to fix this in Google Cloud & Supabase:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowConfigHelp(!showConfigHelp)}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showConfigHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {showConfigHelp && (
                    <div className="space-y-2.5 pt-1 text-slate-300 leading-relaxed text-[11px] sm:text-xs">
                      <div>
                        <strong>1. Check Authorized Redirect URI in Google Cloud Console:</strong>
                        <p className="text-slate-400 mt-0.5">
                          In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID, the redirect URI must be set to your Supabase URL (not localhost):
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2 p-2 rounded-xl bg-black/40 border border-white/10 font-mono text-[10px] text-indigo-300 break-all">
                          <span>{supabaseRedirectUri}</span>
                          <button
                            type="button"
                            onClick={handleCopyUri}
                            className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer flex items-center gap-1"
                          >
                            {copiedUri ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedUri ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-1">
                        <strong>2. Check Client Secret in Supabase Dashboard:</strong>
                        <p className="text-slate-400 mt-0.5">
                          In Supabase Dashboard → Authentication → Providers → Google, make sure the <strong>Client Secret</strong> matches the secret generated in Google Cloud Console without trailing spaces.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  id="callback-login-btn"
                  onClick={onNavigateLogin}
                  className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Email & Password</span>
                </button>

                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="w-full py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer text-center block"
                >
                  Return to Home
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <span className="w-6 h-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Authenticating with ADMITTO...
                </h2>
                <p className="text-xs text-slate-400">
                  Verifying your credentials and preparing your event workspace.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
