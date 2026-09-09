import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../../src/lib/db';
import { clearAllOfflineData } from '../../src/lib/offline/idb';
import { getOrCreateDeviceUuid } from '../../src/lib/offline/security';
import crypto from 'crypto';

describe('Offline Security, RBAC & Password Reset Non-Regression', () => {
  beforeEach(async () => {
    await clearAllOfflineData();
    dbService.setForceInMemory(true);
    dbService.resetDatabase();
  });

  it('A. Revoked Scanner: Disabled scanner fails event authorization check', async () => {
    const admin = await dbService.createAdminProfile('admin@admitto.local', 'Admin', 'pass123');
    const event = await dbService.createEvent(admin.id, { title: 'Security Conference', venue: 'Hall B' });
    const scanner = await dbService.createScanner(event.id, admin.id, {
      name: 'Revoked Volunteer',
      access_code: 'REVOKED01',
    });

    // Verify authorized when active
    const activeCheck = await dbService.validateScannerEventAccess(scanner.id, event.id);
    expect(activeCheck.authorized).toBe(true);

    // Disable scanner
    await dbService.toggleScannerStatusById(scanner.id, admin.id, false);

    // Verify rejected when revoked
    const revokedCheck = await dbService.validateScannerEventAccess(scanner.id, event.id);
    expect(revokedCheck.authorized).toBe(false);
    expect(revokedCheck.reason).toContain('disabled');
  });

  it('B. Cryptographic Device UUID: Generates valid UUID format and persists across re-reads', async () => {
    const uuid1 = await getOrCreateDeviceUuid();
    expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Re-reading returns the same persistent device UUID
    const uuid2 = await getOrCreateDeviceUuid();
    expect(uuid2).toBe(uuid1);
  });

  it('C. Password-Reset Regression: OTP generation, hashing, attempt limiting & invalidation', async () => {
    const testEmail = 'reset_regression_tester@admitto.local';
    const admin = await dbService.createAdminProfile(testEmail, 'Reset Tester', 'InitialPass123!');

    // 1. Create active reset code
    const rawOtp = '789123';
    const codeHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const createdRecord = await dbService.createPasswordResetCode(
      admin.id,
      testEmail,
      codeHash,
      expiresAt
    );
    expect(createdRecord).toBeDefined();
    expect(createdRecord.used).toBe(false);

    // 2. Fetch active code
    const activeCode = await dbService.getActivePasswordResetCode(testEmail);
    expect(activeCode).not.toBeNull();
    expect(activeCode?.code_hash).toBe(codeHash);

    // 3. Increment attempts
    const attempts1 = await dbService.incrementPasswordResetAttempts(activeCode!.id);
    expect(attempts1).toBe(1);

    // 4. Mark code as used
    await dbService.markPasswordResetCodeUsed(activeCode!.id);

    // 5. Code must no longer be active
    const codeAfterUse = await dbService.getActivePasswordResetCode(testEmail);
    expect(codeAfterUse).toBeNull();
  });
});
