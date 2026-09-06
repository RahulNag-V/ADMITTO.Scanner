import React from 'react';
import {
  Volume2,
  VolumeX,
  Vibrate,
  Camera,
  Zap,
  Clock,
  Database,
  RefreshCw,
  Trash2,
  Shield,
  Smartphone,
  CheckCircle2,
  Sliders,
  LogOut,
  Info,
  Wifi,
  WifiOff,
  Activity,
} from 'lucide-react';
import { playFeedbackSound } from '../../lib/sound';

export interface ScannerPreferences {
  audioEnabled: boolean;
  hapticEnabled: boolean;
  cooldownDelay: number; // in ms
  autoContinuous: boolean;
  facingMode: 'environment' | 'user';
  torchEnabled: boolean;
  autoClearDelay: number; // in ms
  laserGunAutoSubmit: boolean;
}

interface ScannerSettingsTabProps {
  prefs: ScannerPreferences;
  onUpdatePrefs: (newPrefs: Partial<ScannerPreferences>) => void;
  scannerName: string;
  accessCode?: string;
  eventName?: string;
  isOnline?: boolean;
  isLoadingData?: boolean;
  onRefreshData?: () => void;
  offlineCount: number;
  onSyncOffline: () => void;
  onClearOffline: () => void;
  onLogout?: () => void;
}

