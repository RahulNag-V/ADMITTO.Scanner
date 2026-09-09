import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { AuthSession, ScannerAccessRequest } from './types';
import { getSession, removeSession, saveSession, authApi, scannerAccessApi } from './lib/api';
import { getCurrentSession, onAuthStateChange, signOut } from './lib/supabaseAuth';
import { AppleScrollProgress } from './components/common/AppleScrollProgress';

// Public Components
import { Navbar } from './components/public/Navbar';
import { Footer } from './components/public/Footer';
import { StartNowModal } from './components/public/StartNowModal';
import { AuthRequiredModal } from './components/auth/AuthRequiredModal';
import { DeleteAccountModal } from './components/auth/DeleteAccountModal';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { FeaturesPage } from './pages/public/FeaturesPage';
import { SecurityPage } from './pages/public/SecurityPage';
import { ReviewsPage } from './pages/public/ReviewsPage';
import { BlogPage, BlogDetailPage } from './pages/public/BlogPage';
import { FaqPage } from './pages/public/FaqPage';
import { AboutPage } from './pages/public/AboutPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage';

// Scanner Terminal & Access Gatekeeper
import { ScannerPage } from './pages/scanner/ScannerPage';
import { ScannerAccessGatekeeper } from './components/scanner/ScannerAccessGatekeeper';

// Admin Console
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { StudentsPage } from './pages/admin/StudentsPage';
import { ScansHistoryPage } from './pages/admin/ScansHistoryPage';
import { ScannersManagementPage } from './pages/admin/ScannersManagementPage';
import { EventSettingsPage } from './pages/admin/EventSettingsPage';
import { ActivityLogsPage } from './pages/admin/ActivityLogsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { PublicPageSkeletonView, ScannerPageSkeletonView } from './components/common/Skeleton';

import { getAppPath, toBrowserPath } from './lib/router';

