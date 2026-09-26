import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  LayoutDashboard,
  Users,
  ScanLine,
  Smartphone,
  Calendar,
  History,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  ArrowUpRight,
  Shield,
  Sparkles,
  RefreshCw,
  Laptop,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  Home,
  Trash2,
} from 'lucide-react';
import { AuthSession, EventItem, AttendeeType } from '../../types';
import { eventsApi, authApi } from '../../lib/api';
import { CreateEventModal } from './CreateEventModal';
import { broadcastEventDeleted } from '../../lib/realtimeSync';
import { purgeEventOfflineData } from '../../lib/offline/idb';
import { LiquidBackground } from '../common/LiquidBackground';
import { TabSkeletonView } from '../common/Skeleton';
import { NetworkErrorView } from '../common/NetworkErrorView';
import { useNetworkMonitor } from '../../hooks/useNetworkMonitor';
import { AppLogo } from '../common/AppLogo';
import { Footer } from '../public/Footer';

interface AdminLayoutProps {
  session: AuthSession;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  onOpenScanner: () => void;
  onNavigateHome?: () => void;
  onNavigate?: (path: string) => void;
  selectedEventId: string | null;
  onSelectEventId: (eventId: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  session,
  currentTab,
  onSelectTab,
  onLogout,
  onOpenScanner,
  onNavigateHome,
  onNavigate,
  selectedEventId,
  onSelectEventId,
  children,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const attendeePluralLabel = currentEvent?.attendee_label_plural || 'Attendees';

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, desc: 'Real-time metrics & gates' },
    { id: 'students', label: `${attendeePluralLabel} & Tokens`, icon: Users, desc: `Roster & passes for ${attendeePluralLabel.toLowerCase()}` },
    { id: 'scans', label: 'Check-In History', icon: ScanLine, desc: 'Live ingress telemetry' },
    { id: 'scanners', label: 'Gate Scanners', icon: Smartphone, desc: 'Volunteer device keys' },
    { id: 'event', label: 'Event Details', icon: Calendar, desc: 'Venues, dates & schedule' },
    { id: 'activity', label: 'Audit Logs', icon: History, desc: 'Security audit trail' },
    { id: 'settings', label: 'Settings & Data', icon: Settings, desc: 'Export & system config' },
  ];

  // Directional slide state based on navbar tab index
  const [direction, setDirection] = useState<number>(0);
  const prevTabRef = React.useRef(currentTab);
  const [isTabChanging, setIsTabChanging] = useState<boolean>(false);
  const tabContainerRef = useRef<HTMLDivElement>(null);

  // Network & Initial Boot Monitor (0.5s skeleton on reload/login, 15s network error threshold)
  const { isOnline, isInitialBoot, isLongNetworkError, isRetrying, retry } = useNetworkMonitor({
    initialDelayMs: 500,
    errorThresholdMs: 15000,
  });

  useEffect(() => {
    setIsTabChanging(true);
    const timer = setTimeout(() => {
      setIsTabChanging(false);
    }, 500);

    // Auto-scroll navbar to bring the active tab into view when swiping or changing tabs
    if (tabContainerRef.current) {
      const activeTabBtn = tabContainerRef.current.querySelector(`#admin-nav-tab-${currentTab}`) as HTMLElement;
      if (activeTabBtn) {
        activeTabBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    if (prevTabRef.current !== currentTab) {
      const prevIdx = navItems.findIndex((item) => item.id === prevTabRef.current);
      const currIdx = navItems.findIndex((item) => item.id === currentTab);
      if (prevIdx !== -1 && currIdx !== -1 && prevIdx !== currIdx) {
        setDirection(currIdx > prevIdx ? 1 : -1);
      }
      prevTabRef.current = currentTab;
    }

    return () => clearTimeout(timer);
  }, [currentTab]);

  const handleSelectTab = (tabId: string) => {
    if (tabId === currentTab) return;
    const prevIdx = navItems.findIndex((item) => item.id === currentTab);
    const currIdx = navItems.findIndex((item) => item.id === tabId);
    if (prevIdx !== -1 && currIdx !== -1 && prevIdx !== currIdx) {
      setDirection(currIdx > prevIdx ? 1 : -1);
    }
    onSelectTab(tabId);
  };

  // Swipe Gesture Handling for Directional Page Transitions
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Don't intercept touches on interactive controls, inputs, textareas, or open dialogs
    if (target.closest('input, textarea, select, [role="dialog"], .no-swipe')) {
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

    // Reset touch refs
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchEndXRef.current = null;
    touchEndYRef.current = null;

    // Minimum swipe threshold of 45px and predominantly horizontal motion
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      const currentIdx = navItems.findIndex((item) => item.id === currentTab);
      if (currentIdx === -1) return;

      if (deltaX < 0) {
        // Swiped Right-to-Left (finger moved left) -> Next Page (slides in from right to left)
        if (currentIdx < navItems.length - 1) {
          const nextTab = navItems[currentIdx + 1].id;
          setDirection(1);
          onSelectTab(nextTab);
        }
      } else {
        // Swiped Left-to-Right (finger moved right) -> Previous Page (slides in from left to right)
        if (currentIdx > 0) {
          const prevTab = navItems[currentIdx - 1].id;
          setDirection(-1);
          onSelectTab(prevTab);
        }
      }
    }
  };

  useEffect(() => {
    loadEvents();
    const handleEventsChanged = () => {
      loadEvents();
    };
    window.addEventListener('admitto:events-changed', handleEventsChanged);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('admitto_sync');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'EVENT_DELETED') {
          loadEvents();
        }
      };
    } catch {}

    return () => {
      window.removeEventListener('admitto:events-changed', handleEventsChanged);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await eventsApi.list();
      const list = res.events || [];
      setEvents(list);
      if (list.length > 0) {
        if (!selectedEventId || !list.some((e) => e.id === selectedEventId)) {
          onSelectEventId(list[0].id);
        }
      } else {
        onSelectEventId('');
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleDeleteEventFromDropdown = async (ev: EventItem) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete event "${ev.title}"? All attendee rosters and scanner codes will be removed.`);
    if (!confirmed) return;
    try {
      await eventsApi.delete(ev.id, true);
      await broadcastEventDeleted(ev.id);
      try {
        const bc = new BroadcastChannel('admitto_sync');
        bc.postMessage({ type: 'EVENT_DELETED', eventId: ev.id });
        bc.close();
      } catch {}
      try {
        await purgeEventOfflineData(ev.id, true);
      } catch {}

      window.dispatchEvent(new CustomEvent('admitto:events-changed'));
      await loadEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };




  return (
    <div id="admin-portal-layout" className="relative h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden text-[#ECEEF0] bg-[#10232D] flex flex-col selection:bg-[#FFE3A6] selection:text-[#10232D]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#10232D] border-b border-[#314A56] px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 w-full shrink-0 relative">
        {/* Left: Brand + Event Switcher */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1 sm:flex-initial">
          <div
            onClick={onNavigateHome}
            className={`flex items-center gap-2 shrink-0 ${onNavigateHome ? 'cursor-pointer group select-none' : ''}`}
            title={onNavigateHome ? 'Return to Home Page' : undefined}
          >
            <AppLogo size="sm" className="group-hover:scale-105 transition-transform" />
            <div className="hidden lg:block">
              <span className="font-bold text-[#ECEEF0] text-base tracking-tight group-hover:text-[#FFE3A6] transition-colors">
                ADMITTO
              </span>
              <span className="text-[10px] uppercase font-semibold text-[#FFE3A6] ml-1.5 px-2 py-0.5 rounded bg-[#1B303A] border border-[#314A56]">
                CONSOLE
              </span>
            </div>
          </div>

          {/* Event Selector Dropdown */}
          <div className="relative min-w-0 max-w-[140px] xs:max-w-[200px] sm:max-w-[240px] md:max-w-xs flex-1 sm:flex-initial">
            <button
              id="event-switcher-btn"
              onClick={() => setIsEventDropdownOpen(!isEventDropdownOpen)}
              className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-[#1B303A] hover:bg-[#223b47] border border-[#314A56] text-xs font-medium text-[#ECEEF0] flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#FFE3A6] shrink-0" />
              <span className="truncate text-left min-w-0 flex-1">{currentEvent?.title || 'Select Event'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#8A9BA8] shrink-0 transition-transform ${isEventDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isEventDropdownOpen && typeof document !== 'undefined' && createPortal(
              <div className="fixed inset-0 z-[100] bg-[#10232D]/80 flex items-center justify-center p-4">
                <div
                  className="fixed inset-0"
                  onClick={() => setIsEventDropdownOpen(false)}
                />
                <div className="relative z-10 w-full max-w-sm bg-[#1B303A] border border-[#314A56] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                  <div className="px-1 py-1 text-xs uppercase font-medium text-[#8A9BA8] tracking-wider flex items-center justify-between border-b border-[#314A56] pb-2">
                    <span className="text-[#ECEEF0] text-sm font-bold">Your Owned Events ({events.length})</span>
                    <button
                      type="button"
                      onClick={() => setIsEventDropdownOpen(false)}
                      className="p-1 rounded-lg text-[#8A9BA8] hover:text-[#ECEEF0] hover:bg-[#10232D] transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {events.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          onSelectEventId(ev.id);
                          setIsEventDropdownOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-xl text-xs flex flex-col transition-all cursor-pointer ${
                          ev.id === currentEvent?.id
                            ? 'bg-[#10232D] text-[#FFE3A6] font-semibold border border-[#FFE3A6]/50'
                            : 'text-[#ECEEF0] hover:bg-[#10232D] border border-[#314A56]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[#ECEEF0] font-bold text-sm">{ev.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {ev.id === currentEvent?.id && (
                              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#1B303A] text-[#FFE3A6] border border-[#FFE3A6]/30 font-mono font-semibold">
                                Active
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEventFromDropdown(ev);
                              }}
                              className="p-1 rounded-lg hover:bg-[#E255A2]/20 text-[#8A9BA8] hover:text-[#E255A2] transition-colors"
                              title="Delete this event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#8A9BA8] truncate mt-0.5">{ev.venue}</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#314A56]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEventDropdownOpen(false);
                        setIsCreateEventModalOpen(true);
                      }}
                      className="w-full py-2.5 px-4 rounded-lg bg-[#FFE3A6] hover:bg-[#fff0cb] text-[#10232D] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-[#10232D]" />
                      <span>Create New Event</span>
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>

        {/* Right: Actions, Scanner Shortcut, Admin Identity & Hamburger Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Return Home Button */}
          {onNavigateHome && (
            <button
              id="admin-header-home-btn"
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B303A] hover:bg-[#223b47] border border-[#314A56] text-[#8A9BA8] hover:text-[#ECEEF0] text-xs font-medium transition-colors cursor-pointer"
              title="Return to Home Page"
            >
              <Home className="w-3.5 h-3.5 text-[#FFE3A6]" />
              <span className="hidden xs:inline">Home</span>
            </button>
          )}

          {/* Quick Launch Scanner Link */}
          <button
            id="admin-launch-scanner-btn"
            onClick={onOpenScanner}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1B303A] hover:bg-[#223b47] border border-[#314A56] hover:border-[#E4A0B3]/40 text-[#E4A0B3] text-xs font-semibold transition-colors cursor-pointer"
            title="Open Camera Scanner Terminal"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#E4A0B3]" />
            <span className="hidden xl:inline">Launch Gate Scanner</span>
            <span className="xl:hidden">Scanner</span>
            <ArrowUpRight className="w-3 h-3 text-[#E4A0B3]" />
          </button>

          {/* Admin Badge */}
          <div
            id="admin-role-indicator"
            className="flex items-center gap-1.5 sm:gap-2 bg-[#1B303A] rounded-lg px-2.5 sm:px-3 py-1.5 border border-[#314A56] shrink-0"
            title={`Logged in as Admin: ${session.user.name} (${session.user.email})`}
          >
            <div className="w-5 h-5 rounded bg-[#10232D] text-[#FFE3A6] border border-[#314A56] flex items-center justify-center font-bold text-xs shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFE3A6]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#ECEEF0] tracking-wide">Admin</span>
              <span className="hidden lg:inline-block text-[11px] text-[#8A9BA8] font-normal truncate max-w-[90px]">
                ({session.user.name})
              </span>
            </div>
          </div>

          {/* Hamburger Menu Button */}
          <button
            id="admin-hamburger-menu-btn"
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-[#1B303A] hover:bg-[#223b47] border border-[#314A56] text-[#ECEEF0] transition-colors cursor-pointer shrink-0"
            title="Toggle Navigation Menu"
            aria-label="Navigation Menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 text-[#FFE3A6]" />
            ) : (
              <Menu className="w-4 h-4 text-[#ECEEF0]" />
            )}
          </button>
        </div>
      </header>

      {/* Hamburger Navigation Drawer / Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-[#10232D]/80"
            />

            {/* Menu Slideout Panel from Right */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute top-0 right-0 bottom-0 w-full max-w-sm sm:max-w-md bg-[#1B303A] border-l border-[#314A56] flex flex-col z-10 overflow-y-auto"
            >
              {/* Menu Header */}
              <div className="p-5 border-b border-[#314A56] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#10232D] border border-[#314A56] flex items-center justify-center text-[#FFE3A6]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#ECEEF0] text-base">
                      Admin Navigation
                    </h3>
                    <p className="text-[11px] text-[#8A9BA8]">
                      {session.user.name} • {session.user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-[#10232D] border border-[#314A56] text-[#8A9BA8] hover:text-[#ECEEF0] transition-colors cursor-pointer"
                  title="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active Event Card in Menu */}
              <div className="p-5 border-b border-[#314A56] bg-[#10232D]/40">
                <div className="text-[10px] uppercase font-medium text-[#8A9BA8] tracking-wider mb-2">
                  Active Event Context
                </div>
                <div className="p-3 rounded-xl bg-[#10232D] border border-[#314A56] flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#FFE3A6] shrink-0" />
                      <span className="text-xs font-bold text-[#ECEEF0] truncate">
                        {currentEvent?.title || 'No event selected'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8A9BA8] truncate mt-0.5">
                      {currentEvent?.venue || 'Campus Venue'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsEventDropdownOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1B303A] text-[#FFE3A6] hover:bg-[#223b47] text-[11px] font-semibold border border-[#314A56] shrink-0 cursor-pointer"
                  >
                    Switch
                  </button>
                </div>
              </div>

              {/* All Navbar Items in Menu */}
              <div className="p-5 space-y-1.5 flex-1">
                <div className="text-[10px] uppercase font-medium text-[#8A9BA8] tracking-wider mb-3 px-1">
                  Portal Navigation
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`hamburger-nav-item-${item.id}`}
                      onClick={() => {
                        handleSelectTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#10232D] text-[#FFE3A6] font-semibold border border-[#FFE3A6]/40'
                          : 'bg-[#10232D]/40 text-[#8A9BA8] hover:text-[#ECEEF0] hover:bg-[#10232D] border border-[#314A56]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-[#FFE3A6] text-[#10232D]'
                              : 'bg-[#1B303A] text-[#8A9BA8]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs ${isActive ? 'font-bold text-[#FFE3A6]' : 'font-medium text-[#ECEEF0]'}`}>
                            {item.label}
                          </div>
                          <div className="text-[10px] text-[#8A9BA8] truncate">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 text-[#FFE3A6] shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions & Utility Tools */}
              <div className="p-5 border-t border-[#314A56] space-y-3 bg-[#10232D]/40">
                <div className="text-[10px] uppercase font-medium text-[#8A9BA8] tracking-wider px-1">
                  Quick Actions & Controls
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenScanner();
                    }}
                    className="p-3 rounded-lg bg-[#10232D] hover:bg-[#152834] border border-[#314A56] text-[#E4A0B3] text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Launch Scanner</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsCreateEventModalOpen(true);
                    }}
                    className="p-3 rounded-lg bg-[#10232D] hover:bg-[#152834] border border-[#314A56] text-[#FFE3A6] text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Event</span>
                  </button>
                </div>

                {/* Return to Home in Drawer */}
                {onNavigateHome && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onNavigateHome();
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#10232D] hover:bg-[#152834] border border-[#314A56] text-[#ECEEF0] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-[#FFE3A6]" />
                    <span>Return to Home Page</span>
                  </button>
                )}

                {/* Sign Out Button in Drawer */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#E255A2]/10 hover:bg-[#E255A2]/20 border border-[#E255A2]/30 text-[#E255A2] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Admin Console</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Tab Navigation Strip */}
      <div
        ref={tabContainerRef}
        className="bg-[#10232D] border-b border-[#314A56] px-4 sm:px-6 overflow-x-auto shrink-0 relative scroll-smooth no-scrollbar"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 relative py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`admin-nav-tab-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                className={`relative py-2 px-3 sm:px-3.5 text-xs font-medium flex items-center gap-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer z-10 select-none ${
                  isActive
                    ? 'text-[#FFE3A6] bg-[#1B303A] border border-[#314A56]'
                    : 'text-[#8A9BA8] hover:text-[#ECEEF0] hover:bg-[#1B303A]/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FFE3A6]' : 'text-[#8A9BA8]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content with Ultra-Smooth Directional Sliding Page Transitions & Network State Handling */}
      {isLongNetworkError ? (
        <NetworkErrorView
          onRetry={retry}
          isRetrying={isRetrying}
          timeoutSeconds={15}
          errorMessage="Lost connectivity with the Admitto server. Retrying connection..."
        />
      ) : (
        <main
          id="admin-main-viewport"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden apple-momentum-scroll max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8"
        >
          {isInitialBoot || isTabChanging ? (
            <motion.div
              key={`tab-skeleton-${currentTab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <TabSkeletonView tabId={currentTab} />
            </motion.div>
          ) : (
            <AnimatePresence custom={direction} mode="wait" initial={false}>
              <motion.div
                key={currentTab}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({
                    x: dir >= 0 ? 180 : -180,
                    opacity: 0,
                    filter: 'blur(3px)',
                    scale: 0.99,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                    filter: 'blur(0px)',
                    scale: 1,
                    transition: {
                      x: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
                      filter: { duration: 0.28 },
                      scale: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
                    },
                  },
                  exit: (dir: number) => ({
                    x: dir >= 0 ? -180 : 180,
                    opacity: 0,
                    filter: 'blur(3px)',
                    scale: 0.99,
                    transition: {
                      x: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                      filter: { duration: 0.2 },
                      scale: { duration: 0.26 },
                    },
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                style={{ willChange: 'transform, opacity, filter' }}
                className="w-full"
              >
                {children}

                {/* Official ADMITTO Brand Footer */}
                <div className="mt-16 -mx-4 sm:-mx-6 lg:-mx-8">
                  <Footer
                    onNavigate={(path) => {
                      if (onNavigate) {
                        onNavigate(path);
                      } else if (path === '/') {
                        if (onNavigateHome) {
                          onNavigateHome();
                        } else {
                          window.location.href = import.meta.env.BASE_URL || '/';
                        }
                      } else if (path.startsWith('/admin')) {
                        const tab = path.replace('/admin', '').replace('/', '') || 'dashboard';
                        onSelectTab(tab);
                      } else {
                        const baseNoTrailing = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
                        window.location.href = `${baseNoTrailing}${path.startsWith('/') ? path : `/${path}`}`;
                      }
                    }}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      )}

      {/* Create New Event Modal */}
      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        onEventCreated={(event) => {
          setEvents((prev) => [event, ...prev]);
          onSelectEventId(event.id);
        }}
      />
    </div>
  );
};
