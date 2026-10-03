import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { sendAppNotification } from './permissions';

export interface BackupOptions {
  contacts?: any[];
  logs?: any[];
  campaigns?: any[];
  templates?: any[];
  groups?: any[];
  settings?: any;
  [key: string]: any;
}

export const handleDownloadBackup = async (customData?: BackupOptions) => {
  try {
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
      contacts: customData?.contacts || allLocalStorageData['zap_contacts_v1'] || [],
      logs: customData?.logs || allLocalStorageData['zap_dispatch_logs_v1'] || [],
      campaigns: customData?.campaigns || allLocalStorageData['zap_campaigns_v1'] || [],
      templates: customData?.templates || allLocalStorageData['zap_templates_v1'] || [],
      groups: customData?.groups || allLocalStorageData['zap_groups_v1'] || [],
      settings: customData?.settings || allLocalStorageData['zap_settings_v1'] || {},
      ...customData,
      rawLocalStorage: allLocalStorageData,
    };

    // 2. Converte os dados em texto JSON formatado
    const jsonString = JSON.stringify(backupData, null, 2);

    // 3. Define o nome do arquivo com a data atual (Ex: Backup_Mensseger_28_09_2026.json)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const fileName = `Backup_Mensseger_${day}_${month}_${year}.json`;

    // -------------------------------------------------------------
    // MODO 1: Celular / App Nativo (Android / iOS com Capacitor)
    // -------------------------------------------------------------
    if (Capacitor.isNativePlatform()) {
      try {
        // Grava o arquivo físico na pasta Documentos da memória interna do celular
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });

        // Abre o menu de compartilhamento do Android para salvar no Google Drive, WhatsApp ou onde preferir
        await Share.share({
          title: 'Backup Completo Mensseger',
          text: 'Arquivo completo de backup com todos os dados.',
          url: result.uri,
          dialogTitle: 'Salvar ou Compartilhar Backup',
        });
        return { success: true, fileName };
      } catch (err) {
        console.error('Erro ao salvar no celular:', err);
      }
    }

    // -------------------------------------------------------------
    // MODO 2: Navegador Web (Chrome, Edge, Safari, etc.)
    // -------------------------------------------------------------
    // Cria um Blob (objeto binário de dados na memória do navegador)
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Cria um link invisível <a> com o atributo download e dispara o clique
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    // Limpa o link do DOM e libera a memória
    downloadAnchor.remove();
    URL.revokeObjectURL(url);

    sendAppNotification('📊 Relatório / Backup Exportado', {
      body: `Arquivo ${fileName} gerado e salvo com sucesso.`,
      type: 'reportExport'
    });

    return { success: true, fileName };
  } catch (error) {
    console.error('Erro no download do backup:', error);
    throw error;
  }
};

export const downloadFileSafely = async (blob: Blob, filename: string) => {
  try {
    if (Capacitor.isNativePlatform()) {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
      });

      try {
        await Share.share({
          title: filename,
          text: `Arquivo gerado pelo aplicativo Mensseger: ${filename}`,
          url: result.uri,
          dialogTitle: 'Salvar ou Compartilhar Arquivo',
        });
      } catch {
        alert(`✅ Arquivo salvo com sucesso na pasta 'Documentos' do seu celular!\n\nNome: ${filename}`);
      }
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error: any) {
    console.error('Erro no download nativo:', error);
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: blob.type });
        await navigator.share({
          files: [file],
          title: filename,
        });
      } catch (shareErr) {
        console.error('Fallback de compartilhamento falhou:', shareErr);
      }
    } else {
      alert('Erro ao salvar o arquivo. Verifique as permissões de armazenamento do aplicativo.');
    }
  }
};
