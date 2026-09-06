import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../../src/lib/db';

describe('Security, Multi-Tenancy & RBAC Enforcement', () => {
  let adminAId: string;
  let adminBId: string;
  let eventAId: string;
  let eventBId: string;

  beforeEach(async () => {
    dbService.setForceInMemory(true);
    dbService.resetDatabase();

    // Create Admin A and Event A
    const adminA = await dbService.createAdminProfile('adminA@test.local', 'Admin A', 'passwordA');
    adminAId = adminA.id;
    const eventA = await dbService.createEvent(adminAId, { title: "Admin A's Exclusive Summit" });
    eventAId = eventA.id;

    // Create Admin B and Event B
    const adminB = await dbService.createAdminProfile('adminB@test.local', 'Admin B', 'passwordB');
    adminBId = adminB.id;
    const eventB = await dbService.createEvent(adminBId, { title: "Admin B's Private Gala" });
    eventBId = eventB.id;
  });

  it('enforces multi-tenant isolation: Admin A cannot retrieve Admin B event', async () => {
    const eventLookup = await dbService.getEventById(eventBId, adminAId);
    expect(eventLookup).toBeNull();
  });

  it('enforces scanner event scoping: Scanner for Event A cannot scan for Event B', async () => {
    const scannerA = await dbService.createScanner(eventAId, adminAId, {
      name: 'Gate 1 Scanner',
      access_code: 'GATE-NORTH-A',
    });

    const accessCheck = await dbService.validateScannerEventAccess(scannerA.id, eventBId);
    expect(accessCheck.authorized).toBe(false);
    expect(accessCheck.reason).toContain('not authorized');
  });

  it('immediately blocks deactivated scanner accounts', async () => {
    const scanner = await dbService.createScanner(eventAId, adminAId, {
      name: 'Temporary Guard',
      access_code: 'GATE-TEMP-1',
    });

    // Scanner is initially active
    const initialCheck = await dbService.validateScannerEventAccess(scanner.id, eventAId);
    expect(initialCheck.authorized).toBe(true);

    // Admin deactivates scanner
    await dbService.toggleScannerStatusById(scanner.id, adminAId, false);

    // Deactivated scanner must be blocked immediately
    const postDeactivationCheck = await dbService.validateScannerEventAccess(scanner.id, eventAId);
    expect(postDeactivationCheck.authorized).toBe(false);
    expect(postDeactivationCheck.reason).toContain('disabled');
  });

  it('enforces referral code maximum use limits', async () => {
    const referral = await dbService.createReferralCode(eventAId, adminAId, undefined, 2);

    // Redemption 1: should succeed
    const req1 = await dbService.createScannerAccessRequest(
      'user_1',
      'scanner1@test.local',
      'Volunteer 1',
      referral.code
    );
    expect(req1.id).toBeDefined();

    // Redemption 2: should succeed
    const req2 = await dbService.createScannerAccessRequest(
      'user_2',
      'scanner2@test.local',
      'Volunteer 2',
      referral.code
    );
    expect(req2.id).toBeDefined();

    // Redemption 3: should be rejected
    await expect(
      dbService.createScannerAccessRequest(
        'user_3',
        'scanner3@test.local',
        'Volunteer 3',
        referral.code
      )
    ).rejects.toThrow(/maximum redemption limit/);
  });

  it('strictly prohibits deletion of audit trail logs (Audit Log Immutability)', async () => {
    await expect(dbService.clearActivityLogs(eventAId, adminAId)).rejects.toThrow(
      'AUDIT_LOG_IMMUTABLE'
    );
  });

  it('ensures scanner referral codes do not expire by time and remain valid until event is deleted', async () => {
    // 1. Create a dedicated test event
    const tempEvent = await dbService.createEvent(adminAId, {
      title: 'Temporary Gala Event',
      venue: 'North Hall',
      event_date: '2026-10-10',
    });

    // 2. Create a referral code for this event
    const refCode = await dbService.createReferralCode(tempEvent.id, adminAId);
    expect(refCode.expires_at).toBeNull();

    // 3. Verify it is valid
    const lookupBefore = await dbService.getReferralCodeByValue(refCode.code);
    expect(lookupBefore).not.toBeNull();
    expect(lookupBefore?.event.id).toBe(tempEvent.id);

    // 4. Delete the event
    await dbService.deleteEvent(tempEvent.id, adminAId);

    // 5. Verify the referral code is now expired/invalidated
    const lookupAfter = await dbService.getReferralCodeByValue(refCode.code);
    expect(lookupAfter).toBeNull();
  });
});
