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
import { playFeedbackSound } from '../../lib/sound';
import { ATTENDEE_TYPE_PRESETS, getPresetByType } from '../../lib/attendeeTypes';
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
  onDeleteAccount?: () => void;
  onOpenScanner: () => void;
  onNavigateHome?: () => void;
  selectedEventId: string | null;
  onSelectEventId: (eventId: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  session,
  currentTab,
  onSelectTab,
  onLogout,
  onDeleteAccount,
  onOpenScanner,
  onNavigateHome,
  selectedEventId,
  onSelectEventId,
  children,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newAttendeeType, setNewAttendeeType] = useState<AttendeeType>('STUDENTS');
  const [newCustomSingular, setNewCustomSingular] = useState('Member');
  const [newCustomPlural, setNewCustomPlural] = useState('Members');
  const [isCreating, setIsCreating] = useState(false);

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
    playFeedbackSound('click');
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
          playFeedbackSound('click');
        }
      } else {
        // Swiped Left-to-Right (finger moved right) -> Previous Page (slides in from left to right)
        if (currentIdx > 0) {
          const prevTab = navItems[currentIdx - 1].id;
          setDirection(-1);
          onSelectTab(prevTab);
          playFeedbackSound('click');
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
    return () => window.removeEventListener('admitto:events-changed', handleEventsChanged);
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
      playFeedbackSound('click');
      window.dispatchEvent(new CustomEvent('admitto:events-changed'));
      await loadEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle) return;
    setIsCreating(true);
    try {
      const preset = getPresetByType(newAttendeeType);
      const singular = newAttendeeType === 'CUSTOM' ? (newCustomSingular.trim() || 'Member') : preset.singular;
      const plural = newAttendeeType === 'CUSTOM' ? (newCustomPlural.trim() || 'Members') : preset.plural;
      const primaryScanField = preset.defaultPrimaryKey;

      const res = await eventsApi.create({
        title: newEventTitle,
        venue: newEventVenue || 'Main Auditorium',
        event_date: newEventDate ? new Date(newEventDate).toISOString() : new Date().toISOString(),
        attendee_type: newAttendeeType,
        attendee_label_singular: singular,
        attendee_label_plural: plural,
        primary_scan_field: primaryScanField,
        barcode_field: primaryScanField,
      });
      if (res.event) {
        playFeedbackSound('success');
        setEvents([res.event, ...events]);
        onSelectEventId(res.event.id);
        setIsCreateEventModalOpen(false);
        setNewEventTitle('');
        setNewEventVenue('');
        setNewEventDate('');
        setNewAttendeeType('STUDENTS');
        setNewCustomSingular('Member');
        setNewCustomPlural('Members');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };


  return (
    <div id="admin-portal-layout" className="relative h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Ambient Liquid Animated Canvas */}
      <LiquidBackground intensity="vibrant" />

      {/* Top Navbar with Ambient Liquid Aurora Flow */}
      <header className="sticky top-0 z-50 glass-header border-b border-white/[0.08] px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 w-full shrink-0 relative">
        {/* Floating Liquid Blobs inside Navbar */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-10 left-1/4 w-52 h-24 bg-indigo-600/30 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -top-8 right-1/3 w-44 h-24 bg-purple-600/25 rounded-full blur-2xl animate-[pulse_4s_infinite]" />
          <div className="absolute -bottom-8 right-10 w-36 h-20 bg-pink-600/20 rounded-full blur-xl animate-pulse" />
          {/* Flowing liquid iridescent border shimmer */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 via-purple-500/50 to-transparent" />
        </div>

        {/* Left: Brand + Event Switcher */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1 sm:flex-initial">
          <div
            onClick={onNavigateHome}
            className={`flex items-center gap-2 shrink-0 ${onNavigateHome ? 'cursor-pointer group select-none' : ''}`}
            title={onNavigateHome ? 'Return to Home Page' : undefined}
          >
            <AppLogo size="sm" className="shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform" />
            <div className="hidden lg:block">
              <span className="font-extrabold text-white text-base tracking-tight font-['Space_Grotesk'] group-hover:text-indigo-300 transition-colors">
                ADMITTO
              </span>
              <span className="text-[10px] uppercase font-bold text-indigo-300 ml-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                CONSOLE
              </span>
            </div>
          </div>

          {/* Event Selector Dropdown */}
          <div className="relative min-w-0 max-w-[140px] xs:max-w-[200px] sm:max-w-[240px] md:max-w-xs flex-1 sm:flex-initial">
            <button
              id="event-switcher-btn"
              onClick={() => setIsEventDropdownOpen(!isEventDropdownOpen)}
              className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl glass-dark hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 shrink-0" />
              <span className="truncate text-left min-w-0 flex-1">{currentEvent?.title || 'Select Event'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isEventDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isEventDropdownOpen && typeof document !== 'undefined' && createPortal(
              <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <div
                  className="fixed inset-0"
                  onClick={() => setIsEventDropdownOpen(false)}
                />
                <div className="relative z-10 w-full max-w-sm bg-[#181d36]/98 border border-white/20 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 backdrop-blur-2xl animate-scale-in ring-1 ring-white/15">
                  <div className="px-1 py-1 text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-white font-['Space_Grotesk'] text-sm font-bold">Your Owned Events ({events.length})</span>
                    <button
                      type="button"
                      onClick={() => setIsEventDropdownOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
                          playFeedbackSound('click');
                          onSelectEventId(ev.id);
                          setIsEventDropdownOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-2xl text-xs flex flex-col transition-all cursor-pointer ${
                          ev.id === currentEvent?.id
                            ? 'bg-indigo-600/35 text-indigo-100 font-bold border border-indigo-500/50 shadow-md ring-1 ring-indigo-400/30'
                            : 'text-slate-300 hover:bg-white/[0.08] border border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-white font-bold text-sm">{ev.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {ev.id === currentEvent?.id && (
                              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                                Active
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEventFromDropdown(ev);
                              }}
                              className="p-1 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition"
                              title="Delete this event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate mt-0.5">{ev.venue}</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        playFeedbackSound('click');
                        setIsEventDropdownOpen(false);
                        setIsCreateEventModalOpen(true);
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                    >
                      <Plus className="w-4 h-4 text-white" />
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-dark hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              title="Return to Home Page"
            >
              <Home className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xs:inline">Home</span>
            </button>
          )}

          {/* Quick Launch Scanner Link */}
          <button
            id="admin-launch-scanner-btn"
            onClick={onOpenScanner}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl glass-dark hover:bg-white/[0.08] border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all cursor-pointer"
            title="Open Camera Scanner Terminal"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xl:inline">Launch Gate Scanner</span>
            <span className="xl:hidden">Scanner</span>
            <ArrowUpRight className="w-3 h-3 text-indigo-400" />
          </button>

          {/* Admin Badge: "Admin" instead of just "A" */}
          <div
            id="admin-role-indicator"
            className="flex items-center gap-1.5 sm:gap-2 glass-dark rounded-xl px-2.5 sm:px-3 py-1.5 border border-indigo-500/30 shrink-0"
            title={`Logged in as Admin: ${session.user.name} (${session.user.email})`}
          >
            <div className="w-5 h-5 rounded-lg bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-white tracking-wide">Admin</span>
              <span className="hidden lg:inline-block text-[11px] text-slate-400 font-medium truncate max-w-[90px]">
                ({session.user.name})
              </span>
            </div>
          </div>

          {/* Hamburger Menu Button (Right Top) */}
          <button
            id="admin-hamburger-menu-btn"
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              playFeedbackSound('click');
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl glass-dark hover:bg-white/[0.1] border border-white/10 text-white transition-all cursor-pointer shrink-0"
            title="Toggle Navigation Menu"
            aria-label="Navigation Menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 text-indigo-400" />
            ) : (
              <Menu className="w-4 h-4 text-white" />
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
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Menu Slideout Panel from Right */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute top-0 right-0 bottom-0 w-full max-w-sm sm:max-w-md glass-card border-l border-white/10 shadow-2xl flex flex-col z-10 overflow-y-auto"
            >
              {/* Menu Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base font-['Space_Grotesk']">
                      Admin Navigation
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {session.user.name} • {session.user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl glass text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active Event Card in Menu */}
              <div className="p-5 border-b border-white/10 bg-white/[0.02]">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                  Active Event Context
                </div>
                <div className="p-3 rounded-2xl glass-dark border border-white/10 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 shrink-0" />
                      <span className="text-xs font-bold text-white truncate">
                        {currentEvent?.title || 'No event selected'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {currentEvent?.venue || 'Campus Venue'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsEventDropdownOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-[11px] font-bold border border-indigo-500/30 shrink-0 cursor-pointer"
                  >
                    Switch
                  </button>
                </div>
              </div>

              {/* All Navbar Items in Menu */}
              <div className="p-5 space-y-1.5 flex-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3 px-1">
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
                      className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-500/20 text-white font-bold border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                          : 'glass-dark text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                              : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs ${isActive ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions & Utility Tools */}
              <div className="p-5 border-t border-white/10 space-y-3 bg-white/[0.02]">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1">
                  Quick Actions & Controls
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenScanner();
                    }}
                    className="p-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Launch Scanner</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsCreateEventModalOpen(true);
                    }}
                    className="p-3 rounded-xl glass hover:bg-white/[0.08] text-slate-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                    className="w-full py-2.5 px-4 rounded-xl glass-dark hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-indigo-400" />
                    <span>Return to Home Page</span>
                  </button>
                )}

                {/* Sign Out Button in Drawer */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Admin Console</span>
                </button>

                {/* Delete Account Button in Drawer (below Sign Out button) */}
                {onDeleteAccount && (
                  <button
                    id="drawer-delete-account-btn"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onDeleteAccount();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Delete Account</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Tab Navigation Strip with Liquid Aurora & Morphing Active Pill */}
      <div
        ref={tabContainerRef}
        className="glass-dark border-b border-white/[0.08] px-4 sm:px-6 overflow-x-auto shrink-0 relative scroll-smooth no-scrollbar"
      >
        {/* Liquid Aurora Under-Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-6 left-1/4 w-72 h-16 bg-gradient-to-r from-indigo-500/25 via-purple-500/25 to-pink-500/20 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -bottom-4 right-1/4 w-60 h-12 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-full blur-xl animate-[pulse_4s_infinite]" />
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/40 via-purple-400/40 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 relative py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`admin-nav-tab-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                className={`relative py-2.5 px-3.5 sm:px-4 text-xs font-semibold flex items-center gap-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer z-10 select-none ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {/* Active Liquid Pill Animation */}
                {isActive && (
                  <motion.div
                    layoutId="admin-active-tab-liquid"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/25 via-purple-500/30 to-pink-500/20 border border-indigo-400/40 shadow-[0_0_20px_rgba(99,102,241,0.3)] backdrop-blur-md -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  >
                    <div className="absolute bottom-0 inset-x-2 h-[2px] bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                  </motion.div>
                )}
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-300' : 'text-slate-500'}`} />
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
                      if (path === '/') {
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
      {isCreateEventModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181d36]/95 border border-white/20 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl backdrop-blur-2xl my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
                  Create New Event
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set event details and choose your target attendee audience.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateEventModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Tech Symposium 2026, Summer Gala"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Target Audience & Attendee Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Target Audience & Attendee Type</span>
                  <span className="text-[11px] font-normal text-indigo-300">Sets terminology & default ID</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                  {ATTENDEE_TYPE_PRESETS.map((preset) => {
                    const isSelected = newAttendeeType === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setNewAttendeeType(preset.id);
                          playFeedbackSound('click');
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/25 border-indigo-400 text-white shadow-md shadow-indigo-600/20'
                            : 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-base">{preset.emoji}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-sm" />}
                        </div>
                        <div className="text-xs font-bold leading-tight line-clamp-1">{preset.singular}s</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{preset.badge}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Term Input Fields if CUSTOM is selected */}
                {newAttendeeType === 'CUSTOM' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-400">Singular Term</label>
                      <input
                        type="text"
                        placeholder="e.g. Member, Athlete, VIP"
                        value={newCustomSingular}
                        onChange={(e) => setNewCustomSingular(e.target.value)}
                        className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Plural Term</label>
                      <input
                        type="text"
                        placeholder="e.g. Members, Athletes, VIPs"
                        value={newCustomPlural}
                        onChange={(e) => setNewCustomPlural(e.target.value)}
                        className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Live Preview of terminology */}
                {(() => {
                  const p = getPresetByType(newAttendeeType);
                  const sing = newAttendeeType === 'CUSTOM' ? (newCustomSingular.trim() || 'Member') : p.singular;
                  const plur = newAttendeeType === 'CUSTOM' ? (newCustomPlural.trim() || 'Members') : p.plural;
                  return (
                    <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-300 flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">Preview:</span>
                      <span>Passes for <strong>{plur}</strong> • Default Key: <strong>{p.primaryKeyLabel}</strong></span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Event Date</label>
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    style={{ colorScheme: 'dark' }}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateEventModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Event'}
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
