import React from 'react';
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
        className="w-full mt-auto shrink-0 bg-[#10232D] border-t border-[#314A56] py-6 sm:py-8 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center justify-center text-center">
          <button
            id="login-footer-brand-logo-btn"
            type="button"
            onClick={() => onNavigate('/')}
            className="group relative cursor-pointer focus:outline-none mb-2.5 transition-transform active:scale-95"
            title="ADMITTO Home"
          >
            <AppLogo size="md" className="group-hover:scale-105" />
          </button>

          <h2
            onClick={() => onNavigate('/')}
            className="text-xl sm:text-2xl font-bold font-['Poppins'] tracking-tight cursor-pointer select-none text-[#ECEEF0] hover:text-[#FFE3A6] transition-colors"
          >
            ADMITTO
          </h2>

          <p className="mt-1 text-xs text-[#8A9BA8] font-medium">
            Secure Event Access Management
          </p>

          <div className="flex items-center gap-4 text-xs text-[#8A9BA8] pt-3">
            <button
              onClick={() => onNavigate('/')}
              className="hover:text-[#FFE3A6] transition-colors cursor-pointer"
            >
              Home
            </button>
            <span className="text-[#314A56]">•</span>
            <button
              onClick={() => onNavigate('/features')}
              className="hover:text-[#FFE3A6] transition-colors cursor-pointer"
            >
              Passes
            </button>
            <span className="text-[#314A56]">•</span>
            <button
              onClick={() => onNavigate('/security')}
              className="hover:text-[#FFE3A6] transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span className="text-[#314A56]">•</span>
            <button
              onClick={() => onNavigate('/faq')}
              className="hover:text-[#FFE3A6] transition-colors cursor-pointer"
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
      className="w-full mt-auto shrink-0 bg-[#10232D] border-t border-[#314A56] pt-8 sm:pt-12 pb-6 sm:pb-8 relative z-10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        {/* DESKTOP LAYOUT (>= md Breakpoint) */}
        <div className="hidden md:grid md:grid-cols-12 gap-8 lg:gap-12 pb-6 border-b border-[#314A56]">
          {/* LEFT: ADMITTO LOGO & SUBTITLE */}
          <div className="md:col-span-4 space-y-3 flex flex-col items-start">
            <button
              id="footer-brand-logo-btn"
              type="button"
              onClick={() => onNavigate('/')}
              className="group relative cursor-pointer focus:outline-none flex items-center gap-3 transition-transform active:scale-95 text-left"
              title="ADMITTO Home"
            >
              <AppLogo size="md" className="group-hover:scale-105 shrink-0" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-['Poppins'] tracking-tight text-[#ECEEF0] group-hover:text-[#FFE3A6] transition-colors">
                  ADMITTO
                </h2>
                <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#E4A0B3]">
                  Access Platform
                </span>
              </div>
            </button>

            <p className="text-xs sm:text-sm text-[#8A9BA8] font-normal leading-relaxed max-w-sm">
              Production-ready digital event access and token validation platform with real-time multi-admin check-in.
            </p>
          </div>

          {/* CENTER / LINKS */}
          <div className="md:col-span-5 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#8A9BA8]">
              Platform
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:text-sm font-medium">
              <button
                id="footer-link-dashboard"
                onClick={() => onNavigate('/login')}
                className="text-[#ECEEF0] hover:text-[#FFE3A6] transition-colors text-left cursor-pointer py-0.5"
              >
                Dashboard
              </button>
              <button
                id="footer-link-events"
                onClick={() => onNavigate('/how-it-works')}
                className="text-[#ECEEF0] hover:text-[#FFE3A6] transition-colors text-left cursor-pointer py-0.5"
              >
                Events
              </button>
              <button
                id="footer-link-scanner"
                onClick={() => onNavigate('/scan')}
                className="text-[#ECEEF0] hover:text-[#FFE3A6] transition-colors text-left cursor-pointer py-0.5"
              >
                Scanner
              </button>
              <button
                id="footer-link-passes"
                onClick={() => onNavigate('/features')}
                className="text-[#ECEEF0] hover:text-[#FFE3A6] transition-colors text-left cursor-pointer py-0.5"
              >
                Passes
              </button>
              <button
                id="footer-link-settings"
                onClick={() => onNavigate('/security')}
                className="text-[#ECEEF0] hover:text-[#FFE3A6] transition-colors text-left cursor-pointer py-0.5"
              >
                Settings
              </button>
              <button
                id="footer-link-help"
                onClick={() => onNavigate('/faq')}
                className="text-[#ECEEF0] hover:text-[#FFE3A6] transition-colors text-left cursor-pointer py-0.5"
              >
                Help & Support
              </button>
            </div>
          </div>

          {/* RIGHT: PRIVACY, TERMS, CONTACT */}
          <div className="md:col-span-3 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#8A9BA8]">
              Legal & Security
            </div>
            <div className="flex flex-col space-y-1.5 text-xs sm:text-sm font-medium">
              <button
                id="footer-link-privacy"
                onClick={() => onNavigate('/security')}
                className="text-[#ECEEF0] hover:text-[#FFE3A6] transition-colors text-left cursor-pointer py-0.5"
              >
                Security & Privacy
              </button>
              <button
                id="footer-link-terms"
                onClick={() => onNavigate('/about')}
                className="text-[#ECEEF0] hover:text-[#FFE3A6] transition-colors text-left cursor-pointer py-0.5"
              >
                About Platform
              </button>
              <button
                id="footer-link-contact"
                onClick={() => onNavigate('/about')}
                className="text-[#ECEEF0] hover:text-[#FFE3A6] transition-colors text-left cursor-pointer py-0.5"
              >
                System Architecture
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT (< md Breakpoint) */}
        <div className="md:hidden space-y-4 pb-4 border-b border-[#314A56]">
          <div className="flex items-center gap-3">
            <button
              id="mobile-footer-brand-logo-btn"
              type="button"
              onClick={() => onNavigate('/')}
              className="cursor-pointer focus:outline-none transition-transform active:scale-95"
            >
              <AppLogo size="sm" className="shrink-0" />
            </button>
            <div>
              <h2
                onClick={() => onNavigate('/')}
                className="text-base font-bold font-['Poppins'] tracking-tight text-[#ECEEF0] cursor-pointer"
              >
                ADMITTO
              </h2>
              <p className="text-[11px] text-[#8A9BA8] font-medium">
                Secure Event Access Management
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9BA8]">
                Navigation
              </div>
              <div className="flex flex-col space-y-2 text-xs font-medium">
                <button
                  id="mobile-footer-link-dashboard"
                  onClick={() => onNavigate('/login')}
                  className="text-[#ECEEF0] active:text-[#FFE3A6] transition-colors text-left py-0.5 cursor-pointer"
                >
                  Dashboard
                </button>
                <button
                  id="mobile-footer-link-events"
                  onClick={() => onNavigate('/how-it-works')}
                  className="text-[#ECEEF0] active:text-[#FFE3A6] transition-colors text-left py-0.5 cursor-pointer"
                >
                  Events
                </button>
                <button
                  id="mobile-footer-link-scanner"
                  onClick={() => onNavigate('/scan')}
                  className="text-[#ECEEF0] active:text-[#FFE3A6] transition-colors text-left py-0.5 cursor-pointer"
                >
                  Scanner
                </button>
                <button
                  id="mobile-footer-link-passes"
                  onClick={() => onNavigate('/features')}
                  className="text-[#ECEEF0] active:text-[#FFE3A6] transition-colors text-left py-0.5 cursor-pointer"
                >
                  Passes
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9BA8]">
                Support & Legal
              </div>
              <div className="flex flex-col space-y-2 text-xs font-medium">
                <button
                  id="mobile-footer-link-settings"
                  onClick={() => onNavigate('/security')}
                  className="text-[#ECEEF0] active:text-[#FFE3A6] transition-colors text-left py-0.5 cursor-pointer"
                >
                  Settings
                </button>
                <button
                  id="mobile-footer-link-help"
                  onClick={() => onNavigate('/faq')}
                  className="text-[#ECEEF0] active:text-[#FFE3A6] transition-colors text-left py-0.5 cursor-pointer"
                >
                  Help & Support
                </button>
                <button
                  id="mobile-footer-link-privacy"
                  onClick={() => onNavigate('/security')}
                  className="text-[#ECEEF0] active:text-[#FFE3A6] transition-colors text-left py-0.5 cursor-pointer"
                >
                  Privacy Policy
                </button>
                <button
                  id="mobile-footer-link-terms"
                  onClick={() => onNavigate('/about')}
                  className="text-[#ECEEF0] active:text-[#FFE3A6] transition-colors text-left py-0.5 cursor-pointer"
                >
                  Architecture
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8A9BA8]">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-center sm:text-left">
            <span className="font-medium text-[#ECEEF0]">© {new Date().getFullYear()} ADMITTO Platform.</span>
            <span className="hidden sm:inline text-[#314A56]">•</span>
            <span>All rights reserved.</span>
            <span className="hidden sm:inline text-[#314A56]">•</span>
            <span className="text-[11px] text-[#FFE3A6] font-mono flex items-center gap-1 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFE3A6]" />
              Online
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#8A9BA8]">
            <button
              onClick={() => onNavigate('/security')}
              className="hover:text-[#FFE3A6] transition-colors cursor-pointer focus:outline-none"
            >
              Security Policy
            </button>
            <span className="text-[#314A56]">•</span>
            <button
              onClick={() => onNavigate('/about')}
              className="hover:text-[#FFE3A6] transition-colors cursor-pointer focus:outline-none"
            >
              Architecture
            </button>
            <span className="text-[#314A56]">•</span>
            <button
              onClick={() => onNavigate('/faq')}
              className="hover:text-[#FFE3A6] transition-colors cursor-pointer focus:outline-none"
            >
              Helpdesk
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
