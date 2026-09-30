import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, 
  X, 
  CheckCircle2, 
  Clock, 
  Play, 
  Pause, 
  RefreshCw, 
  XCircle, 
  Edit3, 
  ShieldAlert, 
  Maximize2, 
  Smartphone, 
  ChevronDown,
  Copy,
  Download,
  Share2,
  Check,
  Sparkles,
  Zap,
  Image as ImageIcon,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { replaceTemplateVariables, buildWhatsAppLink, openWhatsAppLink, safeConfirm, cleanChipName, incrementMessageCount } from '../utils/whatsapp';
import { playSuccessChime } from '../utils/audio';
import { toDatetimeLocal } from '../utils/dateParser';
import { getTodayDateString } from '../utils/storage';
import { copyImageDataUrlToClipboard, shareImageFile, downloadImageFile, isWebShareFileSupported } from '../utils/imageSharing';
import { RealTimeCounter } from './RealTimeCounter';

export const DispatcherModal = React.forwardRef((props: any, ref) => {
  const {
    isOpen,
    onClose,
    campaign,
    contacts,
    settings,
    logs,
    onUpdateCampaignProgress,
    onDeleteContact,
    onEditCampaign,
    onPostponeCampaign,
    onRescheduleCampaign
  } = props;

  const [showAdiarOptions, setShowAdiarOptions] = useState(false);
  const [pendingConfirmState, setPendingConfirmState] = useState<any>(null);
  const [copiedCardStatus, setCopiedCardStatus] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<boolean>(false);
  const [shareStatus, setShareStatus] = useState<string>('');
  const [nonEvidenceChipConfirm, setNonEvidenceChipConfirm] = useState<{
    chipId: string;
    chipName: string;
    activeChipName: string;
    isSuporte: boolean;
  } | null>(null);

  // All available chips list with clean names (Business, Suporte, etc.)
  const allChips = useMemo(() => {
    const rawChips = (settings?.chips && settings.chips.length > 0) ? settings.chips : [
      { id: 'chip_1', name: 'Business', active: true },
      { id: 'chip_2', name: 'Suporte', active: false }
    ];
    return rawChips.map((c: any) => ({
      ...c,
      cleanName: cleanChipName(c.name)
    }));
  }, [settings?.chips]);

  // Determine default target chip for this campaign/contact
  const defaultTargetChipId = useMemo(() => {
    if (campaign?.chipId && allChips.some((c: any) => c.id === campaign.chipId)) {
      return campaign.chipId;
    }
    if (campaign?.title) {
      const campTitle = campaign.title.toLowerCase();
      const matched = allChips.find((c: any) => 
        campTitle.includes(c.cleanName.toLowerCase()) || 
        (c.cleanName.toLowerCase().includes('suporte') && (campTitle.includes('sup') || campTitle.includes('support'))) || 
        (c.cleanName.toLowerCase().includes('business') && (campTitle.includes('bus') || campTitle.includes('biz')))
      );
      if (matched) return matched.id;
    }
    if (settings?.activeChipId && allChips.some((c: any) => c.id === settings.activeChipId)) {
      return settings.activeChipId;
    }
    return allChips[0]?.id || 'chip_1';
  }, [campaign, allChips, settings?.activeChipId]);

  const [selectedChipId, setSelectedChipId] = useState(defaultTargetChipId);

  useEffect(() => {
    setSelectedChipId(defaultTargetChipId);
  }, [defaultTargetChipId]);

  const [sessionCounts, setSessionCounts] = useState({ business: 0, suporte: 0 });
  const [baseDailyCounts, setBaseDailyCounts] = useState({ business: 0, suporte: 0 });

  const currentDailyCounts = useMemo(() => {
    if (!logs) return { business: 0, suporte: 0 };
    const todayString = getTodayDateString();
    const todayLogs = logs.filter((log: any) => 
      log.status === 'enviado' && 
      log.sentAt && typeof log.sentAt === 'string' && log.sentAt.startsWith(todayString)
    );

    return {
      business: todayLogs.filter((l: any) => {
        const name = (l.chipName || '').toLowerCase();
        return name.includes('business') || (!name.includes('suporte') && !name.includes('support'));
      }).length,
      suporte: todayLogs.filter((l: any) => {
        const name = (l.chipName || '').toLowerCase();
        return name.includes('suporte') || name.includes('support');
      }).length
    };
  }, [logs]);

  useEffect(() => {
    if (isOpen) {
      setSessionCounts({ business: 0, suporte: 0 });
      setBaseDailyCounts(currentDailyCounts);
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOpenReschedule = () => {
    setShowAdiarOptions(false);
    if (onEditCampaign && campaign) {
      onEditCampaign(campaign);
    }
  };

  const handlePostponeMinutes = (mins: number) => {
    setShowAdiarOptions(false);
    if (onPostponeCampaign && campaign) {
      onPostponeCampaign(campaign.id, mins);
    }
  };

  const handlePostponeTomorrowMorning = () => {
    setShowAdiarOptions(false);
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0);
    const diffMins = Math.max(15, Math.round((tomorrow.getTime() - now.getTime()) / (60 * 1000)));
    if (onPostponeCampaign && campaign) {
      onPostponeCampaign(campaign.id, diffMins);
    }
  };

  const getChipSentCount = (chipId: string, chipCleanName?: string) => {
    if (!logs) return 0;
    
    // Use 24h rolling window for consistency
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const cleanTargetName = (chipCleanName || '').toLowerCase();
    
    return logs.filter((l: any) => {
      if (l.status !== 'enviado' || !l.sentAt) return false;
      const sentDate = new Date(l.sentAt).getTime();
      if (sentDate < twentyFourHoursAgo) return false;
      if (l.chipId === chipId) return true;
      if (cleanTargetName && l.chipName && cleanChipName(l.chipName).toLowerCase() === cleanTargetName) return true;
      return false;
    }).length;
  };

  useEffect(() => { setShowAdiarOptions(false); }, [pendingConfirmState]);

  // Derived state
  const campaignContacts = useMemo(() => {
    if (!campaign || !contacts) return [];
    // Maintain the order of contactIds as specified in the campaign, do NOT filter Boolean yet
    return campaign.contactIds.map((id: string) => contacts.find((c: any) => c.id === id) || null);
  }, [campaign, contacts]);

  if (!isOpen || !campaign) return null;

  // Calculate current index based on campaign progress
  const enviadasCount = campaign.progress?.sent || 0;
  const failedCount = campaign.progress?.failed || 0;
  const ignoredCount = campaign.progress?.ignored || 0;
  const currentIndex = enviadasCount + failedCount + ignoredCount;
  
  const total = campaign.progress?.total || campaign.contactIds?.length || campaign.progress?.sent || 0;
  const currentContact = campaignContacts[currentIndex];
  const isFinished = currentIndex >= total;

  const getMessageTemplate = () => {
    if (!campaign) return '';
    if (campaign.randomTopicTemplates && campaign.randomTopicTemplates.length > 0) {
      const vIndex = currentIndex % campaign.randomTopicTemplates.length;
      return campaign.randomTopicTemplates[vIndex];
    }
    return campaign.templateContent || campaign.message || '';
  };

  const activeCardImageUrl = (campaign.cardImageUrls && campaign.cardImageUrls.length > 0)
    ? campaign.cardImageUrls[currentIndex % campaign.cardImageUrls.length]
    : campaign.cardImageUrl;

  const currentMessageText = currentContact ? replaceTemplateVariables(getMessageTemplate(), currentContact) : '';
  
  // Chip that was actively used or targeted
  const activeUsedChipId = pendingConfirmState?.chipId || (currentContact?.chipId && allChips.some((c: any) => c.id === currentContact.chipId) ? currentContact.chipId : selectedChipId);
  const targetChip = allChips.find((c: any) => c.id === activeUsedChipId) || allChips[0] || { id: 'chip1', name: 'Business' };
  const cleanedTargetName = cleanChipName(targetChip.name);
  const otherChips = allChips.filter((c: any) => c.id !== targetChip.id);

  const handleCopyCard = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeCardImageUrl) return;
    
    const success = await copyImageDataUrlToClipboard(activeCardImageUrl);
    if (success) {
      setCopiedCardStatus(true);
      setTimeout(() => setCopiedCardStatus(false), 3500);
    } else {
      // Fallback: download if copy not permitted
      downloadImageFile(activeCardImageUrl, `${campaign.cardTitle || 'card'}.png`);
      setDownloadStatus(true);
      setTimeout(() => setDownloadStatus(false), 3500);
    }
  };

  const handleShareCard = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeCardImageUrl) return;
    
    setShareStatus('Compartilhando...');
    const ok = await shareImageFile(campaign.cardTitle || 'Card de Envio', activeCardImageUrl, currentMessageText);
    if (ok) {
      setShareStatus('Enviado via WhatsApp!');
    } else {
      // If Web Share dismissed or failed, fallback to copy/open
      handleCopyCard();
      setShareStatus('');
    }
    setTimeout(() => setShareStatus(''), 3000);
  };

  const handleDownloadCard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeCardImageUrl) return;
    
    downloadImageFile(activeCardImageUrl, `${(campaign.cardTitle || 'card').replace(/[^a-zA-Z0-9]/g, '_')}.png`);
    setDownloadStatus(true);
    setTimeout(() => setDownloadStatus(false), 3000);
  };

  const handleSend = async () => {
    if (!currentContact) return;
    
    // Strict block if limit is reached
    const chipToUse = settings.chips?.find(c => c.id === currentContact.chipId) || settings.chips?.[0] || { id: 'chip_1', name: 'Business' };
    const limit = chipToUse.dailyLimit || settings.maxMessagesPer24Hours || 50;
    const currentSentCount = getChipSentCount(chipToUse.id, chipToUse.name);
    
    if (currentSentCount >= limit) {
      alert(`🛑 ENVIO BLOQUEADO: O chip "${cleanChipName(chipToUse.name)}" atingiu o limite de ${limit}/${limit} mensagens nas últimas 24h.\n\nAguarde a liberação de novas vagas (baseado no horário dos seus envios de ontem) para continuar.`);
      return;
    }

    if (activeCardImageUrl) {
      const copied = await copyImageDataUrlToClipboard(activeCardImageUrl);
      if (!copied) {
        // Fallback for Android WebView / APK where clipboard image write is restricted by security permissions:
        // Download image directly to device gallery so user can select it via WhatsApp 📎 attachment button
        downloadImageFile(activeCardImageUrl, `${(campaign.cardTitle || 'card_whatsapp').replace(/[^a-zA-Z0-9]/g, '_')}.png`);
        setDownloadStatus(true);
        setTimeout(() => setDownloadStatus(false), 5000);
      } else {
        setCopiedCardStatus(true);
        setTimeout(() => setCopiedCardStatus(false), 3500);
      }
    }

    const link = buildWhatsAppLink(currentContact.phone, currentMessageText, settings?.sendMode || 'api');
    window.open(link, '_blank');
    
    setPendingConfirmState({
      contact: currentContact,
      messageText: currentMessageText,
      chipId: targetChip.id,
      chipName: targetChip.name
    });
  };

  const handleReopenWhatsApp = () => {
    if (!pendingConfirmState) return;
    const link = buildWhatsAppLink(
      pendingConfirmState.contact.phone,
      pendingConfirmState.messageText,
      settings?.sendMode || 'api'
    );
    window.open(link, '_blank');
  };

  const confirmSent = (isSuccess: boolean, chipOverrideId?: string, chipOverrideName?: string) => {
    const contactToUse = pendingConfirmState ? pendingConfirmState.contact : currentContact;
    const messageToUse = pendingConfirmState ? pendingConfirmState.messageText : currentMessageText;
    const cChipId = chipOverrideId || (pendingConfirmState ? pendingConfirmState.chipId : targetChip.id);
    const cChipName = chipOverrideName || (pendingConfirmState ? pendingConfirmState.chipName : targetChip.name);

    if (!contactToUse) return;

    const logItem = {
      id: crypto.randomUUID(),
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      contactId: contactToUse.id,
      contactName: contactToUse.name,
      phone: contactToUse.phone,
      messageText: messageToUse,
      scheduledAt: toDatetimeLocal(new Date().toISOString()),
      sentAt: isSuccess ? toDatetimeLocal(new Date().toISOString()) : null,
      status: isSuccess ? 'enviado' : 'falha',
      notes: isSuccess ? '' : 'Marcado como falha',
      chipId: cChipId,
      chipName: cChipName
    };

    if (onUpdateCampaignProgress) {
      onUpdateCampaignProgress(campaign.id, isSuccess ? 1 : 0, isSuccess ? 0 : 1, logItem);
    }

    if (isSuccess) {
      incrementMessageCount(contactToUse.id);
      setSessionCounts(prev => {
        const isSuporte = (cChipName || '').toLowerCase().includes('suporte') || (cChipName || '').toLowerCase().includes('support');
        if (isSuporte) return { ...prev, suporte: prev.suporte + 1 };
        return { ...prev, business: prev.business + 1 };
      });
      playSuccessChime();
    }

    setPendingConfirmState(null);
  };

  const handleAlreadySent = () => {
    const contactToUse = pendingConfirmState ? pendingConfirmState.contact : currentContact;
    const messageToUse = pendingConfirmState ? pendingConfirmState.messageText : currentMessageText;
    const cChipId = pendingConfirmState ? pendingConfirmState.chipId : targetChip.id;
    const cChipName = pendingConfirmState ? pendingConfirmState.chipName : targetChip.name;

    if (!contactToUse) return;
    
    let wasDeleted = false;
    if (confirm(`O contato "${contactToUse.name}" será marcado como Já Enviado.\n\nDeseja remover este contato da sua lista (não tem WhatsApp)?`)) {
      if (onDeleteContact) {
        onDeleteContact(contactToUse.id);
        wasDeleted = true;
      }
    }

    const logItem = {
      id: crypto.randomUUID(),
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      contactId: contactToUse.id,
      contactName: contactToUse.name,
      phone: contactToUse.phone,
      messageText: messageToUse,
      scheduledAt: toDatetimeLocal(new Date().toISOString()),
      sentAt: toDatetimeLocal(new Date().toISOString()),
      status: 'pulado',
      notes: 'Marcado como já enviado',
      chipId: cChipId,
      chipName: cChipName
    };

    if (onUpdateCampaignProgress) {
      onUpdateCampaignProgress(campaign.id, 0, 0, logItem, 1);
    }

    setPendingConfirmState(null);
  };

  const handleSkip = () => {
    const contactToUse = currentContact;
    if (!contactToUse) {
      // If contact was deleted from the global list, just skip it gracefully
      if (onUpdateCampaignProgress) {
        onUpdateCampaignProgress(campaign.id, 0, 0, null, 1);
      }
      return;
    }

    const logItem = {
      id: crypto.randomUUID(),
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      contactId: contactToUse.id,
      contactName: contactToUse.name,
      phone: contactToUse.phone,
      messageText: currentMessageText,
      scheduledAt: toDatetimeLocal(new Date().toISOString()),
      sentAt: toDatetimeLocal(new Date().toISOString()),
      status: 'pulado',
      notes: 'Marcado como Já Enviado',
      chipId: targetChip.id,
      chipName: targetChip.name
    };
    
    if (onUpdateCampaignProgress) {
      onUpdateCampaignProgress(campaign.id, 0, 0, logItem, 1); 
    }
    setPendingConfirmState(null);
  };

  const handleSkipWithCustomAction = (actionName: string, deleteContact: boolean) => {
    const contactToUse = pendingConfirmState ? pendingConfirmState.contact : currentContact;
    if (!contactToUse) return;

    const logItem = {
      id: crypto.randomUUID(),
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      contactId: contactToUse.id,
      contactName: contactToUse.name,
      phone: contactToUse.phone,
      messageText: pendingConfirmState ? pendingConfirmState.messageText : currentMessageText,
      scheduledAt: toDatetimeLocal(new Date().toISOString()),
      sentAt: toDatetimeLocal(new Date().toISOString()),
      status: 'pulado' as const,
      notes: `Ação: ${actionName}`,
      chipId: pendingConfirmState ? pendingConfirmState.chipId : targetChip.id,
      chipName: pendingConfirmState ? pendingConfirmState.chipName : targetChip.name
    };

    if (onUpdateCampaignProgress) {
      onUpdateCampaignProgress(campaign.id, 0, 0, logItem, 1);
    }

    if (deleteContact && onDeleteContact) {
      onDeleteContact(contactToUse.id);
    }

    setPendingConfirmState(null);
    setShowAdiarOptions(false);
  };

  const processados = currentIndex + (pendingConfirmState ? 0 : 1);
  const progressPercent = total > 0 ? Math.round((currentIndex / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#000000]/95 flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto no-scrollbar">
      <div className="w-full max-w-[420px] max-h-[96dvh] sm:max-h-[90vh] bg-[#0E0E10] border border-[#262629] rounded-xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header - Always Sticky at the top */}
        <div className="sticky top-0 z-30 bg-[#0E0E10] border-b border-[#262629] p-3 sm:p-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex gap-2.5 items-center min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-[#A88B4B]/40 flex items-center justify-center shrink-0 bg-[#161619]">
               <Send className="w-5 h-5 text-[#A88B4B] transform -rotate-12" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] sm:text-[17px] font-serif italic text-white font-semibold leading-tight truncate">{campaign.title || "CG 5/50 SUP"}</h2>
                {/* Chip Badge Indicator */}
                {(() => {
                  const rawName = campaign.chipName || (targetChip.name);
                  const displayChipName = cleanChipName(rawName);
                  const isSuporte = displayChipName.toLowerCase().includes('suporte') || displayChipName.toLowerCase().includes('support');
                  return (
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter border shrink-0 ${
                      isSuporte 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {displayChipName}
                    </span>
                  );
                })()}
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">{campaign.categoryName || 'Acompanhamento e envio de WhatsApp'}</p>
            </div>
          </div>
          
          <div className="relative shrink-0 flex items-center gap-1">
            <div className="hidden sm:block mr-1">
              <RealTimeCounter logs={logs} settings={settings} compact />
            </div>

            <button 
              onClick={handleOpenReschedule}
              className="flex items-center gap-1.5 bg-[#221A0F] hover:bg-[#332716] text-[#A88B4B] hover:text-[#D4AF37] border border-[#A88B4B]/50 hover:border-[#A88B4B] px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
              title="Abrir página para Reagendar Disparos"
            >
              <Clock className="w-4 h-4 text-[#A88B4B]" />
              <span className="text-[12px] font-bold">ADIAR</span>
            </button>

            <button 
              onClick={() => setShowAdiarOptions(!showAdiarOptions)}
              className="bg-[#221A0F] hover:bg-[#332716] text-[#A88B4B] hover:text-[#D4AF37] border border-[#A88B4B]/50 hover:border-[#A88B4B] p-2 rounded-lg text-xs font-bold transition-all active:scale-95"
              title="Mais opções de adiamento"
            >
              <ChevronDown className="w-3.5 h-3.5 text-[#A88B4B]" />
            </button>

            {showAdiarOptions && (
              <div 
                className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
                onClick={() => setShowAdiarOptions(false)}
              >
                <div 
                  className="w-full max-w-[320px] bg-[#161619] border-2 border-[#A88B4B]/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-1.5 max-h-[85vh] overflow-y-auto no-scrollbar animate-scale-up"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#262629]">
                    <span className="text-xs font-black uppercase text-[#A88B4B] tracking-[0.1em]">
                      Opções e Adiamentos
                    </span>
                    <button 
                      onClick={() => setShowAdiarOptions(false)}
                      className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Options list inside the overlay */}
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    <button
                      onClick={handleOpenReschedule}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-[#A88B4B] bg-[#221A0F] hover:bg-[#332716] border border-[#A88B4B]/30 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-[#A88B4B]" /> 📅 Reagendar Disparos
                    </button>

                    <div className="my-1 border-t border-[#262629]/60" />

                    <button
                      onClick={() => handlePostponeMinutes(45)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-extrabold text-amber-300 hover:bg-[#221A0F] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-amber-400" /> Adiar +45 Minutos
                    </button>
                    <button
                      onClick={() => handlePostponeMinutes(60)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-extrabold text-amber-300 hover:bg-[#221A0F] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-amber-400" /> Adiar +1 Hora
                    </button>

                    <div className="my-1 border-t border-[#262629]/60" />

                    <div className="px-3 py-1 text-[10px] font-black uppercase text-[#A88B4B] tracking-[0.1em]">
                      Ações do Contato
                    </div>

                    <button
                      onClick={() => {
                        setShowAdiarOptions(false);
                        handleSkip();
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-extrabold text-gray-200 hover:bg-[#262629] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-gray-400" /> Já enviei
                    </button>

                    <button
                      onClick={() => handleSkipWithCustomAction('Sem WhatsApp', true)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-extrabold text-red-400 hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-red-500" /> Sem WhatsApp (Excluir)
                    </button>

                    <button
                      onClick={() => handleSkipWithCustomAction('Já correu', true)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-extrabold text-red-400 hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-red-500" /> Já correu (Excluir)
                    </button>

                    <button
                      onClick={() => handleSkipWithCustomAction('Sem Carro', true)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-extrabold text-red-400 hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-red-500" /> Sem Carro (Excluir)
                    </button>

                    <button
                      onClick={() => handleSkipWithCustomAction('Já estou em contato', false)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-extrabold text-amber-300 hover:bg-amber-950/25 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-amber-500" /> Já estou ctto (Pular)
                    </button>

                    <button
                      onClick={() => handleSkipWithCustomAction('Carro manutenção', false)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-extrabold text-amber-300 hover:bg-amber-950/25 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-amber-500" /> Carro manutenção (Pular)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 overscroll-contain no-scrollbar">
          {/* Card Anexado Section */}
          {(campaign.cardId || campaign.cardTitle || activeCardImageUrl) && (
            <div className="p-3.5 border-b border-[#262629] bg-[#121316] flex flex-wrap items-center justify-between gap-2">
               <div className="flex items-center gap-2.5 min-w-0">
                 <div className="w-9 h-7 rounded border border-[#A88B4B]/50 flex items-center justify-center shrink-0 bg-black/40 overflow-hidden shadow-inner">
                   {activeCardImageUrl ? (
                     <img 
                       src={activeCardImageUrl} 
                       alt="Card" 
                       className="w-full h-full object-cover" 
                       referrerPolicy="no-referrer"
                     />
                   ) : (
                     <ImageIcon className="w-4 h-4 text-[#A88B4B]" />
                   )}
                 </div>
                 <div className="min-w-0">
                   <div className="text-[#A88B4B] text-[11px] font-bold truncate">
                     {campaign.cardTitle || 'Card de Agendamento'}
                   </div>
                   <span className="text-[10px] text-gray-400">Foto anexada</span>
                 </div>
               </div>

               <div className="flex items-center gap-1.5 shrink-0">
                 <button
                   type="button"
                   onClick={handleCopyCard}
                   className={`p-1.5 ${copiedCardStatus ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300' : 'bg-[#1C1F26] hover:bg-[#282D37] border-[#333842] text-gray-300 hover:text-white'} border rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer`}
                   title="Copiar foto para área de transferência"
                 >
                   {copiedCardStatus ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                   <span>{copiedCardStatus ? 'Copiada!' : 'Copiar'}</span>
                 </button>

                 <button
                   type="button"
                   onClick={handleShareCard}
                   className={`p-1.5 ${shareStatus ? 'bg-blue-950/80 border-blue-500/80 text-blue-300' : 'bg-[#1C1F26] hover:bg-[#282D37] border-[#333842] text-gray-300 hover:text-white'} border rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer`}
                   title="Compartilhar imagem + texto via WhatsApp Nativo (Android / APK)"
                 >
                   <Share2 className="w-3.5 h-3.5 text-blue-400" />
                   <span>{shareStatus || 'Compartilhar'}</span>
                 </button>

                 <button
                   type="button"
                   onClick={handleDownloadCard}
                   className={`p-1.5 ${downloadStatus ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300' : 'bg-[#1C1F26] hover:bg-[#282D37] border-[#333842] text-gray-300 hover:text-white'} border rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer`}
                   title="Baixar foto no celular/PC"
                 >
                   {downloadStatus ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
                   <span>{downloadStatus ? 'Baixada!' : 'Baixar Foto'}</span>
                 </button>
               </div>
            </div>
          )}

        {isFinished ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <h3 className="text-xl font-bold text-white">Todos processados!</h3>
            <p className="text-gray-400 text-sm">A campanha foi finalizada.</p>
            <button onClick={onClose} className="mt-4 bg-[#161619] hover:bg-[#1A1A1E] border border-[#262629] text-white px-8 py-2.5 rounded-lg font-bold transition-colors">
              FECHAR
            </button>
          </div>
        ) : !currentContact ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 text-center">
             <ShieldAlert className="w-12 h-12 text-yellow-500" />
             <p className="text-gray-300 text-sm">Este contato não foi encontrado na base (provavelmente foi excluído).</p>
             <button onClick={handleSkip} className="mt-4 bg-[#161619] hover:bg-[#1A1A1E] border border-[#262629] text-white px-8 py-2.5 rounded-lg font-bold transition-colors">
               JÁ ENVIEI
             </button>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-4">
            {!pendingConfirmState ? (
              <div className="flex flex-col gap-3">
                {/* Destinatário Info Card */}
                <div className="bg-[#121316] border border-[#262629] px-4 py-2.5 rounded-xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] text-gray-400 block uppercase font-black tracking-widest">Destinatário</span>
                    <h4 className="text-emerald-400 text-xs font-extrabold truncate">{currentContact?.name || 'Sem Nome'}</h4>
                  </div>
                  <span className="text-[10px] text-gray-300 bg-[#0E0E10] px-2 py-0.5 rounded border border-[#262629] font-bold font-mono">
                    {currentContact?.phone ? (currentContact.phone.startsWith('55') ? currentContact.phone : `55${currentContact.phone}`) : 'Sem Telefone'}
                  </span>
                </div>

                <div className="bg-[#161619] border border-[#262629] p-4 rounded-xl space-y-2">
                  {campaign.randomTopicTemplates && campaign.randomTopicTemplates.length > 0 && (
                    <div className="flex items-center justify-between pb-2 border-b border-[#262629]">
                      <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Variação {(currentIndex % campaign.randomTopicTemplates.length) + 1} de {campaign.randomTopicTemplates.length}</span>
                      </span>
                      <span className="text-[9px] text-gray-400 bg-[#0E0E10] px-1.5 py-0.5 rounded border border-[#262629]">
                        Alternada Anti-Spam
                      </span>
                    </div>
                  )}
                  <p className="text-gray-300 text-[13px] whitespace-pre-wrap">{currentMessageText}</p>
                </div>
                


                <button 
                  onClick={handleSend} 
                  disabled={getChipSentCount(targetChip.id, targetChip.name) >= (settings.chips?.find(c => c.id === targetChip.id)?.dailyLimit || settings.maxMessagesPer24Hours || 50)}
                  className={`w-full ${
                    getChipSentCount(targetChip.id, targetChip.name) >= (settings.chips?.find(c => c.id === targetChip.id)?.dailyLimit || settings.maxMessagesPer24Hours || 50)
                      ? 'bg-gray-700 cursor-not-allowed opacity-50 shadow-none'
                      : targetChip.name.toLowerCase().includes('suporte') || targetChip.name.toLowerCase().includes('support')
                        ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-950/40'
                        : 'bg-[#059669] hover:bg-emerald-500 shadow-emerald-950/40'
                  } text-white font-bold py-3.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors uppercase tracking-widest shadow-lg active:scale-[0.99]`}
                >
                  <div className="flex items-center gap-2 text-[11px]">
                    <Send className="w-4 h-4" /> Enviar Mensagem
                  </div>
                  <div className="text-[9px] font-black opacity-80 flex items-center gap-1">
                    <Smartphone className="w-2.5 h-2.5" /> {cleanedTargetName}
                  </div>
                </button>
                <div className="flex gap-2">
                  <button onClick={handleSkip} className="flex-1 bg-[#161619] hover:bg-[#1F1F22] border border-[#262629] text-gray-300 hover:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-[11px] cursor-pointer">
                    Já enviei
                  </button>
                  <button onClick={onClose} className="flex-1 bg-[#181A20] hover:bg-[#232730] border border-[#333842] hover:border-gray-500 text-gray-300 hover:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-[11px] cursor-pointer">
                    <X className="w-4 h-4 text-red-400" /> Fechar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Clear Confirmation Card */}
                <div className="bg-[#101216] border border-[#262933] rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
                  <div className="text-center pb-1">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">
                      A mensagem foi enviada?
                    </span>
                  </div>

                  {/* CONFIRMATION BUTTONS ORDERED BY SCHEDULED CHIP */}
                  {(() => {
                    const busChip = allChips.find(c => c.cleanName?.toLowerCase().includes('business') || (!c.cleanName?.toLowerCase().includes('suporte') && !c.cleanName?.toLowerCase().includes('support'))) || allChips[0];
                    const supChip = allChips.find(c => c.cleanName?.toLowerCase().includes('suporte') || c.cleanName?.toLowerCase().includes('support'));
                    
                    const currentChip = allChips.find(c => c.id === selectedChipId);
                    const isSuporteActive = currentChip?.cleanName?.toLowerCase().includes('suporte') || currentChip?.cleanName?.toLowerCase().includes('support');

                    const busDisplayName = cleanChipName(busChip?.name || 'Business');
                    const supDisplayName = cleanChipName(supChip?.name || 'Suporte');
                    
                    const businessButton = (
                      <button
                        key="business"
                        type="button"
                        onClick={() => {
                          if (isSuporteActive) {
                            // Business NÃO está em evidência! Abrir pop-up de confirmação
                            setNonEvidenceChipConfirm({
                              chipId: busChip?.id || selectedChipId,
                              chipName: busDisplayName,
                              activeChipName: supDisplayName,
                              isSuporte: false
                            });
                          } else {
                            confirmSent(true, busChip?.id || selectedChipId, 'Business');
                          }
                        }}
                        className={`group w-full rounded-2xl flex flex-col transition-all cursor-pointer overflow-hidden border-2 active:scale-[0.98] ${
                          !isSuporteActive 
                            ? "bg-gradient-to-br from-[#059669] to-[#10B981] text-white border-emerald-400/50 shadow-xl shadow-emerald-950/80 scale-100 opacity-100" 
                            : "bg-[#161619] text-gray-500 border-[#262629] scale-[0.97] opacity-40 hover:opacity-60 grayscale-[0.4]"
                        }`}
                      >
                        <div className="w-full px-5 pt-4 pb-3 flex flex-col items-start">
                          <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${!isSuporteActive ? "text-emerald-100/60" : "text-gray-600"}`}>
                            {busDisplayName}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!isSuporteActive ? "bg-white/20" : "bg-gray-800"}`}>
                              <CheckCircle2 className={`w-6 h-6 ${!isSuporteActive ? "text-white" : "text-gray-600"}`} />
                            </div>
                            <div className="text-left">
                              <p className={`font-black text-lg uppercase tracking-tight leading-tight ${!isSuporteActive ? "text-white" : "text-gray-500"}`}>Sim, Enviado!</p>
                              <p className={`text-[10px] font-bold opacity-80 uppercase tracking-widest ${!isSuporteActive ? "text-emerald-100" : "text-gray-600"}`}>Confirmar e Prosseguir</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`w-full px-5 py-2.5 flex justify-between items-center text-[10px] font-black tracking-wider border-t ${!isSuporteActive ? "bg-black/20 border-white/10" : "bg-black/40 border-[#262629]"}`}>
                          <span className={!isSuporteActive ? "text-emerald-100/80" : "text-gray-600"}>HOJE: {baseDailyCounts.business + sessionCounts.business}</span>
                          <span className={`px-2 py-0.5 rounded ${!isSuporteActive ? "bg-white/20 text-white" : "bg-gray-800 text-gray-600"}`}>DISPARO: {sessionCounts.business}</span>
                        </div>
                      </button>
                    );

                    const suporteButton = (
                      <button
                        key="suporte"
                        type="button"
                        onClick={() => {
                          if (!isSuporteActive) {
                            // Suporte NÃO está em evidência! Abrir pop-up de confirmação
                            setNonEvidenceChipConfirm({
                              chipId: supChip?.id || 'support_chip',
                              chipName: supDisplayName,
                              activeChipName: busDisplayName,
                              isSuporte: true
                            });
                          } else {
                            confirmSent(true, supChip?.id || 'support_chip', 'Suporte');
                          }
                        }}
                        className={`group w-full rounded-2xl flex flex-col transition-all cursor-pointer overflow-hidden border-2 active:scale-[0.98] ${
                          isSuporteActive 
                            ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white border-blue-400/50 shadow-xl shadow-blue-900/60 scale-100 opacity-100" 
                            : "bg-[#161619] text-gray-500 border-[#262629] scale-[0.97] opacity-40 hover:opacity-60 grayscale-[0.4]"
                        }`}
                      >
                        <div className="w-full px-5 pt-4 pb-3 flex flex-col items-start">
                          <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isSuporteActive ? "text-blue-100/60" : "text-gray-600"}`}>
                            {supDisplayName}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSuporteActive ? "bg-white/20" : "bg-gray-800"}`}>
                              <CheckCircle2 className={`w-6 h-6 ${isSuporteActive ? "text-white" : "text-gray-600"}`} />
                            </div>
                            <div className="text-left">
                              <p className={`font-black text-lg uppercase tracking-tight leading-tight ${isSuporteActive ? "text-white" : "text-gray-500"}`}>Sim, Enviado!</p>
                              <p className={`text-[10px] font-bold opacity-80 uppercase tracking-widest ${isSuporteActive ? "text-blue-100" : "text-gray-600"}`}>Confirmar e Prosseguir</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`w-full px-5 py-2.5 flex justify-between items-center text-[10px] font-black tracking-wider border-t ${isSuporteActive ? "bg-black/20 border-white/10" : "bg-black/40 border-[#262629]"}`}>
                          <span className={isSuporteActive ? "text-blue-100/80" : "text-gray-600"}>HOJE: {baseDailyCounts.suporte + sessionCounts.suporte}</span>
                          <span className={`px-2 py-0.5 rounded ${isSuporteActive ? "bg-white/20 text-white" : "bg-gray-800 text-gray-600"}`}>DISPARO: {sessionCounts.suporte}</span>
                        </div>
                      </button>
                    );

                    return isSuporteActive ? [suporteButton, businessButton] : [businessButton, suporteButton];
                  })()}


                  {/* Reabrir WhatsApp Button */}
                  <button
                    type="button"
                    onClick={handleReopenWhatsApp}
                    className={`w-full mt-1 ${
                      targetChip.name.toLowerCase().includes('suporte') || targetChip.name.toLowerCase().includes('support')
                        ? 'bg-blue-950/40 hover:bg-blue-900/40 border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300'
                        : 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300'
                    } border rounded-xl py-3 flex items-center justify-center gap-2 font-bold text-[11px] uppercase tracking-wider transition-all duration-75 cursor-pointer active:scale-[0.98]`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Reabrir WhatsApp / Tentar Novamente</span>
                  </button>
                </div>

                {/* Android / APK Image Sharing Helper Banner */}
                {activeCardImageUrl && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-200 shadow-md">
                    <ImageIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left min-w-0 flex-1">
                      <p className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px]">
                        <span>📸 Foto do Card no Android / APK:</span>
                      </p>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        No WhatsApp em APK/Celular, a imagem foi <strong>baixada automaticamente na sua galeria</strong>. 
                        No WhatsApp, toque no ícone do <strong>Clipe 📎</strong> &gt; <strong>Galeria</strong> e selecione a foto mais recente.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleShareCard}
                          className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Share2 className="w-3 h-3 text-blue-400" />
                          <span>Enviar via Compartilhamento Nativo</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadCard}
                          className="bg-[#1C1F26] hover:bg-[#282D37] border border-[#333842] text-gray-300 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Download className="w-3 h-3 text-emerald-400" />
                          <span>Baixar Novamente</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                

                {!showAdiarOptions ? (
                  <button onClick={handleOpenReschedule} className="w-full bg-[#221A0F] hover:bg-[#332716] border border-[#A88B4B]/50 rounded-xl py-3.5 flex items-center justify-center gap-1.5 text-[#A88B4B] font-bold text-[10px] sm:text-[11px] tracking-wider transition-colors shadow-lg">
                    <Clock className="w-4 h-4 shrink-0 text-[#A88B4B]" /> REAGENDAR DISPAROS (ADIAR)...
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button onClick={handleOpenReschedule} className="w-full bg-[#221A0F] hover:bg-[#332716] border border-[#A88B4B]/60 rounded-xl py-3 flex items-center justify-center gap-1.5 text-[#A88B4B] font-bold text-[11px] tracking-wider transition-colors shadow-lg">
                      <Clock className="w-4 h-4 shrink-0" /> 📅 REAGENDAR DISPAROS (EDITAR DATA/HORA)
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => {
                          setShowAdiarOptions(false);
                          handleSkip();
                      }} className="flex-1 bg-[#161619] hover:bg-[#222226] border border-[#333336] rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-gray-300 font-bold text-[10px] tracking-wider transition-colors">
                        JÁ ENVIEI
                      </button>
                      <button onClick={() => {
                          setShowAdiarOptions(false);
                          const contactIdToDelete = currentContact?.id;
                          handleSkip();
                          if (contactIdToDelete && onDeleteContact) {
                             setTimeout(() => onDeleteContact(contactIdToDelete), 300);
                          }
                      }} className="flex-1 bg-[#2D0F14] hover:bg-[#43161E] border border-[#EF4444]/40 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-[#EF4444] font-bold text-[10px] tracking-wider transition-colors">
                        <XCircle className="w-4 h-4 shrink-0" /> NÃO TEM WHATSAPP
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-[#262629] mt-1">
                  <button
                    onClick={onClose}
                    className="w-full bg-[#181A20] hover:bg-[#232730] text-gray-300 hover:text-white border border-[#333842] hover:border-gray-500 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-[11px] tracking-widest uppercase transition-all shadow-md active:scale-[0.98]"
                  >
                    <X className="w-4 h-4 text-red-400" />
                    <span>Fechar Disparador</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
        </div>
      </div>

      {/* Pop-up de Confirmação para Chip Fora de Evidência */}
      {nonEvidenceChipConfirm && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#15181E] border-2 border-amber-500/60 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Atenção: Chip Fora de Evidência
                </span>
                <h3 className="text-lg font-bold text-white mt-1 leading-snug">
                  Confirmar com outro chip?
                </h3>
              </div>
            </div>

            <div className="bg-[#0A0C10] p-4 rounded-xl border border-[#222630] space-y-2.5 text-xs">
              <p className="text-gray-300 leading-relaxed">
                O chip principal em evidência para este disparo é <strong className="text-white bg-white/10 px-2 py-0.5 rounded font-bold">{nonEvidenceChipConfirm.activeChipName}</strong>.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Você clicou no botão de confirmação do chip <strong className={`px-2 py-0.5 rounded font-bold ${nonEvidenceChipConfirm.isSuporte ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'}`}>{nonEvidenceChipConfirm.chipName}</strong>.
              </p>
              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 font-medium">
                ⚠️ Deseja realmente confirmar o envio através deste chip alternativo?
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setNonEvidenceChipConfirm(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#1A1D23] hover:bg-[#232730] border border-[#2E333D] text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  const { chipId, chipName } = nonEvidenceChipConfirm;
                  confirmSent(true, chipId, chipName);
                  setNonEvidenceChipConfirm(null);
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                  nonEvidenceChipConfirm.isSuporte
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-900/40'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-950/60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sim, Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

DispatcherModal.displayName = 'DispatcherModal';
