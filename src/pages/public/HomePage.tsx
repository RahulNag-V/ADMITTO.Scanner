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
        className="relative min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] flex flex-col justify-between items-center text-center overflow-hidden pt-16 sm:pt-20 pb-0 bg-[#10232D]"
      >
        {/* Animated OpenPeeps Crowd Canvas Background with Edge Blending */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden"
        >
          {/* Edge blending overlays: Top dissolve, lateral fades, and text-contrast shield */}
          <div className="absolute inset-x-0 top-0 h-24 sm:h-48 bg-gradient-to-b from-[#10232D] via-[#10232D]/90 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-16 sm:h-28 bg-gradient-to-t from-[#10232D] via-[#10232D]/70 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-16 sm:w-36 bg-gradient-to-r from-[#10232D] via-[#10232D]/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 sm:w-36 bg-gradient-to-l from-[#10232D] via-[#10232D]/80 to-transparent z-10 pointer-events-none" />

          {/* Radial readability shield behind interactive buttons & metrics */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_45%,#10232D_35%,transparent_100%)] opacity-70 z-10 pointer-events-none" />

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
            className="p-3.5 rounded-xl bg-[#1B303A] border border-[#314A56] space-y-1 max-w-[200px]"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFE3A6]" />
              <span className="text-[10px] font-mono font-bold uppercase text-[#FFE3A6]">Live Telemetry</span>
            </div>
            <div className="text-xs font-bold text-[#ECEEF0]">Sub-50ms Optical Scan</div>
            <div className="text-[10px] text-[#8A9BA8]">Zero duplicate tickets allowed</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="p-3.5 rounded-xl bg-[#1B303A] border border-[#314A56] space-y-1 max-w-[200px]"
          >
            <div className="flex items-center gap-1.5 text-[#E4A0B3] text-[10px] font-mono font-bold">
              <Database className="w-3 h-3" />
              <span>DUAL ENGINE</span>
            </div>
            <div className="text-xs font-bold text-[#ECEEF0]">Supabase + Memory</div>
            <div className="text-[10px] text-[#8A9BA8]">Automatic failover & sync</div>
          </motion.div>
        </div>

        {/* Floating Right Telemetry Badge (Desktop only) */}
        <div className="hidden xl:flex absolute right-8 top-1/3 -translate-y-1/2 z-10 flex-col gap-3 pointer-events-none select-none">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="p-3.5 rounded-xl bg-[#1B303A] border border-[#314A56] space-y-1 max-w-[200px] text-right"
          >
            <div className="flex items-center justify-end gap-1.5 text-[#FFE3A6] text-[10px] font-mono font-bold">
              <Wifi className="w-3 h-3" />
              <span>OFFLINE FIRST</span>
            </div>
            <div className="text-xs font-bold text-[#ECEEF0]">IndexedDB PWA</div>
            <div className="text-[10px] text-[#8A9BA8]">Scans work without internet</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="p-3.5 rounded-xl bg-[#1B303A] border border-[#314A56] space-y-1 max-w-[200px] text-right"
          >
            <div className="flex items-center justify-end gap-1.5 text-[#E4A0B3] text-[10px] font-mono font-bold">
              <ShieldCheck className="w-3 h-3" />
              <span>ATOMIC LOCK</span>
            </div>
            <div className="text-xs font-bold text-[#ECEEF0]">Multi-Gate Sync</div>
            <div className="text-[10px] text-[#8A9BA8]">Instant cross-terminal lock</div>
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
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3.5 py-1 sm:py-1.5 rounded-full border border-[#314A56] bg-[#1B303A] text-[#ECEEF0] text-[11px] sm:text-xs font-medium tracking-wide mx-auto">
            <span className="w-2 h-2 rounded-full bg-[#FFE3A6]" />
            <span className="text-[#FFE3A6] font-mono font-semibold text-[10px] uppercase tracking-wider">Live System Active</span>
            <span className="text-[#314A56]">•</span>
            <span className="text-[#ECEEF0]">Zero-Queue Digital Token Validation Engine</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#ECEEF0] tracking-tight leading-[1.1]"
          >
            Zero-Queue Event Access. <br />
            <span className="text-[#FFE3A6]">
              Atomic Duplicate Protection.
            </span>
          </motion.h1>

          {/* Body */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm md:text-base text-[#8A9BA8] max-w-2xl mx-auto leading-relaxed font-normal px-2"
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="hero-admin-console-btn"
              onClick={() => handleOpenPortal('ADMIN')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-xs sm:text-sm font-semibold text-[#10232D] bg-[#FFE3A6] hover:bg-[#fff0cb] transition-colors duration-150 flex items-center justify-center gap-3 cursor-pointer group"
            >
              <Shield className="w-4 h-4 text-[#10232D]" />
              <span>Admin Console</span>
              {!session ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#10232D]/10 text-[#10232D] font-mono font-semibold flex items-center gap-1 border border-[#10232D]/20">
                  <Lock className="w-2.5 h-2.5" /> Login Required
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#10232D]/15 text-[#10232D] font-mono font-semibold">
                  Open
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-[#10232D] group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {/* Option 2: Scanner Terminal */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="hero-scanner-terminal-btn"
              onClick={() => handleOpenPortal('SCANNER')}
              className="w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 rounded-lg text-xs sm:text-sm font-semibold text-[#10232D] bg-[#E4A0B3] hover:bg-[#ebafbf] transition-colors duration-150 flex items-center justify-center gap-3 cursor-pointer group"
            >
              <Smartphone className="w-4 h-4 text-[#10232D]" />
              <span>Scanner Terminal</span>
              {!session ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#10232D]/10 text-[#10232D] font-mono font-semibold flex items-center gap-1 border border-[#10232D]/20">
                  <Lock className="w-2.5 h-2.5" /> Login Required
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#10232D]/15 text-[#10232D] font-mono font-semibold">
                  Open
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-[#10232D] group-hover:translate-x-1 transition-transform" />
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
              <div className="p-2.5 rounded-xl bg-[#1B303A] border border-[#314A56] text-center">
                <div className="text-sm sm:text-base font-bold text-[#FFE3A6]">
                  &lt; 50ms
                </div>
                <div className="text-[10px] text-[#8A9BA8] font-medium">
                  Scan Latency
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#1B303A] border border-[#314A56] text-center">
                <div className="text-sm sm:text-base font-bold text-[#E4A0B3]">
                  Zero
                </div>
                <div className="text-[10px] text-[#8A9BA8] font-medium">
                  Duplicate Passes
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#1B303A] border border-[#314A56] text-center">
                <div className="text-sm sm:text-base font-bold text-[#FFE3A6]">
                  50,000+
                </div>
                <div className="text-[10px] text-[#8A9BA8] font-medium">
                  Roster Scaling
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#1B303A] border border-[#314A56] text-center">
                <div className="text-sm sm:text-base font-bold text-[#E4A0B3]">
                  100%
                </div>
                <div className="text-[10px] text-[#8A9BA8] font-medium">
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
            <div className="inline-flex items-center gap-1.5 text-xs uppercase font-semibold tracking-wider text-[#FFE3A6] border border-[#314A56] bg-[#1B303A] px-3.5 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5 text-[#FFE3A6]" />
              <span>Mandatory User Authentication</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#ECEEF0] tracking-tight">
              Select Your Access Portal
            </h2>
            <p className="text-xs sm:text-sm text-[#8A9BA8]">
              Users must log in to open either portal. Unauthenticated guest access is completely disabled.
            </p>
          </div>
        </AppleScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Portal Card 1: Admin Console */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl p-6 sm:p-8 bg-[#1B303A] border border-[#314A56] hover:border-[#FFE3A6]/40 flex flex-col justify-between space-y-6 relative overflow-hidden transition-colors"
          >
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#10232D] text-[#FFE3A6] border border-[#314A56] flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#FFE3A6]" />
                </div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#10232D] text-[#FFE3A6] border border-[#314A56]">
                  Organizers & Admins
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-[#ECEEF0]">
                  Admin Console
                </h3>
                <p className="text-xs sm:text-sm text-[#8A9BA8] leading-relaxed">
                  Full control center to create events, upload attendee lists, generate digital passes, and manage gate security.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-[#314A56] text-xs text-[#ECEEF0]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
                  <span>Create events & configure custom attendee schemas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
                  <span>Import Excel / CSV rosters & issue QR/barcode passes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
                  <span>Generate volunteer scanner referral codes & station keys</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
                  <span>Live telemetry charts, audit trail & CSV data export</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 relative z-10">
              <button
                type="button"
                id="home-open-admin-btn"
                onClick={() => handleOpenPortal('ADMIN')}
                className="w-full py-3.5 px-5 rounded-lg text-xs sm:text-sm font-semibold text-[#10232D] bg-[#FFE3A6] hover:bg-[#fff0cb] transition-colors flex items-center justify-center gap-2.5 cursor-pointer group/btn"
              >
                {!session && <Lock className="w-4 h-4 text-[#10232D]" />}
                <span>
                  {session
                    ? (session.user.role === 'ADMIN' ? 'Go to Admin Console' : 'Switch to Admin Console')
                    : 'Sign In to Open Admin Console'}
                </span>
                <ArrowRight className="w-4 h-4 text-[#10232D] group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Portal Card 2: Scanner Terminal */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl p-6 sm:p-8 bg-[#1B303A] border border-[#314A56] hover:border-[#E4A0B3]/40 flex flex-col justify-between space-y-6 relative overflow-hidden transition-colors"
          >
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#10232D] text-[#E4A0B3] border border-[#314A56] flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-[#E4A0B3]" />
                </div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#10232D] text-[#E4A0B3] border border-[#314A56]">
                  Gate Staff & Operators
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-[#ECEEF0]">
                  Gate Scanner Terminal
                </h3>
                <p className="text-xs sm:text-sm text-[#8A9BA8] leading-relaxed">
                  Real-time ticket validation terminal for checkpoints. Connect with event referral codes or station access codes.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-[#314A56] text-xs text-[#ECEEF0]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#E4A0B3] shrink-0" />
                  <span>Ultra-fast mobile camera QR & barcode scanner</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#E4A0B3] shrink-0" />
                  <span>Hardware USB / Bluetooth barcode gun integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#E4A0B3] shrink-0" />
                  <span>Atomic anti-passback & instant duplicate scan prevention</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#E4A0B3] shrink-0" />
                  <span>Persistent access requests across logout, refresh, & devices</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 relative z-10">
              <button
                type="button"
                id="home-open-scanner-btn"
                onClick={() => handleOpenPortal('SCANNER')}
                className="w-full py-3.5 px-5 rounded-lg text-xs sm:text-sm font-semibold text-[#10232D] bg-[#E4A0B3] hover:bg-[#ebafbf] transition-colors flex items-center justify-center gap-2.5 cursor-pointer group/btn"
              >
                {!session && <Lock className="w-4 h-4 text-[#10232D]" />}
                <span>
                  {session ? 'Open Scanner Terminal' : 'Sign In to Open Scanner Terminal'}
                </span>
                <ArrowRight className="w-4 h-4 text-[#10232D] group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. THE 6-STEP WORKFLOW SECTION */}
      <section id="workflow-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <AppleScrollReveal direction="up" distance={30}>
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-block text-xs uppercase font-semibold tracking-wider text-[#FFE3A6] border border-[#314A56] bg-[#1B303A] px-3.5 py-1 rounded-full">
              End-To-End Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#ECEEF0]">
              How ADMITTO Operates at Scale
            </h2>
            <p className="text-sm sm:text-base text-[#8A9BA8]">
              From initial attendee list CSV upload to high-speed gate admission, each component guarantees zero data corruption.
            </p>
          </div>
        </AppleScrollReveal>

        <AppleScrollStagger staggerDelay={0.09} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Step 1 */}
          <AppleScrollCard className="rounded-xl p-6 space-y-4 flex flex-col justify-between h-full bg-[#1B303A] border border-[#314A56] hover:border-[#FFE3A6]/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#10232D] text-[#FFE3A6] flex items-center justify-center font-bold text-base font-mono border border-[#314A56]">
                01
              </div>
              <h3 className="text-base font-bold text-[#ECEEF0]">Create Event</h3>
              <p className="text-xs text-[#8A9BA8] leading-relaxed">
                Define your venue, date, admin contacts, and banner. Each event is strictly isolated to its creator admin profile via PostgreSQL Row Level Security.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-semibold text-[#8A9BA8] tracking-wider">Step 1 of 6</div>
          </AppleScrollCard>

          {/* Step 2 */}
          <AppleScrollCard className="rounded-xl p-6 space-y-4 flex flex-col justify-between h-full bg-[#1B303A] border border-[#314A56] hover:border-[#FFE3A6]/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#10232D] text-[#FFE3A6] flex items-center justify-center font-bold text-base font-mono border border-[#314A56]">
                02
              </div>
              <h3 className="text-base font-bold text-[#ECEEF0]">Import Attendee CSV</h3>
              <p className="text-xs text-[#8A9BA8] leading-relaxed">
                Upload spreadsheet rosters with USN, name, department, and branch. Automatic validation flags malformed rows before atomic database commit.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-semibold text-[#8A9BA8] tracking-wider">Step 2 of 6</div>
          </AppleScrollCard>

          {/* Step 3 */}
          <AppleScrollCard className="rounded-xl p-6 space-y-4 flex flex-col justify-between h-full bg-[#1B303A] border border-[#314A56] hover:border-[#FFE3A6]/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#10232D] text-[#FFE3A6] flex items-center justify-center font-bold text-base font-mono border border-[#314A56]">
                03
              </div>
              <h3 className="text-base font-bold text-[#ECEEF0]">Generate Tokens</h3>
              <p className="text-xs text-[#8A9BA8] leading-relaxed">
                Every attendee receives collision-free 2D QR codes and 1D standard barcodes scoped to the specific event.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-semibold text-[#8A9BA8] tracking-wider">Step 3 of 6</div>
          </AppleScrollCard>

          {/* Step 4 */}
          <AppleScrollCard className="rounded-xl p-6 space-y-4 flex flex-col justify-between h-full bg-[#1B303A] border border-[#314A56] hover:border-[#FFE3A6]/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#10232D] text-[#FFE3A6] flex items-center justify-center font-bold text-base font-mono border border-[#314A56]">
                04
              </div>
              <h3 className="text-base font-bold text-[#ECEEF0]">Create Gate Scanners</h3>
              <p className="text-xs text-[#8A9BA8] leading-relaxed">
                Provision dedicated scanner credentials (e.g. GATE1-NORTH) with expiration timestamps and instant enable/disable toggles.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-semibold text-[#8A9BA8] tracking-wider">Step 4 of 6</div>
          </AppleScrollCard>

          {/* Step 5 */}
          <AppleScrollCard className="rounded-xl p-6 space-y-4 flex flex-col justify-between h-full bg-[#1B303A] border border-[#314A56] hover:border-[#FFE3A6]/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#10232D] text-[#FFE3A6] flex items-center justify-center font-bold text-base font-mono border border-[#314A56]">
                05
              </div>
              <h3 className="text-base font-bold text-[#ECEEF0]">Scan & Check In</h3>
              <p className="text-xs text-[#8A9BA8] leading-relaxed">
                Staff scan QR or barcodes via mobile camera or handheld laser guns. Continuous auto-scanning with instant affirmative audio chime.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-semibold text-[#8A9BA8] tracking-wider">Step 5 of 6</div>
          </AppleScrollCard>

          {/* Step 6 */}
          <AppleScrollCard className="rounded-xl p-6 space-y-4 flex flex-col justify-between h-full bg-[#1B303A] border border-[#314A56] hover:border-[#FFE3A6]/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#10232D] text-[#FFE3A6] flex items-center justify-center font-bold text-base font-mono border border-[#314A56]">
                06
              </div>
              <h3 className="text-base font-bold text-[#ECEEF0]">Live Realtime Feed</h3>
              <p className="text-xs text-[#8A9BA8] leading-relaxed">
                Admins observe attendance counters, branch distributions, scan attempt audit trails, and export verified CSV rosters.
              </p>
            </div>
            <div className="pt-2 text-[10px] uppercase font-semibold text-[#8A9BA8] tracking-wider">Step 6 of 6</div>
          </AppleScrollCard>
        </AppleScrollStagger>
      </section>

      {/* 3. ROLES BREAKDOWN (Admin vs Scanner) */}
      <section id="roles-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AppleScrollReveal direction="scale" distance={20}>
          <div className="bg-[#1B303A] rounded-2xl p-6 sm:p-10 space-y-6 relative overflow-hidden border border-[#314A56]">
            <div className="text-center max-w-2xl mx-auto space-y-1.5 relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#ECEEF0]">
                Engineered for Two Distinct Roles
              </h2>
              <p className="text-xs sm:text-sm text-[#8A9BA8]">
                Clear separation of privilege guarantees security and operational efficiency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
              {/* Role: Admin */}
              <AppleScrollCard className="bg-[#10232D] rounded-xl p-5 sm:p-6 space-y-4 border border-[#314A56]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1B303A] text-[#FFE3A6] border border-[#314A56] flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#ECEEF0]">Admin Capabilities</h3>
                    <p className="text-xs text-[#8A9BA8]">Full event ownership & roster control</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-[#ECEEF0]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FFE3A6] shrink-0" />
                    <span>Create, edit, archive and delete events</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FFE3A6] shrink-0" />
                    <span>Bulk import CSV attendee records & validate fields</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FFE3A6] shrink-0" />
                    <span>Create and manage gate scanner accounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FFE3A6] shrink-0" />
                    <span>Live dashboard statistics and branch distribution graphs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FFE3A6] shrink-0" />
                    <span>Export verified attendance CSV spreadsheets</span>
                  </li>
                </ul>
              </AppleScrollCard>

              {/* Role: Scanner */}
              <AppleScrollCard className="bg-[#10232D] rounded-xl p-5 sm:p-6 space-y-4 border border-[#314A56]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1B303A] text-[#E4A0B3] border border-[#314A56] flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#ECEEF0]">Scanner Operator</h3>
                    <p className="text-xs text-[#8A9BA8]">High-speed verification terminal</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-[#ECEEF0]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E4A0B3] shrink-0" />
                    <span>Continuous live camera QR and barcode scanning</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E4A0B3] shrink-0" />
                    <span>Immediate visual & sound feedback (Success / Duplicate / Invalid)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E4A0B3] shrink-0" />
                    <span>Local offline queue with automatic reconnection sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E4A0B3] shrink-0" />
                    <span>Restricted strictly to assigned event (no cross-event leak)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E4A0B3] shrink-0" />
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
          <div className="relative rounded-2xl bg-[#1B303A] p-6 sm:p-10 text-center text-[#ECEEF0] space-y-5 overflow-hidden border border-[#314A56]">
            <div className="max-w-2xl mx-auto space-y-3 relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Ready to eliminate entry congestion?
              </h2>
              <p className="text-xs sm:text-sm text-[#8A9BA8] font-normal">
                Create your organizer account and launch your event access system in minutes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 relative z-10">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                id="cta-start-btn"
                onClick={onOpenStartNow}
                className="px-8 py-3.5 rounded-lg bg-[#FFE3A6] text-[#10232D] hover:bg-[#fff0cb] font-semibold text-xs transition-colors cursor-pointer"
              >
                Launch ADMITTO Portal
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                id="cta-learn-btn"
                onClick={() => onNavigate('/features')}
                className="px-7 py-3.5 rounded-lg border border-[#314A56] bg-[#10232D] text-[#ECEEF0] hover:bg-[#152834] font-semibold text-xs transition-colors cursor-pointer"
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
