import { describe, it, expect } from 'vitest';
import { FlowModeResolver, ModeCandidateInfo } from '../../src/main/providers/FlowModeResolver';
import { FlowProvider } from '../../src/main/providers/FlowProvider';

describe('FlowModeResolver & Flow State Machine Tests', () => {
  it('correctly filters candidate intent and rejects navigation links', () => {
    // 1. Sidebar link named "Videos" -> REJECT
    const navLinkCandidate: Partial<ModeCandidateInfo> = {
      tag: 'a',
      role: 'link',
      text: 'Videos',
      accessibleName: 'Videos',
      isNavLink: true,
      visible: true
    };
    const navIntent = FlowModeResolver.evaluateCandidateIntent(navLinkCandidate, 'VIDEO');
    expect(navIntent.accepted).toBe(false);
    expect(navIntent.reason).toContain('link');

    // 2. Project asset section named "Videos" -> REJECT
    const sectionCandidate: Partial<ModeCandidateInfo> = {
      tag: 'span',
      text: 'videos',
      isInsideComposer: false,
      isAdjacentToImage: false,
      visible: true
    };
    const sectionIntent = FlowModeResolver.evaluateCandidateIntent(sectionCandidate, 'VIDEO');
    expect(sectionIntent.accepted).toBe(false);
    expect(sectionIntent.reason).toContain('plural "Videos" outside composer');

    // 3. Composer mode switcher button named "Video" -> ACCEPT
    const modeBtnCandidate: Partial<ModeCandidateInfo> = {
      tag: 'button',
      role: 'button',
      text: 'Video',
      accessibleName: 'Video',
      isInsideComposer: true,
      isAdjacentToImage: true,
      visible: true,
      enabled: true
    };
    const modeIntent = FlowModeResolver.evaluateCandidateIntent(modeBtnCandidate, 'VIDEO');
    expect(modeIntent.accepted).toBe(true);

    // 4. Segmented tab named "Video" adjacent to "Image" -> ACCEPT
    const tabCandidate: Partial<ModeCandidateInfo> = {
      tag: 'div',
      role: 'tab',
      text: 'Video',
      isAdjacentToImage: true,
      visible: true,
      enabled: true
    };
    const tabIntent = FlowModeResolver.evaluateCandidateIntent(tabCandidate, 'VIDEO');
    expect(tabIntent.accepted).toBe(true);
  });

  it('evaluates IMAGE mode candidate intent correctly', () => {
    const imageBtn: Partial<ModeCandidateInfo> = {
      tag: 'button',
      role: 'tab',
      text: 'Image',
      accessibleName: 'Image mode',
      visible: true,
      enabled: true
    };
    const intent = FlowModeResolver.evaluateCandidateIntent(imageBtn, 'IMAGE');
    expect(intent.accepted).toBe(true);
  });

  it('clears page loading reason and treats FLOW_HOME as ready in FlowProvider', async () => {
    // Mock page with Flow Home elements
    const mockPage: any = {
      url: () => 'https://labs.google/fx/tools/flow',
      evaluate: async (fn: any) => {
        const fnStr = fn.toString();
        if (fnStr.includes('Terms of Service') || fnStr.includes('hasConsentDialog') || fnStr.includes('Join Waitlist')) {
          return false; // No onboarding/consent dialog
        }
        // Return simulated DOM elements with "+ New Project" button
        return {
          hasPrompt: false,
          hasNewProj: true,
          hasGen: false,
          buttonCount: 5
        };
      }
    };

    const readiness = await FlowProvider.isFlowReady(mockPage);
    expect(readiness.state).toBe('FLOW_HOME');
    expect(readiness.reason).toBeUndefined(); // Crucial: must NOT be 'Page loading'
  });
});
