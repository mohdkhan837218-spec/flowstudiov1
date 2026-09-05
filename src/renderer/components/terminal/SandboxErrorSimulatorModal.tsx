import React, { useState } from 'react';
import { X, Beaker, AlertTriangle, Play, Sparkles } from 'lucide-react';
import { useTerminalStore } from '../../stores/terminalStore';
import { SandboxSimulationType } from '../../../shared/types/diagnostics';

const SIMULATION_SCENARIOS: {
  id: SandboxSimulationType;
  title: string;
  category: string;
  description: string;
  expectedErrorCode: string;
}[] = [
  {
    id: 'VIDEO_BUTTON_MISSING',
    title: 'Video Button Missing (DOM / ARIA)',
    category: 'Mode Switcher',
    description: 'Simulates Flow composer stuck in Image mode (Nano Banana 2) with Video tab selector failing across DOM, ARIA, and AX tree.',
    expectedErrorCode: 'FLOW_MODE_BUTTON_NOT_FOUND'
  },
  {
    id: 'WRONG_ROUTE',
    title: 'Wrong Route Navigation (/characters)',
    category: 'Navigation',
    description: 'Simulates navigation inadvertently landing on /characters sub-route rather than generation workspace root.',
    expectedErrorCode: 'FLOW_WRONG_ROUTE'
  },
  {
    id: 'GENERATION_TIMEOUT',
    title: 'Generation Timeout (180s elapsed)',
    category: 'Monitoring',
    description: 'Simulates prompt submission succeeded but Google Flow generation produced 0 media outputs within 180 seconds.',
    expectedErrorCode: 'FLOW_GENERATION_TIMEOUT'
  },
  {
    id: 'SUBMIT_FAILURE',
    title: 'Submit Button Disabled after Prompt',
    category: 'Submission',
    description: 'Simulates prompt injected into composer textarea but the circular submit arrow remains disabled.',
    expectedErrorCode: 'FLOW_SUBMIT_BUTTON_DISABLED'
  },
  {
    id: 'WORKER_CRASH',
    title: 'Worker Crash / Heartbeat Timeout',
    category: 'Worker',
    description: 'Simulates browser process termination or >30s heartbeat expiration.',
    expectedErrorCode: 'WORKER_CRASH'
  }
];

export const SandboxErrorSimulatorModal: React.FC = () => {
  const { isSimulatorOpen, setSimulatorOpen, selectError } = useTerminalStore();
  const [simulating, setSimulating] = useState<string | null>(null);

  if (!isSimulatorOpen) return null;

  const handleSimulate = async (type: SandboxSimulationType) => {
    setSimulating(type);
    try {
      if (window.flowWorkspace?.diagnostics?.simulateError) {
        const res = await window.flowWorkspace.diagnostics.simulateError(type);
        if (res.success && res.error) {
          selectError(res.error);
          setSimulatorOpen(false);
        }
      }
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#151824] border border-[#283046] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#242b3e] bg-[#1a1e2d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-xl">
              <Beaker size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-100">Sandbox Error Simulator</h2>
              <p className="text-xs text-neutral-400">
                Trigger forensic Flow failure scenarios to verify exact error chains and inspector diagnostics.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSimulatorOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-[#252c40] rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scenarios List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {SIMULATION_SCENARIOS.map((sc) => (
            <div
              key={sc.id}
              className="bg-[#181c28] border border-[#283044] hover:border-purple-500/50 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-neutral-200">{sc.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-mono">
                    {sc.category}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">{sc.description}</p>
                <div className="text-[10px] font-mono text-rose-400">
                  Target Code: {sc.expectedErrorCode}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSimulate(sc.id)}
                disabled={Boolean(simulating)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-lg text-xs font-semibold shrink-0 transition-all group-hover:scale-105 disabled:opacity-50"
              >
                <Play size={12} className={simulating === sc.id ? 'animate-spin' : ''} />
                <span>{simulating === sc.id ? 'Triggering...' : 'Trigger'}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#131620] border-t border-[#242b3e] flex items-center justify-between text-xs text-neutral-400">
          <span>Logs and error state are immediately injected into the live terminal stream.</span>
          <button
            type="button"
            onClick={() => setSimulatorOpen(false)}
            className="px-3 py-1.5 bg-[#1e2436] hover:bg-[#28314a] text-neutral-200 rounded-lg border border-[#2d3652] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