export default function App() {
  // Navigation Path
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return getAppPath(window.location.pathname);
  });

  // Page Transition Skeleton Delay State (0.5s)
  const [isPageChanging, setIsPageChanging] = useState(false);

  // Blog Sub-routing
  const [selectedBlogSlug, setSelectedBlogSlug] = useState<string | null>(() => {
    const path = getAppPath(window.location.pathname);
    if (path.startsWith('/blog/')) {
      const slug = path.replace(/^\/blog\//, '').trim();
      return slug || null;
    }
    return null;
  });

  // Auth State
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isStartNowOpen, setIsStartNowOpen] = useState(false);
  const [initialLoginRole, setInitialLoginRole] = useState<'ADMIN' | 'SCANNER'>('ADMIN');
  const [returnTo, setReturnTo] = useState<string | undefined>(undefined);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string>('');

  // Guest Protection Modal State
  const [authRequiredModalOpen, setAuthRequiredModalOpen] = useState(false);
  const [authRequiredFeature, setAuthRequiredFeature] = useState('Admin Console');

  // Delete Account Confirmation Modal State
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  // Trigger 0.5s skeleton delay on path or blog slug change
  useEffect(() => {
    setIsPageChanging(true);
    const timer = setTimeout(() => {
      setIsPageChanging(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentPath, selectedBlogSlug]);

  const validAdminTabs = ['dashboard', 'students', 'scans', 'scanners', 'event', 'activity', 'settings'];

  // Admin Selected Event ID (Restored from URL query or localStorage)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fromUrl = urlParams.get('eventId') || urlParams.get('event');
      if (fromUrl) return fromUrl;
      return localStorage.getItem('admitto_selected_event_id') || null;
    } catch {
      return null;
    }
  });

  // Admin Active Tab (Restored from URL query or path or localStorage)
  const [adminActiveTab, setAdminActiveTab] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && validAdminTabs.includes(tabParam)) return tabParam;
      const appPath = getAppPath(window.location.pathname);
      const pathParts = appPath.split('/').filter(Boolean);
      if (pathParts[0] === 'admin' && pathParts[1] && validAdminTabs.includes(pathParts[1])) {
        return pathParts[1];
      }
      const saved = localStorage.getItem('admitto_admin_active_tab');
      if (saved && validAdminTabs.includes(saved)) return saved;
      return 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  // Active Approved Scanner Request Session (Restored from sessionStorage)
  const [activeScannerRequest, setActiveScannerRequest] = useState<ScannerAccessRequest | null>(() => {
    try {
      const stored = sessionStorage.getItem('admitto_active_scanner_request');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleSelectAdminTab = (tab: string) => {
    setAdminActiveTab(tab);
    try {
      localStorage.setItem('admitto_admin_active_tab', tab);
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('tab', tab);
      const newQuery = urlParams.toString();
      const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    } catch {
      // ignore
    }
  };

  const handleSelectEventId = (eventId: string) => {
    setSelectedEventId(eventId);
    try {
      if (eventId) {
        localStorage.setItem('admitto_selected_event_id', eventId);
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('event', eventId);
        const newQuery = urlParams.toString();
        const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`;
        window.history.replaceState({}, '', newUrl);
      } else {
        localStorage.removeItem('admitto_selected_event_id');
      }
    } catch {
      // ignore
    }
  };

  const handleStartScanner = (req: ScannerAccessRequest | null) => {
    setActiveScannerRequest(req);
    try {
      if (req) {
        sessionStorage.setItem('admitto_active_scanner_request', JSON.stringify(req));
      } else {
        sessionStorage.removeItem('admitto_active_scanner_request');
      }
    } catch {
      // ignore
    }
  };

  // Public Routes for horizontal swipe navigation
  const publicRoutes = [
    '/',
    '/how-it-works',
    '/features',
    '/security',
    '/reviews',
    '/blog',
    '/faq',
    '/about',
  ];

  // Touch Swipe Gesture Handling for Public Pages
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [role="dialog"], button, a, .no-swipe')) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchEndXRef.current = e.touches[0].clientX;
    touchEndYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    touchEndXRef.current = e.touches[0].clientX;
    touchEndYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (
      touchStartXRef.current === null ||
      touchEndXRef.current === null ||
      touchStartYRef.current === null ||
      touchEndYRef.current === null
    ) {
      return;
    }

    const deltaX = touchEndXRef.current - touchStartXRef.current;
    const deltaY = touchEndYRef.current - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchEndXRef.current = null;
    touchEndYRef.current = null;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      const currentIdx = publicRoutes.indexOf(currentPath);
      if (currentIdx === -1) return;

      if (deltaX < 0) {
        if (currentIdx < publicRoutes.length - 1) {
          navigate(publicRoutes[currentIdx + 1]);
        }
      } else {
        if (currentIdx > 0) {
          navigate(publicRoutes[currentIdx - 1]);
        }
      }
    }
  };

  // Lock to sleek dark theme permanently
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark-theme');
    root.classList.remove('light-theme');
    localStorage.removeItem('admitto_theme');
  }, []);

  // Sync browser back/forward history
  useEffect(() => {
    const handlePopState = () => {
      const path = getAppPath(window.location.pathname);
      setCurrentPath(path);

      if (path.startsWith('/admin')) {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab && validAdminTabs.includes(tab)) {
          setAdminActiveTab(tab);
        }
      }

      if (path.startsWith('/blog/')) {
        setSelectedBlogSlug(path.replace(/^\/blog\//, '').trim());
      } else if (path === '/blog') {
        setSelectedBlogSlug(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check initial Supabase session & restore on launch
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const stored = getSession();
        if (stored && isMounted) {
          setSession(stored);
        }

        if (stored?.user?.role === 'SCANNER' && !stored.token.startsWith('eyJ')) {
          // Dedicated token-based scanner station sessions — preserve them
          if (isMounted) {
            setIsAuthChecking(false);
          }
          return;
        }

        const currentSession = await getCurrentSession();
        if (currentSession?.user) {
          const user = currentSession.user;
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'User';

          let effectiveRole = stored?.user?.role || 'ADMIN';
          let effectiveId = stored?.user?.id || user.id;

          try {
            const meRes = await authApi.me();
            if (meRes?.user) {
              effectiveRole = meRes.user.role;
              effectiveId = meRes.user.id;
            }
          } catch {
            // Keep fallback
          }

          const restoredSession: AuthSession = {
            token: currentSession.access_token,
            user: {
              id: effectiveId,
              email: user.email || '',
              name: fullName,
              role: effectiveRole,
            },
          };

          if (isMounted) {
            setSession(restoredSession);
            saveSession(restoredSession);
          }
        } else if (!stored) {
          // If no session and first-time visitor opening the root page, route to login
          const hasVisited = localStorage.getItem('admitto_visited');
          if (!hasVisited && getAppPath(window.location.pathname) === '/') {
            if (isMounted) {
              navigate('/login');
            }
          }
        }
      } catch (err) {
        console.warn('[ADMITTO Auth] Session check error:', err);
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to Supabase auth events
    const unsubscribe = onAuthStateChange(async (event, newSession) => {
      const stored = getSession();
      if (stored?.user?.role === 'SCANNER' && !stored.token.startsWith('eyJ')) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        removeSession();
        handleStartScanner(null);
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.user) {
        const user = newSession.user;
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'User';

        let effectiveRole = stored?.user?.role || 'ADMIN';
        let effectiveId = stored?.user?.id || user.id;

        try {
          const meRes = await authApi.me();
          if (meRes?.user) {
            effectiveRole = meRes.user.role;
            effectiveId = meRes.user.id;
          }
        } catch {
          // Keep fallback
        }

        const authSession: AuthSession = {
          token: newSession.access_token,
          user: {
            id: effectiveId,
            email: user.email || '',
            name: fullName,
            role: effectiveRole,
          },
        };
        setSession(authSession);
        saveSession(authSession);
        localStorage.setItem('admitto_visited', 'true');
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/forgot-password');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const navigate = (path: string) => {
    const appRoute = getAppPath(path.split('?')[0].split('#')[0] || '/');
    const browserUrl = toBrowserPath(path);
    if (browserUrl !== window.location.pathname + window.location.search) {
      window.history.pushState({}, '', browserUrl);
    }
    setCurrentPath(appRoute);
    const mainEl = document.getElementById('app-main-viewport');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenStartNow = () => {
    setIsStartNowOpen(true);
  };

  const handleSelectPortalRole = (role: 'ADMIN' | 'SCANNER') => {
    setIsStartNowOpen(false);

    if (role === 'ADMIN') {
      if (session && session.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        setReturnTo('/admin');
        setInitialLoginRole('ADMIN');
        navigate('/login');
      }
    } else {
      // Gate Scanner: Any authenticated user can access the Scanner Gatekeeper
      if (session) {
        navigate('/scan');
      } else {
        setReturnTo('/scan');
        setInitialLoginRole('SCANNER');
        navigate('/login');
      }
    }
  };

  const handleLoginSuccess = async (newSession: AuthSession, overrideReturnTo?: string) => {
    setSession(newSession);
    saveSession(newSession);
    localStorage.setItem('admitto_visited', 'true');

    // Auto submit pending scanner referral request if one was saved before sign-in
    const pendingRef = sessionStorage.getItem('pending_referral_code');
    if (pendingRef) {
      sessionStorage.removeItem('pending_referral_code');
      try {
        await scannerAccessApi.requestAccess(pendingRef, newSession.user.name);
      } catch (err) {
        console.warn('Auto request scanner access on login note:', err);
      }
    }

    const dest = overrideReturnTo || returnTo;
    setReturnTo(undefined);

    if (dest) {
      if (newSession.user.role === 'SCANNER' && dest.startsWith('/admin')) {
        navigate('/scan');
      } else {
        navigate(dest);
      }
    } else if (newSession.user.role === 'ADMIN') {
      // Open portal or direct to admin
      navigate('/admin');
    } else {
      navigate('/scan');
    }
  };

  const handleLogout = async () => {
    await signOut();
    removeSession();
    setSession(null);
    handleStartScanner(null);
    navigate('/login');
  };

  const handleProfileUpdated = (updatedUser: AuthSession['user']) => {
    if (session) {
      const updated: AuthSession = {
        ...session,
        user: { ...session.user, ...updatedUser },
      };
      setSession(updated);
      saveSession(updated);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    try {
      await authApi.deleteAccount();
    } catch (err: any) {
      console.warn('API delete account error:', err);
    }
    await signOut().catch(() => {});
    removeSession();
    setSession(null);
    handleStartScanner(null);
    setIsDeleteAccountModalOpen(false);
    navigate('/');
  };

  // Auto-logout on session expiry
  useEffect(() => {
    const handleSessionExpired = () => {
      setSession(null);
      handleStartScanner(null);
      navigate('/login');
    };
    window.addEventListener('admitto:session-expired', handleSessionExpired);
    return () => window.removeEventListener('admitto:session-expired', handleSessionExpired);
  }, []);

  // ─── ROUTE: /auth/callback ─────────────────────────────────────────
  if (currentPath.startsWith('/auth/callback')) {
    return (
      <AuthCallbackPage
        onAuthSuccess={handleLoginSuccess}
        onNavigateLogin={() => navigate('/login')}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  // ─── ROUTE: /verify-email ──────────────────────────────────────────
  if (currentPath === '/verify-email') {
    return (
      <VerifyEmailPage
        email={pendingVerificationEmail}
        onNavigateLogin={() => navigate('/login')}
        onNavigateHome={() => navigate('/')}
        onChangeEmail={() => navigate('/signup')}
      />
    );
  }

  // ─── ROUTE: /forgot-password ───────────────────────────────────────
  if (currentPath === '/forgot-password') {
    return (
      <ForgotPasswordPage
        onNavigateLogin={() => navigate('/login')}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  // ─── ROUTE: /reset-password (Redirect to unified /forgot-password) ──
  if (currentPath === '/reset-password') {
    navigate('/forgot-password');
    return (
      <ForgotPasswordPage
        onNavigateLogin={() => navigate('/login')}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  // ─── ROUTE: /signup ────────────────────────────────────────────────
  if (currentPath === '/signup') {
    return (
      <SignupPage
        returnTo={returnTo}
        onSignupSuccess={handleLoginSuccess}
        onNeedsEmailVerification={(email) => {
          setPendingVerificationEmail(email);
          navigate('/verify-email');
        }}
        onNavigateLogin={() => navigate('/login')}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  // ─── ROUTE: /login ─────────────────────────────────────────────────
  if (currentPath === '/login') {
    return (
      <LoginPage
        initialRole={initialLoginRole}
        returnTo={returnTo}
        onLoginSuccess={handleLoginSuccess}
        onNavigateHome={() => navigate('/')}
        onNavigateSignUp={() => navigate('/signup')}
        onNavigateForgotPassword={() => navigate('/forgot-password')}
      />
    );
  }

  // ─── ROUTE: /scan (Gate Scanner) ──────────────────────────────────
  if (currentPath === '/scan') {
    if (isPageChanging || (isAuthChecking && !session)) {
      return (
        <>
          <AppleScrollProgress />
          <ScannerPageSkeletonView />
        </>
      );
    }

    if (!session) {
      return (
        <LoginPage
          initialRole="SCANNER"
          returnTo="/scan"
          onLoginSuccess={handleLoginSuccess}
          onNavigateHome={() => navigate('/')}
          onNavigateSignUp={() => navigate('/signup')}
          onNavigateForgotPassword={() => navigate('/forgot-password')}
        />
      );
    }

    // 1. If an approved volunteer access request has been launched
    if (activeScannerRequest) {
      const scannerSession: AuthSession = {
        token: session.token,
        user: {
          id: session.user.id,
          role: 'SCANNER',
          email: session.user.email,
          name: `${session.user.name} (${activeScannerRequest.gate_name})`,
          event_id: activeScannerRequest.event_id,
          event_title: activeScannerRequest.event_title || 'Assigned Event',
        },
      };
      return (
        <>
          <AppleScrollProgress />
          <ScannerPage
            session={scannerSession}
            onLogout={() => handleStartScanner(null)}
            onNavigateHome={() => navigate('/')}
          />
        </>
      );
    }

    // 2. If directly logged in as a station scanner account (GATE-XXX)
    if (session.user.role === 'SCANNER' && session.user.event_id) {
      return (
        <>
          <AppleScrollProgress />
          <ScannerPage
            session={session}
            onLogout={handleLogout}
            onNavigateHome={() => navigate('/')}
          />
        </>
      );
    }

    // Default: Show ScannerAccessGatekeeper for authenticated user
    return (
      <>
        <AppleScrollProgress />
        <ScannerAccessGatekeeper
          session={session}
          onStartScanner={(req) => handleStartScanner(req)}
          onLogout={handleLogout}
          onDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
          onNavigateHome={() => navigate('/')}
        />
      </>
    );
  }

  // ─── ROUTE: /admin (Admin Console) ────────────────────────────────
  if (currentPath.startsWith('/admin')) {
    if (isAuthChecking && !session) {
      return (
        <>
          <AppleScrollProgress />
          <PublicPageSkeletonView />
        </>
      );
    }

    if (!session) {
      return (
        <LoginPage
          initialRole="ADMIN"
          returnTo="/admin"
          onLoginSuccess={handleLoginSuccess}
          onNavigateHome={() => navigate('/')}
          onNavigateSignUp={() => navigate('/signup')}
          onNavigateForgotPassword={() => navigate('/forgot-password')}
        />
      );
    }

    if (session.user.role !== 'ADMIN') {
      // Scanner user trying to view /admin -> send to /scan
      navigate('/scan');
      return null;
    }

    return (
      <>
        <AppleScrollProgress />
        <AdminLayout
          session={session}
          currentTab={adminActiveTab}
          onSelectTab={handleSelectAdminTab}
          onLogout={handleLogout}
          onDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
          onOpenScanner={() => navigate('/scan')}
          onNavigateHome={() => navigate('/')}
          selectedEventId={selectedEventId}
          onSelectEventId={handleSelectEventId}
        >
          {selectedEventId ? (
            <>
              {adminActiveTab === 'dashboard' && (
                <DashboardPage
                  eventId={selectedEventId}
                  onNavigateTab={handleSelectAdminTab}
                  onOpenScanner={() => navigate('/scan')}
                />
              )}
              {adminActiveTab === 'students' && <StudentsPage eventId={selectedEventId} />}
              {adminActiveTab === 'scans' && <ScansHistoryPage eventId={selectedEventId} />}
              {adminActiveTab === 'scanners' && (
                <ScannersManagementPage eventId={selectedEventId} />
              )}
              {adminActiveTab === 'event' && (
                <EventSettingsPage
                  eventId={selectedEventId}
                  onSelectEventId={handleSelectEventId}
                />
              )}
              {adminActiveTab === 'activity' && <ActivityLogsPage eventId={selectedEventId} />}
              {adminActiveTab === 'settings' && (
                <AdminSettingsPage
                  session={session}
                  eventId={selectedEventId}
                  onLogout={handleLogout}
                  onDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-5 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shadow-xl shadow-indigo-500/10">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  No events yet
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Create your first event to start managing attendees, gate scanners, and event access.
                </p>
              </div>
              <button
                onClick={() => {
                  const evSwitcherBtn = document.getElementById('event-switcher-btn');
                  if (evSwitcherBtn) evSwitcherBtn.click();
                }}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Event</span>
              </button>
            </div>
          )}
        </AdminLayout>
      </>
    );
  }

  // ─── PUBLIC MARKETING & INFORMATIONAL PAGES ────────────────────────
  return (
    <div
      id="admitto-app"
      className="min-h-screen mesh-bg text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative"
    >
      <AppleScrollProgress />
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
        onOpenStartNow={handleOpenStartNow}
        session={session}
        onLogout={handleLogout}
        onDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
        onProfileUpdated={handleProfileUpdated}
      />

      <main
        id="app-main-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 w-full"
      >
        {isPageChanging ? (
          <PublicPageSkeletonView path={currentPath} />
        ) : (
          <>
            {currentPath === '/' && (
              <HomePage
                onOpenStartNow={handleOpenStartNow}
                onNavigate={navigate}
                session={session}
                onSelectRole={handleSelectPortalRole}
              />
            )}

            {currentPath === '/how-it-works' && (
              <HowItWorksPage onOpenStartNow={handleOpenStartNow} onNavigate={navigate} />
            )}

            {currentPath === '/features' && <FeaturesPage onOpenStartNow={handleOpenStartNow} />}

            {currentPath === '/security' && <SecurityPage />}

            {currentPath === '/reviews' && <ReviewsPage />}

            {(currentPath === '/blog' || currentPath.startsWith('/blog/')) && (
              selectedBlogSlug ? (
                <BlogDetailPage
                  slug={selectedBlogSlug}
                  onBack={() => {
                    setSelectedBlogSlug(null);
                    navigate('/blog');
                  }}
                  onSelectPost={(slug) => {
                    setSelectedBlogSlug(slug);
                    navigate(`/blog/${slug}`);
                  }}
                />
              ) : (
                <BlogPage
                  onSelectPost={(slug) => {
                    setSelectedBlogSlug(slug);
                    navigate(`/blog/${slug}`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )
            )}

            {currentPath === '/faq' && <FaqPage />}

            {currentPath === '/about' && <AboutPage />}
          </>
        )}
      </main>

      <Footer onNavigate={navigate} />

      {/* Global Start Now / Choose Access Portal Modal */}
      <StartNowModal
        isOpen={isStartNowOpen}
        onClose={() => setIsStartNowOpen(false)}
        onSelectRole={handleSelectPortalRole}
      />

      {/* Guest Sign-in Required Modal */}
      <AuthRequiredModal
        isOpen={authRequiredModalOpen}
        onClose={() => setAuthRequiredModalOpen(false)}
        onNavigateLogin={() => {
          setReturnTo('/admin');
          navigate('/login');
        }}
        onNavigateSignUp={() => {
          setReturnTo('/admin');
          navigate('/signup');
        }}
        targetFeatureName={authRequiredFeature}
      />
      {/* Permanent Account Deletion Modal */}
      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onConfirmDelete={handleConfirmDeleteAccount}
        userEmail={session?.user?.email}
        userName={session?.user?.name}
        userRole={session?.user?.role}
      />
    </div>
  );
}
