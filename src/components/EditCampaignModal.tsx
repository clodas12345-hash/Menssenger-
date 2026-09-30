import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Send, 
  Trash2, 
  Check, 
  Users,
  Edit3,
  AlertCircle,
  FastForward,
  Layers,
  Sparkles,
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  Smartphone,
  BookOpen,
  FileText,
  ChevronRight
} from 'lucide-react';
import { ScheduledCampaign, Contact, CardItem, MessageTemplate } from '../types';
import { loadFromStorage, getSettings, getTemplates } from '../utils/storage';
import { parseLocalDatetimeString, toDatetimeLocal, getTodayDateLocal, isWithinBusinessHours, clampDateToBusinessHours, advanceNextBusinessSlot } from '../utils/dateParser';
import { TimeSelect } from './TimeSelect';
import { cleanChipName } from '../utils/whatsapp';

interface EditCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: ScheduledCampaign | null;
  allCampaigns?: ScheduledCampaign[];
  contacts: Contact[];
  onSaveCampaign: (updatedCampaign: ScheduledCampaign | ScheduledCampaign[]) => void;
  onDeleteCampaign: (id: string) => void;
  onAdvanceCampaign?: (campaignId: string, minutes?: number) => void;
}

function getBaseTitle(title: string): string {
  if (!title) return '';
  return title.replace(/\s*\(Parte\s+\d+\)$/i, '').trim();
}

