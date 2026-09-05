import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Maximize2, Check } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';

export const SCALE_PRESETS = [0.75, 0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30];

export const calculateFitScale = (): number => {
  if (typeof window === 'undefined') return 1.0;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Content measurement & responsive heuristics
  // 1920x1080 -> 100%
  // 1600x900 -> 100%
  // 1366x768 -> 95%
  // 1280x720 -> 90%
  // 1024x768 -> 85%
  // < 1024 -> 80% or 75%
  let recommended = 1.0;
  if (w >= 1800 && h >= 980) {
    recommended = 1.0;
  } else if (w >= 1500 && h >= 860) {
    recommended = 1.0;
  } else if (w >= 1340 && h >= 740) {
    recommended = 0.95;
  } else if (w >= 1200 && h >= 680) {
    recommended = 0.90;
  } else if (w >= 1000) {
    recommended = 0.85;
  } else if (w >= 850) {
    recommended = 0.80;
  } else {
    recommended = 0.75;
  }

  return recommended;
};

export const UIScaleControl: React.FC = () => {
  const { settings, setScale } = useSettingsStore();
  const currentScale = Math.round((settings.uiScale || 1.0) * 100) / 100;
  const [showMenu, setShowMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 1500);
  };

  const handleSetScale = async (scale: number, label?: string) => {
    const clamped = Math.min(Math.max(Math.round(scale * 100) / 100, 0.75), 1.30);
    await setScale(clamped);
    showToast(label || `UI Scale: ${Math.round(clamped * 100)}%`);
  };

  const handleDecrease = async () => {
    const currentIndex = SCALE_PRESETS.findIndex((s) => Math.abs(s - currentScale) < 0.02);
    if (currentIndex > 0) {
      await handleSetScale(SCALE_PRESETS[currentIndex - 1]);
    } else if (currentScale > 0.75) {
      await handleSetScale(Math.max(currentScale - 0.05, 0.75));
    }
  };

  const handleIncrease = async () => {
    const currentIndex = SCALE_PRESETS.findIndex((s) => Math.abs(s - currentScale) < 0.02);
    if (currentIndex >= 0 && currentIndex < SCALE_PRESETS.length - 1) {
      await handleSetScale(SCALE_PRESETS[currentIndex + 1]);
    } else if (currentScale < 1.30) {
      await handleSetScale(Math.min(currentScale + 0.05, 1.30));
    }
  };

  const handleFit = async () => {
    const recommended = calculateFitScale();
    await handleSetScale(recommended, `Fit to Window: ${Math.round(recommended * 100)}%`);
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts (Ctrl/Cmd + -, Ctrl/Cmd + +, Ctrl/Cmd + 0, Ctrl/Cmd + Shift + 0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: Never intercept when user is typing in editable inputs
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleDecrease();
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        handleIncrease();
      } else if (e.key === '0') {
        e.preventDefault();
        if (e.shiftKey) {
          handleFit();
        } else {
          handleSetScale(1.0, 'UI Scale: 100% (Reset)');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScale]);

  return (
    <div className="relative inline-flex items-center app-no-drag" ref={menuRef}>
      {/* Compact Scale Pill: fixed max sizing to stay crisp */}
      <div className="flex items-center bg-slate-900/90 border border-white/[0.1] rounded-lg p-0.5 shadow-sm text-xs select-none">
        {/* Decrease Button */}
        <button
          type="button"
          onClick={handleDecrease}
          disabled={currentScale <= 0.75}
          aria-label="Decrease UI scale"
          title="Decrease UI scale (Ctrl + -)"
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Percentage Picker Trigger */}
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Select UI scale"
          title="Change UI scale"
          className="px-2 h-7 font-mono font-bold text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 rounded-md transition-colors flex items-center gap-1"
        >
          <span>{Math.round(currentScale * 100)}%</span>
        </button>

        {/* Increase Button */}
        <button
          type="button"
          onClick={handleIncrease}
          disabled={currentScale >= 1.30}
          aria-label="Increase UI scale"
          title="Increase UI scale (Ctrl + +)"
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-white/[0.1] mx-0.5" />

        {/* Fit to Window Button */}
        <button
          type="button"
          onClick={handleFit}
          aria-label="Fit UI to window"
          title="Fit UI to current window (Ctrl + Shift + 0)"
          className="px-2 h-7 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] rounded-md transition-colors flex items-center gap-1"
        >
          <Maximize2 className="w-3 h-3 text-indigo-400" />
          <span>Fit</span>
        </button>
      </div>

      {/* Preset Dropdown Menu */}
      {showMenu && (
        <div
          className="absolute right-0 top-full mt-2 w-48 saas-modal rounded-xl p-1.5 shadow-2xl z-50 border border-white/[0.12] space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          role="menu"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.06] flex items-center justify-between">
            <span>UI Scale Presets</span>
            <span className="font-mono text-indigo-400">{Math.round(currentScale * 100)}%</span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
            {SCALE_PRESETS.map((preset) => {
              const isSelected = Math.abs(preset - currentScale) < 0.02;
              const percent = Math.round(preset * 100);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    handleSetScale(preset);
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {percent === 100 && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-sans">
                        Default
                      </span>
                    )}
                    <span>{percent}%</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/[0.06] pt-1 mt-1">
            <button
              type="button"
              onClick={() => {
                handleFit();
                setShowMenu(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-indigo-300 hover:bg-indigo-600/20 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fit to Window</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+Shift+0</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Auto-dismiss Scale Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-scale-toast">
          <div className="px-4 py-2 rounded-full bg-slate-900/95 border border-indigo-500/40 text-indigo-200 text-xs font-semibold shadow-2xl shadow-indigo-950/50 flex items-center gap-2 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
