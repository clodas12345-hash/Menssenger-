import React, { useState, useRef } from 'react';
import { 
  Settings, 
  X, 
  Check, 
  Volume2, 
  VolumeX,
  ShieldCheck, 
  Smartphone, 
  Plus, 
  Trash2, 
  MessageCircle, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  Shield,
  Download,
  Upload,
  CheckCircle2,
  Sparkles,
  Sliders,
  Database,
  HelpCircle,
  ChevronRight,
  SunMoon,
  CalendarCheck2,
  CopyCheck,
  Filter,
  Bell,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Radio,
  Zap,
  BatteryCharging,
  Eye,
  FileCode,
  FileX,
  Cloud
} from 'lucide-react';
import { AppSettings, WhatsAppChip, DispatchLogItem, Contact, ScheduledCampaign, MessageTemplate, ContactGroup, NotificationPreferences } from '../types';
import { safeConfirm } from '../utils/whatsapp';
import { restoreFromBackup } from '../utils/storage';
import { downloadFileSafely, handleDownloadBackup } from '../utils/downloadHelper';
import { BackupDownloadModal } from './BackupDownloadModal';
import { 
  getNotificationPermissionStatus, 
  requestNotificationPermission, 
  sendAppNotification,
  sendBrowserNotification,
  ensureNotificationChannel,
  triggerVibration
} from '../utils/permissions';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { playDispatchAlertSound } from '../utils/audio';
import { auth, saveUserCloudBackup, loadUserCloudBackup, signInWithGoogle } from '../firebase';

interface SettingsModalProps {
  logs?: DispatchLogItem[];
  contacts?: Contact[];
  campaigns?: ScheduledCampaign[];
  templates?: MessageTemplate[];
  groups?: ContactGroup[];
  onRefreshData?: () => void;
  onReportBlocked24h?: () => void;
  onUnblockWhatsApp?: () => void;
  onResetChipLogs?: (chipId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onOpenSaveAndReset?: () => void;
  onOpenPermissions?: () => void;
  onShowTutorial?: () => void;
  onOpenHelp?: () => void;
}

type TabType = 'general' | 'notifications' | 'chips' | 'rules' | 'system';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onOpenSaveAndReset,
  onOpenPermissions,
  onShowTutorial,
  onOpenHelp,
  logs = [],
  contacts = [],
  campaigns = [],
  templates = [],
  groups = [],
  onRefreshData,
  onReportBlocked24h,
  onUnblockWhatsApp,
  onResetChipLogs,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Notification status & diagnostics
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');
  const [testNotifLoading, setTestNotifLoading] = useState<boolean>(false);
  const [testNotifFeedback, setTestNotifFeedback] = useState<string | null>(null);

  // Auto-check notification status and ensure channel when opened
  React.useEffect(() => {
    if (isOpen) {
      getNotificationPermissionStatus().then(status => {
        setNotificationStatus(status);
      });
      ensureNotificationChannel();
    }
  }, [isOpen, activeTab]);

  const handleRequestNotifPermission = async () => {
    const granted = await requestNotificationPermission();
    const updated = await getNotificationPermissionStatus();
    setNotificationStatus(updated);
    if (granted) {
      setTestNotifFeedback('✅ Permissão concedida pelo sistema com sucesso!');
      triggerVibration([100, 50, 100]);
    } else {
      setTestNotifFeedback('⚠️ Permissão não concedida. No celular, ative as notificações nas configurações do aplicativo.');
    }
  };

  const handleTestNotification = async () => {
    setTestNotifLoading(true);
    setTestNotifFeedback(null);
    try {
      if (!Capacitor.isNativePlatform()) {
        if (soundEnabled) {
          playDispatchAlertSound();
        }
        triggerVibration([200, 100, 200, 100, 300]);
        setTestNotifFeedback('🔔 Som de alerta e vibração testados com sucesso! No aplicativo Android instalado, as notificações com banner do sistema são acionadas.');
        return;
      }

      if (notificationStatus !== 'granted') {
        const granted = await requestNotificationPermission();
        if (granted !== 'granted') {
          setTestNotifFeedback('⚠️ Permissão negada no aparelho. Vá em Configurações > Aplicativos > GKD Messenger e ative Notificações.');
          setTestNotifLoading(false);
          return;
        }
        setNotificationStatus('granted');
      }

      await ensureNotificationChannel();
      
      await LocalNotifications.schedule({
        notifications: [{
          title: '🔔 Teste de Notificação • GKD Messenger',
          body: 'Notificação nativa agendada com sucesso!',
          id: Math.floor(Math.random() * 900000) + 100000,
          channelId: 'padrao',
          smallIcon: 'ic_stat_icon_config_sample',
          schedule: { at: new Date(Date.now() + 5000) }
        }]
      });
      setTestNotifFeedback('🚀 Notificação nativa agendada para daqui a 5 segundos!');

      if (soundEnabled) {
        playDispatchAlertSound();
      }
      triggerVibration([200, 100, 200, 100, 300]);
    } catch (err: any) {
      setTestNotifFeedback(`❌ Erro ao disparar teste: ${err?.message || 'Falha ao processar notificação'}`);
    } finally {
      setTestNotifLoading(false);
    }
  };

