import React from 'react';
import { Briefcase, Headphones, Smartphone, Send, Edit2, Trash2 } from 'lucide-react';
import { Contact } from '../types';
import { formatPhoneDisplay, matchPhoneNumber } from '../utils/whatsapp';

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
  onDeleteContact: (id: string) => void;
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
  onDeleteContact,
  onSendWhatsAppToContact,
  showNotification,
  setSelectedIds,
}: ContactRowProps) => {
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteContact(contact.id);
            setSelectedIds(prev => prev.filter(id => id !== contact.id));
            showNotification(`🗑️ Contato "${contact.name}" excluído com sucesso!`);
          }}
          className="p-2.5 min-w-[38px] min-h-[38px] bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
          title="Excluir Contato"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
