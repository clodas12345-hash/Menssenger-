import React, { useState } from 'react';
import {
  Download,
  FolderDown,
  HardDrive,
  Share2,
  X,
  ShieldCheck,
  FileJson,
  Users,
  MessageSquare,
  Send,
  Settings,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { BackupOptions } from '../utils/downloadHelper';

interface BackupDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: BackupOptions;
  onSuccess?: (fileName: string) => void;
}

export const BackupDownloadModal: React.FC<BackupDownloadModalProps> = ({
  isOpen,
  onClose,
  data,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const defaultFileName = `Backup_Mensseger_${day}_${month}_${year}.json`;

  const [fileName, setFileName] = useState(defaultFileName);
  const [saveLocation, setSaveLocation] = useState<'prompt' | 'downloads' | 'device'>(
    Capacitor.isNativePlatform() ? 'device' : 'prompt'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const contactsCount = data?.contacts?.length || 0;
  const logsCount = data?.logs?.length || 0;
  const campaignsCount = data?.campaigns?.length || 0;
  const templatesCount = data?.templates?.length || 0;

  const handleExecuteDownload = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const finalFileName = fileName.trim().endsWith('.json')
        ? fileName.trim()
        : `${fileName.trim()}.json`;

      // 1. Coleta e consolida todos os dados em um objeto JavaScript
      const allLocalStorageData: Record<string, any> = {};
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            try {
              allLocalStorageData[key] = JSON.parse(localStorage.getItem(key) || '');
            } catch {
              allLocalStorageData[key] = localStorage.getItem(key);
            }
          }
        }
      }

      const backupData = {
        version: '2.0-full',
        appName: 'Mensseger',
        exportDate: new Date().toISOString(),
        contacts: data?.contacts || allLocalStorageData['zap_contacts_v1'] || [],
        logs: data?.logs || allLocalStorageData['zap_dispatch_logs_v1'] || [],
        campaigns: data?.campaigns || allLocalStorageData['zap_campaigns_v1'] || [],
        templates: data?.templates || allLocalStorageData['zap_templates_v1'] || [],
        groups: data?.groups || allLocalStorageData['zap_groups_v1'] || [],
        settings: data?.settings || allLocalStorageData['zap_settings_v1'] || {},
        ...data,
        rawLocalStorage: allLocalStorageData,
      };

      const jsonString = JSON.stringify(backupData, null, 2);

      // -------------------------------------------------------------
      // MODO 1: Celular / App Nativo (Android / iOS com Capacitor)
      // -------------------------------------------------------------
      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: finalFileName,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'Backup Completo Mensseger',
          text: 'Arquivo completo de backup com todos os dados do Mensseger.',
          url: result.uri,
          dialogTitle: 'Salvar ou Compartilhar Backup',
        });

        if (onSuccess) onSuccess(finalFileName);
        onClose();
        return;
      }

      // -------------------------------------------------------------
      // MODO 2: Navegador Web com Diálogo "Salvar Como..." (File System Access API)
      // -------------------------------------------------------------
      if (saveLocation === 'prompt' && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: finalFileName,
            types: [
              {
                description: 'Arquivo de Backup JSON (Mensseger)',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });

          const writable = await handle.createWritable();
          await writable.write(jsonString);
          await writable.close();

          if (onSuccess) onSuccess(finalFileName);
          onClose();
          return;
        } catch (pickerError: any) {
          // Se o usuário cancelou a janela de salvar, não dispara erro
          if (pickerError.name === 'AbortError') {
            setIsProcessing(false);
            return;
          }
          console.warn('File picker falhou, caindo para download padrão:', pickerError);
        }
      }

      // -------------------------------------------------------------
      // MODO 3: Download Padrão do Navegador (Pasta Downloads)
      // -------------------------------------------------------------
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = finalFileName;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();

      setTimeout(() => {
        downloadAnchor.remove();
        URL.revokeObjectURL(url);
      }, 150);

      if (onSuccess) onSuccess(finalFileName);
      onClose();
    } catch (err: any) {
      console.error('Erro ao gerar backup:', err);
      setErrorMessage(err.message || 'Erro ao realizar o download do backup.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111318] border border-[#A88B4B]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-gray-100 relative overflow-hidden flex flex-col">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-[#D4AF37] to-amber-500" />

        {/* Modal Top */}
        <div className="flex items-start justify-between pb-3 border-b border-[#1F2229]">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#A88B4B]/15 border border-[#A88B4B]/40 rounded-xl text-[#D4AF37]">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-serif tracking-wide">
                Download do Backup
              </h2>
              <p className="text-xs text-gray-400">
                Confirme o nome e onde deseja salvar o arquivo do Mensseger
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

        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Resumo do Conteúdo do Backup */}
        <div className="bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
            <span className="flex items-center space-x-1.5 text-[#D4AF37]">
              <ShieldCheck className="w-4 h-4" />
              <span>Itens Inclusos no Backup:</span>
            </span>
            <span className="text-[10px] bg-[#1F2229] px-2 py-0.5 rounded text-gray-400">Versão 2.0-full</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[#15181E] border border-[#232732] p-2 rounded-lg">
              <div className="text-[#D4AF37] font-bold text-sm">{contactsCount}</div>
              <div className="text-[11px] text-gray-400">Contatos</div>
            </div>
            <div className="bg-[#15181E] border border-[#232732] p-2 rounded-lg">
              <div className="text-[#D4AF37] font-bold text-sm">{logsCount}</div>
              <div className="text-[11px] text-gray-400">Histórico</div>
            </div>
            <div className="bg-[#15181E] border border-[#232732] p-2 rounded-lg">
              <div className="text-[#D4AF37] font-bold text-sm">{campaignsCount}</div>
              <div className="text-[11px] text-gray-400">Campanhas</div>
            </div>
            <div className="bg-[#15181E] border border-[#232732] p-2 rounded-lg">
              <div className="text-[#D4AF37] font-bold text-sm">{templatesCount}</div>
              <div className="text-[11px] text-gray-400">Modelos</div>
            </div>
          </div>
        </div>

        {/* Nome do Arquivo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
            Nome do Arquivo
          </label>
          <div className="relative">
            <FileJson className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-[#0A0C10] border border-[#2A2E39] focus:border-[#D4AF37] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
              placeholder="Backup_Mensseger_DD_MM_AAAA.json"
            />
          </div>
        </div>

        {/* Opções de Onde Salvar */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
            Onde Salvar
          </label>
          <div className="grid grid-cols-1 gap-2">
            {!Capacitor.isNativePlatform() ? (
              <>
                <button
                  type="button"
                  onClick={() => setSaveLocation('prompt')}
                  className={`flex items-start space-x-3 p-3 rounded-xl border text-left transition-all ${
                    saveLocation === 'prompt'
                      ? 'bg-[#A88B4B]/15 border-[#D4AF37] text-white shadow-sm'
                      : 'bg-[#0A0C10] border-[#1F2229] text-gray-400 hover:text-gray-200 hover:border-[#2A2E39]'
                  }`}
                >
                  <FolderDown className={`w-5 h-5 shrink-0 mt-0.5 ${saveLocation === 'prompt' ? 'text-[#D4AF37]' : 'text-gray-500'}`} />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span>Escolher Pasta no Computador (Salvar Como...)</span>
                      {saveLocation === 'prompt' && <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Abre a janela do sistema para você escolher exatamente a pasta (Documentos, Pendrive, etc.)
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSaveLocation('downloads')}
                  className={`flex items-start space-x-3 p-3 rounded-xl border text-left transition-all ${
                    saveLocation === 'downloads'
                      ? 'bg-[#A88B4B]/15 border-[#D4AF37] text-white shadow-sm'
                      : 'bg-[#0A0C10] border-[#1F2229] text-gray-400 hover:text-gray-200 hover:border-[#2A2E39]'
                  }`}
                >
                  <HardDrive className={`w-5 h-5 shrink-0 mt-0.5 ${saveLocation === 'downloads' ? 'text-[#D4AF37]' : 'text-gray-500'}`} />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span>Pasta Padrão de Downloads</span>
                      {saveLocation === 'downloads' && <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Baixa diretamente para a pasta de Downloads do seu navegador
                    </p>
                  </div>
                </button>
              </>
            ) : (
              <div className="flex items-start space-x-3 p-3 rounded-xl border bg-[#A88B4B]/15 border-[#D4AF37] text-white">
                <Share2 className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">
                    Memória do Celular & Compartilhar
                  </div>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    Salva na pasta <strong>Documentos</strong> do aparelho e abre as opções para enviar ao WhatsApp, Google Drive ou Nuvem.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2.5 px-4 rounded-xl border border-[#232732] hover:bg-[#1A1D25] text-xs font-bold text-gray-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecuteDownload}
            disabled={isProcessing}
            className="flex-[2] py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#A88B4B] to-[#927335] hover:brightness-110 text-black font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isProcessing ? 'Gerando Backup...' : 'Fazer Download do Backup'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
