import React, { useState, useMemo } from 'react';
import { Save, Trash2, Download, X, AlertTriangle, ShieldCheck, FolderCheck, Calendar, Sparkles, FileSpreadsheet, FileText, Database } from 'lucide-react';
import { DispatchLogItem, ScheduledCampaign, Contact } from '../types';

interface SaveAndResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: DispatchLogItem[];
  campaigns: ScheduledCampaign[];
  contacts: Contact[];
  onExecute: (config: {
    saveLogs: boolean;
    saveCampaigns: boolean;
    saveContacts: boolean;
    resetLogs: boolean;
    resetCampaigns: boolean;
    resetContacts: boolean;
    archiveName: string;
    exportType: 'csv' | 'json' | 'pdf' | 'none';
    notes?: string;
  }) => void;
}

export const SaveAndResetModal: React.FC<SaveAndResetModalProps> = ({
  isOpen,
  onClose,
  logs,
  campaigns,
  contacts,
  onExecute,
}) => {
  if (!isOpen) return null;

  const [saveLogs, setSaveLogs] = useState<boolean>(true);
  const [saveCampaigns, setSaveCampaigns] = useState<boolean>(true);
  const [saveContacts, setSaveContacts] = useState<boolean>(true);

  const [resetLogs, setResetLogs] = useState<boolean>(true);
  const [resetCampaigns, setResetCampaigns] = useState<boolean>(false);
  const [resetContacts, setResetContacts] = useState<boolean>(false);

  const defaultArchiveName = useMemo(() => {
    return `Ciclo ${new Date().toLocaleDateString('pt-BR')} - ${logs.length} disparos`;
  }, [logs.length]);

  const [archiveName, setArchiveName] = useState<string>(defaultArchiveName);
  const [notes, setNotes] = useState<string>('');
  const [exportChoice, setExportChoice] = useState<'none' | 'csv' | 'json' | 'pdf'>('pdf');

  // Fast metrics calculation
  const metrics = useMemo(() => {
    const sent = logs.filter(l => l.status === 'enviado').length;
    const failed = logs.filter(l => l.status === 'falha').length;
    const skipped = logs.filter(l => l.status === 'pulado').length;
    const successRate = logs.length > 0 ? Math.round((sent / logs.length) * 100) : 0;
    const uniqueContacts = new Set(logs.map(l => l.contactId || l.phone)).size;

    return { sent, failed, skipped, successRate, uniqueContacts };
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute({
      saveLogs,
      saveCampaigns,
      saveContacts,
      resetLogs,
      resetCampaigns,
      resetContacts,
      archiveName: archiveName.trim() || `Ciclo ${new Date().toLocaleDateString('pt-BR')}`,
      exportType: exportChoice,
      notes: notes.trim(),
    });
    onClose();
  };

  const handleApplyPreset = (preset: 'cycle15' | 'all' | 'safe') => {
    if (preset === 'cycle15') {
      setArchiveName(`Projeto 15 Dias - ${new Date().toLocaleDateString('pt-BR')}`);
      setSaveLogs(true);
      setSaveCampaigns(true);
      setSaveContacts(true);
      setResetLogs(true);
      setResetCampaigns(false);
      setResetContacts(false);
      setExportChoice('pdf');
    } else if (preset === 'all') {
      setArchiveName(`Fechamento Completo - ${new Date().toLocaleDateString('pt-BR')}`);
      setSaveLogs(true);
      setSaveCampaigns(true);
      setSaveContacts(true);
      setResetLogs(true);
      setResetCampaigns(true);
      setResetContacts(false);
      setExportChoice('pdf');
    } else if (preset === 'safe') {
      setArchiveName(`Backup Seguro - ${new Date().toLocaleDateString('pt-BR')}`);
      setSaveLogs(true);
      setSaveCampaigns(true);
      setSaveContacts(true);
      setResetLogs(false);
      setResetCampaigns(false);
      setResetContacts(false);
      setExportChoice('json');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#15181E] border border-[#A88B4B]/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-gray-100 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1F2229] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#A88B4B]/10 border border-[#A88B4B]/30 rounded-xl text-[#A88B4B]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-serif flex items-center space-x-2">
                <span>Finalização & Arquivamento de Projeto</span>
                <span className="text-[10px] bg-[#A88B4B]/20 text-[#A88B4B] border border-[#A88B4B]/40 px-2 py-0.5 rounded-full font-sans uppercase font-bold tracking-wider">
                  Ciclo Seguro
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Consolide o ciclo, guarde relatórios completos em pasta histórica e prepare o sistema para a próxima fase.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#1F2229] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 bg-[#0A0C10] border border-[#1F2229] p-3 rounded-xl">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Disparos</span>
            <span className="text-base font-extrabold font-mono text-white">{logs.length} regs</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Envios com Sucesso</span>
            <span className="text-base font-extrabold font-mono text-emerald-400">{metrics.sent} ({metrics.successRate}%)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Contatos Atingidos</span>
            <span className="text-base font-extrabold font-mono text-indigo-400">{metrics.uniqueContacts} únicos</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Campanhas Ativas</span>
            <span className="text-base font-extrabold font-mono text-[#A88B4B]">{campaigns.length} itens</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-bold text-gray-400 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-[#A88B4B]" />
            <span>Predefinições:</span>
          </span>
          <button
            type="button"
            onClick={() => handleApplyPreset('cycle15')}
            className="text-xs font-bold px-3 py-1 bg-[#1A1D24] hover:bg-[#252830] border border-[#2A2E39] text-[#A88B4B] rounded-lg transition-all"
          >
            🔄 Ciclo 15 Dias
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('all')}
            className="text-xs font-bold px-3 py-1 bg-[#1A1D24] hover:bg-[#252830] border border-[#2A2E39] text-gray-300 rounded-lg transition-all"
          >
            🏁 Encerramento Geral
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('safe')}
            className="text-xs font-bold px-3 py-1 bg-[#1A1D24] hover:bg-[#252830] border border-[#2A2E39] text-emerald-400 rounded-lg transition-all"
          >
            🛡️ Apenas Salvar (Sem Limpar)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {/* Nome do Ciclo / Projeto */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A88B4B]">
              Nome da Pasta / Projeto no Histórico
            </label>
            <input
              type="text"
              value={archiveName}
              onChange={(e) => setArchiveName(e.target.value)}
              placeholder="Ex: Campanha de Vendas - 15 Dias"
              className="w-full bg-[#0A0C10] border border-[#2A2E39] rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#A88B4B]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* O que Salvar / Arquivar */}
            <div className="bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider border-b border-[#1F2229] pb-2">
                <Save className="w-4 h-4" />
                <span>O que Deseja Salvar na Pasta?</span>
              </div>

              <div className="space-y-2 pt-0.5">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={saveLogs}
                    onChange={(e) => setSaveLogs(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-[#A88B4B] focus:ring-[#A88B4B]"
                  />
                  <span>Histórico de Disparos ({logs.length} registros)</span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={saveCampaigns}
                    onChange={(e) => setSaveCampaigns(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-[#A88B4B] focus:ring-[#A88B4B]"
                  />
                  <span>Campanhas / Agendamentos ({campaigns.length} itens)</span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={saveContacts}
                    onChange={(e) => setSaveContacts(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-[#A88B4B] focus:ring-[#A88B4B]"
                  />
                  <span>Contatos Cadastrados ({contacts.length} contatos)</span>
                </label>
              </div>
            </div>

            {/* O que Zerar / Limpar */}
            <div className="bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider border-b border-[#1F2229] pb-2">
                <Trash2 className="w-4 h-4" />
                <span>O que Deseja Zerar da Tela Ativa?</span>
              </div>

              <div className="space-y-2 pt-0.5">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={resetLogs}
                    onChange={(e) => setResetLogs(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-rose-500 focus:ring-rose-500"
                  />
                  <span className={resetLogs ? 'text-rose-300 font-bold' : 'text-gray-400'}>
                    Limpar Histórico Ativo (Próximo Ciclo)
                  </span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={resetCampaigns}
                    onChange={(e) => setResetCampaigns(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-rose-500 focus:ring-rose-500"
                  />
                  <span className={resetCampaigns ? 'text-rose-300 font-bold' : 'text-gray-400'}>
                    Zerar Campanhas Concluídas
                  </span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={resetContacts}
                    onChange={(e) => setResetContacts(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-rose-500 focus:ring-rose-500"
                  />
                  <span className={resetContacts ? 'text-rose-300 font-bold' : 'text-gray-400'}>
                    Zerar Lista de Contatos
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Observações / Notas do Fechamento */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
              Observações do Fechamento (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Ciclo concluído com 98% de entrega, turma 1 finalizada com sucesso."
              className="w-full bg-[#0A0C10] border border-[#2A2E39] rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B]"
            />
          </div>

          {/* Opções de Exportação */}
          <div className="bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3.5 space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
              Deseja Baixar Cópia Externa Imediata?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setExportChoice('pdf')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                  exportChoice === 'pdf'
                    ? 'bg-[#A88B4B]/20 border-[#A88B4B] text-[#A88B4B] shadow-md'
                    : 'bg-[#15181E] border-[#2A2E39] text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Relatório PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setExportChoice('csv')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                  exportChoice === 'csv'
                    ? 'bg-[#A88B4B]/20 border-[#A88B4B] text-[#A88B4B] shadow-md'
                    : 'bg-[#15181E] border-[#2A2E39] text-gray-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Tabela CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setExportChoice('json')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                  exportChoice === 'json'
                    ? 'bg-[#A88B4B]/20 border-[#A88B4B] text-[#A88B4B] shadow-md'
                    : 'bg-[#15181E] border-[#2A2E39] text-gray-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Backup JSON</span>
              </button>
              <button
                type="button"
                onClick={() => setExportChoice('none')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                  exportChoice === 'none'
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-[#15181E] border-[#2A2E39] text-gray-400 hover:text-white'
                }`}
              >
                <span>Apenas Pasta</span>
              </button>
            </div>
          </div>

          {/* Warning Note */}
          <div className="flex items-start space-x-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Os dados salvos ficarão guardados permanentemente nas <strong>Pastas de Histórico de Projetos</strong>. Itens marcados para zerar serão limpos da tela principal para que o próximo projeto comece com desempenho máximo.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#1F2229]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#1F2229] hover:bg-gray-800 text-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-widest bg-[#A88B4B] hover:bg-[#C5A968] text-slate-950 shadow-lg shadow-[#A88B4B]/25 transition-all flex items-center space-x-2"
            >
              <FolderCheck className="w-4 h-4" />
              <span>Finalizar & Salvar Projeto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
