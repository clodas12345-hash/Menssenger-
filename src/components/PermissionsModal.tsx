import React, { useState, useEffect } from 'react';
import {
  Shield,
  Bell,
  Camera,
  Mic,
  Users,
  Database,
  Copy,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  Zap,
  Volume2
} from 'lucide-react';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendBrowserNotification,
  triggerVibration,
  getCameraPermissionStatus,
  requestCameraPermission,
  getMicrophonePermissionStatus,
  requestMicrophonePermission,
  getContactsPermissionStatus,
  requestNativeContacts,
  getStoragePersistenceStatus,
  requestPersistentStorage,
  getClipboardPermissionStatus,
  getGeolocationPermissionStatus,
  requestGeolocationPermission,
  requestAllPermissions
} from '../utils/permissions';
import { playDispatchAlertSound } from '../utils/audio';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [permissionsState, setPermissionsState] = useState<{
    notifications: 'granted' | 'denied' | 'prompt' | 'unsupported';
    camera: 'granted' | 'denied' | 'prompt' | 'unsupported';
    microphone: 'granted' | 'denied' | 'prompt' | 'unsupported';
    contacts: 'granted' | 'denied' | 'prompt' | 'unsupported';
    storage: { persisted: boolean; usageMb: number; quotaMb: number };
    clipboard: 'granted' | 'denied' | 'prompt' | 'unsupported';
    geolocation: 'granted' | 'denied' | 'prompt' | 'unsupported';
  }>({
    notifications: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
    contacts: 'prompt',
    storage: { persisted: false, usageMb: 0, quotaMb: 0 },
    clipboard: 'granted',
    geolocation: 'prompt',
  });

  const checkAllPermissions = async () => {
    setLoading(true);
    try {
      const [notif, cam, mic, cont, stor, clip, geo] = await Promise.all([
        getNotificationPermissionStatus(),
        getCameraPermissionStatus(),
        getMicrophonePermissionStatus(),
        getContactsPermissionStatus(),
        getStoragePersistenceStatus(),
        getClipboardPermissionStatus(),
        getGeolocationPermissionStatus(),
      ]);

      setPermissionsState({
        notifications: notif,
        camera: cam,
        microphone: mic,
        contacts: cont,
        storage: stor,
        clipboard: clip,
        geolocation: geo,
      });
    } catch (err) {
      console.warn('Erro ao atualizar permissões:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkAllPermissions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestAll = async () => {
    setLoading(true);
    try {
      await requestAllPermissions();
      await checkAllPermissions();
      onShowToast('✨ Permissões solicitadas e atualizadas com sucesso!');
    } catch (err) {
      onShowToast('⚠️ Verifique as permissões no navegador.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNotification = async () => {
    const granted = await requestNotificationPermission();
    await checkAllPermissions();
    if (granted) {
      sendBrowserNotification('🔔 Notificações Ativadas!', {
        body: 'O GKD Messenger alertará você automaticamente no horário exato dos disparos!',
      });
      playDispatchAlertSound();
      triggerVibration([150, 100, 150]);
      onShowToast('🔔 Permissão de notificação concedida com teste disparado!');
    } else {
      onShowToast('⚠️ Permissão de notificação negada no navegador.');
    }
  };

  const handleRequestCamera = async () => {
    const granted = await requestCameraPermission();
    await checkAllPermissions();
    onShowToast(granted ? '📷 Câmera liberada para leitura de fotos e QR!' : '⚠️ Permissão de câmera negada.');
  };

  const handleRequestMic = async () => {
    const granted = await requestMicrophonePermission();
    await checkAllPermissions();
    onShowToast(granted ? '🎙️ Microfone liberado para gravação e simulador!' : '⚠️ Permissão de microfone negada.');
  };

  const handleRequestContacts = async () => {
    try {
      const contacts = await requestNativeContacts();
      await checkAllPermissions();
      if (contacts && contacts.length > 0) {
        onShowToast(`📇 Agenda acessada: ${contacts.length} contato(s) selecionado(s)!`);
      } else {
        onShowToast('📇 Suporte à Agenda nativa e arquivos VCF ativado!');
      }
    } catch (_) {
      onShowToast('📇 Suporte à Agenda via VCF pronto para uso.');
    }
  };

  const handleRequestStorage = async () => {
    const persisted = await requestPersistentStorage();
    await checkAllPermissions();
    if (persisted) {
      onShowToast('💾 Memória Blindada: Seus contatos e agendamentos não serão apagados pelo navegador!');
    } else {
      onShowToast('💾 Armazenamento local sincronizado e ativo.');
    }
  };

  const handleRequestGeo = async () => {
    const granted = await requestGeolocationPermission();
    await checkAllPermissions();
    onShowToast(granted ? '📍 Localização autorizada para ajuste de fuso horário!' : '⚠️ Localização não concedida.');
  };

  const getStatusBadge = (status: 'granted' | 'denied' | 'prompt' | 'unsupported') => {
    switch (status) {
      case 'granted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Ativo / Autorizado
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" /> Bloqueado no Navegador
          </span>
        );
      case 'unsupported':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-500/10 border border-gray-500/30 px-2 py-0.5 rounded-full">
            Indisponível no Dispositivo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
            Pendente de Autorização
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#12141A] border border-[#2D3139] rounded-2xl w-full max-w-xl text-gray-100 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#232730] bg-[#161922]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D23] flex items-center justify-center text-black shadow-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif italic text-white text-lg font-bold">Central de Permissões & Dispositivo</h3>
              <p className="text-xs text-gray-400">Gerenciamento de notificações, câmera, microfone, agenda e memória</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Quick Action Banner */}
          <div className="bg-gradient-to-r from-[#D4AF37]/15 via-[#8C6D23]/10 to-transparent border border-[#D4AF37]/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#E5C365]">
                <Sparkles className="w-4 h-4" />
                <span>Atualização Completa do Dispositivo</span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                Conceda todas as permissões para garantir alertas sonoros, notificações pop-up e persistência máxima de memória.
              </p>
            </div>
            <button
              onClick={handleRequestAll}
              disabled={loading}
              className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-[#D4AF37] to-[#B38F2C] hover:from-[#E5C365] hover:to-[#C9A238] text-black font-bold text-xs px-4 py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Autorizar Todas</span>
            </button>
          </div>

          {/* List of Permissions */}
          <div className="space-y-2.5">
            {/* 1. NOTIFICAÇÕES */}
            <div className="bg-[#181B24] border border-[#262A36] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#383E4E] transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">Notificações no Disparo</span>
                    {getStatusBadge(permissionsState.notifications)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Alerta instantâneo na tela (pop-up) quando qualquer agendamento atingir a hora exata ou 3 minutos finais.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRequestNotification}
                className="shrink-0 bg-[#222733] hover:bg-[#2E3445] text-xs font-semibold text-gray-200 border border-[#353B4D] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Testar / Ativar</span>
              </button>
            </div>

            {/* 2. CÂMERA */}
            <div className="bg-[#181B24] border border-[#262A36] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#383E4E] transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">Câmera & Captura</span>
                    {getStatusBadge(permissionsState.camera)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Utilizada para anexar cards fotográficos, capturar contatos e leitura de QR Codes.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRequestCamera}
                className="shrink-0 bg-[#222733] hover:bg-[#2E3445] text-xs font-semibold text-gray-200 border border-[#353B4D] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>Autorizar</span>
              </button>
            </div>

            {/* 3. AGENDA & CONTATOS */}
            <div className="bg-[#181B24] border border-[#262A36] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#383E4E] transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">Agenda & Contatos</span>
                    {getStatusBadge(permissionsState.contacts)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Importação direta de contatos do telefone ou leitura de arquivos de agenda (.VCF / CSV).
                  </p>
                </div>
              </div>
              <button
                onClick={handleRequestContacts}
                className="shrink-0 bg-[#222733] hover:bg-[#2E3445] text-xs font-semibold text-gray-200 border border-[#353B4D] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Importar / Abrir</span>
              </button>
            </div>

            {/* 4. MEMÓRIA PERSISTENTE & STORAGE */}
            <div className="bg-[#181B24] border border-[#262A36] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#383E4E] transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">Memória Blindada (Anti-Limpeza)</span>
                    {permissionsState.storage.persisted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Blindagem Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Memória Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Impede que o navegador apague seus contatos, modelos e agendamentos caso falte espaço no aparelho.
                    {permissionsState.storage.usageMb > 0 && ` (${permissionsState.storage.usageMb} MB em uso)`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRequestStorage}
                className="shrink-0 bg-[#222733] hover:bg-[#2E3445] text-xs font-semibold text-gray-200 border border-[#353B4D] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>Blindar Memória</span>
              </button>
            </div>

            {/* 5. MICROFONE */}
            <div className="bg-[#181B24] border border-[#262A36] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#383E4E] transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">Microfone & Áudio</span>
                    {getStatusBadge(permissionsState.microphone)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Permite gravação de áudio nativa no Simulador de Voz e alertas acústicos.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRequestMic}
                className="shrink-0 bg-[#222733] hover:bg-[#2E3445] text-xs font-semibold text-gray-200 border border-[#353B4D] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span>Autorizar</span>
              </button>
            </div>

            {/* 6. ÁREA DE TRANSFERÊNCIA (CLIPBOARD) */}
            <div className="bg-[#181B24] border border-[#262A36] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#383E4E] transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">Área de Transferência (Clipboard)</span>
                    {getStatusBadge(permissionsState.clipboard)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Cópia automática de mensagens personalizadas e imagens para envio rápido no WhatsApp.
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-emerald-400 text-xs font-semibold px-3 py-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Integrado
              </div>
            </div>

            {/* 7. LOCALIZAÇÃO / FUSO HORÁRIO */}
            <div className="bg-[#181B24] border border-[#262A36] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#383E4E] transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">Geolocalização / Fuso Horário</span>
                    {getStatusBadge(permissionsState.geolocation)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Garante sincronia precisa do relógio local para disparo pontual de agendamentos.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRequestGeo}
                className="shrink-0 bg-[#222733] hover:bg-[#2E3445] text-xs font-semibold text-gray-200 border border-[#353B4D] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Sincronizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#232730] bg-[#161922] flex items-center justify-between">
          <button
            onClick={checkAllPermissions}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Verificar Novamente</span>
          </button>

          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
