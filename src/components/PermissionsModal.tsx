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
  Volume2,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  XCircle,
  BatteryCharging
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
  requestAllPermissions,
  isBatteryOptimizationExempt,
  requestIgnoreBatteryOptimization,
  openBatteryOptimizationSettings
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
    batteryExempt: boolean;
  }>({
    notifications: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
    contacts: 'prompt',
    storage: { persisted: false, usageMb: 0, quotaMb: 0 },
    clipboard: 'granted',
    geolocation: 'prompt',
    batteryExempt: true,
  });
  const [showNotifGuide, setShowNotifGuide] = useState<boolean>(false);

  const checkAllPermissions = async () => {
    setLoading(true);
    try {
      const [notif, cam, mic, cont, stor, clip, geo, batt] = await Promise.all([
        getNotificationPermissionStatus(),
        getCameraPermissionStatus(),
        getMicrophonePermissionStatus(),
        getContactsPermissionStatus(),
        getStoragePersistenceStatus(),
        getClipboardPermissionStatus(),
        getGeolocationPermissionStatus(),
        isBatteryOptimizationExempt(),
      ]);

      setPermissionsState({
        notifications: notif,
        camera: cam,
        microphone: mic,
        contacts: cont,
        storage: stor,
        clipboard: clip,
        geolocation: geo,
        batteryExempt: batt,
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
      onShowToast('⚠️ Verifique as permissões nas configurações do aparelho.');
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
      onShowToast('🔔 Permissão de notificação nativa concedida!');
    } else {
      onShowToast('⚠️ Permissão de notificação negada no aparelho.');
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
      onShowToast('💾 Memória Blindada: Seus contatos e agendamentos estão protegidos no dispositivo!');
    } else {
      onShowToast('💾 Armazenamento local sincronizado e ativo.');
    }
  };

  const handleRequestGeo = async () => {
    const granted = await requestGeolocationPermission();
    await checkAllPermissions();
    onShowToast(granted ? '📍 Localização autorizada para ajuste de fuso horário!' : '⚠️ Localização não concedida.');
  };

  const handleRequestBatteryExemption = async () => {
    try {
      await requestIgnoreBatteryOptimization();
      setTimeout(async () => {
        const isExempt = await isBatteryOptimizationExempt();
        if (isExempt) {
          onShowToast('🔋 Isenção de bateria autorizada com sucesso!');
        } else {
          onShowToast('🔋 Abrindo Configurações de Bateria. Marque o GKD Messenger como "Sem Restrições".');
          await openBatteryOptimizationSettings();
        }
        await checkAllPermissions();
      }, 1000);
    } catch (_) {
      onShowToast('🔋 Abrindo Configurações de Bateria.');
      await openBatteryOptimizationSettings();
      await checkAllPermissions();
    }
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
            <AlertCircle className="w-3 h-3" /> Bloqueado no Aparelho
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
            <div className="bg-[#181B24] border border-[#262A36] rounded-xl p-3.5 flex flex-col gap-2.5 hover:border-[#383E4E] transition-colors">
              <div className="flex items-center justify-between gap-3">
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowNotifGuide(!showNotifGuide)}
                    className="p-1.5 text-gray-400 hover:text-white bg-[#222733] hover:bg-[#2E3445] rounded-lg border border-[#353B4D] transition-colors"
                    title={showNotifGuide ? 'Ocultar guia de notificações' : 'Ver o que pode/não pode colocar nas notificações'}
                  >
                    {showNotifGuide ? <ChevronUp className="w-4 h-4 text-[#D4AF37]" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                  </button>
                  <button
                    onClick={handleRequestNotification}
                    className="bg-[#222733] hover:bg-[#2E3445] text-xs font-semibold text-gray-200 border border-[#353B4D] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Testar / Ativar</span>
                  </button>
                </div>
              </div>

              {/* Botão de ajuda rápida / toggle */}
              <div className="pt-1 border-t border-[#262A36]/60 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowNotifGuide(!showNotifGuide)}
                  className="text-[#D4AF37] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <span>{showNotifGuide ? 'Ocultar Diretrizes de Notificação' : '📋 Ver o que pode ou não colocar e por que não sobem'}</span>
                  {showNotifGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <span className="text-[10px] text-gray-500">Android • PWA • PC</span>
              </div>

              {/* Painel expansível com o que pode e não pode colocar */}
              {showNotifGuide && (
                <div className="mt-1 p-3 bg-[#0E1016] border border-[#262A36] rounded-xl space-y-3 text-xs animate-in fade-in duration-200">
                  {/* Por que não sobe */}
                  <div className="p-2.5 bg-red-950/30 border border-red-500/30 rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-[11px] uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Por que a notificação NÃO ESTÁ SUBINDO?</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-gray-300">
                      <li><strong>Permissão bloqueada:</strong> No Android 13+, permissão precisa ser aprovada nas Configurações &gt; Apps &gt; GKD Messenger &gt; Notificações.</li>
                      <li><strong>Economia de Bateria:</strong> Fabricantes (Samsung/Xiaomi/Motorola) suspendem apps em segundo plano. Mude a bateria do app para <em>"Sem Restrições"</em>.</li>
                      <li><strong>Modo Não Perturbe (DND):</strong> O celular silencia todas as notificações flutuantes.</li>
                      <li><strong>Canal de Prioridade:</strong> Agora forçado automaticamente em Alta Prioridade (Heads-Up) pelo GKD Messenger.</li>
                    </ul>
                  </div>

                  {/* Pode vs Não Pode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 bg-[#14171E] border border-emerald-500/30 rounded-lg space-y-1">
                      <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> O Que PODE Colocar
                      </span>
                      <ul className="list-disc pl-3.5 space-y-0.5 text-gray-300">
                        <li>Título curto e objetivo (20 a 50 caracteres)</li>
                        <li>Corpo informativo direto (40 a 160 caracteres)</li>
                        <li>Emojis visuais (🚨, 🔔, 📲, ⏰, 💬, ✅)</li>
                        <li>Nome da campanha e contagem de contatos prontos</li>
                        <li>Padrão de vibração e som prioritário</li>
                      </ul>
                    </div>

                    <div className="p-2 bg-[#14171E] border border-red-500/30 rounded-lg space-y-1">
                      <span className="font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> O Que NÃO PODE Colocar
                      </span>
                      <ul className="list-disc pl-3.5 space-y-0.5 text-gray-300">
                        <li>Textos longos ou redações (&gt; 200 caracteres, pois são cortados)</li>
                        <li>Tags HTML (&lt;b&gt;, &lt;br&gt;, pois o Android não formata)</li>
                        <li>Links soltos no corpo (não viram hyperlinks clicáveis)</li>
                        <li>Ícone colorido com fundo opaco (fica como quadrado branco no Android)</li>
                        <li>Senhas ou informações confidenciais</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
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
                    Impede que o sistema limpe seus contatos, modelos e agendamentos caso falte espaço no aparelho.
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

            {/* 8. OTIMIZAÇÃO DE BATERIA */}
            <div className="bg-[#181B24] border border-[#262A36] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#383E4E] transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <BatteryCharging className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">Otimização de Bateria</span>
                    {permissionsState.batteryExempt ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Isenção Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Restrita pelo Android
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Permite que o sistema operacional mantenha os disparos agendados funcionando em segundo plano ou com o app fechado.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRequestBatteryExemption}
                className="shrink-0 bg-[#222733] hover:bg-[#2E3445] text-xs font-semibold text-gray-200 border border-[#353B4D] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <BatteryCharging className="w-3.5 h-3.5 text-[#34d399]" />
                <span>Remover Restrição</span>
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
