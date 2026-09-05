import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Globe, Shield, CheckCircle2, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { useAccountStore } from '../../stores/accountStore';
import { GoogleAccount } from '../../../shared/types/account';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (account: GoogleAccount) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { accounts, createAccount, connectAccount } = useAccountStore();
  const nextNum = String(accounts.length + 1).padStart(2, '0');
  const [displayName, setDisplayName] = useState(`Google Account ${nextNum}`);
  const [step, setStep] = useState<'input' | 'connecting' | 'success' | 'error'>('input');
  const [createdAccount, setCreatedAccount] = useState<GoogleAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create account & isolated directory
      const account = await createAccount(displayName.trim());
      setCreatedAccount(account);
      setStep('connecting');

      // 2. Launch visible browser to Google Login
      const res = await connectAccount(account.id);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed launching browser profile');
        setStep('error');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error initializing account profile');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (step === 'success' && createdAccount && onSuccess) {
      onSuccess(createdAccount);
    }
    setStep('input');
    setDisplayName(`Google Account ${String(accounts.length + 1).padStart(2, '0')}`);
    setCreatedAccount(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'connecting' ? 'Connecting Google Account' : 'Add Google Account Profile'}
      subtitle={
        step === 'connecting'
          ? 'Complete your login manually in the visible browser window'
          : 'Creates an isolated persistent browser profile for this account'
      }
      maxWidth="md"
    >
      {step === 'input' && (
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Account Label / Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Google Account 01, Main Channel, etc."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              autoFocus
              required
            />
          </div>

          <div className="p-3.5 rounded-xl bg-brand-500/5 border border-brand-500/15 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-brand-400">
              <Shield className="w-4 h-4 text-brand-400 shrink-0" />
              <span>Zero-Credential Storage & Strict Isolation</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every account receives its own dedicated browser profile. You will perform normal Google login directly inside the official Google page. Passwords and MFA are never captured or saved by Flow Workspace.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isProcessing}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Launch Login Browser
            </Button>
          </div>
        </form>
      )}

      {step === 'connecting' && (
        <div className="py-4 space-y-5 text-center">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/30">
            <Globe className="w-8 h-8 text-brand-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">Browser Window Launched</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Please sign into your Google account in the Chromium window that just opened. Complete any MFA or security verification as usual.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-left text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Account ID:</span>
              <span className="font-mono text-slate-200">{createdAccount?.id}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Status:</span>
              <span className="text-cyan-400 font-medium animate-pulse">Waiting for manual login...</span>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Finish & Check in Dashboard
            </Button>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="py-2 space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-rose-300">Connection Failed</h5>
              <p className="text-xs text-rose-200/80 mt-1">{errorMessage || 'An unknown error occurred.'}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setStep('input')}>
              Try Again
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
