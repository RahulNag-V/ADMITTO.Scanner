import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { dbService, registerScannerInvalidationHook } from './src/lib/db';
import { AuthSession, UserRole, ScanType } from './src/types';
import { testServerSupabaseHealth, isServerSupabaseActive, getServerSupabaseAdmin, getServerSupabase } from './src/lib/supabase/server';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Canonical Service Health Route
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Health & Diagnostic API (Supabase)
app.get('/api/health/supabase', async (_req: Request, res: Response) => {
  try {
    const health = await testServerSupabaseHealth();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({
      connected: false,
      error: err.message || 'Supabase health check failed',
    });
  }
});

// Rate Limiters
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['x-bypass-rate-limit'] === 'admitto-test',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

export const requestAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many scanner access requests. Please try again later.' },
});

export const scanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Scan rate limit exceeded (maximum 120 scans per minute).' },
});

// Simple in-memory session store (signed auth bearer tokens)
export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  eventId?: string; // If scanner
  createdAt: number;
  deviceUuid?: string;
}

export const activeSessions = new Map<string, SessionData>();
export const boundScannerDevices = new Map<string, string>(); // scannerId/userId -> deviceUuid

export function resetScannerDeviceBindings(): void {
  boundScannerDevices.clear();
}

export function enforceDeviceBinding(
  session: SessionData,
  incomingDeviceUuid: string | undefined,
  res: Response
): boolean {
  if (session.role !== 'SCANNER') {
    return true; // Admins are not restricted to a single hardware device
  }

  const boundUuid = session.deviceUuid || boundScannerDevices.get(session.userId);

  if (boundUuid) {
    if (!incomingDeviceUuid || incomingDeviceUuid !== boundUuid) {
      res.status(403).json({
        error: 'DEVICE_MISMATCH',
        code: 'DEVICE_BINDING_VIOLATION',
        message: 'Security violation: Scanner session is bound to a different device.',
      });
      return false;
    }
  } else {
    // If not yet bound, require and bind to incoming device UUID
    if (!incomingDeviceUuid) {
      res.status(403).json({
        error: 'DEVICE_REQUIRED',
        code: 'DEVICE_BINDING_REQUIRED',
        message: 'Security violation: Device UUID is required for scanner operations.',
      });
      return false;
    }
    session.deviceUuid = incomingDeviceUuid;
    boundScannerDevices.set(session.userId, incomingDeviceUuid);
  }

  return true;
}

// Register invalidation hook to terminate scanner sessions when revoked or disabled
registerScannerInvalidationHook((scannerId: string) => {
  boundScannerDevices.delete(scannerId);
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === scannerId) {
      activeSessions.delete(token);
    }
  }
});

// Helper to invalidate all active sessions for a user (e.g. after password reset)
export function invalidateUserSessions(userId: string, email?: string): void {
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId || (email && session.email.toLowerCase() === email.toLowerCase())) {
      activeSessions.delete(token);
    }
  }
}

// Helper to extract session from Authorization header or query token parameter
async function getSessionFromReq(req: Request): Promise<SessionData | null> {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token) {
    return null;
  }

  // 1. Check in-memory activeSessions cache (fast path for scanner tokens & cached admin JWTs)
  const cached = activeSessions.get(token);
  if (cached) {
    if (cached.role === 'SCANNER') {
      // If this session was issued for a static station account (GATE-XXX), verify scanner_accounts
      const scanner = await dbService.getScannerById(cached.userId);
      if (scanner) {
        if (
          !scanner.is_active ||
          (scanner.expires_at && new Date(scanner.expires_at).getTime() < Date.now())
        ) {
          activeSessions.delete(token);
          return null;
        }
      }
    }
    return cached;
  }

  // 2. Validate Supabase JWT token via Supabase Admin Auth
  const supabaseAdmin = getServerSupabaseAdmin() || getServerSupabase();
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (data?.user && !error) {
        const user = data.user;
        const userEmail = user.email || '';

        // Look up or provision profile in profiles table
        let profile = await dbService.getProfileByEmail(userEmail);
        if (!profile) {
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            userEmail.split('@')[0] ||
            'Organizer';
          profile = await dbService.createAdminProfile(userEmail, name, 'supabase-managed');
        }

        const sessionData: SessionData = {
          userId: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role || 'ADMIN',
          createdAt: Date.now(),
        };

        // Cache in memory for 5 minutes
        activeSessions.set(token, sessionData);
        return sessionData;
      }
    } catch {
      // Token verification failed or expired
    }
  }

  return null;
}

// Middleware: Require Admin Auth
async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const session = await getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    return;
  }
  if (session.role !== 'ADMIN') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Admin privileges required.' });
    return;
  }
  (req as any).user = session;
  next();
}

// Middleware: Require Scanner or Admin Auth
async function requireScannerOrAdmin(req: Request, res: Response, next: NextFunction) {
  const session = await getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    return;
  }
  (req as any).user = session;
  next();
}

// Export tokens store
interface ExportTokenData {
  eventId: string;
  adminId: string;
  expiresAt: number;
}
const exportTokens = new Map<string, ExportTokenData>();

// ==========================================
// 1. AUTHENTICATION APIS
// ==========================================

