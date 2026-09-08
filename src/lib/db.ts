import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import {
  Profile,
  EventItem,
  Student,
  ScannerAccount,
  CheckIn,
  ScanAttempt,
  ActivityLog,
  ScanValidationResult,
  ScanType,
  EventStats,
  ScannerReferralCode,
  ScannerAccessRequest,
  EventScanConfig,
  UniquenessValidationResult,
  PasswordResetCode,
} from '../types';
import { getServerSupabase, getServerSupabaseAdmin } from './supabase/server';

type ScannerInvalidationHook = (scannerId: string) => void;
let scannerInvalidationHook: ScannerInvalidationHook | null = null;

export function registerScannerInvalidationHook(hook: ScannerInvalidationHook) {
  scannerInvalidationHook = hook;
}

export function notifyScannerInvalidated(scannerId: string) {
  if (scannerInvalidationHook) {
    scannerInvalidationHook(scannerId);
  }
}

// Server-side database schema definition
export interface DatabaseSchema {
  profiles: Profile[];
  events: EventItem[];
  students: Student[];
  scanner_accounts: ScannerAccount[];
  check_ins: CheckIn[];
  scan_attempts: ScanAttempt[];
  activity_logs: ActivityLog[];
  scanner_referral_codes: ScannerReferralCode[];
  scanner_access_requests: ScannerAccessRequest[];
  password_reset_codes: PasswordResetCode[];
  passwords: Record<string, string>; // userId/email -> password_hash or direct pass
}

function generateId(): string {
  return crypto.randomUUID();
}

// Clean production database initialization - strictly 0 demo records
const initialDB: DatabaseSchema = {
  profiles: [],
  passwords: {},
  events: [],
  students: [],
  scanner_accounts: [],
  check_ins: [],
  scan_attempts: [],
  activity_logs: [],
  scanner_referral_codes: [],
  scanner_access_requests: [],
  password_reset_codes: [],
};

class DatabaseService {
  private inMemoryDB: DatabaseSchema = JSON.parse(JSON.stringify(initialDB));

  private forceInMemory: boolean = false;

  resetDatabase(): void {
    this.inMemoryDB = JSON.parse(JSON.stringify(initialDB));
  }

  setForceInMemory(force: boolean): void {
    this.forceInMemory = force;
  }

  private getClient() {
    if (this.forceInMemory) return null;
    return getServerSupabaseAdmin() || getServerSupabase();
  }

