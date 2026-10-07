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
  cards?: any[];
  projects?: any[];
  [key: string]: any;
}

export const handleDownloadBackup = async (customData?: BackupOptions) => {
  try {
    // 1. Coleta e consolida os dados de forma leve e sem duplicações em memória
    const backupData: Record<string, any> = {
      version: '2.0-full',
      appName: 'Mensseger',
      exportDate: new Date().toISOString(),
      contacts: customData?.contacts || [],
      logs: customData?.logs || [],
      campaigns: customData?.campaigns || [],
      templates: customData?.templates || [],
      groups: customData?.groups || [],
      settings: customData?.settings || {},
      ...customData,
    };

    // 2. Converte os dados em texto JSON
    const jsonString = JSON.stringify(backupData, null, 2);

    // 3. Define o nome do arquivo com a data atual
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
        // Grava no diretório Cache seguro compatível com FileProvider do Android
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // Abre o menu de compartilhamento do Android
        try {
          await Share.share({
            title: 'Backup Completo Mensseger',
            text: 'Arquivo completo de backup com todos os dados.',
            url: result.uri,
            dialogTitle: 'Salvar ou Compartilhar Backup',
          });
        } catch (shareErr) {
          console.warn('Compartilhamento nativo concluído ou cancelado:', shareErr);
        }

        sendAppNotification('📊 Relatório / Backup Exportado', {
          body: `Backup gerado com sucesso.`,
          type: 'reportExport'
        });

        return { success: true, fileName };
      } catch (err) {
        console.error('Erro ao salvar no celular:', err);
      }
    }

    // -------------------------------------------------------------
    // MODO 2: Navegador Web (Chrome, Edge, Safari, etc.)
    // -------------------------------------------------------------
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    }, 200);

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
        directory: Directory.Cache,
      });

      try {
        await Share.share({
          title: filename,
          text: `Arquivo gerado pelo aplicativo Mensseger: ${filename}`,
          url: result.uri,
          dialogTitle: 'Salvar ou Compartilhar Arquivo',
        });
      } catch {
        // Share dismiss is normal
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
    }, 150);
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
    }
  }
};