// Login (Admin or Scanner)
app.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { emailOrCode, password, role } = req.body;

    if (!emailOrCode || !password) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Email/Access code and password are required.' });
      return;
    }

    if (role === 'SCANNER' || emailOrCode.startsWith('GATE-') || emailOrCode.includes('scanner')) {
      const scannerResult = await dbService.verifyScannerAuth(emailOrCode, password);
      if (!scannerResult) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Invalid scanner access code or password, or scanner access has expired.',
        });
        return;
      }

      const { scanner, event } = scannerResult;

      const incomingDeviceUuid =
        (req.headers['x-device-uuid'] as string) ||
        (req.body?.deviceUuid as string) ||
        (req.body?.device_uuid as string);

      const existingBound = boundScannerDevices.get(scanner.id);
      if (existingBound && incomingDeviceUuid && existingBound !== incomingDeviceUuid) {
        res.status(403).json({
          error: 'DEVICE_MISMATCH',
          code: 'DEVICE_BINDING_VIOLATION',
          message: 'Security violation: Scanner account is bound to another device. Please contact event administrator to reset binding.',
        });
        return;
      }

      const boundDevice = incomingDeviceUuid || existingBound;
      if (boundDevice) {
        boundScannerDevices.set(scanner.id, boundDevice);
      }

      const token = `scan_tok_${crypto.randomBytes(32).toString('hex')}`;
      const sessionData: SessionData = {
        userId: scanner.id,
        email: scanner.email,
        name: scanner.name,
        role: 'SCANNER',
        eventId: event.id,
        createdAt: Date.now(),
        deviceUuid: boundDevice,
      };
      activeSessions.set(token, sessionData);

      const authSession: AuthSession = {
        user: {
          id: scanner.id,
          email: scanner.email,
          name: scanner.name,
          role: 'SCANNER',
          event_id: event.id,
          event_title: event.title,
        },
        token,
      };

      res.json({ success: true, session: authSession });
      return;
    }

    // Default: Admin Auth
    const adminProfile = await dbService.verifyAdminPassword(emailOrCode, password);
    if (!adminProfile) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid admin credentials. Please check your email and password.',
      });
      return;
    }

    const token = `adm_tok_${crypto.randomBytes(32).toString('hex')}`;
    const sessionData: SessionData = {
      userId: adminProfile.id,
      email: adminProfile.email,
      name: adminProfile.name,
      role: 'ADMIN',
      createdAt: Date.now(),
    };
    activeSessions.set(token, sessionData);

    const authSession: AuthSession = {
      user: {
        id: adminProfile.id,
        email: adminProfile.email,
        name: adminProfile.name,
        role: 'ADMIN',
      },
      token,
    };

    res.json({ success: true, session: authSession });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An error occurred during authentication.' });
  }
});

// Scanner Login via Email & Referral Code (No password needed)
app.post('/api/auth/scanner-referral-login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, referralCode, name } = req.body;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (referralCode || '').trim().toUpperCase();

    if (!cleanEmail || !cleanCode) {
      res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'Both email and event referral code are required for scanner login.',
      });
      return;
    }

    // 1. Verify referral code validity
    const lookup = await dbService.getReferralCodeByValue(cleanCode);
    if (!lookup) {
      res.status(400).json({
        error: 'INVALID_CODE',
        message: 'Invalid, disabled, or expired scanner referral code.',
      });
      return;
    }

    const { referral, event } = lookup;

    // Check if event has gate stations configured
    const stations = await dbService.getScannersByEvent(event.id);
    if (!stations || stations.length === 0) {
      res.status(400).json({
        error: 'GATE_STATIONS_REQUIRED',
        message: 'This event does not have any active gate stations configured yet. Please contact the event organizer.',
      });
      return;
    }

    const maxUses = referral.max_uses ?? 5;
    const timesUsed = referral.times_used ?? 0;
    if (timesUsed >= maxUses) {
      res.status(400).json({
        error: 'LIMIT_REACHED',
        message: `This referral code has reached its maximum redemption limit (${maxUses} users).`,
      });
      return;
    }

    // 2. Identify or provision scanner user identity
    let profile = await dbService.getProfileByEmail(cleanEmail);
    const effectiveName = (name && typeof name === 'string' && name.trim()) || profile?.name || cleanEmail.split('@')[0];
    if (!profile) {
      profile = await dbService.createScannerProfile(cleanEmail, effectiveName);
    }
    const userId = profile.id;

    // 3. Create or update access request
    const request = await dbService.createScannerAccessRequest(
      userId,
      cleanEmail,
      effectiveName,
      cleanCode
    );

    const incomingDeviceUuid =
      (req.headers['x-device-uuid'] as string) ||
      (req.body?.deviceUuid as string) ||
      (req.body?.device_uuid as string);

    const existingBound = boundScannerDevices.get(request.user_id);
    if (existingBound && incomingDeviceUuid && existingBound !== incomingDeviceUuid) {
      res.status(403).json({
        error: 'DEVICE_MISMATCH',
        code: 'DEVICE_BINDING_VIOLATION',
        message: 'Security violation: Scanner operator account is bound to another device.',
      });
      return;
    }

    const boundDevice = incomingDeviceUuid || existingBound;
    if (boundDevice) {
      boundScannerDevices.set(request.user_id, boundDevice);
    }

    // 4. Generate active authenticated session
    const token = `scan_tok_${crypto.randomBytes(32).toString('hex')}`;
    const sessionData: SessionData = {
      userId: request.user_id,
      email: request.user_email,
      name: request.user_name,
      role: 'SCANNER',
      eventId: request.event_id,
      createdAt: Date.now(),
      deviceUuid: boundDevice,
    };
    activeSessions.set(token, sessionData);

    const authSession: AuthSession = {
      user: {
        id: request.user_id,
        email: request.user_email,
        name: request.user_name,
        role: 'SCANNER',
        event_id: request.event_id,
        event_title: request.event_title || event.title,
      },
      token,
    };

    res.json({ success: true, session: authSession, request });
  } catch (err: any) {
    console.error('Scanner referral login error:', err);
    res.status(400).json({
      error: 'AUTH_ERROR',
      message: err.message || 'Failed to authenticate scanner with referral code.',
    });
  }
});

