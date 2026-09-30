import React from 'react';
import { ShieldAlert, X, CheckCircle2 } from 'lucide-react';

interface RuleViolationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  isBlocking?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export const RuleViolationModal: React.FC<RuleViolationModalProps> = ({
  isOpen,
  title,
  message,
  isBlocking,
  onConfirm,
  onCancel,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#12151C] border border-[#A88B4B]/40 rounded-xl max-w-lg max-h-[90vh] overflow-y-auto w-full p-4 sm:p-6 shadow-2xl relative">
        
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-[#A88B4B] to-amber-600" />

        <div className="flex items-start space-x-4">
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-400 shrink-0">
            <ShieldAlert className="w-7 h-7 animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white tracking-wide mb-1 flex items-center justify-between">
              <span>{title}</span>
              <button onClick={handleCancel} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </h3>
            <div className="text-xs sm:text-sm text-gray-300 mt-2 space-y-2 whitespace-pre-line leading-relaxed bg-[#181B22] p-3.5 rounded-lg border border-[#1F2229]">
              {message}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[#1F2229]">
          <button
            onClick={handleCancel}
            className="w-full sm:w-auto bg-[#1A1D23] hover:bg-[#252830] text-gray-400 hover:text-white px-4 py-2.5 rounded font-semibold text-xs uppercase tracking-wider transition-all border border-[#1F2229]"
          >
            Cancelar Envio
          </button>
          
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#A88B4B]/20 flex items-center justify-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Ok, entendi, liberar desta vez</span>
          </button>
        </div>

      </div>
    </div>
  );
};
