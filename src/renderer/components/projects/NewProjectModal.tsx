import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Sparkles, Plus, Trash2, Clapperboard, ArrowRight, Play } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { ShotPlanItem } from '../../../shared/types/project';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { createProject, enqueueProject, decomposeWithGroq, isDecomposing } = useProjectStore();

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [conceptPrompt, setConceptPrompt] = useState('');
  const [numShots, setNumShots] = useState(4);
  const [shots, setShots] = useState<ShotPlanItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleDecompose = async () => {
    if (!conceptPrompt.trim()) return;
    try {
      const plan = await decomposeWithGroq(conceptPrompt, numShots);
      setProjectName(plan.projectName);
      setDescription(plan.description);
      setShots(plan.shots);
    } catch {
      // Handled in store
    }
  };

  const handleAddCustomShot = () => {
    const nextIdx = shots.length + 1;
    setShots([
      ...shots,
      {
        id: `shot_${String(nextIdx).padStart(3, '0')}`,
        prompt: 'Cinematic wide camera shot with dynamic lighting',
        duration: 5,
        aspectRatio: '16:9'
      }
    ]);
  };

  const handleRemoveShot = (index: number) => {
    setShots(shots.filter((_, i) => i !== index));
  };

  const handleUpdateShot = (index: number, field: keyof ShotPlanItem, value: any) => {
    const updated = [...shots];
    updated[index] = { ...updated[index], [field]: value };
    setShots(updated);
  };

  const handleSave = async (autoEnqueue = false) => {
    if (!projectName.trim() || shots.length === 0) return;
    setIsSaving(true);
    try {
      const project = await createProject({
        name: projectName.trim(),
        description,
        sourcePrompt: conceptPrompt || projectName,
        shots
      });

      if (autoEnqueue) {
        await enqueueProject(project.id);
      }

      handleClose();
      if (onSuccess) onSuccess();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setProjectName('');
    setDescription('');
    setConceptPrompt('');
    setShots([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Video Generation Project"
      subtitle="Input your story or concept — Groq AI decomposes it into individual camera shots"
      maxWidth="2xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Story Concept Box */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-brand-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>AI Story / Concept Input</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Shots:</span>
              <select
                value={numShots}
                onChange={(e) => setNumShots(parseInt(e.target.value))}
                className="bg-slate-950 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-slate-200"
              >
                <option value={2}>2 Shots</option>
                <option value={3}>3 Shots</option>
                <option value={4}>4 Shots</option>
                <option value={6}>6 Shots</option>
                <option value={8}>8 Shots</option>
              </select>
            </div>
          </div>

          <textarea
            rows={3}
            value={conceptPrompt}
            onChange={(e) => setConceptPrompt(e.target.value)}
            placeholder="e.g. A cyberpunk detective searches a rain-slicked Tokyo alley, finds a glowing holographic chip, and escapes as rogue drones swarm overhead..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDecompose}
              isLoading={isDecomposing}
              disabled={!conceptPrompt.trim()}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Decompose into {numShots} Shots with Groq
            </Button>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Cyberpunk Alley Detective"
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief visual summary..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Shots List / Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Clapperboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Shot Sequence Plan ({shots.length})</span>
            </h4>
            <Button variant="ghost" size="sm" onClick={handleAddCustomShot} icon={<Plus className="w-3.5 h-3.5" />}>
              Add Custom Shot
            </Button>
          </div>

          {shots.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-white/10 text-center text-xs text-slate-500">
              Click "Decompose with Groq" above or click "Add Custom Shot" to define your scene list.
            </div>
          ) : (
            <div className="space-y-2.5">
              {shots.map((shot, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-brand-400">
                      {shot.id || `Shot ${index + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={shot.duration}
                        onChange={(e) => handleUpdateShot(index, 'duration', parseInt(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded px-2 py-0.5 text-[11px] text-slate-300"
                      >
                        <option value={5}>5 sec</option>
                        <option value={10}>10 sec</option>
                      </select>

                      <select
                        value={shot.aspectRatio}
                        onChange={(e) => handleUpdateShot(index, 'aspectRatio', e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded px-2 py-0.5 text-[11px] text-slate-300"
                      >
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="1:1">1:1 Square</option>
                      </select>

                      <button
                        onClick={() => handleRemoveShot(index)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={shot.prompt}
                    onChange={(e) => handleUpdateShot(index, 'prompt', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-white/5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSave(false)}
            isLoading={isSaving}
            disabled={!projectName.trim() || shots.length === 0}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave(true)}
            isLoading={isSaving}
            disabled={!projectName.trim() || shots.length === 0}
            icon={<Play className="w-3.5 h-3.5" />}
          >
            Save & Enqueue All Shots
          </Button>
        </div>
      </div>
    </Modal>
  );
};