  // Form states
  const [maxMessagesPer24Hours, setMaxMessagesPer24Hours] = useState<number>(settings.maxMessagesPer24Hours || 100);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(settings.soundEnabled ?? true);
  const [enableSendingRules, setEnableSendingRules] = useState<boolean>(settings.enableSendingRules ?? true);
  const [ruleNighttime, setRuleNighttime] = useState<boolean>(settings.ruleNighttime ?? true);
  const [ruleDailyLimit, setRuleDailyLimit] = useState<boolean>(settings.ruleDailyLimit ?? true);
  const [ruleSundayAlert, setRuleSundayAlert] = useState<boolean>(settings.ruleSundayAlert ?? true);
  const [ruleDoubleMessage, setRuleDoubleMessage] = useState<boolean>(settings.ruleDoubleMessage ?? true);
  const [defaultFunnel, setDefaultFunnel] = useState<string>(settings.defaultFunnel || 'all');
  const [hideContactedToday, setHideContactedToday] = useState<boolean>(settings.hideContactedToday ?? false);
  const [sortSkippedFirst, setSortSkippedFirst] = useState<boolean>(settings.sortSkippedFirst ?? true);
  const [sortThreeDaysUnsentFirst, setSortThreeDaysUnsentFirst] = useState<boolean>(settings.sortThreeDaysUnsentFirst ?? true);
  const [sortOldestContactedFirst, setSortOldestContactedFirst] = useState<boolean>(settings.sortOldestContactedFirst ?? true);
  const [showOnlySkipped, setShowOnlySkipped] = useState<boolean>(settings.showOnlySkipped ?? false);
  const [hideAlreadyScheduled, setHideAlreadyScheduled] = useState<boolean>(settings.hideAlreadyScheduled ?? false);

  // Chip management
  const [chips, setChips] = useState<WhatsAppChip[]>(settings.chips || [
    { id: 'chip_1', name: 'Principal (WhatsApp)', active: true, color: '#D4AF37' },
    { id: 'chip_2', name: 'Suporte / Secundário', active: false, color: '#3B82F6' }
  ]);
  const [activeChipId, setActiveChipId] = useState<string>(settings.activeChipId || 'chip_1');
  const [newChipName, setNewChipName] = useState<string>('');

  const activeChip = chips.find(c => c.id === activeChipId);
  const maxLimit = activeChip?.dailyLimit || maxMessagesPer24Hours || 100;
  
  const isBlocked24h = !!(settings.blockedUntil && new Date(settings.blockedUntil).getTime() > Date.now());
  const blockedUntilDate = settings.blockedUntil ? new Date(settings.blockedUntil) : null;
  const blockedTimeStr = blockedUntilDate ? blockedUntilDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const blockedDateStr = blockedUntilDate ? blockedUntilDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  
  const nowMs = Date.now();
  const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000;
  const sentLast24H = logs.filter((l) => {
    if (l.status !== 'enviado' || !l.sentAt) return false;
    if (activeChip && l.chipId && l.chipId !== activeChip.id) return false;
    const sentTime = new Date(l.sentAt).getTime();
    return !isNaN(sentTime) && sentTime >= twentyFourHoursAgoMs;
  }).length;
  
