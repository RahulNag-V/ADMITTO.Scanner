import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu,
  X,
  Shield,
  Zap,
  Sparkles,
  ArrowRight,
  LogIn,
  LogOut,
  ShieldCheck,
  Smartphone,
  User,
  Trash2,
  Lock,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { AuthSession } from '../../types';
import { AppLogo } from '../common/AppLogo';
import { MyProfileModal } from '../auth/MyProfileModal';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenStartNow: () => void;
  session?: AuthSession | null;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
  onProfileUpdated?: (updatedUser: AuthSession['user']) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  onNavigate,
  onOpenStartNow,
  session,
  onLogout,
  onDeleteAccount,
  onProfileUpdated,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Monitor window scroll to enhance glassmorphism styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close settings dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Features', path: '/features' },
    { label: 'Security', path: '/security' },
    { label: 'Reviews', path: '/reviews' },
    { label: 'Blog', path: '/blog' },
    { label: 'FAQ', path: '/faq' },
    { label: 'About', path: '/about' },
  ];

  const currentLink = navLinks.find((l) => l.path === currentPath) || { label: 'Home', path: '/' };

  const handleLinkClick = (path: string) => {
    onNavigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        id="navbar-header"
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? 'backdrop-blur-2xl bg-[#0a0a0f]/90 border-b border-white/[0.14] shadow-[0_12px_32px_rgba(0,0,0,0.55)]'
            : 'backdrop-blur-xl bg-[#0a0a0f]/75 border-b border-white/[0.08]'
        }`}
      >
        {/* Floating Liquid Aurora Background inside Header */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-10 left-1/4 w-60 h-24 bg-indigo-600/25 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -top-6 right-1/3 w-48 h-20 bg-purple-600/25 rounded-full blur-2xl animate-[pulse_4s_infinite]" />
          <div className="absolute -bottom-6 right-12 w-40 h-16 bg-pink-600/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 via-purple-500/40 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between relative z-10">
          {/* Logo & Mobile Current Page Badge */}
          <div className="flex items-center gap-3">
            <div
              id="nav-logo"
              onClick={() => handleLinkClick('/')}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
            >
              <AppLogo size="sm" className="group-hover:scale-105" />
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-xl font-bold tracking-tight text-white font-['Space_Grotesk'] leading-none">
                    ADMITTO
                  </span>
                  <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                    Pro
                  </span>
                </div>
                <span className="hidden sm:block text-[10px] sm:text-[11px] text-slate-400 font-medium tracking-wide mt-0.5 leading-none">
                  Digital Event Access
                </span>
              </div>
            </div>

            {/* Mobile Active Page Indicator Pill */}
            <div className="flex lg:hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/35 text-indigo-300 text-[10px] sm:text-[11px] font-bold shrink-0 animate-in fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span>{currentLink.label}</span>
            </div>
          </div>

          {/* Desktop Nav Links with Liquid Morphing Capsule */}
          <nav id="desktop-nav-links" className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl glass-dark relative">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  id={`nav-link-${link.path.replace('/', '') || 'home'}`}
                  onClick={() => handleLinkClick(link.path)}
                  className={`relative px-4 py-2 rounded-xl text-xs font-medium transition-colors duration-150 flex items-center gap-2 cursor-pointer z-10 select-none ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="public-active-nav-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/25 via-purple-500/30 to-pink-500/20 border border-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.25)] backdrop-blur-md -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50" />}
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {session ? (
              <div className="relative z-50" ref={settingsRef}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  id="nav-settings-btn"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  aria-expanded={isSettingsOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                    isSettingsOpen
                      ? 'bg-white/15 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/20'
                      : 'glass-dark border-white/10 hover:border-white/20 hover:bg-white/10 text-slate-200 hover:text-white shadow-sm'
                  }`}
                  title="Open Settings & Account Menu"
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shadow-inner ${
                      session.user.role === 'ADMIN'
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                        : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white'
                    }`}
                  >
                    {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Settings
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${
                        isSettingsOpen ? 'rotate-90 text-indigo-400' : ''
                      }`}
                    />
                    <span className="font-bold text-white tracking-tight">Settings</span>
                  </div>

                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                      session.user.role === 'ADMIN'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    }`}
                  >
                    {session.user.role === 'ADMIN' ? 'Admin' : 'Scanner'}
                  </span>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isSettingsOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </motion.button>

                <AnimatePresence>
                  {isSettingsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      id="nav-settings-dropdown"
                      className="absolute right-0 top-full mt-2.5 w-80 rounded-2xl bg-slate-950/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl p-2.5 z-50 overflow-hidden"
                    >
                      {/* User Profile Header (Click to open My Profile) */}
                      <div
                        id="settings-profile-header-btn"
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setIsProfileModalOpen(true);
                        }}
                        className="p-3 rounded-xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] hover:bg-white/[0.12] border border-white/10 hover:border-indigo-500/40 mb-2 transition-all cursor-pointer group select-none"
                        title="Click to view & edit your profile"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-md group-hover:scale-105 transition-transform ${
                              session.user.role === 'ADMIN'
                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/30'
                                : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-orange-500/30'
                            }`}
                          >
                            {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors truncate">
                                {session.user.name}
                              </p>
                              <span
                                className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                  session.user.role === 'ADMIN'
                                    ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
                                    : 'bg-orange-500/25 text-orange-300 border border-orange-500/40'
                                }`}
                              >
                                {session.user.role === 'ADMIN' ? 'Admin' : 'Scanner'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{session.user.email}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active Session
                          </span>
                          <span className="text-indigo-300 group-hover:underline font-semibold flex items-center gap-1">
                            <User className="w-3 h-3" /> Edit Profile
                          </span>
                        </div>
                      </div>

                      {/* Portals Section */}
                      <div className="px-2 py-1 text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                        Platform Portals
                      </div>
                      <div className="space-y-1 mb-2">
                        <button
                          id="settings-dropdown-admin-btn"
                          onClick={() => {
                            setIsSettingsOpen(false);
                            handleLinkClick('/admin');
                          }}
                          className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors flex items-center gap-3 group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 group-hover:scale-105 transition-transform">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-white group-hover:text-indigo-200 transition-colors">
                                Admin Console
                              </p>
                              {session.user.role === 'ADMIN' && (
                                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-medium px-1.5 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">Event management & metrics</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                        </button>

                        <button
                          id="settings-dropdown-scanner-btn"
                          onClick={() => {
                            setIsSettingsOpen(false);
                            handleLinkClick('/scan');
                          }}
                          className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors flex items-center gap-3 group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-300 group-hover:scale-105 transition-transform">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-white group-hover:text-orange-200 transition-colors">
                                Scanner Terminal
                              </p>
                              {session.user.role === 'SCANNER' && (
                                <span className="text-[9px] bg-orange-500/20 text-orange-300 font-medium px-1.5 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">Token validation & scanning</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                        </button>
                      </div>

                      <div className="h-px bg-white/10 my-1" />

                      {/* Account & Profile Section */}
                      <div className="px-2 py-1 text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                        Account & Security
                      </div>
                      <div className="space-y-1">
                        <button
                          id="settings-dropdown-profile-btn"
                          onClick={() => {
                            setIsSettingsOpen(false);
                            setIsProfileModalOpen(true);
                          }}
                          className="w-full p-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-semibold">My Profile</span>
                          </div>
                          <span className="text-[10px] text-slate-400 group-hover:text-slate-200">Edit info & password</span>
                        </button>

                        {onLogout && (
                          <button
                            id="settings-dropdown-logout-btn"
                            onClick={() => {
                              setIsSettingsOpen(false);
                              onLogout();
                            }}
                            className="w-full p-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5 text-slate-400" />
                            <span>Sign Out</span>
                          </button>
                        )}

                        {onDeleteAccount && (
                          <button
                            id="settings-dropdown-delete-btn"
                            onClick={() => {
                              setIsSettingsOpen(false);
                              onDeleteAccount();
                            }}
                            className="w-full p-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Delete Account</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                {/* Direct Dual Portal Access for Logged-Out Visitors */}
                <button
                  id="nav-admin-btn-logged-out"
                  onClick={() => handleLinkClick('/admin')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-300 glass hover:bg-indigo-500/15 border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Open Admin Console (Login Required)"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Admin Console</span>
                </button>

                <button
                  id="nav-scanner-btn-logged-out"
                  onClick={() => handleLinkClick('/scan')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-orange-300 glass hover:bg-orange-500/15 border border-orange-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Open Scanner Terminal (Login Required)"
                >
                  <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                  <span>Scanner Terminal</span>
                </button>

                {/* Direct Login Button before logged in */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  id="nav-login-btn"
                  onClick={() => handleLinkClick('/login')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-lg shadow-white/10 hover:shadow-indigo-500/20 transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-900" />
                  <span>Login</span>
                </motion.button>
              </>
            )}
          </div>

          {/* Mobile Right Actions */}
          <div className="flex lg:hidden items-center gap-2">
            {session ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                id="mobile-start-btn"
                onClick={() => handleLinkClick(session.user.role === 'ADMIN' ? '/admin' : '/scan')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
                title="Start Portal"
              >
                <span>Start</span>
                <ArrowRight className="w-3 h-3 text-slate-900" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                id="mobile-login-btn"
                onClick={() => handleLinkClick('/login')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
                title="Login"
              >
                <LogIn className="w-3 h-3 text-slate-900" />
                <span>Login</span>
              </motion.button>
            )}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl glass text-slate-200 hover:text-white cursor-pointer transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Layout spacer so page content is not obscured by fixed navbar */}
      <div className="h-16 sm:h-20 shrink-0 w-full pointer-events-none" aria-hidden="true" />

      {/* Dynamic-Height Mobile Bottom-Sheet Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex flex-col justify-end lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              id="mobile-menu-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full glass-card border-t border-white/10 rounded-t-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-6"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />

              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <AppLogo size="sm" />
                  <span className="font-extrabold text-white text-lg font-['Space_Grotesk']">
                    ADMITTO
                  </span>
                </div>
                <button
                  id="close-mobile-sheet-btn"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg glass text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {navLinks.map((link) => (
                  <button
                    key={link.path}
                    id={`mobile-nav-${link.path.replace('/', '') || 'home'}`}
                    onClick={() => handleLinkClick(link.path)}
                    className={`p-3 text-left rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      currentPath === link.path
                        ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold'
                        : 'glass-dark hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="space-y-2 pt-2">
                {session ? (
                  <>
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            session.user.role === 'ADMIN'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-orange-500/20 text-orange-300'
                          }`}
                        >
                          {session.user.role === 'ADMIN' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <Smartphone className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{session.user.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{session.user.email}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                          session.user.role === 'ADMIN'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        }`}
                      >
                        {session.user.role === 'ADMIN' ? 'Admin' : 'Scanner'}
                      </span>
                    </div>

                    {session.user.role === 'ADMIN' ? (
                      <div className="space-y-2 w-full">
                        <button
                          id="mobile-sheet-console-btn"
                          onClick={() => handleLinkClick('/admin')}
                          className="w-full py-3 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 flex items-center justify-center gap-2 shadow-lg shadow-white/10 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>Go to Admin Console</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
                        </button>
                        <button
                          id="mobile-sheet-scanner-btn"
                          onClick={() => handleLinkClick('/scan')}
                          className="w-full py-3 rounded-xl text-xs font-bold text-orange-300 glass hover:bg-orange-500/15 border border-orange-500/30 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Smartphone className="w-4 h-4 text-orange-400" />
                          <span>Go to Scanner Terminal</span>
                          <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
                        </button>
                      </div>
                    ) : (
                      <button
                        id="mobile-sheet-console-btn"
                        onClick={() => handleLinkClick('/scan')}
                        className="w-full py-3.5 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 flex items-center justify-center gap-2 shadow-lg shadow-white/10 cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4 text-orange-600" />
                        <span>Go to Scanner Terminal</span>
                        <ArrowRight className="w-4 h-4 text-slate-900" />
                      </button>
                    )}

                    <button
                      id="mobile-sheet-profile-btn"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile & Security</span>
                    </button>

                    {onLogout && (
                      <button
                        id="mobile-sheet-logout-btn"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    )}

                    {onDeleteAccount && (
                      <button
                        id="mobile-sheet-delete-account-btn"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onDeleteAccount();
                        }}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Account</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="space-y-2 w-full">
                    <button
                      id="mobile-sheet-admin-btn"
                      onClick={() => handleLinkClick('/admin')}
                      className="w-full py-3 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 flex items-center justify-center gap-2 shadow-lg shadow-white/10 cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span>Admin Console (Sign In Required)</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
                    </button>
                    <button
                      id="mobile-sheet-scanner-btn"
                      onClick={() => handleLinkClick('/scan')}
                      className="w-full py-3 rounded-xl text-xs font-bold text-orange-300 glass hover:bg-orange-500/15 border border-orange-500/30 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Smartphone className="w-4 h-4 text-orange-400" />
                      <span>Scanner Terminal (Sign In Required)</span>
                      <ArrowRight className="w-4 h-4 text-orange-400" />
                    </button>
                    <button
                      id="mobile-sheet-login-btn"
                      onClick={() => handleLinkClick('/login')}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-300 glass flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-indigo-400" />
                      <span>Sign In to Account</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Profile & Security Modal */}
      {session && (
        <MyProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          session={session}
          onProfileUpdated={(updatedUser) => {
            onProfileUpdated?.(updatedUser);
          }}
        />
      )}
    </>
  );
};
