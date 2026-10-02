import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Contact, 
  MessageTemplate, 
  ScheduledCampaign, 
  DispatchLogItem, 
  ContactGroup, 
  AppSettings,
  ProjectArchive 
} from './types';
import { 
  getContacts, 
  saveContacts, 
  getTemplates, 
  saveTemplates, 
  getCampaigns, 
  saveCampaigns, 
  getDispatchLogs, 
  saveDispatchLogs, 
  getGroups, 
  saveGroups,
  getSettings, 
  saveSettings,
  getProjectArchives,
  saveProjectArchives,
  getTodayDateString,
  INITIAL_TEMPLATES,
  INITIAL_CONTACTS,
  DEFAULT_GROUPS,
  addDeletedTemplateIds,
  addDeletedTopic,
  renameTopicPermanently,
  clearDeletedTemplatesAndTopics
} from './utils/storage';
import { playNotificationSound, playDispatchAlertSound } from './utils/audio';
import { sendBrowserNotification, triggerVibration, requestPersistentStorage, requestNotificationPermission, initializePushNotifications } from "./utils/permissions";
import { buildWhatsAppLink, openWhatsAppLink, replaceTemplateVariables, cleanChipName, getExpectedGroup, calculateChipReleaseTimes, formatReleaseTime } from './utils/whatsapp';
import { cleanPhoneNumber } from './utils/vcfParser';
import { checkSendingRules } from './utils/rules';
import { processContactName, enrichContacts, isIgnoredSequenceTag, isInvalidCategoryName } from './utils/contactProcessor';
import { downloadFileSafely, handleDownloadBackup } from './utils/downloadHelper';
import { Send, X, Bell, CheckCircle2, AlertCircle, Shield, Printer } from 'lucide-react';

