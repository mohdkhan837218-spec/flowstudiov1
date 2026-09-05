import { describe, it, expect } from 'vitest';
import { GenerationWorkspaceResolver } from '../../src/main/providers/GenerationWorkspaceResolver';
import { FlowActionTracer } from '../../src/main/diagnostics/FlowActionTracer';
import { FlowProjectManager } from '../../src/main/managers/FlowProjectManager';

describe('GenerationWorkspaceResolver & Wrong Route Protection', () => {
  it('TEST 1: isWrongRoute should correctly identify /characters, /scenes, /tools sub-routes', () => {
    expect(GenerationWorkspaceResolver.isWrongRoute('https://labs.google/fx/tools/flow/project/98ffb93c-9413-4ecd-baf1-84beeb33e59/characters').isWrong).toBe(true);
    expect(GenerationWorkspaceResolver.isWrongRoute('https://labs.google/fx/tools/flow/project/98ffb93c-9413-4ecd-baf1-84beeb33e59/scenes').isWrong).toBe(true);
    expect(GenerationWorkspaceResolver.isWrongRoute('https://labs.google/fx/tools/flow/project/98ffb93c-9413-4ecd-baf1-84beeb33e59/tools').isWrong).toBe(true);
    expect(GenerationWorkspaceResolver.isWrongRoute('https://labs.google/fx/tools/flow/project/98ffb93c-9413-4ecd-baf1-84beeb33e59/videos').isWrong).toBe(true);

    // Valid project workspace URLs
    expect(GenerationWorkspaceResolver.isWrongRoute('https://labs.google/fx/tools/flow/project/98ffb93c-9413-4ecd-baf1-84beeb33e59').isWrong).toBe(false);
    expect(GenerationWorkspaceResolver.isWrongRoute('https://labs.google/fx/tools/flow').isWrong).toBe(false);
  });

  it('TEST 2: FlowProjectManager.cleanProjectUrl should strip sub-routes and return clean base project URL', () => {
    const rawUrl = 'https://labs.google/fx/tools/flow/project/98ffb93c-9413-4ecd-baf1-84beeb33e59/characters';
    const cleaned = FlowProjectManager.cleanProjectUrl(rawUrl);
    expect(cleaned).toBe('https://labs.google/fx/tools/flow/project/98ffb93c-9413-4ecd-baf1-84beeb33e59');

    const scenesUrl = 'https://labs.google/fx/tools/flow/project/abc-123/scenes/detail';
    expect(FlowProjectManager.cleanProjectUrl(scenesUrl)).toBe('https://labs.google/fx/tools/flow/project/abc-123');
  });

  it('TEST 3: FlowActionTracer should produce forensic diagnostic error for FLOW_WRONG_ROUTE with exact recovery strategy', () => {
    const tracer = new FlowActionTracer('job_route_001', 'acct_01', 'worker_01', 'proj_01');

    tracer.recordAction('OPEN_PROJECT', 'NAVIGATE', 'Open Project', 'https://labs.google/flow/project/123');
    tracer.completeAction('ACT-0001', 'SUCCESS');

    const diagError = tracer.createDiagnosticError({
      code: 'FLOW_WRONG_ROUTE',
      message: 'Google Flow navigated to incorrect sub-route (/characters) instead of Generation Workspace',
      expected: { generationType: 'VIDEO' },
      actual: {
        currentRoute: '/characters',
        clickedElement: 'Characters navigation link'
      },
      flowUrl: 'https://labs.google/fx/tools/flow/project/98ffb93c-9413-4ecd-baf1-84beeb33e59/characters'
    });

    expect(diagError.code).toBe('FLOW_WRONG_ROUTE');
    expect(diagError.category).toBe('WRONG_ROUTE_ERROR');
    expect(diagError.confidence).toBe('HIGH');
    expect(diagError.retryStrategy).toBe('RETURN_TO_GENERATION_WORKSPACE');
    expect(diagError.likelyRootCause).toContain('Characters, Scenes, or Tools navigation sub-route');
    expect(diagError.humanExplanation).toContain('/characters');
    expect(diagError.evidence.length).toBeGreaterThanOrEqual(3);
  });
});
