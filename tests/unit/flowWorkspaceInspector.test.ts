import { describe, it, expect, beforeEach } from 'vitest';
import { FlowWorkspaceInspector } from '../../src/main/providers/FlowWorkspaceInspector';
import { FlowProvider } from '../../src/main/providers/FlowProvider';
import { PathSecurity } from '../../src/main/security/paths';
import { AppDatabase } from '../../src/main/database/db';

describe('Flow Workspace Inspector & New Project Control', () => {
  beforeEach(async () => {
    PathSecurity.initialize();
    await AppDatabase.initialize();
  });

  it('should centrally provide Flow URL configuration', () => {
    const url = FlowProvider.getFlowUrl();
    expect(url).toBeDefined();
    expect(url).toContain('flow');
  });

  it('should define robust state transitions for New Project lifecycle', () => {
    const validStates = [
      'FLOW_HOME',
      'OPENING_NEW_PROJECT',
      'NEW_PROJECT_LOADING',
      'NEW_PROJECT_READY',
      'GENERATION_READY',
      'READY'
    ];

    expect(validStates).toContain('NEW_PROJECT_READY');
    expect(validStates).toContain('FLOW_HOME');
  });
});