import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ContactsView } from './components/ContactsView';
import { TemplatesView } from './components/TemplatesView';
import { VoiceSimulatorView } from './components/VoiceSimulatorView';
import { NewCampaignView } from './components/NewCampaignView';
import { AiTemplateModal } from './components/AiTemplateModal';
import { DispatcherModal } from './components/DispatcherModal';
import { HistoryView } from './components/HistoryView';
import { SettingsModal } from './components/SettingsModal';
import { WelcomeTutorialModal } from './components/WelcomeTutorialModal';
import { ConfirmSentModal } from './components/ConfirmSentModal';
import { CardsView } from './components/CardsView';
import { HelpModal } from './components/HelpModal';
import { PermissionsModal } from './components/PermissionsModal';
import { RuleViolationModal } from './components/RuleViolationModal';
import { EditCampaignModal } from './components/EditCampaignModal';
import { ApkExportModal } from './components/ApkExportModal';
import { AnalyticsView } from './components/AnalyticsView';
import { LogoInfoModal } from './components/LogoInfoModal';
import { SaveAndResetModal } from './components/SaveAndResetModal';
import { TopicGeneratorModal } from './components/TopicGeneratorModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLogoInfoModalOpen, setIsLogoInfoModalOpen] = useState<boolean>(false);
  const [isSaveAndResetOpen, setIsSaveAndResetOpen] = useState<boolean>(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState<boolean>(false);
  const [reportPreviewHtml, setReportPreviewHtml] = useState<string | null>(null);

  // Auto-lock persistent storage memory on startup
  useEffect(() => {
    requestPersistentStorage();
    initializePushNotifications();
  }, []);

  // Application Data States - Synchronously initialized with in-memory caching to avoid layout thrashing
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const loaded = getContacts();
    return loaded.length > 0 ? loaded : INITIAL_CONTACTS;
  });
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => getTemplates());
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>(() => getCampaigns());
  const [logs, setLogs] = useState<DispatchLogItem[]>(() => getDispatchLogs());
  const [groups, setGroups] = useState<ContactGroup[]>(() => {
    const savedGroups = getGroups();
    const existingGroupIds = new Set(savedGroups.map(g => g.id));
    const toAdd = DEFAULT_GROUPS.filter(dg => !existingGroupIds.has(dg.id));
    const merged = [...savedGroups, ...toAdd];
    return Array.from(new Map(merged.map(g => [g.id, g])).values());
  });
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [projectArchives, setProjectArchives] = useState<ProjectArchive[]>(() => getProjectArchives());
  const [isAppReady] = useState<boolean>(true);

  // Ensure totalSentCount is synced on load so total sent never drops
  useEffect(() => {
    const currentSentLogs = logs.filter(l => l.status === 'enviado').length;
    const currentTotal = currentSentLogs + (settings.historicalSentCount || 0);
    if (settings.totalSentCount === undefined || settings.totalSentCount < currentTotal) {
      updateSettingsState({
        ...settings,
        totalSentCount: Math.max(settings.totalSentCount || 0, currentTotal)
      });
    }
  }, []);

  // One-time Reset Business chip counter as requested by user
  useEffect(() => {
    const hasResetBusiness = localStorage.getItem('gkd_reset_business_chip_v1');
    if (!hasResetBusiness) {
      const currentLogs = getDispatchLogs();
      const newLogs = currentLogs.filter(l => {
        if (l.chipId === 'chip_1') return false;
        const cName = cleanChipName((l.chipName as string) || '').toLowerCase();
        if (cName.includes('business') || cName.includes('principal')) return false;
        if (!l.chipId && !(l.chipName as string)) return false;
        return true;
      });
      setLogs(newLogs);
      saveDispatchLogs(newLogs);
      localStorage.setItem('gkd_reset_business_chip_v1', 'true');
    }
  }, []);

  // Modal Control States
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isTopicGeneratorOpen, setIsTopicGeneratorOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isApkExportModalOpen, setIsApkExportModalOpen] = useState<boolean>(false);
  const [activeDispatcherCampaign, setActiveDispatcherCampaign] = useState<ScheduledCampaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<ScheduledCampaign | null>(null);
  const [pendingConfirmContact, setPendingConfirmContact] = useState<{ contact: Contact; message: string } | null>(null);
  const dispatcherRef = useRef<{ confirmWithChip: (chipId: string, chipName: string) => void } | null>(null);
  const [dueCampaignAlert, setDueCampaignAlert] = useState<ScheduledCampaign | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [ruleViolationModal, setRuleViolationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isBlocking: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isBlocking: true,
  });

  // Check if first time user to show tutorial/preface and prompt for name
  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('gkd_has_seen_tutorial_v1');
      const hasConfiguredName = localStorage.getItem('gkd_user_name_configured');
      if (!hasSeen || !hasConfiguredName) {
        setIsTutorialModalOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = 
      isAiModalOpen || 
      isTopicGeneratorOpen ||
      isSettingsModalOpen || 
      isTutorialModalOpen ||
      isHelpModalOpen || 
      isApkExportModalOpen || 
      isPermissionsModalOpen || 
      isLogoInfoModalOpen || 
      isSaveAndResetOpen || 
      !!activeDispatcherCampaign || 
      !!editingCampaign || 
      !!pendingConfirmContact || 
      !!dueCampaignAlert || 
      ruleViolationModal.isOpen;

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [
    isAiModalOpen, isTopicGeneratorOpen, isSettingsModalOpen, isTutorialModalOpen, isHelpModalOpen, isApkExportModalOpen, 
    isPermissionsModalOpen, isLogoInfoModalOpen, isSaveAndResetOpen, 
    activeDispatcherCampaign, editingCampaign, 
    pendingConfirmContact, dueCampaignAlert, ruleViolationModal.isOpen
  ]);

  const executeSendWhatsApp = (contact: Contact, customMsg?: string) => {
    const defaultTemplate = 'Olá {primeiro_nome}, {saudacao}!';
    const text = replaceTemplateVariables(customMsg || defaultTemplate, contact, new Date());
    const url = buildWhatsAppLink(contact.phone, text, settings.sendMode);
    openWhatsAppLink(url);
    setPendingConfirmContact({ contact, message: text });
  };

  const handleSendWhatsAppToContact = (contact: Contact, customMsg?: string) => {
    const cleanName = (contact.name || '').toLowerCase();
    const isMe = cleanName === 'me' || cleanName === 'eu' || cleanName === 'mim';

    if (isMe) {
      alert('⚠️ Envio bloqueado: Não é permitido enviar mensagens para si mesmo.');
      return;
    }

    const defaultTemplate = 'Olá {primeiro_nome}, {saudacao}!';
    let text = replaceTemplateVariables(customMsg || defaultTemplate, contact, new Date());

    const ruleResult = checkSendingRules(contact, logs, settings, settings.activeChipId);

    const todayStr = new Date().toISOString().slice(0, 10);
    const isSecondMsgOfDay =
      ruleResult.message?.toLowerCase().includes('segunda mensagem') ||
      logs.some(
        (l) =>
          l.contactId === contact.id &&
          l.status === 'enviado' &&
          l.sentAt &&
          new Date(l.sentAt).toISOString().slice(0, 10) === todayStr
      );

    if (!ruleResult.allowed) {
      setRuleViolationModal({
        isOpen: true,
        title: 'Infração de Regra de Envio',
        message: ruleResult.message || 'Envio bloqueado pelas regras configuradas.',
        isBlocking: false,
        onConfirm: () => executeSendWhatsApp(contact, text),
        onCancel: () => {
          if (isSecondMsgOfDay) {
            handleDeleteContact(contact.id);
            setToastMessage(`🗑️ ${contact.name} foi removido(a) da lista. Dados do 1º envio mantidos no histórico.`);
          }
        },
      });
      return;
    }
    if (ruleResult.requiresConfirmation) {
      setRuleViolationModal({
        isOpen: true,
        title: 'Aviso de Regra de Envio',
        message: ruleResult.message || 'Deseja realmente enviar esta mensagem?',
        isBlocking: false,
        onConfirm: () => executeSendWhatsApp(contact, text),
        onCancel: () => {
          if (isSecondMsgOfDay) {
            handleDeleteContact(contact.id);
            setToastMessage(`🗑️ ${contact.name} foi removido(a) da lista. Dados do 1º envio mantidos no histórico.`);
          }
        },
      });
      return;
    }

    executeSendWhatsApp(contact, text);
  };

  const handleDeleteLog = (id: string) => {
    updateLogsState(logs.filter((l) => l.id !== id));
  };

  const handleUpdateLog = (id: string, updates: Partial<DispatchLogItem>) => {
    updateLogsState(
      logs.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const handleDeleteMultipleLogs = (ids: string[]) => {
    updateLogsState(logs.filter((l) => !ids.includes(l.id)));
  };

  const handleResetChipLogs = (chipId: string) => {
    const now = new Date().toISOString();
    const updatedChips = (settings.chips || []).map(chip => 
      chip.id === chipId ? { ...chip, lastResetAt: now } : chip
    );
    
    const chip = updatedChips.find(c => c.id === chipId);
    const chipNameStr = chip ? cleanChipName(chip.name) : 'este chip';
    
    const newSettings = { ...settings, chips: updatedChips };
    setSettings(newSettings);
    saveSettings(newSettings);
    
    showToast(`✅ Contador do chip ${chipNameStr} zerado!`);
  };

  const handleResetAllChips = () => {
    const now = new Date().toISOString();
    const updatedChips = (settings.chips || []).map(chip => ({ ...chip, lastResetAt: now }));
    
    const newSettings = { ...settings, chips: updatedChips };
    setSettings(newSettings);
    saveSettings(newSettings);
    
    showToast('✅ Todos os contadores foram zerados!');
  };

  const handleToggleContactedToday = (contactId: string, isSent: boolean) => {
    const todayStr = getTodayDateString();
    const activeChip = (settings.chips || []).find(c => c.id === settings.activeChipId) || (settings.chips || [])[0];
    const targetContact = contacts.find(c => c.id === contactId);

    let newCategory = targetContact?.group || '0º Envio';
    if (isSent && targetContact) {
      const existingSuccessful = logs.filter(l => 
        l.status === 'enviado' && 
        (l.contactId === contactId || (targetContact.phone && cleanPhoneNumber(l.phone) === cleanPhoneNumber(targetContact.phone)))
      ).length;
      const totalSuccessful = existingSuccessful + 1;
      newCategory = getExpectedGroup(totalSuccessful);
    }

    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        return {
          ...c,
          group: isSent ? newCategory : c.group,
          lastContactedDate: isSent ? todayStr : undefined,
          chipId: isSent && activeChip ? activeChip.id : c.chipId,
          chipName: isSent && activeChip ? cleanChipName(activeChip.name) : cleanChipName(c.chipName),
        };
      }
      return c;
    });
    updateContactsState(updated);
  };

  // Initial Load - Optimized Group Recovery
  useEffect(() => {
    try {
      let groupsChanged = false;
      
      const currentGroups = getGroups();
      const activeContactGroupNames = new Set(contacts.map(c => (c.group || 'Agenda de Contatos').trim().toLowerCase()));

      let validGroups = currentGroups.filter(g => {
        const lower = (g.name as string).trim().toLowerCase();
        const isSystem = lower === 'agenda de contatos' || lower === 'geral' || lower === 'sem campanha' || lower === 'agenda de contatos (sem campanha)';
        if (isInvalidCategoryName((g.name as string))) {
          groupsChanged = true;
          return false; 
        }
        if (!isSystem && !activeContactGroupNames.has(lower)) {
          groupsChanged = true;
          return false;
        }
        return true;
      });

      const existingGroupNames = new Set(validGroups.map(g => (g.name as string).trim().toLowerCase()));
      const newGroupsToAdd: ContactGroup[] = [];
      const processedGroupsInContacts = new Set<string>();

      for (const c of contacts) {
        if (c.group && c.group.trim() !== '') {
          const cTrimmed = c.group.trim();
          const cLower = cTrimmed.toLowerCase();
          
          if (processedGroupsInContacts.has(cLower)) continue;
          processedGroupsInContacts.add(cLower);

          if (!isInvalidCategoryName(cTrimmed)) {
            if (!existingGroupNames.has(cLower)) {
              existingGroupNames.add(cLower);
              newGroupsToAdd.push({
                id: `grp_restored_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: cTrimmed,
                color: 'bg-[#A88B4B]'
              });
              groupsChanged = true;
            }
          }
        }
      }

      if (groupsChanged) {
        const finalGroups = [...validGroups, ...newGroupsToAdd];
        if (!finalGroups.some((g) => (g.name as string).trim().toLowerCase() === 'agenda de contatos')) {
          finalGroups.unshift({ id: 'grp_agenda', name: 'Agenda de Contatos', color: 'bg-emerald-500' });
        }
        setGroups(finalGroups);
        saveGroups(finalGroups);
      }
    } catch (err) {
      console.error('Group recovery error:', err);
    }
  }, []); // Run once on mount to avoid loops

  // Migration: fix invalid categories, cities, names, sequence tags & non-existent categories
  useEffect(() => {
    if (!groups || groups.length === 0) return;

    let migrated = false;
    const validGroupSet = new Set(groups.map(g => (g.name as string).trim().toLowerCase()));
    validGroupSet.add('agenda de contatos');

    const updated = contacts.map(c => {
      const gRaw = (c.group || '').trim();
      const lower = gRaw.toLowerCase();

      const isInvalid = isInvalidCategoryName(gRaw);
      const isNonExistent = !validGroupSet.has(lower);

      if (isInvalid || isNonExistent) {
        const { cleanName, detectedGroup } = processContactName(c.name);
        const validDetected = detectedGroup && !isInvalidCategoryName(detectedGroup) ? detectedGroup : null;
        const targetGroup = validDetected || 'Agenda de Contatos';

        if (c.group !== targetGroup || (cleanName && cleanName !== c.name)) {
          migrated = true;
          return {
            ...c,
            name: cleanName || c.name,
            group: targetGroup
          };
        }
      }
      return c;
    });

    if (migrated) {
      setContacts(updated);
      saveContacts(updated);
    }
  }, [groups]);

  // Navegação com histórico do navegador / botão Voltar do celular (Android Back Button)
  const tabHistoryRef = useRef<string[]>(['dashboard']);

  // Função para reforçar a pilha de retenção (evita saída acidental ao clicar 2x rápido)
  const pumpHistoryGuard = useCallback(() => {
    try {
      // Garante múltiplas entradas para que cliques duplos rápidos nunca alcancem a saída do app
      for (let i = 0; i < 3; i++) {
        window.history.pushState({ appTab: 'guard', ts: Date.now() + i }, '');
      }
    } catch (e) {}
  }, []);

  // Função centralizada para mudar de tela registrando no histórico
  const navigateToTab = useCallback((tab: string) => {
    setActiveTab(tab);
    // Se não for a mesma tela atual
    const historyStack = tabHistoryRef.current;
    if (historyStack[historyStack.length - 1] !== tab) {
      historyStack.push(tab);
      try {
        window.history.pushState({ appTab: tab, timestamp: Date.now() }, '');
      } catch (e) {
        // Ignora erros em sandbox ou iframes com restrições
      }
    }
    pumpHistoryGuard();
  }, [pumpHistoryGuard]);

  // Interceptar o botão voltar físico/gesto do celular (popstate)
  useEffect(() => {
    // Garante estado inicial na pilha do navegador com camada de retenção
    try {
      window.history.replaceState({ appTab: 'dashboard', timestamp: Date.now() }, '');
      for (let i = 0; i < 5; i++) {
        window.history.pushState({ appTab: 'guard', timestamp: Date.now() + i }, '');
      }
    } catch (e) {
      // Ignora erro se indisponível
    }

    const handlePopState = (event: PopStateEvent) => {
      // Sempre reabastece imediatamente a barreira do histórico para nunca esvaziar a pilha do navegador
      try {
        window.history.pushState({ appTab: 'guard', timestamp: Date.now() }, '');
      } catch (e) {}

      // 1. Se houver algum modal aberto, fecha o modal primeiro sem trocar de tela
      if (isAiModalOpen) {
        setIsAiModalOpen(false);
        return;
      }
      if (isTopicGeneratorOpen) {
        setIsTopicGeneratorOpen(false);
        return;
      }
      if (isSettingsModalOpen) {
        setIsSettingsModalOpen(false);
        return;
      }
      if (isHelpModalOpen) {
        setIsHelpModalOpen(false);
        return;
      }
      if (isApkExportModalOpen) {
        setIsApkExportModalOpen(false);
        return;
      }
      if (isPermissionsModalOpen) {
        setIsPermissionsModalOpen(false);
        return;
      }
      if (isLogoInfoModalOpen) {
        setIsLogoInfoModalOpen(false);
        return;
      }
      if (isSaveAndResetOpen) {
        setIsSaveAndResetOpen(false);
        return;
      }
      if (activeDispatcherCampaign) {
        setActiveDispatcherCampaign(null);
        return;
      }
      if (editingCampaign) {
        setEditingCampaign(null);
        return;
      }
      if (pendingConfirmContact) {
        setPendingConfirmContact(null);
        return;
      }
      if (dueCampaignAlert) {
        setDueCampaignAlert(null);
        return;
      }
      if (ruleViolationModal.isOpen) {
        setRuleViolationModal(prev => ({ ...prev, isOpen: false }));
        return;
      }

      // 2. Navegação entre páginas/telas do aplicativo
      const historyStack = tabHistoryRef.current;
      if (historyStack.length > 1) {
        // Remove a tela atual da pilha interna
        historyStack.pop();
        const previousTab = historyStack[historyStack.length - 1] || 'dashboard';
        setActiveTab(previousTab);
      } else {
        // Já está no painel inicial ('dashboard')
        // Permanece no aplicativo com segurança sem fechar
        setActiveTab('dashboard');
        tabHistoryRef.current = ['dashboard'];
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    activeTab,
    isAiModalOpen,
    isTopicGeneratorOpen,
    isSettingsModalOpen,
    isHelpModalOpen,
    isApkExportModalOpen,
    isPermissionsModalOpen,
    isLogoInfoModalOpen,
    isSaveAndResetOpen,
    activeDispatcherCampaign,
    editingCampaign,
    pendingConfirmContact,
    dueCampaignAlert,
    ruleViolationModal.isOpen,
  ]);

  useEffect(() => {
    // Always start on dashboard / painel principal
    setActiveTab('dashboard');
    tabHistoryRef.current = ['dashboard'];
  }, []);

  const syncGroupsWithContacts = React.useCallback((currentContacts: Contact[]) => {
    setGroups((prevGroups) => {
      const remainingGroupNames = new Set(
        currentContacts.map((c) => (c.group || 'Agenda de Contatos').trim().toLowerCase())
      );
      const updatedGroups = prevGroups.filter((g) => {
        const lower = (g.name as string).trim().toLowerCase();
        const isSystem =
          lower === 'agenda de contatos' ||
          lower === 'geral' ||
          lower === 'sem campanha' ||
          lower === 'agenda de contatos (sem campanha)';
        if (isSystem) return true;
        return remainingGroupNames.has(lower);
      });
      saveGroups(updatedGroups);
      return updatedGroups;
    });
  }, []);

  // Sync state changes to storage
  const updateContactsState = (newContacts: Contact[]) => {
    const sorted = [...newContacts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    setContacts(sorted);
    saveContacts(sorted);
    syncGroupsWithContacts(sorted);
  };

  const updateTemplatesState = (newTemplates: MessageTemplate[]) => {
    setTemplates(newTemplates);
    saveTemplates(newTemplates);
  };

  const sortCampaignsBySchedule = (list: ScheduledCampaign[]) => {
    return [...list].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  };

  const updateCampaignsState = (newCampaigns: ScheduledCampaign[]) => {
    const sorted = sortCampaignsBySchedule(newCampaigns);
    setCampaigns(sorted);
    saveCampaigns(sorted);
  };

  const updateLogsState = (newLogs: DispatchLogItem[]) => {
    // PERFORMANCE OPTIMIZATION: Prune logs if they exceed 1200 items
    // This prevents local storage overflow and keeps calculations (like the 24h counter) extremely fast
    if (newLogs.length > 1200) {
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      // Keep everything from the last 24h (critical for the counter)
      const recentLogs = newLogs.filter(l => l.sentAt && new Date(l.sentAt).getTime() >= twentyFourHoursAgo);
      const olderLogs = newLogs.filter(l => !l.sentAt || new Date(l.sentAt).getTime() < twentyFourHoursAgo);
      
      // Limit older logs to 300 items to preserve some recent history
      const keptOlder = olderLogs.slice(-300);
      const prunedOlder = olderLogs.slice(0, -300);
      
      // Save pruned "enviado" count to historicalSentCount so the dashboard doesn't lose data
      const prunedSentCount = prunedOlder.filter(l => l.status === 'enviado').length;
      const prunedLogs = [...keptOlder, ...recentLogs];
      const keptSentCount = prunedLogs.filter(l => l.status === 'enviado').length;
      const newHist = (settings.historicalSentCount || 0) + prunedSentCount;
      const newTotal = Math.max(settings.totalSentCount || 0, newHist + keptSentCount);

      if (prunedSentCount > 0 || settings.totalSentCount !== newTotal) {
        const updatedSettings = {
          ...settings,
          historicalSentCount: newHist,
          totalSentCount: newTotal,
        };
        setSettings(updatedSettings);
        saveSettings(updatedSettings);
      }
      
      setLogs(prunedLogs);
      saveDispatchLogs(prunedLogs);
      return;
    }

    setLogs(newLogs);
    saveDispatchLogs(newLogs);
  };

  const updateSettingsState = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleSaveAndResetExecute = async (config: {
    saveLogs: boolean;
    saveCampaigns: boolean;
    saveContacts: boolean;
    resetLogs: boolean;
    resetCampaigns: boolean;
    resetContacts: boolean;
    archiveName: string;
    exportType: 'csv' | 'json' | 'pdf' | 'none';
  }) => {
    const logsToSave = config.saveLogs ? logs : [];
    const campsToSave = config.saveCampaigns ? campaigns : [];
    const contactsToSave = config.saveContacts ? contacts : [];

    if (config.saveLogs || config.saveCampaigns || config.saveContacts) {
      const sentCount = logsToSave.filter(l => l.status === 'sent').length;
      const failedCount = logsToSave.filter(l => l.status === 'failed').length;
      const pendingCount = logsToSave.filter(l => l.status === 'pending').length;
      const skippedCount = logsToSave.filter(l => l.status === 'skipped').length;

      const newArchive: ProjectArchive = {
        id: `archive_${Date.now()}`,
        name: config.archiveName,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
        totalSent: sentCount,
        totalFailed: failedCount,
        totalPending: pendingCount,
        totalSkipped: skippedCount,
        totalContacts: contactsToSave.length,
        logsCount: logsToSave.length,
        campaignsCount: campsToSave.length,
        chipStats: {},
        categoryStats: {},
        logs: logsToSave,
        campaigns: campsToSave,
      };
      const updatedArchives = [newArchive, ...projectArchives];
      setProjectArchives(updatedArchives);
      saveProjectArchives(updatedArchives);
    }

    if (config.exportType === 'pdf') {
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>${config.archiveName} - Relatório PDF</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; margin: 20px; font-size: 12px; }
            h1 { font-size: 20px; color: #A88B4B; border-bottom: 2px solid #A88B4B; padding-bottom: 8px; margin-bottom: 15px; }
            h2 { font-size: 14px; color: #333; margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background-color: #f4f4f4; color: #333; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .meta { margin-bottom: 15px; color: #555; }
          </style>
        </head>
        <body>
          <h1>Relatório Oficial: ${config.archiveName}</h1>
          <div class="meta">
            <p><strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Total de Registros de Disparos:</strong> ${logs.length}</p>
            <p><strong>Campanhas Cadastradas:</strong> ${campaigns.length} | <strong>Contatos:</strong> ${contacts.length}</p>
          </div>

          <h2>Histórico de Disparos</h2>
          <table>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Contato</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Data Envio</th>
                <th>Mensagem</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td>${l.campaignTitle}</td>
                  <td>${l.contactName}</td>
                  <td>${l.phone}</td>
                  <td><strong>${l.status}</strong></td>
                  <td>${l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR') : '—'}</td>
                  <td>${l.messageText}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      setReportPreviewHtml(htmlContent);
    } else if (config.exportType === 'csv' && logs.length > 0) {
      const headers = ['Campanha', 'Contato', 'Telefone', 'Status', 'Data Envio', 'Mensagem'];
      const rows = logs.map((l) => [
        `"${l.campaignTitle}"`,
        `"${l.contactName}"`,
        `"${l.phone}"`,
        `"${l.status}"`,
        `"${l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR') : '—'}"`,
        `"${l.messageText.replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8' });
      downloadFileSafely(blob, `backup_disparos_${new Date().toISOString().slice(0, 10)}.csv`);
    } else if (config.exportType === 'json') {
      await handleDownloadBackup({ logs, campaigns, contacts, groups, settings });
    }

    if (config.resetLogs) {
      updateLogsState([]);
    }
    if (config.resetCampaigns) {
      updateCampaignsState([]);
    }
    if (config.resetContacts) {
      updateContactsState([]);
    }

    showToast(`✅ Ação executada com sucesso! Dados salvos e selecionados redefinidos.`);
  };

  const handleCreateProjectArchive = (
    projectName: string,
    startDate: string,
    endDate: string,
    resetData: boolean
  ) => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const logsInRange = logs.filter((l) => {
      const d = l.sentAt ? new Date(l.sentAt) : new Date(l.scheduledAt || Date.now());
      return d >= start && d <= end;
    });

    const campaignsInRange = campaigns.filter((c) => {
      const d = new Date(c.createdAt || c.scheduledAt);
      return d >= start && d <= end;
    });

    const logsToArchive = logsInRange.length > 0 ? logsInRange : logs;
    const campaignsToArchive = campaignsInRange.length > 0 ? campaignsInRange : campaigns;

    let totalSent = 0;
    let totalFailed = 0;
    let totalPending = 0;
    let totalSkipped = 0;
    const contactIdsSet = new Set<string>();
    const chipStats: { [chipName: string]: number } = {};
    const categoryStats: { [categoryName: string]: number } = {};

    logsToArchive.forEach((l) => {
      contactIdsSet.add(l.contactId);
      if (l.status === 'enviado') totalSent++;
      else if (l.status === 'falha') totalFailed++;
      else if (l.status === 'pendente') totalPending++;
      else if (l.status === 'pulado') totalSkipped++;

      const chipName = cleanChipName((l.chipName as string) || l.chipId || 'Business');
      chipStats[chipName] = (chipStats[chipName] || 0) + 1;

      if (l.campaignTitle) {
        categoryStats[l.campaignTitle] = (categoryStats[l.campaignTitle] || 0) + 1;
      }
    });

    const newArchive: ProjectArchive = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: projectName.trim() || `Projeto 15 Dias (${startDate} a ${endDate})`,
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
      totalSent,
      totalFailed,
      totalPending,
      totalSkipped,
      totalContacts: contactIdsSet.size,
      logsCount: logsToArchive.length,
      campaignsCount: campaignsToArchive.length,
      chipStats,
      categoryStats,
      logs: logsToArchive,
      campaigns: campaignsToArchive,
    };

    const updatedArchives = [newArchive, ...projectArchives];
    setProjectArchives(updatedArchives);
    saveProjectArchives(updatedArchives);

    if (resetData) {
      // Clear active logs to start fresh from zero
      const archiveLogIds = new Set(logsToArchive.map((l) => l.id));
      const remainingLogs = logs.filter((l) => !archiveLogIds.has(l.id));
      updateLogsState(remainingLogs);

      // Keep only active/scheduled campaigns, clear completed
      const remainingCampaigns = campaigns.filter((c) => c.status === 'agendado' || c.status === 'em_andamento');
      updateCampaignsState(remainingCampaigns);

      showToast(`📁 Projeto "${newArchive.name}" arquivado! Disparos e histórico zerados para o próximo ciclo.`);
    } else {
      showToast(`📁 Projeto "${newArchive.name}" salvo na pasta de histórico com sucesso!`);
    }
  };

  const handleDeleteProjectArchive = (id: string) => {
    const updated = projectArchives.filter((p) => p.id !== id);
    setProjectArchives(updated);
    saveProjectArchives(updated);
    showToast('🗑️ Pasta de projeto removida do histórico.');
  };

  const autoOpenedCampaignsRef = useRef<Set<string>>(new Set());

  // Background Campaign Scheduler Checker
  useEffect(() => {
    const checkScheduledCampaigns = () => {
      const now = new Date().getTime();

      let campaignToTrigger: ScheduledCampaign | null = null;

      setCampaigns((prevCampaigns) => {
        let changed = false;
        const updated = prevCampaigns.map((camp) => {
          if (camp.status === 'agendado') {
            const scheduledTime = new Date(camp.scheduledAt).getTime();
            const diffMs = scheduledTime - now;

            // Trigger popup only when exact scheduled time is reached or within 3 minutes
            if (scheduledTime <= now + 3 * 60 * 1000 && !autoOpenedCampaignsRef.current.has(camp.id)) {
              if (!campaignToTrigger) {
                campaignToTrigger = camp;
              }
            }

            if (scheduledTime <= now + 3 * 60 * 1000) {
              changed = true;
              return { ...camp, status: 'em_andamento' as const };
            }
          }
          return camp;
        });

        if (!changed) {
          return prevCampaigns;
        }

        saveCampaigns(updated);
        return updated;
      });

      if (campaignToTrigger) {
        const camp = campaignToTrigger as ScheduledCampaign;
        autoOpenedCampaignsRef.current.add(camp.id);
        setActiveDispatcherCampaign(camp);
        setDueCampaignAlert(camp);

        // 1. Browser Web Notification
        sendBrowserNotification(`🚨 HORA DO DISPARO: "${camp.title}"`, {
          body: `Agendamento pronto com ${camp.contactIds.length} contato(s). Clique para abrir o disparador!`,
          tag: `campaign-${camp.id}`,
          requireInteraction: true,
        });

        // 2. Urgent Sound Alert
        if (settings.soundEnabled) {
          playDispatchAlertSound();
        }

        // 3. Vibration Feedback
        triggerVibration([250, 100, 250, 100, 400]);

        // 4. Tab Title Alert
        try {
          const originalTitle = 'GKD Messenger';
          document.title = `🚨 DISPARO PRONTO: ${camp.title}`;
          setTimeout(() => {
            document.title = originalTitle;
          }, 20000);
        } catch (_) {}
      }
    };

    checkScheduledCampaigns();
    const timer = setInterval(checkScheduledCampaigns, 5000); // Check every 5s for optimal performance
    return () => clearInterval(timer);
  }, [settings.soundEnabled]);

  // Handlers for Contacts
  const handleAddSingleContact = React.useCallback((contact: Contact) => {
    const { cleanName, detectedGroup } = processContactName(contact.name);

    const isIgnored = isIgnoredSequenceTag((contact.group as string) || '');
    const isGenericGroup = isIgnored || 
                           !(contact.group as string) || 
                           (contact.group as string) === 'Geral' || 
                           (contact.group as string) === 'Agenda de Contatos' || 
                           (contact.group as string) === 'sem_campanha' ||
                           (contact.group as string).toLowerCase().includes('sem campanha');

    let finalGroup = (detectedGroup && isGenericGroup) ? detectedGroup : (isIgnored ? 'Agenda de Contatos' : ((contact.group as string) || detectedGroup || 'Agenda de Contatos'));
    if (isIgnoredSequenceTag(finalGroup)) {
      finalGroup = 'Agenda de Contatos';
    }

    // Register group in state if new and not generic/ignored
    if (finalGroup && finalGroup !== 'Geral' && finalGroup !== 'Agenda de Contatos' && !isIgnoredSequenceTag(finalGroup)) {
      setGroups((prevGroups) => {
        const existingLower = new Set(prevGroups.map((g) => (g.name as string).toLowerCase()));
        if (!existingLower.has(finalGroup.toLowerCase())) {
          const gLower = finalGroup.toLowerCase();
          const isCg = gLower.includes('corre e ganhe') || gLower.includes('cg');
          const isTx0 = gLower.includes('taxa zero') || gLower.includes('tx0');
          const newGrp: ContactGroup = {
            id: `grp_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: finalGroup,
            color: isCg ? 'bg-emerald-600' : isTx0 ? 'bg-blue-600' : 'bg-[#A88B4B]',
          };
          const mergedGroups = [...prevGroups, newGrp];
          saveGroups(mergedGroups);
          return mergedGroups;
        }
        return prevGroups;
      });
    }

    setContacts((prevContacts) => {
      const enrichedContact = {
        ...contact,
        name: cleanName,
        group: finalGroup,
        notes: (cleanName !== contact.name && !contact.notes?.includes(contact.name)) 
          ? `[Nome original: ${contact.name}] ${contact.notes || ''}`.trim()
          : contact.notes
      };

      const merged = [enrichedContact, ...prevContacts];
      const seenPhones = new Set<string>();
      const uniqueContacts: Contact[] = [];
      for (const c of merged) {
        const cleanPhone = (c.phone || '').replace(/\D/g, '');
        if (cleanPhone) {
          if (!seenPhones.has(cleanPhone)) {
            seenPhones.add(cleanPhone);
            uniqueContacts.push(c);
          }
        } else {
          uniqueContacts.push(c);
        }
      }
      uniqueContacts.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
      saveContacts(uniqueContacts);
      return uniqueContacts;
    });
  }, []);

  const handleAddMultipleContacts = React.useCallback((newContacts: Contact[]) => {
    // 0. Enrich contacts with groups and cleaned names
    const processedContacts = enrichContacts(newContacts);

    // 1. Check if any contacts introduce new group categories
    const newGroupNames = Array.from(new Set(processedContacts.map((c) => (c.group || '').trim()).filter(Boolean)));
    if (newGroupNames.length > 0) {
      setGroups((prevGroups) => {
        const existingLower = new Set(prevGroups.map((g) => (g.name as string).toLowerCase()));
        const toAdd: ContactGroup[] = [];
        newGroupNames.forEach(gName => {
          if (!existingLower.has((gName as string).toLowerCase())) {
            const gLower = (gName as string).toLowerCase();
            const isCg = gLower.includes('corre e ganhe') || gLower.includes('cg');
            const isTx0 = gLower.includes('taxa zero') || gLower.includes('tx0');
            toAdd.push({
              id: `grp_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: (gName as string),
              color: isCg ? 'bg-emerald-600' : isTx0 ? 'bg-blue-600' : 'bg-[#A88B4B]',
            });
          }
        });
        if (toAdd.length > 0) {
          const mergedGroups = [...prevGroups, ...toAdd];
          saveGroups(mergedGroups);
          return mergedGroups;
        }
        return prevGroups;
      });
    }

    // 2. Save and sort contacts
    setContacts((prevContacts) => {
      const merged = [...processedContacts, ...prevContacts];
      const seenPhones = new Set<string>();
      const uniqueContacts: Contact[] = [];
      for (const c of merged) {
        const cleanPhone = (c.phone || '').replace(/\D/g, '');
        if (cleanPhone) {
          if (!seenPhones.has(cleanPhone)) {
            seenPhones.add(cleanPhone);
            uniqueContacts.push(c);
          }
        } else {
          uniqueContacts.push(c);
        }
      }
      uniqueContacts.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
      saveContacts(uniqueContacts);
      return uniqueContacts;
    });
  }, []);

  const handleDeleteContact = React.useCallback((id: string) => {
    setContacts((prev) => {
      const targetId = String(id).trim();
      const updated = prev.filter((c) => String(c.id).trim() !== targetId);
      saveContacts(updated);
      syncGroupsWithContacts(updated);
      return updated;
    });
  }, [syncGroupsWithContacts]);

  const handleDeleteMultipleContacts = React.useCallback((ids: string[]) => {
    const idSet = new Set(ids.map(id => String(id).trim()));
    setContacts((prev) => {
      const updated = prev.filter((c) => !idSet.has(String(c.id).trim()));
      saveContacts(updated);
      syncGroupsWithContacts(updated);
      return updated;
    });
  }, [syncGroupsWithContacts]);

  const handleUpdateContact = React.useCallback((updatedContact: Contact) => {
    setContacts((prev) => {
      const updated = prev.map((c) => (c.id === updatedContact.id ? updatedContact : c));
      saveContacts(updated);
      return updated;
    });
  }, []);

  const handleUpdateMultipleContacts = React.useCallback((updatedContactsList: Contact[]) => {
    setContacts((prev) => {
      const map = new Map(updatedContactsList.map(c => [c.id, c]));
      const updated = prev.map((c) => map.get(c.id) || c);
      saveContacts(updated);
      return updated;
    });
  }, []);

  const handleReplaceAllContacts = React.useCallback((newList: Contact[]) => {
    setContacts(newList);
    saveContacts(newList);
    syncGroupsWithContacts(newList);
  }, [syncGroupsWithContacts]);

  const handleDeleteGroup = React.useCallback((groupId: string) => {
    // Fallback: try finding by ID first, then by name (for legacy groups)
    const groupToDelete = groups.find(g => g.id === groupId) || 
                        groups.find(g => (g.name as string).toLowerCase() === groupId.toLowerCase());
    
    if (!groupToDelete) return;
    
    const lowerTarget = groupToDelete.name.trim().toLowerCase();
    if (lowerTarget === 'agenda de contatos' || lowerTarget === 'geral' || lowerTarget === 'sem campanha') {
      return;
    }

    // 1. Update contacts
    const updatedContacts = contacts.map((c) => {
      if ((c.group || '').trim().toLowerCase() === lowerTarget) {
        return { ...c, group: 'Agenda de Contatos' };
      }
      return c;
    });
    setContacts(updatedContacts);
    saveContacts(updatedContacts);

    // 2. Update groups
    const updatedGroups = groups.filter((g) => g.id !== groupToDelete.id && (g.name as string).toLowerCase() !== lowerTarget);
    if (!updatedGroups.some((g) => (g.name as string).trim().toLowerCase() === 'agenda de contatos')) {
      updatedGroups.unshift({
        id: 'grp_agenda',
        name: 'Agenda de Contatos',
        color: 'bg-emerald-500',
      });
    }
    setGroups(updatedGroups);
    saveGroups(updatedGroups);
    
    showToast(`Categoria "${groupToDelete.name}" removida.`);
  }, [groups, contacts]);

  const handleUpdateGroup = React.useCallback((groupId: string, newName: string, color: string) => {
    const groupToUpdate = groups.find(g => g.id === groupId) ||
                        groups.find(g => (g.name as string).toLowerCase() === groupId.toLowerCase());
                        
    if (!groupToUpdate) return;
    
    const lowerOld = groupToUpdate.name.trim().toLowerCase();

    // 1. Update contacts
    const updatedContacts = contacts.map((c) => {
      if ((c.group || '').trim().toLowerCase() === lowerOld) {
        return { ...c, group: newName.trim() };
      }
      return c;
    });
    setContacts(updatedContacts);
    saveContacts(updatedContacts);

    // 2. Update groups
    const updatedGroups = groups.map((g) => {
      if (g.id === groupToUpdate.id || (g.name as string).toLowerCase() === lowerOld) {
        return { ...g, name: newName.trim(), color };
      }
      return g;
    });
    setGroups(updatedGroups);
    saveGroups(updatedGroups);
    
    showToast(`Categoria atualizada.`);
  }, [groups, contacts]);

  const handleAddGroup = React.useCallback((name: string, color: string) => {
    setGroups((prev) => {
      const exists = prev.some(g => (g.name as string).toLowerCase() === name.toLowerCase());
      if (exists) {
        showToast('Esta categoria já existe.');
        return prev;
      }
      const newGroup: ContactGroup = {
        id: `grp_${Date.now()}`,
        name,
        color
      };
      const updated = [...prev, newGroup];
      saveGroups(updated);
      showToast(`Categoria "${name}" adicionada.`);
      return updated;
    });
  }, []);

  // Handlers for Templates
  const handleAddTemplate = (tmpl: MessageTemplate) => {
    updateTemplatesState([tmpl, ...templates]);
  };

  const handleSaveTopicWithTemplates = (topicName: string, generatedTemplates: Omit<MessageTemplate, 'id' | 'createdAt'>[]) => {
    const newTemplates: MessageTemplate[] = generatedTemplates.map((gt, idx) => ({
      ...gt,
      id: `ai_topic_${Date.now()}_${idx}`,
      createdAt: new Date().toISOString(),
      vehicleType: 'carro'
    }));

    updateTemplatesState([...newTemplates, ...templates]);
    showToast(`Tópico "${topicName}" criado com ${newTemplates.length} mensagens!`);
    navigateToTab('templates');
  };

  const handleUpdateTemplate = (tmpl: MessageTemplate) => {
    updateTemplatesState(templates.map((t) => (t.id === tmpl.id ? tmpl : t)));
  };

  const handleDeleteTemplate = (id: string) => {
    if (!id) return;
    addDeletedTemplateIds([id]);
    updateTemplatesState(templates.filter((t) => t && t.id !== id));
    showToast('🗑️ Mensagem excluída com sucesso!');
  };

  const handleDeleteMultipleTemplates = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    addDeletedTemplateIds(ids);
    const idSet = new Set(ids);
    updateTemplatesState(templates.filter((t) => t && !idSet.has(t.id)));
    showToast(`🗑️ ${ids.length} mensagens excluídas com sucesso!`);
  };

  const handleRenameTopic = (oldTopic: string, newTopic: string) => {
    if (!oldTopic || !newTopic || oldTopic.trim() === newTopic.trim()) return;
    const updated = renameTopicPermanently(oldTopic, newTopic);
    updateTemplatesState(updated);
    showToast(`✏️ Tópico renomeado para "${newTopic.trim()}"!`);
  };

  const handleDeleteTopic = (category: string) => {
    if (!category) return;
    addDeletedTopic(category);
    const lower = (category as string).trim().toLowerCase();
    const toDelete = templates.filter((t) => t && (t.category as string) && (t.category as string).trim().toLowerCase() === lower);
    addDeletedTemplateIds(toDelete.map((t) => t.id));
    updateTemplatesState(templates.filter((t) => t && (!(t.category as string) || (t.category as string).trim().toLowerCase() !== lower)));
    showToast(`🗑️ Tópico "${category}" excluído com sucesso!`);
  };

  const handleDeleteAllTemplates = () => {
    addDeletedTemplateIds(templates.map((t) => t.id));
    updateTemplatesState([]);
    showToast('🗑️ Todas as mensagens foram excluídas.');
  };

  const handleRestoreDefaultTemplates = () => {
    clearDeletedTemplatesAndTopics();
    updateTemplatesState(INITIAL_TEMPLATES);
    showToast('Modelos padrão restaurados com sucesso!');
  };

  const handleSelectAiGeneratedTemplate = (generated: Omit<MessageTemplate, 'id' | 'createdAt'>) => {
    const newTmpl: MessageTemplate = {
      ...generated,
      category: generated.category ? `🤖 ${generated.category}` : '🤖 Modelos de IA',
      id: `custom_tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    updateTemplatesState([newTmpl, ...templates]);
  };

  // Handlers for Campaigns
  const handleScheduleCampaign = (newCamp: ScheduledCampaign | ScheduledCampaign[]) => {
    setCampaigns((prev) => {
      const toAdd = Array.isArray(newCamp) ? newCamp : [newCamp];
      const existingIds = new Set(prev.map((c) => c.id));
      const filteredNew = toAdd.filter((c) => !existingIds.has(c.id));
      const updated = sortCampaignsBySchedule([...filteredNew, ...prev]);
      saveCampaigns(updated);
      return updated;
    });
  };

  const handleDeleteCampaign = (id: string) => {
    autoOpenedCampaignsRef.current.delete(id);
    if (dueCampaignAlert?.id === id) setDueCampaignAlert(null);
    if (activeDispatcherCampaign?.id === id) setActiveDispatcherCampaign(null);
    
    const campaignToDelete = campaigns.find(c => c.id === id);
    if (campaignToDelete) {
      if (campaignToDelete.templateId && campaignToDelete.templateId.startsWith('topic_cat_') && campaignToDelete.categoryName) {
        const catName = campaignToDelete.categoryName;
        const templatesToDelete = templates.filter(t => (t.category as string) === catName).map(t => t.id);
        if (templatesToDelete.length > 0) {
          handleDeleteMultipleTemplates(templatesToDelete);
        }
      } else if (campaignToDelete.templateId) {
        handleDeleteTemplate(campaignToDelete.templateId);
      }
    }

    setCampaigns((prev) => {
      const updated = sortCampaignsBySchedule(prev.filter((c) => c.id !== id));
      saveCampaigns(updated);
      return updated;
    });
  };

  const handleUpdateCampaign = (updatedInput: ScheduledCampaign | ScheduledCampaign[]) => {
    const updatedList = Array.isArray(updatedInput) ? updatedInput : [updatedInput];
    const updatedMap = new Map(updatedList.map((c) => [c.id, c]));

    // Remove from autoOpened ref so background checker triggers when new scheduled time arrives
    updatedList.forEach((c) => {
      autoOpenedCampaignsRef.current.delete(c.id);
    });

    // Update or clear due campaign alert
    if (dueCampaignAlert && updatedMap.has(dueCampaignAlert.id)) {
      const fresh = updatedMap.get(dueCampaignAlert.id)!;
      if (new Date(fresh.scheduledAt).getTime() > Date.now()) {
        setDueCampaignAlert(null);
      } else {
        setDueCampaignAlert(fresh);
      }
    }

    // Update activeDispatcherCampaign if currently open
    if (activeDispatcherCampaign && updatedMap.has(activeDispatcherCampaign.id)) {
      const fresh = updatedMap.get(activeDispatcherCampaign.id)!;
      const scheduledMs = new Date(fresh.scheduledAt).getTime();
      // If time was moved to the future (> 1 min from now), close active dispatcher so it stops old countdown
      if (scheduledMs > Date.now() + 60000) {
        setActiveDispatcherCampaign(null);
      } else {
        setActiveDispatcherCampaign(fresh);
      }
    }

    setCampaigns((prev) => {
      const prevIds = new Set(prev.map(c => c.id));
      const updated = prev.map((c) => updatedMap.get(c.id) || c);
      
      // Add any brand new campaigns that were not in prev
      updatedList.forEach((c) => {
        if (!prevIds.has(c.id)) {
          updated.push(c);
        }
      });
      
      const sorted = sortCampaignsBySchedule(updated);
      saveCampaigns(sorted);
      return sorted;
    });
  };

  const handleNavigateToNewCampaign = (selectedIds: string[]) => {
    // Detect dominant chip and group from selected contacts
    let dominantChipId = 'chip_1';
    let dominantGroup = 'all';
    const selectedContacts = contacts.filter(c => selectedIds.includes(c.id));
    
    if (selectedContacts.length > 0) {
      const chipCounts: Record<string, number> = {};
      const groupCounts: Record<string, number> = {};
      
      selectedContacts.forEach(c => {
        if (c.chipId) {
          chipCounts[c.chipId] = (chipCounts[c.chipId] || 0) + 1;
        }
        const grp = c.group || 'all';
        groupCounts[grp] = (groupCounts[grp] || 0) + 1;
      });
      
      let maxChip = 0;
      Object.entries(chipCounts).forEach(([id, count]) => {
        if (count > maxChip) {
          maxChip = count;
          dominantChipId = id;
        }
      });

      let maxGrp = 0;
      Object.entries(groupCounts).forEach(([grp, count]) => {
        if (count > maxGrp) {
          maxGrp = count;
          dominantGroup = grp;
        }
      });
    }

    localStorage.setItem('zap_campaign_draft_v1', JSON.stringify({
      step: 2,
      selectedContactIds: selectedIds,
      selectedChipId: dominantChipId,
      selectedChipFilter: dominantChipId,
      selectedGroup: dominantGroup,
      title: 'Disparo ' + new Date().toLocaleDateString('pt-BR')
    }));
    navigateToTab('campaigns');
  };

  const handleAdvanceCampaign = (campaignId: string, minutes: number = 60) => {
    const targetCamp = campaigns.find((c) => c.id === campaignId);
    if (!targetCamp) return;

    const now = Date.now();
    const targetTime = new Date(targetCamp.scheduledAt).getTime();
    const newTargetTime = now + minutes * 60 * 1000;
    const shiftMs = newTargetTime - targetTime;

    const updated = campaigns.map((c) => {
      if (c.status === 'agendado' || c.status === 'em_andamento') {
        const cTime = new Date(c.scheduledAt).getTime();
        if (c.id === campaignId) {
          autoOpenedCampaignsRef.current.delete(c.id);
          return {
            ...c,
            scheduledAt: new Date(newTargetTime).toISOString(),
            status: 'agendado' as const,
          };
        } else if (cTime > targetTime) {
          autoOpenedCampaignsRef.current.delete(c.id);
          return {
            ...c,
            scheduledAt: new Date(cTime + shiftMs).toISOString(),
            status: 'agendado' as const,
          };
        }
      }
      return c;
    });

    updateCampaignsState(updated);
    const newTimeStr = new Date(newTargetTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    showToast(`Agendamento reajustado para ${newTimeStr}`);
  };

  const handlePostponeCampaign = (campaignId: string, minutes: number) => {
    autoOpenedCampaignsRef.current.delete(campaignId);
    if (dueCampaignAlert?.id === campaignId) setDueCampaignAlert(null);
    let newTimeStr = '';
    const now = Date.now();
    const newScheduledMs = now + minutes * 60 * 1000;
    const newScheduled = new Date(newScheduledMs).toISOString();
    newTimeStr = new Date(newScheduled).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const updated = campaigns.map((c) => {
      if (c.id === campaignId) {
        return { ...c, scheduledAt: newScheduled, status: 'agendado' as const };
      }
      return c;
    });
    updateCampaignsState(updated);
    setActiveDispatcherCampaign(null);
    if (newTimeStr) {
      showToast(`Campanha adiada para ${newTimeStr}`);
    }
  };

  const handleRescheduleCampaign = (campaignId: string, newScheduledAtIso: string) => {
    autoOpenedCampaignsRef.current.delete(campaignId);
    if (dueCampaignAlert?.id === campaignId) setDueCampaignAlert(null);
    const updated = campaigns.map((c) => {
      if (c.id === campaignId) {
        return { ...c, scheduledAt: newScheduledAtIso, status: 'agendado' as const };
      }
      return c;
    });
    updateCampaignsState(updated);
    setActiveDispatcherCampaign(null);
    const timeStr = new Date(newScheduledAtIso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    showToast(`Campanha reagendada para ${timeStr}`);
  };

  const handlePostponeAllCampaigns = (minutes: number) => {
    const now = Date.now();
    const newScheduledMs = now + minutes * 60 * 1000;
    const newScheduled = new Date(newScheduledMs).toISOString();
    const newTimeStr = new Date(newScheduled).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = campaigns.map((c) => {
      if (c.status === 'agendado' || c.status === 'em_andamento') {
        autoOpenedCampaignsRef.current.delete(c.id);
        return { ...c, scheduledAt: newScheduled, status: 'agendado' as const };
      }
      return c;
    });
    setDueCampaignAlert(null);
    updateCampaignsState(updated);
    setActiveDispatcherCampaign(null);
    if (newTimeStr) {
      showToast(`Campanhas adiadas para ${newTimeStr}`);
    }
  };

  const handleReportWhatsAppBlocked = () => {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const newSettings = {
      ...settings,
      blockedUntil: until,
    };
    updateSettingsState(newSettings);
    setActiveDispatcherCampaign(null);
    const timeStr = new Date(until).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(until).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    showToast(`🚫 Bloqueio do WhatsApp registrado (24 horas). Liberação em ${dateStr} às ${timeStr}.`);
  };

  const handleUnblockWhatsApp = () => {
    const newSettings = { ...settings };
    delete newSettings.blockedUntil;
    updateSettingsState(newSettings);
    showToast('🔓 Bloqueio de 24h removido! O WhatsApp está liberado para envios.');
  };

  const handleCancelCampaign = (campaignId: string) => {
    const updated = campaigns.map((c) => {
      if (c.id === campaignId) {
        return { ...c, status: 'cancelado' as const };
      }
      return c;
    });
    updateCampaignsState(updated);
    setActiveDispatcherCampaign(null);
  };

  const handleCompleteCampaign = (campaignId: string) => {
    setCampaigns((prev) => {
      const updated = prev.map((camp) => {
        if (camp.id === campaignId) {
          const total = camp.contactIds.length;
          return {
            ...camp,
            status: 'concluido' as const,
            progress: {
              sent: camp.progress?.sent || total,
              failed: camp.progress?.failed || 0,
              total,
            },
          };
        }
        return camp;
      });
      saveCampaigns(updated);
      return updated;
    });

    setActiveDispatcherCampaign((prev) => {
      if (prev && prev.id === campaignId) {
        const total = prev.contactIds.length;
        return {
          ...prev,
          status: 'concluido',
          progress: {
            sent: prev.progress?.sent || total,
            failed: prev.progress?.failed || 0,
            total,
          },
        };
      }
      return prev;
    });

    if (dueCampaignAlert?.id === campaignId) {
      setDueCampaignAlert(null);
    }
    autoOpenedCampaignsRef.current.add(campaignId);
  };

  const handleUpdateCampaignProgress = (
    campaignId: string,
    sentDelta: number,
    failedDelta: number,
    logItem?: DispatchLogItem,
    ignoredDelta: number = 0
  ) => {
    setCampaigns((prevCampaigns) => {
      let isCampCompleted = false;
      const updated = prevCampaigns.map((camp) => {
        if (camp.id === campaignId) {
          const newSent = (camp.progress?.sent || 0) + sentDelta;
          const newFailed = (camp.progress?.failed || 0) + failedDelta;
          const newIgnored = ((camp.progress as any)?.ignored || 0) + ignoredDelta;
          const total = camp.contactIds.length;
          const isComplete = total === 0 || (newSent + newFailed + newIgnored >= total);
          if (isComplete) isCampCompleted = true;

          return {
            ...camp,
            status: isComplete ? ('concluido' as const) : ('em_andamento' as const),
            progress: {
              sent: newSent,
              failed: newFailed,
              ignored: newIgnored,
              total,
            },
          };
        }
        return camp;
      });
      saveCampaigns(updated);

      if (isCampCompleted) {
        autoOpenedCampaignsRef.current.add(campaignId);
        if (dueCampaignAlert?.id === campaignId) {
          setDueCampaignAlert(null);
        }
      }

      return updated;
    });

    setActiveDispatcherCampaign((prev) => {
      if (prev && prev.id === campaignId) {
        const newSent = (prev.progress?.sent || 0) + sentDelta;
        const newFailed = (prev.progress?.failed || 0) + failedDelta;
        const newIgnored = ((prev.progress as any)?.ignored || 0) + ignoredDelta;
        const total = prev.contactIds.length;
        const isComplete = total === 0 || (newSent + newFailed + newIgnored >= total);
        return {
          ...prev,
          status: isComplete ? ('concluido' as const) : ('em_andamento' as const),
          progress: { sent: newSent, failed: newFailed, ignored: newIgnored, total },
        };
      }
      return prev;
    });

    if (logItem) {
      if (logItem.status === 'enviado') {
        setSettings((prev) => {
          const currentSent = logs.filter(l => l.status === 'enviado').length + 1;
          const currentTotal = currentSent + (prev.historicalSentCount || 0);
          const newTotal = Math.max((prev.totalSentCount || 0) + 1, currentTotal);
          const updated = { ...prev, totalSentCount: newTotal };
          saveSettings(updated);
          return updated;
        });
      }
      const newLogs = [logItem, ...logs];
      updateLogsState(newLogs);
    }
  };

  // Count active/due campaigns
  const activeCampaignsCount = useMemo(() => {
    return campaigns.filter(
      (c) => c.status === 'agendado' || c.status === 'em_andamento'
    ).length;
  }, [campaigns]);

  const dueCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (c.status === 'agendado' || c.status === 'em_andamento') {
        // Show as due 3 minutes before the scheduled time
        return new Date(c.scheduledAt).getTime() <= Date.now() + 3 * 60 * 1000;
      }
      return false;
    });
  }, [campaigns]);

  const handleReturnToQueue = (campaignId: string, contactId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (campaign && !campaign.contactIds.includes(contactId)) {
      const newContactIds = [...campaign.contactIds, contactId];
      const newStatus = campaign.status === 'concluido' || campaign.status === 'cancelado' 
        ? 'agendado' 
        : campaign.status;
      handleUpdateCampaign({ ...campaign, contactIds: newContactIds, status: newStatus as any });
      showToast('Contato retornado para o agendamento');
    }
  };

  // 24h Chip Limits Global Alert
  const chipsNearOrAtLimit = React.useMemo(() => {
    if (!logs || logs.length === 0) return [];

    // Pre-calculate window to avoid redundant Date objects
    const nowMs = Date.now();
    const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000;
    
    // Group recent logs by chip efficiently
    const chipCounts: Record<string, number> = {};
    for (const l of logs) {
      if (l.status !== 'enviado' || !l.sentAt) continue;
      const sentTime = new Date(l.sentAt).getTime();
      if (isNaN(sentTime) || sentTime < twentyFourHoursAgoMs) continue;
      
      const chipId = l.chipId || 'default';
      chipCounts[chipId] = (chipCounts[chipId] || 0) + 1;
    }

    const limitAlerts: {chipName: string, sentCount: number, limit: number, nextDecreaseTime: Date | null, canSendTime: Date | null}[] = [];
    const chipsList = settings.chips || [];

    Object.entries(chipCounts).forEach(([chipId, count]) => {
      const chipObj = chipsList.find(c => c.id === chipId);
      const limit = chipObj?.dailyLimit || settings.maxMessagesPer24Hours || 50;
      
      // Only trigger detailed calculation if near or over limit
      if (count >= 40 || count >= limit) {
        const chipName = chipObj ? cleanChipName(chipObj.name) : (chipId === 'default' ? 'Business' : cleanChipName(chipId));
        const releaseInfo = calculateChipReleaseTimes(logs, chipId, chipName, limit);
        limitAlerts.push({
          chipName,
          sentCount: count,
          limit,
          nextDecreaseTime: releaseInfo.nextDecreaseTime,
          canSendTime: releaseInfo.canSendTime
        });
      }
    });

    return limitAlerts;
  }, [logs, settings.maxMessagesPer24Hours, settings.chips]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0A0C10] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Due Campaign Top Alert Banner */}
      {dueCampaignAlert && (
        <div className="bg-red-950/95 border-b-2 border-red-500 px-4 py-3 flex flex-wrap items-center justify-between text-xs text-red-100 z-50 shadow-2xl shadow-red-500/50 gap-2 animate-pulse">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-red-900/60 border border-red-500/60 rounded-lg text-red-200">
              <Bell className="w-4 h-4 text-red-400 animate-bounce" />
            </div>
            <span>
              <strong className="text-white uppercase font-black">🚨 ALERTA DE DISPARO ({new Date(dueCampaignAlert.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}):</strong> A campanha <span className="text-white font-black underline">"{dueCampaignAlert.title}"</span> está pronta para disparo!
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setActiveDispatcherCampaign(dueCampaignAlert);
                setDueCampaignAlert(null);
              }}
              className="bg-red-600 hover:bg-red-500 text-white font-black px-3.5 py-1.5 rounded-lg text-xs transition-all uppercase tracking-wider flex items-center space-x-1.5 shadow-md shadow-red-600/40 animate-bounce"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Abrir Disparador</span>
            </button>
            <button
              onClick={() => {
                handlePostponeCampaign(dueCampaignAlert.id, 10);
                setDueCampaignAlert(null);
              }}
              className="bg-black/60 hover:bg-red-900/40 text-red-200 border border-red-500/40 font-semibold px-2.5 py-1.5 rounded-lg text-xs"
            >
              Adiar 10min
            </button>
            <button
              onClick={() => setDueCampaignAlert(null)}
              className="text-red-300 hover:text-white p-1 rounded hover:bg-red-900/50"
              title="Fechar Aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        activeCampaignsCount={activeCampaignsCount}
        dueCampaignsCount={dueCampaigns.length}
        soundEnabled={settings.soundEnabled}
        setSoundEnabled={(val) => updateSettingsState({ ...settings, soundEnabled: val })}
        onOpenNewCampaign={() => navigateToTab('campaigns')}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onOpenApkExport={() => setIsApkExportModalOpen(true)}
        onOpenLogoInfo={() => setIsLogoInfoModalOpen(true)}
        onOpenSaveAndReset={() => setIsSaveAndResetOpen(true)}
        onOpenPermissions={() => setIsPermissionsModalOpen(true)}
        logs={logs}
        settings={settings}
        onOpenActiveDispatcher={() => {
          if (dueCampaigns.length > 0) {
            setActiveDispatcherCampaign(dueCampaigns[0]);
          } else if (campaigns.length > 0) {
            setActiveDispatcherCampaign(campaigns[0]);
          }
        }}
      />

      

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {!isAppReady && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0E11]/80 backdrop-blur-sm rounded-3xl">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Carregando Sistema...</p>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            contacts={contacts}
            templates={templates}
            campaigns={campaigns}
            logs={logs}
            settings={settings}
            isAppReady={isAppReady}
            onNavigate={navigateToTab}
            onOpenNewCampaign={() => navigateToTab('campaigns')}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onLaunchCampaign={(camp) => setActiveDispatcherCampaign(camp)}
            onDeleteCampaign={handleDeleteCampaign}
            onEditCampaign={(camp) => setEditingCampaign(camp)}
            onAdvanceCampaign={handleAdvanceCampaign}
            onUpdateCampaign={(updatedCamp) => {
              const newCampaigns = campaigns.map(c => c.id === updatedCamp.id ? updatedCamp : c);
              setCampaigns(newCampaigns);
              saveCampaigns(newCampaigns);
            }}
            onResetChipLogs={handleResetChipLogs}
            onResetAllChips={handleResetAllChips}
          />
        )}

        {activeTab === 'contacts' && (
          <ContactsView
            contacts={contacts}
            groups={groups}
            logs={logs}
            campaigns={campaigns}
            settings={settings}
            isAppReady={isAppReady}
            projectArchives={projectArchives}
            onAddContact={handleAddSingleContact}
            onAddMultipleContacts={handleAddMultipleContacts}
            onUpdateContact={handleUpdateContact}
            onUpdateMultipleContacts={handleUpdateMultipleContacts}
            onDeleteContact={handleDeleteContact}
            onDeleteMultipleContacts={handleDeleteMultipleContacts}
            onDeleteGroup={handleDeleteGroup}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onReplaceAllContacts={handleReplaceAllContacts}
            defaultCountryCode={settings.defaultCountryCode}
            onSendWhatsAppToContact={handleSendWhatsAppToContact}
            onToggleContactedToday={handleToggleContactedToday}
            onNavigateToNewCampaign={handleNavigateToNewCampaign}
            onScheduleCampaign={handleScheduleCampaign}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesView
            templates={templates}
            contacts={contacts}
            onAddTemplate={handleAddTemplate}
            onUpdateTemplate={handleUpdateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onDeleteTemplates={handleDeleteMultipleTemplates}
            onRenameTopic={handleRenameTopic}
            onDeleteTopic={handleDeleteTopic}
            onDeleteAllTemplates={handleDeleteAllTemplates}
            onRestoreDefaultTemplates={handleRestoreDefaultTemplates}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onOpenTopicGenerator={() => setIsTopicGeneratorOpen(true)}
            onSendWhatsAppToContact={handleSendWhatsAppToContact}
            onNavigate={navigateToTab}
          />
        )}

        {activeTab === 'cards' && (
          <CardsView onNavigate={navigateToTab} />
        )}

        {activeTab === 'voice' && (
          <VoiceSimulatorView
            templates={templates}
            contacts={contacts}
          />
        )}

        {activeTab === 'campaigns' && (
          <NewCampaignView
            contacts={contacts}
            templates={templates}
            groups={groups}
            campaigns={campaigns}
            logs={logs}
            defaultInterval={settings.defaultIntervalSeconds}
            defaultSendMode={settings.sendMode}
            onScheduleCampaign={handleScheduleCampaign}
            onNavigate={navigateToTab}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            logs={logs}
            campaigns={campaigns}
            settings={settings}
            projectArchives={projectArchives}
            contacts={contacts}
            onClearLogs={() => updateLogsState([])}
            onDeleteLog={handleDeleteLog}
            onUpdateLog={handleUpdateLog}
            onDeleteMultipleLogs={handleDeleteMultipleLogs}
            onReturnToQueue={handleReturnToQueue}
            onCreateProjectArchive={handleCreateProjectArchive}
            onDeleteProjectArchive={handleDeleteProjectArchive}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            logs={logs}
            settings={settings}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1F2229] bg-[#0A0C10] py-6 text-center text-xs text-gray-500">
        <p>ZapAgendador • Gerenciador de Disparos e Mensagens WhatsApp Prontas</p>
      </footer>

      {/* Modals */}
      <AiTemplateModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSelectGeneratedTemplate={handleSelectAiGeneratedTemplate}
      />

      <TopicGeneratorModal
        isOpen={isTopicGeneratorOpen}
        onClose={() => setIsTopicGeneratorOpen(false)}
        onSaveTopic={handleSaveTopicWithTemplates}
      />

      <DispatcherModal
        ref={dispatcherRef}
        key={activeDispatcherCampaign?.id || 'dispatcher-modal'}
        isOpen={!!activeDispatcherCampaign}
        onClose={() => setActiveDispatcherCampaign(null)}
        campaign={activeDispatcherCampaign}
        contacts={contacts}
        logs={logs}
        settings={settings}
        onUpdateCampaignProgress={handleUpdateCampaignProgress}
        onCompleteCampaign={handleCompleteCampaign}
        onDeleteLog={handleDeleteLog}
        onMarkContactedToday={(id) => handleToggleContactedToday(id, true)}
        onUpdateContact={handleUpdateContact}
        onDeleteContact={handleDeleteContact}
        onPostponeCampaign={handlePostponeCampaign}
        onPostponeAllCampaigns={handlePostponeAllCampaigns}
        onAdvanceCampaign={handleAdvanceCampaign}
        onCancelCampaign={handleCancelCampaign}
        onRescheduleCampaign={handleRescheduleCampaign}
        onReportBlocked24h={handleReportWhatsAppBlocked}
        onUnblockWhatsApp={handleUnblockWhatsApp}
        onUpdateCampaign={handleUpdateCampaign}
        onEditCampaign={(camp) => {
          setActiveDispatcherCampaign(null);
          setEditingCampaign(camp);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={updateSettingsState}
        onOpenSaveAndReset={() => setIsSaveAndResetOpen(true)}
        onOpenPermissions={() => setIsPermissionsModalOpen(true)}
        onShowTutorial={() => setIsTutorialModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        logs={logs}
        contacts={contacts}
        campaigns={campaigns}
        templates={templates}
        groups={groups}
        onRefreshData={() => {
          setContacts(getContacts());
          setLogs(getDispatchLogs());
          setCampaigns(getCampaigns());
          setTemplates(getTemplates());
          setGroups(getGroups());
        }}
        onReportBlocked24h={handleReportWhatsAppBlocked}
        onUnblockWhatsApp={handleUnblockWhatsApp}
        onResetChipLogs={handleResetChipLogs}
      />

      <WelcomeTutorialModal
        isOpen={isTutorialModalOpen}
        onClose={() => setIsTutorialModalOpen(false)}
        mentorName={settings.mentorName}
        onSaveMentorName={(name) => updateSettingsState({ ...settings, mentorName: name })}
      />

      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        onShowToast={showToast}
      />

      <ApkExportModal
        isOpen={isApkExportModalOpen}
        onClose={() => setIsApkExportModalOpen(false)}
      />

      <LogoInfoModal
        isOpen={isLogoInfoModalOpen}
        onClose={() => setIsLogoInfoModalOpen(false)}
      />

      <RuleViolationModal
        isOpen={ruleViolationModal.isOpen}
        title={ruleViolationModal.title}
        message={ruleViolationModal.message}
        isBlocking={ruleViolationModal.isBlocking}
        onConfirm={ruleViolationModal.onConfirm}
        onCancel={ruleViolationModal.onCancel}
        onClose={() => setRuleViolationModal({ ...ruleViolationModal, isOpen: false })}
      />

      <EditCampaignModal
        key={editingCampaign?.id || 'edit-campaign-modal'}
        isOpen={!!editingCampaign}
        onClose={() => setEditingCampaign(null)}
        campaign={editingCampaign}
        allCampaigns={campaigns}
        contacts={contacts}
        onSaveCampaign={handleUpdateCampaign}
        onDeleteCampaign={handleDeleteCampaign}
        onAdvanceCampaign={handleAdvanceCampaign}
      />




      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        contacts={contacts}
        logs={logs}
        campaigns={campaigns}
        templates={templates}
        groups={groups}
        settings={settings}
        onOpenSaveAndReset={() => {
          setIsHelpModalOpen(false);
          setIsSaveAndResetOpen(true);
        }}
        onRefreshData={() => {
          // This will be triggered after import
          setContacts(getContacts());
          setTemplates(getTemplates());
          setCampaigns(getCampaigns());
          setLogs(getDispatchLogs());
          setGroups(getGroups());
          updateSettingsState(getSettings());
        }}
      />

      {/* Save and Reset Modal */}
      <SaveAndResetModal
        isOpen={isSaveAndResetOpen}
        onClose={() => setIsSaveAndResetOpen(false)}
        logs={logs}
        campaigns={campaigns}
        contacts={contacts}
        onExecute={handleSaveAndResetExecute}
      />

      {/* Global Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in pointer-events-none">
          <div className="bg-[#A88B4B] text-black px-6 py-3 rounded-full shadow-2xl shadow-[#A88B4B]/20 border border-[#A88B4B]/50 font-bold text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {reportPreviewHtml && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-100 h-[100dvh] w-[100vw]">
          <div className="flex-none flex items-center justify-between p-3 md:p-4 bg-gray-900 shadow-lg text-white">
            <h2 className="text-base md:text-lg font-semibold text-gray-100">Visualização do Relatório</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const iframe = document.getElementById('report-preview-iframe') as HTMLIFrameElement;
                  if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.print();
                  }
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-[#A88B4B] hover:bg-[#92783E] text-white rounded-lg text-sm transition-colors"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Baixar / Imprimir PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
              <button
                onClick={() => setReportPreviewHtml(null)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 text-sm transition-colors"
              >
                <X size={16} />
                <span className="hidden sm:inline">Fechar</span>
              </button>
            </div>
          </div>
          <div className="flex-1 w-full relative bg-white overflow-hidden">
            <iframe 
              id="report-preview-iframe"
              srcDoc={reportPreviewHtml} 
              className="absolute inset-0 w-full h-full border-none"
              sandbox="allow-same-origin allow-scripts allow-modals"
            />
          </div>
        </div>
      )}
    </div>
  );
}
