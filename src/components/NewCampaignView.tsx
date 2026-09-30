import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  EyeOff,
  Sparkles,
  Car,
  Bike,
  Star,
  Calendar,
  SkipForward,
  AlertCircle,
  CheckSquare,
  Clock,
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  Smartphone,
  X,
  RefreshCw,
  Shuffle,
  Zap,
  Ban,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Contact, MessageTemplate, ScheduledCampaign, ContactGroup, CardItem, DispatchLogItem } from '../types';
import { replaceTemplateVariables, formatPhoneDisplay, safeConfirm, cleanChipName, matchPhoneNumber, matchContact, isCategorySimilar } from '../utils/whatsapp';
import { isContactedToday, getSettings, loadFromStorage } from '../utils/storage';
import { isContactSkipped, isNotSentInLastThreeDays, getRegisteredChipForGroup } from '../utils/rules';
import { parseLocalDatetimeString, toDatetimeLocal, getTodayDateLocal, isWithinBusinessHours, clampDateToBusinessHours, advanceNextBusinessSlot } from '../utils/dateParser';
import { TimeSelect } from './TimeSelect';


interface NewCampaignViewProps {
  contacts: Contact[];
  templates: MessageTemplate[];
  groups: ContactGroup[];
  campaigns?: ScheduledCampaign[];
  logs?: DispatchLogItem[];
  defaultInterval: number;
  defaultSendMode: 'whatsapp_desktop' | 'webhook';
  onScheduleCampaign: (campaign: ScheduledCampaign | ScheduledCampaign[]) => void;
  onNavigate: (tab: string) => void;
}

function getContactLastSentTimestamp(contact: Contact, logs: DispatchLogItem[]): number {
  let latest = 0;
  if (logs && logs.length > 0) {
    logs.forEach(l => {
      if (l.status === 'enviado' && (l.contactId === contact.id || l.phone === contact.phone)) {
        if (l.sentAt) {
          const t = new Date(l.sentAt).getTime();
          if (!isNaN(t) && t > latest) latest = t;
        } else if (l.id) {
          const match = l.id.match(/log_(\d+)/);
          if (match) {
            const t = parseInt(match[1]);
            if (!isNaN(t) && t > latest) latest = t;
          }
        }
      }
    });
  }
  if (latest === 0 && contact.lastContactedDate) {
    const d = new Date(contact.lastContactedDate).getTime();
    if (!isNaN(d) && d > 0) latest = d;
  }
  return latest;
}

