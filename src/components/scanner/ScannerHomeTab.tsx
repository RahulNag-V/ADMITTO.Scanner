import React from 'react';
import {
  Calendar,
  MapPin,
  User,
  Phone,
  MessageCircle,
  Mail,
  Users,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building,
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCheck,
  AlertTriangle,
} from 'lucide-react';
import { EventItem, Student, ScannerAccount } from '../../types';

interface ScannerHomeTabProps {
  event: EventItem | null;
  students: Student[];
  scannerAccount?: ScannerAccount | null;
  scannerName: string;
  onToggleCheckIn?: (studentId: string, currentStatus: boolean) => void;
  onNavigateToRoster?: () => void;
}

export const ScannerHomeTab: React.FC<ScannerHomeTabProps> = ({
  event,
  students,
  scannerName,
  onNavigateToRoster,
}) => {
  const adminName = event?.admin_name || 'Event Organizer';
  const adminPhone = event?.admin_phone || '';
  const adminEmail = event?.admin_email || '';

  // Format WhatsApp Link
  const cleanPhoneForWhatsApp = adminPhone.replace(/[^0-9]/g, '');
  const whatsAppMessage = encodeURIComponent(
    `Hello ${adminName}, I am reaching out from ${scannerName} regarding "${event?.title || 'Event'}" access.`
  );
  const whatsAppUrl = cleanPhoneForWhatsApp ? `https://wa.me/${cleanPhoneForWhatsApp}?text=${whatsAppMessage}` : '#';

  const checkedInCount = students.filter((s) => s.is_checked_in || s.checked_in).length;
  const pendingCount = Math.max(0, students.length - checkedInCount);
  const checkInRate = students.length > 0 ? Math.round((checkedInCount / students.length) * 100) : 0;

  return (
    <div id="scanner-home-tab" className="space-y-6 pb-24 animate-fade-in max-w-4xl mx-auto w-full">
      {/* 1. Digital Pass & Event Banner Studio Card */}
      <div className="bg-[#242b4d]/45 border border-white/20 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
        {/* Header Title Row */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight font-['Space_Grotesk'] truncate">
                Digital Pass & Event Banner
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">
                Official visual credentials & gate broadcasting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Event
            </span>
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {scannerName}
            </span>
          </div>
        </div>

        {/* Dynamic Digital Pass Banner Canvas */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/20 shadow-2xl w-full">
          {event?.banner_url ? (
            <div className="relative w-full min-h-[190px] sm:min-h-[220px] bg-zinc-950 overflow-hidden flex flex-col justify-between p-4 sm:p-6">
              <img
                src={event.banner_url}
                alt={event.title || 'Event Banner'}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/25 pointer-events-none" />

              {/* Top Badge Row */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-mono font-bold tracking-wider uppercase border border-white/15 inline-flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>OFFICIAL PASS</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-mono font-medium border border-white/10">
                    {event.id ? event.id.slice(0, 8).toUpperCase() : 'PASS-LIVE'}
                  </span>
                </div>
              </div>

              {/* Bottom Details */}
              <div className="relative z-10 space-y-1.5 mt-auto pt-4">
                <h1 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight font-['Space_Grotesk'] break-words drop-shadow-md">
                  {event.title || 'TechSprint 2026 National Hackathon & Summit'}
                </h1>
                {event.description && (
                  <p className="text-[11px] sm:text-xs text-slate-200 line-clamp-2 font-medium drop-shadow-sm">
                    {event.description}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1 text-[10px] sm:text-xs text-white font-mono flex-wrap">
                  <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                    <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-none">{event.venue || 'Main Innovation Arena, Hall 4B'}</span>
                  </span>
                  <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                    <Calendar className="w-3 h-3 text-amber-300 shrink-0" />
                    <span>
                      {event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }) : 'Today'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full min-h-[200px] sm:min-h-[230px] bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-4 sm:p-6 flex flex-col justify-between overflow-hidden shadow-inner">
              {/* Radial Glow & Dot Grid Pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_65%)] pointer-events-none" />
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Top Badge Row */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-mono font-bold tracking-wider uppercase border border-white/15 inline-flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>OFFICIAL PASS</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-white/90 text-[10px] font-mono font-medium border border-white/10">
                    {event?.id ? event.id.slice(0, 8).toUpperCase() : 'E1111111'}
                  </span>
                </div>
              </div>

              {/* Bottom Event Typography & Metadata */}
              <div className="relative z-10 space-y-1.5 mt-auto pt-4">
                <h1 className="text-base sm:text-2xl md:text-3xl font-black text-white tracking-tight font-['Space_Grotesk'] drop-shadow-lg break-words">
                  {event?.title || 'TechSprint 2026 National Hackathon & Summit'}
                </h1>
                <p className="text-[11px] sm:text-xs text-white/95 line-clamp-2 font-medium drop-shadow-md max-w-2xl">
                  {event?.description || 'Annual flagship engineering hackathon, workshops, and recruitment keynote.'}
                </p>
                <div className="flex items-center gap-2 pt-1 text-[10px] sm:text-xs text-white font-mono flex-wrap">
                  <span className="flex items-center gap-1 bg-black/35 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/15">
                    <MapPin className="w-3 h-3 text-amber-200 shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-none">{event?.venue || 'Main Innovation Arena, Hall 4B'}</span>
                  </span>
                  <span className="flex items-center gap-1 bg-black/35 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/15">
                    <Calendar className="w-3 h-3 text-amber-200 shrink-0" />
                    <span>
                      {event?.event_date ? new Date(event.event_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }) : '3 Sept 2026'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Registered Attendees Roster Card - Direct Link to Dedicated Roster Page */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white font-['Space_Grotesk']">
                Registered Attendees Roster ({students.length})
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Verified attendee list for lookups, token validation & emergency manual check-ins
            </p>
          </div>

          {/* Quick counts */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/25 flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{checkedInCount} Checked In</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold border border-white/10 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{pendingCount} Remaining</span>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Check-in Completion Rate</span>
            <span className="font-mono font-bold text-white">{checkInRate}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${checkInRate}%` }}
            />
          </div>
        </div>

        {/* Dedicated Navigation Call to Action */}
        <div className="pt-2">
          <button
            id="open-roster-page-btn"
            onClick={onNavigateToRoster}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-between group cursor-pointer transition-all border border-indigo-400/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-bold text-white leading-tight">
                  Open Dedicated Attendee Roster Page
                </div>
                <div className="text-[11px] text-indigo-200 font-normal">
                  Full roster view with instant search, branch filter & manual check-in
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 group-hover:translate-x-1 transition-transform">
              <span>View Roster ({students.length})</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Event Organizer Contact Card */}
      <div className="glass-card rounded-3xl border border-white/10 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">Event Organizer</h2>
              <p className="text-[11px] text-slate-400">For gate verification & escalation support</p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-mono font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Support Live
          </span>
        </div>

        {adminName ? (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Organizer Identity Row */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-600/30 shrink-0">
                {adminName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-white font-['Space_Grotesk'] truncate">{adminName}</div>
                <div className="text-[11px] text-indigo-300 font-semibold mt-0.5">Event Organizer</div>
                {!adminPhone && !adminEmail && (
                  <div className="text-[11px] text-zinc-500 italic mt-1">No contact details provided</div>
                )}
              </div>
            </div>

            {/* Contact Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WhatsApp */}
              {cleanPhoneForWhatsApp ? (
                <a
                  id="admin-whatsapp-btn"
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-600/90 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-lg shadow-emerald-600/25 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Chat on WhatsApp</div>
                      <div className="text-[10px] text-emerald-100/80 font-mono">{adminPhone}</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </a>
              ) : (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">WhatsApp</div>
                    <div className="text-[10px] text-slate-600">Not configured</div>
                  </div>
                </div>
              )}

              {/* Call */}
              {adminPhone ? (
                <a
                  id="admin-call-btn"
                  href={`tel:${adminPhone.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 active:scale-[0.98] text-white shadow-lg shadow-indigo-600/25 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Call Organizer</div>
                      <div className="text-[10px] text-indigo-200 font-mono">{adminPhone}</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </a>
              ) : (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">Phone Call</div>
                    <div className="text-[10px] text-slate-600">Not configured</div>
                  </div>
                </div>
              )}
            </div>

            {/* Email row */}
            {adminEmail ? (
              <a
                id="admin-email-btn"
                href={`mailto:${adminEmail}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-orange-500/10 hover:border-orange-500/20 transition-all group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium shrink-0">Email:</span>
                  <span className="text-[11px] text-orange-300 font-mono truncate">{adminEmail}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </a>
            ) : null}
          </div>
        ) : (
          /* No organizer configured */
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-amber-300">No Organizer Configured</div>
                <div className="text-[11px] text-amber-300/70 mt-1 leading-relaxed">
                  The event admin has not added organizer contact details yet. Ask them to go to{' '}
                  <strong className="text-amber-200">Event Settings → Event Organizer</strong> to add a name, phone & email.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Professional Gate Scanner Terminal Footer */}
      <footer className="pt-4 pb-2 border-t border-white/10 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-emerald-300 text-[11px]">Gate Terminal Online</span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] text-slate-400">Offline SQLite/IndexedDB Ready</span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          ADMITTO Scanner Engine v2.6.4 • © 2026
        </div>
      </footer>
    </div>
  );
};