export const ScannerSettingsTab: React.FC<ScannerSettingsTabProps> = ({
  prefs,
  onUpdatePrefs,
  scannerName,
  accessCode,
  eventName,
  isOnline = true,
  isLoadingData = false,
  onRefreshData,
  offlineCount,
  onSyncOffline,
  onClearOffline,
  onLogout,
}) => {
  return (
    <div id="scanner-settings-tab" className="space-y-6 pb-24 animate-fade-in max-w-4xl mx-auto w-full">
      {/* 1. Header Card */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Terminal Configuration
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk'] mt-2">
              Scanner Hardware & Operational Settings
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Manage network status, sound beeps, camera lenses, and device preferences
            </p>
          </div>

          <div className="p-3 rounded-2xl glass-dark border border-white/10 text-xs shrink-0">
            <div className="text-[10px] text-slate-400">Terminal Gate</div>
            <div className="font-bold text-white mt-0.5">{scannerName}</div>
            {accessCode && (
              <div className="text-[10px] font-mono text-indigo-300 mt-0.5">
                Code: {accessCode}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Network Connectivity & Data Sync Card */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Network & Data Synchronization</span>
          </div>
          {/* Real-time Online / Offline status badge */}
          <div
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${isOnline
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online • Connected' : 'Offline • Local Mode'}</span>
          </div>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Refresh Terminal Data Button */}
          <div className="p-4 rounded-2xl glass-dark border border-white/5 flex items-center justify-between gap-3 min-w-0">
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-indigo-400 shrink-0 ${isLoadingData ? 'animate-spin' : ''}`} />
                <span className="truncate">Reload Terminal Data</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Refresh attendees, history & stats
              </p>
            </div>
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                disabled={isLoadingData}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-50 text-white text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-indigo-400' : ''}`} />
                <span>{isLoadingData ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            )}
          </div>

          {/* Connection Mode Details (Fixed Badge Alignment) */}
          <div className="p-4 rounded-2xl glass-dark border border-white/5 flex items-center justify-between gap-3 min-w-0">
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Event Authority</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {eventName || 'Assigned Event Live'}
              </p>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold shrink-0 whitespace-nowrap self-center">
              SECURE TLS
            </span>
          </div>
        </div>
      </div>

      {/* 4. Audio & Haptic Feedback */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-indigo-400" />
          <span>Audio & Haptic Feedback</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Audio Beep Toggle */}
          <div className="p-4 rounded-2xl glass-dark border border-white/5 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                {prefs.audioEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <span>Audible Verification Beeps</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Play distinct acoustic tones on accepted, duplicate, or error scans
              </p>
            </div>
            <button
              onClick={() => onUpdatePrefs({ audioEnabled: !prefs.audioEnabled })}
              className={`w-12 h-6.5 rounded-full transition-all relative p-1 cursor-pointer shrink-0 ${prefs.audioEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white transition-all ${prefs.audioEnabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

          {/* Haptic Vibration Toggle */}
          <div className="p-4 rounded-2xl glass-dark border border-white/5 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Vibrate className="w-4 h-4 text-purple-400" />
                <span>Tactile Vibration</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Trigger hardware haptic pulses for rapid hands-on confirmation
              </p>
            </div>
            <button
              onClick={() => onUpdatePrefs({ hapticEnabled: !prefs.hapticEnabled })}
              className={`w-12 h-6.5 rounded-full transition-all relative p-1 cursor-pointer shrink-0 ${prefs.hapticEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white transition-all ${prefs.hapticEnabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Audio Test Tones */}
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 mr-2 font-medium">Test Tones:</span>
          <button
            onClick={() => playFeedbackSound('success')}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
          >
            🔊 Test Success
          </button>
          <button
            onClick={() => playFeedbackSound('duplicate')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all cursor-pointer"
          >
            ⚠️ Test Duplicate
          </button>
          <button
            onClick={() => playFeedbackSound('error')}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer"
          >
            ❌ Test Error
          </button>
        </div>
      </div>

      {/* 4. Camera & Optical Scanning */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Camera className="w-4 h-4 text-indigo-400" />
          <span>Camera & Optical Settings</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Camera Facing Mode */}
          <div className="p-4 rounded-2xl glass-dark border border-white/5 space-y-2">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>Default Camera Lens</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Select which camera module initializes on startup
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onUpdatePrefs({ facingMode: 'environment' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${prefs.facingMode === 'environment'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
              >
                Back Camera (Rear)
              </button>
              <button
                onClick={() => onUpdatePrefs({ facingMode: 'user' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${prefs.facingMode === 'user'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
              >
                Front Camera (Selfie)
              </button>
            </div>
          </div>

          {/* Flashlight Torch Toggle */}
          <div className="p-4 rounded-2xl glass-dark border border-white/5 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>LED Flashlight Torch</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Assist optical recognition in low-light or night venues
              </p>
            </div>
            <button
              onClick={() => onUpdatePrefs({ torchEnabled: !prefs.torchEnabled })}
              className={`w-12 h-6.5 rounded-full transition-all relative p-1 cursor-pointer shrink-0 ${prefs.torchEnabled ? 'bg-amber-500' : 'bg-slate-700'
                }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white transition-all ${prefs.torchEnabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Scanning Timers & Passback Lockout */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>Cooldown & Scan Behavior</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Duplicate Cooldown */}
          <div className="p-4 rounded-2xl glass-dark border border-white/5 space-y-2">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>Scan Cooldown Delay</span>
              <span className="text-indigo-400 font-mono text-[11px]">
                {(prefs.cooldownDelay / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pacing window between scans to prevent accidental double-scanning (4.0s - 6.0s)
            </p>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[4000, 4500, 5000, 6000].map((delay) => (
                <button
                  key={delay}
                  onClick={() => onUpdatePrefs({ cooldownDelay: delay, autoClearDelay: delay })}
                  className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${prefs.cooldownDelay === delay
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                >
                  {(delay / 1000).toFixed(1)}s
                </button>
              ))}
            </div>
          </div>

          {/* Auto Continuous vs Single */}
          <div className="p-4 rounded-2xl glass-dark border border-white/5 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Continuous High-Speed Mode</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Immediately re-arm scanner after each successful verification
              </p>
            </div>
            <button
              onClick={() => onUpdatePrefs({ autoContinuous: !prefs.autoContinuous })}
              className={`w-12 h-6.5 rounded-full transition-all relative p-1 cursor-pointer shrink-0 ${prefs.autoContinuous ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white transition-all ${prefs.autoContinuous ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Offline Queue & Cache Management */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <span>Offline Queue & Local Storage</span>
        </h2>

        <div className="p-4 rounded-2xl glass-dark border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Local Offline Queue:</span>
              <span
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${offlineCount > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
              >
                {offlineCount} Pending Scans
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Scans taken without internet connectivity are securely buffered and synced atomically
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onSyncOffline}
              disabled={offlineCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Now</span>
            </button>
            <button
              onClick={onClearOffline}
              disabled={offlineCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7. Exit / Logout Terminal */}
      {onLogout && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Scanner Terminal</span>
          </button>
        </div>
      )}
    </div>
  );
};
