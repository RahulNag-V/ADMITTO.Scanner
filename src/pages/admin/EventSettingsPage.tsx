import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  MapPin,
  Shield,
  Edit3,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  Image as ImageIcon,
  UploadCloud,
  X,
  Link,
  Sparkles,
  RefreshCw,
  Search,
  ChevronDown,
  Check,
  Palette,
  Layers,
  Sliders,
  Info,
  Clock,
  Building,
  Plus,
  QrCode,
  Barcode,
  Key,
  Lock,
  Eye,
  User,
  Users,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { EventItem, QrMode, EventScanConfig, AttendeeType } from '../../types';
import { eventsApi } from '../../lib/api';
import { playFeedbackSound } from '../../lib/sound';
import { ATTENDEE_TYPE_PRESETS, getPresetByType } from '../../lib/attendeeTypes';
import { TabSkeletonView } from '../../components/common/Skeleton';

interface EventSettingsPageProps {
  eventId: string;
  onSelectEventId?: (id: string) => void;
}

interface GradientTheme {
  id: string;
  name: string;
  bg: string;
  group: 'Warm' | 'Cyber' | 'Nature' | 'Dark';
  accent: string;
}

const GRADIENT_PRESETS: GradientTheme[] = [
  // Warm & Vibrant
  { id: 'sunset', name: 'Sunset Amber', bg: 'from-amber-600 via-orange-600 to-rose-700', group: 'Warm', accent: '#f97316' },
  { id: 'solar', name: 'Solar Flare', bg: 'from-yellow-500 via-amber-600 to-orange-700', group: 'Warm', accent: '#eab308' },
  { id: 'magma', name: 'Crimson Magma', bg: 'from-red-600 via-rose-700 to-amber-900', group: 'Warm', accent: '#ef4444' },
  { id: 'coral', name: 'Coral Sunset', bg: 'from-rose-500 via-pink-600 to-amber-600', group: 'Warm', accent: '#f43f5e' },
  { id: 'autumn', name: 'Autumn Rust', bg: 'from-amber-700 via-red-800 to-stone-900', group: 'Warm', accent: '#b45309' },
  { id: 'gold', name: 'Gold Luxury', bg: 'from-amber-500 via-yellow-600 to-stone-900', group: 'Warm', accent: '#d97706' },

  // Cyber & Neon
  { id: 'cyber', name: 'Cyber Neon', bg: 'from-indigo-600 via-purple-600 to-pink-600', group: 'Cyber', accent: '#a855f7' },
  { id: 'aurora', name: 'Electric Aurora', bg: 'from-teal-400 via-emerald-500 to-indigo-800', group: 'Cyber', accent: '#14b8a6' },
  { id: 'bloom', name: 'Berry Bloom', bg: 'from-fuchsia-600 via-pink-600 to-rose-700', group: 'Cyber', accent: '#d946ef' },
  { id: 'lime', name: 'Neon Lime', bg: 'from-lime-500 via-emerald-600 to-zinc-950', group: 'Cyber', accent: '#84cc16' },
  { id: 'hyper', name: 'Hyper Cyan', bg: 'from-cyan-400 via-sky-600 to-blue-900', group: 'Cyber', accent: '#06b6d4' },
  { id: 'plasma', name: 'Plasma Violet', bg: 'from-violet-600 via-fuchsia-600 to-indigo-900', group: 'Cyber', accent: '#8b5cf6' },

  // Cool & Nature
  { id: 'ocean', name: 'Ocean Blue', bg: 'from-blue-600 via-cyan-600 to-sky-950', group: 'Nature', accent: '#0284c7' },
  { id: 'emerald', name: 'Emerald Tech', bg: 'from-emerald-700 via-teal-800 to-zinc-950', group: 'Nature', accent: '#10b981' },
  { id: 'glacier', name: 'Arctic Glacier', bg: 'from-cyan-500 via-blue-600 to-slate-900', group: 'Nature', accent: '#38bdf8' },
  { id: 'moss', name: 'Forest Moss', bg: 'from-green-700 via-emerald-800 to-teal-950', group: 'Nature', accent: '#15803d' },
  { id: 'sapphire', name: 'Deep Sapphire', bg: 'from-blue-800 via-indigo-900 to-slate-950', group: 'Nature', accent: '#1d4ed8' },
  { id: 'mint', name: 'Mint Horizon', bg: 'from-teal-600 via-cyan-700 to-zinc-900', group: 'Nature', accent: '#0d9488' },

  // Dark & Velvet
  { id: 'midnight', name: 'Midnight Dark', bg: 'from-zinc-900 via-zinc-950 to-black', group: 'Dark', accent: '#71717a' },
  { id: 'royal', name: 'Royal Violet', bg: 'from-violet-800 via-purple-900 to-black', group: 'Dark', accent: '#7c3aed' },
  { id: 'galaxy', name: 'Cosmic Galaxy', bg: 'from-purple-900 via-indigo-950 to-black', group: 'Dark', accent: '#4f46e5' },
  { id: 'obsidian', name: 'Stealth Obsidian', bg: 'from-neutral-900 via-stone-900 to-black', group: 'Dark', accent: '#52525b' },
  { id: 'velvet', name: 'Velvet Rose', bg: 'from-pink-800 via-rose-900 to-stone-950', group: 'Dark', accent: '#9f1239' },
  { id: 'bronze', name: 'Mocha Bronze', bg: 'from-amber-900 via-stone-800 to-zinc-950', group: 'Dark', accent: '#78350f' },
];

