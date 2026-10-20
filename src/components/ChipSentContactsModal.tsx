import React, { useState, useMemo } from 'react';
import { X, Smartphone, CheckSquare, Square, CheckCircle2, ArrowRight, Send, Search } from 'lucide-react';
import { Contact, DispatchLogItem, AppSettings } from '../types';
import { cleanChipName, formatPhoneDisplay } from '../utils/whatsapp';

interface ChipSentContactsModalProps {
  chip: { id: string; name: string; color: string; maxLimit: number };
  logs: DispatchLogItem[];
  contacts: Contact[];
  settings: AppSettings;
  onClose: () => void;
  onUpdateContactsChip: (contactIds: string[], chipId: string, chipName: string) => void;
  showNotification: (msg: string) => void;
}

export const ChipSentContactsModal: React.FC<ChipSentContactsModalProps> = ({
  chip,
  logs,
  contacts,
  settings,
  onClose,
  onUpdateContactsChip,
  showNotification,
}) => {
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetChipId, setTargetChipId] = useState('');

  // Find all sent logs for this chip
  const sentLogsForChip = useMemo(() => {
    const chipClean = cleanChipName(chip.name).toLowerCase();
    return logs.filter(l => {
      if (l.status !== 'enviado') return false;
      const matchId = l.chipId === chip.id;
      const matchName = l.chipName && cleanChipName(l.chipName).toLowerCase() === chipClean;
      return matchId || matchName;
    });
  }, [logs, chip]);

  // Unique contacts sent by this chip
  const chipContacts = useMemo(() => {
    const map = new Map<string, { contact: Contact; lastSentAt?: string; count: number }>();
    
    sentLogsForChip.forEach(log => {
      const contactObj = contacts.find(c => c.id === log.contactId || c.phone.replace(/\D/g, '') === log.phone.replace(/\D/g, ''));
      if (contactObj) {
        const existing = map.get(contactObj.id);
        if (existing) {
          existing.count += 1;
          if (log.sentAt && (!existing.lastSentAt || new Date(log.sentAt) > new Date(existing.lastSentAt))) {
            existing.lastSentAt = log.sentAt;
          }
        } else {
          map.set(contactObj.id, { contact: contactObj, lastSentAt: log.sentAt, count: 1 });
        }
      }
    });

    return Array.from(map.values());
  }, [sentLogsForChip, contacts]);

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return chipContacts;
    const term = searchTerm.toLowerCase();
    return chipContacts.filter(({ contact }) => 
      contact.name.toLowerCase().includes(term) || contact.phone.includes(term)
    );
  }, [chipContacts, searchTerm]);

  const handleToggleSelect = (contactId: string) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    if (selectedContactIds.length === filteredContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredContacts.map(item => item.contact.id));
    }
  };

  const handleApplyNewChip = () => {
    if (selectedContactIds.length === 0) {
      showNotification('⚠️ Selecione ao menos um contato.');
      return;
    }
    if (!targetChipId) {
      showNotification('⚠️ Selecione o novo chip de destino.');
      return;
    }

    const allChips = settings.chips || [];
    const newChip = allChips.find(c => c.id === targetChipId);
    if (!newChip) return;

    onUpdateContactsChip(selectedContactIds, newChip.id, cleanChipName(newChip.name));
    showNotification(`✅ ${selectedContactIds.length} contatos movidos para o chip ${cleanChipName(newChip.name)}!`);
    setSelectedContactIds([]);
    setTargetChipId('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0E0E10] border-2 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 my-auto animate-scale-in" style={{ borderColor: chip.color || '#A88B4B' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262629] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-inner" style={{ backgroundColor: `${chip.color || '#A88B4B'}33`, border: `1px solid ${chip.color || '#A88B4B'}66` }}>
              <Smartphone className="w-5 h-5" style={{ color: chip.color || '#A88B4B' }} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <span>Chip: {cleanChipName(chip.name)}</span>
              </h3>
              <p className="text-xs text-gray-400">
                {chipContacts.length} {chipContacts.length === 1 ? 'contato enviado' : 'contatos enviados'} nas últimas 24h
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl bg-[#161619] border border-[#262629] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search & Select All */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar contato por nome ou telefone..."
              className="w-full bg-[#161619] border border-[#262629] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
            />
          </div>

          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-2 bg-[#161619] hover:bg-[#222226] text-gray-300 hover:text-white border border-[#262629] rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            {selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4 text-gray-400" />
            )}
            <span>Selecionar Todos ({filteredContacts.length})</span>
          </button>
        </div>

        {/* Batch Chip Change Action Bar (when items selected) */}
        {selectedContactIds.length > 0 && (
          <div className="bg-[#1C1F26] border border-[#A88B4B]/40 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <span className="text-xs text-amber-300 font-bold">
              {selectedContactIds.length} {selectedContactIds.length === 1 ? 'contato selecionado' : 'contatos selecionados'}
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={targetChipId}
                onChange={(e) => setTargetChipId(e.target.value)}
                className="bg-[#121214] border border-[#262629] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#A88B4B] flex-1 sm:w-48"
              >
                <option value="">Mudar para outro chip...</option>
                {(settings.chips || []).map(c => (
                  <option key={c.id} value={c.id}>
                    {cleanChipName(c.name)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleApplyNewChip}
                className="bg-[#A88B4B] hover:bg-[#C5A968] text-black font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-colors shrink-0"
              >
                Aplicar Chip
              </button>
            </div>
          </div>
        )}

        {/* Contacts List */}
        <div className="bg-[#121214] border border-[#262629] rounded-xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-[#1C1C20]">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(({ contact, lastSentAt, count }) => {
              const isSelected = selectedContactIds.includes(contact.id);
              const chipName = contact.chipName || (settings.chips?.find(c => c.id === contact.chipId)?.name) || 'Padrão';

              return (
                <div
                  key={contact.id}
                  onClick={() => handleToggleSelect(contact.id)}
                  className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected ? 'bg-[#A88B4B]/15 border-l-4 border-l-[#A88B4B]' : 'hover:bg-[#161619]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent div
                      className="w-4 h-4 rounded border-[#333336] bg-[#161619] text-[#A88B4B] focus:ring-0 cursor-pointer shrink-0"
                    />

                    <div className="w-8 h-8 rounded-lg bg-[#1E222B] text-gray-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-white font-bold text-xs truncate leading-tight">
                        {contact.name}
                      </h4>
                      <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                        {formatPhoneDisplay(contact.phone)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <span className="bg-[#1A1D24] border border-[#2A2E39] text-gray-300 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      Chip: {cleanChipName(chipName)}
                    </span>
                    {count > 1 && (
                      <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {count} envios
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-500 text-xs space-y-2">
              <Send className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-white font-medium">Nenhum contato encontrado para este chip</p>
              <p className="text-gray-400 text-[11px]">Os contatos para quem você enviar mensagens aparecerão aqui automaticamente.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-[#262629]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#161619] hover:bg-[#222226] text-gray-300 hover:text-white border border-[#262629] rounded-xl text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
