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
  Pencil,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Tag,
  Barcode,
} from 'lucide-react';
import { AttendeeType, EventItem, BarcodeMatchingMode, BarcodeConfig } from '../../types';
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

const IDENTIFIER_FIELD_OPTIONS = [
  { value: 'usn', label: 'USN / Roll Number' },
  { value: 'roll_number', label: 'Roll Number' },
  { value: 'employee_id', label: 'Employee ID' },
  { value: 'registration_id', label: 'Registration ID' },
  { value: 'participant_id', label: 'Participant ID' },
  { value: 'email', label: 'Email' },
  { value: 'membership_id', label: 'Membership ID' },
  { value: 'custom_id', label: 'Custom ID' },
  { value: 'barcode', label: 'Barcode' },
];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  // Step state: 'FORM' for configuring details, 'PREVIEW' for reviewing before save
  const [step, setStep] = useState<'FORM' | 'PREVIEW'>('FORM');

  // Form State
  const [eventTitle, setEventTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [attendeeType, setAttendeeType] = useState<AttendeeType>('STUDENTS');
  const [customSingular, setCustomSingular] = useState('Member');
  const [customPlural, setCustomPlural] = useState('Members');

  // Barcode Identification State
  const [barcodeMode, setBarcodeMode] = useState<BarcodeMatchingMode>('prefix');
  const [barcodeValue, setBarcodeValue] = useState('1BH');
  const [barcodeIdentifierField, setBarcodeIdentifierField] = useState('usn');
  const [barcodeCaseSensitive, setBarcodeCaseSensitive] = useState(false);
  const [barcodeLengthValidation, setBarcodeLengthValidation] = useState(false);
  const [barcodeMinLength, setBarcodeMinLength] = useState('');
  const [barcodeMaxLength, setBarcodeMaxLength] = useState('');

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
      setStep('FORM');
      setEventTitle('');
      setVenue('');
      setEventDate('');
      setAttendeeType('STUDENTS');
      setCustomSingular('Member');
      setCustomPlural('Members');
      setBarcodeMode('prefix');
      setBarcodeValue('1BH');
      setBarcodeIdentifierField('usn');
      setBarcodeCaseSensitive(false);
      setBarcodeLengthValidation(false);
      setBarcodeMinLength('');
      setBarcodeMaxLength('');
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

  // Click "Finish": validate and transition to the Preview step
  const handleFinishToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ title: true, venue: true, date: true });

    if (!validateForm()) {
      return;
    }

    // Switch to preview step
    setStep('PREVIEW');
  };

  // Click "Edit": go back to form step with all values preserved
  const handleBackToEdit = () => {
    setStep('FORM');
  };

  // Click "Save": perform final submission to API
  const handleFinalSave = async () => {
    if (!validateForm()) {
      setStep('FORM');
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
        barcode_field: barcodeIdentifierField || primaryScanField,
        barcode_config: {
          mode: barcodeMode,
          value: barcodeValue.trim(),
          identifier_field: barcodeIdentifierField || primaryScanField,
          case_sensitive: barcodeCaseSensitive,
          min_length: barcodeLengthValidation && barcodeMinLength ? parseInt(barcodeMinLength, 10) : null,
          max_length: barcodeLengthValidation && barcodeMaxLength ? parseInt(barcodeMaxLength, 10) : null,
        },
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
  const ActiveIcon = PRESET_ICONS[attendeeType] || Users;

  // Formatter for readable date
  const formatReadableDate = (isoStr: string) => {
    if (!isoStr) return 'Date not specified';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-modal-title"
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-[#111528] border-t sm:border border-white/10 rounded-t-[24px] sm:rounded-[20px] max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden sm:my-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Swipe/Pull Indicator */}
        <div className="pt-2.5 pb-1 sm:hidden flex justify-center bg-[#111528]">
          <div className="w-12 h-1 rounded-full bg-white/20" />
        </div>

        {/* Modal Header */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex items-start justify-between gap-3 bg-[#111528]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2
                id="create-event-modal-title"
                className="text-lg sm:text-2xl font-bold text-white tracking-tight font-['Space_Grotesk']"
              >
                {step === 'FORM' ? 'Create New Event' : 'Review & Confirm Event'}
              </h2>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                {step === 'FORM' ? 'Step 1/2' : 'Step 2/2'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              {step === 'FORM'
                ? 'Set the event details, audience, and access configuration.'
                : 'Review your configured event parameters before saving.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer -mr-1 -mt-1 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: CONFIGURATION FORM */}
        {step === 'FORM' && (
          <form
            id="create-event-form"
            onSubmit={handleFinishToPreview}
            className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 space-y-5 custom-scrollbar"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
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
                      className={`relative p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer min-h-[92px] group focus:outline-none focus:ring-2 focus:ring-indigo-500/40 active:scale-[0.99] ${
                        isSelected
                          ? 'bg-indigo-600/[0.14] border-indigo-500/80 ring-1 ring-indigo-500/40'
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

            {/* Barcode Identification Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-orange-400" />
                    <span>Barcode Identification</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    How should attendee barcodes be identified?
                  </p>
                </div>
              </div>

              {/* Barcode Matching Type: Prefix / Suffix / Full Barcode */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Barcode Matching Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['prefix', 'suffix', 'full'] as BarcodeMatchingMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setBarcodeMode(mode)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        barcodeMode === mode
                          ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 ring-1 ring-orange-500/30'
                          : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${barcodeMode === mode ? 'bg-orange-400 shadow-sm shadow-orange-400/50' : 'bg-zinc-600'}`} />
                      <span className="capitalize">{mode === 'full' ? 'Full Barcode' : mode}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configured Value (Prefix / Suffix) and Identifier Field */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {barcodeMode !== 'full' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                      {barcodeMode === 'prefix' ? 'Prefix Value' : 'Suffix Value'}
                    </label>
                    <input
                      type="text"
                      placeholder={barcodeMode === 'prefix' ? 'e.g. 1BH' : 'e.g. 2026'}
                      value={barcodeValue}
                      onChange={(e) => setBarcodeValue(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-400 focus:bg-white/[0.07]"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                      Matching Rule
                    </label>
                    <div className="h-10 px-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-400 flex items-center">
                      Exact full barcode lookup against attendee record
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Unique Identifier Field
                  </label>
                  <select
                    value={barcodeIdentifierField}
                    onChange={(e) => setBarcodeIdentifierField(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full h-10 px-3 rounded-xl bg-[#141829] border border-white/10 text-xs text-white focus:outline-none focus:border-orange-400 cursor-pointer"
                  >
                    {IDENTIFIER_FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#121626] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles: Case Sensitivity & Length Validation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
                {/* Case Sensitivity */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <div className="text-xs font-medium text-zinc-200">Case Sensitive</div>
                    <div className="text-[10px] text-zinc-400">Match upper/lowercase strictly</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBarcodeCaseSensitive(!barcodeCaseSensitive)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      barcodeCaseSensitive ? 'bg-orange-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        barcodeCaseSensitive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Optional Length Validation Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <div className="text-xs font-medium text-zinc-200">Optional Length Validation</div>
                    <div className="text-[10px] text-zinc-400">Enforce min & max length limits</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBarcodeLengthValidation(!barcodeLengthValidation)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      barcodeLengthValidation ? 'bg-orange-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        barcodeLengthValidation ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Length Validation Inputs (if enabled) */}
              {barcodeLengthValidation && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-orange-500/20">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">Minimum Barcode Length</label>
                    <input
                      type="number"
                      placeholder="e.g. 9"
                      value={barcodeMinLength}
                      onChange={(e) => setBarcodeMinLength(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white focus:outline-none focus:border-orange-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">Maximum Barcode Length</label>
                    <input
                      type="number"
                      placeholder="e.g. 12"
                      value={barcodeMaxLength}
                      onChange={(e) => setBarcodeMaxLength(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white focus:outline-none focus:border-orange-400"
                    />
                  </div>
                </div>
              )}

              {/* Live Barcode Format Preview */}
              <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/25 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    Barcode Format Preview
                  </span>
                  <span className="text-zinc-400 capitalize">{barcodeMode} Mode</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {barcodeMode === 'prefix' && (
                    <>
                      <div className="px-2.5 py-1 rounded-lg bg-orange-500/25 border border-orange-500/40 text-orange-200 font-mono font-bold">
                        {barcodeValue.trim() || '1BH'}
                      </div>
                      <span className="text-zinc-500 font-bold">+</span>
                      <div className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 font-mono font-bold">
                        24CS051
                      </div>
                    </>
                  )}
                  {barcodeMode === 'suffix' && (
                    <>
                      <div className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 font-mono font-bold">
                        24CS051
                      </div>
                      <span className="text-zinc-500 font-bold">+</span>
                      <div className="px-2.5 py-1 rounded-lg bg-orange-500/25 border border-orange-500/40 text-orange-200 font-mono font-bold">
                        {barcodeValue.trim() || '2026'}
                      </div>
                    </>
                  )}
                  {barcodeMode === 'full' && (
                    <div className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 font-mono font-bold">
                      1BH24CS051
                    </div>
                  )}
                  <span className="text-zinc-500 text-xs">→</span>
                  <span className="text-xs text-zinc-300">
                    Example: <strong className="text-white font-mono">{
                      barcodeMode === 'prefix'
                        ? `${barcodeValue.trim() || '1BH'}24CS051`
                        : barcodeMode === 'suffix'
                        ? `24CS051${barcodeValue.trim() || '2026'}`
                        : '1BH24CS051'
                    }</strong>
                  </span>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: PREVIEW & CONFIRMATION SCREEN */}
        {step === 'PREVIEW' && (
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 space-y-4 custom-scrollbar">
            {/* Submission Error Banner */}
            {errors.submit && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errors.submit}</span>
              </div>
            )}

            {/* Event Summary Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Event Overview
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Ready to Create
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {eventTitle}
                </h3>
              </div>

              {/* Location & Time Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-zinc-400 uppercase font-medium">Venue</div>
                    <div className="text-xs font-semibold text-white truncate">{venue}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-zinc-400 uppercase font-medium">Date & Time</div>
                    <div className="text-xs font-semibold text-white truncate">{formatReadableDate(eventDate)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Audience & Credential Configuration */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  Access & Audience Credentials
                </span>
                <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
                  <ActiveIcon className="w-3.5 h-3.5" />
                  <span>{activePreset.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                    Pass Designation
                  </div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ActiveIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{activeSingular} Pass</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">Plural: {activePlural}</div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                    Default Scanner Key
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {activePrimaryKey}
                  </div>
                  <div className="text-[10px] text-zinc-400">Primary scan identifier</div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                    Grouping Dimension
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {activeGrouping}
                  </div>
                  <div className="text-[10px] text-zinc-400">Department / Batch</div>
                </div>
              </div>

              {/* Security & Gate Scanner Engine Specs */}
              <div className="pt-1 flex items-center gap-3 text-xs text-zinc-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Uses <strong className="text-zinc-200">128-bit CSPRNG Secure QR Tokens</strong> with instant gatekeeper validation.
                </span>
              </div>
            </div>

            {/* Barcode Identification Review Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5 text-orange-400" />
                  Barcode Identification Rules
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30 capitalize">
                  {barcodeMode === 'full' ? 'Full Barcode' : `${barcodeMode} Mode`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                    Matching Rule
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {barcodeMode === 'prefix' ? `Prefix: ${barcodeValue.trim() || '1BH'}` : barcodeMode === 'suffix' ? `Suffix: ${barcodeValue.trim() || '2026'}` : 'Exact Barcode Match'}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {barcodeMode === 'full' ? '1:1 lookup' : 'Fixed pattern rule'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                    Attendee ID Field
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {IDENTIFIER_FIELD_OPTIONS.find((o) => o.value === barcodeIdentifierField)?.label || barcodeIdentifierField}
                  </div>
                  <div className="text-[10px] text-zinc-400">Target database attribute</div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                    Sensitivity & Length
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    Case: {barcodeCaseSensitive ? 'Strict' : 'Insensitive'}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {barcodeLengthValidation ? `Length: ${barcodeMinLength || '1'}-${barcodeMaxLength || '∞'}` : 'Length: Not enforced'}
                  </div>
                </div>
              </div>

              {/* Live Preview in Step 2 */}
              <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-500/25 flex items-center justify-between gap-2 text-xs flex-wrap">
                <span className="text-zinc-400 text-xs">Sample Scanned Pass:</span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {barcodeMode === 'prefix' && (
                    <>
                      <span className="px-2 py-0.5 rounded bg-orange-500/30 text-orange-200 font-bold border border-orange-500/40">
                        {barcodeValue.trim() || '1BH'}
                      </span>
                      <span className="text-zinc-500">+</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-bold border border-indigo-500/40">
                        24CS051
                      </span>
                    </>
                  )}
                  {barcodeMode === 'suffix' && (
                    <>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-bold border border-indigo-500/40">
                        24CS051
                      </span>
                      <span className="text-zinc-500">+</span>
                      <span className="px-2 py-0.5 rounded bg-orange-500/30 text-orange-200 font-bold border border-orange-500/40">
                        {barcodeValue.trim() || '2026'}
                      </span>
                    </>
                  )}
                  {barcodeMode === 'full' && (
                    <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-bold border border-indigo-500/40">
                      1BH24CS051
                    </span>
                  )}
                  <span className="text-zinc-400 ml-1">→</span>
                  <span className="font-bold text-white ml-1 font-mono">
                    {barcodeMode === 'prefix'
                      ? `${barcodeValue.trim() || '1BH'}24CS051`
                      : barcodeMode === 'suffix'
                      ? `24CS051${barcodeValue.trim() || '2026'}`
                      : '1BH24CS051'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Actions: Mobile & PC Responsive */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-white/10 bg-[#0d101d] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-2.5 sm:gap-3">
          {step === 'FORM' ? (
            <>
              {/* Form Step Buttons: Cancel and Finish */}
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer disabled:opacity-50 text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-event-form"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                <span>Finish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Preview Step Buttons: Edit and Save */}
              <button
                type="button"
                onClick={handleBackToEdit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={handleFinalSave}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving Event...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
