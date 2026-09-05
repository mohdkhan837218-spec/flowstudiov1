import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PathSecurity } from '../../src/main/security/paths';
import { ProfileManager } from '../../src/main/managers/ProfileManager';

describe('ProfileManager & PathSecurity', () => {
  const testAccountId = 'acct_test_01';

  beforeEach(() => {
    PathSecurity.initialize();
  });

  afterEach(() => {
    try {
      ProfileManager.releaseLock(testAccountId);
      ProfileManager.deleteProfile(testAccountId);
    } catch {
      // Cleanup
    }
  });

  it('should sanitize account IDs and prevent path traversal', () => {
    expect(PathSecurity.sanitizeAccountId('acct_valid_123')).toBe('acct_valid_123');
    expect(() => PathSecurity.sanitizeAccountId('../escape')).toThrow();
    expect(() => PathSecurity.sanitizeAccountId('..\\escape')).toThrow();
    expect(() => PathSecurity.sanitizeAccountId('')).toThrow();
  });

  it('should ensure isolated profile directory exists', () => {
    const profilePath = ProfileManager.ensureProfile(testAccountId);
    expect(fs.existsSync(profilePath)).toBe(true);
    expect(profilePath).toContain(testAccountId);
  });

  it('should prevent concurrent locking on the same profile', () => {
    ProfileManager.ensureProfile(testAccountId);
    
    // First lock acquisition succeeds
    ProfileManager.acquireLock(testAccountId);
    expect(ProfileManager.isLocked(testAccountId)).toBe(true);

    // Second lock acquisition must throw error
    expect(() => ProfileManager.acquireLock(testAccountId)).toThrow(/already locked/);

    // Release lock
    ProfileManager.releaseLock(testAccountId);
    expect(ProfileManager.isLocked(testAccountId)).toBe(false);
  });

  it('should safely delete profile directory upon removal', () => {
    const profilePath = ProfileManager.ensureProfile(testAccountId);
    expect(fs.existsSync(profilePath)).toBe(true);

    ProfileManager.deleteProfile(testAccountId);
    expect(fs.existsSync(profilePath)).toBe(false);
  });
});
