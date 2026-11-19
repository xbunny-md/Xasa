import fs from 'fs';
import { describe, expect, it } from 'vitest';

describe('Firestore Security Rules & Blueprint Integrity', () => {
  const rulesText = fs.readFileSync('firestore.rules', 'utf8');
  const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

  it('enforces default-deny catch-all rule, verified owner isolation, and email-verified admin check', () => {
    expect(rulesText).toContain("rules_version = '2';");
    expect(rulesText).toContain('match /{document=**} {');
    expect(rulesText).toContain('allow read, write: if false;');
    expect(rulesText).toContain('request.auth.token.email_verified == true');
    expect(rulesText).toContain("request.auth.token.email == 'jkambi00@gmail.com'");
    expect(rulesText).toContain("request.auth.token.email == 'xbotmanager@gmail.com'");
  });

  it('guards every blueprint collection with matching rules blocks and validation helpers', () => {
    const paths = Object.keys(blueprint.firestore);
    expect(paths).toContain('/users/{userId}');
    expect(paths).toContain('/users/{userId}/scanHistory/{scanId}');
    expect(paths).toContain('/users/{userId}/bookingCodes/{codeId}');
    expect(paths).toContain('/users/{userId}/presets/{presetId}');
    expect(paths).toContain('/users/{userId}/favorites/{favoriteId}');
    expect(paths).toContain('/users/{userId}/favoriteTickets/{ticketId}');
    expect(paths).toContain('/users/{userId}/notifications/{notificationId}');
    expect(paths).toContain('/users/{userId}/transfers/{transferId}');
    expect(paths).toContain('/admins/{adminUid}');
    expect(paths).toContain('/publicTickets/{ticketId}');
    expect(paths).toContain('/publicTicketUpdates/{ticketId}');
    expect(paths).toContain('/adminSettings/{settingId}');
    expect(paths).toContain('/publicStats/{statId}');
    expect(paths).toContain('/adminAuditLogs/{logId}');
    expect(paths).toContain('/bookmakerFeedStates/{bookmakerId}');
    expect(paths).toContain('/feedCycles/{cycleId}');
    expect(paths).toContain('/matchResults/{resultId}');

    expect(rulesText).toContain('isValidUserProfile(');
    expect(rulesText).toContain('isValidScanHistory(');
    expect(rulesText).toContain('isValidBookingCode(');
    expect(rulesText).toContain('isValidFilterPreset(');
    expect(rulesText).toContain('isValidFavoriteItem(');
    expect(rulesText).toContain('isValidFavoriteTicket(');
    expect(rulesText).toContain('isValidNotification(');
    expect(rulesText).toContain('isValidTransferRecord(');
    expect(rulesText).toContain('isValidAdminRole(');
    expect(rulesText).toContain('isValidPublicTicket(');
    expect(rulesText).toContain('isValidPublicTicketUpdate(');
    expect(rulesText).toContain('isValidAdminSettings(');
    expect(rulesText).toContain('isValidPublicStats(');
    expect(rulesText).toContain('isValidAdminAuditLog(');
    expect(rulesText).toContain('isValidBookmakerFeedState(');
    expect(rulesText).toContain('isValidFeedCycle(');
    expect(rulesText).toContain('isValidMatchResult(');
  });

  it('enforces immutability on publicTickets, feedCycles, & adminAuditLogs and terminal state locking on publicTicketUpdates', () => {
    expect(rulesText).not.toMatch(/allow\s+list:\s*if\s+isSignedIn\(\)\s*;/);
    expect(rulesText).toContain('resource.data.isPublic == true');
    expect(rulesText).toContain("!(existing().status in ['WON', 'LOST', 'VOID'])");
    expect(rulesText).toContain("existing().status != 'SETTLED'");
    expect(rulesText).toContain('incoming().createdAt == request.time');
    expect(rulesText).toContain('incoming().updatedAt == request.time');
    expect(rulesText).toContain('affectedKeys().hasOnly(');
    expect(rulesText).toContain('isValidId(');
  });

  it('validates cycleId, idempotencyKey, independent bookmaker lock state, and Live/Other targets', () => {
    expect(rulesText).toContain("data.themePreference in ['dark', 'light']");
    expect(rulesText).toContain("data.preferredBookmaker in ['SPORTYBET_TZ', 'BETPAWA_TZ']");
    expect(rulesText).toContain("data.activeBookmaker in ['SPORTYBET_TZ', 'BETPAWA_TZ']");
    expect(rulesText).toContain("data.bookmakerId in ['SPORTYBET_TZ', 'BETPAWA_TZ']");
    expect(rulesText).toContain("data.feedSection in ['UPCOMING', 'LIVE_FOOTBALL', 'OTHER_SPORTS']");
    expect(rulesText).toContain("data.lockStatus in ['LOCKED', 'UNLOCKED']");
    expect(rulesText).toContain('cycleId');
    expect(rulesText).toContain('idempotencyKey');
    expect(rulesText).toContain('data.liveFootballTarget >= 10');
    expect(rulesText).toContain('data.otherSportsTarget >= 10');
    expect(rulesText).toContain('settledWonCount');
  });

  it('allows admin get existence checks even when publicTickets or cycle documents do not exist yet', () => {
    expect(rulesText).toContain(
      'allow get: if isValidId(ticketId) && (isAdmin() || (resource != null && resource.data.isPublic == true));'
    );
    expect(rulesText).toContain(
      'allow get: if isValidId(statId) && (isAdmin() || resource == null || resource.data.isPublic == true);'
    );
    expect(rulesText).toContain(
      'allow get: if isValidId(cycleId) && (isAdmin() || (resource != null && resource.data.isPublic == true));'
    );
    expect(rulesText).toContain(
      'allow get: if isValidId(bookmakerId) && (isAdmin() || (resource != null && resource.data.isPublic == true));'
    );
    expect(rulesText).toContain(
      'allow get: if isValidId(resultId) && (isAdmin() || (resource != null && resource.data.isPublic == true));'
    );
  });
});