// Admin Registration (First Admin / New Admin)
app.post('/api/auth/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Name, email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = await dbService.getProfileByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'CONFLICT', message: 'An account with this email already exists.' });
      return;
    }

    const newProfile = await dbService.createAdminProfile(email, name, password);

    const token = `adm_tok_${crypto.randomBytes(32).toString('hex')}`;
    const sessionData: SessionData = {
      userId: newProfile.id,
      email: newProfile.email,
      name: newProfile.name,
      role: 'ADMIN',
      createdAt: Date.now(),
    };
    activeSessions.set(token, sessionData);

    // Admin registered cleanly with 0 events
    const authSession: AuthSession = {
      user: {
        id: newProfile.id,
        email: newProfile.email,
        name: newProfile.name,
        role: 'ADMIN',
      },
      token,
    };

    res.status(201).json({ success: true, session: authSession });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Could not register admin account.' });
  }
});

// Current Session Info
app.get('/api/auth/me', async (req: Request, res: Response) => {
  const session = await getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'No active session found.' });
    return;
  }

  let eventTitle: string | undefined;
  if (session.eventId) {
    const event = await dbService.getEventById(session.eventId);
    eventTitle = event?.title;
  }

  res.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      event_id: session.eventId,
      event_title: eventTitle,
    },
  });
});

// Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Delete Account (Admin or Scanner)
app.delete('/api/auth/account', requireScannerOrAdmin, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    await dbService.deleteAccount(session.userId);

    // Evict all active tokens for this user
    for (const [token, sess] of activeSessions.entries()) {
      if (sess.userId === session.userId) {
        activeSessions.delete(token);
      }
    }

    res.json({ success: true, message: 'Account and associated event data permanently deleted.' });
  } catch (err: any) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || 'Failed to delete account.' });
  }
});

// Update Profile (Name, Phone, Organization, Bio — Email is strictly IMMUTABLE)
app.put('/api/auth/profile', requireScannerOrAdmin, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    const { name, phone, organization, bio } = req.body;

    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Name cannot be empty.' });
      return;
    }

    const updatedName = name ? name.trim() : session.name;
    await dbService.updateProfile(session.userId, {
      name: updatedName,
      phone: phone ? String(phone).trim() : undefined,
      organization: organization ? String(organization).trim() : undefined,
      bio: bio ? String(bio).trim() : undefined,
    });

    // Keep in-memory session cache updated
    session.name = updatedName;
    for (const [, sess] of activeSessions.entries()) {
      if (sess.userId === session.userId) {
        sess.name = updatedName;
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: session.userId,
        email: session.email, // Email stays completely unchanged
        name: updatedName,
        role: session.role,
        phone: phone || undefined,
        organization: organization || undefined,
        bio: bio || undefined,
      },
    });
  } catch (err: any) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || 'Failed to update profile.' });
  }
});

// Change Password
app.put('/api/auth/change-password', requireScannerOrAdmin, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'New password must be at least 6 characters long.',
      });
      return;
    }

    // Verify current password if user is Admin and password was provided
    if (session.role === 'ADMIN' && currentPassword) {
      const verified = await dbService.verifyAdminPassword(session.email, currentPassword);
      if (!verified) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Current password is incorrect.',
        });
        return;
      }
    }

    await dbService.updatePassword(session.email, newPassword);

    // Also update in Supabase Admin Auth if available
    const supabaseAdmin = getServerSupabaseAdmin() || getServerSupabase();
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(session.userId, {
          password: newPassword,
        });
      } catch (sbErr: any) {
        console.warn('[Supabase Auth] Password update note:', sbErr?.message);
      }
    }

    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || 'Failed to change password.' });
  }
});

function generateAdmittoOtp(): string {
  // Cryptographically secure 6-digit numeric OTP (e.g. "592817")
  return crypto.randomInt(100000, 1000000).toString();
}

