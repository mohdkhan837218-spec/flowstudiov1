import { describe, it, expect, beforeEach } from 'vitest';
import { FlowCapabilityDetector } from '../../src/main/providers/FlowCapabilityDetector';
import { PathSecurity } from '../../src/main/security/paths';
import { AppDatabase } from '../../src/main/database/db';

describe('Flow Capabilities & Runtime Discovery', () => {
  beforeEach(async () => {
    PathSecurity.initialize();
    await AppDatabase.initialize();
  });

  it('should return baseline mock capabilities with video and image options', () => {
    const caps = FlowCapabilityDetector.getCachedCapabilities('acct_test_caps_01');
    expect(caps).toBeDefined();
    expect(caps.generationTypes).toContain('VIDEO');
    expect(caps.generationTypes).toContain('IMAGE');

    // Video capabilities
    expect(caps.video.models.length).toBeGreaterThan(0);
    expect(caps.video.aspectRatios.length).toBeGreaterThan(0);
    expect(caps.video.durations.length).toBeGreaterThan(0);

    // Image capabilities
    expect(caps.image.models.length).toBeGreaterThan(0);
    expect(caps.image.aspectRatios.length).toBeGreaterThan(0);
  });

  it('should maintain isolated capabilities per account', () => {
    const caps1 = FlowCapabilityDetector.getCachedCapabilities('acct_alpha');
    const caps2 = FlowCapabilityDetector.getCachedCapabilities('acct_beta');

    expect(caps1.accountId).toBe('acct_alpha');
    expect(caps2.accountId).toBe('acct_beta');
  });
});
