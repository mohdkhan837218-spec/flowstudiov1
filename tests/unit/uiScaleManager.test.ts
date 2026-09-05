import { describe, it, expect, beforeEach } from 'vitest';
import { SCALE_PRESETS, calculateFitScale } from '../../src/renderer/components/layout/UIScaleControl';
import { applyScaleToDOM } from '../../src/renderer/stores/settingsStore';
import { DEFAULT_SETTINGS } from '../../src/shared/types/settings';
import { AppDatabase } from '../../src/main/database/db';
import { PathSecurity } from '../../src/main/security/paths';

describe('UI Scale, Zoom & Layout Density System', () => {
  const styleMap = new Map<string, string>();
  const attrMap = new Map<string, string>();

  beforeEach(() => {
    PathSecurity.initialize();
    styleMap.clear();
    attrMap.clear();

    // Polyfill window & document for Node test runner
    (globalThis as any).window = {
      innerWidth: 1920,
      innerHeight: 1080
    };

    (globalThis as any).document = {
      documentElement: {
        style: {
          setProperty: (key: string, val: string) => styleMap.set(key, val),
          getPropertyValue: (key: string) => styleMap.get(key) || ''
        },
        setAttribute: (key: string, val: string) => attrMap.set(key, val),
        getAttribute: (key: string) => attrMap.get(key) || ''
      }
    };
  });

  it('TEST 1: SCALE_PRESETS should cover exactly 75% to 130% in 5% steps', () => {
    expect(SCALE_PRESETS[0]).toBe(0.75);
    expect(SCALE_PRESETS[SCALE_PRESETS.length - 1]).toBe(1.30);
    expect(SCALE_PRESETS).toEqual([
      0.75, 0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30
    ]);
  });

  it('TEST 2: calculateFitScale should recommend optimal UI scale across screen resolutions', () => {
    // 1920x1080 Desktop
    window.innerWidth = 1920;
    window.innerHeight = 1080;
    expect(calculateFitScale()).toBe(1.0);

    // 1600x900
    window.innerWidth = 1600;
    window.innerHeight = 900;
    expect(calculateFitScale()).toBe(1.0);

    // 1366x768 Laptop
    window.innerWidth = 1366;
    window.innerHeight = 768;
    expect(calculateFitScale()).toBe(0.95);

    // 1280x720 Compact Screen
    window.innerWidth = 1280;
    window.innerHeight = 720;
    expect(calculateFitScale()).toBe(0.90);

    // 1024x768 Small Display
    window.innerWidth = 1024;
    window.innerHeight = 768;
    expect(calculateFitScale()).toBe(0.85);

    // Sub-1000px Ultra Compact
    window.innerWidth = 800;
    window.innerHeight = 600;
    expect(calculateFitScale()).toBe(0.75);
  });

  it('TEST 3: applyScaleToDOM should set CSS custom properties and clamp scale bounds', () => {
    applyScaleToDOM(0.95, 'standard');
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('0.95');
    expect(document.documentElement.style.getPropertyValue('--density-factor')).toBe('1.0');
    expect(document.documentElement.getAttribute('data-density')).toBe('standard');
    expect(document.documentElement.getAttribute('data-scale')).toBe('95%');

    // Clamp upper bound (1.5 -> 1.30)
    applyScaleToDOM(1.5, 'comfortable');
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('1.3');
    expect(document.documentElement.style.getPropertyValue('--density-factor')).toBe('1.15');

    // Clamp lower bound (0.5 -> 0.75)
    applyScaleToDOM(0.5, 'compact');
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('0.75');
    expect(document.documentElement.style.getPropertyValue('--density-factor')).toBe('0.85');
  });

  it('TEST 4: AppSettings and AppDatabase should persist uiScale and uiDensity', async () => {
    expect(DEFAULT_SETTINGS.uiScale).toBe(1.0);
    expect(DEFAULT_SETTINGS.uiDensity).toBe('standard');

    await AppDatabase.initialize();
    const updated = AppDatabase.saveSettings({ uiScale: 0.90, uiDensity: 'compact' });
    expect(updated.uiScale).toBe(0.90);
    expect(updated.uiDensity).toBe('compact');

    const fetched = AppDatabase.getSettings();
    expect(fetched.uiScale).toBe(0.90);
    expect(fetched.uiDensity).toBe('compact');
  });
});