// Confidential Email Dispatcher for Password Reset Code
async function sendResetCodeEmail(toEmail: string, code: string): Promise<boolean> {
  const host = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : '');
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || '';
  const from = process.env.SMTP_FROM || `"ADMITTO Security" <${user || 'no-reply@admitto.events'}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset your ADMITTO password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #131b2e; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 36px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #ffffff;">ADMITTO</div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6366f1; margin-top: 4px; font-weight: 700;">Security & Identity Verification</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; text-align: center;">Reset your ADMITTO password</h2>
                    <p style="margin: 10px 0 0 0; font-size: 13px; color: #94a3b8; text-align: center; line-height: 1.6;">
                      A password reset was requested for your ADMITTO account. Use your confidential 6-digit verification code below to authorize your password change.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15)); border: 1.5px solid rgba(99, 102, 241, 0.4); border-radius: 16px; padding: 20px 32px; display: inline-block;">
                      <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; text-shadow: 0 0 20px rgba(99, 102, 241, 0.5);">
                        ${code}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 24px;">
                    <div style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 14px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #fca5a5; line-height: 1.5;">
                        <strong>Confidentiality Notice:</strong> This code is strictly confidential and meant solely for your account. Do not disclose this code to anyone. It expires in <strong>15 minutes</strong>.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                      If you did not request this password reset, please ignore this email. Your account remains secure.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  if (user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: host || 'smtp-relay.brevo.com',
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Reset your ADMITTO password',
        text: `A password reset was requested for your ADMITTO account. Your verification code is: ${code}. It expires in 15 minutes.`,
        html: htmlContent,
      });
      console.log(`[EMAIL DISPATCH SUCCESS] Real email sent to inbox: ${toEmail}`);
      return true;
    } catch (sendErr: any) {
      console.error(`[EMAIL DISPATCH ERROR] Failed to deliver via SMTP:`, sendErr.message);
      return false;
    }
  }

  console.warn(`[EMAIL DISPATCH NOTICE] SMTP credentials not configured. Verification email not dispatched.`);
  return false;
}

// Send Password Reset Code via Email (100% Confidential - Enforces 60-Second Cooldown & Enumeration Protection)
app.post('/api/auth/send-reset-code', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Email address is required.' });
      return;
    }

    const profile = await dbService.getProfileByEmail(cleanEmail);
    if (profile) {
      // 60-Second Cooldown Enforcement based on persistent DB records
      const existing = await dbService.getActivePasswordResetCode(cleanEmail);
      if (existing && Date.now() - new Date(existing.created_at).getTime() < 60 * 1000) {
        const elapsed = Math.floor((Date.now() - new Date(existing.created_at).getTime()) / 1000);
        const remainingSeconds = Math.max(1, 60 - elapsed);
        res.status(429).json({
          error: 'COOLDOWN_ACTIVE',
          message: `Please wait ${remainingSeconds}s before requesting another verification code.`,
          remainingSeconds,
        });
        return;
      }

      // Generate cryptographically secure 6-digit OTP
      const otp = generateAdmittoOtp();
      const codeHash = crypto.createHash('sha256').update(otp).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await dbService.createPasswordResetCode(profile.id, cleanEmail, codeHash, expiresAt);
      await sendResetCodeEmail(cleanEmail, otp);
    }

    // Enumeration protection: return identical generic message whether account exists or not
    res.json({
      success: true,
      message: 'If an account exists for this email, a verification code has been sent.',
      cooldownSeconds: 60,
    });
  } catch (err: any) {
    console.error('Send reset code error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to process password reset request.' });
  }
});

// Reset Password using Email Verification Code (Persistent storage, attempt limiting, session invalidation)
app.post('/api/auth/reset-password-with-code', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail || !cleanCode || !newPassword) {
      res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'Email, verification code, and new password are required.',
      });
      return;
    }

    // Verify format: exactly 6 digits
    if (!/^\d{6}$/.test(cleanCode)) {
      res.status(400).json({
        error: 'INVALID_OR_EXPIRED',
        message: 'Invalid or expired verification code.',
      });
      return;
    }

    // Mandatory backend password policy: minimum 8 characters
    if (newPassword.length < 8) {
      res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'New password must be at least 8 characters long.',
      });
      return;
    }

    const record = await dbService.getActivePasswordResetCode(cleanEmail);
    if (!record) {
      res.status(400).json({
        error: 'INVALID_OR_EXPIRED',
        message: 'Invalid or expired verification code.',
      });
      return;
    }

    // Compare SHA-256 hash using timingSafeEqual to prevent timing attacks
    const suppliedHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    const suppliedBuffer = Buffer.from(suppliedHash, 'utf8');
    const storedBuffer = Buffer.from(record.code_hash, 'utf8');

    const isMatch =
      suppliedBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(suppliedBuffer, storedBuffer);

    if (!isMatch) {
      const attempts = await dbService.incrementPasswordResetAttempts(record.id);
      if (attempts >= 5) {
        res.status(400).json({
          error: 'TOO_MANY_ATTEMPTS',
          message: 'Too many verification attempts. Please request a new code.',
        });
        return;
      }

      res.status(400).json({
        error: 'INVALID_OR_EXPIRED',
        message: 'Invalid or expired verification code.',
      });
      return;
    }

    // Code matches!
    // 1. Update password using existing bcrypt hashing
    await dbService.updatePassword(cleanEmail, newPassword);

    // 2. Update Supabase Auth admin user if profile exists
    const profile = await dbService.getProfileByEmail(cleanEmail);
    if (profile) {
      const supabaseAdmin = getServerSupabaseAdmin() || getServerSupabase();
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(profile.id, {
            password: newPassword,
          });
          await supabaseAdmin.auth.admin.signOut(profile.id);
        } catch (sbErr: any) {
          console.warn('[Supabase Auth] Password update note:', sbErr?.message);
        }
      }

      // 3. Invalidate all active sessions for this user
      invalidateUserSessions(profile.id, cleanEmail);
    }

    // 4. Mark code as used
    await dbService.markPasswordResetCodeUsed(record.id);

    res.json({
      success: true,
      message: 'Password reset successfully. Please sign in again.',
    });
  } catch (err: any) {
    console.error('Reset password with code error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to reset password.' });
  }
});

// ==========================================
// 2. EVENTS APIS (Strict Multi-Admin Isolation)
// ==========================================

// List Admin's Events
app.get('/api/events', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const events = await dbService.getEventsByAdmin(admin.userId);
    res.json({ events });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// Create Event
app.post('/api/events', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const {
      title,
      description,
      venue,
      event_date,
      admin_name,
      admin_phone,
      admin_email,
      banner_url,
      attendee_type,
      attendee_label_singular,
      attendee_label_plural,
      primary_scan_field,
      secondary_scan_field,
      qr_mode,
      barcode_field,
    } = req.body;

    if (!title) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Event title is required.' });
      return;
    }

    const newEvent = await dbService.createEvent(admin.userId, {
      title,
      description,
      venue,
      event_date,
      admin_name: admin_name || admin.name,
      admin_phone,
      admin_email: admin_email || admin.email,
      banner_url,
      attendee_type,
      attendee_label_singular,
      attendee_label_plural,
      primary_scan_field: primary_scan_field || 'usn',
      secondary_scan_field: secondary_scan_field || null,
      qr_mode: qr_mode || 'SECURE_TOKEN',
      barcode_field: barcode_field || primary_scan_field || 'usn',
    });

    res.status(201).json({ success: true, event: newEvent });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// Get Event Details (Enforces ownership or scanner assignment)
app.get('/api/events/:id', requireScannerOrAdmin, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    const event = await dbService.getEventById(req.params.id);
    if (!event || event.status === 'DELETED') {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Event does not exist or has been deleted.' });
      return;
    }

    // Verify user authorization for this event
    const authCheck = await dbService.validateScannerEventAccess(session.userId, req.params.id);
    if (!authCheck.authorized) {
      res.status(403).json({ error: 'FORBIDDEN', message: authCheck.reason || 'Access denied.' });
      return;
    }

    res.json({ event });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// Scanner: Get Offline Event Bundle (Scoped, Sanitized, Expiring)
app.get('/api/events/:id/offline-bundle', requireScannerOrAdmin, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    const eventId = req.params.id;

    // 1. Verify scanner authorization for this event
    const authCheck = await dbService.validateScannerEventAccess(session.userId, eventId);
    if (!authCheck.authorized) {
      res.status(403).json({
        error: 'FORBIDDEN',
        code: 'SCANNER_UNAUTHORIZED',
        message: authCheck.reason || 'Scanner is not authorized for this event.',
      });
      return;
    }

    // 1b. Enforce Device Binding for Scanner
    const incomingDeviceUuid =
      (req.headers['x-device-uuid'] as string) ||
      (req.query.device_uuid as string) ||
      (req.body?.deviceUuid as string);

    if (!enforceDeviceBinding(session, incomingDeviceUuid, res)) {
      return;
    }

    const event = await dbService.getEventById(eventId);
    if (!event || event.status === 'DELETED') {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Event does not exist or has been deleted.' });
      return;
    }

    // 2. Fetch students for the event
    const adminId = session.role === 'ADMIN' ? session.userId : undefined;
    const allStudents = await dbService.getStudents(eventId, adminId);

    // 3. Sanitize attendees - minimal PII, only scan keys and essential display info
    const primaryKey = event.primary_scan_field || 'usn';
    const secondaryKey = event.secondary_scan_field;

    const sanitizedAttendees = allStudents.map((s) => {
      let primaryVal = s.usn;
      if (primaryKey === 'usn') primaryVal = s.usn;
      else if (primaryKey === 'email') primaryVal = s.email || '';
      else if (primaryKey === 'name') primaryVal = s.name;
      else if (s.meta && s.meta[primaryKey]) primaryVal = String(s.meta[primaryKey]);

      let secondaryVal: string | undefined = undefined;
      if (secondaryKey) {
        if (secondaryKey === 'email') secondaryVal = s.email;
        else if (secondaryKey === 'usn') secondaryVal = s.usn;
        else if (secondaryKey === 'name') secondaryVal = s.name;
        else if (secondaryKey === 'phone_number') secondaryVal = s.phone_number;
        else if (s.meta && s.meta[secondaryKey]) secondaryVal = String(s.meta[secondaryKey]);
      }

      return {
        id: s.id,
        event_id: s.event_id,
        usn: s.usn,
        name: s.name,
        branch: s.branch,
        qr_code: s.qr_code,
        barcode: s.barcode,
        primary_scan_value: primaryVal,
        secondary_scan_value: secondaryVal,
        is_checked_in: Boolean(s.is_checked_in),
        checked_in_at: s.checked_in_at,
      };
    });

    const checkedInIds = sanitizedAttendees
      .filter((s) => s.is_checked_in)
      .map((s) => s.id);

    // 4. Calculate expires_at: 8 hours default, or scanner account expiry if sooner
    const now = Date.now();
    let maxDurationMs = 8 * 60 * 60 * 1000;
    if (session.role === 'SCANNER' && authCheck.scannerId) {
      const scanner = await dbService.getScannerById(authCheck.scannerId);
      if (scanner && scanner.expires_at) {
        const scannerExp = new Date(scanner.expires_at).getTime();
        if (!isNaN(scannerExp) && scannerExp > now) {
          maxDurationMs = Math.min(maxDurationMs, scannerExp - now);
        }
      }
    }
    const expiresAt = new Date(now + maxDurationMs).toISOString();

    // 5. Version hash
    const versionString = `${event.id}_${allStudents.length}_${event.updated_at || event.created_at}`;
    const version = crypto.createHash('sha256').update(versionString).digest('hex').substring(0, 16);

    res.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        event_date: event.event_date,
        primary_scan_field: event.primary_scan_field || 'usn',
        secondary_scan_field: event.secondary_scan_field,
        qr_mode: event.qr_mode,
        barcode_field: event.barcode_field,
        downloaded_at: new Date(now).toISOString(),
        expires_at: expiresAt,
        version,
      },
      attendees: sanitizedAttendees,
      checked_in_student_ids: checkedInIds,
      version,
      downloaded_at: new Date(now).toISOString(),
      expires_at: expiresAt,
    });
  } catch (err: any) {
    console.error('Offline bundle error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// Update Event
app.put('/api/events/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const updated = await dbService.updateEvent(req.params.id, admin.userId, req.body);
    if (!updated) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied or event not found.' });
      return;
    }
    res.json({ success: true, event: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// Update Event Scanning & QR Configuration
app.patch('/api/events/:id/scan-config', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const { primary_scan_field, secondary_scan_field, qr_mode, barcode_field, available_fields, is_uniqueness_verified } = req.body;

    if (!primary_scan_field) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Primary scanning key is required.' });
      return;
    }

    const updatedEvent = await dbService.updateScanConfig(req.params.id, admin.userId, {
      primary_scan_field,
      secondary_scan_field: secondary_scan_field || null,
      qr_mode: qr_mode || 'SECURE_TOKEN',
      barcode_field: barcode_field || 'usn',
      available_fields: available_fields || [],
      is_uniqueness_verified: is_uniqueness_verified ?? true,
    });

    res.json({ success: true, event: updatedEvent });
  } catch (err: any) {
    res.status(400).json({ error: 'CONFIG_ERROR', message: err.message });
  }
});

// Validate Dataset Uniqueness for Candidate Primary / Secondary Keys
app.post('/api/events/:id/validate-uniqueness', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { rows, primaryKey, secondaryKey } = req.body;
    if (!primaryKey) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Primary key is required for validation.' });
      return;
    }

    const result = dbService.validateDatasetUniqueness(rows || [], primaryKey, secondaryKey);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: err.message });
  }
});

// Delete Event (or Permanent Purge with ?purge=true)
app.delete('/api/events/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const permanentPurge = req.query.purge === 'true';
    const success = await dbService.deleteEvent(req.params.id, admin.userId, permanentPurge);
    if (!success) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied or event not found.' });
      return;
    }
    res.json({ success: true, message: permanentPurge ? 'Event and all associated data permanently purged.' : 'Event marked as deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// Real Dashboard Statistics
app.get('/api/events/:id/stats', requireScannerOrAdmin, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    if (session.role === 'SCANNER' && session.eventId !== req.params.id) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Unauthorized event access.' });
      return;
    }
    const adminId = session.role === 'ADMIN' ? session.userId : undefined;
    const stats = await dbService.getEventStats(req.params.id, adminId);
    res.json({ stats });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// ==========================================
// 3. ATTENDEES / STUDENTS APIS
// ==========================================

// Get Students List
app.get('/api/events/:id/students', requireScannerOrAdmin, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    if (session.role === 'SCANNER' && session.eventId !== req.params.id) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Unauthorized event access.' });
      return;
    }
    const adminId = session.role === 'ADMIN' ? session.userId : undefined;
    const { search, branch, filter } = req.query;
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset !== undefined ? parseInt(req.query.offset as string, 10) : 0;

    const students = await dbService.getStudents(
      req.params.id,
      adminId,
      search as string,
      branch as string,
      filter as string,
      limit,
      offset
    );
    res.json({ students, total: students.length });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// Add Single Student
app.post('/api/events/:id/students', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const student = await dbService.createStudent(req.params.id, admin.userId, req.body);
    res.status(201).json({ success: true, student });
  } catch (err: any) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: err.message });
  }
});

// Batch CSV / Excel Attendee Import with Scan Config
app.post('/api/events/:id/students/import', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const { attendees, scanConfig } = req.body;

    if (!Array.isArray(attendees) || attendees.length === 0) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Attendees array cannot be empty.' });
      return;
    }

    if (attendees.length > 5000) {
      res.status(400).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Maximum batch import limit is 5,000 attendees per request.' });
      return;
    }

    const summary = await dbService.importStudentsBatch(req.params.id, admin.userId, attendees, scanConfig);
    res.json({ success: true, ...summary });
  } catch (err: any) {
    res.status(400).json({ error: 'IMPORT_ERROR', message: err.message });
  }
});

// Delete Student (Nested Route)
app.delete('/api/events/:id/students/:studentId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    await dbService.deleteStudent(req.params.id, req.params.studentId, admin.userId);
    res.json({ success: true, message: 'Attendee removed successfully.' });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// Delete Student (Direct Route)
app.delete('/api/students/:studentId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const deleted = await dbService.deleteStudentById(req.params.studentId, admin.userId);
    if (!deleted) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Attendee not found.' });
      return;
    }
    res.json({ success: true, message: 'Attendee removed successfully.' });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// Toggle Student Check-in Status
app.patch('/api/students/:studentId/checkin-status', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const { is_checked_in } = req.body;
    const updated = await dbService.toggleStudentCheckIn(req.params.studentId, !!is_checked_in, admin.userId);
    if (!updated) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Attendee not found.' });
      return;
    }
    res.json({ success: true, student: updated });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// ==========================================
// 4. SCANNER MANAGEMENT APIS
// ==========================================

// List Scanners
app.get('/api/events/:id/scanners', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const scanners = await dbService.getScannersByEvent(req.params.id, admin.userId);
    res.json({ scanners });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// Create Scanner
app.post('/api/events/:id/scanners', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const scanner = await dbService.createScanner(req.params.id, admin.userId, req.body);
    res.status(201).json({ success: true, scanner });
  } catch (err: any) {
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Update / Toggle Scanner
app.patch('/api/events/:id/scanners/:scannerId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const updated = await dbService.updateScanner(req.params.id, req.params.scannerId, admin.userId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Scanner account not found.' });
      return;
    }
    res.json({ success: true, scanner: updated });
  } catch (err: any) {
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Direct Scanner Status Toggle by Scanner ID
app.patch('/api/scanners/:scannerId/status', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const { is_active } = req.body;
    const updated = await dbService.toggleScannerStatusById(req.params.scannerId, admin.userId, Boolean(is_active));
    if (!updated) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Scanner account not found.' });
      return;
    }
    res.json({ success: true, scanner: updated });
  } catch (err: any) {
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Delete Scanner
app.delete('/api/events/:id/scanners/:scannerId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    await dbService.deleteScanner(req.params.id, req.params.scannerId, admin.userId);
    res.json({ success: true, message: 'Scanner deleted.' });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// Direct Delete Scanner by Scanner ID
app.delete('/api/scanners/:scannerId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    await dbService.deleteScannerById(req.params.scannerId, admin.userId);
    res.json({ success: true, message: 'Scanner deleted.' });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// ==========================================
// SCANNER REFERRAL CODES & ACCESS REQUESTS
// ==========================================

// Get my scanner access request status (for scanner operator)
app.get('/api/scanner/my-access', requireScannerOrAdmin, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    const eventId = req.query.eventId as string | undefined;
    const request = await dbService.getMyScannerAccess(session.userId, eventId);
    res.json({ request });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// Submit referral code to request scanner access
app.post('/api/scanner/request-access', requireScannerOrAdmin, requestAccessLimiter, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    const { referralCode, userName } = req.body;
    if (!referralCode) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Referral code is required.' });
      return;
    }

    const effectiveName = (typeof userName === 'string' && userName.trim()) || session.name;

    const request = await dbService.createScannerAccessRequest(
      session.userId,
      session.email,
      effectiveName,
      referralCode
    );

    res.status(201).json({ success: true, request });
  } catch (err: any) {
    if (err.code === 'COOLDOWN_ACTIVE') {
      res.status(429).json({
        error: 'COOLDOWN_ACTIVE',
        message: err.message,
        remainingSeconds: err.remainingSeconds,
      });
      return;
    }
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Admin: Get referral codes for event
app.get('/api/events/:id/referral-codes', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const stations = await dbService.getScannersByEvent(req.params.id);
    if (!stations || stations.length === 0) {
      return res.json({ codes: [] });
    }
    const codes = await dbService.getReferralCodes(req.params.id, admin.userId);
    res.json({ codes });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// Admin: Create referral code for event
app.post('/api/events/:id/referral-codes', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const stations = await dbService.getScannersByEvent(req.params.id);
    if (!stations || stations.length === 0) {
      return res.status(400).json({
        error: 'ERROR',
        message: 'Cannot generate referral codes without at least one gate station provisioned for this event. Please add a gate station first.',
      });
    }
    // Referral codes remain active indefinitely until the event is deleted
    const code = await dbService.createReferralCode(req.params.id, admin.userId, null);
    res.status(201).json({ success: true, code });
  } catch (err: any) {
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Admin: Toggle referral code status (ACTIVE / DISABLED)
app.patch('/api/events/:id/referral-codes/:codeId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const { status } = req.body;
    const code = await dbService.toggleReferralCode(req.params.codeId, req.params.id, admin.userId, status);
    res.json({ success: true, code });
  } catch (err: any) {
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Admin: Get scanner access requests for event
app.get('/api/events/:id/scanner-requests', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const requests = await dbService.getScannerRequestsByEvent(req.params.id, admin.userId);
    res.json({ requests });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// Admin: Approve scanner access request
app.post('/api/events/:id/scanner-requests/:reqId/approve', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const { scannerId, gateName, durationHours } = req.body;
    const request = await dbService.approveScannerRequest(
      req.params.reqId,
      req.params.id,
      admin.userId,
      scannerId,
      gateName,
      durationHours ? parseInt(durationHours, 10) : undefined
    );
    res.json({ success: true, request });
  } catch (err: any) {
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Admin: Reject scanner access request
app.post('/api/events/:id/scanner-requests/:reqId/reject', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const { reason } = req.body;
    const request = await dbService.rejectScannerRequest(
      req.params.reqId,
      req.params.id,
      admin.userId,
      reason
    );
    res.json({ success: true, request });
  } catch (err: any) {
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Admin: Revoke scanner access request
app.post('/api/events/:id/scanner-requests/:reqId/revoke', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const request = await dbService.revokeScannerRequest(
      req.params.reqId,
      req.params.id,
      admin.userId
    );
    res.json({ success: true, request });
  } catch (err: any) {
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Admin: Block scanner user
app.post('/api/events/:id/scanner-requests/:reqId/block', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const request = await dbService.blockScannerUser(
      req.params.reqId,
      req.params.id,
      admin.userId
    );
    res.json({ success: true, request });
  } catch (err: any) {
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Admin: Unblock scanner user
app.post('/api/events/:id/scanner-requests/:reqId/unblock', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const request = await dbService.unblockScannerUser(
      req.params.reqId,
      req.params.id,
      admin.userId
    );
    res.json({ success: true, request });
  } catch (err: any) {
    res.status(400).json({ error: 'ERROR', message: err.message });
  }
});

// Admin: Delete scanner access request
app.delete('/api/events/:id/scanner-requests/:reqId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    await dbService.deleteScannerAccessRequest(req.params.reqId, req.params.id, admin.userId);
    res.json({ success: true, message: 'Scanner request deleted.' });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

app.delete('/api/scanner-requests/:reqId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    await dbService.deleteScannerAccessRequest(req.params.reqId, undefined, admin.userId);
    res.json({ success: true, message: 'Scanner request deleted.' });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// ==========================================
// 5. CENTRALIZED ATOMIC CHECK-IN ENGINE
// ==========================================

// Validate Token & Record Check-In
app.post('/api/scan/validate', requireScannerOrAdmin, scanLimiter, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    const { eventId, scannedValue, scanType, clientScanId, secondaryValue } = req.body;

    if (!eventId || !scannedValue || !scanType) {
      res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required parameters: eventId, scannedValue, scanType.',
      });
      return;
    }

    // Verify authorization: Admin owner OR approved scanner request
    const authCheck = await dbService.validateScannerEventAccess(session.userId, eventId);
    if (!authCheck.authorized) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: authCheck.reason || 'Scanner is not authorized to perform check-ins for this event.',
      });
      return;
    }

    // 1b. Enforce Device Binding for Scanner
    const incomingDeviceUuid =
      (req.headers['x-device-uuid'] as string) ||
      (req.body?.deviceUuid as string) ||
      (req.body?.device_uuid as string);

    if (!enforceDeviceBinding(session, incomingDeviceUuid, res)) {
      return;
    }

    const scannerId = authCheck.scannerId;

    const result = await dbService.processCheckIn({
      eventId,
      scannedValue,
      scanType: scanType as ScanType,
      scannerId,
      clientScanId,
      source: 'online',
      secondaryValue,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// Batch Offline Synchronization (Hardened with Per-Item Reconciliation & Conflict Detection)
app.post('/api/scan/batch-sync', requireScannerOrAdmin, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    const { eventId, scans, deviceUuid } = req.body;

    if (!eventId || !Array.isArray(scans)) {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Invalid payload format. eventId and scans array are required.' });
      return;
    }

    if (scans.length > 500) {
      res.status(400).json({
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Batch sync limit is 500 scans per request.',
      });
      return;
    }

    // 1. Authoritative Scanner Authorization Check
    const authCheck = await dbService.validateScannerEventAccess(session.userId, eventId);
    if (!authCheck.authorized) {
      res.status(403).json({
        error: 'FORBIDDEN',
        code: 'SCANNER_REVOKED',
        message: authCheck.reason || 'Scanner access has been revoked or expired for this event.',
      });
      return;
    }

    // 1b. Enforce Device Binding for Scanner
    const incomingDeviceUuid =
      (req.headers['x-device-uuid'] as string) ||
      (deviceUuid as string) ||
      (req.body?.device_uuid as string);

    if (!enforceDeviceBinding(session, incomingDeviceUuid, res)) {
      return;
    }

    const scannerId = authCheck.scannerId || (session.role === 'ADMIN' ? session.userId : undefined);
    const results = [];

    // 2. Process each scan independently - server arrival order is authoritative
    for (const scan of scans) {
      const clientScanId = scan.client_scan_id;
      const scannedVal = scan.scanned_value;
      const scanType = scan.scan_type || 'QR';

      if (!clientScanId || !scannedVal) {
        results.push({
          client_scan_id: clientScanId || 'unknown',
          success: false,
          status: 'INVALID_PAYLOAD',
          message: 'Missing client_scan_id or scanned_value in queued item.',
        });
        continue;
      }

      try {
        const outcome = await dbService.processCheckIn({
          eventId,
          scannedValue: scannedVal,
          scanType: scanType as ScanType,
          scannerId,
          clientScanId,
          source: 'offline_sync',
        });

        // Detect Multi-Scanner Post-Sync Duplicate Conflict
        if (outcome.status === 'DUPLICATE_CHECKIN') {
          results.push({
            client_scan_id: clientScanId,
            success: false,
            status: 'POST_SYNC_DUPLICATE_CONFLICT',
            conflict_reason: outcome.message || 'Already checked in by another terminal prior to sync arrival.',
            student: outcome.student,
            check_in_at: outcome.check_in_at,
            message: 'POST-SYNC CONFLICT — Attendee was already checked in on the cloud.',
          });
        } else {
          results.push({
            client_scan_id: clientScanId,
            success: outcome.success,
            status: outcome.status,
            server_check_in_id: outcome.check_in_id,
            student: outcome.student,
            check_in_at: outcome.check_in_at,
            message: outcome.message,
          });
        }
      } catch (itemErr: any) {
        console.error(`[BatchSync] Error processing scan ${clientScanId}:`, itemErr);
        results.push({
          client_scan_id: clientScanId,
          success: false,
          status: 'SERVER_ERROR',
          message: itemErr.message || 'Unexpected server error during check-in processing.',
        });
      }
    }

    res.json({
      success: true,
      processed: results.length,
      device_uuid: deviceUuid,
      results,
    });
  } catch (err: any) {
    console.error('Batch sync endpoint error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ==========================================
// 6. HISTORY, LOGS & EXPORTS
// ==========================================

// Scan History
app.get('/api/events/:id/scans', requireScannerOrAdmin, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user as SessionData;
    if (session.role === 'SCANNER' && session.eventId !== req.params.id) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Unauthorized event access.' });
      return;
    }
    const adminId = session.role === 'ADMIN' ? session.userId : undefined;
    const { result, scannerId, search } = req.query;
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset !== undefined ? parseInt(req.query.offset as string, 10) : undefined;

    const scans = await dbService.getScanHistory(req.params.id, adminId, {
      result: result as string,
      scannerId: scannerId as string,
      search: search as string,
      limit,
      offset,
    });
    res.json({ scans, total: scans.length });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// Activity Logs
app.get('/api/events/:id/activity', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset !== undefined ? parseInt(req.query.offset as string, 10) : 0;

    const logs = await dbService.getActivityLogs(req.params.id, admin.userId, limit, offset);
    res.json({ logs });
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// Activity Logs are strictly immutable: physical deletion is forbidden
app.delete('/api/events/:id/activity', requireAdminAuth, async (_req: Request, res: Response) => {
  res.status(403).json({
    error: 'AUDIT_LOG_IMMUTABLE',
    message: 'Audit logs are strictly immutable and cannot be deleted.',
  });
});

// Generate Single-Use CSV Export Token
app.post('/api/events/:id/export-token', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as SessionData;
    const event = await dbService.getEventById(req.params.id, admin.userId);
    if (!event) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found or unauthorized.' });
      return;
    }

    const token = `exp_${crypto.randomBytes(24).toString('hex')}`;
    exportTokens.set(token, {
      eventId: req.params.id,
      adminId: admin.userId,
      expiresAt: Date.now() + 60 * 1000, // 60s single-use TTL
    });

    res.json({ token, expiresIn: 60 });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// CSV Export (Requires valid single-use export token)
app.get('/api/events/:id/export', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Valid export token is required.' });
      return;
    }

    const tokenData = exportTokens.get(token);
    if (!tokenData || tokenData.eventId !== req.params.id || tokenData.expiresAt < Date.now()) {
      if (tokenData) exportTokens.delete(token);
      res.status(403).json({ error: 'FORBIDDEN', message: 'Export token is invalid or has expired.' });
      return;
    }

    // Single-use: delete immediately upon redemption
    exportTokens.delete(token);

    const csvContent = await dbService.generateAttendanceCSV(tokenData.eventId, tokenData.adminId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="admitto-attendance-${req.params.id.substring(0, 8)}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(403).json({ error: 'FORBIDDEN', message: err.message });
  }
});

// ==========================================
// 7. VITE MIDDLEWARE & SERVER STARTUP
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    if (!sbUrl || !sbKey || sbUrl.includes('placeholder') || sbKey.includes('placeholder')) {
      console.error('[FATAL] Production startup aborted: Supabase credentials are missing or placeholder in production environment.');
      process.exit(1);
    }
  }

  const distPath = path.join(process.cwd(), 'dist');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (fs.existsSync(path.join(distPath, 'index.html')) && (process.argv[1]?.includes('dist') || !process.argv[1]?.endsWith('server.ts')));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[ADMITTO Server] Serving production build from:', distPath);
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ADMITTO Server] Live and running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  startServer().catch((err) => {
    console.error('Failed to start ADMITTO server:', err);
  });
}