  // --- PROFILES & AUTH ---
  async getProfileByEmail(email: string): Promise<Profile | null> {
    const supabase = this.getClient();
    const cleanEmail = email.toLowerCase().trim();
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (error) {
        console.error('[Supabase DB] Error getting profile by email:', error);
        throw new Error(`Database error fetching profile: ${error.message}`);
      }
      return (data as Profile) || null;
    }
    return this.inMemoryDB.profiles.find((p) => p.email.toLowerCase() === cleanEmail) || null;
  }

  async getProfileById(id: string): Promise<Profile | null> {
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('[Supabase DB] Error getting profile by id:', error);
        throw new Error(`Database error fetching profile: ${error.message}`);
      }
      return (data as Profile) || null;
    }
    return this.inMemoryDB.profiles.find((p) => p.id === id) || null;
  }

  async createAdminProfile(email: string, name: string, passwordPlain: string): Promise<Profile> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const id = generateId();
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const newProfile: Profile = {
      id,
      email: cleanEmail,
      name: cleanName,
      role: 'ADMIN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from('profiles').insert(newProfile);
      if (error) {
        console.error('[Supabase DB] Error creating admin profile:', error);
        throw new Error(`Failed to create account in database: ${error.message}`);
      }
    }

    this.inMemoryDB.profiles.push(newProfile);
    this.inMemoryDB.passwords[cleanEmail] = passwordHash;
    return newProfile;
  }

  async createScannerProfile(email: string, name: string): Promise<Profile> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim() || cleanEmail.split('@')[0];
    const id = generateId();
    const newProfile: Profile = {
      id,
      email: cleanEmail,
      name: cleanName,
      role: 'SCANNER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from('profiles').insert(newProfile);
      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique')) {
          const existing = await this.getProfileByEmail(cleanEmail);
          if (existing) return existing;
        }
        console.error('[Supabase DB] Error creating scanner profile:', error);
        throw new Error(`Failed to create scanner profile: ${error.message}`);
      }
    }

    this.inMemoryDB.profiles.push(newProfile);
    return newProfile;
  }

  async verifyAdminPassword(email: string, passwordPlain: string): Promise<Profile | null> {
    const cleanEmail = email.toLowerCase().trim();
    const profile = await this.getProfileByEmail(cleanEmail);
    if (!profile) return null;

    const storedPass = this.inMemoryDB.passwords[cleanEmail] || (profile as any).password_hash;
    if (storedPass) {
      if (storedPass.startsWith('$2')) {
        const match = await bcrypt.compare(passwordPlain, storedPass);
        return match ? profile : null;
      }
      return storedPass === passwordPlain ? profile : null;
    }

    return profile;
  }

  async deleteAccount(userId: string): Promise<boolean> {
    const supabase = this.getClient();
    const supabaseAdmin = getServerSupabaseAdmin() || getServerSupabase();

    // 1. If Supabase is active, cascade delete events and profile
    if (supabase) {
      try {
        const { data: events } = await supabase.from('events').select('id').eq('admin_id', userId);
        if (events && events.length > 0) {
          const eventIds = events.map((e) => e.id);
          await supabase.from('scanner_access_requests').delete().in('event_id', eventIds);
          await supabase.from('scanner_referral_codes').delete().in('event_id', eventIds);
          await supabase.from('scan_attempts').delete().in('event_id', eventIds);
          await supabase.from('check_ins').delete().in('event_id', eventIds);
          await supabase.from('scanner_accounts').delete().in('event_id', eventIds);
          await supabase.from('students').delete().in('event_id', eventIds);
          await supabase.from('activity_logs').delete().in('event_id', eventIds);
          await supabase.from('events').delete().eq('admin_id', userId);
        }

        await supabase.from('scanner_access_requests').delete().eq('user_id', userId);
        await supabase.from('profiles').delete().eq('id', userId);
      } catch (dbErr) {
        console.error('[Supabase DB] Error in cascade account deletion:', dbErr);
      }

      if (supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch {
          // May not exist in auth.users if scanner profile
        }
      }
    }

    // 2. Clear from inMemoryDB
    const profile = this.inMemoryDB.profiles.find((p) => p.id === userId);
    if (profile) {
      delete this.inMemoryDB.passwords[profile.email.toLowerCase()];
    }
    this.inMemoryDB.profiles = this.inMemoryDB.profiles.filter((p) => p.id !== userId);

    const eventIdsToDelete = this.inMemoryDB.events.filter((e) => e.admin_id === userId).map((e) => e.id);
    this.inMemoryDB.events = this.inMemoryDB.events.filter((e) => e.admin_id !== userId);
    this.inMemoryDB.students = this.inMemoryDB.students.filter((s) => !eventIdsToDelete.includes(s.event_id));
    this.inMemoryDB.scanner_accounts = this.inMemoryDB.scanner_accounts.filter((s) => !eventIdsToDelete.includes(s.event_id));
    this.inMemoryDB.check_ins = this.inMemoryDB.check_ins.filter((c) => !eventIdsToDelete.includes(c.event_id));
    this.inMemoryDB.scan_attempts = this.inMemoryDB.scan_attempts.filter((a) => !eventIdsToDelete.includes(a.event_id));
    this.inMemoryDB.activity_logs = this.inMemoryDB.activity_logs.filter((l) => !eventIdsToDelete.includes(l.event_id));
    this.inMemoryDB.scanner_referral_codes = this.inMemoryDB.scanner_referral_codes.filter((r) => !eventIdsToDelete.includes(r.event_id));
    this.inMemoryDB.scanner_access_requests = this.inMemoryDB.scanner_access_requests.filter(
      (r) => r.user_id !== userId && !eventIdsToDelete.includes(r.event_id)
    );

    return true;
  }

  async updateProfile(
    userId: string,
    updates: { name?: string; phone?: string; organization?: string; bio?: string }
  ): Promise<Profile | null> {
    const cleanName = updates.name ? updates.name.trim() : undefined;
    const updatedAt = new Date().toISOString();

    const supabase = this.getClient();
    if (supabase) {
      const payload: Record<string, any> = { updated_at: updatedAt };
      if (cleanName) payload.name = cleanName;

      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('[Supabase DB] Profile update warning:', error.message);
      }
      if (data) {
        return data as Profile;
      }
    }

    const inMem = this.inMemoryDB.profiles.find((p) => p.id === userId);
    if (inMem) {
      if (cleanName) inMem.name = cleanName;
      inMem.updated_at = updatedAt;
      return inMem;
    }
    return null;
  }

  async updatePassword(email: string, newPasswordPlain: string): Promise<boolean> {
    const cleanEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(newPasswordPlain, 10);
    this.inMemoryDB.passwords[cleanEmail] = passwordHash;

    const supabase = this.getClient();
    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
          .eq('email', cleanEmail);
      } catch (err: any) {
        console.warn('[Supabase DB] Warning updating profile password_hash:', err?.message);
      }
    }
    return true;
  }

  // --- PASSWORD RESET CODES (Supabase Persistent with Resilient Fallback) ---
  private isTableMissing(err: any): boolean {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    return (
      err.code === 'PGRST205' ||
      msg.includes('could not find the table') ||
      msg.includes('does not exist')
    );
  }

  private getOtpFilePath(): string {
    return path.resolve(process.cwd(), '.temp', 'password_reset_codes.json');
  }

  private readPersistentOtpCodes(): PasswordResetCode[] {
    try {
      const filePath = this.getOtpFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch {}
    return this.inMemoryDB.password_reset_codes || [];
  }

  private writePersistentOtpCodes(codes: PasswordResetCode[]): void {
    try {
      const filePath = this.getOtpFilePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(codes, null, 2), 'utf8');
    } catch {}
    this.inMemoryDB.password_reset_codes = codes;
  }

  async createPasswordResetCode(
    userId: string,
    email: string,
    codeHash: string,
    expiresAt: string
  ): Promise<PasswordResetCode> {
    const cleanEmail = email.toLowerCase().trim();
    const newRecord: PasswordResetCode = {
      id: generateId(),
      user_id: userId,
      email: cleanEmail,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      used: false,
      created_at: new Date().toISOString(),
    };

    const supabase = this.getClient();
    if (supabase) {
      try {
        await supabase
          .from('password_reset_codes')
          .update({ used: true })
          .eq('email', cleanEmail)
          .eq('used', false);

        const { data, error } = await supabase
          .from('password_reset_codes')
          .insert({
            id: newRecord.id,
            user_id: newRecord.user_id,
            email: newRecord.email,
            code_hash: newRecord.code_hash,
            expires_at: newRecord.expires_at,
            attempts: 0,
            used: false,
            created_at: newRecord.created_at,
          })
          .select('*')
          .single();

        if (!error && data) {
          return data as PasswordResetCode;
        }

        if (error && !this.isTableMissing(error)) {
          console.error('[Supabase DB] Error inserting reset code:', error);
          throw new Error(`Database error persisting reset code: ${error.message}`);
        }
      } catch (err: any) {
        if (!this.isTableMissing(err)) {
          throw err;
        }
      }
    }

    // Resilient fallback when Supabase table is not yet migrated in connected database
    const codes = this.readPersistentOtpCodes();
    codes.forEach((r) => {
      if (r.email.toLowerCase() === cleanEmail && !r.used) {
        r.used = true;
      }
    });
    codes.push(newRecord);
    this.writePersistentOtpCodes(codes);
    return newRecord;
  }

  async getActivePasswordResetCode(email: string): Promise<PasswordResetCode | null> {
    const cleanEmail = email.toLowerCase().trim();
    const supabase = this.getClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('password_reset_codes')
          .select('*')
          .eq('email', cleanEmail)
          .eq('used', false)
          .gt('expires_at', new Date().toISOString())
          .lt('attempts', 5)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error) {
          return (data as PasswordResetCode) || null;
        }

        if (error && !this.isTableMissing(error)) {
          console.error('[Supabase DB] Error fetching active reset code:', error);
          throw new Error(`Database error fetching reset code: ${error.message}`);
        }
      } catch (err: any) {
        if (!this.isTableMissing(err)) {
          throw err;
        }
      }
    }

    // Resilient fallback store
    const now = Date.now();
    const codes = this.readPersistentOtpCodes();
    const valid = codes
      .filter(
        (r) =>
          r.email.toLowerCase() === cleanEmail &&
          !r.used &&
          new Date(r.expires_at).getTime() > now &&
          r.attempts < 5
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return valid[0] || null;
  }

  async incrementPasswordResetAttempts(id: string): Promise<number> {
    let currentAttempts = 1;
    const codes = this.readPersistentOtpCodes();
    const inRecord = codes.find((r) => r.id === id);
    if (inRecord) {
      currentAttempts = (inRecord.attempts || 0) + 1;
      inRecord.attempts = currentAttempts;
      if (currentAttempts >= 5) {
        inRecord.used = true;
      }
      this.writePersistentOtpCodes(codes);
    }

    const supabase = this.getClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('password_reset_codes')
          .select('attempts')
          .eq('id', id)
          .single();

        if (!error && data) {
          const updatedAttempts = (data.attempts || 0) + 1;
          currentAttempts = updatedAttempts;
          await supabase
            .from('password_reset_codes')
            .update({
              attempts: updatedAttempts,
              used: updatedAttempts >= 5,
            })
            .eq('id', id);
        }
      } catch (err: any) {
        // Handled via resilient store
      }
    }

    return currentAttempts;
  }

  async markPasswordResetCodeUsed(id: string): Promise<boolean> {
    const codes = this.readPersistentOtpCodes();
    const inRecord = codes.find((r) => r.id === id);
    if (inRecord) {
      inRecord.used = true;
      this.writePersistentOtpCodes(codes);
    }

    const supabase = this.getClient();
    if (supabase) {
      try {
        await supabase
          .from('password_reset_codes')
          .update({ used: true })
          .eq('id', id);
      } catch (err: any) {
        // Handled via resilient store
      }
    }

    return true;
  }

  // --- SCANNER AUTH (LEGACY DIRECT LOGINS) ---
  async verifyScannerAuth(
    accessCodeOrEmail: string,
    passwordOrCode: string
  ): Promise<{ scanner: ScannerAccount; event: EventItem } | null> {
    if (!accessCodeOrEmail || !passwordOrCode) return null;
    const identifier = accessCodeOrEmail.trim().toUpperCase();
    const cleanEmail = accessCodeOrEmail.trim().toLowerCase();
    const cleanPassword = passwordOrCode.trim();

    const supabase = this.getClient();
    let scanner: ScannerAccount | null = null;

    if (supabase) {
      const { data: codeData, error: codeErr } = await supabase
        .from('scanner_accounts')
        .select('*')
        .eq('access_code', identifier)
        .eq('is_active', true)
        .maybeSingle();

      if (codeErr) {
        console.error('[Supabase DB] Error fetching scanner by code:', codeErr);
        throw new Error(`Database error fetching scanner: ${codeErr.message}`);
      }

      if (codeData) {
        scanner = codeData as ScannerAccount;
      } else {
        const { data: emailData, error: emailErr } = await supabase
          .from('scanner_accounts')
          .select('*')
          .eq('email', cleanEmail)
          .eq('is_active', true)
          .maybeSingle();

        if (emailErr) {
          console.error('[Supabase DB] Error fetching scanner by email:', emailErr);
          throw new Error(`Database error fetching scanner: ${emailErr.message}`);
        }

        if (emailData) {
          scanner = emailData as ScannerAccount;
        }
      }
    } else {
      scanner =
        this.inMemoryDB.scanner_accounts.find(
          (s) =>
            (s.access_code.toUpperCase() === identifier || s.email.toLowerCase() === cleanEmail) &&
            s.is_active
        ) || null;
    }

    if (!scanner) return null;

    if (scanner.expires_at && new Date(scanner.expires_at).getTime() < Date.now()) {
      return null;
    }

    const isCodeMatch = scanner.access_code.toUpperCase() === cleanPassword.toUpperCase();
    let isPassMatch = false;
    const storedHash = scanner.password_hash || this.inMemoryDB.passwords[scanner.email.toLowerCase()];
    if (storedHash) {
      if (storedHash.startsWith('$2')) {
        isPassMatch = await bcrypt.compare(cleanPassword, storedHash);
      } else {
        isPassMatch = storedHash === cleanPassword;
      }
    }

    if (!isCodeMatch && !isPassMatch) {
      return null;
    }

    const event = await this.getEventById(scanner.event_id);
    if (!event || event.status === 'DELETED') return null;

    const now = new Date().toISOString();
    scanner.last_login_at = now;
    if (supabase) {
      await supabase.from('scanner_accounts').update({ last_login_at: now }).eq('id', scanner.id);
    }

    return { scanner, event };
  }

  // --- EVENTS (Strict Multi-Admin Isolation) ---
  async getEventsByAdmin(adminId: string): Promise<EventItem[]> {
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('admin_id', adminId)
        .neq('status', 'DELETED')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Supabase DB] Error getting events:', error);
        throw new Error(`Database error fetching events: ${error.message}`);
      }
      return (data as EventItem[]) || [];
    }
    return this.inMemoryDB.events
      .filter((e) => e.admin_id === adminId && e.status !== 'DELETED')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getEventById(eventId: string, adminId?: string): Promise<EventItem | null> {
    const supabase = this.getClient();
    if (supabase) {
      let query = supabase.from('events').select('*').eq('id', eventId).neq('status', 'DELETED');
      if (adminId) {
        query = query.eq('admin_id', adminId);
      }
      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error('[Supabase DB] Error getting event by id:', error);
        throw new Error(`Database error fetching event: ${error.message}`);
      }
      return (data as EventItem) || null;
    }

    const event = this.inMemoryDB.events.find((e) => e.id === eventId && e.status !== 'DELETED');
    if (!event) return null;
    if (adminId && event.admin_id !== adminId) {
      return null;
    }
    return event;
  }

  async createEvent(adminId: string, data: Partial<EventItem>): Promise<EventItem> {
    const profile = await this.getProfileById(adminId);
    const newEvent: EventItem = {
      id: generateId(),
      admin_id: adminId,
      title: data.title?.trim() || 'Untitled Event',
      description: data.description?.trim() || '',
      venue: data.venue?.trim() || 'Main Auditorium',
      event_date: data.event_date || new Date().toISOString(),
      admin_name: data.admin_name?.trim() || profile?.name || 'Event Organizer',
      admin_phone: data.admin_phone?.trim() || '',
      admin_email: data.admin_email?.trim() || profile?.email || '',
      banner_url: data.banner_url?.trim() || '',
      status: 'ACTIVE',
      attendee_type: data.attendee_type || 'STUDENTS',
      attendee_label_singular: data.attendee_label_singular?.trim() || 'Student',
      attendee_label_plural: data.attendee_label_plural?.trim() || 'Students',
      primary_scan_field: data.primary_scan_field || 'usn',
      secondary_scan_field: data.secondary_scan_field || null,
      qr_mode: data.qr_mode || 'SECURE_TOKEN',
      barcode_field: data.barcode_field || 'usn',
      scan_config: data.scan_config || {
        primary_scan_field: data.primary_scan_field || 'usn',
        secondary_scan_field: data.secondary_scan_field || null,
        qr_mode: data.qr_mode || 'SECURE_TOKEN',
        barcode_field: data.barcode_field || 'usn',
        is_uniqueness_verified: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from('events').insert(newEvent);
      if (error) {
        console.error('[Supabase DB] Error creating event:', error);
        throw new Error(`Failed to create event in database: ${error.message}`);
      }
    }

    this.inMemoryDB.events.push(newEvent);

    // Record Activity Log
    await this.logActivity(
      newEvent.id,
      adminId,
      profile?.name || 'Admin',
      'event_created',
      `Event "${newEvent.title}" was created.`
    );

    return newEvent;
  }

  async updateEvent(
    eventId: string,
    adminId: string,
    updates: Partial<EventItem>
  ): Promise<EventItem | null> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) return null;

    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from('events').update(updatedData).eq('id', eventId).eq('admin_id', adminId);
      if (error) {
        console.error('[Supabase DB] Error updating event:', error);
        throw new Error(`Failed to update event in database: ${error.message}`);
      }
    }

    Object.assign(event, updatedData);

    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      'event_updated',
      `Event details updated for "${event.title}".`
    );

    return event;
  }

  async updateScanConfig(
    eventId: string,
    adminId: string,
    config: EventScanConfig
  ): Promise<EventItem> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const updatePayload = {
      primary_scan_field: config.primary_scan_field || 'usn',
      secondary_scan_field: config.secondary_scan_field || null,
      qr_mode: config.qr_mode || 'SECURE_TOKEN',
      barcode_field: config.barcode_field || 'usn',
      scan_config: config,
      updated_at: new Date().toISOString(),
    };

    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from('events').update(updatePayload).eq('id', eventId).eq('admin_id', adminId);
      if (error) throw new Error(`Database error saving scan configuration: ${error.message}`);
    }

    Object.assign(event, updatePayload);

    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      'event_updated',
      `Updated scanning configuration: Primary Key "${config.primary_scan_field}", QR Mode "${config.qr_mode}".`
    );

    return event;
  }

  validateDatasetUniqueness(
    rows: any[],
    primaryKey: string,
    secondaryKey?: string | null
  ): UniquenessValidationResult {
    if (!rows || rows.length === 0) {
      return {
        is_unique: true,
        total_records: 0,
        unique_values_count: 0,
        duplicate_values: [],
        requires_secondary: false,
        message: 'No records to validate.',
      };
    }

    const getVal = (row: any, key: string): string => {
      if (!key) return '';
      const direct = row[key] ?? row[key.toLowerCase()] ?? row.meta?.[key] ?? row.raw?.[key];
      if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct).trim();
      // Look in raw keys case-insensitively
      if (row.raw) {
        const foundKey = Object.keys(row.raw).find((k) => k.toLowerCase() === key.toLowerCase());
        if (foundKey && row.raw[foundKey] !== undefined && row.raw[foundKey] !== null) {
          return String(row.raw[foundKey]).trim();
        }
      }
      return '';
    };

    // 1. Check Primary Key Uniqueness
    const primaryCounts = new Map<string, number>();
    for (const r of rows) {
      const pVal = getVal(r, primaryKey).toUpperCase();
      if (!pVal) continue;
      primaryCounts.set(pVal, (primaryCounts.get(pVal) || 0) + 1);
    }

    const duplicates: { value: string; count: number }[] = [];
    for (const [val, count] of primaryCounts.entries()) {
      if (count > 1) {
        duplicates.push({ value: val, count });
      }
    }

    if (duplicates.length === 0) {
      return {
        is_unique: true,
        total_records: rows.length,
        unique_values_count: primaryCounts.size,
        duplicate_values: [],
        requires_secondary: false,
        message: `Verified! All ${rows.length} records have unique "${primaryKey}" values.`,
      };
    }

    // If duplicates exist in primary key and no secondary key is selected
    if (!secondaryKey) {
      return {
        is_unique: false,
        total_records: rows.length,
        unique_values_count: primaryCounts.size,
        duplicate_values: duplicates.slice(0, 10),
        requires_secondary: true,
        message: `Duplicate primary key detected: "${primaryKey}" has ${duplicates.length} duplicate values affecting ${duplicates.reduce((acc, d) => acc + d.count, 0)} records. Please select a secondary verification key.`,
      };
    }

    // 2. Validate Composite Key (Primary + Secondary)
    const compositeCounts = new Map<string, number>();
    for (const r of rows) {
      const pVal = getVal(r, primaryKey).toUpperCase();
      const sVal = getVal(r, secondaryKey).toUpperCase();
      const composite = `${pVal}:::${sVal}`;
      compositeCounts.set(composite, (compositeCounts.get(composite) || 0) + 1);
    }

    const compositeDups: { value: string; count: number }[] = [];
    for (const [comp, count] of compositeCounts.entries()) {
      if (count > 1) {
        const [p, s] = comp.split(':::');
        compositeDups.push({ value: `${primaryKey}: ${p} + ${secondaryKey}: ${s}`, count });
      }
    }

    if (compositeDups.length === 0) {
      return {
        is_unique: true,
        total_records: rows.length,
        unique_values_count: compositeCounts.size,
        duplicate_values: [],
        requires_secondary: true,
        message: `Verified! Combining "${primaryKey}" + "${secondaryKey}" uniquely identifies all ${rows.length} attendees.`,
      };
    }

    return {
      is_unique: false,
      total_records: rows.length,
      unique_values_count: compositeCounts.size,
      duplicate_values: compositeDups.slice(0, 10),
      requires_secondary: true,
      message: `Combination of "${primaryKey}" + "${secondaryKey}" still contains ${compositeDups.length} duplicate pairs. Please select a different secondary key.`,
    };
  }

  async deleteEvent(eventId: string, adminId: string, permanentPurge: boolean = false): Promise<boolean> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) return false;

    const supabase = this.getClient();

    if (permanentPurge) {
      if (supabase) {
        const { error } = await supabase.from('events').delete().eq('id', eventId).eq('admin_id', adminId);
        if (error) throw new Error(`Failed to delete event: ${error.message}`);
      }
      this.inMemoryDB.students = this.inMemoryDB.students.filter((s) => s.event_id !== eventId);
      this.inMemoryDB.scanner_accounts = this.inMemoryDB.scanner_accounts.filter((sc) => sc.event_id !== eventId);
      this.inMemoryDB.check_ins = this.inMemoryDB.check_ins.filter((c) => c.event_id !== eventId);
      this.inMemoryDB.scan_attempts = this.inMemoryDB.scan_attempts.filter((a) => a.event_id !== eventId);
      this.inMemoryDB.activity_logs = this.inMemoryDB.activity_logs.filter((al) => al.event_id !== eventId);
      this.inMemoryDB.scanner_referral_codes = this.inMemoryDB.scanner_referral_codes.filter((r) => r.event_id !== eventId);
      this.inMemoryDB.scanner_access_requests = this.inMemoryDB.scanner_access_requests.filter((r) => r.event_id !== eventId);
      this.inMemoryDB.events = this.inMemoryDB.events.filter((e) => e.id !== eventId);
    } else {
      const now = new Date().toISOString();
      if (supabase) {
        const { error } = await supabase.from('events').update({ status: 'DELETED', deleted_at: now }).eq('id', eventId).eq('admin_id', adminId);
        if (error) throw new Error(`Failed to archive event: ${error.message}`);
        await supabase.from('scanner_access_requests').delete().eq('event_id', eventId);
        await supabase.from('scanner_referral_codes').delete().eq('event_id', eventId);
      }
      event.status = 'DELETED';
      event.deleted_at = now;
      this.inMemoryDB.scanner_access_requests = this.inMemoryDB.scanner_access_requests.filter((r) => r.event_id !== eventId);
      this.inMemoryDB.scanner_referral_codes = this.inMemoryDB.scanner_referral_codes.filter((r) => r.event_id !== eventId);
      await this.logActivity(eventId, adminId, event.admin_name, 'event_deleted', `Event "${event.title}" was deleted.`);
    }

    return true;
  }

  // --- REFERRAL CODES FOR SCANNER ACCESS ---
  async createReferralCode(
    eventId: string,
    adminId: string,
    expiresAt?: string,
    maxUses: number = 5
  ): Promise<ScannerReferralCode> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    // Generate cryptographic clean referral code format: e.g. GTS26-K7P9
    const prefix = event.title
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 5)
      .toUpperCase() || 'ADM';
    const randPart = crypto.randomBytes(3).toString('hex').substring(0, 4).toUpperCase();
    const code = `${prefix}-${randPart}`;

    const newReferral: ScannerReferralCode = {
      id: generateId(),
      event_id: eventId,
      code,
      created_by: adminId,
      status: 'ACTIVE',
      max_uses: maxUses,
      times_used: 0,
      expires_at: null, // Scanner referral codes never expire until the event is deleted
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      event_title: event.title,
      event_venue: event.venue,
    };

    const supabase = this.getClient();
    if (supabase) {
      const insertPayload: any = {
        id: newReferral.id,
        event_id: newReferral.event_id,
        code: newReferral.code,
        created_by: newReferral.created_by,
        status: newReferral.status,
        max_uses: newReferral.max_uses,
        times_used: newReferral.times_used,
        expires_at: newReferral.expires_at,
        created_at: newReferral.created_at,
        updated_at: newReferral.updated_at,
      };

      let { error } = await supabase.from('scanner_referral_codes').insert(insertPayload);
      if (error && (error.message?.includes('max_uses') || error.message?.includes('schema cache'))) {
        // Fallback without max_uses/times_used if schema cache hadn't refreshed yet
        delete insertPayload.max_uses;
        delete insertPayload.times_used;
        const retry = await supabase.from('scanner_referral_codes').insert(insertPayload);
        error = retry.error;
      }

      if (error) {
        console.error('[Supabase DB] Error creating referral code:', error);
        throw new Error(`Failed to create referral code: ${error.message}`);
      }
    }

    this.inMemoryDB.scanner_referral_codes.push(newReferral);

    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      'scanner_referral_created',
      `Created scanner referral access code "${code}".`
    );

    return newReferral;
  }

  async getReferralCodes(eventId: string, adminId: string): Promise<ScannerReferralCode[]> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_referral_codes')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Supabase DB] Error getting referral codes:', error);
        throw new Error(`Database error fetching referral codes: ${error.message}`);
      }
      return ((data as ScannerReferralCode[]) || []).map((r) => ({
        ...r,
        event_title: event.title,
        event_venue: event.venue,
      }));
    }

    return this.inMemoryDB.scanner_referral_codes
      .filter((r) => r.event_id === eventId)
      .map((r) => ({ ...r, event_title: event.title, event_venue: event.venue }));
  }

  async toggleReferralCode(
    codeId: string,
    eventId: string,
    adminId: string,
    status: 'ACTIVE' | 'DISABLED'
  ): Promise<ScannerReferralCode | null> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const now = new Date().toISOString();
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_referral_codes')
        .update({ status, updated_at: now })
        .eq('id', codeId)
        .eq('event_id', eventId)
        .select('*')
        .single();

      if (error) {
        console.error('[Supabase DB] Error toggling referral code:', error);
        throw new Error(`Database error toggling referral code: ${error.message}`);
      }
      return { ...(data as ScannerReferralCode), event_title: event.title, event_venue: event.venue };
    }

    const code = this.inMemoryDB.scanner_referral_codes.find((c) => c.id === codeId && c.event_id === eventId);
    if (!code) return null;
    code.status = status;
    code.updated_at = now;
    return { ...code, event_title: event.title, event_venue: event.venue };
  }

  async getReferralCodeByValue(codeRaw: string): Promise<{ referral: ScannerReferralCode; event: EventItem } | null> {
    const cleanCode = (codeRaw || '').trim().toUpperCase();
    if (!cleanCode) return null;

    const supabase = this.getClient();
    let refRecord: ScannerReferralCode | null = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_referral_codes')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (error) {
        console.error('[Supabase DB] Error looking up referral code:', error);
        throw new Error(`Database error looking up referral code: ${error.message}`);
      }
      if (data) refRecord = data as ScannerReferralCode;
    } else {
      refRecord = this.inMemoryDB.scanner_referral_codes.find((c) => c.code.toUpperCase() === cleanCode) || null;
    }

    if (!refRecord) return null;

    if (refRecord.status !== 'ACTIVE') {
      return null;
    }

    // Scanner referral codes never expire by timestamp; they remain valid until the event is deleted
    const event = await this.getEventById(refRecord.event_id);
    if (!event || event.status === 'DELETED') return null;

    return { referral: refRecord, event };
  }

  // --- SCANNER ACCESS REQUESTS & APPROVALS ---
  async createScannerAccessRequest(
    userId: string,
    userEmail: string,
    userName: string,
    referralCodeString: string
  ): Promise<ScannerAccessRequest> {
    const lookup = await this.getReferralCodeByValue(referralCodeString);
    if (!lookup) {
      throw new Error('Invalid, disabled, or expired scanner referral code.');
    }

    const { referral, event } = lookup;

    const maxUses = referral.max_uses ?? 5;
    const timesUsed = referral.times_used ?? 0;
    if (timesUsed >= maxUses) {
      throw new Error(`This referral code has reached its maximum redemption limit (${maxUses} users).`);
    }

    const cleanEmail = userEmail.toLowerCase().trim();
    const cleanName = userName.trim();

    const supabase = this.getClient();
    let requests: ScannerAccessRequest[] = [];

    if (supabase) {
      const { data } = await supabase
        .from('scanner_access_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', event.id)
        .order('requested_at', { ascending: false });
      if (data) requests = data as ScannerAccessRequest[];
    } else {
      requests = this.inMemoryDB.scanner_access_requests
        .filter((r) => r.user_id === userId && r.event_id === event.id)
        .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
    }

    const now = new Date().toISOString();

    // 1. Check if user is blocked from requesting access
    const blockedReq = requests.find((r) => r.is_blocked || r.status === 'BLOCKED');
    if (blockedReq) {
      throw new Error('You have been blocked from requesting access to this event by the administrator.');
    }

    // 2. Check if already PENDING - return existing, do not create duplicate
    const pendingReq = requests.find((r) => r.status === 'PENDING');
    if (pendingReq) {
      return {
        ...pendingReq,
        event_title: event.title,
        event_venue: event.venue,
        admin_name: event.admin_name,
        admin_email: event.admin_email,
      };
    }

    // 3. Check if already APPROVED - return existing, do not create duplicate
    const approvedReq = requests.find((r) => r.status === 'APPROVED');
    if (approvedReq) {
      return {
        ...approvedReq,
        event_title: event.title,
        event_venue: event.venue,
        admin_name: event.admin_name,
        admin_email: event.admin_email,
      };
    }

    // 4. Check if latest request was REJECTED - enforce 30-minute cooldown
    const latestReq = requests[0];
    if (latestReq && latestReq.status === 'REJECTED') {
      const rejectionTime = new Date(latestReq.reviewed_at || latestReq.updated_at).getTime();
      const elapsedMs = Date.now() - rejectionTime;
      const cooldownMs = 30 * 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        const remainingMin = Math.ceil(remainingSec / 60);
        const err: any = new Error(`Your access request was rejected. You can request access again after the cooldown period (${remainingMin} min remaining).`);
        err.code = 'COOLDOWN_ACTIVE';
        err.remainingSeconds = remainingSec;
        throw err;
      }
    }

    // 5. Cooldown elapsed or fresh request: Create a NEW request attempt row (preserving previous rejection history)
    const newRequest: ScannerAccessRequest = {
      id: generateId(),
      user_id: userId,
      user_email: cleanEmail,
      user_name: cleanName,
      event_id: event.id,
      referral_code_id: referral.id,
      referral_code: referral.code,
      scanner_id: null,
      gate_name: 'Main Gate',
      status: 'PENDING',
      is_blocked: false,
      requested_at: now,
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      expires_at: null,
      created_at: now,
      updated_at: now,
    };

    if (supabase) {
      const insertReqPayload: any = {
        id: newRequest.id,
        user_id: newRequest.user_id,
        user_email: newRequest.user_email,
        user_name: newRequest.user_name,
        event_id: newRequest.event_id,
        referral_code_id: newRequest.referral_code_id,
        referral_code: newRequest.referral_code,
        scanner_id: newRequest.scanner_id,
        gate_name: newRequest.gate_name,
        status: newRequest.status,
        is_blocked: false,
        requested_at: newRequest.requested_at,
        reviewed_at: newRequest.reviewed_at,
        reviewed_by: newRequest.reviewed_by,
        rejection_reason: newRequest.rejection_reason,
        expires_at: newRequest.expires_at,
        created_at: newRequest.created_at,
        updated_at: newRequest.updated_at,
      };

      let { error } = await supabase.from('scanner_access_requests').insert(insertReqPayload);
      if (error && (error.message?.includes('referral_code') || error.message?.includes('schema cache'))) {
        delete insertReqPayload.referral_code;
        const retry = await supabase.from('scanner_access_requests').insert(insertReqPayload);
        error = retry.error;
      }

      if (error) {
        // If unique active index collision occurred (e.g. concurrent submission), fetch existing active request
        if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
          const { data: activeData } = await supabase
            .from('scanner_access_requests')
            .select('*')
            .eq('user_id', userId)
            .eq('event_id', event.id)
            .in('status', ['PENDING', 'APPROVED'])
            .maybeSingle();
          if (activeData) {
            return {
              ...(activeData as ScannerAccessRequest),
              event_title: event.title,
              event_venue: event.venue,
              admin_name: event.admin_name,
              admin_email: event.admin_email,
            };
          }
        }
        console.error('[Supabase DB] Error inserting access request:', error);
        throw new Error(`Failed to record access request: ${error.message}`);
      }
    }

    this.inMemoryDB.scanner_access_requests.push(newRequest);

    // Increment referral code usage count
    referral.times_used = timesUsed + 1;
    if (supabase) {
      await supabase
        .from('scanner_referral_codes')
        .update({ times_used: referral.times_used })
        .eq('id', referral.id);
    }

    await this.logActivity(
      event.id,
      userId,
      cleanName,
      'scanner_access_requested',
      `User ${cleanName} (${cleanEmail}) requested scanner access via code "${referral.code}".`
    );

    return {
      ...newRequest,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email,
    };
  }

  async getMyScannerAccess(userId: string, eventId?: string): Promise<ScannerAccessRequest | null> {
    const supabase = this.getClient();
    let requests: ScannerAccessRequest[] = [];

    if (supabase) {
      let query = supabase
        .from('scanner_access_requests')
        .select('*')
        .eq('user_id', userId);
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      query = query.order('requested_at', { ascending: false });
      const { data, error } = await query;
      if (error) {
        console.error('[Supabase DB] Error getting my scanner access:', error);
        throw new Error(`Database error fetching scanner access: ${error.message}`);
      }
      requests = (data as ScannerAccessRequest[]) || [];
    } else {
      requests = this.inMemoryDB.scanner_access_requests
        .filter((r) => r.user_id === userId && (!eventId || r.event_id === eventId))
        .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
    }

    if (requests.length === 0) return null;

    // Prioritize active requests: first APPROVED, then PENDING, then latest attempt
    let request = requests.find((r) => r.status === 'APPROVED')
      || requests.find((r) => r.status === 'PENDING')
      || requests[0];

    // Verify target event exists and is not deleted
    const event = await this.getEventById(request.event_id);
    if (!event || event.status === 'DELETED') {
      return null;
    }

    // Verify event admin/owner still exists
    const adminProfile = await this.getProfileById(event.admin_id);
    if (!adminProfile) {
      return null;
    }

    // Calculate 30-minute rejection cooldown
    let cooldownRemainingSeconds = 0;
    let canRerequest = false;

    if (request.is_blocked || request.status === 'BLOCKED') {
      cooldownRemainingSeconds = 0;
      canRerequest = false;
    } else if (request.status === 'REJECTED') {
      const rejectionTime = new Date(request.reviewed_at || request.updated_at).getTime();
      const cooldownMs = 30 * 60 * 1000;
      const elapsedMs = Date.now() - rejectionTime;
      if (elapsedMs < cooldownMs) {
        cooldownRemainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        canRerequest = false;
      } else {
        cooldownRemainingSeconds = 0;
        canRerequest = true;
      }
    } else if (request.status === 'REVOKED') {
      cooldownRemainingSeconds = 0;
      canRerequest = true;
    }

    let referralCode = request.referral_code;
    if (!referralCode && request.referral_code_id) {
      if (supabase) {
        const { data: refData } = await supabase
          .from('scanner_referral_codes')
          .select('code')
          .eq('id', request.referral_code_id)
          .maybeSingle();
        if (refData?.code) referralCode = refData.code;
      } else {
        const found = this.inMemoryDB.scanner_referral_codes.find((c) => c.id === request.referral_code_id);
        if (found) referralCode = found.code;
      }
    }

    return {
      ...request,
      referral_code: referralCode,
      cooldown_remaining_seconds: cooldownRemainingSeconds,
      can_rerequest: canRerequest,
      event,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email,
    };
  }

  async getScannerRequestsByEvent(eventId: string, adminId: string): Promise<ScannerAccessRequest[]> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const supabase = this.getClient();
    let list: ScannerAccessRequest[] = [];

    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_access_requests')
        .select('*')
        .eq('event_id', eventId)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('[Supabase DB] Error getting scanner requests:', error);
        throw new Error(`Database error fetching scanner requests: ${error.message}`);
      }
      list = (data as ScannerAccessRequest[]) || [];
    } else {
      list = this.inMemoryDB.scanner_access_requests
        .filter((r) => r.event_id === eventId)
        .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
    }

    const refCodes = await this.getReferralCodes(eventId, adminId).catch(() => []);
    const codeMap = new Map<string, string>();
    for (const c of refCodes) {
      codeMap.set(c.id, c.code);
    }

    return list.map((r) => ({
      ...r,
      referral_code: (r.referral_code || (r.referral_code_id ? codeMap.get(r.referral_code_id) : undefined) || 'Direct Referral') as string,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email,
    }));
  }

  async approveScannerRequest(
    requestId: string,
    eventId: string,
    adminId: string,
    scannerId?: string,
    gateName?: string,
    durationHours?: number
  ): Promise<ScannerAccessRequest> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const now = new Date();
    let expiresAt: string | null = null;
    if (durationHours && durationHours > 0) {
      expiresAt = new Date(now.getTime() + durationHours * 3600 * 1000).toISOString();
    }

    const assignedGate = (gateName || 'Main Gate').trim();
    const updatePayload = {
      status: 'APPROVED',
      scanner_id: scannerId || null,
      gate_name: assignedGate,
      reviewed_by: adminId,
      reviewed_at: now.toISOString(),
      rejection_reason: null,
      expires_at: expiresAt,
      updated_at: now.toISOString(),
    };

    const supabase = this.getClient();
    let updated: ScannerAccessRequest | null = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_access_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .eq('event_id', eventId)
        .select('*')
        .single();

      if (error) {
        console.error('[Supabase DB] Error approving scanner request:', error);
        throw new Error(`Failed to approve scanner request: ${error.message}`);
      }
      updated = data as ScannerAccessRequest;
    } else {
      const req = this.inMemoryDB.scanner_access_requests.find((r) => r.id === requestId && r.event_id === eventId);
      if (!req) throw new Error('Request not found');
      Object.assign(req, updatePayload);
      updated = req;
    }

    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      'scanner_access_approved',
      `Approved scanner access for ${updated.user_name} (${updated.user_email}) at ${assignedGate}.`
    );

    return {
      ...updated,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email,
    };
  }

  async rejectScannerRequest(
    requestId: string,
    eventId: string,
    adminId: string,
    reason?: string
  ): Promise<ScannerAccessRequest> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const now = new Date().toISOString();
    const updatePayload = {
      status: 'REJECTED',
      rejection_reason: (reason || 'Access denied by event administrator.').trim(),
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now,
    };

    const supabase = this.getClient();
    let updated: ScannerAccessRequest | null = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_access_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .eq('event_id', eventId)
        .select('*')
        .single();

      if (error) {
        console.error('[Supabase DB] Error rejecting scanner request:', error);
        throw new Error(`Failed to reject scanner request: ${error.message}`);
      }
      updated = data as ScannerAccessRequest;
    } else {
      const req = this.inMemoryDB.scanner_access_requests.find((r) => r.id === requestId && r.event_id === eventId);
      if (!req) throw new Error('Request not found');
      Object.assign(req, updatePayload);
      updated = req;
    }

    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      'scanner_access_rejected',
      `Rejected scanner access request from ${updated.user_name} (${updated.user_email}). Reason: ${updatePayload.rejection_reason}`
    );

    return {
      ...updated,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email,
    };
  }

  async revokeScannerRequest(
    requestId: string,
    eventId: string,
    adminId: string
  ): Promise<ScannerAccessRequest> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const now = new Date().toISOString();
    const updatePayload = {
      status: 'REVOKED',
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now,
    };

    const supabase = this.getClient();
    let updated: ScannerAccessRequest | null = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_access_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .eq('event_id', eventId)
        .select('*')
        .single();

      if (error) {
        console.error('[Supabase DB] Error revoking scanner request:', error);
        throw new Error(`Failed to revoke scanner access: ${error.message}`);
      }
      updated = data as ScannerAccessRequest;
    } else {
      const req = this.inMemoryDB.scanner_access_requests.find((r) => r.id === requestId && r.event_id === eventId);
      if (!req) throw new Error('Request not found');
      Object.assign(req, updatePayload);
      updated = req;
    }

    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      'scanner_access_revoked',
      `Revoked scanner access for ${updated.user_name} (${updated.user_email}) at ${updated.gate_name}.`
    );

    return {
      ...updated,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email,
    };
  }

  async blockScannerUser(
    requestId: string,
    eventId: string,
    adminId: string
  ): Promise<ScannerAccessRequest> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const now = new Date().toISOString();
    const updatePayload = {
      status: 'BLOCKED',
      is_blocked: true,
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now,
    };

    const supabase = this.getClient();
    let updated: ScannerAccessRequest | null = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_access_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .eq('event_id', eventId)
        .select('*')
        .single();

      if (error) {
        console.error('[Supabase DB] Error blocking scanner user:', error);
        throw new Error(`Failed to block scanner operator: ${error.message}`);
      }
      updated = data as ScannerAccessRequest;
    } else {
      const req = this.inMemoryDB.scanner_access_requests.find((r) => r.id === requestId && r.event_id === eventId);
      if (!req) throw new Error('Request not found');
      Object.assign(req, updatePayload);
      updated = req;
    }

    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      'scanner_access_blocked',
      `Blocked scanner operator ${updated.user_name} (${updated.user_email}) from requesting access.`
    );

    return {
      ...updated,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email,
    };
  }

  async unblockScannerUser(
    requestId: string,
    eventId: string,
    adminId: string
  ): Promise<ScannerAccessRequest> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const now = new Date().toISOString();
    const updatePayload = {
      status: 'REVOKED',
      is_blocked: false,
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now,
    };

    const supabase = this.getClient();
    let updated: ScannerAccessRequest | null = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_access_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .eq('event_id', eventId)
        .select('*')
        .single();

      if (error) {
        console.error('[Supabase DB] Error unblocking scanner user:', error);
        throw new Error(`Failed to unblock scanner operator: ${error.message}`);
      }
      updated = data as ScannerAccessRequest;
    } else {
      const req = this.inMemoryDB.scanner_access_requests.find((r) => r.id === requestId && r.event_id === eventId);
      if (!req) throw new Error('Request not found');
      Object.assign(req, updatePayload);
      updated = req;
    }

    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      'scanner_access_unblocked',
      `Unblocked scanner operator ${updated.user_name} (${updated.user_email}). Operator is now permitted to request access.`
    );

    return {
      ...updated,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email,
    };
  }

  async deleteScannerAccessRequest(requestId: string, eventId?: string, adminId?: string): Promise<boolean> {
    if (eventId && adminId) {
      const event = await this.getEventById(eventId, adminId);
      if (!event) throw new Error('Unauthorized or event not found');
    }

    const supabase = this.getClient();
    if (supabase) {
      let query = supabase.from('scanner_access_requests').delete().eq('id', requestId);
      if (eventId) query = query.eq('event_id', eventId);
      const { error } = await query;
      if (error) throw new Error(`Database error deleting scanner request: ${error.message}`);
    }
    this.inMemoryDB.scanner_access_requests = this.inMemoryDB.scanner_access_requests.filter(
      (r) => r.id !== requestId
    );
    return true;
  }

  async validateScannerEventAccess(
    userId: string,
    eventId: string
  ): Promise<{ authorized: boolean; gateName: string; scannerId?: string; reason?: string }> {
    // 1. If user is the event owner/admin, allow directly
    const event = await this.getEventById(eventId);
    if (!event || event.status === 'DELETED') {
      return { authorized: false, gateName: '', reason: 'Event has been deleted or not found.' };
    }

    // Verify event owner/admin still exists
    const adminProfile = await this.getProfileById(event.admin_id);
    if (!adminProfile) {
      return { authorized: false, gateName: '', reason: 'Event organizer account no longer exists.' };
    }

    if (event.admin_id === userId) {
      return { authorized: true, gateName: 'Admin Terminal' };
    }

    // 2. Check direct scanner account
    const scanner = await this.getScannerById(userId);
    if (scanner) {
      if (scanner.event_id !== eventId) {
        return { authorized: false, gateName: '', reason: 'Scanner is not authorized for this event.' };
      }
      if (!scanner.is_active) {
        return { authorized: false, gateName: '', reason: 'Scanner account is disabled.' };
      }
      return { authorized: true, gateName: scanner.name, scannerId: scanner.id };
    }

    // 3. Check approved scanner access request
    const supabase = this.getClient();
    let request: ScannerAccessRequest | null = null;

    if (supabase) {
      const { data } = await supabase
        .from('scanner_access_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .eq('status', 'APPROVED')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) request = data as ScannerAccessRequest;
    } else {
      request =
        this.inMemoryDB.scanner_access_requests.find(
          (r) => r.user_id === userId && r.event_id === eventId && r.status === 'APPROVED'
        ) || null;
    }

    if (!request) {
      return { authorized: false, gateName: '', reason: 'No approved scanner access found for this event.' };
    }

    if (request.is_blocked || request.status === 'BLOCKED') {
      return { authorized: false, gateName: '', reason: 'Scanner operator access has been blocked by administrator.' };
    }

    return { authorized: true, gateName: request.gate_name, scannerId: request.scanner_id || undefined };
  }

  // --- ATTENDEES / STUDENTS ---
  async getStudents(
    eventId: string,
    adminId?: string,
    search?: string,
    branch?: string,
    checkedInFilter?: string,
    limit?: number,
    offset: number = 0
  ): Promise<Student[]> {
    const event = await this.getEventById(eventId);
    if (!event) throw new Error('Unauthorized or event not found');

    const supabase = this.getClient();
    let list: Student[] = [];
    let checkInsList: CheckIn[] = [];

    if (supabase) {
      const { data: studentsData, error: stErr } = await supabase
        .from('students')
        .select('*')
        .eq('event_id', eventId)
        .order('sl_no', { ascending: true });

      if (stErr) {
        console.error('[Supabase DB] Error fetching students:', stErr);
        throw new Error(`Database error fetching attendees: ${stErr.message}`);
      }
      list = (studentsData as Student[]) || [];

      const { data: chkData, error: chkErr } = await supabase
        .from('check_ins')
        .select('*')
        .eq('event_id', eventId);

      if (chkErr) {
        console.error('[Supabase DB] Error fetching check_ins:', chkErr);
        throw new Error(`Database error fetching check_ins: ${chkErr.message}`);
      }
      checkInsList = (chkData as CheckIn[]) || [];
    } else {
      list = this.inMemoryDB.students.filter((s) => s.event_id === eventId);
      checkInsList = this.inMemoryDB.check_ins.filter((c) => c.event_id === eventId);
    }

    const checkedInMap = new Map<string, CheckIn>();
    checkInsList.forEach((c) => checkedInMap.set(c.student_id, c));

    let enriched = list.map((s) => {
      const checkin = checkedInMap.get(s.id);
      return {
        ...s,
        is_checked_in: Boolean(checkin),
        checked_in_at: checkin?.check_in_at,
        scan_type: checkin?.scan_type,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.usn.toLowerCase().includes(q) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          s.qr_code.toLowerCase().includes(q) ||
          s.barcode.toLowerCase().includes(q)
      );
    }

    if (branch && branch !== 'ALL') {
      enriched = enriched.filter((s) => s.branch === branch);
    }

    if (checkedInFilter === 'CHECKED_IN') {
      enriched = enriched.filter((s) => s.is_checked_in);
    } else if (checkedInFilter === 'NOT_CHECKED_IN') {
      enriched = enriched.filter((s) => !s.is_checked_in);
    }

    if (limit !== undefined && limit > 0) {
      return enriched.slice(offset, offset + limit);
    }
    return offset > 0 ? enriched.slice(offset) : enriched;
  }

  async createStudent(eventId: string, adminId: string, data: Partial<Student>): Promise<Student> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const usnClean = (data.usn || '').trim().toUpperCase();
    if (!usnClean) throw new Error('USN is required');

    if (data.meta && JSON.stringify(data.meta).length > 32768) {
      throw new Error('Student metadata exceeds maximum allowed payload of 32KB');
    }

    const supabase = this.getClient();

    if (supabase) {
      const { data: existing, error: exErr } = await supabase
        .from('students')
        .select('id')
        .eq('event_id', eventId)
        .eq('usn', usnClean)
        .maybeSingle();

      if (exErr) throw new Error(`Database error checking duplicate USN: ${exErr.message}`);

      if (existing) {
        throw new Error(`Attendee with USN ${usnClean} already exists in this event.`);
      }
    } else {
      const existing = this.inMemoryDB.students.find((s) => s.event_id === eventId && s.usn.toUpperCase() === usnClean);
      if (existing) {
        throw new Error(`Attendee with USN ${usnClean} already exists in this event.`);
      }
    }

    const id = generateId();
    // Cryptographically secure opaque token for QR code (non-guessable, 128-bit CSPRNG)
    const secureToken = `adm_sec_${crypto.randomBytes(16).toString('hex')}`;
    const barcodeRand = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    let count = 0;
    if (supabase) {
      const { count: c, error: cErr } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('event_id', eventId);
      if (cErr) throw new Error(`Database error counting attendees: ${cErr.message}`);
      count = c || 0;
    } else {
      count = this.inMemoryDB.students.filter((s) => s.event_id === eventId).length;
    }

    const student: Student = {
      id,
      event_id: eventId,
      sl_no: data.sl_no || count + 1,
      usn: usnClean,
      name: (data.name || 'Anonymous Attendee').trim(),
      email: data.email?.trim() || '',
      phone_number: data.phone_number?.trim() || '',
      year: data.year?.trim() || 'General',
      section: data.section?.trim() || 'A',
      branch: data.branch?.trim() || 'General',
      qr_code: data.qr_code?.trim() || secureToken,
      barcode: data.barcode?.trim() || barcodeRand,
      meta: data.meta || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase.from('students').insert(student);
      if (error) {
        console.error('[Supabase DB] Error creating student:', error);
        throw new Error(`Failed to create attendee in database: ${error.message}`);
      }
    }

    this.inMemoryDB.students.push(student);
    return student;
  }

  async importStudentsBatch(
    eventId: string,
    adminId: string,
    attendees: Array<{
      sl_no?: number;
      usn: string;
      name: string;
      email?: string;
      phone_number?: string;
      year?: string;
      section?: string;
      branch?: string;
      qr_code?: string;
      barcode?: string;
      meta?: Record<string, any>;
      raw?: Record<string, any>;
    }>,
    scanConfig?: EventScanConfig
  ): Promise<{ imported: number; duplicates: number; errors: string[] }> {
    if (attendees.length > 5000) {
      throw new Error('Maximum batch import limit is 5,000 attendees per request.');
    }

    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    if (scanConfig) {
      await this.updateScanConfig(eventId, adminId, scanConfig);
    }

    const primaryKeyField = scanConfig?.primary_scan_field || event.primary_scan_field || 'usn';
    const secondaryKeyField = scanConfig?.secondary_scan_field || event.secondary_scan_field || '';
    const qrMode = scanConfig?.qr_mode || event.qr_mode || 'SECURE_TOKEN';
    const barcodeField = scanConfig?.barcode_field || event.barcode_field || 'usn';

    const supabase = this.getClient();
    let existingIdentifiers = new Set<string>();

    if (supabase) {
      const { data: existingRows, error: exErr } = await supabase.from('students').select('usn, meta').eq('event_id', eventId);
      if (exErr) throw new Error(`Database error fetching existing attendees: ${exErr.message}`);
      if (existingRows) {
        existingRows.forEach((r: any) => {
          const val = (r[primaryKeyField] || r.meta?.[primaryKeyField] || r.usn || '').toString().trim().toUpperCase();
          if (val) existingIdentifiers.add(val);
        });
      }
    } else {
      this.inMemoryDB.students
        .filter((s) => s.event_id === eventId)
        .forEach((s) => {
          const val = ((s as any)[primaryKeyField] || s.meta?.[primaryKeyField] || s.usn || '').toString().trim().toUpperCase();
          if (val) existingIdentifiers.add(val);
        });
    }

    let imported = 0;
    let duplicates = 0;
    const errors: string[] = [];
    const newStudentsToInsert: Student[] = [];

    let currentSlNo = existingIdentifiers.size;

    for (let i = 0; i < attendees.length; i++) {
      const row = attendees[i];
      const rowMeta = row.meta || row.raw || {};
      if (Buffer.byteLength(JSON.stringify(rowMeta), 'utf8') > 32768) {
        errors.push(`Row ${i + 1}: Metadata payload exceeds 32KB limit.`);
        continue;
      }

      const usnClean = (row.usn || (row.meta && row.meta[primaryKeyField]) || `ATT-${i + 1}`).toString().trim().toUpperCase();

      if (!usnClean && !row.name) {
        errors.push(`Row ${i + 1}: Missing required identifier or name.`);
        continue;
      }

      if (existingIdentifiers.has(usnClean)) {
        duplicates++;
        continue;
      }

      currentSlNo++;
      const id = generateId();
      const barcodeRand = Math.floor(1000000000 + Math.random() * 9000000000).toString();

      // Generate QR Code payload based on qr_mode
      let generatedQr = row.qr_code?.trim();
      if (!generatedQr) {
        if (qrMode === 'FULL_DATA') {
          generatedQr = JSON.stringify({
            type: 'ADMITTO_ATTENDEE',
            version: 1,
            event_id: eventId,
            usn: usnClean,
            name: row.name?.trim() || 'Attendee',
            email: row.email?.trim() || undefined,
            phone: row.phone_number?.trim() || undefined,
            branch: row.branch?.trim() || undefined,
            year: row.year?.trim() || undefined,
            section: row.section?.trim() || undefined,
            meta: row.meta || undefined,
          });
        } else {
          // Cryptographically secure opaque token (non-guessable, 128-bit CSPRNG)
          const attendeeToken = `adm_sec_${crypto.randomBytes(16).toString('hex')}`;
          generatedQr = JSON.stringify({
            type: 'ADMITTO_ATTENDEE',
            event_id: eventId,
            attendee_token: attendeeToken,
            version: 1,
          });
        }
      }

      // Generate Barcode value based on barcode_field
      let generatedBarcode = row.barcode?.trim();
      if (!generatedBarcode) {
        if (barcodeField === 'primary_key' || barcodeField === primaryKeyField || barcodeField === 'usn') {
          generatedBarcode = usnClean;
        } else if (barcodeField === 'secondary_key' || (secondaryKeyField && barcodeField === secondaryKeyField)) {
          const secVal = (row.meta && row.meta[secondaryKeyField]) || row.email || row.phone_number || usnClean;
          generatedBarcode = String(secVal).trim();
        } else if (barcodeField === 'token' || barcodeField === 'secure_token') {
          generatedBarcode = barcodeRand;
        } else if (barcodeField && row.meta && row.meta[barcodeField]) {
          generatedBarcode = String(row.meta[barcodeField]).trim();
        } else if (barcodeField && (row as any)[barcodeField]) {
          generatedBarcode = String((row as any)[barcodeField]).trim();
        } else {
          generatedBarcode = usnClean || barcodeRand;
        }
      }

      const newStudent: Student = {
        id,
        event_id: eventId,
        sl_no: row.sl_no || currentSlNo,
        usn: usnClean,
        name: (row.name || 'Attendee').trim(),
        email: row.email?.trim() || '',
        phone_number: row.phone_number?.trim() || '',
        year: row.year?.trim() || 'General',
        section: row.section?.trim() || 'A',
        branch: row.branch?.trim() || 'General',
        qr_code: generatedQr,
        barcode: generatedBarcode,
        meta: row.meta || row.raw || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      newStudentsToInsert.push(newStudent);
      existingIdentifiers.add(usnClean);
      imported++;
    }

    if (newStudentsToInsert.length > 0) {
      if (supabase) {
        const chunkSize = 100;
        for (let i = 0; i < newStudentsToInsert.length; i += chunkSize) {
          const chunk = newStudentsToInsert.slice(i, i + chunkSize);
          const { error } = await supabase.from('students').insert(chunk);
          if (error) {
            console.error('[Supabase DB] Error inserting student chunk:', error);
            throw new Error(`Failed to import attendees chunk into database: ${error.message}`);
          }
        }
      }
      this.inMemoryDB.students.push(...newStudentsToInsert);
    }

    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      'list_imported',
      `Imported ${imported} attendees into ${event.title}. (${duplicates} duplicates skipped).`,
      { total_submitted: attendees.length, imported, duplicates, errors_count: errors.length }
    );

    return { imported, duplicates, errors };
  }

  async toggleStudentCheckIn(studentId: string, isCheckedIn: boolean, adminId?: string): Promise<Student | null> {
    const supabase = this.getClient();
    let student: Student | null = null;

    if (supabase) {
      const { data, error } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle();
      if (error) throw new Error(`Database error fetching attendee: ${error.message}`);
      if (data) student = data as Student;
    } else {
      student = this.inMemoryDB.students.find((s) => s.id === studentId) || null;
    }

    if (!student) return null;

    if (adminId) {
      const event = await this.getEventById(student.event_id, adminId);
      if (!event) throw new Error('Unauthorized');
    }

    const now = new Date().toISOString();

    if (isCheckedIn) {
      if (supabase) {
        const { error } = await supabase.from('check_ins').upsert(
          {
            event_id: student.event_id,
            student_id: student.id,
            scan_type: 'QR',
            check_in_at: now,
            status: 'SUCCESS',
            source: 'online',
          },
          { onConflict: 'event_id,student_id' }
        );
        if (error) throw new Error(`Database error recording check-in: ${error.message}`);
      }
      const existing = this.inMemoryDB.check_ins.find((c) => c.student_id === studentId && c.event_id === student!.event_id);
      if (!existing) {
        this.inMemoryDB.check_ins.push({
          id: generateId(),
          event_id: student.event_id,
          student_id: student.id,
          scan_type: 'QR',
          check_in_at: now,
          status: 'SUCCESS',
          source: 'online',
          created_at: now,
          updated_at: now,
        });
      }
    } else {
      if (supabase) {
        const { error } = await supabase.from('check_ins').delete().eq('event_id', student.event_id).eq('student_id', student.id);
        if (error) throw new Error(`Database error deleting check-in: ${error.message}`);
      }
      this.inMemoryDB.check_ins = this.inMemoryDB.check_ins.filter(
        (c) => !(c.student_id === studentId && c.event_id === student!.event_id)
      );
    }

    return {
      ...student,
      is_checked_in: isCheckedIn,
      checked_in_at: isCheckedIn ? now : undefined,
    };
  }

  async deleteStudent(eventId: string, studentId: string, adminId: string): Promise<boolean> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized');

    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from('students').delete().eq('id', studentId).eq('event_id', eventId);
      if (error) throw new Error(`Database error deleting attendee: ${error.message}`);
    }

    this.inMemoryDB.students = this.inMemoryDB.students.filter((s) => !(s.event_id === eventId && s.id === studentId));
    this.inMemoryDB.check_ins = this.inMemoryDB.check_ins.filter((c) => !(c.event_id === eventId && c.student_id === studentId));
    this.inMemoryDB.scan_attempts = this.inMemoryDB.scan_attempts.filter((a) => !(a.event_id === eventId && a.student_id === studentId));

    return true;
  }

  async deleteStudentById(studentId: string, adminId: string): Promise<boolean> {
    const supabase = this.getClient();
    let eventId: string | null = null;
    if (supabase) {
      const { data, error } = await supabase.from('students').select('event_id').eq('id', studentId).maybeSingle();
      if (error) throw new Error(`Database error fetching attendee event: ${error.message}`);
      if (data) eventId = data.event_id;
    } else {
      const student = this.inMemoryDB.students.find((s) => s.id === studentId);
      if (student) eventId = student.event_id;
    }

    if (!eventId) return false;
    return this.deleteStudent(eventId, studentId, adminId);
  }

  // --- SCANNERS & GATE STATIONS MANAGEMENT ---
  async getScannerById(scannerId: string): Promise<ScannerAccount | null> {
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_accounts')
        .select('*')
        .eq('id', scannerId)
        .maybeSingle();

      if (error) {
        console.error('[Supabase DB] Error fetching scanner by id:', error);
        throw new Error(`Database error fetching scanner: ${error.message}`);
      }
      return (data as ScannerAccount) || null;
    }

    return this.inMemoryDB.scanner_accounts.find((s) => s.id === scannerId) || null;
  }

  async getScannersByEvent(eventId: string, adminId?: string): Promise<ScannerAccount[]> {
    if (adminId) {
      const event = await this.getEventById(eventId, adminId);
      if (!event) throw new Error('Unauthorized');
    }

    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_accounts')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Supabase DB] Error fetching scanners:', error);
        throw new Error(`Database error fetching scanners: ${error.message}`);
      }
      return (data as ScannerAccount[]) || [];
    }

    return this.inMemoryDB.scanner_accounts.filter((s) => s.event_id === eventId);
  }

  async createScanner(
    eventId: string,
    adminId: string,
    data: { name: string; email?: string; access_code?: string; expires_at?: string; password?: string }
  ): Promise<ScannerAccount> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized');

    const cleanCode = (data.access_code || `GATE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`).trim().toUpperCase();
    const cleanEmail = (data.email?.trim() || `${cleanCode.toLowerCase()}@scanner.local`).toLowerCase();
    const cleanName = (data.name || 'Gate Scanner').trim();
    const cleanPassword = data.password?.trim() || cleanCode;

    const supabase = this.getClient();

    if (supabase) {
      const { data: existing, error: exErr } = await supabase
        .from('scanner_accounts')
        .select('id')
        .eq('event_id', eventId)
        .or(`email.eq.${cleanEmail},access_code.eq.${cleanCode}`)
        .maybeSingle();

      if (exErr) throw new Error(`Database error verifying scanner unique constraint: ${exErr.message}`);

      if (existing) {
        throw new Error('A scanner with this email or access code already exists for this event.');
      }
    } else {
      const existing = this.inMemoryDB.scanner_accounts.find(
        (s) => s.event_id === eventId && (s.email.toLowerCase() === cleanEmail || s.access_code.toUpperCase() === cleanCode)
      );
      if (existing) {
        throw new Error('A scanner with this email or access code already exists for this event.');
      }
    }

    const scanner: ScannerAccount = {
      id: generateId(),
      event_id: eventId,
      email: cleanEmail,
      password_hash: cleanPassword,
      access_code: cleanCode,
      name: cleanName,
      role: 'SCANNER',
      is_active: true,
      expires_at: data.expires_at || null,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase.from('scanner_accounts').insert(scanner);
      if (error) {
        console.error('[Supabase DB] Error creating scanner:', error);
        throw new Error(`Failed to create scanner account in database: ${error.message}`);
      }
    }

    this.inMemoryDB.scanner_accounts.push(scanner);
    this.inMemoryDB.passwords[cleanEmail] = cleanPassword;

    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      'scanner_created',
      `Scanner "${scanner.name}" (${scanner.access_code}) created for gate access.`
    );

    return scanner;
  }

  async updateScanner(
    eventId: string,
    scannerId: string,
    adminId: string,
    updates: Partial<ScannerAccount>
  ): Promise<ScannerAccount | null> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized');

    const supabase = this.getClient();
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.is_active === false) {
      notifyScannerInvalidated(scannerId);
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('scanner_accounts')
        .update(updatedData)
        .eq('id', scannerId)
        .eq('event_id', eventId)
        .select('*')
        .single();

      if (error) {
        console.error('[Supabase DB] Error updating scanner:', error);
        throw new Error(`Failed to update scanner in database: ${error.message}`);
      }
      return data as ScannerAccount;
    }

    const scanner = this.inMemoryDB.scanner_accounts.find((s) => s.id === scannerId && s.event_id === eventId);
    if (!scanner) return null;
    Object.assign(scanner, updatedData);
    return scanner;
  }

  async toggleScannerStatusById(scannerId: string, adminId: string, isActive: boolean): Promise<ScannerAccount | null> {
    const supabase = this.getClient();
    let eventId: string | null = null;
    if (supabase) {
      const { data: sData, error: sErr } = await supabase.from('scanner_accounts').select('event_id').eq('id', scannerId).maybeSingle();
      if (sErr) throw new Error(`Database error looking up scanner: ${sErr.message}`);
      if (sData) eventId = sData.event_id;
    } else {
      const s = this.inMemoryDB.scanner_accounts.find((item) => item.id === scannerId);
      if (s) eventId = s.event_id;
    }

    if (!eventId) throw new Error('Scanner account not found');
    return this.updateScanner(eventId, scannerId, adminId, { is_active: isActive });
  }

  async deleteScanner(eventId: string, scannerId: string, adminId: string): Promise<boolean> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized');

    notifyScannerInvalidated(scannerId);

    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from('scanner_accounts').delete().eq('id', scannerId).eq('event_id', eventId);
      if (error) throw new Error(`Failed to delete scanner from database: ${error.message}`);
    }
    this.inMemoryDB.scanner_accounts = this.inMemoryDB.scanner_accounts.filter(
      (s) => !(s.id === scannerId && s.event_id === eventId)
    );
    return true;
  }

  async deleteScannerById(scannerId: string, adminId: string): Promise<boolean> {
    const supabase = this.getClient();
    let eventId: string | null = null;
    if (supabase) {
      const { data: sData, error: sErr } = await supabase.from('scanner_accounts').select('event_id').eq('id', scannerId).maybeSingle();
      if (sErr) throw new Error(`Database error looking up scanner: ${sErr.message}`);
      if (sData) eventId = sData.event_id;
    } else {
      const s = this.inMemoryDB.scanner_accounts.find((item) => item.id === scannerId);
      if (s) eventId = s.event_id;
    }

    if (!eventId) throw new Error('Scanner account not found');
    return this.deleteScanner(eventId, scannerId, adminId);
  }

  // --- CENTRALIZED ATOMIC CHECK-IN ENGINE ---
  async processCheckIn(params: {
    eventId: string;
    scannedValue: string;
    scanType: ScanType;
    scannerId?: string;
    clientScanId?: string;
    source?: 'online' | 'offline_sync';
    secondaryValue?: string;
  }): Promise<ScanValidationResult> {
    const { eventId, scannedValue, scanType, scannerId, clientScanId, source = 'online', secondaryValue } = params;
    const cleanVal = (scannedValue || '').trim();
    const cleanSecVal = (secondaryValue || '').trim();

    if (!cleanVal) {
      return {
        success: false,
        status: 'INVALID_TOKEN',
        message: 'No QR or barcode data provided.',
      };
    }

    const supabase = this.getClient();

    // If Supabase is active, execute atomic RPC stored procedure
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('process_check_in_atomic', {
          p_event_id: eventId,
          p_scanned_value: cleanVal,
          p_scan_type: scanType,
          p_scanner_id: scannerId || null,
          p_client_scan_id: clientScanId || null,
          p_source: source,
          p_secondary_value: cleanSecVal || null,
        });

        if (error) {
          console.error('[Supabase DB] RPC check-in error:', error);
          throw new Error(`Database atomic check-in error: ${error.message}`);
        }

        if (data) {
          return data as ScanValidationResult;
        }
      } catch (rpcErr: any) {
        console.error('[Supabase DB] RPC invocation error:', rpcErr);
        throw new Error(rpcErr.message || 'Database error during atomic verification');
      }
    }

    // Fallback in-memory atomic processing engine
    const event = await this.getEventById(eventId);
    if (!event || event.status === 'DELETED') {
      return { success: false, status: 'WRONG_EVENT', message: 'Event not found or inactive.' };
    }

    // Idempotency check via client_scan_id
    if (clientScanId) {
      const existingIdempotent = this.inMemoryDB.check_ins.find(
        (c) => c.event_id === eventId && c.client_scan_id === clientScanId
      );
      if (existingIdempotent) {
        const student = this.inMemoryDB.students.find((s) => s.id === existingIdempotent.student_id);
        return {
          success: true,
          status: 'IDEMPOTENT_SUCCESS',
          message: 'Check-in was already recorded successfully.',
          student: student ? { ...student, is_checked_in: true, checked_in_at: existingIdempotent.check_in_at } : undefined,
          check_in_id: existingIdempotent.id,
          check_in_at: existingIdempotent.check_in_at,
        };
      }
    }

    // Extract token if QR payload is JSON
    let lookupVal = cleanVal;
    if (cleanVal.startsWith('{') && cleanVal.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanVal);
        if (parsed.attendee_token) lookupVal = parsed.attendee_token;
      } catch (e) {
        lookupVal = cleanVal;
      }
    }

    // Attendee matching
    let matchingStudents = this.inMemoryDB.students.filter(
      (s) =>
        s.event_id === eventId &&
        (s.qr_code === cleanVal ||
          s.qr_code === lookupVal ||
          s.barcode === cleanVal ||
          s.usn.toUpperCase() === cleanVal.toUpperCase() ||
          (s.meta && s.meta[event.primary_scan_field || 'usn']?.toString().toUpperCase() === cleanVal.toUpperCase()))
    );

    let student: Student | null = null;
    if (matchingStudents.length === 1) {
      student = matchingStudents[0];
    } else if (matchingStudents.length > 1) {
      if (cleanSecVal) {
        const secField = event.secondary_scan_field || 'email';
        student =
          matchingStudents.find((s) => {
            const val = ((s as any)[secField] || s.meta?.[secField] || '').toString().toUpperCase();
            return val === cleanSecVal.toUpperCase();
          }) || null;
      } else {
        return {
          success: false,
          status: 'AMBIGUOUS_MATCH',
          message: `Multiple attendees found with ${event.primary_scan_field || 'identifier'} "${cleanVal}". Additional verification required (${event.secondary_scan_field || 'secondary key'}).`,
          requires_secondary: true,
          secondary_field: event.secondary_scan_field || 'email',
          primary_value: cleanVal,
        };
      }
    }

    if (!student) {
      this.inMemoryDB.scan_attempts.push({
        id: generateId(),
        event_id: eventId,
        scanner_id: scannerId || null,
        student_id: null,
        scanned_value: cleanVal,
        scan_type: scanType,
        result: 'invalid',
        reason: 'Attendee not found',
        timestamp: new Date().toISOString(),
      });
      return { success: false, status: 'INVALID_TOKEN', message: 'INVALID TOKEN — Attendee not found' };
    }

    // Duplicate check
    const existingCheckIn = this.inMemoryDB.check_ins.find((c) => c.event_id === eventId && c.student_id === student.id);
    if (existingCheckIn) {
      const checkInTimeStr = new Date(existingCheckIn.check_in_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      this.inMemoryDB.scan_attempts.push({
        id: generateId(),
        event_id: eventId,
        scanner_id: scannerId || null,
        student_id: student.id,
        scanned_value: cleanVal,
        scan_type: scanType,
        result: 'duplicate',
        reason: `Already checked in at ${checkInTimeStr}`,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        status: 'DUPLICATE_CHECKIN',
        message: `ALREADY CHECKED IN at ${checkInTimeStr}`,
        student: { ...student, is_checked_in: true, checked_in_at: existingCheckIn.check_in_at },
        check_in_at: existingCheckIn.check_in_at,
      };
    }

    const checkInId = generateId();
    const checkInTime = new Date().toISOString();

    const newCheckIn: CheckIn = {
      id: checkInId,
      event_id: eventId,
      student_id: student.id,
      scanner_id: scannerId || null,
      scan_type: scanType,
      check_in_at: checkInTime,
      status: 'SUCCESS',
      source,
      client_scan_id: clientScanId || null,
      created_at: checkInTime,
      updated_at: checkInTime,
    };

    this.inMemoryDB.check_ins.push(newCheckIn);
    this.inMemoryDB.scan_attempts.push({
      id: generateId(),
      event_id: eventId,
      scanner_id: scannerId || null,
      student_id: student.id,
      scanned_value: cleanVal,
      scan_type: scanType,
      result: 'success',
      reason: 'Valid check-in',
      timestamp: checkInTime,
    });

    return {
      success: true,
      status: 'SUCCESS',
      message: 'CHECK-IN SUCCESSFUL',
      student: { ...student, is_checked_in: true, checked_in_at: checkInTime, scan_type: scanType },
      check_in_id: checkInId,
      check_in_at: checkInTime,
    };
  }

  // --- STATS & ANALYTICS ---
  async getEventStats(eventId: string, adminId?: string): Promise<EventStats> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized or event not found');

    const supabase = this.getClient();
    let attendees: Student[] = [];
    let checkins: CheckIn[] = [];
    let attempts: ScanAttempt[] = [];
    let scanners: ScannerAccount[] = [];
    let totalEvents = 1;

    if (supabase) {
      const [stRes, chkRes, atmRes, scnRes, evCountRes] = await Promise.all([
        supabase.from('students').select('*').eq('event_id', eventId),
        supabase.from('check_ins').select('*').eq('event_id', eventId),
        supabase.from('scan_attempts').select('*').eq('event_id', eventId),
        supabase.from('scanner_accounts').select('*').eq('event_id', eventId).eq('is_active', true),
        adminId
          ? supabase.from('events').select('*', { count: 'exact', head: true }).eq('admin_id', adminId).neq('status', 'DELETED')
          : Promise.resolve({ count: 1, error: null }),
      ]);

      if (stRes.error) throw new Error(`Database error fetching attendees: ${stRes.error.message}`);
      if (chkRes.error) throw new Error(`Database error fetching check-ins: ${chkRes.error.message}`);
      if (atmRes.error) throw new Error(`Database error fetching scan attempts: ${atmRes.error.message}`);
      if (scnRes.error) throw new Error(`Database error fetching scanners: ${scnRes.error.message}`);

      attendees = (stRes.data as Student[]) || [];
      checkins = (chkRes.data as CheckIn[]) || [];
      attempts = (atmRes.data as ScanAttempt[]) || [];
      scanners = (scnRes.data as ScannerAccount[]) || [];
      totalEvents = (evCountRes as any).count || 1;
    } else {
      attendees = this.inMemoryDB.students.filter((s) => s.event_id === eventId);
      checkins = this.inMemoryDB.check_ins.filter((c) => c.event_id === eventId);
      attempts = this.inMemoryDB.scan_attempts.filter((a) => a.event_id === eventId);
      scanners = this.inMemoryDB.scanner_accounts.filter((s) => s.event_id === eventId && s.is_active);
      totalEvents = adminId
        ? this.inMemoryDB.events.filter((e) => e.admin_id === adminId && e.status !== 'DELETED').length
        : 1;
    }

    const total_attendees = attendees.length;
    const total_checked_in = checkins.length;
    const total_remaining = Math.max(0, total_attendees - total_checked_in);
    const checkin_percentage = total_attendees > 0 ? Math.round((total_checked_in / total_attendees) * 100) : 0;

    const duplicates_blocked = attempts.filter((a) => a.result === 'duplicate').length;
    const invalid_attempts = attempts.filter((a) => a.result === 'invalid' || a.result === 'wrong_event').length;
    const qr_scans = checkins.filter((c) => c.scan_type === 'QR').length;
    const barcode_scans = checkins.filter((c) => c.scan_type === 'BARCODE').length;

    // Branch breakdown
    const branchMap = new Map<string, { total: number; checked_in: number }>();
    const checkedInSet = new Set(checkins.map((c) => c.student_id));

    attendees.forEach((s) => {
      const b = s.branch || 'General';
      const current = branchMap.get(b) || { total: 0, checked_in: 0 };
      current.total += 1;
      if (checkedInSet.has(s.id)) {
        current.checked_in += 1;
      }
      branchMap.set(b, current);
    });

    const branch_breakdown = Array.from(branchMap.entries()).map(([branch, counts]) => ({
      branch,
      total: counts.total,
      checked_in: counts.checked_in,
    }));

    // Year breakdown
    const yearMap = new Map<string, { total: number; checked_in: number }>();
    attendees.forEach((s) => {
      const y = s.year || 'General';
      const current = yearMap.get(y) || { total: 0, checked_in: 0 };
      current.total += 1;
      if (checkedInSet.has(s.id)) {
        current.checked_in += 1;
      }
      yearMap.set(y, current);
    });

    const year_breakdown = Array.from(yearMap.entries()).map(([year, counts]) => ({
      year,
      total: counts.total,
      checked_in: counts.checked_in,
    }));

    return {
      total_events: totalEvents,
      total_attendees,
      total_checked_in,
      total_remaining,
      checkin_percentage,
      active_scanners_count: scanners.length,
      total_scan_attempts: attempts.length,
      duplicates_blocked,
      invalid_attempts,
      qr_scans,
      barcode_scans,
      branch_breakdown,
      year_breakdown,
    };
  }

  // --- SCAN ATTEMPTS & HISTORY ---
  async getScanHistory(
    eventId: string,
    adminId?: string,
    filters?: { result?: string; scannerId?: string; search?: string; limit?: number; offset?: number }
  ): Promise<ScanAttempt[]> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized');

    const limit = filters?.limit;
    const offset = filters?.offset || 0;

    const supabase = this.getClient();
    let attempts: ScanAttempt[] = [];
    let studentsMap = new Map<string, Student>();
    let scannersMap = new Map<string, ScannerAccount>();

    if (supabase) {
      let atmQuery = supabase.from('scan_attempts').select('*').eq('event_id', eventId).order('timestamp', { ascending: false });
      if (limit !== undefined) {
        atmQuery = atmQuery.range(offset, offset + limit - 1);
      }

      const [atmRes, stRes, scnRes] = await Promise.all([
        atmQuery,
        supabase.from('students').select('*').eq('event_id', eventId),
        supabase.from('scanner_accounts').select('*').eq('event_id', eventId),
      ]);

      if (atmRes.error) throw new Error(`Database error fetching scan history: ${atmRes.error.message}`);
      if (atmRes.data) attempts = atmRes.data as ScanAttempt[];
      if (stRes.data) (stRes.data as Student[]).forEach((s) => studentsMap.set(s.id, s));
      if (scnRes.data) (scnRes.data as ScannerAccount[]).forEach((sc) => scannersMap.set(sc.id, sc));
    } else {
      attempts = this.inMemoryDB.scan_attempts.filter((a) => a.event_id === eventId);
      this.inMemoryDB.students.filter((s) => s.event_id === eventId).forEach((s) => studentsMap.set(s.id, s));
      this.inMemoryDB.scanner_accounts.filter((sc) => sc.event_id === eventId).forEach((sc) => scannersMap.set(sc.id, sc));
    }

    if (filters?.result && filters.result !== 'ALL') {
      attempts = attempts.filter((a) => a.result === filters.result);
    }
    if (filters?.scannerId && filters.scannerId !== 'ALL') {
      attempts = attempts.filter((a) => a.scanner_id === filters.scannerId);
    }

    let enriched = attempts.map((a) => ({
      ...a,
      student: a.student_id ? studentsMap.get(a.student_id) : undefined,
      scanner: a.scanner_id ? scannersMap.get(a.scanner_id) : undefined,
    }));

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      enriched = enriched.filter(
        (a) =>
          a.scanned_value.toLowerCase().includes(q) ||
          (a.student && (a.student.name.toLowerCase().includes(q) || a.student.usn.toLowerCase().includes(q))) ||
          (a.scanner && a.scanner.name.toLowerCase().includes(q))
      );
    }

    const sorted = enriched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (!supabase && limit !== undefined) {
      return sorted.slice(offset, offset + limit);
    }
    return sorted;
  }

  // --- ACTIVITY LOGS ---
  async getActivityLogs(eventId: string, adminId: string, limit: number = 50, offset: number = 0): Promise<ActivityLog[]> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized');

    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('event_id', eventId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[Supabase DB] Error fetching activity logs:', error);
        throw new Error(`Database error fetching activity logs: ${error.message}`);
      }
      return (data as ActivityLog[]) || [];
    }

    return this.inMemoryDB.activity_logs
      .filter((l) => l.event_id === eventId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit);
  }

  async clearActivityLogs(eventId: string, adminId: string): Promise<boolean> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized');

    throw new Error('AUDIT_LOG_IMMUTABLE: Audit logs are strictly immutable and cannot be deleted.');
  }

  async logActivity(
    eventId: string,
    actorId: string | null,
    actorName: string,
    type: any,
    message: string,
    meta?: Record<string, any>
  ): Promise<void> {
    const entry: ActivityLog = {
      id: generateId(),
      event_id: eventId,
      actor_id: actorId,
      actor_name: actorName,
      type,
      message,
      meta: meta || {},
      timestamp: new Date().toISOString(),
    };

    const supabase = this.getClient();
    if (supabase) {
      await supabase.from('activity_logs').insert(entry);
    }
    this.inMemoryDB.activity_logs.unshift(entry);
  }

  // --- EXPORT ATTENDANCE AS CSV ---
  async generateAttendanceCSV(eventId: string, adminId: string): Promise<string> {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error('Unauthorized');

    const students = await this.getStudents(eventId, adminId);
    const scanners = await this.getScannersByEvent(eventId, adminId);
    const scannerMap = new Map(scanners.map((s) => [s.id, s.name]));

    const supabase = this.getClient();
    let checkInsList: CheckIn[] = [];
    if (supabase) {
      const { data, error } = await supabase.from('check_ins').select('*').eq('event_id', eventId);
      if (error) throw new Error(`Database error fetching check-ins for export: ${error.message}`);
      if (data) checkInsList = data as CheckIn[];
    } else {
      checkInsList = this.inMemoryDB.check_ins.filter((c) => c.event_id === eventId);
    }

    const checkInsMap = new Map(checkInsList.map((c) => [c.student_id, c]));

    const headers = [
      'Sl No',
      'USN',
      'Name',
      'Email',
      'Phone Number',
      'Year',
      'Section',
      'Branch',
      'Check-in Status',
      'Check-in Time',
      'Scan Type',
      'Scanner Station',
      'Source',
      'QR Code Token',
      'Barcode Token',
    ];

    const rows = students.map((s) => {
      const chk = checkInsMap.get(s.id);
      const scannerStation = chk?.scanner_id ? scannerMap.get(chk.scanner_id) || 'Gate Terminal' : 'Admin Terminal';
      return [
        s.sl_no || '',
        `"${s.usn}"`,
        `"${s.name}"`,
        `"${s.email || ''}"`,
        `"${s.phone_number || ''}"`,
        `"${s.year || ''}"`,
        `"${s.section || ''}"`,
        `"${s.branch || ''}"`,
        chk ? 'CHECKED_IN' : 'PENDING',
        chk ? `"${chk.check_in_at}"` : '',
        chk?.scan_type || '',
        chk ? `"${scannerStation}"` : '',
        chk?.source || '',
        `"${s.qr_code}"`,
        `"${s.barcode}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const dbService = new DatabaseService();
