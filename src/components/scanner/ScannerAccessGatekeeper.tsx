import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  KeyRound,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  MapPin,
  Calendar,
  User,
  Zap,
  Home,
} from 'lucide-react';
import { AuthSession, ScannerAccessRequest } from '../../types';
import { scannerAccessApi } from '../../lib/api';
import { AppLogo } from '../common/AppLogo';
import { getSupabaseClient } from '../../lib/supabase/client';

interface ScannerAccessGatekeeperProps {
  session: AuthSession;
  onStartScanner: (request: ScannerAccessRequest) => void;
  onLogout: () => void;
  onNavigateHome?: () => void;
}

export const ScannerAccessGatekeeper: React.FC<ScannerAccessGatekeeperProps> = ({
  session,
  onStartScanner,
  onLogout,
  onNavigateHome,
}) => {
  const [accessRequest, setAccessRequest] = useState<ScannerAccessRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  useEffect(() => {
    loadAccessStatus();
  }, []);

  // Sync cooldown remaining seconds whenever request updates
  useEffect(() => {
    if (accessRequest?.cooldown_remaining_seconds) {
      setCooldownRemaining(accessRequest.cooldown_remaining_seconds);
    } else {
      setCooldownRemaining(0);
    }
  }, [accessRequest?.id, accessRequest?.cooldown_remaining_seconds, accessRequest?.status]);

  // Live countdown timer ticking down every 1 second
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Real-time synchronization via Supabase Realtime + Polling fallback
  useEffect(() => {
    const client = getSupabaseClient();
    let channel: any = null;

    if (client) {
      channel = client
        .channel(`scanner-gatekeeper-${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'scanner_access_requests',
            filter: `user_id=eq.${session.user.id}`,
          },
          () => {
            scannerAccessApi.getMyAccess().then((res) => {
              if (res.request) {
                setAccessRequest((prev) => {
                  if (res.request?.status === 'APPROVED' && prev?.status !== 'APPROVED') {
                  }
                  return res.request;
                });
              }
            }).catch(() => {});
          }
        )
        .subscribe();
    }

    // Polling fallback every 3 seconds while on PENDING or active state
    const pollInterval = setInterval(() => {
      scannerAccessApi.getMyAccess().then((res) => {
        if (res.request) {
          setAccessRequest((prev) => {
            if (
              !prev ||
              prev.id !== res.request?.id ||
              prev.status !== res.request?.status ||
              prev.is_blocked !== res.request?.is_blocked
            ) {
              if (res.request?.status === 'APPROVED' && prev?.status !== 'APPROVED') {
              }
              return res.request;
            }
            return prev;
          });
        }
      }).catch(() => {});
    }, 3000);

    return () => {
      if (channel && client) {
        client.removeChannel(channel);
      }
      clearInterval(pollInterval);
    };
  }, [session.user.id]);

  const loadAccessStatus = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await scannerAccessApi.getMyAccess();
      setAccessRequest(res.request);
      if (res.request?.cooldown_remaining_seconds) {
        setCooldownRemaining(res.request.cooldown_remaining_seconds);
      }
    } catch (err: any) {
      console.error('Failed to load scanner access status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await scannerAccessApi.getMyAccess();
      setAccessRequest(res.request);
      if (res.request?.cooldown_remaining_seconds) {
        setCooldownRemaining(res.request.cooldown_remaining_seconds);
      }
      if (res.request?.status === 'APPROVED') {
      }
    } catch (err: any) {
      console.error('Failed to refresh access:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleRequestAccess = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const cleanCode = (customCode || referralCodeInput).trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter a valid scanner referral code.');
      return;
    }
    const cleanName = session.user.name || session.user.email?.split('@')[0] || 'Scanner Operator';

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await scannerAccessApi.requestAccess(cleanCode, cleanName);
      if (res.request) {
        setAccessRequest(res.request);
        setReferralCodeInput('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired referral code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRerequest = async () => {
    if (!accessRequest || !accessRequest.referral_code) {
      handleResetRequest();
      return;
    }
    await handleRequestAccess(undefined, accessRequest.referral_code);
  };

  const handleResetRequest = () => {
    setAccessRequest(null);
    setReferralCodeInput('');
    setErrorMessage(null);
    setCooldownRemaining(0);
  };

  const formatCooldown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#10232D] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B303A] border border-[#314A56] flex items-center justify-center animate-spin">
            <RefreshCw className="w-5 h-5 text-[#FFE3A6]" />
          </div>
          <p className="text-xs font-mono text-[#8A9BA8] tracking-wider uppercase">Checking Scanner Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#10232D] text-[#ECEEF0] flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between w-full max-w-2xl mx-auto z-10">
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-2 cursor-pointer group select-none"
          title="Return to Home"
        >
          <AppLogo />
          <span className="hidden xs:inline-block text-xs font-mono font-bold text-[#8A9BA8] group-hover:text-white transition">
            Home
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B303A] border border-[#314A56] text-xs font-medium text-[#ECEEF0] hover:border-[#FFE3A6] transition cursor-pointer"
              title="Return to Home Page"
            >
              <Home className="w-3.5 h-3.5 text-[#FFE3A6]" />
              <span>Home</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-xl mx-auto my-auto py-8 z-10">
        <AnimatePresence mode="wait">
          {/* CASE A: No Request / Fresh State */}
          {(!accessRequest || accessRequest.status === 'EXPIRED') && (
            <motion.div
              key="connect-screen"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="bg-[#1B303A] border border-[#314A56] rounded-2xl p-6 sm:p-8 space-y-6 shadow-none"
            >
              {accessRequest?.status === 'EXPIRED' && (
                <div className="p-3.5 rounded-xl bg-[#0C1B23] border border-[#E255A2]/30 text-[#E4A0B3] text-xs flex items-center gap-2.5">
                  <Clock className="w-4 h-4 shrink-0 text-[#E255A2]" />
                  <span>Your previous scanner session expired. Enter a referral code to request new access.</span>
                </div>
              )}

              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0C1B23] border border-[#314A56] text-[#FFE3A6] text-xs font-bold font-mono uppercase tracking-wider">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Gate Terminal Access</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#ECEEF0]">
                  Connect to an Event
                </h1>
                <p className="text-xs sm:text-sm text-[#8A9BA8] leading-relaxed">
                  Enter your operator display name and the referral code provided by your event administrator to request scanner authorization.
                </p>
              </div>

              {/* Authenticated Identity Pill */}
              <div className="p-3.5 rounded-xl bg-[#0C1B23] border border-[#314A56] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#1B303A] border border-[#314A56] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#FFE3A6]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-mono text-[#8A9BA8] font-bold">Operator Identity</p>
                    <p className="text-xs font-medium text-[#ECEEF0] truncate">{session.user.name} ({session.user.email})</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-[#FFE3A6] bg-[#1B303A] border border-[#314A56] px-2 py-0.5 rounded-md shrink-0">
                  <ShieldCheck className="w-3 h-3 text-[#FFE3A6]" />
                  <span>VERIFIED</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={(e) => handleRequestAccess(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="referral-code-input" className="text-xs font-mono font-bold text-[#8A9BA8]">
                    EVENT REFERRAL CODE
                  </label>
                  <input
                    id="referral-code-input"
                    type="text"
                    required
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. GTS26-K7P9"
                    className="w-full px-4 py-3 bg-[#0C1B23] border border-[#314A56] rounded-xl text-sm sm:text-base font-mono font-bold text-[#ECEEF0] placeholder:text-[#8A9BA8]/50 focus:outline-none focus:border-[#FFE3A6] focus:ring-1 focus:ring-[#FFE3A6]/30 tracking-wider uppercase transition"
                  />
                </div>

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-[#0C1B23] border border-[#E255A2]/30 text-[#E4A0B3] text-xs flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#E255A2] shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#FFE3A6] hover:bg-[#ffeac0] active:scale-[0.99] text-sm font-bold text-[#10232D] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#10232D]" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Request Scanner Access</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* CASE B: Pending Approval */}
          {accessRequest && accessRequest.status === 'PENDING' && (
            <motion.div
              key="pending-screen"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="bg-[#1B303A] border border-[#314A56] rounded-2xl p-6 sm:p-8 space-y-6 shadow-none"
            >
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0C1B23] border border-[#314A56] text-[#FFE3A6] text-xs font-bold font-mono uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Waiting for Admin Approval</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#ECEEF0]">
                  Access Request Pending
                </h1>
                <p className="text-xs sm:text-sm text-[#ECEEF0] leading-relaxed font-medium">
                  Access request pending. Waiting for admin approval.
                </p>
                <p className="text-xs text-[#8A9BA8]">
                  Your request has been securely recorded in the database. When the event administrator approves your request, this terminal will unlock automatically.
                </p>
              </div>

              {/* Event Card Info */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#0C1B23] border border-[#314A56] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#FFE3A6] font-bold">Target Event</span>
                    <h2 className="text-base sm:text-lg font-bold text-[#ECEEF0]">{accessRequest.event_title || 'Assigned Event'}</h2>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-[#1B303A] border border-[#314A56] text-[#FFE3A6] text-[10px] font-mono font-bold uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFE3A6]" />
                    <span>PENDING</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#314A56] text-xs text-[#8A9BA8]">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#8A9BA8] shrink-0" />
                    <span className="truncate">Operator: <strong className="text-[#ECEEF0] font-medium">{accessRequest.user_name}</strong></span>
                  </div>
                  {accessRequest.referral_code && (
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
                      <span className="truncate font-mono">Code: <strong className="text-[#FFE3A6] font-bold">{accessRequest.referral_code}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#8A9BA8] shrink-0" />
                    <span className="truncate">{accessRequest.event_venue || 'Main Venue'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#8A9BA8] shrink-0" />
                    <span className="truncate">Organizer: {accessRequest.admin_name || 'Event Admin'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#FFE3A6] hover:bg-[#ffeac0] active:scale-[0.99] text-sm font-bold text-[#10232D] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Status</span>
                </button>

                <button
                  onClick={handleResetRequest}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0C1B23] hover:bg-[#1B303A] border border-[#314A56] text-xs font-medium text-[#8A9BA8] hover:text-[#ECEEF0] transition cursor-pointer"
                >
                  Enter Another Referral Code
                </button>
              </div>
            </motion.div>
          )}

          {/* CASE C: Blocked */}
          {accessRequest && (accessRequest.status === 'BLOCKED' || accessRequest.is_blocked) && (
            <motion.div
              key="blocked-screen"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="bg-[#1B303A] border border-[#E255A2]/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-none"
            >
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0C1B23] border border-[#E255A2]/30 text-[#E255A2] text-xs font-bold font-mono uppercase tracking-wider">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Access Restricted</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#ECEEF0]">
                  Access Blocked by Administrator
                </h1>
                <p className="text-xs sm:text-sm text-[#8A9BA8] leading-relaxed">
                  The organizer of <span className="text-[#ECEEF0] font-medium">{accessRequest.event_title}</span> has restricted access requests for your account. You cannot submit another request until the administrator removes this restriction.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0C1B23] border border-[#E255A2]/30 space-y-1 text-xs text-[#E4A0B3]">
                <p className="font-bold font-mono uppercase text-[#E255A2]">Policy Notice</p>
                <p>Scanner operations and new access requests are temporarily locked for this event. Please contact the event administrator to unblock your account.</p>
              </div>

              <button
                onClick={handleResetRequest}
                className="w-full py-3.5 px-4 rounded-xl bg-[#0C1B23] hover:bg-[#314A56]/30 border border-[#314A56] text-sm font-semibold text-[#ECEEF0] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Enter Another Referral Code</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* CASE D: Rejected */}
          {accessRequest && accessRequest.status === 'REJECTED' && !accessRequest.is_blocked && (
            <motion.div
              key="rejected-screen"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="bg-[#1B303A] border border-[#E255A2]/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-none"
            >
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0C1B23] border border-[#E255A2]/30 text-[#E255A2] text-xs font-bold font-mono uppercase tracking-wider">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Request Declined</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#ECEEF0]">
                  Access Rejected
                </h1>
                <p className="text-xs sm:text-sm text-[#ECEEF0] leading-relaxed">
                  Your request to access <span className="text-[#FFE3A6] font-medium">{accessRequest.event_title}</span> was rejected by the administrator.
                </p>
              </div>

              {accessRequest.rejection_reason && (
                <div className="p-4 rounded-xl bg-[#0C1B23] border border-[#E255A2]/30 space-y-1">
                  <p className="text-[10px] font-mono uppercase text-[#E255A2] font-bold">Reason Provided by Admin</p>
                  <p className="text-xs text-[#E4A0B3]">{accessRequest.rejection_reason}</p>
                </div>
              )}

              {/* Cooldown Timer or Re-request Action */}
              {cooldownRemaining > 0 ? (
                <div className="p-4 rounded-xl bg-[#0C1B23] border border-[#314A56] text-[#FFE3A6] text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Clock className="w-4 h-4 text-[#FFE3A6] shrink-0" />
                      <span>Cooldown Active</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#1B303A] border border-[#314A56] font-mono font-bold text-[#FFE3A6] text-sm">
                      {formatCooldown(cooldownRemaining)}
                    </span>
                  </div>
                  <p className="text-[#8A9BA8] leading-relaxed">
                    Your access request was rejected. You can request access again after the cooldown period.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleRerequest}
                    disabled={submitting}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#FFE3A6] hover:bg-[#ffeac0] active:scale-[0.99] text-sm font-bold text-[#10232D] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#10232D]" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#10232D]" />
                        <span>Request Access Again</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-[#8A9BA8] text-center">
                    The 30-minute cooldown has elapsed. You can now submit another access request.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-[#0C1B23] border border-[#E255A2]/30 text-[#E4A0B3] text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#E255A2] shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                onClick={handleResetRequest}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0C1B23] hover:bg-[#1B303A] border border-[#314A56] text-xs font-medium text-[#8A9BA8] hover:text-[#ECEEF0] transition cursor-pointer"
              >
                Enter Another Referral Code
              </button>
            </motion.div>
          )}

          {/* CASE E: Revoked */}
          {accessRequest && accessRequest.status === 'REVOKED' && !accessRequest.is_blocked && (
            <motion.div
              key="revoked-screen"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="bg-[#1B303A] border border-[#314A56] rounded-2xl p-6 sm:p-8 space-y-6 shadow-none"
            >
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0C1B23] border border-[#314A56] text-[#E255A2] text-xs font-bold font-mono uppercase tracking-wider">
                  <XCircle className="w-3.5 h-3.5 text-[#E255A2]" />
                  <span>Access Revoked</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#ECEEF0]">
                  Scanner Access Removed
                </h1>
                <p className="text-xs sm:text-sm text-[#8A9BA8] leading-relaxed">
                  Your access to <span className="text-[#ECEEF0] font-medium">{accessRequest.event_title}</span> was removed by the administrator. You may request access again with a valid referral code.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleRerequest}
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#FFE3A6] hover:bg-[#ffeac0] active:scale-[0.99] text-sm font-bold text-[#10232D] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#10232D]" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#10232D]" />
                      <span>Request Access Again</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetRequest}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0C1B23] hover:bg-[#1B303A] border border-[#314A56] text-xs font-medium text-[#8A9BA8] hover:text-[#ECEEF0] transition cursor-pointer"
                >
                  Enter Another Referral Code
                </button>
              </div>
            </motion.div>
          )}

          {/* CASE F: Approved & Authorized */}
          {accessRequest && accessRequest.status === 'APPROVED' && (
            <motion.div
              key="approved-screen"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="bg-[#1B303A] border border-[#314A56] rounded-2xl p-6 sm:p-8 space-y-6 shadow-none"
            >
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0C1B23] border border-[#314A56] text-[#FFE3A6] text-xs font-bold font-mono uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFE3A6]" />
                  <span>Access Approved</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#ECEEF0]">
                  Scanner Terminal Ready
                </h1>
                <p className="text-xs sm:text-sm text-[#FFE3A6] leading-relaxed font-medium">
                  Access approved. You can enter and use the scanner terminal for this event.
                </p>
                <p className="text-xs text-[#8A9BA8] leading-relaxed">
                  Your scanner authorization remains active whenever you return or log into your account.
                </p>
              </div>

              {/* Event & Gate Info Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#0C1B23] border border-[#314A56] space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#FFE3A6] font-bold">Assigned Event</span>
                    <h2 className="text-base sm:text-lg font-bold text-[#ECEEF0]">{accessRequest.event_title}</h2>
                    <p className="text-xs text-[#8A9BA8] mt-0.5">{accessRequest.event_venue}</p>
                  </div>
                  <div className="px-3 py-1 rounded-md bg-[#1B303A] border border-[#314A56] text-[#FFE3A6] text-xs font-mono font-bold shrink-0">
                    {accessRequest.gate_name}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#314A56] flex items-center justify-between text-xs text-[#8A9BA8]">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#8A9BA8]" />
                    <span>Operator: {session.user.email}</span>
                  </div>
                  {accessRequest.referral_code && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-[#8A9BA8]">
                      <KeyRound className="w-3 h-3 text-[#FFE3A6]" />
                      <span>{accessRequest.referral_code}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Start Terminal Button */}
              <button
                onClick={() => onStartScanner(accessRequest)}
                className="w-full py-3.5 px-4 rounded-xl bg-[#FFE3A6] hover:bg-[#ffeac0] active:scale-[0.99] text-base font-bold text-[#10232D] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-5 h-5 fill-current text-[#10232D]" />
                <span>Launch Scanner Terminal</span>
                <ArrowRight className="w-5 h-5 text-[#10232D]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[#8A9BA8] z-10">
        ADMITTO Digital Event Access & Verification Platform
      </div>
    </div>
  );
};
