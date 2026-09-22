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
  groupingPlaceholder?: string;
  subGroupingLabel?: string;
  subGroupingPlaceholder?: string;
  divisionLabel?: string;
  divisionPlaceholder?: string;
  defaultGroupingValue?: string;
  defaultSubGroupingValue?: string;
  defaultDivisionValue?: string;
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
    primaryKeyLabel: 'USN / Roll Number',
    primaryKeyPlaceholder: 'e.g. 1MS21CS001, Roll No',
    defaultSecondaryKey: 'email',
    groupingLabel: 'Branch / Dept',
    groupingPlaceholder: 'e.g. Computer Science',
    subGroupingLabel: 'Year / Batch',
    subGroupingPlaceholder: 'e.g. 2026 or 4th Year',
    divisionLabel: 'Section',
    divisionPlaceholder: 'e.g. A, B, C',
    defaultGroupingValue: 'Computer Science',
    defaultSubGroupingValue: '2026',
    defaultDivisionValue: 'A',
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
    groupingLabel: 'Department / Team',
    groupingPlaceholder: 'e.g. Engineering, Sales',
    subGroupingLabel: 'Designation / Role',
    subGroupingPlaceholder: 'e.g. Senior Lead, Staff',
    divisionLabel: 'Office / Location',
    divisionPlaceholder: 'e.g. HQ, Floor 4, Remote',
    defaultGroupingValue: 'Engineering',
    defaultSubGroupingValue: 'Staff',
    defaultDivisionValue: 'HQ',
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
    groupingPlaceholder: 'e.g. VIP, Platinum, General',
    subGroupingLabel: 'Seating / Table',
    subGroupingPlaceholder: 'e.g. Table 4, Row B',
    divisionLabel: 'Gate / Access Zone',
    divisionPlaceholder: 'e.g. Gate 1, Lounge A',
    defaultGroupingValue: 'General Access',
    defaultSubGroupingValue: 'General',
    defaultDivisionValue: 'Gate 1',
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
    primaryKeyLabel: 'Delegate ID / Reg No',
    primaryKeyPlaceholder: 'e.g. DEL-2026-881',
    defaultSecondaryKey: 'branch',
    groupingLabel: 'Organization / Company',
    groupingPlaceholder: 'e.g. Acme Corp, Tech Ltd',
    subGroupingLabel: 'Designation / Title',
    subGroupingPlaceholder: 'e.g. Director, Speaker',
    divisionLabel: 'Track / Hall',
    divisionPlaceholder: 'e.g. Main Hall, Track 2',
    defaultGroupingValue: 'Delegate',
    defaultSubGroupingValue: 'Delegate',
    defaultDivisionValue: 'Main Hall',
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
    primaryKeyLabel: 'Participant ID / Team Code',
    primaryKeyPlaceholder: 'e.g. HACK-042, Team Code',
    defaultSecondaryKey: 'email',
    groupingLabel: 'Track / Category',
    groupingPlaceholder: 'e.g. AI / Web3 / Design',
    subGroupingLabel: 'Team Name',
    subGroupingPlaceholder: 'e.g. Team Alpha',
    divisionLabel: 'Role / Seat',
    divisionPlaceholder: 'e.g. Team Lead, Member',
    defaultGroupingValue: 'General Track',
    defaultSubGroupingValue: 'Solo',
    defaultDivisionValue: 'Participant',
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
    primaryKeyLabel: 'Attendee ID / Ticket No',
    primaryKeyPlaceholder: 'e.g. ATT-44910, Pass ID',
    defaultSecondaryKey: 'email',
    groupingLabel: 'Category / Pass Type',
    groupingPlaceholder: 'e.g. Standard, Early Bird',
    subGroupingLabel: 'Organization / Affiliation',
    subGroupingPlaceholder: 'e.g. Community Member',
    divisionLabel: 'Access Zone',
    divisionPlaceholder: 'e.g. General, Hall A',
    defaultGroupingValue: 'General',
    defaultSubGroupingValue: 'General',
    defaultDivisionValue: 'Main',
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
    primaryKeyLabel: 'Member ID / Pass Code',
    primaryKeyPlaceholder: 'e.g. MEM-2026-001',
    defaultSecondaryKey: 'email',
    groupingLabel: 'Group / Chapter',
    groupingPlaceholder: 'e.g. North Chapter',
    subGroupingLabel: 'Membership Tier',
    subGroupingPlaceholder: 'e.g. Gold, Premium',
    divisionLabel: 'Status / Division',
    divisionPlaceholder: 'e.g. Active, Batch A',
    defaultGroupingValue: 'Member',
    defaultSubGroupingValue: 'Standard',
    defaultDivisionValue: 'Active',
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
  groupingLabel: string;
  subGroupingLabel: string;
  divisionLabel: string;
} {
  const preset = getPresetByType(event?.attendee_type);
  const singular = event?.attendee_label_singular?.trim() || preset.singular;
  const plural = event?.attendee_label_plural?.trim() || preset.plural;

  let primaryKeyLabel = preset.primaryKeyLabel;
  if (event?.primary_scan_field) {
    const pKey = event.primary_scan_field.toLowerCase();
    if (pKey === 'usn') primaryKeyLabel = 'USN / Roll Number';
    else if (pKey === 'employee_id' || pKey === 'employeeid') primaryKeyLabel = 'Employee ID';
    else if (pKey === 'ticket_id' || pKey === 'ticketid') primaryKeyLabel = 'Ticket / Pass ID';
    else if (pKey === 'participant_id' || pKey === 'participantid') primaryKeyLabel = 'Participant ID / Team Code';
    else if (pKey === 'registration_id' || pKey === 'registrationid') primaryKeyLabel = 'Delegate ID / Reg No';
    else if (pKey === 'member_id' || pKey === 'memberid') primaryKeyLabel = 'Member ID';
    else if (pKey === 'attendee_id' || pKey === 'attendeeid') primaryKeyLabel = 'Attendee ID / Ticket No';
    else primaryKeyLabel = event.primary_scan_field;
  }

  return {
    singular,
    plural,
    preset,
    primaryKeyLabel,
    groupingLabel: preset.groupingLabel,
    subGroupingLabel: preset.subGroupingLabel || 'Year / Batch',
    divisionLabel: preset.divisionLabel || 'Section',
  };
}
