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
  Filter
} from 'lucide-react';
import { AppSettings, WhatsAppChip, DispatchLogItem, Contact, ScheduledCampaign, MessageTemplate, ContactGroup } from '../types';
import { safeConfirm } from '../utils/whatsapp';
import { restoreFromBackup } from '../utils/storage';
import { downloadFileSafely, handleDownloadBackup } from '../utils/downloadHelper';
import { BackupDownloadModal } from './BackupDownloadModal';

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

type TabType = 'general' | 'chips' | 'rules' | 'system';

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
          setImportStatus('Backup restaurado! Atualizando dados...');
          setTimeout(() => {
            if (onRefreshData) onRefreshData();
            window.location.reload();
          }, 1200);
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
    });
    onClose();
  };

  const tabs = [
    { id: 'general' as TabType, label: 'Geral & Ajuda', icon: HelpCircle },
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

              </div>
            )}

            {/* TAB 2: CHIPS & LIMITES */}
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
