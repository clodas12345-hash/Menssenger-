import React from 'react';
import { Briefcase, Headphones, Smartphone, Send, Edit2, Trash2 } from 'lucide-react';
import { Contact } from '../types';
import { formatPhoneDisplay, matchPhoneNumber } from '../utils/whatsapp';
import { recordExclusion } from '../utils/storage';

interface ContactRowProps {
  contact: Contact;
  meta: { successfulCount: number; isSkipped: boolean; lastSentDateStr?: string; daysPassed?: number } | undefined;
  isSelected: boolean;
  isToday: boolean;
  isScheduled: boolean;
  isSkipped: boolean;
  chipTheme: any;
  isHighlighted: boolean;
  
  onToggleSelect: (id: string) => void;
  onOpenEdit: (contact: Contact) => void;
  onUpdateContact?: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onRequestDelete?: (contact: Contact) => void;
  onSendWhatsAppToContact?: (contact: Contact) => void;
  showNotification: (msg: string) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export const ContactRow = React.memo(({
  contact,
  meta,
  isSelected,
  isToday,
  isScheduled,
  isSkipped,
  chipTheme,
  isHighlighted,
  onToggleSelect,
  onOpenEdit,
  onUpdateContact,
  onDeleteContact,
  onRequestDelete,
  onSendWhatsAppToContact,
  showNotification,
  setSelectedIds,
}: ContactRowProps) => {
  const [showDeleteMenu, setShowDeleteMenu] = React.useState(false);
  const [alreadyRanPrompt, setAlreadyRanPrompt] = React.useState(false);
  return (
    <div 
      onClick={() => onToggleSelect(contact.id)}
      className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-all ${chipTheme.cardBorderLeft} ${
        isSelected 
          ? `${chipTheme.cardBgSelected} ${chipTheme.cardRingSelected}` 
          : `${chipTheme.cardBg} ${chipTheme.cardBgHover}`
      }`}
    >
      {/* Left: Checkbox & Info */}
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}} // Handled by parent div
          className={`w-4 h-4 rounded border-[#333336] bg-[#161619] ${chipTheme.checkboxAccent} focus:ring-0 cursor-pointer shrink-0`}
        />
        {/* Avatar Initial with Chip Color */}
        <div className={`w-10 h-10 rounded-xl ${chipTheme.avatarBg} border ${chipTheme.avatarBorder} flex items-center justify-center ${chipTheme.avatarText} text-sm shrink-0 shadow-inner ${chipTheme.avatarShadow}`}>
          {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
        </div>
        
        {/* Contact Details */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-white font-bold text-sm truncate leading-tight">
              {contact.name}
            </h4>
            
            
            {/* Status Badges */}
            {isToday && (
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                ✓ Enviado Hoje
              </span>
            )}
            {isScheduled && (
              <span className="bg-blue-950/80 text-blue-300 border border-blue-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                ⏰ Agendado
              </span>
            )}
            {isSkipped && (
              <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                ⚠️ Pulado
              </span>
            )}

            {/* Assigned Chip Badge */}
            {contact.chipId && contact.chipId !== 'unassigned' && (
              <span className={`inline-flex items-center gap-1 ${chipTheme.badgeBg} ${chipTheme.badgeText} border ${chipTheme.badgeBorder} text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider`}>
                <Smartphone className="w-2.5 h-2.5" />
                {contact.chipName || chipTheme.shortName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <span className={`font-mono font-medium rounded transition-all ${
              isHighlighted
                ? 'bg-[#A88B4B]/20 text-[#E5C365] border border-[#A88B4B]/50 px-2 py-0.5 font-bold shadow-xs'
                : chipTheme.phoneText
            }`}>
              {formatPhoneDisplay(contact.phone)}
            </span>
            
            {contact.group && (
              <span className="hidden sm:inline-block bg-[#16181D] text-gray-300 text-[10px] px-2 py-0.5 rounded border border-[#2A2D35] font-medium">
                {contact.group}
              </span>
            )}

            {meta?.lastSentDateStr && (
              <span className="hidden md:inline-block text-[10px] text-gray-500">
                Último envio: {meta.lastSentDateStr}
              </span>
            )}
          </div>

          {/* AI Extracted Dynamic Fields */}
          {contact.customFields && Object.keys(contact.customFields).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {Object.entries(contact.customFields).map(([key, val]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 bg-[#15181E] border border-[#A88B4B]/30 text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-mono shadow-sm"
                  title={`Campo Dinâmico: ${key} = ${val}`}
                >
                  <span className="text-gray-400 font-sans">{key}:</span>
                  <strong>{val as string}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* WhatsApp Direct */}
        <button
          onClick={() => onSendWhatsAppToContact && onSendWhatsAppToContact(contact)}
          className="p-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-500/40 rounded-xl transition-all"
          title="Abrir WhatsApp Direto"
        >
          <Send className="w-3.5 h-3.5" />
        </button>

        {/* Edit */}
        <button
          onClick={() => onOpenEdit(contact)}
          className="p-2 bg-[#161619] hover:bg-[#222226] text-gray-300 hover:text-white border border-[#262629] rounded-xl transition-all"
          title="Editar Contato"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onRequestDelete) {
                onRequestDelete(contact);
              } else {
                setShowDeleteMenu(true);
              }
            }}
            className="p-2.5 min-w-[38px] min-h-[38px] bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
            title="Excluir Contato"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {showDeleteMenu && (
            <div 
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteMenu(false);
              }}
            >
              <div 
                className="w-full max-w-xs bg-[#12141A] border border-[#262A34] rounded-2xl shadow-2xl p-4 flex flex-col gap-2.5 text-xs animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-[#1F2229] pb-2 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">Excluir Contato</span>
                  <p className="text-white font-bold text-sm truncate">{contact.name}</p>
                </div>

                <button 
                  type="button"
                  onClick={() => { 
                    setShowDeleteMenu(false); 
                    recordExclusion(contact, 'blocked');
                    if (onUpdateContact) {
                      onUpdateContact({...contact, notes: (contact.notes ? contact.notes + ' - ' : '') + 'Me Bloqueou'}); 
                    }
                    onDeleteContact(contact.id); 
                    setSelectedIds(prev => prev.filter(id => id !== contact.id)); 
                    showNotification(`🚫 Contato "${contact.name}" marcado como "Me Bloqueou" e excluído.`); 
                  }} 
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-600/30 text-red-200 border border-red-500/30 font-bold transition-colors cursor-pointer"
                >
                  🚫 Me Bloqueou
                </button>

                <button 
                  type="button"
                  onClick={() => { 
                    setShowDeleteMenu(false); 
                    setAlreadyRanPrompt(true);
                  }} 
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-600/30 text-amber-200 border border-amber-500/30 font-bold transition-colors cursor-pointer"
                >
                  🏃 Excluir já Correu
                </button>

                <button 
                  type="button"
                  onClick={() => { 
                    setShowDeleteMenu(false); 
                    recordExclusion(contact, 'noZap');
                    if (onUpdateContact) {
                      onUpdateContact({...contact, notes: (contact.notes ? contact.notes + ' - ' : '') + 'Sem Zap'}); 
                    }
                    onDeleteContact(contact.id); 
                    setSelectedIds(prev => prev.filter(id => id !== contact.id)); 
                    showNotification(`📵 Contato "${contact.name}" marcado como "Sem Zap" e excluído.`); 
                  }} 
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-600/30 text-blue-200 border border-blue-500/30 font-bold transition-colors cursor-pointer"
                >
                  📵 Excluir sem Zap
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteMenu(false)}
                  className="w-full text-center py-2 text-gray-400 hover:text-white font-medium text-[11px] uppercase tracking-wider mt-1"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {alreadyRanPrompt && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="bg-[#15181E] border border-[#2A2E38] rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative animate-scale-up text-center">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/40">
                  <Briefcase className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-lg font-serif italic text-white mb-1">Tempo de Cadastro</h3>
                  <p className="text-xs text-gray-300">
                    O motorista <strong className="text-white">{contact.name}</strong> tem menos de 30 dias ou mais de 30 dias cadastrados?
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAlreadyRanPrompt(false);
                      recordExclusion(contact, 'alreadyRan', 'lessThan30');
                      if (onUpdateContact) {
                        onUpdateContact({...contact, notes: (contact.notes ? contact.notes + ' - ' : '') + 'Já Correu (Menos de 30 dias - R$ 30)'});
                      }
                      onDeleteContact(contact.id);
                      setSelectedIds(prev => prev.filter(id => id !== contact.id));
                      showNotification(`🏃 Contato "${contact.name}" (< 30 dias) contabilizado: R$ 30 adicionados!`);
                    }}
                    className="w-full text-left p-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="text-sm font-bold text-white block">Menos de 30 dias</span>
                      <span className="text-[11px] text-emerald-400 font-bold">Comissão: R$ 30,00</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">R$ 30</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAlreadyRanPrompt(false);
                      recordExclusion(contact, 'alreadyRan', 'moreThan30');
                      if (onUpdateContact) {
                        onUpdateContact({...contact, notes: (contact.notes ? contact.notes + ' - ' : '') + 'Já Correu (Mais de 30 dias - R$ 50)'});
                      }
                      onDeleteContact(contact.id);
                      setSelectedIds(prev => prev.filter(id => id !== contact.id));
                      showNotification(`🏃 Contato "${contact.name}" (> 30 dias) contabilizado: R$ 50 adicionados!`);
                    }}
                    className="w-full text-left p-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="text-sm font-bold text-white block">Mais de 30 dias</span>
                      <span className="text-[11px] text-amber-400 font-bold">Comissão: R$ 50,00</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">R$ 50</span>
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setAlreadyRanPrompt(false)}
                    className="w-full py-2.5 rounded-xl bg-[#1A1D24] hover:bg-[#232732] text-gray-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
