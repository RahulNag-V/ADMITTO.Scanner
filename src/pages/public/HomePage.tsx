import React from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  Database,
  Smartphone,
  ShieldCheck,
  Activity,
  Wifi,
  Scan,
  Eye,
  Check,
  Download,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { AppleScrollReveal, AppleScrollStagger, AppleScrollCard } from '../../components/common/AppleScrollReveal';
import { ScrollingCautionTape } from '../../components/common/ScrollingCautionTape';
import { Watermark3DGyroBanner } from '../../components/common/Watermark3DGyroBanner';
import { AuthSession } from '../../types';
import { toBrowserPath } from '../../lib/router';
import { CrowdCanvas } from '@/components/ui/skiper39';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenStartNow: () => void;
  session?: AuthSession | null;
  onSelectRole?: (role: 'ADMIN' | 'SCANNER') => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenStartNow,
  session,
  onSelectRole,
}) => {

  const handleOpenPortal = (role: 'ADMIN' | 'SCANNER') => {
    if (onSelectRole) {
      onSelectRole(role);
    } else {
      if (role === 'ADMIN') {
        onNavigate(session && session.user.role === 'ADMIN' ? '/admin' : '/login');
      } else {
        onNavigate(session ? '/scan' : '/login');
      }
    }
  };

  return (
    <div id="home-page" className="w-full pb-14 overflow-x-hidden">
      {/* 1. HERO SECTION (FIT TO SCREEN VIEWPORT) */}
      <section
        id="hero-section"
        className="relative min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] flex flex-col justify-between items-center text-center apple-section-glow overflow-hidden pt-16 sm:pt-20 pb-0"
      >
        {/* Ambient Frosted Orb Background Glows with Floating Animation */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.15, 0.28, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-indigo-500/20 rounded-full blur-[140px] pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.1, 0.22, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute top-1/3 right-10 w-[450px] h-[350px] bg-purple-500/15 rounded-full blur-[120px] pointer-events-none"
        />

        {/* Animated OpenPeeps Crowd Canvas Background with Edge Blending */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden"
        >
          {/* Edge blending overlays: Top dissolve, lateral fades, and text-contrast shield */}
          <div className="absolute inset-x-0 top-0 h-24 sm:h-48 bg-gradient-to-b from-[#030408] via-[#030408]/90 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-16 sm:h-28 bg-gradient-to-t from-[#030408] via-[#030408]/70 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-16 sm:w-36 bg-gradient-to-r from-[#030408] via-[#030408]/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 sm:w-36 bg-gradient-to-l from-[#030408] via-[#030408]/80 to-transparent z-10 pointer-events-none" />

          {/* Radial readability shield behind interactive buttons & metrics */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_45%,#030408_35%,transparent_100%)] opacity-70 z-10 pointer-events-none" />

          {/* Crowd Canvas Layer - prominent desktop walking crowd matching original aesthetic while compact & fitted on mobile */}
          <div className="w-full h-full opacity-65 [filter:invert(1)_brightness(1.35)] pointer-events-none">
            <CrowdCanvas
              src={toBrowserPath('/peeps.png')}
              rows={15}
              cols={7}
              className="absolute bottom-0 left-0 w-full h-[42vh] sm:h-[65vh] md:h-[75vh] lg:h-[82vh] pointer-events-none"
            />
          </div>
        </div>

        {/* Floating Left Telemetry Badge (Desktop only) */}
        <div className="hidden xl:flex absolute left-8 top-1/3 -translate-y-1/2 z-10 flex-col gap-3 pointer-events-none select-none">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl space-y-1 max-w-[200px]"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-300">Live Telemetry</span>
            </div>
            <div className="text-xs font-bold text-white font-['Space_Grotesk']">Sub-50ms Optical Scan</div>
            <div className="text-[10px] text-slate-400">Zero duplicate tickets allowed</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl space-y-1 max-w-[200px]"
          >
            <div className="flex items-center gap-1.5 text-indigo-400 text-[10px] font-mono font-bold">
              <Database className="w-3 h-3" />
              <span>DUAL ENGINE</span>
            </div>
            <div className="text-xs font-bold text-white font-['Space_Grotesk']">Supabase + Memory</div>
            <div className="text-[10px] text-slate-400">Automatic failover & sync</div>
          </motion.div>
        </div>

        {/* Floating Right Telemetry Badge (Desktop only) */}
        <div className="hidden xl:flex absolute right-8 top-1/3 -translate-y-1/2 z-10 flex-col gap-3 pointer-events-none select-none">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl space-y-1 max-w-[200px] text-right"
          >
            <div className="flex items-center justify-end gap-1.5 text-orange-400 text-[10px] font-mono font-bold">
              <Wifi className="w-3 h-3" />
              <span>OFFLINE FIRST</span>
            </div>
            <div className="text-xs font-bold text-white font-['Space_Grotesk']">IndexedDB PWA</div>
            <div className="text-[10px] text-slate-400">Scans work without internet</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl space-y-1 max-w-[200px] text-right"
          >
            <div className="flex items-center justify-end gap-1.5 text-pink-400 text-[10px] font-mono font-bold">
              <ShieldCheck className="w-3 h-3" />
              <span>ATOMIC LOCK</span>
            </div>
            <div className="text-xs font-bold text-white font-['Space_Grotesk']">Multi-Gate Sync</div>
            <div className="text-[10px] text-slate-400">Instant cross-terminal lock</div>
          </motion.div>
        </div>

        {/* Vertically Centered Main Hero Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="my-auto w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center justify-center space-y-3 sm:space-y-4 md:space-y-5 py-2 sm:py-4"
        >
          {/* Top Live System Status Pill */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3.5 py-1 sm:py-1.5 rounded-full glass-pill text-[11px] sm:text-xs font-semibold tracking-wide shadow-sm mx-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-mono font-bold text-[10px] uppercase tracking-wider">Live System Active</span>
            <span className="text-white/30">•</span>
            <span>Zero-Queue Digital Token Validation Engine</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] font-['Space_Grotesk']"
          >
            Zero-Queue Event Access. <br />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              Atomic Duplicate Protection.
            </span>
          </motion.h1>

          {/* Body */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal px-2"
          >
            ADMITTO is the mission-critical digital event token validation platform. Choose your portal below to manage events or scan passes. Login is mandatory to access both portals.
          </motion.p>

          {/* Primary Dual Portal Actions Directly on Hero */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 pt-1 w-full max-w-md sm:max-w-none"
          >
            {/* Option 1: Admin Console */}
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              id="hero-admin-console-btn"
              onClick={() => handleOpenPortal('ADMIN')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-xl shadow-white/10 hover:shadow-indigo-500/20 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group"
            >
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Admin Console</span>
              {!session ? (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold flex items-center gap-1 border border-indigo-200">
                  <Lock className="w-2.5 h-2.5" /> Login Required
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono font-bold">
                  Open
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-slate-900 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {/* Option 2: Scanner Terminal */}
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              id="hero-scanner-terminal-btn"
              onClick={() => handleOpenPortal('SCANNER')}
              className="w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-orange-300 glass hover:bg-orange-500/15 border border-orange-500/30 hover:border-orange-500/50 shadow-xl shadow-orange-500/10 transition-all flex items-center justify-center gap-3 cursor-pointer group"
            >
              <Smartphone className="w-4 h-4 text-orange-400" />
              <span>Scanner Terminal</span>
              {!session ? (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-300 font-mono font-bold flex items-center gap-1 border border-orange-500/30">
                  <Lock className="w-2.5 h-2.5" /> Login Required
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  Open
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-orange-300 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>

          {/* Feature check-marks */}
          <motion.div
            variants={itemVariants}
            className="pt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:gap-6 text-[11px] sm:text-xs text-slate-400 font-medium"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Multi-Tenant Isolation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Mandatory Authentication</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Atomic Duplicate Protection</span>
            </div>
          </motion.div>

          {/* Quick Metrics Bar directly above caution tape */}
          <motion.div
            variants={itemVariants}
            className="w-full max-w-3xl mx-auto pt-1 pb-1"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md text-center">
                <div className="text-sm sm:text-base font-black text-white font-['Space_Grotesk']">
                  &lt; 50ms
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Scan Latency
                </div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md text-center">
                <div className="text-sm sm:text-base font-black text-emerald-400 font-['Space_Grotesk']">
                  Zero
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Duplicate Passes
                </div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md text-center">
                <div className="text-sm sm:text-base font-black text-indigo-300 font-['Space_Grotesk']">
                  50,000+
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Roster Scaling
                </div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md text-center">
                <div className="text-sm sm:text-base font-black text-orange-400 font-['Space_Grotesk']">
                  100%
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Offline-Resilient
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* DYNAMIC SCROLLING CAUTION TAPE RIBBONS DOCKED AT BOTTOM OF FIRST SCREEN FOLD */}
        <ScrollingCautionTape className="w-full mt-auto py-1 sm:py-2 select-none" />
      </section>

      {/* SUBSEQUENT SECTIONS CONTAINER */}
      <div className="space-y-8 sm:space-y-12 mt-6 sm:mt-10">
        {/* 3D GYROSCOPE SPATIAL WATERMARK BANNER */}
        <Watermark3DGyroBanner />

        {/* 2. CHOOSE YOUR ACCESS PORTAL SECTION (BOTH OPTIONS PROMINENT ON HOME PAGE) */}
        <section id="portals-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 space-y-6">
        <AppleScrollReveal direction="up" distance={25}>
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-widest text-indigo-400 glass-pill px-3.5 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Mandatory User Authentication</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-['Space_Grotesk'] tracking-tight">
              Select Your Access Portal
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Users must log in to open either portal. Unauthenticated guest access is completely disabled.
            </p>
          </div>
        </AppleScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Portal Card 1: Admin Console */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl p-6 sm:p-8 glass-card border border-indigo-500/25 hover:border-indigo-500/50 flex flex-col justify-between space-y-6 relative overflow-hidden group shadow-xl shadow-indigo-500/5"
          >
            {/* Top Glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                  <Shield className="w-6 h-6 text-indigo-400" />
                </div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  Organizers & Admins
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
                  Admin Console
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Full control center to create events, upload attendee lists, generate digital passes, and manage gate security.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-white/5 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Create events & configure custom attendee schemas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Import Excel / CSV rosters & issue QR/barcode passes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Generate volunteer scanner referral codes & station keys</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Live telemetry charts, audit trail & CSV data export</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 relative z-10">
              <button
                type="button"
                id="home-open-admin-btn"
                onClick={() => handleOpenPortal('ADMIN')}
                className="w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-lg shadow-white/10 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer group/btn"
              >
                {!session && <Lock className="w-4 h-4 text-indigo-600" />}
                <span>
                  {session
                    ? (session.user.role === 'ADMIN' ? 'Go to Admin Console' : 'Switch to Admin Console')
                    : 'Sign In to Open Admin Console'}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-900 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Portal Card 2: Scanner Terminal */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl p-6 sm:p-8 glass-card border border-orange-500/25 hover:border-orange-500/50 flex flex-col justify-between space-y-6 relative overflow-hidden group shadow-xl shadow-orange-500/5"
          >
            {/* Top Glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center justify-center shadow-lg shadow-orange-500/10">
                  <Smartphone className="w-6 h-6 text-orange-400" />
                </div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/25">
                  Gate Staff & Operators
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
                  Gate Scanner Terminal
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Real-time ticket validation terminal for checkpoints. Connect with event referral codes or station access codes.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-white/5 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Ultra-fast mobile camera QR & barcode scanner</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Hardware USB / Bluetooth barcode gun integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Atomic anti-passback & instant duplicate scan prevention</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Persistent access requests across logout, refresh, & devices</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 relative z-10">
              <button
                type="button"
                id="home-open-scanner-btn"
                onClick={() => handleOpenPortal('SCANNER')}
                className="w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer group/btn"
              >
                {!session && <Lock className="w-4 h-4 text-slate-900" />}
                <span>
                  {session ? 'Open Scanner Terminal' : 'Sign In to Open Scanner Terminal'}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-900 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. THE 6-STEP WORKFLOW SECTION */}
      <section id="workflow-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <AppleScrollReveal direction="up" distance={30}>
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-block text-xs uppercase font-bold tracking-widest text-indigo-400 glass-pill px-3 py-1 rounded-full">
              End-To-End Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk']">
              How ADMITTO Operates at Scale
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              From initial attendee list CSV upload to high-speed gate admission, each component guarantees zero data corruption.
            </p>
          </div>
        </AppleScrollReveal>

        <AppleScrollStagger staggerDelay={0.09} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Step 1 */}
          <AppleScrollCard className="glass rounded-3xl p-6 space-y-4 flex flex-col justify-between h-full border border-white/10 hover:border-indigo-400/30">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl glass-dark text-indigo-400 flex items-center justify-center font-bold text-base font-mono border border-white/5 shadow-inner">
                01
              </div>
              <h3 className="text-base font-bold text-white">Create Event</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Define your venue, date, admin contacts, and banner. Each event is strictly isolated to its creator admin profile via PostgreSQL Row Level Security.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Step 1 of 6</div>
          </AppleScrollCard>

          {/* Step 2 */}
          <AppleScrollCard className="glass rounded-3xl p-6 space-y-4 flex flex-col justify-between h-full border border-white/10 hover:border-indigo-400/30">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl glass-dark text-indigo-400 flex items-center justify-center font-bold text-base font-mono border border-white/5 shadow-inner">
                02
              </div>
              <h3 className="text-base font-bold text-white">Import Attendee CSV</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload spreadsheet rosters with USN, name, department, and branch. Automatic validation flags malformed rows before atomic database commit.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Step 2 of 6</div>
          </AppleScrollCard>

          {/* Step 3 */}
          <AppleScrollCard className="glass rounded-3xl p-6 space-y-4 flex flex-col justify-between h-full border border-white/10 hover:border-indigo-400/30">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl glass-dark text-indigo-400 flex items-center justify-center font-bold text-base font-mono border border-white/5 shadow-inner">
                03
              </div>
              <h3 className="text-base font-bold text-white">Generate Tokens</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every attendee receives collision-free 2D QR codes and 1D standard barcodes scoped to the specific event.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Step 3 of 6</div>
          </AppleScrollCard>

          {/* Step 4 */}
          <AppleScrollCard className="glass rounded-3xl p-6 space-y-4 flex flex-col justify-between h-full border border-white/10 hover:border-indigo-400/30">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl glass-dark text-indigo-400 flex items-center justify-center font-bold text-base font-mono border border-white/5 shadow-inner">
                04
              </div>
              <h3 className="text-base font-bold text-white">Create Gate Scanners</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provision dedicated scanner credentials (e.g. GATE1-NORTH) with expiration timestamps and instant enable/disable toggles.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Step 4 of 6</div>
          </AppleScrollCard>

          {/* Step 5 */}
          <AppleScrollCard className="glass rounded-3xl p-6 space-y-4 flex flex-col justify-between h-full border border-white/10 hover:border-indigo-400/30">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl glass-dark text-indigo-400 flex items-center justify-center font-bold text-base font-mono border border-white/5 shadow-inner">
                05
              </div>
              <h3 className="text-base font-bold text-white">Scan & Check In</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Staff scan QR or barcodes via mobile camera or handheld laser guns. Continuous auto-scanning with instant affirmative audio chime.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Step 5 of 6</div>
          </AppleScrollCard>

          {/* Step 6 */}
          <AppleScrollCard className="glass rounded-3xl p-6 space-y-4 flex flex-col justify-between h-full border border-white/10 hover:border-indigo-400/30">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl glass-dark text-indigo-400 flex items-center justify-center font-bold text-base font-mono border border-white/5 shadow-inner">
                06
              </div>
              <h3 className="text-base font-bold text-white">Live Realtime Feed</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Admins observe attendance counters, branch distributions, scan attempt audit trails, and export verified CSV rosters.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Step 6 of 6</div>
          </AppleScrollCard>
        </AppleScrollStagger>
      </section>

      {/* 3. ROLES BREAKDOWN (Admin vs Scanner) */}
      <section id="roles-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AppleScrollReveal direction="scale" distance={20}>
          <div className="glass-card rounded-[28px] p-6 sm:p-10 space-y-6 relative overflow-hidden border border-white/10 shadow-2xl">
            {/* Ambient Glow */}
            <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />

            <div className="text-center max-w-2xl mx-auto space-y-1.5 relative z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk']">
                Engineered for Two Distinct Roles
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Clear separation of privilege guarantees security and operational efficiency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
              {/* Role: Admin */}
              <AppleScrollCard className="glass-dark rounded-2xl p-5 sm:p-6 space-y-4 border border-white/5 hover:border-indigo-400/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Admin Capabilities</h3>
                    <p className="text-xs text-slate-400">Full event ownership & roster control</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Create, edit, archive and delete events</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Bulk import CSV attendee records & validate fields</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Create and manage gate scanner accounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Live dashboard statistics and branch distribution graphs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Export verified attendance CSV spreadsheets</span>
                  </li>
                </ul>
              </AppleScrollCard>

              {/* Role: Scanner */}
              <AppleScrollCard className="glass-dark rounded-2xl p-5 sm:p-6 space-y-4 border border-white/5 hover:border-purple-400/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Scanner Operator</h3>
                    <p className="text-xs text-slate-400">High-speed verification terminal</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Continuous live camera QR and barcode scanning</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Immediate visual & sound feedback (Success / Duplicate / Invalid)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Local offline queue with automatic reconnection sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Restricted strictly to assigned event (no cross-event leak)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Zero administrative permissions (cannot delete or view rosters)</span>
                  </li>
                </ul>
              </AppleScrollCard>
            </div>
          </div>
        </AppleScrollReveal>
      </section>

      {/* 4. FINAL CTA BANNER */}
      <section id="cta-banner" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AppleScrollReveal direction="up" distance={35}>
          <div className="relative rounded-[28px] glass-card p-6 sm:p-10 text-center text-white space-y-5 overflow-hidden border border-white/10 shadow-2xl">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/25 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-2xl mx-auto space-y-3 relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold font-['Space_Grotesk'] tracking-tight">
                Ready to eliminate entry congestion?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-normal">
                Create your organizer account and launch your event access system in minutes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 relative z-10">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                id="cta-start-btn"
                onClick={onOpenStartNow}
                className="px-8 py-4 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-xl transition-all cursor-pointer"
              >
                Launch ADMITTO Portal
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                id="cta-learn-btn"
                onClick={() => onNavigate('/features')}
                className="px-7 py-4 rounded-2xl glass text-slate-200 hover:bg-white/10 hover:text-white font-semibold text-xs transition-all cursor-pointer"
              >
                Explore Full Features
              </motion.button>
            </div>
          </div>
        </AppleScrollReveal>
      </section>
      </div>
    </div>
  );
};
