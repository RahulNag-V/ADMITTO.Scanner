import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  ScanLine,
  Ticket,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import { AppLogo } from '../common/AppLogo';

interface FooterProps {
  onNavigate: (path: string) => void;
  isMinimal?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isMinimal = false }) => {
  if (isMinimal) {
    return (
      <footer
        id="admitto-login-footer"
        className="w-full mt-auto shrink-0 bg-gradient-to-b from-[#181c38]/95 via-[#10142b]/95 to-[#090c1e]/98 backdrop-blur-2xl border-t border-x border-white/20 rounded-t-[2rem] sm:rounded-t-[2.5rem] py-6 sm:py-8 relative z-10 overflow-hidden shadow-[0_-15px_40px_-15px_rgba(99,102,241,0.25)]"
      >
        {/* Top Soft Luminous Flowing Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400/80 via-indigo-400/90 via-purple-400/80 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] h-36 bg-gradient-to-r from-blue-500/20 via-purple-500/25 to-pink-500/20 rounded-full blur-3xl pointer-events-none -mt-16" />

        {/* Full-Width Background Gradient Watermark (Sent to Back) */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden px-2">
          <svg
            viewBox="0 0 1000 180"
            className="w-full h-auto opacity-[0.14] sm:opacity-[0.18] select-none filter drop-shadow-[0_0_80px_rgba(139,92,246,0.6)]"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="minFooterWatermarkGrad" x1="0%" y1="0%" x2="100%" y2="80%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                <stop offset="25%" stopColor="#818cf8" stopOpacity="0.9" />
                <stop offset="55%" stopColor="#c084fc" stopOpacity="0.85" />
                <stop offset="80%" stopColor="#f472b6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="minFooterWatermarkStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#c084fc" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <text
              x="500"
              y="100"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="200"
              fontWeight="900"
              fontFamily="'Space Grotesk', system-ui, sans-serif"
              letterSpacing="0.04em"
              fill="url(#minFooterWatermarkGrad)"
              stroke="url(#minFooterWatermarkStrokeGrad)"
              strokeWidth="2"
            >
              ADMITTO
            </text>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center justify-center text-center">
          <button
            id="login-footer-brand-logo-btn"
            type="button"
            onClick={() => onNavigate('/')}
            className="group relative cursor-pointer focus:outline-none mb-2.5 transition-transform active:scale-95"
            title="ADMITTO Home"
          >
            <AppLogo size="md" className="group-hover:scale-105 shadow-xl shadow-orange-500/20" />
          </button>

          <h2
            onClick={() => onNavigate('/')}
            className="text-xl sm:text-2xl font-black font-['Space_Grotesk'] tracking-tight cursor-pointer select-none bg-gradient-to-r from-blue-400 via-indigo-300 via-purple-300 to-amber-300 bg-clip-text text-transparent hover:opacity-90 transition-opacity"
          >
            ADMITTO
          </h2>

          <p className="mt-1 text-xs text-slate-400 font-medium">
            Secure Event Access Management
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400 pt-3">
            <button
              onClick={() => onNavigate('/')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => onNavigate('/features')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Passes
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => onNavigate('/security')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => onNavigate('/faq')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Help & Support
            </button>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      id="admitto-footer"
      className="w-full mt-auto shrink-0 bg-gradient-to-b from-[#1a1f42]/95 via-[#111530]/95 to-[#080b1d]/98 backdrop-blur-2xl border-t border-x border-white/20 rounded-t-[2.5rem] sm:rounded-t-[3.5rem] pt-8 sm:pt-12 pb-6 sm:pb-8 relative z-10 overflow-hidden shadow-[0_-20px_60px_-15px_rgba(99,102,241,0.28)]"
    >
      {/* Top Soft Luminous Flowing Gradient Border Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400/80 via-indigo-400/90 via-purple-400/80 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[750px] h-48 bg-gradient-to-r from-blue-500/20 via-indigo-500/25 via-purple-500/20 to-orange-500/15 rounded-full blur-3xl pointer-events-none -mt-20" />
      <div className="absolute bottom-0 left-1/4 w-96 h-40 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-40 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* ========================================================= */}
      {/* FULL-WIDTH SPECTRUM GRADIENT WATERMARK (SENT TO BACK z-0)  */}
      {/* ========================================================= */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden px-3 sm:px-6">
        <svg
          viewBox="0 0 1000 240"
          className="w-full h-auto opacity-[0.15] sm:opacity-[0.18] select-none filter drop-shadow-[0_0_95px_rgba(139,92,246,0.7)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="mainFooterWatermarkGrad" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#c084fc" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#f472b6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="mainFooterWatermarkStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <text
            x="500"
            y="120"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="232"
            fontWeight="900"
            fontFamily="'Space Grotesk', system-ui, sans-serif"
            letterSpacing="0.035em"
            fill="url(#mainFooterWatermarkGrad)"
            stroke="url(#mainFooterWatermarkStrokeGrad)"
            strokeWidth="4"
          >
            ADMITTO
          </text>
        </svg>
      </div>

      {/* ========================================================= */}
      {/* ALL LINKS & CONTENT FLOATING DIRECTLY UP ON THE WATERMARK */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">

        {/* ========================================================= */}
        {/* 1. DESKTOP LAYOUT (>= md Breakpoint)                     */}
        {/* Left (Logo/Tagline) | Center (Links) | Right (Legal/Contact) */}
        {/* ========================================================= */}
        <div className="hidden md:grid md:grid-cols-12 gap-8 lg:gap-12 pb-6 border-b border-white/10">

          {/* LEFT: ADMITTO LOGO & SUBTITLE */}
          <div className="md:col-span-4 space-y-3 flex flex-col items-start">
            <button
              id="footer-brand-logo-btn"
              type="button"
              onClick={() => onNavigate('/')}
              className="group relative cursor-pointer focus:outline-none flex items-center gap-3 transition-transform active:scale-95 text-left"
              title="ADMITTO Home"
            >
              <AppLogo size="md" className="group-hover:scale-105 shadow-xl shadow-orange-500/25 shrink-0" />
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-['Space_Grotesk'] tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  ADMITTO
                </h2>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                  Access Platform
                </span>
              </div>
            </button>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-sm">
              Secure Event Access Management
            </p>
          </div>

          {/* CENTER / LINKS */}
          <div className="md:col-span-5 space-y-2.5">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
              Links
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:text-sm font-medium">
              <button
                id="footer-link-dashboard"
                onClick={() => onNavigate('/login')}
                className="text-slate-200 hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer py-0.5"
              >
                Dashboard
              </button>
              <button
                id="footer-link-events"
                onClick={() => onNavigate('/how-it-works')}
                className="text-slate-200 hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer py-0.5"
              >
                Events
              </button>
              <button
                id="footer-link-scanner"
                onClick={() => onNavigate('/scan')}
                className="text-slate-200 hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer py-0.5"
              >
                Scanner
              </button>
              <button
                id="footer-link-passes"
                onClick={() => onNavigate('/features')}
                className="text-slate-200 hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer py-0.5"
              >
                Passes
              </button>
              <button
                id="footer-link-settings"
                onClick={() => onNavigate('/security')}
                className="text-slate-200 hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer py-0.5"
              >
                Settings
              </button>
              <button
                id="footer-link-help"
                onClick={() => onNavigate('/faq')}
                className="text-slate-200 hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer py-0.5"
              >
                Help & Support
              </button>
            </div>
          </div>

          {/* RIGHT: PRIVACY, TERMS, CONTACT */}
          <div className="md:col-span-3 space-y-2.5">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
              Legal & Support
            </div>
            <div className="flex flex-col space-y-1.5 text-xs sm:text-sm font-medium">
              <button
                id="footer-link-privacy"
                onClick={() => onNavigate('/security')}
                className="text-slate-200 hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer py-0.5"
              >
                Privacy Policy
              </button>
              <button
                id="footer-link-terms"
                onClick={() => onNavigate('/about')}
                className="text-slate-200 hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer py-0.5"
              >
                Terms of Service
              </button>
              <button
                id="footer-link-contact"
                onClick={() => onNavigate('/about')}
                className="text-slate-200 hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer py-0.5"
              >
                Contact Organizers
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. MOBILE APP LAYOUT (< md Breakpoint)                    */}
        {/* ========================================================= */}
        <div className="md:hidden space-y-4 pb-4 border-b border-white/10">

          {/* Mobile Top Brand Header */}
          <div className="flex items-center gap-3">
            <button
              id="mobile-footer-brand-logo-btn"
              type="button"
              onClick={() => onNavigate('/')}
              className="cursor-pointer focus:outline-none transition-transform active:scale-95"
            >
              <AppLogo size="sm" className="shadow-lg shadow-orange-500/20 shrink-0" />
            </button>
            <div>
              <h2
                onClick={() => onNavigate('/')}
                className="text-base font-black font-['Space_Grotesk'] tracking-tight text-white cursor-pointer"
              >
                ADMITTO
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                Secure Event Access Management
              </p>
            </div>
          </div>

          {/* Professional Clean Links Columns */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Column 1: Main Platform Links */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Navigation
              </div>
              <div className="flex flex-col space-y-2 text-xs font-medium">
                <button
                  id="mobile-footer-link-dashboard"
                  onClick={() => onNavigate('/login')}
                  className="text-slate-200 active:text-indigo-300 transition-colors text-left py-0.5 cursor-pointer"
                >
                  Dashboard
                </button>
                <button
                  id="mobile-footer-link-events"
                  onClick={() => onNavigate('/how-it-works')}
                  className="text-slate-200 active:text-indigo-300 transition-colors text-left py-0.5 cursor-pointer"
                >
                  Events
                </button>
                <button
                  id="mobile-footer-link-scanner"
                  onClick={() => onNavigate('/scan')}
                  className="text-slate-200 active:text-indigo-300 transition-colors text-left py-0.5 cursor-pointer"
                >
                  Scanner
                </button>
                <button
                  id="mobile-footer-link-passes"
                  onClick={() => onNavigate('/features')}
                  className="text-slate-200 active:text-indigo-300 transition-colors text-left py-0.5 cursor-pointer"
                >
                  Passes
                </button>
              </div>
            </div>

            {/* Column 2: Settings, Support & Legal Links */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Support & Legal
              </div>
              <div className="flex flex-col space-y-2 text-xs font-medium">
                <button
                  id="mobile-footer-link-settings"
                  onClick={() => onNavigate('/security')}
                  className="text-slate-200 active:text-indigo-300 transition-colors text-left py-0.5 cursor-pointer"
                >
                  Settings
                </button>
                <button
                  id="mobile-footer-link-help"
                  onClick={() => onNavigate('/faq')}
                  className="text-slate-200 active:text-indigo-300 transition-colors text-left py-0.5 cursor-pointer"
                >
                  Help & Support
                </button>
                <button
                  id="mobile-footer-link-privacy"
                  onClick={() => onNavigate('/security')}
                  className="text-slate-200 active:text-indigo-300 transition-colors text-left py-0.5 cursor-pointer"
                >
                  Privacy Policy
                </button>
                <button
                  id="mobile-footer-link-terms"
                  onClick={() => onNavigate('/about')}
                  className="text-slate-200 active:text-indigo-300 transition-colors text-left py-0.5 cursor-pointer"
                >
                  Terms & Contact
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. BOTTOM BAR (COPYRIGHT & ATTRIBUTES)                    */}
        {/* ========================================================= */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-center sm:text-left">
            <span className="font-medium text-slate-300">© {new Date().getFullYear()} ADMITTO Platform.</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>All rights reserved.</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PostgreSQL Active
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <button
              onClick={() => onNavigate('/security')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none"
            >
              Security Policy
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => onNavigate('/about')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none"
            >
              Architecture
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => onNavigate('/faq')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none"
            >
              Helpdesk
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
