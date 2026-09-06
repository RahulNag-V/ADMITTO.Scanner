import { AttendeeType } from '../types';

export interface AttendeeTypePreset {
  id: AttendeeType;
  label: string;
  badge: string;
  description: string;
  emoji: string;
  singular: string;
  plural: string;
  defaultPrimaryKey: string;
  primaryKeyLabel: string;
  primaryKeyPlaceholder: string;
  defaultSecondaryKey?: string;
  groupingLabel: string;
}

export const ATTENDEE_TYPE_PRESETS: AttendeeTypePreset[] = [
  {
    id: 'STUDENTS',
    label: 'Students & Academia',
    badge: 'Campus / College',
    description: 'Colleges, Universities, Schools, Hackathons',
    emoji: '🎓',
    singular: 'Student',
    plural: 'Students',
    defaultPrimaryKey: 'usn',
    primaryKeyLabel: 'USN / Student ID',
    primaryKeyPlaceholder: 'e.g. 1MS21CS001, USN',
    defaultSecondaryKey: 'email',
    groupingLabel: 'Branch / Dept',
  },
  {
    id: 'EMPLOYEES',
    label: 'Corporate & Employees',
    badge: 'Enterprise',
    description: 'Offsites, Townhalls, Internal Summits, Gatherings',
    emoji: '💼',
    singular: 'Employee',
    plural: 'Employees',
    defaultPrimaryKey: 'employee_id',
    primaryKeyLabel: 'Employee ID',
    primaryKeyPlaceholder: 'e.g. EMP-10492, Staff ID',
    defaultSecondaryKey: 'email',
    groupingLabel: 'Department',
  },
  {
    id: 'GUESTS',
    label: 'Guests & VIPs',
    badge: 'Entertainment',
    description: 'Concerts, Galas, Banquets, Private Parties',
    emoji: '🎫',
    singular: 'Guest',
    plural: 'Guests',
    defaultPrimaryKey: 'ticket_id',
    primaryKeyLabel: 'Ticket / Pass ID',
    primaryKeyPlaceholder: 'e.g. TKT-98302, VIP-Pass',
    defaultSecondaryKey: 'phone_number',
    groupingLabel: 'Pass Tier / Category',
  },
  {
    id: 'DELEGATES',
    label: 'Conference Delegates',
    badge: 'Expos & Summits',
    description: 'Conferences, Conventions, Trade Shows, Expos',
    emoji: '🌐',
    singular: 'Delegate',
    plural: 'Delegates',
    defaultPrimaryKey: 'registration_id',
    primaryKeyLabel: 'Registration / Badge ID',
    primaryKeyPlaceholder: 'e.g. CONF-2026-881',
    defaultSecondaryKey: 'branch',
    groupingLabel: 'Organization / Company',
  },
  {
    id: 'PARTICIPANTS',
    label: 'Participants & Teams',
    badge: 'Competition',
    description: 'Hackathons, Competitions, Sports, Tournaments',
    emoji: '🏅',
    singular: 'Participant',
    plural: 'Participants',
    defaultPrimaryKey: 'participant_id',
    primaryKeyLabel: 'Participant ID',
    primaryKeyPlaceholder: 'e.g. HACK-042, Team Code',
    defaultSecondaryKey: 'email',
    groupingLabel: 'Track / Category',
  },
  {
    id: 'ATTENDEES',
    label: 'General Attendees',
    badge: 'General Access',
    description: 'Seminars, Meetups, Community Events',
    emoji: '👥',
    singular: 'Attendee',
    plural: 'Attendees',
    defaultPrimaryKey: 'attendee_id',
    primaryKeyLabel: 'Attendee ID',
    primaryKeyPlaceholder: 'e.g. ATT-44910, Pass ID',
    defaultSecondaryKey: 'email',
    groupingLabel: 'Category',
  },
  {
    id: 'CUSTOM',
    label: 'Custom Audience',
    badge: 'Custom Terms',
    description: 'Define your own singular and plural audience terms',
    emoji: '✏️',
    singular: 'Member',
    plural: 'Members',
    defaultPrimaryKey: 'member_id',
    primaryKeyLabel: 'Custom ID',
    primaryKeyPlaceholder: 'e.g. ID / Pass Code',
    defaultSecondaryKey: 'email',
    groupingLabel: 'Group / Division',
  },
];

export function getPresetByType(type?: AttendeeType | string): AttendeeTypePreset {
  const match = ATTENDEE_TYPE_PRESETS.find((p) => p.id === type);
  return match || ATTENDEE_TYPE_PRESETS[0]; // defaults to STUDENTS
}

export function getAttendeeLabels(event?: {
  attendee_type?: AttendeeType | string;
  attendee_label_singular?: string;
  attendee_label_plural?: string;
  primary_scan_field?: string;
}): {
  singular: string;
  plural: string;
  preset: AttendeeTypePreset;
  primaryKeyLabel: string;
} {
  const preset = getPresetByType(event?.attendee_type);
  const singular = event?.attendee_label_singular?.trim() || preset.singular;
  const plural = event?.attendee_label_plural?.trim() || preset.plural;

  let primaryKeyLabel = preset.primaryKeyLabel;
  if (event?.primary_scan_field) {
    const pKey = event.primary_scan_field.toLowerCase();
    if (pKey === 'usn') primaryKeyLabel = 'USN';
    else if (pKey === 'employee_id' || pKey === 'employeeid') primaryKeyLabel = 'Employee ID';
    else if (pKey === 'ticket_id' || pKey === 'ticketid') primaryKeyLabel = 'Ticket ID';
    else if (pKey === 'participant_id' || pKey === 'participantid') primaryKeyLabel = 'Participant ID';
    else if (pKey === 'registration_id' || pKey === 'registrationid') primaryKeyLabel = 'Registration ID';
    else primaryKeyLabel = event.primary_scan_field;
  }

  return {
    singular,
    plural,
    preset,
    primaryKeyLabel,
  };
}