export const EditCampaignModal: React.FC<EditCampaignModalProps> = ({
  isOpen,
  onClose,
  campaign,
  allCampaigns = [],
  contacts,
  onSaveCampaign,
  onDeleteCampaign,
  onAdvanceCampaign,
}) => {
  const [title, setTitle] = useState('');
  const [scheduledAtLocal, setScheduledAtLocal] = useState('');
  const [intervalSeconds, setIntervalSeconds] = useState(8);
  const [sendMode, setSendMode] = useState<'whatsapp_desktop' | 'webhook'>('whatsapp_desktop');
  const [selectedChipId, setSelectedChipId] = useState<string>('');
  const [status, setStatus] = useState<'agendado' | 'em_andamento' | 'concluido' | 'cancelado'>('agendado');
  const [templateContent, setTemplateContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [randomTopicTemplates, setRandomTopicTemplates] = useState<string[]>([]);
  const [showTopicPickerModal, setShowTopicPickerModal] = useState<boolean>(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState<string>('');
  const [topicCategoryFilter, setTopicCategoryFilter] = useState<string>('all');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dropdownGroupingMode, setDropdownGroupingMode] = useState<'family' | 'topic' | 'only_random' | 'only_fixed'>('family');
  const [selectFilterQuery, setSelectFilterQuery] = useState<string>('');

  const availableTemplates: MessageTemplate[] = getTemplates();

  const getTopicFamilyName = (catName: string): string => {
    const norm = (catName || '').trim();
    const upper = norm.toUpperCase();

    if (upper.startsWith('CG') || upper.includes('CORRE E GANHE') || upper.includes('CORRA E GANHE')) {
      return 'Corre e Ganhe (CG)';
    }
    if (upper.includes('FDS') || upper.includes('FIM DE SEMANA')) {
      return 'Fim de Semana (FDS)';
    }
    if (upper.includes('FERIADO') || upper.includes('07/09') || upper.includes('NATAL') || upper.includes('ANO NOVO') || upper.includes('CARNAVAL')) {
      return 'Feriados & Datas Especiais';
    }
    if (upper.includes('MISSÃO') || upper.includes('MISSAO') || upper.includes('META') || upper.includes('DESAFIO')) {
      return 'Missões & Metas';
    }
    if (upper.includes('TAXA ZERO') || upper.includes('TX0') || upper.includes('ISENÇÃO')) {
      return 'Taxa Zero';
    }
    if (upper.includes('CONTATO') || upper.includes('CONVITE') || upper.includes('BOAS VINDAS') || upper.includes('APRESENTAÇÃO')) {
      return 'Contatos & Convites';
    }
    if (upper.includes('MOTO') || upper.includes('CARRO')) {
      return 'Por Tipo de Veículo';
    }
    const prefixMatch = norm.match(/^([A-Za-z0-9À-ÿ]{2,10})\s*[-/:]/);
    if (prefixMatch && prefixMatch[1]) {
      return prefixMatch[1].toUpperCase();
    }
    return 'Outros Tópicos';
  };

  const groupedCategories: Record<string, MessageTemplate[]> = useMemo(() => {
    const map: Record<string, MessageTemplate[]> = {};
    availableTemplates.forEach((t) => {
      const cat = t.category || 'Geral';
      if (!map[cat]) map[cat] = [];
      map[cat].push(t);
    });
    return map;
  }, [availableTemplates]);

  const sortedCategories = useMemo(() => {
    return Object.entries(groupedCategories).sort((a, b) =>
      a[0].localeCompare(b[0], 'pt-BR', { numeric: true })
    );
  }, [groupedCategories]);

  const familyGroupedTopics = useMemo(() => {
    const families: Record<string, { category: string; count: number; tmpls: MessageTemplate[] }[]> = {};

    sortedCategories.forEach(([category, tmpls]) => {
      let count = 0;
      tmpls.forEach((t) => {
        if (t.content) count++;
        if (t.variations) count += t.variations.length;
      });

      const family = getTopicFamilyName(category);
      if (!families[family]) families[family] = [];
      families[family].push({ category, count, tmpls });
    });

    const priority = [
      'Corre e Ganhe (CG)',
      'Fim de Semana (FDS)',
      'Feriados & Datas Especiais',
      'Missões & Metas',
      'Taxa Zero',
      'Contatos & Convites',
      'Por Tipo de Veículo',
      'Outros Tópicos',
    ];

    return Object.entries(families).sort((a, b) => {
      const idxA = priority.indexOf(a[0]);
      const idxB = priority.indexOf(b[0]);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a[0].localeCompare(b[0], 'pt-BR');
    });
  }, [sortedCategories]);

  const handleSelectTopicCategory = (catName: string) => {
    const catTemplates = groupedCategories[catName] || [];
    const candidateTexts: string[] = [];
    catTemplates.forEach((t) => {
      if (t.content && t.content.trim()) candidateTexts.push(t.content.trim());
      if (t.variations && t.variations.length > 0) {
        t.variations.forEach((v) => {
          if (v && v.trim()) candidateTexts.push(v.trim());
        });
      }
    });

    setSelectedTemplateId(`topic_cat_${catName}`);
    setSelectedCategoryName(catName);
    setRandomTopicTemplates(candidateTexts);
    setTemplateContent(
      `🎲 [ENVIO ALEATÓRIO DO TÓPICO: ${catName}]\nSerá enviada uma mensagem sorteada das ${candidateTexts.length} opções cadastradas neste tópico para cada destinatário.`
    );
  };

  const handleSelectTopic = (tmpl: MessageTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setSelectedCategoryName(tmpl.category || 'Geral');
    const candidateTexts = [tmpl.content, ...(tmpl.variations || [])].filter(v => v && v.trim());
    if (candidateTexts.length > 1) {
      setRandomTopicTemplates(candidateTexts);
    } else {
      setRandomTopicTemplates([]);
    }
    setTemplateContent(tmpl.content);
  };

  // Card Selection States
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [showCardPickerModal, setShowCardPickerModal] = useState<boolean>(false);
  const [previewModalCard, setPreviewModalCard] = useState<CardItem | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const savedCards = loadFromStorage<CardItem[]>('gkd_cards_album_v1', []);

  const handleToggleCardSelection = (cardId: string) => {
    if (selectedCardIds.includes(cardId)) {
      setSelectedCardIds(selectedCardIds.filter(id => id !== cardId));
    } else {
      setSelectedCardIds([...selectedCardIds, cardId]);
    }
  };

  const handleSelectAllCards = () => {
    setSelectedCardIds(savedCards.map(c => c.id));
  };

  const handleClearSelectedCards = () => {
    setSelectedCardIds([]);
  };

  // Multi-part / Hourly Batch States
  const [applyToAllParts, setApplyToAllParts] = useState(true);
  const [relatedParts, setRelatedParts] = useState<ScheduledCampaign[]>([]);
  const [partScheduleMap, setPartScheduleMap] = useState<Record<string, string>>({});
  const initializedCampaignIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !campaign) {
      initializedCampaignIdRef.current = null;
      return;
    }

    if (initializedCampaignIdRef.current !== campaign.id) {
      initializedCampaignIdRef.current = campaign.id;

      const baseT = getBaseTitle(campaign.title || '');
      setTitle(baseT || campaign.title || '');
      setScheduledAtLocal(toDatetimeLocal(campaign.scheduledAt));
      setIntervalSeconds(campaign.intervalSeconds || 8);
      setSendMode(campaign.sendMode === 'webhook' ? 'webhook' : 'whatsapp_desktop');
      setSelectedChipId(campaign.chipId || '');
      setStatus(campaign.status || 'agendado');
      setTemplateContent(campaign.templateContent || '');
      setSelectedTemplateId(campaign.templateId || '');
      setSelectedCategoryName(campaign.categoryName || '');
      setRandomTopicTemplates(campaign.randomTopicTemplates || []);
      setSavedSuccess(false);
      setShowDeleteConfirm(false);
      setShowHourlySplitter(false);

      if (campaign.cardIds && Array.isArray(campaign.cardIds)) {
        setSelectedCardIds(campaign.cardIds);
      } else if (campaign.cardId) {
        setSelectedCardIds([campaign.cardId]);
      } else {
        setSelectedCardIds([]);
      }

      // Identify related parts ONLY if title explicitly contains (Parte X)
      const isPart = (campaign.title || '').toLowerCase().includes('(parte ');
      const directParts = (allCampaigns || []).filter((c) => {
        if (c.id === campaign.id) return true;
        const cIsPart = (c.title || '').toLowerCase().includes('(parte ');
        if (isPart && cIsPart) {
          const cBaseTitle = getBaseTitle(c.title || '');
          if (cBaseTitle && baseT && cBaseTitle.toLowerCase() === baseT.toLowerCase()) return true;
        }
        return false;
      });

      let foundParts = directParts.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      setRelatedParts(foundParts);
      setApplyToAllParts(foundParts.length > 1);

      const initialMap: Record<string, string> = {};
      foundParts.forEach((p) => {
        initialMap[p.id] = toDatetimeLocal(p.scheduledAt);
      });
      setPartScheduleMap(initialMap);
    }
  }, [campaign, isOpen, allCampaigns]);

  const [showHourlySplitter, setShowHourlySplitter] = useState(false);
  const [splitContactsPerHour, setSplitContactsPerHour] = useState(20);

  if (!isOpen || !campaign) return null;

  const handleInsertVariable = (varName: string) => {
    setTemplateContent((prev) => `${prev} {${varName}}`);
  };

  const handleSpacePartsHourly = () => {
    if (relatedParts.length === 0) return;
    const firstPart = relatedParts[0];
    const firstLocal = partScheduleMap[firstPart.id] || scheduledAtLocal || toDatetimeLocal(firstPart.scheduledAt);
    const startDate = parseLocalDatetimeString(firstLocal);
    if (isNaN(startDate.getTime())) return;

    const updatedMap: Record<string, string> = { ...partScheduleMap };
    relatedParts.forEach((p, idx) => {
      const pDate = new Date(startDate.getTime() + idx * 60 * 60 * 1000);
      updatedMap[p.id] = toDatetimeLocal(pDate.toISOString());
    });
    setPartScheduleMap(updatedMap);
    if (campaign && updatedMap[campaign.id]) {
      setScheduledAtLocal(updatedMap[campaign.id]);
    }
    setStatus('agendado');
  };

  const handleShiftAllParts = (minutes: number) => {
    const shiftMs = minutes * 60 * 1000;
    const updatedMap: Record<string, string> = { ...partScheduleMap };
    relatedParts.forEach((p) => {
      const currentLocal = partScheduleMap[p.id] || toDatetimeLocal(p.scheduledAt);
      const currentDate = parseLocalDatetimeString(currentLocal);
      if (!isNaN(currentDate.getTime())) {
        const newDate = new Date(currentDate.getTime() + shiftMs);
        updatedMap[p.id] = toDatetimeLocal(newDate.toISOString());
      }
    });
    setPartScheduleMap(updatedMap);
    if (campaign && updatedMap[campaign.id]) {
      const newLocal = updatedMap[campaign.id];
      setScheduledAtLocal(newLocal);
      setStatus('agendado');
    }
  };

  const handleQuickAddMinutes = (mins: number) => {
    let baseMs = Date.now();
    if (scheduledAtLocal) {
      const parsed = parseLocalDatetimeString(scheduledAtLocal).getTime();
      if (!isNaN(parsed) && parsed > Date.now()) {
        baseMs = parsed;
      }
    }
    const newDate = new Date(baseMs + mins * 60 * 1000);
    const newStr = toDatetimeLocal(newDate.toISOString());
    setScheduledAtLocal(newStr);
    setPartScheduleMap((prev) => ({ ...prev, [campaign.id]: newStr }));
    setStatus('agendado');
  };

  const handleGenerateHourlySplit = () => {
    const perHour = Math.max(1, Number(splitContactsPerHour) || 20);
    const totalContacts = campaign.contactIds || [];
    if (totalContacts.length === 0) {
      alert('Não há contatos cadastrados para esta campanha.');
      return;
    }

    const startDate = parseLocalDatetimeString(scheduledAtLocal);
    if (isNaN(startDate.getTime())) {
      alert('Informe uma data e horário inicial válidos.');
      return;
    }

    const selectedCards = savedCards.filter(c => selectedCardIds.includes(c.id));
    const chosenCard = selectedCards[0];
    const isRandomCards = selectedCards.length > 1;

    const chipPayload = { chipId: selectedChipId, chipName: getSettings().chips?.find(c => c.id === selectedChipId)?.name };
    const cardPayload = {
      cardId: chosenCard?.id,
      cardTitle: isRandomCards ? `🎲 Envio Aleatório (${selectedCards.length} Cards)` : chosenCard?.title,
      cardImageUrl: chosenCard?.imageUrl,
      cardIds: selectedCardIds,
      cardImageUrls: selectedCards.map(c => c.imageUrl),
    };

    const totalParts = Math.ceil(totalContacts.length / perHour);
    const baseTitleText = title.replace(/\s*\(Parte\s+\d+\)$/i, '').trim();

    const newParts: ScheduledCampaign[] = [];
    const nowTs = Date.now();
    let currentPartDate = clampDateToBusinessHours(startDate);

    for (let i = 0; i < totalParts; i++) {
      const chunkContacts = totalContacts.slice(i * perHour, (i + 1) * perHour);
      const partDate = i === 0 ? currentPartDate : advanceNextBusinessSlot(currentPartDate, 1);
      currentPartDate = partDate;

      newParts.push({
        id: i === 0 ? campaign.id : `camp_${nowTs}_part${i + 1}`,
        title: totalParts > 1 ? `${baseTitleText} (Parte ${i + 1})` : baseTitleText,
        templateId: campaign.templateId || 'manual',
        templateContent: templateContent.trim(),
        useVariations: campaign.useVariations ?? false,
        categoryName: campaign.categoryName,
        randomTopicTemplates: campaign.randomTopicTemplates,
        contactIds: chunkContacts,
        scheduledAt: partDate.toISOString(),
        intervalSeconds: Math.max(1, Number(intervalSeconds) || 8),
        sendMode,
        status: 'agendado',
        createdAt: campaign.createdAt || new Date().toISOString(),
        ...cardPayload,
        ...chipPayload,
        progress: {
          sent: 0,
          failed: 0,
          total: chunkContacts.length,
        },
      });
    }

    onSaveCampaign(newParts);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Por favor, informe o título do agendamento.');
      return;
    }

    if (!scheduledAtLocal) {
      alert('Por favor, selecione uma data e horário válidos.');
      return;
    }

    let scheduledDateObj = parseLocalDatetimeString(scheduledAtLocal);
    if (isNaN(scheduledDateObj.getTime())) {
      alert('Data e horário inválidos.');
      return;
    }

    // Auto-adjust date if past so existing campaigns save without blocking the user
    if (scheduledDateObj.getTime() < Date.now() - 30000) {
      scheduledDateObj = new Date(Date.now() + 5000);
    }

    const selectedCards = savedCards.filter(c => selectedCardIds.includes(c.id));
    const chosenCard = selectedCards[0];
    const isRandomCards = selectedCards.length > 1;

    const chipPayload = { chipId: selectedChipId, chipName: getSettings().chips?.find(c => c.id === selectedChipId)?.name };
    const cardPayload = {
      cardId: chosenCard?.id,
      cardTitle: isRandomCards ? `🎲 Envio Aleatório (${selectedCards.length} Cards)` : chosenCard?.title,
      cardImageUrl: chosenCard?.imageUrl,
      cardIds: selectedCardIds,
      cardImageUrls: selectedCards.map(c => c.imageUrl),
    };

    let effectiveMainStatus: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado' = status;
    let shouldResetProgress = false;
    if (scheduledDateObj.getTime() > Date.now()) {
      if (status === 'concluido' || status === 'cancelado') {
        shouldResetProgress = true;
      }
      effectiveMainStatus = 'agendado';
    }

    const baseTitleClean = title.trim().replace(/\s*\(Parte\s+\d+\)$/i, '');

    const updatedMain: ScheduledCampaign = {
      ...campaign,
      title: relatedParts.length > 1 ? `${baseTitleClean} (${campaign.title.match(/Parte\s+\d+/i)?.[0] || 'Parte 1'})` : baseTitleClean,
      scheduledAt: scheduledDateObj.toISOString(),
      intervalSeconds: Math.max(1, Number(intervalSeconds) || 8),
      sendMode,
      status: effectiveMainStatus,
      templateId: selectedTemplateId || campaign.templateId || 'manual',
      categoryName: selectedCategoryName || campaign.categoryName,
      randomTopicTemplates: randomTopicTemplates.length > 0 ? randomTopicTemplates : undefined,
      useVariations: randomTopicTemplates.length > 0 ? true : (campaign.useVariations ?? false),
      templateContent: templateContent.trim(),
      ...cardPayload,
      ...chipPayload,
      ...(shouldResetProgress ? { progress: { sent: 0, failed: 0, total: campaign.contactIds.length } } : {}),
    };
    
    // EXPLICIT CLEANUP: if no cards selected, ensure we don't leave lingering undefined properties 
    // that might survive spreads or cause truthy checks to fail elsewhere.
    if (selectedCardIds.length === 0) {
      delete updatedMain.cardId;
      delete updatedMain.cardTitle;
      delete updatedMain.cardImageUrl;
      updatedMain.cardIds = [];
      updatedMain.cardImageUrls = [];
    }

    if (relatedParts.length > 1) {
      // Update all related parts with individual times from partScheduleMap
      const updatedParts: ScheduledCampaign[] = relatedParts.map((p) => {
        const partTimeLocal = partScheduleMap[p.id] || toDatetimeLocal(p.scheduledAt);
        const partDateObj = parseLocalDatetimeString(partTimeLocal);
        const validTime = !isNaN(partDateObj.getTime()) ? partDateObj.toISOString() : p.scheduledAt;

        const isCurrent = p.id === campaign.id;
        const partTag = p.title.match(/Parte\s+\d+/i)?.[0];
        
        const finalScheduledAt = isCurrent ? scheduledDateObj.toISOString() : validTime;
        let pStatus = p.status;
        let pResetProgress = false;
        if (new Date(finalScheduledAt).getTime() > Date.now()) {
          if (p.status === 'concluido' || p.status === 'cancelado') {
            pResetProgress = true;
          }
          pStatus = 'agendado';
        }

        const newPart: ScheduledCampaign = {
          ...p,
          title: isCurrent 
            ? (partTag ? `${baseTitleClean} (${partTag})` : baseTitleClean)
            : (applyToAllParts && partTag ? `${baseTitleClean} (${partTag})` : p.title),
          templateId: (isCurrent || applyToAllParts) ? (selectedTemplateId || p.templateId || 'manual') : p.templateId,
          categoryName: (isCurrent || applyToAllParts) ? (selectedCategoryName || p.categoryName) : p.categoryName,
          randomTopicTemplates: (isCurrent || applyToAllParts) ? (randomTopicTemplates.length > 0 ? randomTopicTemplates : undefined) : p.randomTopicTemplates,
          useVariations: (isCurrent || applyToAllParts) ? (randomTopicTemplates.length > 0) : p.useVariations,
          templateContent: (isCurrent || applyToAllParts) ? templateContent.trim() : p.templateContent,
          intervalSeconds: (isCurrent || applyToAllParts) ? Math.max(1, Number(intervalSeconds) || 8) : p.intervalSeconds,
          sendMode: (isCurrent || applyToAllParts) ? sendMode : p.sendMode,
          status: pStatus,
          scheduledAt: finalScheduledAt,
          ...((isCurrent || applyToAllParts) ? cardPayload : {}),
          ...((isCurrent || applyToAllParts) ? chipPayload : {}),
          ...(pResetProgress ? { progress: { sent: 0, failed: 0, total: p.contactIds.length } } : {}),
        };
        
        if ((isCurrent || applyToAllParts) && selectedCardIds.length === 0) {
          delete newPart.cardId;
          delete newPart.cardTitle;
          delete newPart.cardImageUrl;
          newPart.cardIds = [];
          newPart.cardImageUrls = [];
        }
        
        return newPart;
      });

      onSaveCampaign(updatedParts);
    } else {
      onSaveCampaign(updatedMain);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleDelete = () => {
    onDeleteCampaign(campaign.id);
    onClose();
  };

  const targetContacts = contacts.filter((c) => campaign.contactIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4">
      <div 
        className="bg-[#15181E] border border-[#2A2D35] rounded-2xl w-full max-w-[calc(100vw-1rem)] sm:max-w-2xl min-w-0 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1F2229] bg-[#0A0C10] rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-2.5 bg-[#A88B4B]/10 text-[#A88B4B] rounded-xl border border-[#A88B4B]/30">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif italic text-white flex items-center gap-2">
                Editar Agendamento
                {relatedParts.length > 1 && (
                  <span className="text-[10px] sm:text-xs bg-[#A88B4B]/20 text-[#A88B4B] px-2 py-0.5 rounded-full border border-[#A88B4B]/40 font-mono not-italic">
                    {relatedParts.length} Partes de 1h
                  </span>
                )}
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-400">
                Altere a data, horário, intervalo ou corrija o texto da mensagem antes do disparo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#15181E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 overflow-y-auto overflow-x-hidden flex-1 relative custom-scrollbar rounded-b-2xl">
          {/* Related Parts Banner if multi-part campaign exists */}
          {relatedParts.length > 1 ? (
            <div className="p-4 bg-[#0A0C10] border border-[#A88B4B]/40 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#A88B4B] uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-[#A88B4B]" />
                  <span>Edição Hora a Hora ({relatedParts.length} agendamentos na fila)</span>
                </div>
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSpacePartsHourly}
                    className="text-[11px] bg-[#A88B4B]/20 hover:bg-[#A88B4B]/30 text-[#A88B4B] px-2.5 py-1 rounded border border-[#A88B4B]/40 transition-all font-semibold flex items-center space-x-1"
                    title="Reajusta os horários para 1 hora de intervalo entre cada agendamento"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Espaçar 1h</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftAllParts(60)}
                    className="text-[11px] bg-[#A88B4B]/20 hover:bg-[#A88B4B]/30 text-[#A88B4B] px-2 py-1 rounded border border-[#A88B4B]/40 transition-all font-semibold"
                    title="Adiantar 1 hora em todos os agendamentos"
                  >
                    +1h Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftAllParts(-60)}
                    className="text-[11px] bg-[#A88B4B]/20 hover:bg-[#A88B4B]/30 text-[#A88B4B] px-2 py-1 rounded border border-[#A88B4B]/40 transition-all font-semibold"
                    title="Adiar 1 hora em todos os agendamentos"
                  >
                    -1h Todas
                  </button>
                </div>
              </div>

              {/* Sync Toggle */}
              <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-gray-200 select-none bg-[#15181E] p-2.5 rounded-lg border border-[#1F2229]">
                <input
                  type="checkbox"
                  checked={applyToAllParts}
                  onChange={(e) => setApplyToAllParts(e.target.checked)}
                  className="w-4 h-4 accent-[#A88B4B] rounded cursor-pointer"
                />
                <span className="font-semibold text-[#A88B4B]">
                  Aplicar o texto da mensagem editada a TODAS as {relatedParts.length} partes deste agendamento
                </span>
              </label>

              {/* Part Time Editor */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-gray-400">Horários configurados para cada parte:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {relatedParts.map((part) => {
                    const isCurrent = part.id === campaign.id;
                    return (
                      <div 
                        key={part.id} 
                        className={`p-2 rounded-lg border text-xs flex flex-col justify-between gap-1 ${
                          isCurrent 
                            ? 'bg-[#A88B4B]/10 border-[#A88B4B]/50 text-white' 
                            : 'bg-[#15181E] border-[#1F2229] text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-200 truncate max-w-[140px]">
                            {part.title}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {part.contactIds.length} contatos
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1">
                          <input
                            type="date"
                            min={getTodayDateLocal()}
                            value={(partScheduleMap[part.id] || toDatetimeLocal(part.scheduledAt)).split('T')[0] || ''}
                            onChange={(e) => {
                              const currentVal = partScheduleMap[part.id] || toDatetimeLocal(part.scheduledAt);
                              const timeVal = currentVal.split('T')[1] || '09:00';
                              const val = `${e.target.value}T${timeVal}`;
                              setPartScheduleMap((prev) => ({ ...prev, [part.id]: val }));
                              if (isCurrent) setScheduledAtLocal(val);
                            }}
                            className="w-full sm:w-3/5 bg-[#0A0C10] border border-[#1F2229] rounded px-1.5 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#A88B4B]"
                          />
                          <TimeSelect
                            value={(partScheduleMap[part.id] || toDatetimeLocal(part.scheduledAt)).split('T')[1] || '09:00'}
                            onChange={(timeVal) => {
                              const currentVal = partScheduleMap[part.id] || toDatetimeLocal(part.scheduledAt);
                              const dateVal = currentVal.split('T')[0] || getTodayDateLocal();
                              const val = `${dateVal}T${timeVal}`;
                              setPartScheduleMap((prev) => ({ ...prev, [part.id]: val }));
                              if (isCurrent) setScheduledAtLocal(val);
                            }}
                            className="w-full sm:w-2/5"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Título da Campanha / Agendamento
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#A88B4B] transition-colors"
              placeholder="Ex: Oferta Exclusiva de Sexta"
              required
            />
          </div>

          {/* Date & Time Row - Interval and other settings removed by user request */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#A88B4B]" />
                <span>
                  {relatedParts.length > 1 ? 'Horário desta Parte' : 'Data e Horário de Disparo'}
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="date"
                  min={getTodayDateLocal()}
                  value={scheduledAtLocal.split('T')[0] || ''}
                  onChange={(e) => {
                    const timeVal = scheduledAtLocal.split('T')[1] || '09:00';
                    const val = `${e.target.value}T${timeVal}`;
                    setScheduledAtLocal(val);
                    setPartScheduleMap((prev) => ({ ...prev, [campaign.id]: val }));
                    if (val) {
                      const d = parseLocalDatetimeString(val);
                      if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
                        setStatus('agendado');
                      }
                    }
                  }}
                  className="w-full sm:w-3/5 bg-[#0A0C10] border border-[#1F2229] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#A88B4B] transition-colors font-mono"
                  required
                />
                <TimeSelect
                  value={scheduledAtLocal.split('T')[1] || '09:00'}
                  onChange={(timeVal) => {
                    const dateVal = scheduledAtLocal.split('T')[0] || getTodayDateLocal();
                    const val = `${dateVal}T${timeVal}`;
                    setScheduledAtLocal(val);
                    setPartScheduleMap((prev) => ({ ...prev, [campaign.id]: val }));
                    if (val) {
                      const d = parseLocalDatetimeString(val);
                      if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
                        setStatus('agendado');
                      }
                    }
                  }}
                  className="w-full sm:w-2/5"
                />
              </div>

              {/* Quick Time Adjustment Buttons */}
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-gray-400 font-semibold uppercase mr-0.5">Adicionar:</span>
                <button
                  type="button"
                  onClick={() => handleQuickAddMinutes(15)}
                  className="px-2 py-0.5 bg-[#A88B4B]/15 hover:bg-[#A88B4B]/30 text-[#A88B4B] border border-[#A88B4B]/40 rounded text-[10px] font-bold transition-all"
                >
                  +15 min
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddMinutes(30)}
                  className="px-2 py-0.5 bg-[#A88B4B]/15 hover:bg-[#A88B4B]/30 text-[#A88B4B] border border-[#A88B4B]/40 rounded text-[10px] font-bold transition-all"
                >
                  +30 min
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddMinutes(45)}
                  className="px-2 py-0.5 bg-[#A88B4B]/15 hover:bg-[#A88B4B]/30 text-[#A88B4B] border border-[#A88B4B]/40 rounded text-[10px] font-bold transition-all"
                >
                  +45 min
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddMinutes(60)}
                  className="px-2 py-0.5 bg-[#A88B4B]/15 hover:bg-[#A88B4B]/30 text-[#A88B4B] border border-[#A88B4B]/40 rounded text-[10px] font-bold transition-all"
                >
                  +1h
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddMinutes(1440)}
                  className="px-2 py-0.5 bg-[#A88B4B]/15 hover:bg-[#A88B4B]/30 text-[#A88B4B] border border-[#A88B4B]/40 rounded text-[10px] font-bold transition-all"
                >
                  Amanhã (+24h)
                </button>
              </div>
            </div>
          </div>

          {/* Message Topic & Content Selection */}
          <div className="space-y-3">
            {/* Tópico de Mensagem Dropdown/Selector */}
            <div className="bg-[#0A0C10] border border-[#1F2229] p-3.5 rounded-xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-[#A88B4B]" />
                  <span>Trocar Tópico / Modelo de Mensagem</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowTopicPickerModal(true)}
                  className="text-[11px] bg-[#A88B4B]/15 hover:bg-[#A88B4B]/30 text-[#A88B4B] border border-[#A88B4B]/40 px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition-all self-start sm:self-auto"
                >
                  <Search className="w-3 h-3" />
                  <span>Explorar Todos os Tópicos ({availableTemplates.length})</span>
                </button>
              </div>

              {/* Grouping Mode Controls & Quick Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                <div className="flex flex-wrap items-center gap-1 text-[10px] bg-[#15181E] p-1 rounded-lg border border-[#1F2229]">
                  <button
                    type="button"
                    onClick={() => setDropdownGroupingMode('family')}
                    className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                      dropdownGroupingMode === 'family'
                        ? 'bg-[#A88B4B] text-[#0A0C10] shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Agrupar por Família (CG, FDS, Feriados, etc.)"
                  >
                    📂 Por Grupos (CG, FDS...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDropdownGroupingMode('topic')}
                    className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                      dropdownGroupingMode === 'topic'
                        ? 'bg-[#A88B4B] text-[#0A0C10] shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Cada tópico com seu sorteio e mensagens juntos"
                  >
                    📁 Por Tópico
                  </button>
                  <button
                    type="button"
                    onClick={() => setDropdownGroupingMode('only_random')}
                    className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                      dropdownGroupingMode === 'only_random'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-purple-300 hover:text-white'
                    }`}
                    title="Apenas opções de sorteio aleatório agrupadas"
                  >
                    🎲 Só Sorteios
                  </button>
                  <button
                    type="button"
                    onClick={() => setDropdownGroupingMode('only_fixed')}
                    className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                      dropdownGroupingMode === 'only_fixed'
                        ? 'bg-gray-700 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Apenas mensagens fixas"
                  >
                    📄 Só Fixos
                  </button>
                </div>

                {/* Quick Search */}
                <div className="relative flex-1 min-w-[140px] max-w-full sm:max-w-[200px]">
                  <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={selectFilterQuery}
                    onChange={(e) => setSelectFilterQuery(e.target.value)}
                    placeholder="Filtrar tópicos..."
                    className="w-full bg-[#15181E] border border-[#1F2229] rounded-lg pl-7 pr-6 py-1 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-[#A88B4B]"
                  />
                  {selectFilterQuery && (
                    <button
                      type="button"
                      onClick={() => setSelectFilterQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTemplateId(val);
                    if (val === '') {
                      setSelectedCategoryName('');
                      setRandomTopicTemplates([]);
                      return;
                    }
                    if (val.startsWith('topic_cat_')) {
                      const catName = val.replace('topic_cat_', '');
                      handleSelectTopicCategory(catName);
                    } else {
                      const tmpl = availableTemplates.find(t => t.id === val);
                      if (tmpl) {
                        handleSelectTopic(tmpl);
                      }
                    }
                  }}
                  className="w-full bg-[#15181E] border border-[#1F2229] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#A88B4B] transition-colors"
                >
                  <option value="">✏️ [Texto Livre / Mantido Personalizado]</option>

                  {/* MODE 1: Grouped by Family (CG, FDS, Feriados...) */}
                  {dropdownGroupingMode === 'family' && (
                    <>
                      {familyGroupedTopics.map(([family, topicList]) => {
                        const q = selectFilterQuery.toLowerCase();
                        const filteredTopics = q
                          ? topicList.filter(t => t.category.toLowerCase().includes(q))
                          : topicList;

                        if (filteredTopics.length === 0) return null;

                        return (
                          <optgroup key={`fam_rand_${family}`} label={`🎲 Sorteio: ${family}`}>
                            {filteredTopics.map(({ category, count }) => (
                              <option key={`cat_rand_${category}`} value={`topic_cat_${category}`}>
                                🎲 {category} ({count} mensagens)
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}

                      {sortedCategories.map(([category, tmpls]) => {
                        const q = selectFilterQuery.toLowerCase();
                        const filteredTmpls = q
                          ? tmpls.filter(t => t.title.toLowerCase().includes(q) || category.toLowerCase().includes(q))
                          : tmpls;

                        if (filteredTmpls.length === 0) return null;

                        return (
                          <optgroup key={`cat_fix_${category}`} label={`📌 Mensagens Fixas: ${category}`}>
                            {filteredTmpls.map((tmpl) => (
                              <option key={tmpl.id} value={tmpl.id}>
                                📄 {tmpl.title}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </>
                  )}

                  {/* MODE 2: Grouped by Topic (Each topic has its random draw + fixed messages) */}
                  {dropdownGroupingMode === 'topic' && (
                    <>
                      {sortedCategories.map(([category, tmpls]) => {
                        let count = 0;
                        tmpls.forEach(t => {
                          if (t.content) count++;
                          if (t.variations) count += t.variations.length;
                        });

                        const q = selectFilterQuery.toLowerCase();
                        const matchesCat = !q || category.toLowerCase().includes(q);
                        const filteredTmpls = q
                          ? tmpls.filter(t => t.title.toLowerCase().includes(q) || category.toLowerCase().includes(q))
                          : tmpls;

                        if (!matchesCat && filteredTmpls.length === 0) return null;

                        return (
                          <optgroup key={`cat_full_${category}`} label={`📁 ${category} (${count} mensagens)`}>
                            <option value={`topic_cat_${category}`}>
                              🎲 [Sorteio] Todas as {count} msgs de {category}
                            </option>
                            {filteredTmpls.map((tmpl) => (
                              <option key={tmpl.id} value={tmpl.id}>
                                📄 {tmpl.title}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </>
                  )}

                  {/* MODE 3: Only Random Topic Lottery (Grouped by Family) */}
                  {dropdownGroupingMode === 'only_random' && (
                    <>
                      {familyGroupedTopics.map(([family, topicList]) => {
                        const q = selectFilterQuery.toLowerCase();
                        const filteredTopics = q
                          ? topicList.filter(t => t.category.toLowerCase().includes(q))
                          : topicList;

                        if (filteredTopics.length === 0) return null;

                        return (
                          <optgroup key={`fam_only_rand_${family}`} label={`🎲 Sorteio: ${family}`}>
                            {filteredTopics.map(({ category, count }) => (
                              <option key={`cat_rand_${category}`} value={`topic_cat_${category}`}>
                                🎲 {category} ({count} mensagens)
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </>
                  )}

                  {/* MODE 4: Only Fixed Templates */}
                  {dropdownGroupingMode === 'only_fixed' && (
                    <>
                      {sortedCategories.map(([category, tmpls]) => {
                        const q = selectFilterQuery.toLowerCase();
                        const filteredTmpls = q
                          ? tmpls.filter(t => t.title.toLowerCase().includes(q) || category.toLowerCase().includes(q))
                          : tmpls;

                        if (filteredTmpls.length === 0) return null;

                        return (
                          <optgroup key={`cat_only_fix_${category}`} label={`📌 ${category}`}>
                            {filteredTmpls.map((tmpl) => (
                              <option key={tmpl.id} value={tmpl.id}>
                                📄 {tmpl.title}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </>
                  )}
                </select>
              </div>

              {randomTopicTemplates.length > 0 ? (
                <div className="text-[11px] text-[#A88B4B] bg-[#A88B4B]/10 px-3 py-2 rounded-xl border border-[#A88B4B]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">🎲 Envio Aleatório de Tópico Ativo:</span>
                    <span>
                      Tópico: <strong>"{selectedCategoryName}"</strong> ({randomTopicTemplates.length} opções de mensagens)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId('');
                      setSelectedCategoryName('');
                      setRandomTopicTemplates([]);
                      setTemplateContent('');
                    }}
                    className="text-red-400 hover:text-red-300 font-bold underline text-[10px]"
                  >
                    Desvincular Tópico
                  </button>
                </div>
              ) : selectedTemplateId ? (
                <div className="text-[11px] text-[#A88B4B] bg-[#A88B4B]/10 px-2.5 py-1 rounded-lg border border-[#A88B4B]/30 flex items-center justify-between">
                  <span>
                    Tópico Ativo: <strong>{selectedCategoryName || 'Geral'}</strong> — {availableTemplates.find(t => t.id === selectedTemplateId)?.title || 'Modelo Fixo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId('');
                      setSelectedCategoryName('');
                      setRandomTopicTemplates([]);
                    }}
                    className="text-gray-400 hover:text-white font-bold ml-2 underline text-[10px]"
                  >
                    Desvincular Tópico
                  </button>
                </div>
              ) : null}
            </div>

            {/* Textarea for Message Text */}
            <div>
              <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#A88B4B]" />
                  <span>Texto da Mensagem</span>
                </label>
                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="text-gray-500 mr-1">Variáveis:</span>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('nome')}
                    className="bg-[#0A0C10] hover:bg-[#A88B4B]/20 text-[#A88B4B] px-1.5 py-0.5 rounded border border-[#1F2229] transition-colors font-mono"
                  >
                    {'{nome}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('primeiro_nome')}
                    className="bg-[#0A0C10] hover:bg-[#A88B4B]/20 text-[#A88B4B] px-1.5 py-0.5 rounded border border-[#1F2229] transition-colors font-mono"
                  >
                    {'{primeiro_nome}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('telefone')}
                    className="bg-[#0A0C10] hover:bg-[#A88B4B]/20 text-[#A88B4B] px-1.5 py-0.5 rounded border border-[#1F2229] transition-colors font-mono"
                  >
                    {'{telefone}'}
                  </button>
                </div>
              </div>
              <textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                rows={4}
                className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-[#A88B4B] transition-colors leading-relaxed"
                placeholder="Digite o texto da mensagem que será enviada aos contatos..."
                required
              />
            </div>
          </div>

          {/* Card Selection */}
          <div className="bg-[#0A0C10] border border-[#1F2229] p-4 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#A88B4B]" />
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  📸 Trocar Card / Imagem
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowCardPickerModal(true)}
                className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] font-black px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5 shadow-md self-start sm:self-auto"
              >
                <span>{selectedCardIds.length > 0 ? `Ver/Alterar Fotos (${selectedCardIds.length})` : '🖼️ Abrir Grade de Fotos'}</span>
              </button>
            </div>

            {/* Quick Card Selector Dropdown */}
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedCardIds.length === 1 ? selectedCardIds[0] : selectedCardIds.length > 1 ? 'multiple' : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    handleClearSelectedCards();
                  } else if (val === 'multiple') {
                    setShowCardPickerModal(true);
                  } else {
                    setSelectedCardIds([val]);
                  }
                }}
                className="w-full bg-[#15181E] border border-[#1F2229] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#A88B4B] transition-colors"
              >
                <option value="">🚫 Sem Card (Enviar apenas Texto)</option>
                {savedCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    📸 {c.title} ({c.category || 'Geral'})
                  </option>
                ))}
                {savedCards.length > 1 && (
                  <option value="multiple">
                    🎲 Selecionar Múltiplos Cards (Envio Aleatório)
                  </option>
                )}
              </select>
            </div>

            {selectedCardIds.length === 0 ? (
              <div 
                onClick={() => setShowCardPickerModal(true)}
                className="border-2 border-dashed border-[#1F2229] hover:border-[#A88B4B]/50 p-3 rounded-lg text-center cursor-pointer transition-all bg-[#15181E]/50"
              >
                <p className="text-xs text-gray-400 font-medium">Nenhum card selecionado. Clique aqui para anexar uma foto.</p>
              </div>
            ) : selectedCardIds.length === 1 ? (
              <div className="flex items-center justify-between bg-[#15181E] p-2.5 rounded-lg border border-[#A88B4B]/40 gap-2">
                {(() => {
                  const c = savedCards.find(card => card.id === selectedCardIds[0]);
                  if (!c) return <span className="text-xs text-gray-400">Card ID: {selectedCardIds[0]}</span>;
                  return (
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <img src={c.imageUrl} alt={c.title} className="w-12 h-12 object-cover rounded-lg border border-[#1F2229] shrink-0" />
                      <div className="text-xs min-w-0 flex-1">
                        <p className="font-bold text-white truncate">📸 {c.title}</p>
                        <p className="text-[10px] text-[#A88B4B] truncate">Categoria: {c.category || 'Geral'}</p>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCardPickerModal(true)}
                    className="bg-[#A88B4B]/20 hover:bg-[#A88B4B]/30 text-[#A88B4B] px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all"
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelectedCards}
                    className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-[#15181E] p-3 rounded-lg border border-[#A88B4B]">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-[#A88B4B] font-bold">🎲 Modo Envio Aleatório:</span>
                  <span className="text-white font-bold">{selectedCardIds.length} cards selecionados</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCardPickerModal(true)}
                  className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Ver / Editar Cards
                </button>
              </div>
            )}
          </div>

          {/* Contacts Summary */}
          <div className="p-4 bg-[#0A0C10] border border-[#1F2229] rounded-xl flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#A88B4B]" />
              <span>Contatos Selecionados: <strong className="text-white">{campaign.contactIds.length} destinatários</strong></span>
            </div>
            {campaign.cardTitle && (
              <span className="bg-[#A88B4B]/10 text-[#A88B4B] px-2 py-0.5 rounded border border-[#A88B4B]/30 font-semibold truncate max-w-[180px]">
                Card: {campaign.cardTitle}
              </span>
            )}
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center justify-center space-x-2 animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>Agendamento e partes atualizadas com sucesso!</span>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="p-3.5 bg-red-950/60 border border-red-500/50 rounded-xl text-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-red-200 animate-fadeIn">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Tem certeza que deseja excluir o agendamento <strong>"{campaign.title}"</strong>?</span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-[#0A0C10] hover:bg-[#1A1D23] text-gray-300 rounded-lg border border-[#2A2D35] font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-600/30 transition-all flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Excluir</span>
                </button>
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="pt-4 border-t border-[#1F2229] flex flex-col sm:flex-row items-center justify-between gap-3">
            {!showDeleteConfirm ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 hover:border-red-500/60 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir</span>
                </button>
                {onAdvanceCampaign && campaign && (
                  <button
                    type="button"
                    onClick={() => {
                      onAdvanceCampaign(campaign.id, 60);
                      setSavedSuccess(true);
                      setTimeout(() => {
                        onClose();
                      }, 500);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#A88B4B]/10 hover:bg-[#A88B4B]/20 text-[#A88B4B] border border-[#A88B4B]/30 hover:border-[#A88B4B]/60 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                    title="Adiantar este agendamento e todos os subsequentes em 1 hora"
                  >
                    <FastForward className="w-4 h-4 text-[#A88B4B]" />
                    <span>Adiantar 1h (este e subsequentes)</span>
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#0A0C10] hover:bg-[#1A1D23] text-gray-300 border border-[#1F2229] rounded-xl text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg shadow-[#A88B4B]/20"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Card Picker Modal */}
      {showCardPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#1F2229] bg-[#0A0C10] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#A88B4B]/10 text-[#A88B4B] rounded-xl border border-[#A88B4B]/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif italic text-white text-lg">Selecionar Cards / Imagens para o Disparo</h3>
                  <p className="text-xs text-gray-400">Escolha um card para envio fixo ou vários cards para sorteio aleatório a cada contato.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCardPickerModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1A1D23] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#0A0C10]/60 border-b border-[#1F2229] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllCards}
                  className="bg-[#1A1D23] hover:bg-[#A88B4B]/20 text-[#A88B4B] px-3.5 py-1.5 rounded text-xs font-bold border border-[#2A2D35] transition-all"
                >
                  Selecionar Todos ({savedCards.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearSelectedCards}
                  className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-3.5 py-1.5 rounded text-xs font-bold border border-red-500/30 transition-all"
                >
                  Desmarcar Todos
                </button>
              </div>

              <div className="text-xs text-gray-300 font-medium flex items-center space-x-2">
                <span className="bg-[#A88B4B] text-[#0A0C10] px-2.5 py-0.5 rounded font-black text-[11px]">
                  {selectedCardIds.length} selecionado(s)
                </span>
                {selectedCardIds.length > 1 && (
                  <span className="text-[#A88B4B] font-bold text-[11px]">
                    🎲 Modo Envio Aleatório
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {savedCards.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">Nenhum card cadastrado no álbum.</p>
                  <p className="text-xs mt-1">Cadastre seus cards na aba "Álbum de Cards" para utilizá-los aqui.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  <div
                    onClick={handleClearSelectedCards}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center h-44 ${
                      selectedCardIds.length === 0 
                        ? 'bg-[#A88B4B]/20 border-[#A88B4B] ring-2 ring-[#A88B4B] text-white shadow-lg' 
                        : 'bg-[#0A0C10] border-[#1F2229] hover:border-gray-700 text-gray-400'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#15181E] flex items-center justify-center mb-2 text-xl">
                      🚫
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Sem Card</span>
                    <span className="text-[10px] text-gray-500 mt-1">Enviar apenas texto</span>
                  </div>

                  {savedCards.map((card) => {
                    const isSelected = selectedCardIds.includes(card.id);
                    const selectedIndex = selectedCardIds.indexOf(card.id);

                    return (
                      <div
                        key={card.id}
                        onClick={() => handleToggleCardSelection(card.id)}
                        className={`rounded-xl border cursor-pointer transition-all overflow-hidden flex flex-col group relative ${
                          isSelected
                            ? 'bg-[#A88B4B]/20 border-[#A88B4B] ring-2 ring-[#A88B4B] shadow-lg'
                            : 'bg-[#0A0C10] border-[#1F2229] hover:border-[#A88B4B]/50'
                        }`}
                      >
                        <div className="h-32 w-full overflow-hidden bg-black/40 relative">
                          <img
                            src={card.imageUrl}
                            alt={card.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {isSelected ? (
                            <div className="absolute top-2 right-2 bg-[#A88B4B] text-[#0A0C10] text-[10px] font-black px-2 py-0.5 rounded shadow flex items-center space-x-1">
                              <span>✓</span>
                              <span>{selectedCardIds.length > 1 ? `#${selectedIndex + 1}` : 'SELECIONADO'}</span>
                            </div>
                          ) : (
                            <div className="absolute top-2 right-2 bg-[#0A0C10]/80 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                              Clique para Selecionar
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between bg-[#15181E]">
                          <div>
                            <span className="text-[9px] font-bold text-[#A88B4B] uppercase tracking-widest block mb-0.5">
                              {card.category || 'Geral'}
                            </span>
                            <h4 className="font-serif italic text-xs text-white line-clamp-1">{card.title}</h4>
                          </div>
                          <div className="mt-2 flex items-center justify-end pt-2 border-t border-[#1F2229]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewZoom(1);
                                setPreviewModalCard(card);
                              }}
                              className="text-[10px] bg-[#0A0C10] hover:bg-amber-950/70 border border-[#1F2229] hover:border-amber-500 text-amber-400 px-2 py-1 rounded flex items-center space-x-1 transition-all"
                              title="Usar Lupa (Ver por Inteiro)"
                            >
                              <Search className="w-3 h-3" />
                              <span>Lupa</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#0A0C10] border-t border-[#1F2229] flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">
                {selectedCardIds.length === 0
                  ? 'Nenhum card selecionado (disparo apenas texto)'
                  : selectedCardIds.length === 1
                  ? '1 card selecionado (envio fixo)'
                  : `🎲 ${selectedCardIds.length} cards selecionados (serão sorteados aleatoriamente)`}
              </span>
              <button
                type="button"
                onClick={() => setShowCardPickerModal(false)}
                className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] font-black px-6 py-2.5 rounded text-xs uppercase tracking-widest transition-all shadow-lg"
              >
                Concluir Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal (Lupa) */}
      {previewModalCard && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewModalCard(null)}>
          <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F2229] pb-3 shrink-0 relative z-10 bg-[#15181E] gap-3">
              <div className="flex items-center space-x-2 w-full sm:w-auto overflow-hidden">
                <Search className="w-5 h-5 text-[#A88B4B] shrink-0" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider truncate">
                  {previewModalCard.title} — Lupa
                </h3>
              </div>
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-2">
                <div className="flex items-center bg-[#0A0C10] border border-[#1F2229] rounded p-1 space-x-1">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.25))}
                    className="p-1 text-gray-300 hover:text-white hover:bg-[#15181E] rounded"
                    title="Diminuir Zoom"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-amber-400 font-mono px-2 font-bold">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(Math.min(3, previewZoom + 0.25))}
                    className="p-1 text-gray-300 hover:text-white hover:bg-[#15181E] rounded"
                    title="Aumentar Zoom (Lupa)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(1)}
                    className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5 border-l border-[#1F2229]"
                  >
                    Reset
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewModalCard(null)}
                  className="text-gray-400 hover:text-white p-1 bg-[#0A0C10] rounded border border-[#1F2229]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-[#0A0C10] p-4 rounded-xl flex items-center justify-center overflow-auto flex-1 min-h-[400px] relative">
              <img
                src={previewModalCard.imageUrl}
                alt={previewModalCard.title}
                style={{ transform: `scale(${previewZoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
                className="max-h-[70vh] object-contain rounded-lg shadow-2xl cursor-zoom-in"
                onClick={() => setPreviewZoom(previewZoom === 1 ? 1.75 : 1)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 shrink-0 border-t border-[#1F2229] relative z-10 bg-[#15181E] gap-3">
              <span className="text-[11px] text-gray-400 text-center sm:text-left leading-tight">
                💡 Dica: Clique na imagem para zoom.
              </span>
              <div className="flex space-x-2 justify-center sm:justify-end w-full sm:w-auto">
                <a
                  href={previewModalCard.imageUrl}
                  download={`${previewModalCard.title.toLowerCase().replace(/\s+/g, '_')}.png`}
                  className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-4 py-2 rounded font-bold text-xs uppercase tracking-widest flex items-center space-x-2 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Imagem</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Topic Picker Modal */}
      {showTopicPickerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#1F2229] bg-[#0A0C10] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#A88B4B]/10 text-[#A88B4B] rounded-xl border border-[#A88B4B]/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif italic text-white text-lg">Selecionar Tópico de Mensagem</h3>
                  <p className="text-xs text-gray-400">Escolha um tópico para carregar o modelo de mensagem no agendamento.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowTopicPickerModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1A1D23] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filters & Search */}
            <div className="p-4 bg-[#0A0C10]/60 border-b border-[#1F2229] flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={topicSearchQuery}
                  onChange={(e) => setTopicSearchQuery(e.target.value)}
                  placeholder="Pesquisar tópico por título ou conteúdo..."
                  className="w-full bg-[#15181E] border border-[#262629] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#A88B4B]"
                />
              </div>

              {/* Categories Filter */}
              <select
                value={topicCategoryFilter}
                onChange={(e) => setTopicCategoryFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#15181E] border border-[#262629] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
              >
                <option value="all">Todas as Categorias</option>
                {familyGroupedTopics.map(([family, topicList]) => (
                  <optgroup key={`modal_fam_${family}`} label={`📂 ${family}`}>
                    {topicList.map(({ category }) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* List of Topics */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {topicCategoryFilter !== 'all' && (
                <div
                  onClick={() => {
                    handleSelectTopicCategory(topicCategoryFilter);
                    setShowTopicPickerModal(false);
                  }}
                  className="p-3.5 bg-[#A88B4B]/20 hover:bg-[#A88B4B]/30 border border-[#A88B4B] rounded-xl cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#A88B4B]" />
                    <span className="text-xs font-bold text-white">
                      Usar Todo o Tópico <strong className="text-[#A88B4B]">"{topicCategoryFilter}"</strong> com Envio Aleatório (Sorteio)
                    </span>
                  </div>
                  <span className="text-[11px] bg-[#A88B4B] text-black font-black px-2.5 py-1 rounded-lg uppercase">
                    Ativar Envio Aleatório
                  </span>
                </div>
              )}
              {availableTemplates
                .filter(tmpl => {
                  const matchesCat = topicCategoryFilter === 'all' || (tmpl.category || 'Geral') === topicCategoryFilter;
                  const q = topicSearchQuery.toLowerCase();
                  const matchesQuery = !q || tmpl.title.toLowerCase().includes(q) || tmpl.content.toLowerCase().includes(q);
                  return matchesCat && matchesQuery;
                })
                .map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        handleSelectTopic(tmpl);
                        setShowTopicPickerModal(false);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-[#A88B4B]/15 border-[#A88B4B] ring-1 ring-[#A88B4B]'
                          : 'bg-[#0A0C10] border-[#1F2229] hover:border-[#A88B4B]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] bg-[#A88B4B]/20 text-[#A88B4B] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {tmpl.category || 'Geral'}
                          </span>
                          <h4 className="text-sm font-bold text-white">{tmpl.title}</h4>
                        </div>
                        {isSelected && (
                          <span className="text-xs bg-[#A88B4B] text-black font-black px-2 py-0.5 rounded">
                            SELECIONADO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed line-clamp-3 bg-[#15181E] p-2.5 rounded-lg border border-[#1F2229]">
                        {tmpl.content}
                      </p>
                      <div className="flex items-center justify-end">
                        <span className="text-xs text-[#A88B4B] font-bold hover:underline flex items-center gap-1">
                          Usar este Tópico <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-4 bg-[#0A0C10] border-t border-[#1F2229] flex justify-end">
              <button
                type="button"
                onClick={() => setShowTopicPickerModal(false)}
                className="bg-[#15181E] hover:bg-[#1A1D23] text-gray-300 border border-[#262629] px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