export const NewCampaignView: React.FC<NewCampaignViewProps> = React.memo(({
  contacts,
  templates,
  groups,
  campaigns = [],
  logs = [],
  defaultInterval,
  defaultSendMode,
  onScheduleCampaign,
  onNavigate,
}) => {
  // Load draft data synchronously during initialization
  const [draft] = useState(() => {
    try {
      const item = localStorage.getItem('zap_campaign_draft_v1');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  });

  const isFinishing = React.useRef(false);

  const [step, setStep] = useState<number>(() => draft?.step ?? 1);

  // Auto-scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const scrollToBottom = () => {
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  // Step 1
  const [title, setTitle] = useState<string>(() => draft?.title ?? '');
  const [isTitleUserEdited, setIsTitleUserEdited] = useState<boolean>(false);
  const [selectedGroup, setSelectedGroup] = useState<string>(() => draft?.selectedGroup ?? 'all');
  const [selectedChipFilter, setSelectedChipFilter] = useState<string>(() => draft?.selectedChipFilter ?? 'all');
  const [contactSearchTerm, setContactSearchTerm] = useState<string>('');
  const settings = getSettings();
  const hideContactedToday = settings.hideContactedToday ?? false;
  const showOnlySkipped = settings.showOnlySkipped ?? false;
  const sortSkippedFirst = settings.sortSkippedFirst ?? true;
  const sortThreeDaysUnsentFirst = settings.sortThreeDaysUnsentFirst ?? true;
  const sortOldestContactedFirst = settings.sortOldestContactedFirst ?? true;
  const hideAlreadyScheduled = settings.hideAlreadyScheduled ?? false;

  // Compute available contacts immediately (exclude contacts already in scheduled or in-progress campaigns)
  const activeCampaigns = campaigns.filter(
    c => c.status === 'agendado' || c.status === 'em_andamento'
  );
  const scheduledContactIdsSet = React.useMemo(() => new Set(
    activeCampaigns.flatMap(c => c.contactIds || [])
  ), [campaigns]);

  const availableContacts = React.useMemo(() => {
    return contacts
      .sort((a, b) => {
        if (sortSkippedFirst) {
          const skippedA = isContactSkipped(a, logs);
          const skippedB = isContactSkipped(b, logs);
          if (skippedA && !skippedB) return -1;
          if (!skippedA && skippedB) return 1;
        }
        if (sortThreeDaysUnsentFirst) {
          const notSentA = isNotSentInLastThreeDays(a, logs);
          const notSentB = isNotSentInLastThreeDays(b, logs);
          if (notSentA && !notSentB) return -1;
          if (!notSentA && notSentB) return 1;
        }
        if (sortOldestContactedFirst) {
          const timeA = getContactLastSentTimestamp(a, logs);
          const timeB = getContactLastSentTimestamp(b, logs);
          if (timeA === 0 && timeB > 0) return -1;
          if (timeA > 0 && timeB === 0) return 1;
          if (timeA !== timeB) return timeA - timeB;
        }
        if (sortOldestContactedFirst) {
          const timeA = getContactLastSentTimestamp(a, logs);
          const timeB = getContactLastSentTimestamp(b, logs);
          if (timeA === 0 && timeB > 0) return -1;
          if (timeA > 0 && timeB === 0) return 1;
          if (timeA !== timeB) return timeA - timeB;
        }
        // Give preference to NOT scheduled contacts
        const schedA = scheduledContactIdsSet.has(a.id);
        const schedB = scheduledContactIdsSet.has(b.id);
        if (!schedA && schedB) return -1;
        if (schedA && !schedB) return 1;

        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      });
  }, [contacts, scheduledContactIdsSet, logs, sortSkippedFirst, sortThreeDaysUnsentFirst, sortOldestContactedFirst, hideAlreadyScheduled]);

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(() =>
    draft?.selectedContactIds ?? availableContacts.filter(c => !isContactedToday(c) && !scheduledContactIdsSet.has(c.id)).map(c => c.id)
  );

  const chipsList = getSettings().chips || [
    { id: 'chip_1', name: 'Business' },
    { id: 'chip_2', name: 'Support' }
  ];
  const chipMemorySuggestion = React.useMemo(() => {
    if (selectedContactIds.length === 0 || !logs || logs.length === 0) return null;
    const counts = new Map<string, { count: number; name: string; lastUsed: number }>();
    logs.forEach(l => {
      if (l.status === 'enviado' && l.chipId && (l.contactId && selectedContactIds.includes(l.contactId) || l.phone)) {
        const match = contacts.find(c => c.id === l.contactId || c.phone === l.phone);
        if (match && selectedContactIds.includes(match.id)) {
          const entry = counts.get(l.chipId) || { count: 0, name: l.chipName || l.chipId, lastUsed: 0 };
          entry.count++;
          const t = l.sentAt ? new Date(l.sentAt).getTime() : 0;
          if (t > entry.lastUsed) entry.lastUsed = t;
          counts.set(l.chipId, entry);
        }
      }
    });
    let bestId = '';
    let bestScore = -1;
    let bestName = '';
    counts.forEach((val, id) => {
      const score = val.count * 1000 + val.lastUsed;
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
        bestName = val.name;
      }
    });
    return bestId ? { chipId: bestId, chipName: bestName } : null;
  }, [selectedContactIds, logs, contacts]);


  const handleSelectAllSkipped = () => {
    const skippedIds = availableContacts.filter(c => isContactSkipped(c, logs)).map(c => c.id);
    if (skippedIds.length === 0) {
      alert('Nenhum contato pulado encontrado atualmente.');
      return;
    }
    setSelectedContactIds(Array.from(new Set([...selectedContactIds, ...skippedIds])));
  };

  // Step 2
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(() => {
    if (draft?.selectedTemplateIds && Array.isArray(draft.selectedTemplateIds)) {
      return draft.selectedTemplateIds;
    }
    if (draft?.selectedTemplateId && !draft.selectedTemplateId.startsWith('topic_cat_')) {
      return [draft.selectedTemplateId];
    }
    return [];
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => draft?.selectedTemplateId ?? '');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(() => draft?.selectedCategoryName ?? '');
  const [randomTopicTemplates, setRandomTopicTemplates] = useState<string[]>(() => draft?.randomTopicTemplates ?? []);
  const [customContent, setCustomContent] = useState<string>(() => draft?.customContent ?? '');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [expandedTopicMessages, setExpandedTopicMessages] = useState<Record<string, boolean>>({});

  const toggleTopicExpanded = (category: string) => {
    setExpandedTopicMessages(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Step 3
  const [useVariations, setUseVariations] = useState<boolean>(() => draft?.useVariations ?? true);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(() => {
    if (draft?.selectedCardIds && Array.isArray(draft.selectedCardIds)) {
      return draft.selectedCardIds;
    }
    if (draft?.selectedCardId) {
      return [draft.selectedCardId];
    }
    return [];
  });
  const selectedCardId = selectedCardIds[0] || '';
  const setSelectedCardId = (id: string) => {
    if (!id) setSelectedCardIds([]);
    else setSelectedCardIds([id]);
  };

  const handleToggleCardSelection = (cardId: string) => {
    if (selectedCardIds.includes(cardId)) {
      setSelectedCardIds(selectedCardIds.filter(id => id !== cardId));
    } else {
      setSelectedCardIds([...selectedCardIds, cardId]);
    }
  };

  const [previewModalCard, setPreviewModalCard] = useState<CardItem | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const savedCards = loadFromStorage<CardItem[]>('gkd_cards_album_v1', []);

  const [showOnlySimilarCards, setShowOnlySimilarCards] = useState<boolean>(true);

  const similarCards = React.useMemo(() => {
    if (!selectedGroup || selectedGroup === 'all' || selectedGroup === 'sem_campanha') {
      return [];
    }
    return savedCards.filter(
      c => isCategorySimilar(c.category, selectedGroup) || isCategorySimilar(c.title, selectedGroup)
    );
  }, [savedCards, selectedGroup]);

  const displayCards = React.useMemo(() => {
    if (!selectedGroup || selectedGroup === 'all' || selectedGroup === 'sem_campanha' || similarCards.length === 0) {
      return savedCards;
    }
    if (showOnlySimilarCards) {
      return similarCards;
    }
    return [...savedCards].sort((a, b) => {
      const matchA = isCategorySimilar(a.category, selectedGroup) || isCategorySimilar(a.title, selectedGroup);
      const matchB = isCategorySimilar(b.category, selectedGroup) || isCategorySimilar(b.title, selectedGroup);
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return a.title.localeCompare(b.title, 'pt-BR');
    });
  }, [savedCards, selectedGroup, similarCards, showOnlySimilarCards]);

  const handleSelectAllCards = () => {
    setSelectedCardIds(displayCards.map(c => c.id));
  };

  const handleClearSelectedCards = () => {
    setSelectedCardIds([]);
  };
  const getLocal10MinAhead = () => {
    const raw = new Date(Date.now() + 10 * 60 * 1000);
    const d = clampDateToBusinessHours(raw);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  const defaultScheduledTime = getLocal10MinAhead();
  const [schedules, setSchedules] = useState<{ id: string; datetime: string; limit: number | '' | string }[]>(() => {
    if (draft?.schedules && draft.schedules.length > 0) {
      return draft.schedules.map(sch => {
        const dt = parseLocalDatetimeString(sch.datetime).getTime();
        if (isNaN(dt) || dt < Date.now()) {
          return { ...sch, datetime: getLocal10MinAhead() };
        }
        return sch;
      });
    }
    return [
      { id: `sch_${Date.now()}`, datetime: defaultScheduledTime, limit: '' }
    ];
  });
  const [intervalSeconds, setIntervalSeconds] = useState<number>(() => draft?.intervalSeconds ?? (defaultInterval || 8));
  const [sendMode, setSendMode] = useState<'whatsapp_desktop' | 'webhook'>(() => draft?.sendMode ?? defaultSendMode);
  const [selectedChipId, setSelectedChipId] = useState<string>(() => draft?.selectedChipId ?? '');

  // Cancel Handler
  const handleCancelDraft = () => {
    if (safeConfirm('Deseja realmente cancelar este agendamento e voltar ao painel? Todos os dados não salvos serão perdidos.')) {
      isFinishing.current = true;
      localStorage.removeItem('zap_campaign_draft_v1');
      onNavigate('dashboard');
    }
  };

  // Effect to automatically save state to local storage draft
  React.useEffect(() => {
    if (isFinishing.current) return;
    const draftData = {
      step,
      title,
      selectedGroup,
      hideContactedToday,
      showOnlySkipped,
      sortSkippedFirst,
      sortThreeDaysUnsentFirst,
      sortOldestContactedFirst,
      hideAlreadyScheduled,
      selectedContactIds,
      selectedTemplateId,
      selectedTemplateIds,
      selectedCategoryName,
      randomTopicTemplates,
      customContent,
      useVariations,
      selectedCardId,
      selectedCardIds,
      schedules,
      intervalSeconds,
      sendMode,
      selectedChipId
    };
    try {
      localStorage.setItem('zap_campaign_draft_v1', JSON.stringify(draftData));
    } catch (e) {
      console.error('Failed to save campaign draft:', e);
    }
  }, [
    step,
    title,
    selectedGroup,
    hideContactedToday,
    showOnlySkipped,
    sortSkippedFirst,
    sortThreeDaysUnsentFirst,
    sortOldestContactedFirst,
    hideAlreadyScheduled,
    selectedContactIds,
    selectedTemplateId,
    selectedTemplateIds,
    selectedCategoryName,
    randomTopicTemplates,
    customContent,
    useVariations,
    selectedCardId,
    selectedCardIds,
    schedules,
    intervalSeconds,
    sendMode,
    selectedChipId
  ]);

  // Dynamically calculate assigned contacts per schedule based on their limit values
  const distributedSchedules = React.useMemo(() => {
    let remainingIds = [...selectedContactIds];
    return schedules.map((sch, idx) => {
      if (remainingIds.length === 0) {
        return { ...sch, contactIds: [] };
      }

      const parsedLimit = typeof sch.limit === 'string' ? parseInt(sch.limit, 10) : sch.limit;
      let limitForThisSlot: number;

      if (parsedLimit && !isNaN(parsedLimit) && parsedLimit > 0) {
        limitForThisSlot = parsedLimit;
      } else {
        // Count remaining schedules from this position onwards that do not have a fixed limit
        const remainingWithoutLimit = schedules.slice(idx).filter(s => {
          const l = typeof s.limit === 'string' ? parseInt(s.limit, 10) : s.limit;
          return !l || isNaN(l) || l <= 0;
        }).length;

        limitForThisSlot = Math.max(1, Math.ceil(remainingIds.length / (remainingWithoutLimit || 1)));
      }

      const assignedIds = remainingIds.slice(0, limitForThisSlot);
      remainingIds = remainingIds.slice(limitForThisSlot);

      return {
        ...sch,
        contactIds: assignedIds,
      };
    });
  }, [schedules, selectedContactIds]);

  const remainingCount = selectedContactIds.length - distributedSchedules.reduce((sum, s) => sum + s.contactIds.length, 0);

  // Filtered contacts
  const filteredContacts = (contactSearchTerm.trim() ? contacts : availableContacts).filter((c) => {
    const term = contactSearchTerm.trim();
    
    // When actively searching a contact, bypass filters to find anywhere
    if (term) {
      return matchContact(c, term);
    }

    const matchesGrp = selectedGroup === "all" || (() => {
      const gLower = selectedGroup.trim().toLowerCase();
      const cGrp = (c.group || "Agenda de Contatos").trim().toLowerCase();
      
      // Basic comparison
      if (cGrp === gLower) return true;
      
      // Virtual/Special groups
      if (selectedGroup === 'sem_campanha') {
        return cGrp.includes('sem campanha') || cGrp.includes('agenda de contatos') || !c.group;
      }
      
      const successfulCount = logs.filter(l => l.contactId === c.id && l.status === "enviado").length;
      if (gLower === "0 envio" || gLower === "0envio") return successfulCount === 0;
      if (gLower === "1 envio" || gLower === "1envio") return successfulCount === 1;
      if (gLower === "2 envio" || gLower === "2envio") return successfulCount === 2;
      if (gLower === "3 envio" || gLower === "3envio") return successfulCount === 3;
      if (gLower === "4 envio" || gLower === "4envio") return successfulCount === 4;
      if (gLower === "5 envios" || gLower === "5envio") return successfulCount === 5;
      if (gLower === "6 envios" || gLower.includes("6+")) return successfulCount >= 6;
      if (gLower === "4 envios" || gLower.includes("4+")) return successfulCount >= 4;
      
      // Robust normalized comparison for user groups
      const normalize = (s: string) => s.replace(/[\s\-\/_]/g, '').toLowerCase();
      return normalize(cGrp) === normalize(gLower);
    })();

    // When a specific group is selected, we bypass some restrictive filters to ensure contacts are "pulled" as expected
    const isSpecificGroup = selectedGroup !== 'all';
    
    // Default funnel filter from settings
    const defaultFunnel = getSettings().defaultFunnel || 'all';
    let matchesFunnel = true;
    if (defaultFunnel !== 'all' && !isSpecificGroup) {
      const successfulCount = logs.filter(l => l.contactId === c.id && l.status === "enviado").length;
      const fLower = defaultFunnel.trim().toLowerCase();
      if (fLower === "0º envio" || fLower === "0° envio" || fLower.includes("0º") || fLower.includes("0°")) matchesFunnel = successfulCount === 0;
      else if (fLower === "1º envio" || fLower === "1° envio" || fLower.includes("1º") || fLower.includes("1°")) matchesFunnel = successfulCount === 1;
      else if (fLower === "2º envio" || fLower === "2° envio" || fLower.includes("2º") || fLower.includes("2°")) matchesFunnel = successfulCount === 2;
      else if (fLower === "3º envio" || fLower === "3° envio" || fLower.includes("3º") || fLower.includes("3°")) matchesFunnel = successfulCount === 3;
      else if (fLower === "4+ envios" || fLower.includes("4+")) matchesFunnel = successfulCount >= 4;
    }
    
    // Chip filter - also bypassed if specific group is selected to avoid hiding matches
    const matchesChipFilter = (selectedChipFilter === 'all' || isSpecificGroup) ? true : 
                             selectedChipFilter === 'unassigned' ? !c.chipId : 
                             c.chipId === selectedChipFilter;

    // Contacted today filter
    if (hideContactedToday && isContactedToday(c) && !isSpecificGroup) return false;

    // Already scheduled filter - also bypassed if specific group is selected
    if (hideAlreadyScheduled && scheduledContactIdsSet.has(c.id) && !isSpecificGroup) return false;
    
    const isSkipped = isContactSkipped(c, logs);
    const matchesSkippedOnly = !showOnlySkipped || isSkipped;

    return matchesGrp && matchesChipFilter && matchesSkippedOnly && matchesFunnel;
  }).sort((a, b) => {
    if (sortSkippedFirst) {
      const skippedA = isContactSkipped(a, logs);
      const skippedB = isContactSkipped(b, logs);
      if (skippedA && !skippedB) return -1;
      if (!skippedA && skippedB) return 1;
    }
    if (sortThreeDaysUnsentFirst) {
      const notSentA = isNotSentInLastThreeDays(a, logs);
      const notSentB = isNotSentInLastThreeDays(b, logs);
      if (notSentA && !notSentB) return -1;
      if (!notSentA && notSentB) return 1;
    }
    if (sortOldestContactedFirst) {
      const timeA = getContactLastSentTimestamp(a, logs);
      const timeB = getContactLastSentTimestamp(b, logs);
      if (timeA === 0 && timeB > 0) return -1;
      if (timeA > 0 && timeB === 0) return 1;
      if (timeA !== timeB) return timeA - timeB;
    }
    // Give preference to NOT scheduled contacts
    const schedA = scheduledContactIdsSet.has(a.id);
    const schedB = scheduledContactIdsSet.has(b.id);
    if (!schedA && schedB) return -1;
    if (schedA && !schedB) return 1;

    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });

  // Group filtered contacts by chipId
  const contactsByChip = React.useMemo(() => {
    const map = new Map<string, typeof filteredContacts>();
    filteredContacts.forEach(c => {
      const chipKey = c.chipId || 'unassigned';
      const list = map.get(chipKey) || [];
      list.push(c);
      map.set(chipKey, list);
    });
    return map;
  }, [filteredContacts]);

  // Helper to generate automatic campaign title based on list/category and chip
  const getAutoTitle = React.useCallback((
    group: string,
    chipFilter: string,
    chipIdSelect: string,
    allContacts: Contact[],
    selectedIds: string[] = []
  ): string => {
    let groupDisplayName = '';

    if (group && group !== 'all' && group !== 'sem_campanha') {
      groupDisplayName = group.trim();
    } else if (group === 'sem_campanha') {
      groupDisplayName = 'Sem Campanha';
    } else {
      // If group is 'all' or empty, inspect selected contacts or available contacts to find dominant group name
      const contactsToInspect = selectedIds.length > 0 
        ? allContacts.filter(c => selectedIds.includes(c.id))
        : allContacts;

      const groupCounts: Record<string, number> = {};
      contactsToInspect.forEach(c => {
        const grp = (c.group || '').trim();
        if (grp && grp !== 'Agenda de Contatos' && grp !== 'Geral' && !grp.toLowerCase().includes('sem campanha')) {
          groupCounts[grp] = (groupCounts[grp] || 0) + 1;
        }
      });

      let maxCount = 0;
      let dominantGroup = '';
      Object.entries(groupCounts).forEach(([grp, cnt]) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          dominantGroup = grp;
        }
      });

      if (dominantGroup) {
        groupDisplayName = dominantGroup;
      } else {
        groupDisplayName = 'Todas as Listas';
      }
    }

    const chips = getSettings().chips || [
      { id: 'chip_1', name: 'Business' },
      { id: 'chip_2', name: 'Suporte' }
    ];

    let activeChipId = chipIdSelect || (chipFilter !== 'all' ? chipFilter : '');
    
    if (!activeChipId || activeChipId === 'all') {
      const registeredChip = getRegisteredChipForGroup(groupDisplayName !== 'Todas as Listas' ? groupDisplayName : group, allContacts);
      if (registeredChip && registeredChip !== 'all') {
        activeChipId = registeredChip;
      }
    }

    let chipDisplayName = '';
    if (activeChipId === 'unassigned') {
      chipDisplayName = 'Sem Chip';
    } else if (activeChipId && activeChipId !== 'all') {
      const chipObj = chips.find(c => c.id === activeChipId);
      if (chipObj) {
        chipDisplayName = cleanChipName(chipObj.name);
      }
    }

    if (!chipDisplayName) {
      const fallbackChipId = getRegisteredChipForGroup(groupDisplayName, allContacts);
      const chipObj = chips.find(c => c.id === fallbackChipId) || chips[0];
      if (chipObj) {
        chipDisplayName = cleanChipName(chipObj.name);
      }
    }

    if (groupDisplayName && chipDisplayName) {
      return `${groupDisplayName} / ${chipDisplayName}`;
    } else if (groupDisplayName) {
      return groupDisplayName;
    } else {
      return `Disparo / ${chipDisplayName || 'Suporte'}`;
    }
  }, []);

  // Sync automatic title whenever group, chip filter, chip selector, or contacts change (unless manually edited)
  useEffect(() => {
    if (!isTitleUserEdited) {
      const auto = getAutoTitle(selectedGroup, selectedChipFilter, selectedChipId, availableContacts, selectedContactIds);
      if (auto) setTitle(auto);
    }
  }, [selectedGroup, selectedChipFilter, selectedChipId, availableContacts, selectedContactIds, isTitleUserEdited, getAutoTitle]);

  const handleGroupChange = (grp: string) => {
    setSelectedGroup(grp);
    setIsTitleUserEdited(false);
    
    // Reset secondary filters
    setSelectedChipFilter('all');
    
    // Automatic selection of the contacts belonging to the new group
    // We calculate the filtered set immediately to update selection state
    const nextFiltered = (contactSearchTerm.trim() ? contacts : availableContacts).filter((c) => {
      const gLower = grp.trim().toLowerCase();
      const cGrp = (c.group || "Agenda de Contatos").trim().toLowerCase();
      
      if (grp === "all") return true;
      if (grp === 'sem_campanha') {
        return cGrp.includes('sem campanha') || cGrp.includes('agenda de contatos') || !c.group;
      }

      // Special filters (0 envio, 1 envio etc)
      const successfulCount = logs.filter(l => l.contactId === c.id && l.status === "enviado").length;
      if (gLower === "0 envio" || gLower === "0envio") return successfulCount === 0;
      if (gLower === "1 envio" || gLower === "1envio") return successfulCount === 1;
      
      const normalize = (s: string) => s.replace(/[\s\-\/_]/g, '').toLowerCase();
      return normalize(cGrp) === normalize(gLower);
    });

    setSelectedContactIds(nextFiltered.map(c => c.id));
    
    const autoTitle = getAutoTitle(grp, 'all', selectedChipId, availableContacts, selectedContactIds);
    if (autoTitle) setTitle(autoTitle);
  };
  
  const isFirstRender = React.useRef(true);
  
  // Effect to handle initial selection or search term changes (optional logic)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // On first load, only auto-select if no selection exists
      if (selectedContactIds.length === 0 && filteredContacts.length > 0) {
        setSelectedContactIds(filteredContacts.map(c => c.id));
      }
    }
  }, []);

  const handleSelectChipContacts = (chipId: string) => {
    setIsTitleUserEdited(false);
    let nextFilter = selectedChipFilter;
    let nextChipId = selectedChipId;
    if (selectedChipFilter === chipId) {
      nextFilter = 'all';
      setSelectedChipFilter('all');
    } else {
      nextFilter = chipId;
      setSelectedChipFilter(chipId);
      if (chipId !== 'all' && chipId !== 'unassigned') {
        nextChipId = chipId;
        setSelectedChipId(chipId);
      }
    }

    // Automatic selection for the chip
    // Calculate what the filtered list will be
    const nextFiltered = (contactSearchTerm.trim() ? contacts : availableContacts).filter((c) => {
      // Logic from filteredContacts
      const matchesGrp = selectedGroup === "all" || (() => {
        const gLower = selectedGroup.trim().toLowerCase();
        const cGrp = (c.group || "Agenda de Contatos").trim().toLowerCase();
        if (cGrp === gLower) return true;
        if (selectedGroup === 'sem_campanha') return cGrp.includes('sem campanha') || !c.group;
        const normalize = (s: string) => s.replace(/[\s\-\/_]/g, '').toLowerCase();
        return normalize(cGrp) === normalize(gLower);
      })();

      const matchesChip = nextFilter === 'all' || (nextFilter === 'unassigned' ? !c.chipId : c.chipId === nextFilter);
      return matchesGrp && matchesChip;
    });

    setSelectedContactIds(nextFiltered.map(c => c.id));

    const autoTitle = getAutoTitle(selectedGroup, nextFilter, nextChipId, availableContacts, selectedContactIds);
    if (autoTitle) setTitle(autoTitle);
  };

  const handleToggleChipGroup = (chipId: string, chipContacts: Contact[]) => {
    const contactIdsInGroup = chipContacts.map(c => c.id);
    const isAllChipSelected = chipContacts.length > 0 && chipContacts.every(c => selectedContactIds.includes(c.id));
    if (isAllChipSelected) {
      setSelectedContactIds(selectedContactIds.filter(id => !contactIdsInGroup.includes(id)));
    } else {
      const newIds = new Set([...selectedContactIds, ...contactIdsInGroup]);
      setSelectedContactIds(Array.from(newIds));
    }
  };

  const handleSelectAllContacts = (checked: boolean) => {
    if (checked) {
      const newIds = new Set([...selectedContactIds, ...filteredContacts.map(c => c.id)]);
      setSelectedContactIds(Array.from(newIds));
    } else {
      const filteredIds = new Set(filteredContacts.map(c => c.id));
      setSelectedContactIds(selectedContactIds.filter(id => !filteredIds.has(id)));
    }
  };

  const handleToggleContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter(i => i !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  const handleTemplateChange = (id: string) => {
    if (selectedTemplateId === id && selectedTemplateIds.length <= 1) {
      setSelectedTemplateId('');
      setSelectedTemplateIds([]);
      setSelectedCategoryName('');
      setRandomTopicTemplates([]);
      setCustomContent('');
      return;
    }

    const tmpl = templates.find(t => t.id === id);
    if (!tmpl) return;

    setSelectedTemplateId(id);
    setSelectedTemplateIds([id]);
    setSelectedCategoryName('');
    const candidateTexts = [tmpl.content, ...(tmpl.variations || [])].filter((v) => v && v.trim());
    if (candidateTexts.length > 1) {
      setRandomTopicTemplates(candidateTexts);
    } else {
      setRandomTopicTemplates([]);
    }
    setCustomContent(tmpl.content);
    scrollToBottom();
  };

  const handleToggleTemplateSelection = (id: string) => {
    let nextIds: string[];
    if (selectedTemplateIds.includes(id)) {
      nextIds = selectedTemplateIds.filter(item => item !== id);
    } else {
      nextIds = [...selectedTemplateIds, id];
    }

    setSelectedTemplateIds(nextIds);

    if (nextIds.length === 0) {
      setSelectedTemplateId('');
      setSelectedCategoryName('');
      setRandomTopicTemplates([]);
      setCustomContent('');
    } else if (nextIds.length === 1) {
      const tmpl = templates.find(t => t.id === nextIds[0]);
      if (tmpl) {
        setSelectedTemplateId(tmpl.id);
        setSelectedCategoryName('');
        const candidateTexts = [tmpl.content, ...(tmpl.variations || [])].filter((v) => v && v.trim());
        setRandomTopicTemplates(candidateTexts.length > 1 ? candidateTexts : []);
        setCustomContent(tmpl.content);
      }
    } else {
      const candidateTexts: string[] = [];
      nextIds.forEach(tId => {
        const tmpl = templates.find(t => t.id === tId);
        if (tmpl) {
          if (tmpl.content && tmpl.content.trim()) candidateTexts.push(tmpl.content.trim());
          if (tmpl.variations && tmpl.variations.length > 0) {
            tmpl.variations.forEach(v => {
              if (v && v.trim()) candidateTexts.push(v.trim());
            });
          }
        }
      });
      setSelectedTemplateId(`selected_multi_${Date.now()}`);
      setSelectedCategoryName(`${nextIds.length} Mensagens Selecionadas`);
      setRandomTopicTemplates(candidateTexts);
      setCustomContent(
        `🎲 [ENVIO ALEATÓRIO: ${nextIds.length} MENSAGENS SELECIONADAS]\nSerá enviada uma mensagem sorteada das ${candidateTexts.length} opções cadastradas nestes modelos para cada destinatário.`
      );
    }
  };

  const handleSelectRandomCreatedTemplate = (categoryFilter?: string) => {
    const pool = templates.filter((t) => {
      if (!t || !t.content) return false;
      if (categoryFilter) return (t.category || '').toLowerCase() === categoryFilter.toLowerCase();
      if (activeTopic) return (t.category || '').toLowerCase() === activeTopic.toLowerCase();
      return true;
    });

    if (pool.length === 0) {
      alert('Nenhuma mensagem criada encontrada para seleção aleatória.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];

    setSelectedTemplateId(chosen.id);
    setSelectedTemplateIds([chosen.id]);
    setSelectedCategoryName('');
    const candidateTexts = [chosen.content, ...(chosen.variations || [])].filter((v) => v && v.trim());
    setRandomTopicTemplates(candidateTexts.length > 1 ? candidateTexts : []);
    setCustomContent(chosen.content);

    const el = document.getElementById(`new-campaign-tmpl-${chosen.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSelectTopicCategory = (category: string, catTemplates: MessageTemplate[]) => {
    const topicId = `topic_cat_${category}`;
    const candidateTexts: string[] = [];
    catTemplates.forEach((t) => {
      if (t.content && t.content.trim()) candidateTexts.push(t.content.trim());
      if (t.variations && t.variations.length > 0) {
        t.variations.forEach((v) => {
          if (v && v.trim()) candidateTexts.push(v.trim());
        });
      }
    });

    setSelectedTemplateIds([]);
    setSelectedTemplateId(topicId);
    setSelectedCategoryName(category);
    setRandomTopicTemplates(candidateTexts);
    setUseVariations(true);
    setCustomContent(
      `🎲 [ENVIO ALEATÓRIO DA CAMPANHA: ${category}]\nSerá enviada uma mensagem sorteada das ${candidateTexts.length} opções cadastradas nesta campanha para cada destinatário.`
    );
    scrollToBottom();
  };

  const handleAddSchedule = () => {
    let nextTime = getLocal10MinAhead();
    if (schedules.length > 0) {
      const last = schedules[schedules.length - 1];
      if (last.datetime) {
        const lastDt = parseLocalDatetimeString(last.datetime);
        if (!isNaN(lastDt.getTime())) {
          const candidateMs = Math.max(lastDt.getTime() + 60 * 60 * 1000, Date.now() + 10 * 60 * 1000);
          const candidate = new Date(candidateMs);
          const pad = (n: number) => String(n).padStart(2, '0');
          nextTime = `${candidate.getFullYear()}-${pad(candidate.getMonth() + 1)}-${pad(candidate.getDate())}T${pad(candidate.getHours())}:${pad(candidate.getMinutes())}`;
        }
      }
    }
    setSchedules([...schedules, { id: `sch_${Date.now()}`, datetime: nextTime, limit: '' }]);
  };

  const handleRemoveSchedule = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id));
  };

  const handleRedistributeSchedules = () => {
    const totalContacts = selectedContactIds.length;
    if (totalContacts === 0) {
      alert('⚠️ Nenhum contato selecionado.');
      return;
    }
    if (schedules.length === 0) {
      alert('⚠️ Nenhum horário agendado.');
      return;
    }
    const countPerSlot = Math.ceil(totalContacts / schedules.length);
    const newSchedules = schedules.map(sch => ({
      ...sch,
      limit: countPerSlot
    }));
    setSchedules(newSchedules);
  };

  const targetContacts = availableContacts.filter(c => selectedContactIds.includes(c.id));

  const handleFinalSubmit = () => {
    if (selectedContactIds.length === 0) {
      alert('⚠️ Por favor, selecione pelo menos 1 contato no Passo 1 para realizar o agendamento.');
      setStep(1);
      return;
    }

    if (!customContent.trim()) {
      alert('⚠️ Por favor, escolha um modelo de mensagem ou digite um texto no Passo 2.');
      setStep(2);
      return;
    }

    if (schedules.length === 0 || schedules.some(s => !s.datetime)) {
      alert('⚠️ Por favor, defina a data e horário do agendamento no Passo 3.');
      return;
    }

    const invalidSchedule = schedules.find(s => !s.datetime || isNaN(parseLocalDatetimeString(s.datetime).getTime()));
    if (invalidSchedule) {
      alert('⚠️ Por favor, informe uma data e horário válidos para todos os agendamentos.');
      return;
    }

    const pastSchedule = schedules.find(s => parseLocalDatetimeString(s.datetime).getTime() < Date.now() - 30000);
    if (pastSchedule) {
      alert('⚠️ O agendamento deve ser definido para uma data e horário no futuro (a partir do momento atual).');
      return;
    }

    const selectedCards = savedCards.filter(c => selectedCardIds.includes(c.id));
    const chosenCard = selectedCards[0];
    const isRandomCards = selectedCards.length > 1;

    const campaignsToCreate = distributedSchedules.filter(sch => sch.contactIds.length > 0);

    if (campaignsToCreate.length === 0) {
      alert('⚠️ Por favor, atribua pelo menos 1 contato para os horários de disparo.');
      return;
    }

    const settings = getSettings();
    const selectedChipObj = (settings.chips || []).find(c => c.id === selectedChipId);
    const chipPayload = {
      chipId: selectedChipObj?.id,
      chipName: selectedChipObj ? cleanChipName(selectedChipObj.name) : undefined,
    };

    const campaigns: ScheduledCampaign[] = campaignsToCreate.map((sch, index) => {
      const scheduledIso = parseLocalDatetimeString(sch.datetime).toISOString();
      return {
        id: `camp_${Date.now()}_${sch.id}_${index}`,
        title: campaignsToCreate.length > 1 ? `${title} (Parte ${index + 1})` : title,
        templateId: selectedTemplateId || 'custom',
        templateContent: customContent,
        categoryName: selectedCategoryName || undefined,
        randomTopicTemplates: randomTopicTemplates.length > 0 ? randomTopicTemplates : undefined,
        scheduledAt: scheduledIso,
        intervalSeconds,
        sendMode,
        useVariations,
        contactIds: sch.contactIds,
        cardId: chosenCard?.id,
        cardTitle: isRandomCards ? `🎲 Envio Aleatório (${selectedCards.length} Cards)` : chosenCard?.title,
        cardImageUrl: chosenCard?.imageUrl,
        cardIds: selectedCardIds,
        cardImageUrls: selectedCards.map(c => c.imageUrl),
        ...chipPayload,
        status: 'agendado',
        progress: {
          sent: 0,
          failed: 0,
          total: sch.contactIds.length,
        },
        createdAt: new Date().toISOString()
      };
    });

    isFinishing.current = true;
    try {
      localStorage.removeItem('zap_campaign_draft_v1');
    } catch (e) {
      console.error(e);
    }

    onScheduleCampaign(campaigns);
    alert(`✅ Campanha "${title}" agendada com sucesso!

${campaigns.length} disparo(s) para um total de ${campaigns.reduce((sum, c) => sum + c.contactIds.length, 0)} contato(s).
${remainingCount > 0 ? `⚠️ ${remainingCount} contato(s) ficaram de fora para envio posterior.` : ''}`);
    onNavigate('dashboard');
  };

  // Group templates by topic/category according to active vehicle tab
  const appSettings = getSettings();
  const [activeVehicleTab, setActiveVehicleTab] = useState<'carro'>(() => 'carro');

  const vehicleFilteredTemplates = templates.filter(
    (t) => !t.vehicleType || t.vehicleType === 'carro'
  );

  const groupedTemplates = React.useMemo(() => {
    const groups: Record<string, MessageTemplate[]> = {};
    vehicleFilteredTemplates.forEach(tmpl => {
      const cat = tmpl.category || 'Geral';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tmpl);
    });
    return groups;
  }, [vehicleFilteredTemplates]);

  const allCategories = React.useMemo(() => {
    const rawCategories = Object.keys(groupedTemplates);
    if (!selectedGroup || selectedGroup === 'all' || selectedGroup === 'sem_campanha') {
      return rawCategories.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    return rawCategories.sort((a, b) => {
      const matchA = isCategorySimilar(a, selectedGroup);
      const matchB = isCategorySimilar(b, selectedGroup);
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return a.localeCompare(b, 'pt-BR');
    });
  }, [groupedTemplates, selectedGroup]);

  // Auto-select topic category and activate Fixed Random campaign by default
  React.useEffect(() => {
    if (step === 2 && allCategories.length > 0) {
      let targetCat: string | undefined;
      if (selectedGroup && selectedGroup !== 'all' && selectedGroup !== 'sem_campanha') {
        targetCat = allCategories.find(cat => isCategorySimilar(cat, selectedGroup));
      }
      if (!targetCat) {
        targetCat = allCategories[0];
      }

      if (targetCat && (!activeTopic || (selectedGroup && selectedGroup !== 'all' && !isCategorySimilar(activeTopic, selectedGroup)))) {
        setActiveTopic(targetCat);
      }

      // Se nenhum template/tópico foi selecionado ainda, ativa a campanha com Aleatório Fixo automaticamente
      if (!selectedTemplateId && selectedTemplateIds.length === 0 && targetCat) {
        const catTemplates = groupedTemplates[targetCat] || [];
        if (catTemplates.length > 0) {
          handleSelectTopicCategory(targetCat, catTemplates);
        }
      }
    }
  }, [step, selectedGroup, allCategories, selectedTemplateId, selectedTemplateIds.length, groupedTemplates, activeTopic]);

  return (
    <div className="space-y-4">
      {step === 1 && (
        <div className="bg-[#15181E] p-4 sm:p-6 rounded-xl space-y-5 shadow-xl">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Nome do Agendamento / Campanha *</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsTitleUserEdited(false);
                    const auto = getAutoTitle(selectedGroup, selectedChipFilter, selectedChipId, availableContacts);
                    if (auto) setTitle(auto);
                  }}
                  className="text-[10px] text-[#A88B4B] hover:text-amber-300 font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Buscar nome automático baseado na lista e no chip"
                >
                  <span>✨ Restaurar Nome Automático</span>
                </button>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsTitleUserEdited(true);
                }}
                className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-3 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B] font-semibold"
                placeholder="Ex: CG 50/100 / Suporte"
              />
            </div>
            <div className="pt-2">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Buscar Contatos na Agenda / Lista:</label>
              <input
                type="text"
                value={contactSearchTerm}
                onChange={(e) => setContactSearchTerm(e.target.value)}
                placeholder="Digite o nome, empresa ou telefone..."
                className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-2.5 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B]"
              />
            </div>
            
            <div className="pt-2">
              <div className="flex items-center space-x-2">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest shrink-0">Categoria:</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="bg-[#15181E] border border-[#1F2229] text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#A88B4B] w-full"
                >
                  <option value="all">📁 Todas ({availableContacts.length})</option>
                  <option value="sem_campanha">⚠️ Sem Campanha ({availableContacts.filter(c => {
                    const grp = (c.group || '').toLowerCase();
                    return grp.includes('sem campanha') || grp.includes('agenda de contatos') || !c.group;
                  }).length})</option>
                  {groups.filter(g => {
                    const nameLower = g.name.toLowerCase();
                    return !nameLower.includes('sem campanha') && nameLower !== 'agenda de contatos';
                  }).map((g, idx) => {
                    const normalize = (s: string) => s.replace(/[\s\-\/_]/g, '').toLowerCase();
                    const gNorm = normalize(g.name);
                    const count = availableContacts.filter(c => normalize(c.group || "Agenda de Contatos") === gNorm).length;
                    if (count === 0 && selectedGroup !== g.name) return null;
                    return (
                      <option key={`${g.id}_${idx}`} value={g.name}>{g.name} ({count})</option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Step 1 Contact List - Fixed height to prevent infinite scroll */}
          <div className="border border-[#1F2229] rounded-xl overflow-hidden bg-[#0A0C10] shadow-inner">
            <div className="p-3 bg-[#0F1115] border-b border-[#1F2229] flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-bold text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filteredContacts.length > 0 && filteredContacts.every(c => selectedContactIds.includes(c.id))}
                  onChange={(e) => handleSelectAllContacts(e.target.checked)}
                  className="rounded bg-[#0A0C10] border-[#1F2229] text-[#A88B4B] focus:ring-0"
                />
                <span className="uppercase tracking-wider text-[11px]">Selecionar Todos</span>
              </label>
              <span className="text-xs text-[#A88B4B] font-bold font-mono">
                {selectedContactIds.length} selecionados
              </span>
            </div>
            
            <div className="divide-y divide-[#1F2229] text-xs custom-scrollbar">
              {filteredContacts.map(c => {
                const isSkipped = isContactSkipped(c, logs);
                const isNotSent3d = isNotSentInLastThreeDays(c, logs);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleContact(c.id)}
                    className={`p-3 flex items-center justify-between hover:bg-[#15181E] cursor-pointer transition-colors ${selectedContactIds.includes(c.id) ? 'bg-[#A88B4B]/5' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" checked={selectedContactIds.includes(c.id)} readOnly className="rounded bg-[#0A0C10] border-[#1F2229] text-[#A88B4B] focus:ring-0 pointer-events-none" />
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-semibold text-white text-xs">{c.name}</p>
                          {isSkipped && (
                            <span className="bg-amber-500/10 text-amber-500 text-[8px] font-bold px-1 py-0.5 rounded uppercase">Pulado</span>
                          )}
                          {isNotSent3d && (
                            <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-bold px-1 py-0.5 rounded uppercase">&gt;3d Sem Envio</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono">{formatPhoneDisplay(c.phone)}</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-600 uppercase font-bold">{c.group || 'Geral'}</span>
                  </div>
                );
              })}
            </div>
          </div>


          <div className="flex flex-col-reverse sm:flex-row justify-between pt-2 gap-4">
            <button
              onClick={handleCancelDraft}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] text-red-400 hover:text-red-300 border border-red-900/30 font-medium px-4 py-2.5 rounded text-xs uppercase tracking-wider transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={selectedContactIds.length === 0}
              onClick={() => setStep(2)}
              className="bg-[#A88B4B] hover:bg-[#C5A968] disabled:opacity-50 text-[#0A0C10] font-bold px-6 py-2.5 rounded text-xs uppercase tracking-widest shadow-lg shadow-[#A88B4B]/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>Avançar para Modelo ({selectedContactIds.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-[#15181E] p-4 sm:p-6 rounded-xl space-y-6 shadow-xl">
          <div className="bg-[#0A0C10] border border-[#1F2229] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-white font-serif italic text-lg leading-tight">Escolha sua Mensagem</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Passo 2 de 3: Conteúdo do Disparo</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {(selectedTemplateId || selectedTemplateIds.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId('');
                    setSelectedTemplateIds([]);
                    setSelectedCategoryName('');
                    setRandomTopicTemplates([]);
                    setCustomContent('');
                  }}
                  className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all border border-red-500/20 cursor-pointer"
                >
                  Limpar {selectedTemplateIds.length > 1 ? `(${selectedTemplateIds.length})` : ''}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* SIDEBAR: TOPICS */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-[#0A0C10] border border-[#1F2229] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1F2229] bg-[#0F1115]">
                  <span className="text-[10px] font-black text-[#A88B4B] uppercase tracking-widest flex items-center space-x-2">
                    <Star className="w-3.5 h-3.5" />
                    <span>Tópicos</span>
                  </span>
                </div>
                <div className="p-2 space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => setActiveTopic(null)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all ${
                      activeTopic === null
                        ? 'bg-[#A88B4B] text-[#0A0C10] font-bold'
                        : 'text-gray-400 hover:bg-[#15181E] hover:text-white'
                    }`}
                  >
                    <span>Todos os Tópicos</span>
                    <span className={`text-[10px] ${activeTopic === null ? 'bg-[#0A0C10]/20' : 'bg-[#0A0C10]'} px-1.5 py-0.5 rounded min-w-[20px] text-center`}>
                      {vehicleFilteredTemplates.length}
                    </span>
                  </button>

                  {allCategories.map(cat => {
                    const isSelectedCat = selectedTemplateId === `topic_cat_${cat}`;
                    const isSimilarToGroup = isCategorySimilar(cat, selectedGroup);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setActiveTopic(cat);
                          const catTemplates = groupedTemplates[cat] || [];
                          if (catTemplates.length > 0) {
                            handleSelectTopicCategory(cat, catTemplates);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                          activeTopic === cat
                            ? 'bg-[#A88B4B] text-[#0A0C10] font-bold shadow-md shadow-[#A88B4B]/10'
                            : isSimilarToGroup
                            ? 'bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30'
                            : 'text-gray-400 hover:bg-[#15181E] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 min-w-0 pr-2">
                          {isSimilarToGroup && (
                            <span className="text-[10px] bg-amber-500 text-black px-1 rounded font-black shrink-0" title={`Correspondente à categoria "${selectedGroup}"`}>⚡</span>
                          )}
                          {isSelectedCat && (
                            <span className="text-xs shrink-0" title="Escolha aleatória fixa ativada">🎲</span>
                          )}
                          <span className="break-words text-left leading-tight py-0.5">{cat}</span>
                        </div>
                        <span className={`text-[10px] ${activeTopic === cat ? 'bg-[#0A0C10]/20' : 'bg-[#0A0C10]'} px-1.5 py-0.5 rounded min-w-[24px] text-center shrink-0`}>
                          {groupedTemplates[cat].length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MAIN AREA: CONTENT LIST */}
            <div className="lg:col-span-9 space-y-6">
              <div className="space-y-4">
                {allCategories
                  .filter(cat => !activeTopic || cat === activeTopic)
                  .map(category => {
                    const catTemplates = groupedTemplates[category];
                    const isTopicSelected = selectedTemplateId === `topic_cat_${category}`;
                    const isExpanded = !!expandedTopicMessages[category];

                    return (
                      <div key={category} className="bg-[#0A0C10] border border-[#1F2229] rounded-xl overflow-hidden shadow-lg">
                        <div className="bg-[#0F1115] px-4 py-3 border-b border-[#1F2229] flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-[#A88B4B] font-serif italic text-base">{category}</h4>
                            <span className="text-[10px] bg-[#1F2229] text-gray-400 font-bold px-2 py-0.5 rounded-full">
                              {catTemplates.length} {catTemplates.length === 1 ? 'msg' : 'msgs'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Botão de retrair/expandir mensagens: retraídas por padrão */}
                            <button
                              type="button"
                              onClick={() => toggleTopicExpanded(category)}
                              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:text-white bg-[#15181E] hover:bg-[#1F2229] border border-[#1F2229] transition-all cursor-pointer"
                              title={isExpanded ? 'Retrair mensagens deste tópico' : 'Expandir e visualizar mensagens deste tópico'}
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3 text-[#A88B4B]" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                              <span>{isExpanded ? 'Retrair Mensagens' : `Ver Mensagens (${catTemplates.length})`}</span>
                            </button>

                            {/* Outro botão: sempre ativado */}
                            <button
                              type="button"
                              onClick={() => handleSelectTopicCategory(category, catTemplates)}
                              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                                isTopicSelected
                                  ? 'bg-[#A88B4B] text-[#0A0C10] ring-2 ring-[#A88B4B]/30'
                                  : 'bg-purple-500/20 text-purple-300 hover:bg-[#A88B4B] hover:text-[#0A0C10] border border-purple-500/40'
                              }`}
                              title="Campanha com escolha aleatória permanentemente fixa ativada"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{isTopicSelected ? '✓ Campanha Ativada (Aleatório Fixo)' : '🎲 Ativar Campanha (Aleatório Fixo)'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Mensagens RETRAÍDAS por padrão - só aparecem se expandidas */}
                        {isExpanded && (
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#1F2229] bg-[#0C0E12]/80">
                            {catTemplates.map(tmpl => {
                              const isMultiSelected = selectedTemplateIds.includes(tmpl.id);
                              const isSingleSelected = selectedTemplateId === tmpl.id;
                              const isSelected = isMultiSelected || isSingleSelected;
                              const multiIndex = selectedTemplateIds.indexOf(tmpl.id);

                              return (
                                <div
                                  key={tmpl.id}
                                  id={`new-campaign-tmpl-${tmpl.id}`}
                                  onClick={() => handleTemplateChange(tmpl.id)}
                                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                                    isSelected
                                      ? 'bg-[#A88B4B]/10 border-[#A88B4B] shadow-lg shadow-[#A88B4B]/5 ring-1 ring-[#A88B4B]'
                                      : 'bg-[#15181E] border-[#1F2229] hover:border-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <h5 className={`font-serif italic text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                      {tmpl.title}
                                    </h5>
                                    <div className="flex items-center space-x-2">
                                      <label 
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center space-x-1 cursor-pointer bg-[#0A0C10] px-2 py-1 rounded border border-[#1F2229] hover:border-[#A88B4B]/50"
                                        title="Selecionar para envio aleatório conjunto"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isMultiSelected}
                                          onChange={() => handleToggleTemplateSelection(tmpl.id)}
                                          className="w-3.5 h-3.5 rounded text-[#A88B4B] focus:ring-[#A88B4B] bg-[#0A0C10] border-[#1F2229]"
                                        />
                                        <span className="text-[10px] text-[#A88B4B] font-bold">
                                          {selectedTemplateIds.length > 1 && isMultiSelected ? `#${multiIndex + 1}` : 'Selecionar'}
                                        </span>
                                      </label>
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#A88B4B] bg-[#A88B4B]' : 'border-gray-600'}`}>
                                        {isSelected && <Check className="w-2.5 h-2.5 text-[#0A0C10]" />}
                                      </div>
                                    </div>
                                  </div>
                                  <p className={`text-xs font-mono line-clamp-3 leading-relaxed ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                                    {tmpl.content}
                                  </p>
                                  {tmpl.variations && tmpl.variations.length > 0 && (
                                    <div className="flex items-center space-x-1 text-[10px] text-purple-400 bg-purple-950/40 border border-purple-500/20 px-2 py-0.5 rounded w-fit">
                                      <Sparkles className="w-3 h-3" />
                                      <span>{tmpl.variations.length} variações anti-spam</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="pt-4 border-t border-[#1F2229] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Texto Final do Disparo (Editável):
                  </label>
                  <span className="text-[10px] text-[#A88B4B] font-bold">
                    {customContent.length} caracteres
                  </span>
                </div>
                <textarea
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-4 text-xs text-gray-300 focus:outline-none focus:border-[#A88B4B] min-h-[120px] font-mono leading-relaxed shadow-inner"
                  placeholder="Selecione um modelo acima ou digite seu próprio texto aqui..."
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                ></textarea>
                <div className="bg-[#15181E] border border-[#1F2229] p-3 rounded-lg flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Você pode editar livremente o texto acima. Variáveis como <strong className="text-gray-300">{"{nome}"}</strong>, <strong className="text-gray-300">{"{primeiro_nome}"}</strong> e <strong className="text-gray-300">{"{saudacao}"}</strong> serão substituídas automaticamente no momento do envio.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1F2229]">
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Mensagem Final Customizada (Opcional):</label>
            <textarea
              className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-3 text-sm text-gray-300 focus:outline-none focus:border-[#A88B4B] min-h-[100px] font-mono"
              placeholder="Digite a mensagem... Variáveis permitidas: {nome}, {primeiro_nome}, {saudacao}"
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
            ></textarea>
            <p className="text-[10px] text-gray-500 mt-1.5">Você pode alterar o modelo selecionado acima para este disparo específico.</p>
          </div>

          {/* Card Selection Box (Now Direct Grid) */}
          <div className="bg-[#0A0C10] border border-[#1F2229] p-4 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-[#A88B4B]" />
                  <h3 className="font-serif italic text-base text-white">Grade de Fotos — Seleção de Cards (Envio Aleatório)</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Clique em um ou vários cards para selecionar. Se escolher mais de 1, os cards serão sorteados aleatoriamente a cada envio.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllCards}
                  className="bg-[#A88B4B]/20 hover:bg-[#A88B4B] text-[#A88B4B] hover:text-[#0A0C10] px-3 py-1.5 rounded text-[10px] font-bold border border-[#A88B4B]/40 transition-all uppercase tracking-wider cursor-pointer"
                >
                  Todos ({displayCards.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearSelectedCards}
                  className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-3 py-1.5 rounded text-[10px] font-bold border border-red-500/30 transition-all uppercase tracking-wider cursor-pointer"
                >
                  Nenhum
                </button>
              </div>
            </div>

            {selectedGroup && selectedGroup !== 'all' && selectedGroup !== 'sem_campanha' && similarCards.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-xs text-amber-300 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Encontrado <strong>{similarCards.length} card(s)</strong> correspondente(s) à categoria "<span className="text-white underline">{selectedGroup}</span>"
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOnlySimilarCards(!showOnlySimilarCards)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                    showOnlySimilarCards
                      ? 'bg-[#A88B4B] text-[#0A0C10] border-[#A88B4B]'
                      : 'bg-[#15181E] text-gray-300 border-gray-700 hover:text-white'
                  }`}
                >
                  {showOnlySimilarCards ? `✓ Filtrando por "${selectedGroup}"` : `Ver Todos os Cards (${savedCards.length})`}
                </button>
              </div>
            )}

            {displayCards.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-[#1F2229] rounded-xl">
                <p className="text-xs">
                  {showOnlySimilarCards && similarCards.length === 0 
                    ? `Nenhum card específico encontrado para a categoria "${selectedGroup}".` 
                    : 'Nenhum card cadastrado no álbum.'}
                </p>
                {showOnlySimilarCards && similarCards.length === 0 && savedCards.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowOnlySimilarCards(false)}
                    className="mt-2 text-amber-400 hover:underline text-xs font-bold cursor-pointer"
                  >
                    Exibir todos os {savedCards.length} cards cadastrados
                  </button>
                ) : (
                  <p className="text-[10px] mt-1">Cadastre seus cards na aba "Álbum de Cards" para utilizá-los aqui.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {/* Option for No Card */}
                <div
                  onClick={handleClearSelectedCards}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center h-40 ${
                    selectedCardIds.length === 0 
                      ? 'bg-[#A88B4B]/20 border-[#A88B4B] ring-2 ring-[#A88B4B] text-white shadow-lg' 
                      : 'bg-[#0A0C10] border-[#1F2229] hover:border-gray-700 text-gray-400'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#15181E] flex items-center justify-center mb-2 text-lg">
                    🚫
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Sem Card</span>
                </div>

                {displayCards.map((card) => {
                  const isSelected = selectedCardIds.includes(card.id);
                  const selectedIndex = selectedCardIds.indexOf(card.id);
                  const isSimilar = isCategorySimilar(card.category, selectedGroup) || isCategorySimilar(card.title, selectedGroup);

                  return (
                    <div
                      key={card.id}
                      onClick={() => handleToggleCardSelection(card.id)}
                      className={`rounded-xl border cursor-pointer transition-all overflow-hidden flex flex-col group relative ${
                        isSelected
                          ? 'bg-[#A88B4B]/20 border-[#A88B4B] ring-2 ring-[#A88B4B] shadow-lg'
                          : isSimilar
                          ? 'bg-amber-500/5 border-amber-500/40 hover:border-amber-500'
                          : 'bg-[#0A0C10] border-[#1F2229] hover:border-[#A88B4B]/50'
                      }`}
                    >
                      <div className="h-28 w-full overflow-hidden bg-black/40 relative">
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSimilar && (
                          <div className="absolute top-2 left-2 bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded shadow flex items-center space-x-0.5" title={`Correspondente à categoria "${selectedGroup}"`}>
                            <span>⚡</span>
                            <span className="truncate max-w-[70px]">{card.category || 'Correspondente'}</span>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#A88B4B] text-[#0A0C10] text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                            {selectedCardIds.length > 1 ? `#${selectedIndex + 1}` : '✓'}
                          </div>
                        )}
                      </div>
                      <div className="p-2 flex-1 flex flex-col justify-between bg-[#15181E]">
                        <h4 className="font-serif italic text-[10px] text-white line-clamp-1">{card.title}</h4>
                        <div className="mt-1 flex items-center justify-end pt-1 border-t border-[#1F2229]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewZoom(1);
                              setPreviewModalCard(card);
                            }}
                            className="text-[9px] text-amber-400 flex items-center space-x-1"
                          >
                            <Search className="w-2.5 h-2.5" />
                            <span>Ver</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {selectedCardIds.length > 1 && (
              <div className="bg-[#15181E] border border-[#A88B4B]/30 p-2 rounded flex items-center justify-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-[#A88B4B] animate-pulse" />
                <span className="text-[10px] font-bold text-[#A88B4B] uppercase tracking-widest">
                  🎲 Modo Envio Aleatório Ativo ({selectedCardIds.length} fotos selecionadas)
                </span>
              </div>
            )}
          </div>



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

          <div className="flex flex-col-reverse sm:flex-row justify-between pt-2 gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(1)}
                className="bg-[#0A0C10] hover:bg-[#1A1D23] text-gray-400 border border-[#1F2229] font-medium px-4 py-2.5 rounded text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar aos Contatos</span>
              </button>
              <button
                onClick={handleCancelDraft}
                className="bg-[#0A0C10] hover:bg-[#1A1D23] text-red-400 hover:text-red-300 border border-red-900/30 font-medium px-4 py-2.5 rounded text-xs uppercase tracking-wider transition-colors flex items-center justify-center"
              >
                Cancelar
              </button>
            </div>
            <button
              disabled={!customContent.trim()}
              onClick={() => setStep(3)}
              className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] font-bold px-8 py-3 rounded uppercase tracking-widest text-xs shadow-lg shadow-[#A88B4B]/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>Avançar para Agendamento</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-[#15181E] p-4 sm:p-6 rounded-xl space-y-4 shadow-xl">
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Título do Agendamento:</label>
            <input
              type="text"
              className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-3 text-sm text-gray-300 focus:outline-none focus:border-[#A88B4B] font-medium"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsTitleUserEdited(true);
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Usar variações de texto inteligente:</label>
              <div className="flex items-center space-x-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={useVariations} onChange={(e) => setUseVariations(e.target.checked)} />
                  <div className="w-11 h-6 bg-[#0A0C10] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-[#A88B4B] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A88B4B]/20 border border-[#1F2229]"></div>
                </label>
                <span className="text-xs text-gray-300 font-medium">Ativar (Reduz riscos de banimento)</span>
              </div>
            </div>
          </div>

          {/* Schedule Mode Selector - Removed by User Request */}

          <div className="pt-2">
            <div className="space-y-3">
              {schedules.length === 0 ? (
                <div className="p-6 border border-dashed border-[#1F2229] bg-[#0A0C10] rounded-xl text-center text-xs text-gray-500">
                  Nenhum horário definido. Use o assistente de escala diária acima ou clique em "Adicionar Novo Horário" abaixo para cadastrar um horário manualmente.
                </div>
              ) : (
                schedules.map((sch, index) => {
                  const assignedCount = distributedSchedules[index]?.contactIds.length || 0;
                  return (
                    <div key={sch.id} className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-[#0A0C10] p-4 rounded-xl border border-[#1F2229] w-full">
                      <div className="flex-1">
                        <span className="block text-[9px] text-gray-500 uppercase tracking-wider mb-1 font-bold">Data e Hora</span>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="date"
                            min={getTodayDateLocal()}
                            value={sch.datetime.split('T')[0] || ''}
                            onChange={(e) => {
                              const newSchedules = [...schedules];
                              const timeVal = newSchedules[index].datetime.split('T')[1] || '09:00';
                              newSchedules[index].datetime = `${e.target.value}T${timeVal}`;
                              setSchedules(newSchedules);
                            }}
                            className="w-full sm:w-3/5 bg-[#15181E] border border-[#1F2229] rounded p-2 text-gray-300 text-sm focus:outline-none focus:border-[#A88B4B] font-mono"
                          />
                          <TimeSelect
                            value={sch.datetime.split('T')[1] || '09:00'}
                            onChange={(timeVal) => {
                              const newSchedules = [...schedules];
                              const dateVal = newSchedules[index].datetime.split('T')[0] || getTodayDateLocal();
                              newSchedules[index].datetime = `${dateVal}T${timeVal}`;
                              setSchedules(newSchedules);
                            }}
                            className="w-full sm:w-2/5"
                          />
                        </div>
                      </div>
                      <div className="w-full md:w-56">
                        <span className="block text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between gap-1 flex-wrap">
                          <span>Qtd. de Pessoas</span>
                          <span className="text-[#A88B4B] font-bold">Atribuídos: {assignedCount}</span>
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Todos os restantes"
                          value={sch.limit}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const newSchedules = [...schedules];
                            newSchedules[index].limit = val;
                            setSchedules(newSchedules);
                          }}
                          className="w-full bg-[#15181E] border border-[#1F2229] rounded p-2 text-gray-300 text-sm focus:outline-none focus:border-[#A88B4B] font-mono"
                        />
                      </div>
                      <div className="flex items-center justify-end pt-5">
                        <button
                          onClick={() => handleRemoveSchedule(sch.id)}
                          className="p-2.5 text-gray-400 hover:text-red-400 bg-[#15181E] border border-[#1F2229] rounded transition-colors"
                          title="Remover horário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              
              {remainingCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-300">
                  ⚠️ <strong>{remainingCount} contatos selecionados</strong> ficaram de fora e não foram agendados nestes horários. Eles permanecerão na lista para serem agendados mais tarde.
                </div>
              )}

              <button
                onClick={handleAddSchedule}
                className="w-full border border-dashed border-[#1F2229] hover:border-[#A88B4B]/50 text-gray-500 hover:text-[#A88B4B] rounded py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-1 transition-colors bg-[#0A0C10]"
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar Novo Horário</span>
              </button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start space-x-3 mt-4">
            <div className="bg-blue-500/20 p-1.5 rounded-lg text-blue-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-400">Resumo do Disparo</h4>
              <ul className="text-xs text-blue-300/80 mt-1 space-y-1">
                <li>• <strong>{selectedContactIds.length}</strong> contatos selecionados no Passo 1</li>
                <li>• <strong>{schedules.length}</strong> horários agendados</li>
                <li>• Contatos agendados agora: <strong>{selectedContactIds.length - remainingCount}</strong> contatos</li>
                {remainingCount > 0 && (
                  <li className="text-amber-300">• Contatos para depois: <strong>{remainingCount}</strong> contatos</li>
                )}
                <li>• Tempo estimado de envio: <strong>~{Math.ceil(((selectedContactIds.length - remainingCount) * intervalSeconds) / 60)} min</strong></li>
              </ul>
            </div>
          </div>

          {distributedSchedules.some(s => s.contactIds.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Preview dos Envios por Horário:</span>
                {randomTopicTemplates.length > 0 && (
                  <span className="bg-[#A88B4B]/20 text-[#A88B4B] text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-[#A88B4B]/30 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Sorteio Aleatório do Tópico ({randomTopicTemplates.length} opções)</span>
                  </span>
                )}
              </div>
              
              <div className="space-y-4 pr-1">
                {distributedSchedules.filter(s => s.contactIds.length > 0).map((sch, schIdx) => {
                  const schDate = new Date(sch.datetime);
                  const schContacts = availableContacts.filter(c => sch.contactIds.includes(c.id));
                  return (
                    <div key={sch.id} className="bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between border-b border-[#1F2229] pb-2">
                        <span className="text-xs font-bold text-white font-mono flex items-center space-x-1">
                          <span>📅 Horário #{schIdx + 1}: {schDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <span className="bg-[#A88B4B]/20 text-[#A88B4B] text-[10px] px-2 py-0.5 rounded font-bold font-mono">
                          {schContacts.length} contato(s)
                        </span>
                      </div>
                      <div className="divide-y divide-[#1F2229]/60 text-xs">
                        {schContacts.slice(0, 5).map((c, i) => {
                          let textToRender = customContent;
                          if (randomTopicTemplates.length > 0) {
                            const charCodeSum = c.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const randomIndex = (i + charCodeSum) % randomTopicTemplates.length;
                            textToRender = randomTopicTemplates[randomIndex];
                          }
                          const rendered = replaceTemplateVariables(textToRender, c, schDate);
                          return (
                            <div key={c.id} className="py-2.5 space-y-1">
                              <p className="font-bold text-gray-300">{i + 1}. {c.name} ({formatPhoneDisplay(c.phone)})</p>
                              <p className="text-gray-400 font-mono pl-2 border-l-2 border-[#A88B4B]/50 whitespace-pre-wrap">{rendered}</p>
                            </div>
                          );
                        })}
                        {schContacts.length > 5 && (
                          <p className="text-center text-[10px] text-gray-500 pt-2 font-semibold">
                            + {schContacts.length - 5} contato(s) ocultados no preview...
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-between pt-2 gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(2)}
                className="bg-[#0A0C10] hover:bg-[#1A1D23] text-gray-400 border border-[#1F2229] font-medium px-4 py-2.5 rounded text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Modelo</span>
              </button>
              <button
                onClick={handleCancelDraft}
                className="bg-[#0A0C10] hover:bg-[#1A1D23] text-red-400 hover:text-red-300 border border-red-900/30 font-medium px-4 py-2.5 rounded text-xs uppercase tracking-wider transition-colors flex items-center justify-center"
              >
                Cancelar
              </button>
            </div>
            <button
              onClick={handleFinalSubmit}
              className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] font-bold px-8 py-3 rounded uppercase tracking-widest text-xs shadow-lg shadow-[#A88B4B]/20 transition-all flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar e Agendar Envio</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
