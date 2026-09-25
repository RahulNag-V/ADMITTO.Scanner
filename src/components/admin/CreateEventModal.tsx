import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  GraduationCap,
  Briefcase,
  Ticket,
  Globe,
  Trophy,
  Users,
  Building2,
  Check,
  Calendar,
  MapPin,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { AttendeeType, EventItem } from '../../types';
import { ATTENDEE_TYPE_PRESETS, getPresetByType } from '../../lib/attendeeTypes';
import { eventsApi } from '../../lib/api';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: EventItem) => void;
}

// Icon mapping for presets
const PRESET_ICONS: Record<AttendeeType, React.ElementType> = {
  STUDENTS: GraduationCap,
  EMPLOYEES: Briefcase,
  GUESTS: Ticket,
  DELEGATES: Globe,
  PARTICIPANTS: Trophy,
  ATTENDEES: Users,
  CUSTOM: Building2,
};

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  // Form State
  const [eventTitle, setEventTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [attendeeType, setAttendeeType] = useState<AttendeeType>('STUDENTS');
  const [customSingular, setCustomSingular] = useState('Member');
  const [customPlural, setCustomPlural] = useState('Members');

  // Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    venue?: string;
    date?: string;
    submit?: string;
  }>({});
  const [touched, setTouched] = useState<{
    title?: boolean;
    venue?: boolean;
    date?: boolean;
  }>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEventTitle('');
      setVenue('');
      setEventDate('');
      setAttendeeType('STUDENTS');
      setCustomSingular('Member');
      setCustomPlural('Members');
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle Escape Key to close modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    },
    [onClose, isSubmitting]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || typeof document === 'undefined') return null;

  // Validation
  const validateForm = () => {
    const newErrors: { title?: string; venue?: string; date?: string } = {};

    if (!eventTitle.trim()) {
      newErrors.title = 'Event title is required.';
    }

    if (!venue.trim()) {
      newErrors.venue = 'Enter the event venue.';
    }

    if (!eventDate.trim()) {
      newErrors.date = 'Select an event date and time.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: 'title' | 'venue' | 'date') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Revalidate field
    if (field === 'title' && !eventTitle.trim()) {
      setErrors((prev) => ({ ...prev, title: 'Event title is required.' }));
    }
    if (field === 'venue' && !venue.trim()) {
      setErrors((prev) => ({ ...prev, venue: 'Enter the event venue.' }));
    }
    if (field === 'date' && !eventDate.trim()) {
      setErrors((prev) => ({ ...prev, date: 'Select an event date and time.' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ title: true, venue: true, date: true });

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: undefined }));

    try {
      const preset = getPresetByType(attendeeType);
      const singular =
        attendeeType === 'CUSTOM' ? customSingular.trim() || 'Member' : preset.singular;
      const plural =
        attendeeType === 'CUSTOM' ? customPlural.trim() || 'Members' : preset.plural;
      const primaryScanField = preset.defaultPrimaryKey;

      const res = await eventsApi.create({
        title: eventTitle.trim(),
        venue: venue.trim(),
        event_date: new Date(eventDate).toISOString(),
        attendee_type: attendeeType,
        attendee_label_singular: singular,
        attendee_label_plural: plural,
        primary_scan_field: primaryScanField,
        barcode_field: primaryScanField,
      });

      if (res && res.event) {
        onEventCreated(res.event);
        window.dispatchEvent(new CustomEvent('admitto:events-changed'));
        onClose();
      }
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to create event. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live Preview Data Derivation
  const activePreset = getPresetByType(attendeeType);
  const activeSingular =
    attendeeType === 'CUSTOM' ? customSingular.trim() || 'Member' : activePreset.singular;
  const activePlural =
    attendeeType === 'CUSTOM' ? customPlural.trim() || 'Members' : activePreset.plural;
  const activePrimaryKey = activePreset.primaryKeyLabel;
  const activeGrouping = activePreset.groupingLabel;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-modal-title"
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-[#111528] border border-white/10 rounded-2xl sm:rounded-[20px] max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4 bg-[#111528]">
          <div className="space-y-1">
            <h2
              id="create-event-modal-title"
              className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Space_Grotesk']"
            >
              Create New Event
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Set the event details, audience, and access configuration.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer -mr-1 -mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="create-event-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar"
        >
          {/* Submission Error Banner */}
          {errors.submit && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errors.submit}</span>
            </div>
          )}

          {/* Event Title Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="event-title-input"
                className="text-xs sm:text-sm font-medium text-zinc-200"
              >
                Event Title <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-zinc-500">Required</span>
            </div>
            <input
              id="event-title-input"
              type="text"
              placeholder="e.g. Annual Tech Symposium 2026, Summer Gala, Hackathon 2026"
              value={eventTitle}
              onChange={(e) => {
                setEventTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              onBlur={() => handleBlur('title')}
              className={`w-full h-11 px-3.5 rounded-xl text-sm text-white placeholder-zinc-500 transition-all focus:outline-none ${
                errors.title && touched.title
                  ? 'bg-rose-500/[0.05] border border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-indigo-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20'
              }`}
            />
            {errors.title && touched.title && (
              <p className="text-xs text-rose-400 font-medium flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Target Audience & Attendee Type Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-zinc-200">
                  Target Audience & Attendee Type
                </h3>
                <p className="text-xs text-zinc-400">
                  Defines terminology and the default attendee ID.
                </p>
              </div>
            </div>

            {/* Responsive Cards Grid: Desktop 3 cols, Tablet 2 cols, Mobile 1 col */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ATTENDEE_TYPE_PRESETS.map((preset) => {
                const isSelected = attendeeType === preset.id;
                const IconComponent = PRESET_ICONS[preset.id] || Users;

                // User-friendly display names
                let displayName = `${preset.singular}s`;
                let displayBadge = preset.badge;
                if (preset.id === 'CUSTOM') {
                  displayName = 'Members';
                  displayBadge = 'Organizations / Clubs';
                }

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setAttendeeType(preset.id);
                    }}
                    className={`relative p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer min-h-[92px] group focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      isSelected
                        ? 'bg-indigo-600/[0.12] border-indigo-500/80 ring-1 ring-indigo-500/40'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Top Row: Icon + Check Indicator */}
                    <div className="flex items-center justify-between w-full mb-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-indigo-500/25 text-indigo-300'
                            : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-white/10'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Selection Check Indicator */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/50'
                            : 'border border-white/15 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </div>
                    </div>

                    {/* Middle: Title & Badge */}
                    <div className="space-y-0.5">
                      <div
                        className={`text-sm font-semibold tracking-tight transition-colors ${
                          isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                        }`}
                      >
                        {displayName}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-normal">
                        {displayBadge}
                      </div>
                    </div>

                    {/* Bottom: Subtle Primary Key Info */}
                    <div className="mt-2 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="truncate">Key: {preset.primaryKeyLabel.split('/')[0].trim()}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Audience Fields (when Members / Custom is selected) */}
            {attendeeType === 'CUSTOM' && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 animate-in fade-in duration-150">
                <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Custom Terminology Configuration</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">
                      Singular Term
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Member, Athlete, VIP"
                      value={customSingular}
                      onChange={(e) => setCustomSingular(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">
                      Plural Term
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Members, Athletes, VIPs"
                      value={customPlural}
                      onChange={(e) => setCustomPlural(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Live Configuration Preview */}
            <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <Sparkles className="w-3 h-3" />
                  Configuration Preview
                </span>
                <span className="text-[10px] lowercase text-zinc-500 font-mono">auto-configured</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
                <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 space-y-0.5">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Pass Type</div>
                  <div className="text-xs font-semibold text-zinc-200 truncate">
                    {activeSingular} Pass
                  </div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 space-y-0.5">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Default Identifier</div>
                  <div className="text-xs font-semibold text-zinc-200 truncate">
                    {activePrimaryKey}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 space-y-0.5">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Grouping Field</div>
                  <div className="text-xs font-semibold text-zinc-200 truncate">
                    {activeGrouping}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Venue & Event Date Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Venue */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="event-venue-input"
                  className="text-xs sm:text-sm font-medium text-zinc-200"
                >
                  Venue <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-zinc-500">Required</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  id="event-venue-input"
                  type="text"
                  placeholder="e.g. Main Auditorium, Silicon Hall"
                  value={venue}
                  onChange={(e) => {
                    setVenue(e.target.value);
                    if (errors.venue) setErrors((prev) => ({ ...prev, venue: undefined }));
                  }}
                  onBlur={() => handleBlur('venue')}
                  className={`w-full h-11 pl-10 pr-3.5 rounded-xl text-sm text-white placeholder-zinc-500 transition-all focus:outline-none ${
                    errors.venue && touched.venue
                      ? 'bg-rose-500/[0.05] border border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-indigo-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              </div>
              {errors.venue && touched.venue && (
                <p className="text-xs text-rose-400 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.venue}
                </p>
              )}
            </div>

            {/* Event Date */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="event-date-input"
                  className="text-xs sm:text-sm font-medium text-zinc-200"
                >
                  Event Date & Time <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-zinc-500">Required</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  id="event-date-input"
                  type="datetime-local"
                  style={{ colorScheme: 'dark' }}
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                  onBlur={() => handleBlur('date')}
                  className={`w-full h-11 pl-10 pr-3.5 rounded-xl text-sm text-white transition-all focus:outline-none ${
                    errors.date && touched.date
                      ? 'bg-rose-500/[0.05] border border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-indigo-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              </div>
              {errors.date && touched.date && (
                <p className="text-xs text-rose-400 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.date}
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Fixed Footer Actions */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 bg-[#0d101d] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-event-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Creating Event...</span>
              </>
            ) : (
              <span>Create Event</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
