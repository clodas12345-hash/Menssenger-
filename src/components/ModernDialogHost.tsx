import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  DialogRequest,
  DialogVariant,
  resolveActiveDialog,
  subscribeDialog,
} from '../utils/dialog';

const VARIANT_STYLES: Record<
  DialogVariant,
  {
    topBar: string;
    iconBg: string;
    iconColor: string;
    badgeText: string;
    badgeBg: string;
    primaryBtn: string;
    borderGlow: string;
  }
> = {
  success: {
    topBar: 'from-emerald-400 via-emerald-500 to-teal-400',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_24px_rgba(16,185,129,0.2)]',
    iconColor: 'text-emerald-400',
    badgeText: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/25',
    primaryBtn:
      'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#07110D] shadow-lg shadow-emerald-950/50',
    borderGlow: 'border-emerald-500/25',
  },
  warning: {
    topBar: 'from-amber-400 via-[#D4AF37] to-amber-500',
    iconBg: 'bg-amber-500/15 border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.2)]',
    iconColor: 'text-amber-400',
    badgeText: 'text-amber-300',
    badgeBg: 'bg-amber-500/10 border-amber-500/25',
    primaryBtn:
      'bg-gradient-to-r from-[#A88B4B] to-[#D4AF37] hover:from-[#BFA15E] hover:to-[#E3C152] text-[#0A0C10] shadow-lg shadow-[#A88B4B]/25',
    borderGlow: 'border-amber-500/25',
  },
  danger: {
    topBar: 'from-red-500 via-rose-500 to-red-400',
    iconBg: 'bg-red-500/15 border-red-500/30 shadow-[0_0_24px_rgba(239,68,68,0.22)]',
    iconColor: 'text-red-400',
    badgeText: 'text-red-300',
    badgeBg: 'bg-red-500/10 border-red-500/25',
    primaryBtn:
      'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-950/50',
    borderGlow: 'border-red-500/30',
  },
  info: {
    topBar: 'from-[#A88B4B] via-[#D4AF37] to-[#A88B4B]',
    iconBg: 'bg-[#A88B4B]/15 border-[#A88B4B]/35 shadow-[0_0_24px_rgba(168,139,75,0.22)]',
    iconColor: 'text-[#D4AF37]',
    badgeText: 'text-[#D4AF37]',
    badgeBg: 'bg-[#A88B4B]/10 border-[#A88B4B]/25',
    primaryBtn:
      'bg-gradient-to-r from-[#A88B4B] to-[#D4AF37] hover:from-[#BFA15E] hover:to-[#E3C152] text-[#0A0C10] shadow-lg shadow-[#A88B4B]/25',
    borderGlow: 'border-[#A88B4B]/30',
  },
};

export const ModernDialogHost: React.FC = () => {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    return subscribeDialog(setDialog);
  }, []);

  useEffect(() => {
    if (!dialog) return;

    const focusTimer = window.setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        resolveActiveDialog(dialog.mode === 'alert');
      } else if (e.key === 'Enter') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'BUTTON') {
          e.preventDefault();
          resolveActiveDialog(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialog]);

  if (!dialog) return null;

  const style = VARIANT_STYLES[dialog.variant];
  const paragraphs = dialog.message
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const hasHeadline = paragraphs.length > 1 && paragraphs[0].length <= 110;
  const headline = hasHeadline ? paragraphs[0] : null;
  const bodyText = hasHeadline ? paragraphs.slice(1).join('\n\n') : dialog.message;

  const renderIcon = () => {
    switch (dialog.variant) {
      case 'success':
        return <CheckCircle2 className={`w-6 h-6 ${style.iconColor}`} />;
      case 'danger':
        return <ShieldAlert className={`w-6 h-6 ${style.iconColor}`} />;
      case 'warning':
        return <AlertTriangle className={`w-6 h-6 ${style.iconColor}`} />;
      default:
        return <Info className={`w-6 h-6 ${style.iconColor}`} />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modern-dialog-title"
      onClick={() => resolveActiveDialog(dialog.mode === 'alert')}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl bg-gradient-to-b from-[#1A1E28] via-[#141720] to-[#0E1016] border ${style.borderGlow} shadow-[0_28px_80px_rgba(0,0,0,0.85)] overflow-hidden transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Line */}
        <div className={`h-1 w-full bg-gradient-to-r ${style.topBar}`} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${style.iconBg}`}
            >
              {renderIcon()}
            </div>
            <div>
              <span
                className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border mb-1 ${style.badgeBg} ${style.badgeText}`}
              >
                {dialog.mode === 'confirm' ? 'Confirmação' : 'Notificação'}
              </span>
              <h3
                id="modern-dialog-title"
                className="text-base font-bold text-white tracking-wide leading-tight"
              >
                {dialog.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => resolveActiveDialog(dialog.mode === 'alert')}
            aria-label="Fechar janela"
            className="text-gray-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-3">
          <div className="bg-[#0A0C10]/70 border border-[#232834] rounded-xl p-4 space-y-2.5">
            {headline && (
              <p className="text-sm font-semibold text-white leading-snug whitespace-pre-line">
                {headline}
              </p>
            )}
            <p
              className={`${
                headline ? 'text-xs text-gray-300' : 'text-sm text-gray-200'
              } leading-relaxed whitespace-pre-line break-words`}
            >
              {bodyText}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 pt-2 pb-5">
          {dialog.mode === 'confirm' && (
            <button
              type="button"
              onClick={() => resolveActiveDialog(false)}
              className="px-4 py-2.5 rounded-xl bg-[#1A1E27] hover:bg-[#232834] text-gray-300 hover:text-white border border-[#2C3240] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
            >
              {dialog.cancelText}
            </button>
          )}
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => resolveActiveDialog(true)}
            className={`${
              dialog.mode === 'alert' ? 'w-full sm:w-auto sm:min-w-[130px]' : ''
            } px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${style.primaryBtn}`}
          >
            {dialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
