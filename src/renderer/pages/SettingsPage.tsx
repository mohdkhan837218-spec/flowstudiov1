import React, { useState, useEffect } from 'react';
import { Settings, Folder, Cpu, Eye, ShieldAlert, Key, Save, Check } from 'lucide-react';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { useSettingsStore } from '../stores/settingsStore';

export const SettingsPage: React.FC = () => {
  const { settings, isSaving, updateSettings, selectDownloadDir } = useSettingsStore();

  const [form, setForm] = useState({
    maxConcurrentWorkers: settings.maxConcurrentWorkers,
    headless: settings.headless,
    defaultBrowserTimeout: settings.defaultBrowserTimeout / 1000,
    navigationTimeout: settings.navigationTimeout / 1000,
    downloadDirectory: settings.downloadDirectory,
    groqApiKey: settings.groqApiKey || '',
    groqModel: settings.groqModel
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setForm({
      maxConcurrentWorkers: settings.maxConcurrentWorkers,
      headless: settings.headless,
      defaultBrowserTimeout: settings.defaultBrowserTimeout / 1000,
      navigationTimeout: settings.navigationTimeout / 1000,
      downloadDirectory: settings.downloadDirectory,
      groqApiKey: settings.groqApiKey || '',
      groqModel: settings.groqModel
    });
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      maxConcurrentWorkers: Number(form.maxConcurrentWorkers),
      headless: Boolean(form.headless),
      defaultBrowserTimeout: Number(form.defaultBrowserTimeout) * 1000,
      navigationTimeout: Number(form.navigationTimeout) * 1000,
      downloadDirectory: form.downloadDirectory,
      groqApiKey: form.groqApiKey,
      groqModel: form.groqModel
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto overflow-y-auto">
      <PageHeader
        title="Application Settings"
        subtitle="Configure concurrency dispatch limits, browser runtime settings, and Groq AI planning models."
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Worker Concurrency */}
        <div className="saas-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Worker Concurrency Limits</h3>
              <p className="text-xs text-slate-400">Controls how many isolated browser workers run simultaneously</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Max Concurrent Workers
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={form.maxConcurrentWorkers}
                onChange={(e) => setForm({ ...form, maxConcurrentWorkers: parseInt(e.target.value) || 1 })}
                className="w-full h-10 px-3.5 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Higher concurrency increases CPU and RAM consumption.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Browser Navigation Timeout (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={form.navigationTimeout}
                onChange={(e) => setForm({ ...form, navigationTimeout: parseInt(e.target.value) || 30 })}
                className="w-full h-10 px-3.5 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Headless & Visibility */}
        <div className="saas-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Browser Profile Visibility</h3>
              <p className="text-xs text-slate-400">Headless vs. Visible browser window execution</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.05]">
            <div>
              <div className="text-xs font-semibold text-slate-200">Visible Browser Mode (Recommended)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Visible mode allows seamless Google MFA/OAuth and prompt inspection without anti-bot false triggers.
              </div>
            </div>
            <input
              type="checkbox"
              checked={!form.headless}
              onChange={(e) => setForm({ ...form, headless: !e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 cursor-pointer"
            />
          </div>

          {form.headless && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Warning: Running Google profiles in headless mode may trigger security challenges or CAPTCHA verification.</span>
            </div>
          )}
        </div>

        {/* AI Planning / Groq Layer */}
        <div className="saas-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-500/30">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Groq AI Planning Engine</h3>
              <p className="text-xs text-slate-400">Decomposes stories and prompts into structured video jobs (Optional)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Groq API Key
              </label>
              <input
                type="password"
                value={form.groqApiKey}
                onChange={(e) => setForm({ ...form, groqApiKey: e.target.value })}
                placeholder="gsk_..."
                className="w-full h-10 px-3.5 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Model Name
              </label>
              <input
                type="text"
                value={form.groqModel}
                onChange={(e) => setForm({ ...form, groqModel: e.target.value })}
                placeholder="llama-3.3-70b-versatile"
                className="w-full h-10 px-3.5 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
              />
            </div>
          </div>
        </div>

        {/* UI Scale & Layout Density Section */}
        <div className="saas-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-500/30">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">UI Scale & Layout Density</h3>
              <p className="text-xs text-slate-400">Customize the application zoom level, typography scale, and information density</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                UI Scale: {Math.round((settings.uiScale || 1.0) * 100)}%
              </label>
              <select
                value={Math.round((settings.uiScale || 1.0) * 100)}
                onChange={(e) => updateSettings({ uiScale: parseInt(e.target.value) / 100 })}
                className="w-full h-10 px-3.5 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {[75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130].map((val) => (
                  <option key={val} value={val}>
                    {val}% {val === 100 ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Information Density
              </label>
              <select
                value={settings.uiDensity || 'standard'}
                onChange={(e) => updateSettings({ uiDensity: e.target.value as any })}
                className="w-full h-10 px-3.5 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="compact">Compact (Higher Density)</option>
                <option value="standard">Standard (Recommended)</option>
                <option value="comfortable">Comfortable (Spacious)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4" /> Settings saved successfully!
            </span>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
