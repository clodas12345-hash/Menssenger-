import React, { useState } from 'react';
import { CheckCircle2, XCircle, MessageSquare, EyeOff, Sparkles, Smartphone } from 'lucide-react';
import { Contact, AppSettings, DispatchLogItem } from '../types';
import { formatPhoneDisplay } from '../utils/vcfParser';
import { cleanChipName, getExpectedGroup } from '../utils/whatsapp';

interface ConfirmSentModalProps {
  isOpen: boolean;
  contact: Contact | null;
  settings: AppSettings;
  logs: DispatchLogItem[];
  onConfirmSent: (isSent: boolean, chipId?: string, chipName?: string) => void;
  onClose: () => void;
}

export const ConfirmSentModal: React.FC<ConfirmSentModalProps> = ({
  isOpen,
  contact,
  settings,
  logs,
  onConfirmSent,
  onClose,
}) => {
  if (!isOpen || !contact) return null;

  const defaultChipId = settings.activeChipId || settings.chips?.[0]?.id || 'chip_1';
  const [selectedChipId, setSelectedChipId] = useState<string>(contact.chipId || defaultChipId);
  
  const [dispatchStartTime] = useState<number>(() => {
    const stored = localStorage.getItem('gkd_dispatch_start_time');
    return stored ? Number(stored) : Date.now();
  });

  const activeChip = (settings.chips || []).find(c => c.id === selectedChipId) || (settings.chips || [])[0];
  const chipName = activeChip ? cleanChipName(activeChip.name) : 'Business';

  // Calculate current successful send count for this contact
  const successfulCount = logs.filter(
    l => l.status === 'enviado' && (l.contactId === contact.id || (contact.phone && l.phone && l.phone.replace(/\D/g, '') === contact.phone.replace(/\D/g, '')))
  ).length;

  const nextCount = successfulCount + 1;
  const suggestedEnvioText = getExpectedGroup(nextCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0C10]/90 p-3 sm:p-4">
      <div className="bg-[#15181E] border border-[#2A2D35] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto text-gray-100 shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 border-t-4 border-t-[#A88B4B]">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-3 bg-[#A88B4B]/10 rounded-lg text-[#A88B4B] border border-[#A88B4B]/30 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#A88B4B] uppercase tracking-widest flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#A88B4B]" />
                <span>Confirmação de Envio (WhatsApp)</span>
              </span>
              <h3 className="text-xl font-serif italic text-white mt-0.5">
                A mensagem foi enviada?
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                WhatsApp aberto para <strong className="text-white">{contact.name}</strong> ({formatPhoneDisplay(contact.phone)}).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 p-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>


        <div className="bg-[#0A0C10] p-4 rounded-lg border border-[#1F2229]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Envio Detectado:</span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">
              {suggestedEnvioText} ({successfulCount} anteriores)
            </span>
          </div>
        </div>

        <div className="bg-[#0A0C10] p-3.5 rounded-lg border border-[#1F2229] space-y-1.5 text-xs">
          <div className="flex items-center space-x-2 text-[#A88B4B] font-bold">
            <EyeOff className="w-4 h-4 text-[#A88B4B]" />
            <span>Regra de Ocultação Automática:</span>
          </div>
          <p className="text-gray-300 leading-relaxed text-[11px]">
            Ao confirmar, este contato ficará oculto por hoje para evitar duplicações.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onConfirmSent(true, selectedChipId, chipName)}
            className="w-full py-3.5 px-4 rounded-lg bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] font-black text-xs uppercase tracking-widest shadow-lg shadow-[#A88B4B]/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sim, enviada! ({suggestedEnvioText})</span>
          </button>

          <button
            type="button"
            onClick={() => onConfirmSent(false, selectedChipId, chipName)}
            className="w-full py-3.5 px-4 rounded-lg bg-[#0A0C10] hover:bg-[#1A1D23] text-gray-400 hover:text-white border border-[#1F2229] font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-red-400" />
            <span>Não foi enviada</span>
          </button>
        </div>
      </div>
    </div>
  );
};

