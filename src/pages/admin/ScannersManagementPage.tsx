import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone,
  Plus,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Calendar,
  User,
  Users,
  Inbox,
  AlertTriangle,
  RefreshCw,
  Zap,
  Ban,
  History,
  ShieldAlert,
} from 'lucide-react';
import { ScannerAccount, ScannerReferralCode, ScannerAccessRequest } from '../../types';
import { scannersApi, referralCodesApi, scannerAccessApi } from '../../lib/api';
import { playFeedbackSound } from '../../lib/sound';
import { SkeletonScannerCard, TabSkeletonView } from '../../components/common/Skeleton';
import { getSupabaseClient } from '../../lib/supabase/client';

interface ScannersManagementPageProps {
  eventId: string;
}

type ManagementSubTab = 'requests' | 'codes' | 'stations';

export const ScannersManagementPage: React.FC<ScannersManagementPageProps> = ({ eventId }) => {
  const [activeSubTab, setActiveSubTab] = useState<ManagementSubTab>('requests');
  const [loading, setLoading] = useState(true);

  // Data state
  const [referralCodes, setReferralCodes] = useState<ScannerReferralCode[]>([]);
  const [accessRequests, setAccessRequests] = useState<ScannerAccessRequest[]>([]);
  const [gateStations, setGateStations] = useState<ScannerAccount[]>([]);

  // UI state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Approval Modal State
  const [approvingRequest, setApprovingRequest] = useState<ScannerAccessRequest | null>(null);
  const [selectedGate, setSelectedGate] = useState('Gate 1');
  const [selectedDuration, setSelectedDuration] = useState('8');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Rejection Modal State
  const [rejectingRequest, setRejectingRequest] = useState<ScannerAccessRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // Add Gate Station Modal
  const [isAddStationOpen, setIsAddStationOpen] = useState(false);
  const [stationName, setStationName] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [isCreatingStation, setIsCreatingStation] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadAllData();

      const client = getSupabaseClient();
      let channel: any = null;

      if (client) {
        channel = client
          .channel(`scanner-management-${eventId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'scanner_access_requests',
              filter: `event_id=eq.${eventId}`,
            },
            () => {
              scannerAccessApi.listRequests(eventId).then((res) => {
                if (res.requests) {
                  setAccessRequests(res.requests);
                }
              }).catch(() => {});
            }
          )
          .subscribe();
      }

      const pollInterval = setInterval(() => {
        scannerAccessApi.listRequests(eventId).then((res) => {
          if (res.requests) {
            setAccessRequests((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(res.requests)) {
                return res.requests;
              }
              return prev;
            });
          }
        }).catch(() => {});
      }, 4000);

      return () => {
        if (channel && client) {
          client.removeChannel(channel);
        }
        clearInterval(pollInterval);
      };
    }
  }, [eventId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [codesRes, reqsRes, stationsRes] = await Promise.all([
        referralCodesApi.list(eventId),
        scannerAccessApi.listRequests(eventId),
        scannersApi.list(eventId),
      ]);
      setReferralCodes(codesRes.codes);
      setAccessRequests(reqsRes.requests);
      setGateStations(stationsRes.scanners);
    } catch (err) {
      console.error('Failed to load scanner management data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReferralCode = async () => {
    try {
      setIsGeneratingCode(true);
      playFeedbackSound('click');
      const res = await referralCodesApi.create(eventId);
      if (res.code) {
        playFeedbackSound('success');
        setReferralCodes([res.code, ...referralCodes]);
      }
    } catch (err: any) {
      playFeedbackSound('error');
      alert(err.message || 'Failed to generate referral code');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleToggleReferralCode = async (code: ScannerReferralCode) => {
    try {
      playFeedbackSound('click');
      const newStatus = code.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      const res = await referralCodesApi.toggle(eventId, code.id, newStatus);
      if (res.code) {
        setReferralCodes((prev) => prev.map((c) => (c.id === code.id ? res.code : c)));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update referral code');
    }
  };

  const handleCopyCode = (codeStr: string) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCode(codeStr);
    playFeedbackSound('click');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // --- APPROVE REQUEST ---
  const handleOpenApproveModal = (req: ScannerAccessRequest) => {
    setApprovingRequest(req);
    setSelectedGate(gateStations.length > 0 ? gateStations[0].name : '');
    setSelectedDuration('8');
    playFeedbackSound('click');
  };

  const handleSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingRequest) return;
    setIsSubmittingApproval(true);

    try {
      const durationHours = parseInt(selectedDuration, 10);
      const matchedStation = gateStations.find((s) => s.name === selectedGate);
      const res = await scannerAccessApi.approve(eventId, approvingRequest.id, {
        gateName: selectedGate || 'General Scanner',
        scannerId: matchedStation?.id,
        durationHours: durationHours > 0 ? durationHours : undefined,
      });

      if (res.request) {
        playFeedbackSound('success');
        setAccessRequests((prev) =>
          prev.map((r) => (r.id === approvingRequest.id ? res.request : r))
        );
        setApprovingRequest(null);
      }
    } catch (err: any) {
      playFeedbackSound('error');
      alert(err.message || 'Failed to approve request');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // --- REJECT REQUEST ---
  const handleOpenRejectModal = (req: ScannerAccessRequest) => {
    setRejectingRequest(req);
    setRejectionReason('Access declined by event administrator.');
    playFeedbackSound('click');
  };

  const handleSubmitRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;
    setIsSubmittingRejection(true);

    try {
      const res = await scannerAccessApi.reject(eventId, rejectingRequest.id, rejectionReason.trim());
      if (res.request) {
        playFeedbackSound('success');
        setAccessRequests((prev) =>
          prev.map((r) => (r.id === rejectingRequest.id ? res.request : r))
        );
        setRejectingRequest(null);
      }
    } catch (err: any) {
      playFeedbackSound('error');
      alert(err.message || 'Failed to reject request');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // --- REVOKE ACCESS ---
  const handleRevokeAccess = async (req: ScannerAccessRequest) => {
    if (!confirm(`Are you sure you want to revoke scanner access for ${req.user_name} (${req.user_email})?`)) {
      return;
    }

    try {
      playFeedbackSound('click');
      const res = await scannerAccessApi.revoke(eventId, req.id);
      if (res.request) {
        playFeedbackSound('success');
        setAccessRequests((prev) => prev.map((r) => (r.id === req.id ? res.request : r)));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to revoke scanner access');
    }
  };

  // --- BLOCK USER ---
  const handleBlockUser = async (req: ScannerAccessRequest) => {
    if (!confirm(`Are you sure you want to block scanner access for ${req.user_name} (${req.user_email})? They will not be able to request access again until unblocked.`)) {
      return;
    }

    try {
      playFeedbackSound('click');
      const res = await scannerAccessApi.block(eventId, req.id);
      if (res.request) {
        playFeedbackSound('success');
        setAccessRequests((prev) => prev.map((r) => (r.id === req.id ? res.request : r)));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to block scanner user');
    }
  };

  // --- UNBLOCK USER ---
  const handleUnblockUser = async (req: ScannerAccessRequest) => {
    try {
      playFeedbackSound('click');
      const res = await scannerAccessApi.unblock(eventId, req.id);
      if (res.request) {
        playFeedbackSound('success');
        setAccessRequests((prev) => prev.map((r) => (r.id === req.id ? res.request : r)));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to unblock scanner user');
    }
  };

  // --- CREATE GATE STATION ---
  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationName.trim()) return;
    setIsCreatingStation(true);

    try {
      const res = await scannersApi.create({
        event_id: eventId,
        name: stationName.trim(),
        access_code: stationCode.trim().toUpperCase() || undefined,
      });

      if (res.scanner) {
        playFeedbackSound('success');
        const updatedStations = [res.scanner, ...gateStations];
        setGateStations(updatedStations);
        setIsAddStationOpen(false);
        setStationName('');
        setStationCode('');
      }
    } catch (err: any) {
      playFeedbackSound('error');
      alert(err.message || 'Failed to create gate station');
    } finally {
      setIsCreatingStation(false);
    }
  };

  const handleDeleteStation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gate station?')) return;
    try {
      await scannersApi.delete(eventId, id);
      playFeedbackSound('click');
      setGateStations((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete station');
    }
  };

  const pendingRequests = accessRequests.filter((r) => r.status === 'PENDING');
  const approvedRequests = accessRequests.filter((r) => r.status === 'APPROVED');
  const historyRequests = accessRequests.filter(
    (r) => r.status === 'REJECTED' || r.status === 'REVOKED' || r.status === 'BLOCKED' || r.status === 'EXPIRED' || r.is_blocked
  );

  if (loading && referralCodes.length === 0 && accessRequests.length === 0) {
    return <TabSkeletonView tabId="scanners" />;
  }

  return (
    <div id="scanners-management-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-black text-white font-['Space_Grotesk'] flex items-center gap-2.5">
            <span>Scanner Access & Referral Management</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Generate referral codes, review real-time scanner access requests, assign gate stations, and revoke operator credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeSubTab === 'codes' && (
            <button
              onClick={handleGenerateReferralCode}
              disabled={isGeneratingCode}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-orange-500/25 transition disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Referral Code</span>
            </button>
          )}

          {activeSubTab === 'stations' && (
            <button
              onClick={() => setIsAddStationOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-orange-500/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Gate Station</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => {
            setActiveSubTab('requests');
            playFeedbackSound('click');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'requests'
              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Access Requests</span>
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-mono font-bold animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveSubTab('codes');
            playFeedbackSound('click');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'codes'
              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Referral Codes</span>
          <span className="text-[10px] font-mono text-zinc-500">
            ({referralCodes.length})
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('stations');
            playFeedbackSound('click');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'stations'
              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Gate Stations</span>
          <span className="text-[10px] font-mono text-zinc-500">({gateStations.length})</span>
        </button>
      </div>

      {/* TAB 1: ACCESS REQUESTS QUEUE */}
      {activeSubTab === 'requests' && (
        <div className="space-y-6">
          {/* Section: Pending Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Pending Approval Queue ({pendingRequests.length})</span>
              </h2>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto" />
                <h3 className="text-sm font-bold text-white">All Caught Up!</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  No pending scanner access requests at this moment. Share your event referral code with volunteers to grant gate access.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl bg-zinc-900/90 border border-amber-500/30 space-y-4 shadow-lg shadow-black/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white truncate">{req.user_name}</h3>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
                            PENDING
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">{req.user_email}</p>
                        {req.referral_code && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-mono font-bold">
                            <KeyRound className="w-3 h-3" />
                            <span>Referral: {req.referral_code}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-800/80">
                      <button
                        onClick={() => handleOpenApproveModal(req)}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Access</span>
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(req)}
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-amber-400 hover:text-amber-300 transition cursor-pointer"
                        title="Reject Request (30-min cooldown applies to user)"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleBlockUser(req)}
                        className="py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/20 transition cursor-pointer"
                        title="Block Operator from Event"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Approved Scanner Operators */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Active Approved Scanner Operators ({approvedRequests.length})</span>
            </h2>

            {approvedRequests.length === 0 ? (
              <div className="p-6 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 text-center">
                <p className="text-xs text-zinc-500">No active scanner operators currently authorized.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-white truncate">{req.user_name}</h3>
                          <p className="text-[11px] text-zinc-400 truncate">{req.user_email}</p>
                          {req.referral_code && (
                            <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-mono font-bold">
                              <KeyRound className="w-2.5 h-2.5" />
                              <span>Code: {req.referral_code}</span>
                            </div>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold shrink-0">
                          AUTHORIZED
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/60 text-[11px] space-y-1 font-mono text-zinc-300">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Gate:</span>
                          <span className="text-orange-400 font-bold">{req.gate_name}</span>
                        </div>
                        {req.expires_at && (
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Expires:</span>
                            <span className="text-zinc-400">{new Date(req.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                      <button
                        onClick={() => handleRevokeAccess(req)}
                        className="flex-1 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                        <span>Revoke Access</span>
                      </button>
                      <button
                        onClick={() => handleBlockUser(req)}
                        className="py-1.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-bold border border-red-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Block Operator from Event"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Block</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Request History & Audit Trail */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-400" />
                <span>Request History & Audit Log ({historyRequests.length})</span>
              </h2>
            </div>

            {historyRequests.length === 0 ? (
              <div className="p-6 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 text-center">
                <p className="text-xs text-zinc-500">No historical requests or rejections recorded.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyRequests.map((req) => {
                  const isBlocked = req.is_blocked || req.status === 'BLOCKED';
                  const isRejected = req.status === 'REJECTED';
                  const isRevoked = req.status === 'REVOKED';

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white truncate">{req.user_name}</h4>
                          <span className="text-[11px] text-zinc-400">({req.user_email})</span>
                          {isBlocked ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold flex items-center gap-1">
                              <Ban className="w-3 h-3" />
                              <span>BLOCKED</span>
                            </span>
                          ) : isRejected ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono font-bold">
                              REJECTED
                            </span>
                          ) : isRevoked ? (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono font-bold">
                              REVOKED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold">
                              {req.status}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                          {req.referral_code && (
                            <span className="font-mono">Code: <strong className="text-orange-400">{req.referral_code}</strong></span>
                          )}
                          <span>Requested: {new Date(req.requested_at).toLocaleDateString()} {new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {req.rejection_reason && (
                            <span className="text-red-300/80 italic">"{req.rejection_reason}"</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isBlocked ? (
                          <button
                            onClick={() => handleUnblockUser(req)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Unblock Operator</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockUser(req)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition flex items-center gap-1.5 cursor-pointer"
                            title="Prohibit this user from requesting scanner access again"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Block Operator</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REFERRAL ACCESS CODES */}
      {activeSubTab === 'codes' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300 flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Share referral codes with gate staff or volunteer operators. Gate stations are optional — operators can scan for the general event or be assigned to a specific gate.
            </p>
          </div>

          {referralCodes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center space-y-3">
              <KeyRound className="w-8 h-8 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Referral Codes Generated</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Generate your first referral code to allow gate staff to connect to this event (gate stations are optional).
              </p>
              <button
                onClick={handleGenerateReferralCode}
                disabled={isGeneratingCode}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-orange-500/20 cursor-pointer inline-flex items-center gap-1.5 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Code</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {referralCodes.map((code) => {
                    const isCopied = copiedCode === code.code;
                    const isActive = code.status === 'ACTIVE';

                    return (
                      <div
                        key={code.id}
                        className={`p-5 rounded-2xl border transition space-y-4 flex flex-col justify-between ${
                          isActive
                            ? 'bg-zinc-900/90 border-zinc-800 shadow-lg shadow-black/40'
                            : 'bg-zinc-950/60 border-zinc-900 opacity-60'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                isActive
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                  : 'bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {code.status}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                              Active until event deleted
                            </span>
                          </div>

                          {/* Code Badge */}
                          <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-between gap-2">
                            <span className="font-mono text-base font-black tracking-widest text-orange-400">
                              {code.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(code.code)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                              title="Copy Code"
                            >
                              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                          <button
                            onClick={() => handleToggleReferralCode(code)}
                            className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                          >
                            {isActive ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-emerald-400" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-zinc-600" />
                                <span>Disabled</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleCopyCode(code.code)}
                            className="text-xs font-bold text-orange-400 hover:text-orange-300 transition cursor-pointer"
                          >
                            {isCopied ? 'Copied!' : 'Copy Code'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
        </div>
      )}

      {/* TAB 3: GATE STATIONS */}
      {activeSubTab === 'stations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Define gate stations (e.g. Gate 1, VIP Entrance) that can be assigned when approving scanner operators.
            </p>
          </div>

          {gateStations.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center space-y-3">
              <Smartphone className="w-8 h-8 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Gate Stations Provisioned</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Add physical gate stations to assign incoming scanner volunteers to specific doors.
              </p>
              <button
                onClick={() => setIsAddStationOpen(true)}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-orange-500/20"
              >
                Add Gate Station
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gateStations.map((station) => (
                <div
                  key={station.id}
                  className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">{station.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-mono font-bold">
                        {station.access_code}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">Gate Station Terminal</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <span className="text-[10px] font-mono text-zinc-500">
                      Created: {new Date(station.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDeleteStation(station.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete Station"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: APPROVE SCANNER REQUEST */}
      {approvingRequest &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl shadow-black">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Authorize Gate Operator</span>
                </div>
                <h2 className="text-lg font-black text-white font-['Space_Grotesk']">
                  Approve Scanner Access
                </h2>
                <p className="text-xs text-zinc-400">
                  Assign a gate station and session duration for this operator.
                </p>
              </div>

              {/* Operator info pill */}
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase font-mono text-zinc-500 font-bold">Operator</p>
                  {approvingRequest.referral_code && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-[10px] font-bold">
                      Code: {approvingRequest.referral_code}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-white">{approvingRequest.user_name}</p>
                <p className="text-xs text-zinc-400 font-mono">{approvingRequest.user_email}</p>
              </div>

              <form onSubmit={handleSubmitApproval} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="approve-gate-select" className="text-xs font-mono font-bold text-zinc-300">
                    ASSIGNED GATE STATION (OPTIONAL)
                  </label>
                  <select
                    id="approve-gate-select"
                    value={selectedGate}
                    onChange={(e) => setSelectedGate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-100 py-2">
                      None / General Scanner (Default)
                    </option>
                    {gateStations.map((s) => (
                      <option key={s.id} value={s.name} className="bg-zinc-900 text-zinc-100 py-2">
                        {s.name} ({s.access_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="approve-duration-select" className="text-xs font-mono font-bold text-zinc-300">
                    ACCESS DURATION
                  </label>
                  <select
                    id="approve-duration-select"
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="4" className="bg-zinc-900 text-zinc-100 py-2">4 Hours</option>
                    <option value="8" className="bg-zinc-900 text-zinc-100 py-2">8 Hours (Full Shift)</option>
                    <option value="12" className="bg-zinc-900 text-zinc-100 py-2">12 Hours</option>
                    <option value="24" className="bg-zinc-900 text-zinc-100 py-2">24 Hours (Full Day)</option>
                    <option value="0" className="bg-zinc-900 text-zinc-100 py-2">Event Duration (Unlimited)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setApprovingRequest(null)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingApproval}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                  >
                    {isSubmittingApproval ? 'Authorizing...' : 'Confirm Approval'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: REJECT SCANNER REQUEST */}
      {rejectingRequest &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl shadow-black">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-white font-['Space_Grotesk']">
                  Decline Scanner Access
                </h2>
                <p className="text-xs text-zinc-400">
                  Provide an optional reason why this access request is being declined.
                </p>
              </div>

              <form onSubmit={handleSubmitRejection} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="reject-reason-input" className="text-xs font-mono font-bold text-zinc-300">
                    REASON FOR REJECTION
                  </label>
                  <textarea
                    id="reject-reason-input"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Volunteer quota for Gate 1 is full."
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingRequest(null)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRejection}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-xs font-bold text-white shadow-lg shadow-red-500/20 transition disabled:opacity-50"
                  >
                    {isSubmittingRejection ? 'Declining...' : 'Decline Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: ADD GATE STATION */}
      {isAddStationOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl shadow-black">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-white font-['Space_Grotesk']">
                  Add Gate Station
                </h2>
                <p className="text-xs text-zinc-400">
                  Provision a named physical gate location (e.g. Main Auditorium North, VIP Entry).
                </p>
              </div>

              <form onSubmit={handleCreateStation} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="station-name-input" className="text-xs font-mono font-bold text-zinc-300">
                    STATION / GATE NAME
                  </label>
                  <input
                    id="station-name-input"
                    type="text"
                    required
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="e.g. Gate 1 (North Concourse)"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="station-code-input" className="text-xs font-mono font-bold text-zinc-300">
                    IDENTIFIER CODE (OPTIONAL)
                  </label>
                  <input
                    id="station-code-input"
                    type="text"
                    value={stationCode}
                    onChange={(e) => setStationCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GATE-NORTH-1"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-orange-500 uppercase"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddStationOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingStation}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
                  >
                    {isCreatingStation ? 'Creating...' : 'Save Station'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
