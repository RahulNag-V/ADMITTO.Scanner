import { describe, it, expect } from 'vitest';
import { ATTENDEE_TYPE_PRESETS, getPresetByType } from '../../src/lib/attendeeTypes';

describe('Create Event Modal Configuration & Presets Engine', () => {
  it('includes all 7 supported target audience presets without clipping', () => {
    expect(ATTENDEE_TYPE_PRESETS.length).toBe(7);
    const presetIds = ATTENDEE_TYPE_PRESETS.map((p) => p.id);
    expect(presetIds).toEqual([
      'STUDENTS',
      'EMPLOYEES',
      'GUESTS',
      'DELEGATES',
      'PARTICIPANTS',
      'ATTENDEES',
      'CUSTOM',
    ]);
  });

  it('correctly maps target audience to default attendee identifiers', () => {
    // Students -> USN / Roll Number
    const students = getPresetByType('STUDENTS');
    expect(students.singular).toBe('Student');
    expect(students.plural).toBe('Students');
    expect(students.primaryKeyLabel).toContain('USN');

    // Employees -> Employee ID
    const employees = getPresetByType('EMPLOYEES');
    expect(employees.singular).toBe('Employee');
    expect(employees.plural).toBe('Employees');
    expect(employees.primaryKeyLabel).toBe('Employee ID');

    // Guests -> Ticket / Pass ID
    const guests = getPresetByType('GUESTS');
    expect(guests.singular).toBe('Guest');
    expect(guests.plural).toBe('Guests');
    expect(guests.primaryKeyLabel).toContain('Ticket');

    // Delegates -> Delegate ID / Reg No
    const delegates = getPresetByType('DELEGATES');
    expect(delegates.singular).toBe('Delegate');
    expect(delegates.plural).toBe('Delegates');
    expect(delegates.primaryKeyLabel).toContain('Delegate ID');

    // Participants -> Participant ID / Team Code
    const participants = getPresetByType('PARTICIPANTS');
    expect(participants.singular).toBe('Participant');
    expect(participants.plural).toBe('Participants');
    expect(participants.primaryKeyLabel).toContain('Participant ID');

    // Attendees -> General Attendees
    const attendees = getPresetByType('ATTENDEES');
    expect(attendees.singular).toBe('Attendee');
    expect(attendees.plural).toBe('Attendees');
    expect(attendees.primaryKeyLabel).toContain('Attendee ID');

    // Custom / Members -> Member ID / Pass Code
    const custom = getPresetByType('CUSTOM');
    expect(custom.singular).toBe('Member');
    expect(custom.plural).toBe('Members');
    expect(custom.primaryKeyLabel).toContain('Member ID');
  });

  it('provides sensible grouping and division labels for each domain', () => {
    expect(getPresetByType('STUDENTS').groupingLabel).toBe('Branch / Dept');
    expect(getPresetByType('EMPLOYEES').groupingLabel).toBe('Department / Team');
    expect(getPresetByType('GUESTS').groupingLabel).toBe('Pass Tier / Category');
    expect(getPresetByType('DELEGATES').groupingLabel).toBe('Organization / Company');
    expect(getPresetByType('PARTICIPANTS').groupingLabel).toBe('Track / Category');
    expect(getPresetByType('ATTENDEES').groupingLabel).toBe('Category / Pass Type');
    expect(getPresetByType('CUSTOM').groupingLabel).toBe('Group / Chapter');
  });

  it('falls back to STUDENTS preset safely when type is undefined or invalid', () => {
    const fallback = getPresetByType(undefined as any);
    expect(fallback.id).toBe('STUDENTS');
  });
});