export const EventSettingsPage: React.FC<EventSettingsPageProps> = ({ eventId, onSelectEventId }) => {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isEventSwitcherOpen, setIsEventSwitcherOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newAttendeeType, setNewAttendeeType] = useState<AttendeeType>('STUDENTS');
  const [newCustomSingular, setNewCustomSingular] = useState('Member');
  const [newCustomPlural, setNewCustomPlural] = useState('Members');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Attendee Audience & Terminology Configuration
  const [attendeeType, setAttendeeType] = useState<AttendeeType>('STUDENTS');
  const [attendeeSingular, setAttendeeSingular] = useState('Student');
  const [attendeePlural, setAttendeePlural] = useState('Students');

  // Delete Event states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  // Event Organizer States
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminContactEmail, setAdminContactEmail] = useState('');
  // Draft fields for the inline organizer edit form
  const [draftOrgName, setDraftOrgName] = useState('');
  const [draftOrgPhone, setDraftOrgPhone] = useState('');
  const [draftOrgEmail, setDraftOrgEmail] = useState('');
  const [isOrgEditOpen, setIsOrgEditOpen] = useState(false);
  const [showOrgDeleteConfirm, setShowOrgDeleteConfirm] = useState(false);
  const [orgRequiredError, setOrgRequiredError] = useState(false);

  // Scan Key & QR Configuration States
  const [primaryScanField, setPrimaryScanField] = useState('usn');
  const [secondaryScanField, setSecondaryScanField] = useState('');
  const [qrMode, setQrMode] = useState<QrMode>('SECURE_TOKEN');
  const [barcodeField, setBarcodeField] = useState('usn');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Custom Banner & Background Customization
  const [customBannerText, setCustomBannerText] = useState('');
  const [customBannerSubtext, setCustomBannerSubtext] = useState('');
  const [selectedGradient, setSelectedGradient] = useState('sunset');
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const [colorCategoryFilter, setColorCategoryFilter] = useState<'All' | 'Warm' | 'Cyber' | 'Nature' | 'Dark'>('All');
  const [colorSearchQuery, setColorSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target as Node)) {
        setIsColorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    loadAllEvents();
  }, []);

  const loadAllEvents = async () => {
    try {
      const res = await eventsApi.list();
      setEvents(res.events || []);
    } catch (err) {
      console.error('Failed to load events list:', err);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const [res] = await Promise.all([
        eventsApi.get(eventId),
        new Promise((r) => setTimeout(r, 250)),
      ]);
      setEvent(res.event);
      setTitle(res.event.title);
      setDescription(res.event.description || '');
      setVenue(res.event.venue || '');
      setEventDate(res.event.event_date ? new Date(res.event.event_date).toISOString().slice(0, 16) : '');
      setBannerUrl(res.event.banner_url || '');
      setCustomBannerText(res.event.title || '');
      setCustomBannerSubtext(res.event.description || '');
      setAdminName(res.event.admin_name || '');
      setAdminPhone(res.event.admin_phone || '');
      setAdminContactEmail(res.event.admin_email || '');
      setAttendeeType(res.event.attendee_type || 'STUDENTS');
      setAttendeeSingular(res.event.attendee_label_singular || 'Student');
      setAttendeePlural(res.event.attendee_label_plural || 'Students');
      setPrimaryScanField(res.event.primary_scan_field || 'usn');
      setSecondaryScanField(res.event.secondary_scan_field || '');
      setQrMode(res.event.qr_mode || 'SECURE_TOKEN');
      setBarcodeField(res.event.barcode_field || 'usn');
    } catch (err) {
      console.error('Failed to load event details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    setIsCreatingEvent(true);
    try {
      const preset = getPresetByType(newAttendeeType);
      const singular = newAttendeeType === 'CUSTOM' ? (newCustomSingular.trim() || 'Member') : preset.singular;
      const plural = newAttendeeType === 'CUSTOM' ? (newCustomPlural.trim() || 'Members') : preset.plural;
      const primaryScanField = preset.defaultPrimaryKey;

      const res = await eventsApi.create({
        title: newEventTitle.trim(),
        venue: newEventVenue.trim() || 'Main Auditorium',
        event_date: newEventDate ? new Date(newEventDate).toISOString() : new Date().toISOString(),
        attendee_type: newAttendeeType,
        attendee_label_singular: singular,
        attendee_label_plural: plural,
        primary_scan_field: primaryScanField,
        barcode_field: primaryScanField,
      });
      if (res.event) {
        playFeedbackSound('success');
        setEvents((prev) => [res.event, ...prev]);
        setIsCreateEventModalOpen(false);
        setNewEventTitle('');
        setNewEventVenue('');
        setNewEventDate('');
        setNewAttendeeType('STUDENTS');
        setNewCustomSingular('Member');
        setNewCustomPlural('Members');
        window.dispatchEvent(new CustomEvent('admitto:events-changed'));
        if (onSelectEventId) {
          onSelectEventId(res.event.id);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleDeleteCurrentEvent = async () => {
    if (!eventId) return;
    setIsDeletingEvent(true);
    try {
      await eventsApi.delete(eventId, true);
      playFeedbackSound('click');
      window.dispatchEvent(new CustomEvent('admitto:events-changed'));

      // Refresh event list
      const res = await eventsApi.list();
      const remaining = res.events || [];
      setEvents(remaining);
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');

      if (remaining.length > 0) {
        if (onSelectEventId) {
          onSelectEventId(remaining[0].id);
        }
      } else {
        setEvent(null);
        if (onSelectEventId) {
          onSelectEventId('');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBannerUrl(reader.result as string);
      playFeedbackSound('click');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!tempUrl.trim()) return;
    setBannerUrl(tempUrl.trim());
    setTempUrl('');
    setShowUrlInput(false);
    playFeedbackSound('click');
  };

  const hasOrganizer = adminName.trim() !== '';

  const handleOpenOrgEdit = () => {
    setDraftOrgName(adminName);
    setDraftOrgPhone(adminPhone);
    setDraftOrgEmail(adminContactEmail);
    setIsOrgEditOpen(true);
    setOrgRequiredError(false);
  };

  const handleSaveOrganizer = () => {
    if (!draftOrgName.trim()) {
      setOrgRequiredError(true);
      return;
    }
    setAdminName(draftOrgName.trim());
    setAdminPhone(draftOrgPhone.trim());
    setAdminContactEmail(draftOrgEmail.trim());
    setIsOrgEditOpen(false);
    setOrgRequiredError(false);
    playFeedbackSound('success');
  };

  const handleDeleteOrganizer = () => {
    setAdminName('');
    setAdminPhone('');
    setAdminContactEmail('');
    setShowOrgDeleteConfirm(false);
    setIsOrgEditOpen(false);
    playFeedbackSound('click');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Organizer is required
    if (!adminName.trim()) {
      setOrgRequiredError(true);
      setIsOrgEditOpen(true);
      // Scroll to organizer section
      document.getElementById('organizer-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    setSuccessMsg(null);

    try {
      const res = await eventsApi.update(eventId, {
        title,
        description,
        venue,
        event_date: eventDate ? new Date(eventDate).toISOString() : undefined,
        banner_url: bannerUrl,
        admin_name: adminName.trim() || undefined,
        admin_phone: adminPhone.trim() || undefined,
        admin_email: adminContactEmail.trim() || undefined,
        attendee_type: attendeeType,
        attendee_label_singular: attendeeSingular.trim() || 'Attendee',
        attendee_label_plural: attendeePlural.trim() || 'Attendees',
      });

      // Update scan config
      const scanRes = await eventsApi.updateScanConfig(eventId, {
        primary_scan_field: primaryScanField.trim().toLowerCase(),
        secondary_scan_field: secondaryScanField.trim() ? secondaryScanField.trim().toLowerCase() : null,
        qr_mode: qrMode,
        barcode_field: barcodeField,
        is_uniqueness_verified: true,
      });

      const updatedEv = scanRes.event || res.event;
      if (updatedEv) {
        setEvent(updatedEv);
        setEvents((prev) => prev.map((ev) => (ev.id === updatedEv.id ? updatedEv : ev)));
        playFeedbackSound('success');
        setSuccessMsg('Event details & scan configuration saved successfully.');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save event details');
    } finally {
      setSaving(false);
    }
  };

  const currentGradientObj = GRADIENT_PRESETS.find((g) => g.id === selectedGradient) || GRADIENT_PRESETS[0];

  const filteredGradients = GRADIENT_PRESETS.filter((g) => {
    const matchesCategory = colorCategoryFilter === 'All' || g.group === colorCategoryFilter;
    const matchesSearch = g.name.toLowerCase().includes(colorSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading || !event) {
    return <TabSkeletonView tabId="event" />;
  }

  return (
    <div id="event-settings-page" className="max-w-4xl space-y-6 pb-12">
      {/* Top Header Row with Event Switcher Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-orange-400 uppercase tracking-widest mb-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>Event Management & Branding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            Event Configuration
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure visual pass themes, metadata, scheduling, and gate scanner parameters.
          </p>
        </div>

        {/* Existing Events Dropdown & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* Events Switcher Dropdown */}
          <div className="relative">
            <button
              id="event-settings-switcher-btn"
              type="button"
              onClick={() => {
                playFeedbackSound('click');
                setIsEventSwitcherOpen(!isEventSwitcherOpen);
              }}
              className="px-3.5 py-2 rounded-2xl bg-[#242b4d]/70 hover:bg-[#242b4d] active:scale-95 border border-white/20 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer shadow-lg backdrop-blur-xl ring-1 ring-white/10"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <span className="truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[220px]">
                {event?.title || 'Select Event'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isEventSwitcherOpen ? 'rotate-180' : ''}`} />
            </button>

            {isEventSwitcherOpen && typeof document !== 'undefined' && createPortal(
              <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <div
                  className="fixed inset-0"
                  onClick={() => setIsEventSwitcherOpen(false)}
                />
                <div className="relative z-10 w-full max-w-sm bg-[#181d36]/98 border border-white/20 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 backdrop-blur-2xl animate-scale-in ring-1 ring-white/15">
                  <div className="px-1 py-1 text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-white font-['Space_Grotesk'] text-sm font-bold">Existing Events ({events.length})</span>
                    <button
                      type="button"
                      onClick={() => setIsEventSwitcherOpen(false)}
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
                          setIsEventSwitcherOpen(false);
                          if (onSelectEventId) {
                            onSelectEventId(ev.id);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-2xl text-xs flex flex-col transition-all cursor-pointer ${
                          ev.id === eventId
                            ? 'bg-indigo-600/35 text-indigo-100 font-bold border border-indigo-500/50 shadow-md ring-1 ring-indigo-400/30'
                            : 'text-slate-300 hover:bg-white/[0.08] border border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-white font-bold text-sm">{ev.title}</span>
                          {ev.id === eventId && (
                            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 truncate mt-0.5">{ev.venue || 'Venue TBD'}</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        playFeedbackSound('click');
                        setIsEventSwitcherOpen(false);
                        setIsCreateEventModalOpen(true);
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>Create / Add New Event</span>
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>

          <button
            type="button"
            onClick={() => {
              playFeedbackSound('click');
              setIsDeleteModalOpen(true);
              setDeleteConfirmText('');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 border border-rose-500/25 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
            title="Delete this event"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Event</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2.5 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Card 1: Visual Pass & Banner Studio */}
        <div className="bg-[#242b4d]/45 border border-white/20 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl relative z-30 overflow-visible backdrop-blur-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-white/15">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-['Space_Grotesk']">
                  Digital Pass & Banner Studio
                </h3>
                <p className="text-[11px] text-zinc-300">
                  Custom graphic background or uploaded high-resolution poster
                </p>
              </div>
            </div>

            {/* Quick Mode Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-white bg-white/[0.1] hover:bg-white/[0.18] active:scale-95 px-3 py-2 rounded-xl border border-white/20 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm backdrop-blur-md"
              >
                <UploadCloud className="w-3.5 h-3.5 text-orange-400" />
                <span>Upload Image</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-xs font-semibold text-zinc-200 hover:text-white px-2.5 py-2 rounded-xl bg-white/[0.08] border border-white/15 hover:border-white/25 flex items-center gap-1 cursor-pointer transition-all backdrop-blur-md"
              >
                <Link className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{showUrlInput ? 'Hide URL' : 'Image URL'}</span>
              </button>
              {bannerUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setBannerUrl('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs font-semibold text-rose-300 hover:text-rose-200 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center gap-1.5 cursor-pointer transition-all backdrop-blur-md"
                  title="Remove uploaded image and return to custom gradient"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Use Gradient</span>
                </button>
              )}
            </div>
          </div>

          {/* Paste URL Input Row */}
          {showUrlInput && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150 bg-white/[0.08] p-2 rounded-2xl border border-white/15 backdrop-blur-md">
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 shadow-sm"
              >
                Apply
              </button>
            </div>
          )}

          {/* Live Dynamic Banner Preview Frame */}
          <div className="relative rounded-3xl overflow-hidden border border-white/20 shadow-2xl group w-full">
            {bannerUrl ? (
              <div className="relative w-full min-h-[200px] sm:min-h-[220px] bg-zinc-950 overflow-hidden flex flex-col justify-between p-4 sm:p-6">
                <img
                  src={bannerUrl}
                  alt={title || 'Event Banner'}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 pointer-events-none" />

                {/* Top Badge Row */}
                <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-orange-400 text-[10px] font-mono font-bold tracking-wider uppercase border border-white/15 inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles className="w-3 h-3" /> OFFICIAL POSTER
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-xl bg-black/70 hover:bg-black/90 active:scale-95 backdrop-blur-md border border-white/25 text-white text-[10px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg whitespace-nowrap"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-orange-400" />
                    <span>Change Image</span>
                  </button>
                </div>

                {/* Bottom Typography & Venue Chips */}
                <div className="relative z-10 space-y-1.5 mt-auto pt-4">
                  <div className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight font-['Space_Grotesk'] break-words">
                    {customBannerText || title || 'Event Title'}
                  </div>
                  <div className="text-[11px] sm:text-xs text-zinc-300 line-clamp-2 font-medium">
                    {customBannerSubtext || description || 'Event schedule and details'}
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[10px] sm:text-xs text-white font-mono flex-wrap">
                    <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap">
                      <MapPin className="w-3 h-3 text-orange-400" />
                      <span className="truncate max-w-[180px] sm:max-w-none">{venue || 'Main Innovation Arena, Hall 4B'}</span>
                    </span>
                    {eventDate && (
                      <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-orange-400" />
                        <span>
                          {new Date(eventDate).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Custom Graphic Canvas with High-Contrast Typography */
              <div
                className={`relative w-full min-h-[220px] sm:min-h-[240px] bg-gradient-to-br ${currentGradientObj.bg} p-4 sm:p-6 flex flex-col justify-between overflow-hidden shadow-inner`}
              >
                {/* Background Ambient Glow & Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_65%)] pointer-events-none" />
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)',
                    backgroundSize: '24px 24px',
                  }}
                />

                {/* Top Badge Row */}
                <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-mono font-bold tracking-wider uppercase border border-white/15 flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>OFFICIAL PASS</span>
                    </span>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-mono font-medium border border-white/10">
                      {eventId.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-xl bg-black/50 hover:bg-black/70 active:scale-95 backdrop-blur-md border border-white/20 text-white text-[10px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md whitespace-nowrap"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-amber-300" />
                    <span>Upload Image</span>
                  </button>
                </div>

                {/* Bottom Custom Typography & Event Metadata */}
                <div className="relative z-10 space-y-1.5 mt-auto pt-4">
                  <h2 className="text-base sm:text-2xl md:text-3xl font-black text-white tracking-tight font-['Space_Grotesk'] drop-shadow-lg break-words">
                    {customBannerText || title || 'TechSprint 2026 National Summit'}
                  </h2>
                  <p className="text-[11px] sm:text-sm text-white/95 line-clamp-2 font-medium drop-shadow-md max-w-2xl">
                    {customBannerSubtext || description || 'Annual flagship engineering hackathon, workshops, and keynote.'}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[10px] sm:text-xs text-white font-mono flex-wrap">
                    <span className="flex items-center gap-1 bg-black/35 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap">
                      <MapPin className="w-3 h-3 text-amber-300" />
                      <span className="truncate max-w-[180px] sm:max-w-none">{venue || 'Main Innovation Arena, Hall 4B'}</span>
                    </span>
                    {eventDate && (
                      <span className="flex items-center gap-1 bg-black/35 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-amber-300" />
                        <span>
                          {new Date(eventDate).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
          </div>

          {/* Gradient Palette Dropdown & Text Customizer Studio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 relative z-40">
            
            {/* Column 1: Categorized 24-Color Dropdown Menu */}
            <div className="space-y-1.5 relative md:col-span-1" ref={colorDropdownRef}>
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span>Background Theme:</span>
                <span className="text-orange-400 font-mono text-[10px] font-semibold">{currentGradientObj.name}</span>
              </label>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                className="w-full h-11 bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-3 text-xs text-white flex items-center justify-between shadow-sm cursor-pointer transition-all backdrop-blur-md"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div
                    className={`w-5 h-5 rounded-lg bg-gradient-to-br ${currentGradientObj.bg} shadow-md border border-white/20 shrink-0`}
                  />
                  <span className="font-bold text-white text-xs truncate">{currentGradientObj.name}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                    isColorDropdownOpen ? 'rotate-180 text-orange-400' : ''
                  }`}
                />
              </button>

              {/* Floating Menu with Filter Chips and Search */}
              {isColorDropdownOpen && (
                <div className="absolute left-0 right-0 sm:w-80 top-full mt-2 z-[100] bg-[#1a203d]/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-3 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-white/15">
                    {(['All', 'Warm', 'Cyber', 'Nature', 'Dark'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setColorCategoryFilter(cat)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shrink-0 ${
                          colorCategoryFilter === cat
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-white/[0.08] text-zinc-300 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Search Filter Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search through any credentials"
                      value={colorSearchQuery}
                      onChange={(e) => setColorSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.08] border border-white/15 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-400"
                    />
                  </div>

                  {/* Gradient Items List */}
                  <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                    {filteredGradients.length === 0 ? (
                      <div className="text-center py-4 text-zinc-400 text-xs">No matching colors</div>
                    ) : (
                      filteredGradients.map((grad) => {
                        const isSelected = selectedGradient === grad.id;
                        return (
                          <button
                            key={grad.id}
                            type="button"
                            onClick={() => {
                              setSelectedGradient(grad.id);
                              setIsColorDropdownOpen(false);
                              playFeedbackSound('click');
                            }}
                            className={`w-full p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500/20 shadow-sm text-white'
                                : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09] text-zinc-200'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-lg bg-gradient-to-br ${grad.bg} shrink-0 shadow-sm border border-white/15`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate">{grad.name}</div>
                              <div className="text-[9px] text-zinc-400 font-mono">{grad.group}</div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-orange-400 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Custom Banner Headline */}
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                Banner Headline:
              </label>
              <input
                type="text"
                placeholder={title || 'e.g. TechSprint 2026'}
                value={customBannerText}
                onChange={(e) => setCustomBannerText(e.target.value)}
                className="w-full h-11 bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-3.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-400 font-medium backdrop-blur-md transition-colors"
              />
            </div>

            {/* Column 3: Custom Tagline / Subtext */}
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                Banner Tagline / Subtitle:
              </label>
              <input
                type="text"
                placeholder={description || 'e.g. Flagship engineering hackathon'}
                value={customBannerSubtext}
                onChange={(e) => setCustomBannerSubtext(e.target.value)}
                className="w-full h-11 bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-3.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-400 font-medium backdrop-blur-md transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Event Parameters & Schedule Information */}
        <div className="bg-[#242b4d]/45 border border-white/20 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative z-10 backdrop-blur-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-white/15">
            <div className="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight font-['Space_Grotesk']">
                Event Logistics & Schedule
              </h3>
              <p className="text-[11px] text-zinc-300">
                Primary venue location, access gate timing, and operational description
              </p>
            </div>
          </div>

          {/* Event Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-200">Official Event Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. TechSprint 2026 National Hackathon & Summit"
              className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-400 font-medium shadow-inner backdrop-blur-md transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-200">Description / Schedule Notes</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Annual flagship engineering hackathon, workshops, and recruitment keynote..."
              className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-orange-400 font-medium shadow-inner resize-none backdrop-blur-md transition-colors"
            />
          </div>

          {/* Venue & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                <span>Venue / Location</span>
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Main Innovation Arena, Hall 4B"
                className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-400 font-medium shadow-inner backdrop-blur-md transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>Event Date & Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-400 font-medium shadow-inner backdrop-blur-md transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Card 2.5: Event Organizer Section */}
        <div
          id="organizer-section"
          className={`rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative z-10 backdrop-blur-2xl border transition-all ${
            orgRequiredError && !hasOrganizer
              ? 'bg-rose-950/30 border-rose-500/50 shadow-rose-500/10'
              : 'bg-[#242b4d]/45 border-white/20'
          }`}
        >
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/15">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight font-['Space_Grotesk']">
                    Event Organizer
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-bold">
                    Required
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Shown on scanner home screen — gate staff contacts this person for any verification
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-mono font-bold shrink-0 self-start sm:self-auto">
              Visible to Scanners
            </span>
          </div>

          {/* Required error banner */}
          {orgRequiredError && !hasOrganizer && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Organizer name is required before saving. Please add at least a name.</span>
            </div>
          )}

          {/* ── DISPLAY MODE: Organizer card exists ── */}
          {hasOrganizer && !isOrgEditOpen && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
              {/* Organizer Info Card */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/30 shrink-0">
                  {adminName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="text-sm font-bold text-white">{adminName}</div>
                  {adminPhone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{adminPhone}</span>
                    </div>
                  )}
                  {adminContactEmail && (
                    <div className="flex items-center gap-1.5 text-[11px] text-orange-300 font-mono">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span>{adminContactEmail}</span>
                    </div>
                  )}
                  {!adminPhone && !adminContactEmail && (
                    <div className="text-[11px] text-zinc-500 italic">No phone or email added</div>
                  )}
                </div>
                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenOrgEdit}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  {!showOrgDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowOrgDeleteConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/25 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                      <span className="text-[11px] text-rose-300 font-semibold">Sure?</span>
                      <button
                        type="button"
                        onClick={handleDeleteOrganizer}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowOrgDeleteConfirm(false)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── EMPTY STATE: No organizer yet ── */}
          {!hasOrganizer && !isOrgEditOpen && (
            <div className="animate-in fade-in duration-200">
              <button
                type="button"
                onClick={handleOpenOrgEdit}
                className={`w-full py-6 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all cursor-pointer group ${
                  orgRequiredError
                    ? 'border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10'
                    : 'border-white/15 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md transition-colors ${
                  orgRequiredError
                    ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
                    : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-500/30'
                }`}>
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <div className={`text-sm font-bold ${ orgRequiredError ? 'text-rose-300' : 'text-white'}`}>
                    Add Event Organizer
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Name, phone & email are visible to gate scanners for verification
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* ── EDIT / ADD FORM ── */}
          {isOrgEditOpen && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Organizer Name</span>
                    <span className="text-rose-400 text-[10px] font-mono">*required</span>
                  </label>
                  <input
                    type="text"
                    value={draftOrgName}
                    onChange={(e) => { setDraftOrgName(e.target.value); if (e.target.value.trim()) setOrgRequiredError(false); }}
                    placeholder="e.g. Dr. Rahul Sharma"
                    autoFocus
                    className={`w-full bg-white/[0.08] border rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-medium shadow-inner backdrop-blur-md transition-colors ${
                      orgRequiredError && !draftOrgName.trim()
                        ? 'border-rose-500/60 focus:border-rose-400'
                        : 'border-white/15 hover:border-white/25 focus:border-indigo-400'
                    }`}
                  />
                  {orgRequiredError && !draftOrgName.trim() && (
                    <p className="text-[10px] text-rose-400 font-semibold">Name is required</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp / Phone</span>
                  </label>
                  <input
                    type="tel"
                    value={draftOrgPhone}
                    onChange={(e) => setDraftOrgPhone(e.target.value)}
                    placeholder="e.g. +919876543210"
                    className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono shadow-inner backdrop-blur-md transition-colors"
                  />
                  <p className="text-[10px] text-zinc-400">Include country code for WhatsApp</p>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-orange-400" />
                    <span>Contact Email</span>
                  </label>
                  <input
                    type="email"
                    value={draftOrgEmail}
                    onChange={(e) => setDraftOrgEmail(e.target.value)}
                    placeholder="e.g. organizer@college.edu"
                    className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-400 font-medium shadow-inner backdrop-blur-md transition-colors"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Scanner home page will show this organizer's contact info</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setIsOrgEditOpen(false); setOrgRequiredError(false); }}
                    className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-zinc-300 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOrganizer}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 border border-indigo-400/30 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{hasOrganizer ? 'Update Organizer' : 'Save Organizer'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Attendee Audience & Terminology Configuration */}
        <div className="p-5 sm:p-7 rounded-3xl bg-[#1e233d]/70 border border-white/15 space-y-6 backdrop-blur-2xl shadow-xl">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Target Audience & Attendee Terminology
              </h3>
              <p className="text-xs text-zinc-400">
                Choose what type of attendees attend this event. All roster tables, pass generation, and check-in pages dynamically adapt.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {ATTENDEE_TYPE_PRESETS.map((preset) => {
                const isSelected = attendeeType === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setAttendeeType(preset.id);
                      if (preset.id !== 'CUSTOM') {
                        setAttendeeSingular(preset.singular);
                        setAttendeePlural(preset.plural);
                        setPrimaryScanField(preset.defaultPrimaryKey);
                        setBarcodeField(preset.defaultPrimaryKey);
                      }
                      playFeedbackSound('click');
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-400/50'
                        : 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-xl">{preset.emoji}</span>
                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-sm" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{preset.singular}s</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{preset.badge}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Singular & Plural Noun Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200">
                  Singular Term (e.g. Student, Employee, Guest)
                </label>
                <input
                  type="text"
                  value={attendeeSingular}
                  onChange={(e) => setAttendeeSingular(e.target.value)}
                  placeholder="e.g. Student, Employee, Guest"
                  className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-medium transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200">
                  Plural Term (e.g. Students, Employees, Guests)
                </label>
                <input
                  type="text"
                  value={attendeePlural}
                  onChange={(e) => setAttendeePlural(e.target.value)}
                  placeholder="e.g. Students, Employees, Guests"
                  className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-medium transition-colors"
                />
              </div>
            </div>

            {/* Live Terminology Preview Pill */}
            <div className="p-3.5 bg-white/[0.04] rounded-2xl border border-white/10 text-xs text-slate-300 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                Platform preview: <strong>Add {attendeeSingular || 'Attendee'}</strong> • <strong>{attendeePlural || 'Attendees'} Roster</strong> • <strong>Total {attendeePlural || 'Attendees'}</strong> • Default Key: <span className="font-mono text-indigo-300 uppercase font-bold">{primaryScanField}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Attendee Identification & QR Configuration Card */}
        <div className="p-5 sm:p-7 rounded-3xl bg-[#1e233d]/70 border border-white/15 space-y-6 backdrop-blur-2xl shadow-xl">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Attendee Identification & Scanner Verification Rules
              </h3>
              <p className="text-xs text-zinc-400">
                Configure primary scanning keys, secondary verification rules, QR payload format, and barcode mapping.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Primary Scanning Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-orange-400" />
                  <span>Primary Scanning Key</span>
                </span>
                <span className="text-[10px] font-mono text-orange-400 uppercase bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  Active Key
                </span>
              </label>
              <input
                type="text"
                value={primaryScanField}
                onChange={(e) => setPrimaryScanField(e.target.value)}
                placeholder="e.g. usn, employee_id, ticket_no, roll_no"
                className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-xs text-white uppercase font-mono focus:outline-none focus:border-orange-400 font-medium shadow-inner backdrop-blur-md transition-colors"
              />
              <p className="text-[11px] text-zinc-400">
                The primary attribute scanned by gate operators to look up attendees.
              </p>
            </div>

            {/* Secondary Verification Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-orange-400" />
                  <span>Secondary Verification Key</span>
                </span>
                <span className="text-[10px] text-zinc-400">
                  Optional Disambiguation
                </span>
              </label>
              <input
                type="text"
                value={secondaryScanField}
                onChange={(e) => setSecondaryScanField(e.target.value)}
                placeholder="e.g. email, phone_number, dob (leave blank if none)"
                className="w-full bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-orange-400 font-medium shadow-inner backdrop-blur-md transition-colors"
              />
              <p className="text-[11px] text-zinc-400">
                Prompted automatically if multiple attendees share the same primary value.
              </p>
            </div>
          </div>

          {/* QR Code & Barcode Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-white/10">
            {/* QR Mode */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-orange-400" />
                <span>QR Code Data Payload</span>
              </label>
              <div className="space-y-2">
                <div
                  onClick={() => {
                    setQrMode('SECURE_TOKEN');
                    playFeedbackSound('click');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    qrMode === 'SECURE_TOKEN'
                      ? 'bg-orange-500/20 border-orange-500 text-white'
                      : 'bg-white/[0.05] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Secure Attendee Token (Recommended)</span>
                    </span>
                    {qrMode === 'SECURE_TOKEN' && <Check className="w-3.5 h-3.5 text-orange-400" />}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Protects personal data with non-guessable random tokens.
                  </div>
                </div>

                <div
                  onClick={() => {
                    setIsPrivacyModalOpen(true);
                    playFeedbackSound('click');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    qrMode === 'FULL_DATA'
                      ? 'bg-amber-500/20 border-amber-500 text-white'
                      : 'bg-white/[0.05] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Full Attendee Data</span>
                    </span>
                    {qrMode === 'FULL_DATA' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Embeds attendee profile JSON directly into the QR code.
                  </div>
                </div>
              </div>
            </div>

            {/* Barcode Target */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-orange-400" />
                <span>Barcode Data Target</span>
              </label>
              <select
                value={barcodeField}
                onChange={(e) => {
                  setBarcodeField(e.target.value);
                  playFeedbackSound('click');
                }}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-[#181d33] border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-400 font-medium shadow-inner transition-colors cursor-pointer"
              >
                <option value="primary_key" className="bg-[#121626] text-slate-100 py-2.5">
                  {primaryScanField.trim().toLowerCase() === 'primary key' || primaryScanField.trim().toLowerCase() === 'primary_key'
                    ? 'Primary Scanning Key'
                    : `Primary Scanning Key (${primaryScanField})`}
                </option>
                {secondaryScanField && (
                  <option value="secondary_key" className="bg-[#121626] text-slate-100 py-2.5">
                    {secondaryScanField.trim().toLowerCase() === 'secondary key' || secondaryScanField.trim().toLowerCase() === 'secondary_key'
                      ? 'Secondary Verification Key'
                      : `Secondary Verification Key (${secondaryScanField})`}
                  </option>
                )}
                <option value="token" className="bg-[#121626] text-slate-100 py-2.5">
                  Secure Unique Barcode Token
                </option>
              </select>
              {barcodeField !== 'token' && (
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/25 text-[11px] text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold">Low-Entropy Target Advisory:</span> When barcodes encode guessable identifiers (such as student USNs or sequential IDs), attendees could theoretically forge a barcode pass. For tamper-resistant verification, select <strong className="text-white">Secure Unique Barcode Token</strong> or use <strong className="text-white">Secure Token QR codes</strong>.
                  </div>
                </div>
              )}
              <div className="p-3 bg-white/[0.05] rounded-xl border border-white/10 text-[11px] text-zinc-400">
                Scanners will parse physical and optical 1D barcodes as this target field.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Card with Instant Save */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#242b4d]/45 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-2xl shadow-xl">
          <div className="flex items-center gap-2 text-xs text-zinc-300 text-center sm:text-left">
            <Info className="w-4 h-4 text-orange-400 shrink-0" />
            <span>Updated settings will automatically sync across all scanner terminals and attendee passes.</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-xs font-bold text-white shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all select-none shrink-0"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Delete Event */}
      <div className="bg-rose-950/30 border border-rose-500/35 backdrop-blur-2xl rounded-3xl p-5 sm:p-7 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-rose-300 font-['Space_Grotesk']">
                Danger Zone: Delete Event
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-xl">
                Permanently delete this event (<span className="text-white font-semibold">{event.title}</span>), all attendee rosters, scanner tokens, and check-in history. All associated scanner referral codes will be immediately invalidated.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playFeedbackSound('click');
              setIsDeleteModalOpen(true);
              setDeleteConfirmText('');
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-rose-600/30 cursor-pointer shrink-0 self-start sm:self-center"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Event</span>
          </button>
        </div>
      </div>

      {/* QR Privacy Warning Modal via React Portal */}
      {isPrivacyModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100001] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#151822] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                QR Privacy Warning
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                This option places attendee personal information (including name, email, department, and custom fields) directly inside the QR code data payload.
              </p>
              <p className="text-xs text-amber-300/90 leading-relaxed">
                Anyone who can photograph or decode the QR code will be able to read all embedded information. For sensitive events, the <strong>Secure Attendee Token</strong> mode is strongly recommended.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPrivacyModalOpen(false);
                  setQrMode('SECURE_TOKEN');
                  playFeedbackSound('click');
                }}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
              >
                Cancel & Keep Secure Token
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPrivacyModalOpen(false);
                  setQrMode('FULL_DATA');
                  playFeedbackSound('click');
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                I Understand — Continue
              </button>
            </div>
          </div>
        </div>,
        document.body
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
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Tech Symposium 2026, Summer Gala"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400"
                />
              </div>

              {/* Target Audience & Attendee Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Target Audience & Attendee Type</span>
                  <span className="text-[11px] font-normal text-orange-300">Sets terminology & default ID</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
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
                            ? 'bg-orange-500/25 border-orange-400 text-white shadow-md shadow-orange-500/20'
                            : 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-base">{preset.emoji}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-orange-400 shadow-sm" />}
                        </div>
                        <div className="text-xs font-bold leading-tight line-clamp-1">{preset.singular}s</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{preset.badge}</div>
                      </button>
                    );
                  })}
                </div>

                {newAttendeeType === 'CUSTOM' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-400">Singular Term</label>
                      <input
                        type="text"
                        placeholder="e.g. Member, Athlete"
                        value={newCustomSingular}
                        onChange={(e) => setNewCustomSingular(e.target.value)}
                        className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Plural Term</label>
                      <input
                        type="text"
                        placeholder="e.g. Members, Athletes"
                        value={newCustomPlural}
                        onChange={(e) => setNewCustomPlural(e.target.value)}
                        className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400 mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Event Date</label>
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    style={{ colorScheme: 'dark' }}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-400"
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
                  disabled={isCreatingEvent}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-orange-500/30 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingEvent ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Event Confirmation Modal via React Portal */}
      {isDeleteModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100002] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#151822] border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Delete Event
                </h3>
                <p className="text-[11px] text-zinc-400">Irreversible action</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{event.title}"</strong>? All attendee rosters, scan histories, scanner stations, and referral access codes for this event will be permanently removed.
            </p>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">
                To confirm deletion, type <strong className="text-rose-400 font-mono">DELETE</strong> below:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full bg-zinc-900/90 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingEvent}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeletingEvent}
                onClick={handleDeleteCurrentEvent}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-2 transition shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingEvent ? 'Deleting Event...' : 'Confirm Delete Event'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