  const remaining = Math.max(0, maxLimit - sentLast24H);
  const isLimitReached = sentLast24H >= maxLimit;

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notificationToggles, setNotificationToggles] = useState<NotificationPreferences>(
    settings.notificationToggles || {
      listImport: true,
      campaignStart: true,
      campaignComplete: true,
      scheduledTrigger: true,
      backupRestore: true,
      duplicateContact: true,
      chipSwitch: true,
      settingsSave: true,
      reportExport: true,
      activeFilter: true,
      invalidPhone: true,
    }
  );

  if (!isOpen) return null;

  const handleAddChip = () => {
    if (!newChipName.trim()) return;
    const newChip: WhatsAppChip = {
      id: `chip_${Date.now()}`,
      name: newChipName.trim(),
      active: chips.length === 0,
      dailyLimit: maxMessagesPer24Hours,
      color: '#D4AF37'
    };
    const updated = [...chips, newChip];
    setChips(updated);
    if (!activeChipId && updated.length > 0) {
      setActiveChipId(newChip.id);
    }
    setNewChipName('');
  };

  const handleDeleteChip = (id: string) => {
    if (chips.length <= 1) {
      alert('Você precisa manter pelo menos um chip cadastrado.');
      return;
    }
    const updated = chips.filter(c => c.id !== id);
    setChips(updated);
    if (activeChipId === id && updated.length > 0) {
      setActiveChipId(updated[0].id);
    }
  };

  const handleExportJson = () => {
    setIsBackupModalOpen(true);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = restoreFromBackup(json);
        if (result.success) {
          sendAppNotification('💾 Backup Restaurado', {
            body: 'Seus dados, contatos e mensagens foram restaurados com sucesso!'
          });
          setImportStatus('Backup restaurado com sucesso!');
          setTimeout(() => {
            if (onRefreshData) onRefreshData();
            setImportStatus(null);
          }, 800);
        } else {
          alert(`Erro ao restaurar: ${result.error}`);
        }
      } catch (err) {
        alert('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      defaultCountryCode: '55',
      defaultIntervalSeconds: 8,
      maxMessagesPer24Hours: Number(maxMessagesPer24Hours) || 50,
      sendMode: 'whatsapp_desktop',
      webhookUrl: undefined,
      soundEnabled,
      autoOpenTab: true,
      enableSendingRules,
      ruleNighttime,
      ruleDailyLimit,
      ruleSundayAlert,
      ruleDoubleMessage,
      mentorName: settings.mentorName || 'Cláudio',
      chips,
      activeChipId,
      defaultFunnel,
      hideContactedToday,
      sortSkippedFirst,
      sortThreeDaysUnsentFirst,
      sortOldestContactedFirst,
      showOnlySkipped,
      hideAlreadyScheduled,
      notificationToggles,
    });
    if (activeChipId !== settings.activeChipId) {
      const chipObj = chips.find(c => c.id === activeChipId);
      const chipName = chipObj ? chipObj.name : 'Padrão';
      sendAppNotification('📱 Linha/Chip Ativo Alterado', {
        body: `O chip principal do disparo agora é: ${chipName}`,
        type: 'chipSwitch'
      });
    } else {
      sendAppNotification('⚙️ Configurações Salvas', {
        body: 'Suas preferências e parâmetros do GKD Messenger foram atualizados.',
        type: 'settingsSave'
      });
    }
    onClose();
  };

  const tabs = [
    { id: 'general' as TabType, label: 'Geral & Ajuda', icon: HelpCircle },
    { 
      id: 'notifications' as TabType, 
      label: 'Notificações & Diretrizes', 
      icon: Bell, 
      badge: notificationStatus === 'denied' ? 'Bloqueada' : notificationStatus === 'prompt' ? 'Ativar' : undefined 
    },
    { id: 'chips' as TabType, label: 'Chips & Limites', icon: Smartphone, badge: isBlocked24h ? 'Bloqueado' : isLimitReached ? 'Limite' : undefined },
    { id: 'rules' as TabType, label: 'Regras & Agenda', icon: ShieldCheck },
    { id: 'system' as TabType, label: 'Backup & Sistema', icon: Database },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div 
        className="bg-[#0F1115] border border-[#232732] rounded-2xl w-full max-w-3xl text-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Premium */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E222B] bg-[#0A0C10] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D23] flex items-center justify-center text-black shadow-lg shadow-[#D4AF37]/20">
              <Settings className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base tracking-wide">
                  Painel de Configurações
                </h3>
                <span className="bg-[#D4AF37]/15 text-[#E0C070] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  GKD Messenger
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Personalize remetente, modo de envio, proteção de números e regras
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-[#15181E] hover:bg-[#1E222B] rounded-xl border border-[#232732] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Segmented Tabs */}
        <div className="bg-[#12141A] border-b border-[#1E222B] px-3 sm:px-5 flex space-x-1.5 overflow-x-auto no-scrollbar py-2.5 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20 font-bold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1D25]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar text-xs">
            
            {/* TAB 1: GERAL & AJUDA */}
            {activeTab === 'general' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* Central de Ajuda & Guia Completo */}
                <div className="bg-[#14171E] border border-[#D4AF37]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md bg-gradient-to-r from-[#14171E] via-[#14171E] to-[#D4AF37]/10">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D23] text-black font-bold shrink-0 shadow-md">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Central de Ajuda & Guia Completo
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Tire dúvidas sobre disparos, formatações, limite anti-bloqueio e funcionamento.
                      </p>
                    </div>
                  </div>
                  {onOpenHelp && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenHelp();
                      }}
                      className="shrink-0 bg-[#D4AF37] hover:bg-[#E5C365] text-black font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/20 active:scale-95"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Abrir Ajuda</span>
                    </button>
                  )}
                </div>

                {/* Prefácio & Como Usar o App */}
                <div className="bg-[#14171E] border border-[#232732] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#0A0C10] border border-[#232732] text-[#D4AF37] shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Prefácio & Tutorial Rápido
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Manual ilustrado com o passo a passo completo e boas práticas de envio.
                      </p>
                    </div>
                  </div>
                  {onShowTutorial && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onShowTutorial();
                      }}
                      className="shrink-0 bg-[#1A1D25] hover:bg-[#252932] text-gray-200 hover:text-white font-bold py-2.5 px-4 rounded-xl border border-[#232732] text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>Ver Prefácio</span>
                    </button>
                  )}
                </div>

                {/* Efeitos Sonoros */}
                <div className="bg-[#14171E] border border-[#232732] rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-[#0A0C10] border border-[#232732] text-[#D4AF37]">
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">Efeitos Sonoros do Disparador</h4>
                      <p className="text-[11px] text-gray-400">Emite aviso audível ao concluir envio ou quando um lote estiver pronto.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[#1F2229] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                  </label>
                </div>

                {/* Status Automatizado */}
                <div className="bg-[#14171E] border border-[#232732] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center space-x-2 text-white font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>Automações Ativas do Sistema</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="bg-[#0A0C10] border border-[#1E222B] rounded-lg p-2.5 flex items-center space-x-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <div>
                        <p className="text-[11px] font-bold text-white">Canal Nativo Oficial</p>
                        <p className="text-[10px] text-gray-400">WhatsApp Desktop / Web</p>
                      </div>
                    </div>
                    <div className="bg-[#0A0C10] border border-[#1E222B] rounded-lg p-2.5 flex items-center space-x-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <div>
                        <p className="text-[11px] font-bold text-white">DDI Automático</p>
                        <p className="text-[10px] text-gray-400">+55 (Brasil)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Central de Notificações Shortcut */}
                <div className="bg-[#14171E] border border-[#D4AF37]/35 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md bg-gradient-to-r from-[#14171E] via-[#14171E] to-[#D4AF37]/10">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 shrink-0">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                          Diretrizes de Notificações
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          notificationStatus === 'granted' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : notificationStatus === 'denied'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {notificationStatus === 'granted' ? 'Ativas' : notificationStatus === 'denied' ? 'Bloqueadas' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Consulte o que pode e não pode colocar nas notificações e descubra por que elas não sobem no aparelho.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notifications')}
                    className="shrink-0 bg-[#1A1D25] hover:bg-[#252932] text-[#D4AF37] hover:text-white font-bold py-2.5 px-4 rounded-xl border border-[#D4AF37]/40 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95"
                  >
                    <Bell className="w-4 h-4 text-[#D4AF37]" />
                    <span>Ver Diretrizes</span>
                  </button>
                </div>

              </div>
            )}

            {/* TAB 2: NOTIFICAÇÕES & DIRETRIZES */}
            {activeTab === 'notifications' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* Painel de Eventos Nativos Ticar/Desmarcar */}
                <div className="bg-[#14171E] border border-[#A88B4B]/40 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#232732] pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-[#A88B4B]/20 text-[#A88B4B] border border-[#A88B4B]/40 shrink-0">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                          Eventos de Notificação Nátiva (Marcar / Desmarcar)
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          Escolha exatamente quais alertas o aplicativo deve subir para a sua barra de ferramentas do Android:
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setNotificationToggles({
                          listImport: true, campaignStart: true, campaignComplete: true, scheduledTrigger: true,
                          backupRestore: true, duplicateContact: true, chipSwitch: true, settingsSave: true,
                          reportExport: true, activeFilter: true, invalidPhone: true
                        })}
                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                      >
                        Marcar Todas
                      </button>
                      <span className="text-gray-600">|</span>
                      <button
                        type="button"
                        onClick={() => setNotificationToggles({
                          listImport: false, campaignStart: false, campaignComplete: false, scheduledTrigger: false,
                          backupRestore: false, duplicateContact: false, chipSwitch: false, settingsSave: false,
                          reportExport: false, activeFilter: false, invalidPhone: false
                        })}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
                      >
                        Desmarcar Todas
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      { key: 'listImport', label: '📥 Importação de Lista de Contatos', desc: 'Ao carregar novos contatos VCF/CSV' },
                      { key: 'campaignStart', label: '🚀 Início de Disparo de Mensagens', desc: 'Ao iniciar a execução do disparador' },
                      { key: 'campaignComplete', label: '🎉 Conclusão de Disparo de Campanha', desc: 'Ao finalizar todos os envios da lista' },
                      { key: 'scheduledTrigger', label: '🚨 Horário de Disparo Agendado', desc: 'Ao atingir o horário de um disparo agendado' },
                      { key: 'backupRestore', label: '💾 Restauração de Backup', desc: 'Ao restaurar dados via arquivo JSON' },
                      { key: 'duplicateContact', label: '⚠️ Alerta de Contato Duplicado', desc: 'Ao tentar reenviar para quem já recebeu mensagem' },
                      { key: 'chipSwitch', label: '📱 Troca de Linha / Chip Ativo', desc: 'Ao alterar o chip principal de envio' },
                      { key: 'settingsSave', label: '⚙️ Salvamento de Configurações', desc: 'Ao atualizar e salvar opções no painel' },
                      { key: 'reportExport', label: '📊 Exportação de Relatório / Auditoria', desc: 'Ao gerar e baixar relatórios de envio' },
                      { key: 'activeFilter', label: '🔍 Alerta de Filtro Ativo', desc: 'Ao detectar filtros ocultando contatos da tela' },
                      { key: 'invalidPhone', label: '📞 Telefone com Formato Inválido', desc: 'Ao detectar contatos com número malformatado' },
                    ].map((item) => {
                      const isChecked = notificationToggles[item.key as keyof NotificationPreferences] !== false;
                      return (
                        <label
                          key={item.key}
                          className={`flex items-start space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-[#181C26] border-[#A88B4B]/50 text-white' 
                              : 'bg-[#0A0C10] border-[#1E222B] text-gray-500 opacity-70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setNotificationToggles(prev => ({ ...prev, [item.key]: e.target.checked }))}
                            className="mt-0.5 rounded border-gray-700 bg-gray-900 text-[#A88B4B] focus:ring-[#A88B4B] w-4 h-4 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">{item.label}</div>
                            <div className="text-[10px] text-gray-400 truncate">{item.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 1. Status & Teste Prático */}
                <div className="bg-[#14171E] border border-[#232732] rounded-xl p-4 shadow-md space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E222B]">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        notificationStatus === 'granted' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : notificationStatus === 'denied'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30'
                      }`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                            Status das Notificações no Dispositivo
                          </h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            notificationStatus === 'granted' 
                              ? 'bg-emerald-500 text-black font-extrabold' 
                              : notificationStatus === 'denied'
                                ? 'bg-red-500 text-white font-bold'
                                : 'bg-[#D4AF37] text-black font-bold'
                          }`}>
                            {notificationStatus === 'granted' 
                              ? '🟢 Autorizadas' 
                              : notificationStatus === 'denied' 
                                ? '🔴 Bloqueadas' 
                                : '🟡 Aguardando Permissão'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {notificationStatus === 'granted'
                            ? 'O dispositivo está autorizado a receber alertas sonoros, vibração e banner nativo na barra de status.'
                            : notificationStatus === 'denied'
                              ? 'As notificações estão desativadas nas permissões do aparelho.'
                              : 'Clique abaixo para solicitar a permissão nativa do Android e habilitar os alertas.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {notificationStatus !== 'granted' && (
                        <button
                          type="button"
                          onClick={handleRequestNotifPermission}
                          className="bg-[#D4AF37] hover:bg-[#E5C365] text-black font-bold py-2 px-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Ativar Permissão</span>
                        </button>
                      )}
                      
                      <button
                        type="button"
                        disabled={testNotifLoading}
                        onClick={handleTestNotification}
                        className="bg-[#0A0C10] hover:bg-[#1A1D25] text-white font-bold py-2 px-3.5 rounded-xl border border-[#232732] hover:border-[#D4AF37]/50 text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Radio className={`w-3.5 h-3.5 text-[#D4AF37] ${testNotifLoading ? 'animate-pulse' : ''}`} />
                        <span>{testNotifLoading ? 'Disparando...' : 'Testar Notificação Agora'}</span>
                      </button>
                    </div>
                  </div>

                  {testNotifFeedback && (
                    <div className={`p-3 rounded-lg text-xs font-semibold flex items-center space-x-2 animate-fadeIn ${
                      testNotifFeedback.startsWith('✅') || testNotifFeedback.startsWith('🚀')
                        ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/40 border border-amber-500/40 text-amber-300'
                    }`}>
                      <Info className="w-4 h-4 shrink-0" />
                      <span>{testNotifFeedback}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-300 pt-1">
                    <div className="bg-[#0A0C10] border border-[#1E222B] p-2.5 rounded-lg flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Canal Heads-Up de Alta Prioridade</span>
                    </div>
                    <div className="bg-[#0A0C10] border border-[#1E222B] p-2.5 rounded-lg flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Vibração e Áudio de Disparo Ativos</span>
                    </div>
                    <div className="bg-[#0A0C10] border border-[#1E222B] p-2.5 rounded-lg flex items-center space-x-2">
                      <BatteryCharging className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Compatível com Android e PWA</span>
                    </div>
                  </div>
                </div>

                {/* 2. Diagnóstico: Por que a notificação NÃO ESTÁ SUBINDO? */}
                <div className="bg-[#14171E] border border-red-500/30 rounded-xl p-4 space-y-3 shadow-md bg-gradient-to-br from-[#14171E] via-[#14171E] to-red-950/20">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Por Que a Notificação Não Está Subindo no Aparelho?
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        Checklist das 5 causas mais comuns de bloqueio na barra de status do celular ou computador:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Causa 1 */}
                    <div className="bg-[#0A0C10] border border-[#232732] p-3 rounded-xl space-y-1.5">
                      <div className="flex items-center space-x-2 text-red-400 font-bold text-xs">
                        <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[10px]">1</span>
                        <span>Permissão Bloqueada no Sistema</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        No <strong>Android 13+</strong>, se a permissão foi negada no primeiro prompt, o sistema não exibe mais alertas automaticamente.
                      </p>
                      <div className="text-[10px] text-emerald-400 font-medium bg-[#14171E] p-1.5 rounded border border-[#1E222B]">
                        💡 <strong>Como resolver:</strong> Acesse as Configurações do Android &gt; Apps &gt; GKD Messenger &gt; Notificações &gt; Marque <strong>"Permitir Notificações"</strong>.
                      </div>
                    </div>

                    {/* Causa 2 */}
                    <div className="bg-[#0A0C10] border border-[#232732] p-3 rounded-xl space-y-1.5">
                      <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">2</span>
                        <span>Economia de Bateria / App Suspenso</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Fabricantes como <strong>Samsung, Xiaomi (MIUI) e Motorola</strong> fecham aplicativos em segundo plano para poupar bateria assim que a tela apaga.
                      </p>
                      <div className="text-[10px] text-emerald-400 font-medium bg-[#14171E] p-1.5 rounded border border-[#1E222B]">
                        💡 <strong>Como resolver:</strong> Vá em Configurações &gt; Apps &gt; GKD Messenger &gt; Bateria &gt; Selecione <strong>"Sem Restrições"</strong> (ou "Não Otimizar").
                      </div>
                    </div>

                    {/* Causa 3 */}
                    <div className="bg-[#0A0C10] border border-[#232732] p-3 rounded-xl space-y-1.5">
                      <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">3</span>
                        <span>Canal de Notificação em Modo Silencioso</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        No Android 8+, notificações precisam de um canal de <strong>Alta Importância (Heads-Up)</strong> para descer da tela. Se estiver em "Silencioso", não sobe.
                      </p>
                      <div className="text-[10px] text-emerald-400 font-medium bg-[#14171E] p-1.5 rounded border border-[#1E222B]">
                        💡 <strong>Resolvido pelo App:</strong> O GKD Messenger força automaticamente a criação do canal prioritário com importância máxima e som ativo.
                      </div>
                    </div>

                    {/* Causa 4 */}
                    <div className="bg-[#0A0C10] border border-[#232732] p-3 rounded-xl space-y-1.5">
                      <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
                        <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">4</span>
                        <span>Modo Não Perturbe (DND) ou Foco</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Se o aparelho estiver no modo <strong>Não Perturbe</strong> ou <strong>Modo Foco</strong>, todas as notificações flutuantes e toques são silenciados pelo celular.
                      </p>
                      <div className="text-[10px] text-emerald-400 font-medium bg-[#14171E] p-1.5 rounded border border-[#1E222B]">
                        💡 <strong>Como resolver:</strong> Desative temporariamente o Não Perturbe ou autorize exceções para o app na central de notificações.
                      </div>
                    </div>
                  </div>

                  {/* Causa 5 (Navegador) */}
                  <div className="bg-[#0A0C10] border border-[#232732] p-3 rounded-xl space-y-1">
                    <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">5</span>
                      <span>Navegador Mobile (Chrome Android / PWA)</span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      O Chrome para Android bloqueia notificações de abas inativas criadas via script comum (exige Service Worker registrado). Para a máxima estabilidade e receber alertas mesmo em segundo plano, utilize o <strong>APK instalado</strong> ou o <strong>PWA adicionado à tela inicial</strong>.
                    </p>
                  </div>
                </div>

                {/* 3. O que PODE colocar nas notificações */}
                <div className="bg-[#14171E] border border-emerald-500/30 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                          O Que PODE Colocar nas Notificações (Permitido & Recomendado)
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          Elementos suportados que garantem visualização clara e entrega confiável no celular:
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Boas Práticas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Título Curto e Objetivo (20 a 50 caracteres)</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Exemplo: <span className="font-mono text-amber-300 font-bold">🚨 HORA DO DISPARO: "VIP Finanças"</span>. Cabe com folga em qualquer tela de bloqueio e não é cortado pelo sistema.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Corpo Direto ao Ponto (40 a 160 caracteres)</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Exemplo: <span className="text-gray-200">"35 contatos aguardando envio. Toque para iniciar o disparador WhatsApp."</span> Focado na ação imediata sem enrolação.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Emojis Visuais Estratégicos</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Use emojis leves como <span className="text-white">🚨, 🔔, 📲, ⏰, 💬, ✅, 🚀, 👥</span> para dar destaque visual imediato na barra de status do aparelho.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Contadores e Variáveis Úteis</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Número de contatos prontos, horário agendado e nome do chip responsável. Permite que o usuário saiba o contexto do envio sem ter que abrir o app antes.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Tag Única de Agrupamento</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Identificador único que substitui ou atualiza a notificação anterior, evitando poluir a central do celular com dezenas de avisos duplicados.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Alerta Sonoro e Vibração Nativa</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Padrão sonoro e vibração tátil configurados em canal prioritário para chamar a atenção no momento exato em que a campanha estiver pronta.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. O que NÃO PODE colocar nas notificações */}
                <div className="bg-[#14171E] border border-red-500/30 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40">
                        <XCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                          O Que NÃO PODE / NÃO DEVE Colocar nas Notificações (Proibido & Incompatível)
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          Elementos proibidos que causam truncamento, quebra visual ou bloqueio do app:
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30">
                      Restrições & Proibições
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-red-400 font-bold text-xs">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Textos Longos ou Redações Inteiras (&gt; 200 caracteres)</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        O Android corta mensagens compactas após 2 linhas (<span className="text-red-400 font-mono">...</span>). Mensagens compridas ficam incompletas e truncadas.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-red-400 font-bold text-xs">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Código HTML ou Tags de Estilo (&lt;b&gt;, &lt;br&gt;, &lt;span&gt;)</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Sistemas nativos do Android e Windows <strong>NÃO</strong> interpretam tags HTML. As tags aparecem como texto puro sujo (<span className="text-red-300 font-mono">&lt;b&gt;Texto&lt;/b&gt;</span>).
                      </p>
                    </div>

                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-red-400 font-bold text-xs">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Links URL Soltos no Meio do Texto</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        O Android não transforma URLs soltas no texto em hyperlinks clicáveis na bandeja. O redirecionamento correto deve ser o toque no alerta inteiro.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-red-400 font-bold text-xs">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Ícone Colorido com Fundo Opaco (smallIcon)</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        No Android, o ícone pequeno de status <strong>DEVE ser branco com transparência</strong> (canal alfa). Se usar imagem colorida com fundo opaco, o Android converte em um <strong>quadrado branco sólido</strong>.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-red-400 font-bold text-xs">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Anexos de Arquivos Pesados (PDFs, Áudios, Imagens)</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Notificações de sistema não transportam mídias pesadas; servem apenas como sinalizador de disparo para o usuário abrir o app e iniciar o envio.
                      </p>
                    </div>

                    <div className="p-3 bg-[#0A0C10] rounded-xl border border-[#232732] space-y-1">
                      <div className="flex items-center space-x-2 text-red-400 font-bold text-xs">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Senhas, Códigos ou Informações Confidenciais</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Notificações podem ser lidas por terceiros na tela de bloqueio do celular mesmo sem desbloquear o dispositivo.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: CHIPS & LIMITES */}
            {activeTab === 'chips' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* Limiter Widget Card */}
                <div className={`border rounded-xl p-4 transition-all shadow-md ${
                  isBlocked24h
                    ? 'bg-red-950/30 border-red-600/60'
                    : isLimitReached
                     ? 'bg-red-950/20 border-red-500/40'
                     : 'bg-[#14171E] border-[#232732]'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isBlocked24h ? 'bg-red-500/30 text-red-300' : isLimitReached ? 'bg-red-500/20 text-red-400' : 'bg-[#D4AF37]/15 text-[#D4AF37]'
                      }`}>
                        {isBlocked24h ? <ShieldAlert className="w-5 h-5" /> : isLimitReached ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Limite de Disparos em 24 Horas
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          {sentLast24H} de {maxLimit} mensagens enviadas nas últimas 24h
                        </p>
                      </div>
                    </div>

                    <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full font-bold uppercase ${
                      isBlocked24h ? 'bg-red-600 text-white' : isLimitReached ? 'bg-red-500 text-white animate-pulse' : 'bg-[#D4AF37] text-black'
                    }`}>
                      {isBlocked24h ? '🚫 Bloqueado' : isLimitReached ? 'Teto Atingido' : `${remaining} restantes`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#0A0C10] h-2 rounded-full overflow-hidden border border-[#232732] mb-3">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        isBlocked24h ? 'bg-red-500' : isLimitReached ? 'bg-red-500' : 'bg-gradient-to-r from-[#D4AF37] to-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((sentLast24H / maxLimit) * 100))}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-gray-300 mb-3 bg-[#0A0C10] p-3 rounded-lg border border-[#232732]">
                    {isBlocked24h
                      ? `🚫 O disparador está pausado por 24 horas para proteção do número. Libera em ${blockedDateStr} às ${blockedTimeStr}.`
                      : isLimitReached
                       ? `⚠️ Você atingiu o limite de ${maxLimit} mensagens nas últimas 24h. O envio foi pausado para evitar bloqueios no WhatsApp.`
                       : `Proteção ativa: O sistema pausa automaticamente caso o volume ultrapasse a tolerância do chip.`}
                  </div>

                  {/* Limit selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                        Capacidade Máxima por 24 Horas
                      </label>
                      <select
                        value={maxMessagesPer24Hours}
                        onChange={(e) => setMaxMessagesPer24Hours(Number(e.target.value))}
                        className="w-full bg-[#0A0C10] border border-[#232732] rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-[#D4AF37] font-mono font-bold"
                      >
                        <option value={50}>50 mensagens / 24h (Chips Novos)</option>
                        <option value={70}>70 mensagens / 24h (Conservador)</option>
                        <option value={100}>100 mensagens / 24h (Recomendado)</option>
                        <option value={120}>120 mensagens / 24h (Aquecido)</option>
                        <option value={150}>150 mensagens / 24h (Alto Volume)</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      {isBlocked24h && onUnblockWhatsApp ? (
                        <button
                          type="button"
                          onClick={onUnblockWhatsApp}
                          className="w-full bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold py-2 px-3 rounded-lg border border-emerald-500/50 text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <Unlock className="w-4 h-4 text-emerald-400" />
                          <span>Desbloquear Agora</span>
                        </button>
                      ) : onReportBlocked24h ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Deseja acionar a pausa de emergência de 24 horas para proteção do chip?')) {
                              onReportBlocked24h();
                            }
                          }}
                          className="w-full bg-red-950/60 hover:bg-red-900/90 text-red-300 border border-red-700/60 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <Lock className="w-4 h-4 text-red-400" />
                          <span>Pausar Envios (24h)</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Gestão de Chips */}
                <div className="bg-[#14171E] border border-[#232732] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Chips & Linhas Cadastradas
                      </h4>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {chips.length} {chips.length === 1 ? 'chip' : 'chips'}
                    </span>
                  </div>

                  {/* Chips List */}
                  <div className="space-y-2">
                    {chips.map((chip) => {
                      const isCurrentActive = chip.id === activeChipId;
                      return (
                        <div
                          key={chip.id}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                            isCurrentActive
                              ? 'bg-[#D4AF37]/10 border-[#D4AF37]/60'
                              : 'bg-[#0A0C10] border-[#232732] hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => setActiveChipId(chip.id)}
                              className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
                                isCurrentActive
                                  ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                                  : 'border-gray-600 bg-transparent'
                              }`}
                              title={isCurrentActive ? 'Chip em uso' : 'Clique para usar este chip'}
                            >
                              {isCurrentActive && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-white">{chip.name}</span>
                                {isCurrentActive && (
                                  <span className="bg-[#D4AF37] text-black text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                                    Em Uso
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400">
                                Limite configurado: {chip.dailyLimit || maxMessagesPer24Hours} msgs/dia
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {onResetChipLogs && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Zerar o histórico de envios do chip "${chip.name}"?`)) {
                                    onResetChipLogs(chip.id);
                                  }
                                }}
                                className="text-[10px] text-gray-400 hover:text-amber-300 px-2 py-1 bg-[#1A1D25] rounded-lg border border-[#232732] cursor-pointer"
                              >
                                Zerar Contador
                              </button>
                            )}
                            {chips.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteChip(chip.id)}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Excluir chip"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Chip */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      value={newChipName}
                      onChange={(e) => setNewChipName(e.target.value)}
                      placeholder="Nome de novo chip (ex: Linha Vendas 2)"
                      className="flex-1 bg-[#0A0C10] border border-[#232732] rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={handleAddChip}
                      className="bg-[#1A1D25] hover:bg-[#252932] text-white px-3 py-2 rounded-lg border border-[#232732] text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: REGRAS & AGENDA */}
            {activeTab === 'rules' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* Master Switch Regras */}
                <div className="bg-[#14171E] border border-[#232732] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Sistema Inteligente de Regras de Envio
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Ativa proteções automáticas de compliance e horários seguros.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableSendingRules}
                      onChange={(e) => setEnableSendingRules(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#1F2229] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                  </label>
                </div>

                {/* Sub-regras */}
                {enableSendingRules && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-[#14171E] border border-[#232732] rounded-xl p-3.5 flex items-start space-x-3">
                      <SunMoon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="font-bold text-white text-xs">Bloqueio Noturno</span>
                          <input
                            type="checkbox"
                            checked={ruleNighttime}
                            onChange={(e) => setRuleNighttime(e.target.checked)}
                            className="rounded bg-[#0A0C10] border-[#232732] text-[#D4AF37] focus:ring-0 cursor-pointer"
                          />
                        </label>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Pausa disparos entre 20h e 09h para respeitar o descanso do cliente.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#14171E] border border-[#232732] rounded-xl p-3.5 flex items-start space-x-3">
                      <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="font-bold text-white text-xs">Teto Diário (24h)</span>
                          <input
                            type="checkbox"
                            checked={ruleDailyLimit}
                            onChange={(e) => setRuleDailyLimit(e.target.checked)}
                            className="rounded bg-[#0A0C10] border-[#232732] text-[#D4AF37] focus:ring-0 cursor-pointer"
                          />
                        </label>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Bloqueia novas campanhas se o limite de 24h tiver sido alcançado.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#14171E] border border-[#232732] rounded-xl p-3.5 flex items-start space-x-3">
                      <CalendarCheck2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="font-bold text-white text-xs">Alerta aos Domingos</span>
                          <input
                            type="checkbox"
                            checked={ruleSundayAlert}
                            onChange={(e) => setRuleSundayAlert(e.target.checked)}
                            className="rounded bg-[#0A0C10] border-[#232732] text-[#D4AF37] focus:ring-0 cursor-pointer"
                          />
                        </label>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Exibe aviso de confirmação caso decida enviar mensagens no domingo.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#14171E] border border-[#232732] rounded-xl p-3.5 flex items-start space-x-3">
                      <CopyCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="font-bold text-white text-xs">Anti-Duplicidade</span>
                          <input
                            type="checkbox"
                            checked={ruleDoubleMessage}
                            onChange={(e) => setRuleDoubleMessage(e.target.checked)}
                            className="rounded bg-[#0A0C10] border-[#232732] text-[#D4AF37] focus:ring-0 cursor-pointer"
                          />
                        </label>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Avisa se você tentar disparar para o mesmo número mais de uma vez no mesmo dia.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filtros e Priorização da Agenda */}
                <div className="bg-[#14171E] border border-[#232732] rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-[#D4AF37]" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      Filtros e Priorização da Agenda
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Estas opções definem como seus contatos são classificados e exibidos ao preparar envios:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {[
                      { label: 'Ocultar Enviados Hoje', checked: hideContactedToday, setChecked: setHideContactedToday },
                      { label: 'Fixar Pulados no Topo', checked: sortSkippedFirst, setChecked: setSortSkippedFirst },
                      { label: 'Sem Envio > 3 dias no Topo', checked: sortThreeDaysUnsentFirst, setChecked: setSortThreeDaysUnsentFirst },
                      { label: 'Mais Antigos Enviados 1º', checked: sortOldestContactedFirst, setChecked: setSortOldestContactedFirst },
                      { label: 'Exibir Apenas Pulados', checked: showOnlySkipped, setChecked: setShowOnlySkipped },
                      { label: 'Ocultar Já Agendados', checked: hideAlreadyScheduled, setChecked: setHideAlreadyScheduled },
                    ].map((item) => (
                      <label 
                        key={item.label}
                        className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-[#0A0C10] border border-[#232732] hover:border-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => item.setChecked(e.target.checked)}
                          className="rounded bg-[#14171E] border-[#232732] text-[#D4AF37] focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs text-gray-300 font-medium">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: BACKUP & AJUDA */}
            {activeTab === 'system' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* Prefácio & Tutorial Modal */}
                <div className="bg-[#14171E] border border-[#D4AF37]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D23] text-black font-bold shrink-0 shadow-md">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Prefácio & Como Usar o App
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Acesse o manual ilustrado com o passo a passo completo, dicas anti-bloqueio e variáveis.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onShowTutorial) onShowTutorial();
                    }}
                    className="shrink-0 bg-[#D4AF37] hover:bg-[#E5C365] text-black font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/20 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Abrir Prefácio</span>
                  </button>
                </div>

                {/* Permissões & Dispositivo */}
                <div className="bg-[#14171E] border border-[#232732] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Permissões & Escudo do Dispositivo
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Gerencie permissões de notificações de disparo, câmera, agenda e memória local.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenPermissions) onOpenPermissions();
                    }}
                    className="shrink-0 bg-[#1A1D25] hover:bg-[#252932] text-gray-200 hover:text-white font-bold py-2.5 px-4 rounded-xl border border-[#232732] text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>Ver Permissões</span>
                  </button>
                </div>

                {/* Backup & Restauração JSON */}
                <div className="bg-[#14171E] border border-[#232732] rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-[#D4AF37]" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      Cópia de Segurança (Backup Completo)
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Salve todos os seus contatos, agendamentos, mensagens e configurações em um único arquivo JSON.
                  </p>

                  {exportStatus && (
                    <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{exportStatus}</span>
                    </div>
                  )}

                  {importStatus && (
                    <div className="p-2.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-xl text-amber-200 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span>{importStatus}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="bg-[#0A0C10] hover:bg-[#1A1D25] text-gray-200 hover:text-white font-bold py-2.5 px-4 rounded-xl border border-[#232732] hover:border-[#D4AF37]/50 text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Download className="w-4 h-4 text-[#D4AF37]" />
                      <span>Exportar Backup (JSON)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-[#0A0C10] hover:bg-[#1A1D25] text-gray-200 hover:text-white font-bold py-2.5 px-4 rounded-xl border border-[#232732] hover:border-[#D4AF37]/50 text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Upload className="w-4 h-4 text-[#D4AF37]" />
                      <span>Restaurar Backup</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleImportJson}
                    />
                  </div>

                  {onOpenSaveAndReset && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenSaveAndReset();
                        }}
                        className="text-[11px] text-gray-400 hover:text-[#D4AF37] underline transition-colors cursor-pointer"
                      >
                        Central de Salvamento Avançado (Exportar CSV, PDF ou Limpar Dados)
                      </button>
                    </div>
                  )}

                  {/* Sincronização com o Firestore */}
                  <div className="pt-3 border-t border-[#232732] grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (!auth.currentUser) {
                            await signInWithGoogle();
                          }
                          setExportStatus('Enviando backup para o Firestore...');
                          const backupPayload = {
                            contacts: contacts || [],
                            templates: templates || [],
                            campaigns: campaigns || [],
                            logs: logs || [],
                            groups: groups || [],
                            settings: settings || {},
                          };
                          await saveUserCloudBackup(JSON.stringify(backupPayload), 'GKD Messenger Web');
                          setExportStatus('✅ Sincronizado com o Firestore com sucesso!');
                          setTimeout(() => setExportStatus(null), 4000);
                        } catch (err: any) {
                          alert(`Erro ao sincronizar com Firestore: ${err?.message || err}`);
                          setExportStatus(null);
                        }
                      }}
                      className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-bold py-2.5 px-4 rounded-xl border border-emerald-500/50 text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Cloud className="w-4 h-4 text-emerald-400" />
                      <span>Sincronizar com Firestore</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (!auth.currentUser) {
                            await signInWithGoogle();
                          }
                          setImportStatus('Baixando backup do Firestore...');
                          const cloudData = await loadUserCloudBackup();
                          if (!cloudData || !cloudData.payloadJson) {
                            alert('Nenhum backup encontrado no Firestore para este usuário.');
                            setImportStatus(null);
                            return;
                          }
                          const parsed = JSON.parse(cloudData.payloadJson);
                          const result = restoreFromBackup(parsed);
                          if (result.success) {
                            setImportStatus('✅ Dados restaurados do Firestore com sucesso!');
                            setTimeout(() => {
                              if (onRefreshData) onRefreshData();
                              setImportStatus(null);
                            }, 1000);
                          } else {
                            alert(`Erro ao restaurar dados: ${result.error}`);
                            setImportStatus(null);
                          }
                        } catch (err: any) {
                          alert(`Erro ao restaurar do Firestore: ${err?.message || err}`);
                          setImportStatus(null);
                        }
                      }}
                      className="bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 font-bold py-2.5 px-4 rounded-xl border border-blue-500/50 text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Database className="w-4 h-4 text-blue-400" />
                      <span>Restaurar do Firestore</span>
                    </button>
                  </div>
                </div>

                {/* Suporte WhatsApp */}
                <div className="bg-[#14171E] border border-emerald-500/25 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Suporte & Sugestões
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Dúvidas sobre o funcionamento ou sugestões de novas funções? Fale com a equipe.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const text = encodeURIComponent("Olá! Gostaria de tirar uma dúvida/enviar uma sugestão sobre o GKD Messenger:");
                      window.open(`https://wa.me/5511953292570?text=${text}`, '_blank');
                    }}
                    className="shrink-0 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-bold py-2.5 px-4 rounded-xl border border-emerald-500/40 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chamar no WhatsApp</span>
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Sticky Footer */}
          <div className="px-5 py-3.5 border-t border-[#1E222B] bg-[#0A0C10] shrink-0 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (safeConfirm('Deseja realmente descartar as alterações não salvas?')) {
                  onClose();
                }
              }}
              className="px-4 py-2.5 rounded-xl text-gray-400 hover:text-white text-xs hover:bg-[#1A1D25] font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2C] hover:from-[#E5C365] hover:to-[#C9A238] text-black font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 flex items-center space-x-2 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      </div>

      <BackupDownloadModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        data={{
          contacts: contacts || [],
          logs: logs || [],
          campaigns: campaigns || [],
          templates: templates || [],
          groups: groups || [],
          settings,
        }}
        onSuccess={(savedName) => {
          setExportStatus(`Backup salvo: ${savedName}`);
          setTimeout(() => setExportStatus(null), 4000);
        }}
      />
    </div>
  );
};
