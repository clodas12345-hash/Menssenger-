import React, { useState } from 'react';
import { Save, Trash2, Download, X, AlertTriangle, ShieldCheck, CheckSquare, Square, FolderCheck } from 'lucide-react';
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

  const [archiveName, setArchiveName] = useState<string>(`Ciclo ${new Date().toLocaleDateString('pt-BR')} - ${logs.length} disparos`);
  const [exportChoice, setExportChoice] = useState<'none' | 'csv' | 'json' | 'pdf'>('pdf');

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
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#15181E] border border-[#A88B4B]/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 text-gray-100 relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1F2229] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#A88B4B]/10 border border-[#A88B4B]/30 rounded-xl text-[#A88B4B]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-serif">Central de Salvamento e Redefinição</h2>
              <p className="text-xs text-gray-400">Decida exatamente o que deseja salvar (arquivar/exportar) e o que deseja zerar antes de prosseguir.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#1F2229] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 pr-1">
          {/* Nome do Ciclo / Projeto */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A88B4B]">
              Nome do Ciclo / Projeto para Salvamento
            </label>
            <input
              type="text"
              value={archiveName}
              onChange={(e) => setArchiveName(e.target.value)}
              placeholder="Ex: Campanha de Vendas - 15 Dias"
              className="w-full bg-[#0A0C10] border border-[#2A2E39] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A88B4B]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* O que Salvar / Arquivar */}
            <div className="bg-[#0A0C10] border border-[#1F2229] rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider border-b border-[#1F2229] pb-2">
                <Save className="w-4 h-4" />
                <span>O que Deseja Salvar?</span>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center space-x-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={saveLogs}
                    onChange={(e) => setSaveLogs(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-[#A88B4B] focus:ring-[#A88B4B]"
                  />
                  <span>Histórico de Disparos ({logs.length} regs)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={saveCampaigns}
                    onChange={(e) => setSaveCampaigns(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-[#A88B4B] focus:ring-[#A88B4B]"
                  />
                  <span>Campanhas / Agendamentos ({campaigns.length})</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={saveContacts}
                    onChange={(e) => setSaveContacts(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-[#A88B4B] focus:ring-[#A88B4B]"
                  />
                  <span>Contatos Cadastrados ({contacts.length})</span>
                </label>
              </div>
            </div>

            {/* O que Zerar / Limpar */}
            <div className="bg-[#0A0C10] border border-[#1F2229] rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider border-b border-[#1F2229] pb-2">
                <Trash2 className="w-4 h-4" />
                <span>O que Deseja Zerar?</span>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center space-x-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={resetLogs}
                    onChange={(e) => setResetLogs(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-rose-500 focus:ring-rose-500"
                  />
                  <span className={resetLogs ? 'text-rose-300 font-medium' : 'text-gray-400'}>
                    Zerar Histórico de Disparos
                  </span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={resetCampaigns}
                    onChange={(e) => setResetCampaigns(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-rose-500 focus:ring-rose-500"
                  />
                  <span className={resetCampaigns ? 'text-rose-300 font-medium' : 'text-gray-400'}>
                    Zerar Campanhas Pendentes
                  </span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={resetContacts}
                    onChange={(e) => setResetContacts(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-rose-500 focus:ring-rose-500"
                  />
                  <span className={resetContacts ? 'text-rose-300 font-medium' : 'text-gray-400'}>
                    Zerar Lista de Contatos
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Export Option */}
          <div className="bg-[#0A0C10] border border-[#1F2229] rounded-xl p-4 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
              Deseja Baixar Arquivo de Cópia de Segurança Externo?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setExportChoice('none')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                  exportChoice === 'none'
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-[#15181E] border-[#2A2E39] text-gray-400 hover:text-white'
                }`}
              >
                Apenas Histórico
              </button>
              <button
                type="button"
                onClick={() => setExportChoice('pdf')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center space-x-1 ${
                  exportChoice === 'pdf'
                    ? 'bg-[#A88B4B]/20 border-[#A88B4B] text-[#A88B4B]'
                    : 'bg-[#15181E] border-[#2A2E39] text-gray-400 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Salvar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setExportChoice('csv')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center space-x-1 ${
                  exportChoice === 'csv'
                    ? 'bg-[#A88B4B]/20 border-[#A88B4B] text-[#A88B4B]'
                    : 'bg-[#15181E] border-[#2A2E39] text-gray-400 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setExportChoice('json')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center space-x-1 ${
                  exportChoice === 'json'
                    ? 'bg-[#A88B4B]/20 border-[#A88B4B] text-[#A88B4B]'
                    : 'bg-[#15181E] border-[#2A2E39] text-gray-400 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup JSON</span>
              </button>
            </div>
          </div>

          {/* Warning Note */}
          <div className="flex items-start space-x-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Os dados salvos serão armazenados na sua pasta de histórico de projetos por 15 dias. Os itens marcados para zerar serão limpos da tela principal imediatamente após a confirmação.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#1F2229]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#1F2229] hover:bg-gray-800 text-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-widest bg-[#A88B4B] hover:bg-[#C5A968] text-slate-950 shadow-lg shadow-[#A88B4B]/20 transition-all flex items-center space-x-2"
            >
              <FolderCheck className="w-4 h-4" />
              <span>Confirmar Salvamento & Ação</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
