import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Globe,
  Radio,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Database,
  Smartphone,
} from 'lucide-react';
import { playFeedbackSound } from '../../lib/sound';

interface NetworkErrorViewProps {
  onRetry: () => void;
  onContinueOffline?: () => void;
  isRetrying?: boolean;
  timeoutSeconds?: number;
  errorMessage?: string;
  isScannerTerminal?: boolean;
}

export const NetworkErrorView: React.FC<NetworkErrorViewProps> = ({
  onRetry,
  onContinueOffline,
  isRetrying = false,
  timeoutSeconds = 15,
  errorMessage = 'Unable to establish a secure link to Admitto cloud servers.',
  isScannerTerminal = false,
}) => {
  const [countdown, setCountdown] = useState(10);
  const [pingStatus, setPingStatus] = useState<'checking' | 'failed' | 'online'>('checking');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  // Auto-retry countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleManualRetry();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleManualRetry = () => {
    playFeedbackSound('click');
    setPingStatus('checking');
    onRetry();
    setCountdown(10);
  };

  return (
    <div
      id="network-error-screen"
      className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 text-slate-100 relative overflow-hidden selection:bg-rose-500 selection:text-white"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[#030408]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(244,63,94,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(99,102,241,0.08),transparent_60%)] pointer-events-none" />
      
      {/* Micro-grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Main Glass Card Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-xl w-full bg-[#121626]/85 border border-rose-500/30 backdrop-blur-3xl rounded-3xl p-6 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.8)] space-y-6 text-center"
      >
        {/* Animated Radar Pulse Icon */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-rose-500/15 animate-ping" />
          <div className="absolute -inset-2 rounded-full border border-rose-500/25 animate-pulse" />
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/25 to-rose-600/10 border border-rose-500/40 backdrop-blur-xl flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/20">
            <WifiOff className="w-9 h-9" />
          </div>
        </div>

        {/* Header & Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold tracking-wider uppercase">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Connection Interrupted (&gt;{timeoutSeconds}s)</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-['Space_Grotesk']">
            Network Connection Lost
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
            {errorMessage} We were unable to reach the ingress telemetry servers after repeated attempts.
          </p>
        </div>

        {/* Live Status & Auto-Reconnect Progress */}
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 space-y-3 backdrop-blur-md text-left">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400 animate-pulse" />
              <span className="font-bold text-white">Diagnostics:</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-400">
              Auto-retrying in <span className="text-white font-bold">{countdown}s</span>
            </span>
          </div>

          {/* Progress Bar for Auto-Retry */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${((10 - countdown) / 10) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-zinc-300 font-mono">
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <span>Local Wi-Fi / Data:</span>
              <span className={navigator.onLine ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {navigator.onLine ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <span>API Gateway:</span>
              <span className="text-amber-400 font-bold">Unreachable</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleManualRetry}
            disabled={isRetrying}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-rose-500/25 transition-all cursor-pointer disabled:opacity-50 select-none"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Testing Connection...' : 'Retry Connection Now'}</span>
          </button>

          {onContinueOffline && (
            <button
              type="button"
              onClick={onContinueOffline}
              className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-zinc-200 hover:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-md select-none"
            >
              <Database className="w-4 h-4 text-amber-400" />
              <span>Offline Cache Mode</span>
            </button>
          )}
        </div>

        {/* Troubleshooting Checklist Accordion */}
        <div className="pt-2 border-t border-white/10 text-left">
          <button
            type="button"
            onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
            className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{diagnosticsOpen ? '▾ Hide Troubleshooting Tips' : '▸ Show Troubleshooting Tips'}</span>
          </button>

          {diagnosticsOpen && (
            <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>Verify that your Wi-Fi, Ethernet, or mobile data is toggled on.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>If using campus/enterprise network, check for captive login portals.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>All local check-ins performed on scanner terminals remain safely queued in IndexedDB.</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
