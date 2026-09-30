import { ContactRow } from './ContactRow';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Tag, 
  Phone, 
  Building, 
  Mail, 
  Check, 
  X, 
  Send, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Download, 
  Upload, 
  Smartphone, 
  FileText, 
  Copy, 
  AlertCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Calendar, 
  Zap, 
  Filter, 
  CheckSquare, 
  Square,
  Edit2,
  Share2,
  Image as ImageIcon,
  Type,
  Briefcase,
  Headphones,
  RefreshCcw,
  FolderMinus,
  Settings,
  UserPlus
} from 'lucide-react';
import { Contact, ContactGroup, DispatchLogItem, ScheduledCampaign, AppSettings, ProjectArchive, MessageTemplate, CardItem } from '../types';
import { formatPhoneDisplay, cleanPhoneNumber, downloadVcfFile, parseVcfContent } from '../utils/vcfParser';
import { cleanChipName, getExpectedGroup, safeConfirm, detectGenderFromName, replaceTemplateVariables, matchPhoneNumber, matchContact, normalizeSearchText, isCategorySimilar } from '../utils/whatsapp';
import { isContactedToday, getTemplates, loadFromStorage, getSettings, saveSettings, getTodayDateString } from '../utils/storage';
import { isContactSkipped, isNotSentInLastThreeDays, getRegisteredChipForGroup } from '../utils/rules';
import { enrichContacts, processContactName, isIgnoredSequenceTag, isInvalidCategoryName } from '../utils/contactProcessor';
import { getChipTheme } from '../utils/chipTheme';
import { PasteContactsModal } from './PasteContactsModal';
import { ScanContactsModal } from './ScanContactsModal';
import { AiCategorizeModal } from './AiCategorizeModal';

import { ManageGroupsModal } from './ManageGroupsModal';

interface ContactsViewProps {
  contacts: Contact[];
  groups: ContactGroup[];
  logs?: DispatchLogItem[];
  campaigns?: ScheduledCampaign[];
  settings?: AppSettings;
  isAppReady?: boolean;
  projectArchives?: ProjectArchive[];
  onAddContact: (contact: Contact) => void;
  onAddMultipleContacts?: (contacts: Contact[]) => void;
  onUpdateContact?: (contact: Contact) => void;
  onUpdateMultipleContacts?: (contacts: Contact[]) => void;
  onDeleteContact: (id: string) => void;
  onDeleteMultipleContacts: (ids: string[]) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddGroup?: (name: string, color: string) => void;
  onUpdateGroup?: (groupId: string, newName: string, color: string) => void;
  onReplaceAllContacts?: (contacts: Contact[]) => void;
  defaultCountryCode: string;
  onSendWhatsAppToContact?: (contact: Contact, customMsg?: string) => void;
  onToggleContactedToday?: (contactId: string, isSent: boolean) => void;
  onNavigateToNewCampaign?: (selectedIds: string[]) => void;
  onScheduleCampaign?: (campaign: ScheduledCampaign | ScheduledCampaign[]) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = React.memo(({
  contacts,
  groups,
  logs = [],
  campaigns = [],
  settings,
  isAppReady = true,
  projectArchives = [],
  onAddContact,
  onAddMultipleContacts,
  onUpdateContact,
  onUpdateMultipleContacts,
  onDeleteContact,
  onDeleteMultipleContacts,
  onDeleteGroup,
  onAddGroup,
  onUpdateGroup,
  onReplaceAllContacts,
  defaultCountryCode,
  onSendWhatsAppToContact,
  onToggleContactedToday,
  onNavigateToNewCampaign,
  onScheduleCampaign,
}) => {
  // Filters and search states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [hideContactedToday, setHideContactedToday] = useState<boolean>(() => settings?.hideContactedToday ?? getSettings().hideContactedToday ?? false);
  const [showOnlySkipped, setShowOnlySkipped] = useState<boolean>(false);
  const [hideAlreadyScheduled, setHideAlreadyScheduled] = useState<boolean>(() => settings?.hideAlreadyScheduled ?? getSettings().hideAlreadyScheduled ?? false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(false);

  const toggleHideContactedToday = () => {
    const next = !hideContactedToday;
    setHideContactedToday(next);
    saveSettings({ ...getSettings(), hideContactedToday: next });
  };

  const toggleHideAlreadyScheduled = () => {
    const next = !hideAlreadyScheduled;
    setHideAlreadyScheduled(next);
    saveSettings({ ...getSettings(), hideAlreadyScheduled: next });
  };
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [isAiCategorizeModalOpen, setIsAiCategorizeModalOpen] = useState<boolean>(false);
  const [isManageGroupsModalOpen, setIsManageGroupsModalOpen] = useState<boolean>(false);
  const [isQuickScheduleModalOpen, setIsQuickScheduleModalOpen] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isDeletingContact, setIsDeletingContact] = useState<boolean>(false);
  
  // Form fields for Add/Edit Contact
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formCompany, setFormCompany] = useState<string>('');
  const [formGroup, setFormGroup] = useState<string>('Agenda de Contatos');
  const [formChipId, setFormChipId] = useState<string>('chip_1');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formCustomFields, setFormCustomFields] = useState<Array<{ key: string; value: string }>>([]);
  const [isAiSuggestingSingle, setIsAiSuggestingSingle] = useState<boolean>(false);

  // Quick Scheduler Form States
  const [quickTemplateId, setQuickTemplateId] = useState<string>('');
  const [quickCustomTitle, setQuickCustomTitle] = useState<string>('');
  const [quickCardId, setQuickCardId] = useState<string>('');
  const [quickTimePreset, setQuickTimePreset] = useState<'now' | '15m' | '30m' | '1h' | 'today14' | 'today18' | 'tomorrow09' | 'custom'>('now');
  const [quickCustomDate, setQuickCustomDate] = useState<string>('');
  const [quickFeedback, setQuickFeedback] = useState<string>('');

  // Memoized contact counts for ManageGroupsModal - FIXED: Moved to top level to follow Rules of Hooks
  const contactCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach(c => {
      const grp = (c.group || 'Agenda de Contatos').toLowerCase();
      counts[grp] = (counts[grp] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  const [notification, setNotification] = useState<string>('');
  const vcfFileInputRef = useRef<HTMLInputElement>(null);

  // Selected contacts group for similarity matching
  const activeSelectedGroup = useMemo(() => {
    if (selectedIds.length > 0) {
      const selectedContacts = contacts.filter(c => selectedIds.includes(c.id));
      const grps = new Set(selectedContacts.map(c => c.group || 'Agenda de Contatos'));
      if (grps.size === 1) return Array.from(grps)[0];
    }
    return selectedGroupFilter !== 'all' ? selectedGroupFilter : '';
  }, [selectedIds, contacts, selectedGroupFilter]);

  // Available templates and cards for Quick Scheduling sorted by category similarity
  const availableTemplates: MessageTemplate[] = useMemo(() => {
    const raw = getTemplates();
    if (!activeSelectedGroup || activeSelectedGroup === 'all') return raw;
    return [...raw].sort((a, b) => {
      const matchA = isCategorySimilar(a.category, activeSelectedGroup) || isCategorySimilar(a.title, activeSelectedGroup);
      const matchB = isCategorySimilar(b.category, activeSelectedGroup) || isCategorySimilar(b.title, activeSelectedGroup);
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return 0;
    });
  }, [activeSelectedGroup]);

  const availableCards: CardItem[] = useMemo(() => {
    const raw = loadFromStorage<CardItem[]>('gkd_cards_album_v1', []);
    if (!activeSelectedGroup || activeSelectedGroup === 'all') return raw;
    return [...raw].sort((a, b) => {
      const matchA = isCategorySimilar(a.category, activeSelectedGroup) || isCategorySimilar(a.title, activeSelectedGroup);
      const matchB = isCategorySimilar(b.category, activeSelectedGroup) || isCategorySimilar(b.title, activeSelectedGroup);
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return 0;
    });
  }, [activeSelectedGroup]);

  // Set default template and auto-select matching card when quick schedule modal opens
  useEffect(() => {
    if (isQuickScheduleModalOpen && availableTemplates.length > 0) {
      if (!quickTemplateId) {
        setQuickTemplateId(availableTemplates[0].id);
      }
      if (!quickCustomTitle) {
        setQuickCustomTitle(`Disparo Rápido (${new Date().toLocaleDateString('pt-BR')})`);
      }
      if (activeSelectedGroup && availableCards.length > 0 && !quickCardId) {
        const matchingCard = availableCards.find(c => isCategorySimilar(c.category, activeSelectedGroup) || isCategorySimilar(c.title, activeSelectedGroup));
        if (matchingCard) {
          setQuickCardId(matchingCard.id);
        }
      }
    }
  }, [isQuickScheduleModalOpen, availableTemplates, availableCards, activeSelectedGroup]);

  const showNotification = React.useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  }, []);

  // Set of actively scheduled contact IDs
  const activeCampaigns = useMemo(() => 
    campaigns.filter(c => c.status === 'agendado' || c.status === 'em_andamento'),
    [campaigns]
  );
  
  const scheduledContactIdsSet = useMemo(() => 
    new Set(activeCampaigns.flatMap(c => c.contactIds || [])),
    [activeCampaigns]
  );

  // Metadata mapping for contacts (Highly Optimized)
  const contactMetaMap = useMemo(() => {
    if (!isAppReady) return new Map();
    
    const map = new Map<string, { successfulCount: number; isSkipped: boolean; lastSentDateStr?: string; daysPassed?: number }>();
    const now = new Date();
    const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // 1. Single pass over logs to group and find latests in O(L)
    const statsByContactId = new Map<string, { count: number; skipped: boolean; latest: number }>();
    const statsByPhone = new Map<string, { count: number; skipped: boolean; latest: number }>();

    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      const timestamp = l.sentAt ? new Date(l.sentAt).getTime() : 0;
      
      const updateStats = (key: string, store: Map<string, any>) => {
        const s = store.get(key) || { count: 0, skipped: false, latest: 0 };
        if (l.status === 'enviado') s.count++;
        if (l.status === 'pulado') s.skipped = true;
        if (l.status === 'enviado' && timestamp > s.latest) s.latest = timestamp;
        store.set(key, s);
      };

      if (l.contactId) updateStats(l.contactId, statsByContactId);
      if (l.phone) {
        const clean = cleanPhoneNumber(l.phone);
        if (clean) updateStats(clean, statsByPhone);
      }
    }

    // 2. Single pass over contacts in O(N)
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      const cleanP = cleanPhoneNumber(c.phone);
      
      const sId = statsByContactId.get(c.id);
      const sPhone = cleanP ? statsByPhone.get(cleanP) : null;
      
      const totalCount = (sId?.count || 0) + (sPhone?.count || 0);
      const isSkipped = (sId?.skipped || false) || (sPhone?.skipped || false);
      const latestTs = Math.max(sId?.latest || 0, sPhone?.latest || 0);

      let lastSentDateStr: string | undefined;
      let daysPassed: number | undefined;

      if (latestTs > 0) {
        const d = new Date(latestTs);
        const startOfSent = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        daysPassed = Math.max(0, Math.floor((startOfNow - startOfSent) / 86400000));
        lastSentDateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      }

      map.set(c.id, {
        successfulCount: totalCount,
        isSkipped,
        lastSentDateStr,
        daysPassed
      });
    }

    return map;
  }, [contacts, logs, isAppReady]);

  // Key metrics calculation - Memoized
  const totalContactsCount = contacts.length;
  const contactedTodayCount = useMemo(() => {
    const today = getTodayDateString();
    let count = 0;
    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      if (l.status === 'enviado' && l.sentAt && l.sentAt.startsWith(today)) {
        count++;
      }
    }
    return count;
  }, [logs]);

  const readyToSendCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (!isContactedToday(c) && !scheduledContactIdsSet.has(c.id)) {
        count++;
      }
    }
    return count;
  }, [contacts, scheduledContactIdsSet]);

  const skippedCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < contacts.length; i++) {
      if (contactMetaMap.get(contacts[i].id)?.isSkipped) {
        count++;
      }
    }
    return count;
  }, [contacts, contactMetaMap]);

  // Duplicates calculation - Optimized
  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let dupes = 0;
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      const clean = (c.phone || '').replace(/\D/g, '');
      if (clean) {
        if (seen.has(clean)) dupes++;
        else seen.add(clean);
      }
    }
    return dupes;
  }, [contacts]);

  // Filtered contacts calculation - Highly optimized
  const filteredContacts = useMemo(() => {
    const term = debouncedSearchTerm.trim();
    const hasGroupFilter = selectedGroupFilter !== 'all';
    const groupFilterLower = selectedGroupFilter.toLowerCase();
    const isSemCampanhaFilter = selectedGroupFilter === 'sem_campanha';

    return contacts.filter(c => {
      // 1. Text Search matching
      if (term && !matchContact(c, term)) return false;

      // 2. Status / scheduling flags
      if (hideContactedToday && isContactedToday(c)) return false;
      if (hideAlreadyScheduled && scheduledContactIdsSet.has(c.id)) return false;
      if (showOnlySkipped && !contactMetaMap.get(c.id)?.isSkipped) return false;

      // 3. Group filter
      if (hasGroupFilter) {
        const cGroup = (c.group || 'Agenda de Contatos').toLowerCase();
        if (isSemCampanhaFilter) {
          const isNoCampaign = cGroup.includes('sem campanha') || cGroup.includes('agenda de contatos') || !c.group || isInvalidCategoryName(c.group);
          if (!isNoCampaign) return false;
        } else {
          if (cGroup !== groupFilterLower) return false;
        }
      }

      return true;
    });
  }, [
    contacts, 
    debouncedSearchTerm, 
    selectedGroupFilter, 
    hideContactedToday, 
    showOnlySkipped, 
    hideAlreadyScheduled, 
    scheduledContactIdsSet, 
    contactMetaMap
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / pageSize) || 1;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Is active search query targeting a phone number?
  const isSearchingByPhone = useMemo(() => {
    const trimmed = debouncedSearchTerm.trim();
    return /\d{2,}/.test(trimmed) || trimmed.includes('+') || trimmed.includes('(') || trimmed.includes(')');
  }, [debouncedSearchTerm]);

  // Selection handlers
  const handleToggleSelect = React.useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredContacts.map(c => c.id);
    setSelectedIds(Array.from(new Set([...selectedIds, ...filteredIds])));
  };

  const handleSelect50Uncontacted = () => {
    const candidates = filteredContacts
      .filter(c => !isContactedToday(c) && !scheduledContactIdsSet.has(c.id))
      .slice(0, 50)
      .map(c => c.id);
    setSelectedIds(candidates);
    showNotification(`✅ ${candidates.length} contatos prontos para envio selecionados!`);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Assign chip to selected contacts
  const handleAssignChipToSelected = (chipId: string) => {
    if (selectedIds.length === 0) return;
    const chipsList = settings?.chips || getSettings().chips || [];
    const chipObj = chipsList.find(c => c.id === chipId);
    if (!chipObj) return;

    const updatedContacts = contacts
      .filter(c => selectedIds.includes(c.id))
      .map(c => ({
        ...c,
        chipId: chipObj.id,
        chipName: cleanChipName(chipObj.name)
      }));

    if (onUpdateMultipleContacts) {
      onUpdateMultipleContacts(updatedContacts);
      showNotification(`📲 ${selectedIds.length} contatos vinculados ao chip ${cleanChipName(chipObj.name)}!`);
      setSelectedIds([]);
    }
  };

  // Delete selected contacts
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    onDeleteMultipleContacts(selectedIds);
    showNotification(`🗑️ ${count} contato(s) excluído(s) com sucesso!`);
    setSelectedIds([]);
  };

  // Delete all filtered contacts or all contacts
  const handleDeleteAllFiltered = () => {
    if (filteredContacts.length === 0) return;
    const idsToDelete = filteredContacts.map(c => c.id);
    onDeleteMultipleContacts(idsToDelete);
    showNotification(`🗑️ ${idsToDelete.length} contatos excluídos com sucesso!`);
    setSelectedIds([]);
  };

  const handleDeleteAllContacts = () => {
    if (contacts.length === 0) {
      alert('Sua lista de contatos já está vazia.');
      return;
    }
    if (safeConfirm(`🚨 ATENÇÃO: Tem certeza que deseja EXCLUIR TODOS os ${contacts.length} contatos? Esta ação é irreversível e limpará toda sua agenda.`)) {
      if (onReplaceAllContacts) {
        onReplaceAllContacts([]);
      } else {
        const allIds = contacts.map(c => c.id);
        onDeleteMultipleContacts(allIds);
      }
      setSelectedIds([]);
      showNotification('🗑️ Todos os contatos foram excluídos permanentemente!');
    }
  };

  // VCF Export and Import
  const handleExportVcf = () => {
    if (contacts.length === 0) {
      alert('Nenhum contato para exportar.');
      return;
    }
    downloadVcfFile(contacts, 'agenda_contatos_whatsapp.vcf');
    showNotification(`📥 Arquivo .VCF baixado com ${contacts.length} contatos!`);
  };

  const handleImportVcfFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const parsed = parseVcfContent(text, defaultCountryCode);
        if (parsed.length === 0) {
          alert('Nenhum contato válido encontrado no arquivo.');
          return;
        }
        if (onAddMultipleContacts) {
          onAddMultipleContacts(parsed);
        } else {
          parsed.forEach(c => onAddContact(c));
        }
        showNotification(`✅ ${parsed.length} contatos importados do arquivo VCF com sucesso!`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Remove Duplicates
  const handleRemoveDuplicates = () => {
    const seen = new Set<string>();
    const unique: Contact[] = [];
    let removedCount = 0;

    contacts.forEach(c => {
      const clean = (c.phone || '').replace(/\D/g, '');
      if (clean) {
        if (!seen.has(clean)) {
          seen.add(clean);
          unique.push(c);
        } else {
          removedCount++;
        }
      } else {
        unique.push(c);
      }
    });

    if (removedCount === 0) {
      alert('Nenhum contato duplicado encontrado.');
      return;
    }

    if (safeConfirm(`Encontrados ${removedCount} contatos duplicados por número de telefone.\nDeseja removê-los agora?`)) {
      if (onReplaceAllContacts) {
        onReplaceAllContacts(unique);
      } else if (onDeleteMultipleContacts) {
        const uniqueIds = new Set(unique.map(u => u.id));
        const idsToDelete = contacts.filter(c => !uniqueIds.has(c.id)).map(c => c.id);
        onDeleteMultipleContacts(idsToDelete);
      }
      showNotification(`🧹 ${removedCount} contatos duplicados removidos com sucesso!`);
    }
  };

  const handleOptimizeAllContacts = () => {
    if (contacts.length === 0) {
      alert('Não há contatos para otimizar.');
      return;
    }

    if (safeConfirm(`Deseja otimizar os nomes e grupos de todos os ${contacts.length} contatos?\n\nIsso removerá tags de campanha dos nomes e os agrupará automaticamente (ex: CG 05/50, Guapó, etc.).`)) {
      const optimized = enrichContacts(contacts);
      if (onReplaceAllContacts) {
        onReplaceAllContacts(optimized);
        showNotification('✨ Agenda otimizada com sucesso!');
      }
    }
  };

  // Open Edit modal
  const handleOpenEdit = React.useCallback((c: Contact) => {
    setEditingContact(c);
    setFormName(c.name || '');
    setFormPhone(c.phone || '');
    setFormEmail(c.email || '');
    setFormCompany(c.company || '');
    setFormGroup(c.group || 'Agenda de Contatos');
    setFormChipId(c.chipId || 'chip_1');
    setFormNotes(c.notes || '');
    setFormCustomFields(
      c.customFields
        ? Object.entries(c.customFields).map(([key, value]) => ({ key, value }))
        : []
    );
    setIsAddModalOpen(true);
  }, []);

  // Open Add modal
  const handleOpenAdd = React.useCallback(() => {
    setEditingContact(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormCompany('');
    setFormGroup('Agenda de Contatos');
    setFormChipId('chip_1');
    setFormNotes('');
    setFormCustomFields([]);
    setIsAddModalOpen(true);
  }, []);

  // Suggest Category and Dynamic Fields with AI for single contact form
  const handleSuggestSingleWithAi = async () => {
    if (!formName.trim() && !formPhone.trim()) {
      alert('Digite ao menos o nome do contato (com ou sem tags) para a IA analisar.');
      return;
    }

    try {
      setIsAiSuggestingSingle(true);
      const res = await fetch('/api/ai/categorize-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: 'single_test',
            name: formName,
            phone: formPhone,
            currentCategory: formGroup,
            notes: formNotes,
          }],
          knownCategories: groups.map(g => g.name),
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao analisar com IA.');
      }

      const data = await res.json();
      const first = (data.results || [])[0];
      if (first) {
        if (first.cleanName) setFormName(first.cleanName);
        if (first.category) setFormGroup(first.category);
        if (first.chipId) setFormChipId(first.chipId);
        if (first.notes) setFormNotes(first.notes);

        if (first.customFields && Object.keys(first.customFields).length > 0) {
          setFormCustomFields(
            Object.entries(first.customFields).map(([key, value]) => ({
              key,
              value: String(value),
            }))
          );
        }
        showNotification('✨ IA preencheu categoria, chip e novos campos!');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao sugerir com IA');
    } finally {
      setIsAiSuggestingSingle(false);
    }
  };

  // Save Contact form
  const handleSaveContactForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      alert('Nome e Telefone são obrigatórios.');
      return;
    }

    const cleanedPhone = cleanPhoneNumber(formPhone, defaultCountryCode);
    
    const currentSettings = getSettings();
    const chipObj = (currentSettings.chips || []).find(c => c.id === formChipId);
    const chipName = chipObj ? cleanChipName(chipObj.name) : (formChipId === 'chip_1' ? 'Business' : 'Suporte');

    // Parse dynamic custom fields
    const customFieldsObj: Record<string, string> = {};
    formCustomFields.forEach(cf => {
      const k = cf.key.trim();
      const v = cf.value.trim();
      if (k && v) {
        customFieldsObj[k] = v;
      }
    });

    const hasCustomFields = Object.keys(customFieldsObj).length > 0;

    if (editingContact) {
      const { cleanName, detectedGroup } = processContactName(formName);
      const isIgnored = isIgnoredSequenceTag(formGroup.trim());
      const isGenericGroup = isIgnored || !formGroup.trim() || formGroup.trim() === 'Agenda de Contatos' || formGroup.trim() === 'Geral' || formGroup.trim() === 'sem_campanha';
      let finalGroup = (detectedGroup && isGenericGroup) ? detectedGroup : (isIgnored ? 'Agenda de Contatos' : (formGroup.trim() || detectedGroup || 'Agenda de Contatos'));
      if (isIgnoredSequenceTag(finalGroup)) finalGroup = 'Agenda de Contatos';

      const updated: Contact = {
        ...editingContact,
        name: cleanName || formName.trim(),
        phone: cleanedPhone,
        email: formEmail.trim() || undefined,
        company: formCompany.trim() || undefined,
        group: finalGroup,
        chipId: formChipId,
        chipName,
        notes: formNotes.trim() || undefined,
        customFields: hasCustomFields ? customFieldsObj : undefined,
      };
      if (onUpdateContact) onUpdateContact(updated);
      showNotification(`✅ Contato "${updated.name}" atualizado!`);
    } else {
      const { cleanName, detectedGroup } = processContactName(formName);
      const isIgnored = isIgnoredSequenceTag(formGroup.trim());
      const isGenericGroup = isIgnored || !formGroup.trim() || formGroup.trim() === 'Agenda de Contatos' || formGroup.trim() === 'Geral' || formGroup.trim() === 'sem_campanha';
      let finalGroup = (detectedGroup && isGenericGroup) ? detectedGroup : (isIgnored ? 'Agenda de Contatos' : (formGroup.trim() || detectedGroup || 'Agenda de Contatos'));
      if (isIgnoredSequenceTag(finalGroup)) finalGroup = 'Agenda de Contatos';

      const newContact: Contact = {
        id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName || formName.trim(),
        phone: cleanedPhone,
        email: formEmail.trim() || undefined,
        company: formCompany.trim() || undefined,
        group: finalGroup,
        chipId: formChipId,
        chipName,
        notes: formNotes.trim() || undefined,
        customFields: hasCustomFields ? customFieldsObj : undefined,
        source: 'manual',
        createdAt: new Date().toISOString(),
      };
      onAddContact(newContact);
      showNotification(`✅ Novo contato "${newContact.name}" cadastrado na categoria "${finalGroup}"!`);
    }

    setIsAddModalOpen(false);
  };

  // Quick Schedule execution
  const handleExecuteQuickSchedule = () => {
    if (selectedIds.length === 0) {
      alert('Selecione pelo menos 1 contato para agendar.');
      return;
    }

    const selectedTemplate = availableTemplates.find(t => t.id === quickTemplateId);
    if (!selectedTemplate) {
      alert('Selecione um modelo de mensagem válido.');
      return;
    }

    // Determine target scheduled time
    let scheduledDateIso = new Date().toISOString();
    const now = new Date();

    if (quickTimePreset === 'now') {
      scheduledDateIso = new Date(now.getTime() + 1000).toISOString();
    } else if (quickTimePreset === '15m') {
      scheduledDateIso = new Date(now.getTime() + 15 * 60000).toISOString();
    } else if (quickTimePreset === '30m') {
      scheduledDateIso = new Date(now.getTime() + 30 * 60000).toISOString();
    } else if (quickTimePreset === '1h') {
      scheduledDateIso = new Date(now.getTime() + 60 * 60000).toISOString();
    } else if (quickTimePreset === 'today14') {
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
      if (target.getTime() < now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      scheduledDateIso = target.toISOString();
    } else if (quickTimePreset === 'today18') {
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
      if (target.getTime() < now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      scheduledDateIso = target.toISOString();
    } else if (quickTimePreset === 'tomorrow09') {
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
      scheduledDateIso = target.toISOString();
    } else if (quickTimePreset === 'custom' && quickCustomDate) {
      const parsed = new Date(quickCustomDate);
      if (!isNaN(parsed.getTime())) {
        scheduledDateIso = parsed.toISOString();
      }
    }

    const attachedCard = availableCards.find(c => c.id === quickCardId);

    const newCampaign: ScheduledCampaign = {
      id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: quickCustomTitle.trim() || `Disparo Rápido (${selectedIds.length} contatos)`,
      templateId: selectedTemplate.id,
      templateContent: selectedTemplate.content,
      categoryName: selectedTemplate.category,
      useVariations: true,
      contactIds: [...selectedIds],
      scheduledAt: scheduledDateIso,
      status: 'agendado',
      intervalSeconds: settings?.defaultIntervalSeconds || 8,
      sendMode: settings?.sendMode || 'whatsapp_desktop',
      cardId: attachedCard?.id,
      cardTitle: attachedCard?.title,
      cardImageUrl: attachedCard?.imageUrl,
      progress: {
        sent: 0,
        failed: 0,
        total: selectedIds.length,
      },
      chipId: 'chip_1',
      chipName: 'Business',
      createdAt: new Date().toISOString(),
    };

    if (onScheduleCampaign) {
      onScheduleCampaign(newCampaign);
    } else {
      // Fallback save to local storage
      const existing = loadFromStorage<ScheduledCampaign[]>('gkd_campaigns_v1', []);
      localStorage.setItem('gkd_campaigns_v1', JSON.stringify([newCampaign, ...existing]));
    }

    setIsQuickScheduleModalOpen(false);
    setSelectedIds([]);
    showNotification(`🚀 Campanha "${newCampaign.title}" agendada com ${newCampaign.contactIds.length} contatos com sucesso!`);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 bg-[#00A884] text-black font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{notification}</span>
        </div>
      )}

      {/* Hidden VCF File Input */}
      <input 
        type="file" 
        ref={vcfFileInputRef} 
        onChange={handleImportVcfFile} 
        accept=".vcf,.txt,.csv" 
        className="hidden" 
      />

      {/* TOP HEADER & METRICS BAR */}
      <div className="bg-[#0E0E10] border border-[#262629] rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-4 overflow-hidden">
        <div 
          className="flex items-center justify-between cursor-pointer group"
          onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
        >
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-serif italic text-white font-bold flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#A88B4B]" />
              <span>Contador de Envios</span>
              {isHeaderExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500 group-hover:text-[#A88B4B] transition-colors" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-[#A88B4B] transition-colors" />
              )}
            </h1>
            {!isHeaderExpanded && (
              <p className="text-[10px] text-gray-500 mt-0.5 font-medium uppercase tracking-widest">
                Clique para ver estatísticas e resumo de contatos
              </p>
            )}
          </div>
          
          {!isHeaderExpanded && (
             <div className="flex items-center gap-2">
                <div className="bg-[#161619] border border-[#262629] px-2 py-1 rounded-lg flex items-center gap-1.5">
                   <Users className="w-3 h-3 text-[#A88B4B]" />
                   <span className="text-[11px] font-bold text-white">{totalContactsCount}</span>
                </div>
                <div className="bg-[#161619] border border-emerald-500/30 px-2 py-1 rounded-lg flex items-center gap-1.5">
                   <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                   <span className="text-[11px] font-bold text-emerald-300">{contactedTodayCount}</span>
                </div>
             </div>
          )}
        </div>

        {isHeaderExpanded && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-gray-400 mb-4">
              Controle de contatos, histórico de envios, importação rápida e agendamento instantâneo.
            </p>

            {/* Quick Stats Pills */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="bg-[#161619] border border-[#262629] px-3 py-2 rounded-xl flex items-center gap-2">
                <Users className="w-4 h-4 text-[#A88B4B]" />
                <div className="text-left">
                  <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Total</span>
                  <span className="text-sm font-bold text-white">{totalContactsCount}</span>
                </div>
              </div>

              <div className="bg-[#161619] border border-emerald-500/30 px-3 py-2 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <span className="text-[10px] text-emerald-400 block font-bold uppercase tracking-wider">Enviados Hoje</span>
                  <span className="text-sm font-bold text-emerald-300">{contactedTodayCount}</span>
                </div>
              </div>

              <div className="bg-[#161619] border border-blue-500/30 px-3 py-2 rounded-xl flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <div className="text-left">
                  <span className="text-[10px] text-blue-400 block font-bold uppercase tracking-wider">Prontos</span>
                  <span className="text-sm font-bold text-blue-300">{readyToSendCount}</span>
                </div>
              </div>

              {duplicateCount > 0 && (
                <button 
                  onClick={handleRemoveDuplicates}
                  className="bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 px-3 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                  title="Clique para limpar duplicados"
                >
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <div className="text-left">
                    <span className="text-[10px] text-amber-400 block font-bold uppercase tracking-wider">Duplicados</span>
                    <span className="text-sm font-bold text-amber-200">{duplicateCount}</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ACTION TOOLBAR */}
      <div className="bg-[#0E0E10] border border-[#262629] rounded-2xl p-4 shadow-lg flex flex-col gap-4">
        {/* Row 1: Search & Dropdown Filters & Division Button */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            {isSearchingByPhone ? (
              <Phone className="w-4 h-4 text-[#A88B4B] absolute left-3 top-1/2 -translate-y-1/2 animate-pulse" />
            ) : (
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            )}
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por telefone (2+ dígitos, DDD), nome..."
              className={`w-full bg-[#161619] border rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-all ${
                isSearchingByPhone
                  ? 'border-[#A88B4B]/70 ring-1 ring-[#A88B4B]/30'
                  : 'border-[#262629] focus:border-[#A88B4B]'
              }`}
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <div className="relative sm:col-span-1 lg:col-span-2">
            <select
              value={selectedGroupFilter}
              onChange={(e) => {
                const newGrp = e.target.value;
                setSelectedGroupFilter(newGrp);
                
                // Automatic selection of all contacts in this group
                if (newGrp !== 'all') {
                  const groupLower = newGrp.toLowerCase();
                  const nextFiltered = contacts.filter(c => {
                    const cGroup = (c.group || 'Agenda de Contatos').toLowerCase();
                    if (newGrp === 'sem_campanha') {
                      return cGroup.includes('sem campanha') || cGroup.includes('agenda de contatos') || !c.group;
                    }
                    return cGroup === groupLower;
                  });
                  setSelectedIds(nextFiltered.map(c => c.id));
                } else {
                  setSelectedIds([]);
                }
              }}
              className="w-full bg-[#161619] border border-[#262629] text-gray-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#A88B4B] appearance-none cursor-pointer"
            >
              <option value="all">📂 Todos os Grupos ({totalContactsCount})</option>
              <option value="sem_campanha">⚠️ Sem Campanha ({contacts.filter(c => {
                const grp = (c.group || '').toLowerCase();
                return grp.includes('sem campanha') || grp.includes('agenda de contatos') || !c.group || isInvalidCategoryName(c.group);
              }).length})</option>
              {groups.filter(g => {
                const nameLower = g.name.toLowerCase();
                return !nameLower.includes('sem campanha') && nameLower !== 'agenda de contatos' && !isInvalidCategoryName(g.name);
              }).map((g, idx) => {
                const count = contacts.filter(c => (c.group || 'Agenda de Contatos').toLowerCase() === g.name.toLowerCase()).length;
                return (
                  <option key={`${g.id}_${idx}`} value={g.name}>
                    {g.name} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>


          <div className="relative sm:col-span-1 lg:col-span-1">
            <button
              onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              className="w-full bg-[#A88B4B] hover:bg-[#C5A968] text-black font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 tracking-wider transition-all duration-75 shadow-lg active:scale-95 touch-manipulation cursor-pointer select-none"
            >
              <span>Novo Contato / Configurações</span>
              <Settings className="w-4 h-4 text-black" />
              <ChevronDown className={`w-3.5 h-3.5 text-black transition-transform duration-100 ${isActionMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isActionMenuOpen && (
              <>
                {/* Backdrop overlay */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsActionMenuOpen(false)} 
                />

                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-[#121215] border border-[#262629] rounded-2xl shadow-2xl z-50 p-2 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-75">
                  <div className="px-3 py-1.5 border-b border-[#262629]/60 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Ações & Configurações de Contatos
                  </div>


                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      handleOpenAdd();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1C1C20] active:bg-[#26262C] text-gray-100 font-semibold flex items-center gap-2.5 transition-colors duration-75 touch-manipulation cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-[#A88B4B]" />
                    <span>Novo Contato (Manual)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setIsManageGroupsModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1C1C20] active:bg-[#26262C] text-gray-200 hover:text-white font-medium flex items-center gap-2.5 transition-colors duration-75 touch-manipulation cursor-pointer"
                  >
                    <Tag className="w-4 h-4 text-[#A88B4B]" />
                    <span>Gerenciar Categorias</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      vcfFileInputRef.current?.click();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1C1C20] active:bg-[#26262C] text-gray-200 hover:text-white font-medium flex items-center gap-2.5 transition-colors duration-75 touch-manipulation cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#A88B4B]" />
                    <span>Importar VCF</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setIsPasteModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1C1C20] active:bg-[#26262C] text-gray-200 hover:text-white font-medium flex items-center gap-2.5 transition-colors duration-75 touch-manipulation cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Colar Texto</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      handleOptimizeAllContacts();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1C1C20] active:bg-[#26262C] text-blue-300 hover:text-blue-200 font-medium flex items-center gap-2.5 transition-colors duration-75 touch-manipulation cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>✨ Otimizar Agenda</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setIsAiCategorizeModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1C1C20] active:bg-[#26262C] text-amber-300 hover:text-amber-200 font-medium flex items-center gap-2.5 transition-colors duration-75 bg-amber-950/20 touch-manipulation cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>✨ Categorizar com IA</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      handleExportVcf();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1C1C20] active:bg-[#26262C] text-gray-200 hover:text-white font-medium flex items-center gap-2.5 transition-colors duration-75 touch-manipulation cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Exportar VCF</span>
                  </button>

                  <div className="my-1 border-t border-[#262629]/60" />

                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      handleDeleteAllContacts();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-950/50 active:bg-red-900/80 text-red-400 hover:text-red-300 font-semibold flex items-center gap-2.5 transition-colors duration-75 touch-manipulation cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Excluir Todos os Contatos</span>
                  </button>

                </div>
              </>
            )}
          </div>
        </div>

        {/* Row 2: Quick Filter Pills & Results Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#262629]/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-[#A88B4B]" />
              <span>Filtros rápidos:</span>
            </span>

            {/* Ocultar Enviados Hoje */}
            <button
              type="button"
              onClick={toggleHideContactedToday}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                hideContactedToday
                  ? 'bg-[#A88B4B]/20 text-[#D4AF37] border-[#A88B4B]/60 shadow-sm'
                  : 'bg-[#161619] text-gray-400 border-[#262629] hover:text-gray-200 hover:border-gray-700'
              }`}
              title="Ocultar contatos que já receberam mensagem hoje"
            >
              {hideContactedToday ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>Enviados Hoje</span>
            </button>

            {/* Ocultar Já Agendados */}
            <button
              type="button"
              onClick={toggleHideAlreadyScheduled}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                hideAlreadyScheduled
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-sm'
                  : 'bg-[#161619] text-gray-400 border-[#262629] hover:text-gray-200 hover:border-gray-700'
              }`}
              title="Ocultar contatos que já estão em campanhas agendadas ou em andamento"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Já Agendados</span>
            </button>

            {/* Apenas Pulados */}
            {skippedCount > 0 && (
              <button
                type="button"
                onClick={() => setShowOnlySkipped(!showOnlySkipped)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showOnlySkipped
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-[#161619] text-gray-400 border-[#262629] hover:text-gray-200 hover:border-gray-700'
                }`}
                title="Mostrar somente contatos que foram pulados no último envio"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Apenas Pulados ({skippedCount})</span>
              </button>
            )}

            {/* Botão de Limpar Filtros quando qualquer filtro ativo */}
            {(searchTerm || selectedGroupFilter !== 'all' || hideContactedToday || hideAlreadyScheduled || showOnlySkipped) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedGroupFilter('all');
                  if (hideContactedToday) toggleHideContactedToday();
                  if (hideAlreadyScheduled) toggleHideAlreadyScheduled();
                  if (showOnlySkipped) setShowOnlySkipped(false);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                title="Limpar todos os filtros e mostrar todos os contatos"
              >
                <X className="w-3 h-3" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-gray-400 font-medium">
            Exibindo <span className="font-bold text-white">{filteredContacts.length}</span> de <span className="font-bold text-white">{contacts.length}</span> contatos
          </div>
        </div>
      </div>



      {/* SELECTION & SCHEDULING FLOATING ACTION BANNER */}
      {selectedIds.length > 0 && (
        <div className="sticky top-16 z-30 bg-[#0E0E10] border-2 border-[#A88B4B] rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#A88B4B] text-black flex items-center justify-center font-bold text-xs sm:text-sm shadow shrink-0">
                {selectedIds.length}
              </div>
              <div>
                <h3 className="text-white font-bold text-xs sm:text-sm leading-tight">
                  {selectedIds.length} {selectedIds.length === 1 ? 'contato selecionado' : 'contatos selecionados'}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-gray-400 leading-tight">
                  Prontos para agendamento instantâneo ou envio em lote
                </p>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            {/* Bulk Delete Selected Contacts */}
            <button
              onClick={handleDeleteSelected}
              className="col-span-1 bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white border border-red-500/50 px-3 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              title="Excluir todos os contatos selecionados"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Excluir</span>
            </button>

            {/* Chip Assignment Dropdown */}
            <div className="relative col-span-1">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssignChipToSelected(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full bg-[#1C1F26] hover:bg-[#282D37] border border-[#A88B4B]/50 text-[#A88B4B] font-bold px-2 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors appearance-none cursor-pointer text-center"
              >
                <option value="">📲 Vincular Chip</option>
                {(settings?.chips || getSettings().chips || []).map(chip => (
                  <option key={chip.id} value={chip.id}>
                    {cleanChipName(chip.name)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#A88B4B] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Advanced Multi-step Wizard Schedule Button */}
            {onNavigateToNewCampaign && (
              <button
                onClick={() => onNavigateToNewCampaign(selectedIds)}
                className="col-span-2 sm:col-span-1 bg-[#1C1F26] hover:bg-[#282D37] border border-[#A88B4B]/50 text-[#A88B4B] hover:text-white font-bold px-3 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 uppercase tracking-wider transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Passo a Passo</span>
              </button>
            )}

            {/* Clear Selection Desktop */}
            <button
              onClick={handleClearSelection}
              className="hidden sm:block bg-[#161619] hover:bg-red-950/50 text-gray-400 hover:text-red-400 p-2.5 rounded-xl border border-[#262629] transition-colors shrink-0"
              title="Limpar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SELECTION SHORTCUTS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-[11px]">
        <div className="flex items-center gap-2 text-gray-400 font-medium">
          <span>Exibindo <strong>{filteredContacts.length}</strong> de <strong>{totalContactsCount}</strong> contatos</span>
          {selectedIds.length > 0 && (
            <span className="text-[#A88B4B] font-bold">({selectedIds.length} selecionados)</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            onClick={handleSelect50Uncontacted}
            className="text-[#A88B4B] hover:underline font-bold text-xs flex items-center gap-1"
          >
            ⚡ Selecionar 50 Prontos
          </button>
          <span className="text-gray-600">•</span>
          <button
            onClick={handleSelectAllFiltered}
            className="text-gray-300 hover:text-white font-semibold text-xs"
          >
            Selecionar Todos ({filteredContacts.length})
          </button>
          {selectedIds.length > 0 ? (
            <>
              <span className="text-gray-600">•</span>
              <button
                onClick={handleDeleteSelected}
                className="text-red-400 hover:text-red-300 hover:underline font-bold text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir Selecionados ({selectedIds.length})</span>
              </button>
              <span className="text-gray-600">•</span>
              <button
                onClick={handleClearSelection}
                className="text-gray-400 hover:underline font-semibold text-xs"
              >
                Desmarcar Todos
              </button>
            </>
          ) : (
            filteredContacts.length > 0 && (
              <>
                <span className="text-gray-600">•</span>
                <button
                  onClick={handleDeleteAllFiltered}
                  className="text-red-400/80 hover:text-red-300 hover:underline font-medium text-xs flex items-center gap-1"
                  title="Excluir contatos da lista atual"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Excluir Lista ({filteredContacts.length})</span>
                </button>
              </>
            )
          )}
        </div>
      </div>

      {/* CONTACTS LIST CONTAINER */}
      <div className="bg-[#0E0E10] border border-[#262629] rounded-2xl overflow-hidden shadow-xl">
        {paginatedContacts.length > 0 ? (
          <div className="divide-y divide-[#1C1C20]">
            {paginatedContacts.map((contact) => {
              const meta = contactMetaMap.get(contact.id);
              const isSelected = selectedIds.includes(contact.id);
              const isToday = isContactedToday(contact);
              const isScheduled = scheduledContactIdsSet.has(contact.id);
              const isSkipped = meta?.isSkipped;
              const chipTheme = getChipTheme(contact.chipId, contact.chipName);

              return (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  meta={meta}
                  isSelected={isSelected}
                  isToday={isToday}
                  isScheduled={isScheduled}
                  isSkipped={isSkipped}
                  chipTheme={chipTheme}
                  isHighlighted={isSearchingByPhone && matchPhoneNumber(contact.phone, searchTerm)}
                                    onToggleSelect={handleToggleSelect}
                  onOpenEdit={handleOpenEdit}
                  onDeleteContact={onDeleteContact}
                  onSendWhatsAppToContact={onSendWhatsAppToContact}
                  showNotification={showNotification}
                  setSelectedIds={setSelectedIds}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <Users className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-white font-bold text-base">Nenhum contato encontrado</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchTerm || selectedGroupFilter !== 'all'
                ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos de busca.'
                : 'Você ainda não possui contatos cadastrados. Clique em "Novo Contato" ou "Importar VCF" para começar.'}
            </p>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#1C1C20] flex items-center justify-between gap-2 text-xs bg-[#0A0A0C]">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="bg-[#161619] hover:bg-[#202024] disabled:opacity-30 text-white px-3 py-1.5 rounded-lg border border-[#262629] transition-colors"
            >
              Anterior
            </button>

            <span className="text-gray-400 font-semibold">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="bg-[#161619] hover:bg-[#202024] disabled:opacity-30 text-white px-3 py-1.5 rounded-lg border border-[#262629] transition-colors"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* QUICK SCHEDULER MODAL (AGENDAMENTO EXPRESSO) */}
      {isQuickScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0E0E10] border-2 border-[#A88B4B] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 my-auto animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#262629] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#A88B4B]/20 text-[#A88B4B] border border-[#A88B4B]/40 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Agendamento Expresso</h3>
                  <p className="text-xs text-gray-400">
                    Dispare para os <strong>{selectedIds.length} contatos selecionados</strong> em 1 clique.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsQuickScheduleModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campaign Title */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Título do Disparo:
              </label>
              <input
                type="text"
                value={quickCustomTitle}
                onChange={(e) => setQuickCustomTitle(e.target.value)}
                placeholder="Ex: Disparo Corre e Ganhe"
                className="w-full bg-[#161619] border border-[#262629] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
              />
            </div>

            {/* Message Template Selector */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Escolher Modelo de Mensagem:
              </label>
              <select
                value={quickTemplateId}
                onChange={(e) => setQuickTemplateId(e.target.value)}
                className="w-full bg-[#161619] border border-[#262629] text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#A88B4B]"
              >
                {availableTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.category ? `[${t.category}] ` : ''}{t.title}
                  </option>
                ))}
              </select>

              {/* Template Live Preview */}
              {quickTemplateId && (
                <div className="mt-2 bg-[#121214] border border-[#262629] p-3 rounded-xl">
                  <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap line-clamp-3">
                    {availableTemplates.find(t => t.id === quickTemplateId)?.content}
                  </p>
                </div>
              )}
            </div>

            {/* Attached Card / Image Picker */}
            {availableCards.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Foto / Card Anexado (Opcional):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                  <button
                    type="button"
                    onClick={() => setQuickCardId('')}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      !quickCardId ? 'bg-[#A88B4B]/20 border-[#A88B4B] text-white' : 'bg-[#161619] border-[#262629] text-gray-400'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Sem Foto</span>
                  </button>

                  {availableCards.map(card => {
                    const isCardSelected = quickCardId === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setQuickCardId(card.id)}
                        className={`p-1.5 rounded-xl border relative transition-all overflow-hidden text-left ${
                          isCardSelected ? 'bg-[#A88B4B]/20 border-[#A88B4B] ring-2 ring-[#A88B4B]' : 'bg-[#161619] border-[#262629]'
                        }`}
                      >
                        <div className="w-full h-12 bg-black rounded-lg overflow-hidden mb-1">
                          <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-[9px] font-bold text-gray-300 truncate">{card.title}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Schedule Presets */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Quando disparar?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickTimePreset('now')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    quickTimePreset === 'now' ? 'bg-[#059669] text-white border-emerald-400 shadow' : 'bg-[#161619] border-[#262629] text-gray-400 hover:text-white'
                  }`}
                >
                  🚀 Disparar Agora
                </button>

                <button
                  type="button"
                  onClick={() => setQuickTimePreset('15m')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    quickTimePreset === '15m' ? 'bg-[#A88B4B] text-black border-amber-300 shadow' : 'bg-[#161619] border-[#262629] text-gray-400 hover:text-white'
                  }`}
                >
                  ⏱️ +15 Minutos
                </button>

                <button
                  type="button"
                  onClick={() => setQuickTimePreset('30m')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    quickTimePreset === '30m' ? 'bg-[#A88B4B] text-black border-amber-300 shadow' : 'bg-[#161619] border-[#262629] text-gray-400 hover:text-white'
                  }`}
                >
                  ⏱️ +30 Minutos
                </button>

                <button
                  type="button"
                  onClick={() => setQuickTimePreset('1h')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    quickTimePreset === '1h' ? 'bg-[#A88B4B] text-black border-amber-300 shadow' : 'bg-[#161619] border-[#262629] text-gray-400 hover:text-white'
                  }`}
                >
                  ⏱️ +1 Hora
                </button>

                <button
                  type="button"
                  onClick={() => setQuickTimePreset('tomorrow09')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    quickTimePreset === 'tomorrow09' ? 'bg-[#A88B4B] text-black border-amber-300 shadow' : 'bg-[#161619] border-[#262629] text-gray-400 hover:text-white'
                  }`}
                >
                  🌅 Amanhã 09h
                </button>

                <button
                  type="button"
                  onClick={() => setQuickTimePreset('custom')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    quickTimePreset === 'custom' ? 'bg-[#A88B4B]/20 text-[#E5C365] border-[#A88B4B]/50 shadow' : 'bg-[#161619] border-[#262629] text-gray-400 hover:text-white'
                  }`}
                >
                  📅 Outro...
                </button>
              </div>

              {quickTimePreset === 'custom' && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    type="datetime-local"
                    value={quickCustomDate}
                    onChange={(e) => setQuickCustomDate(e.target.value)}
                    className="w-full bg-[#161619] border border-[#262629] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262629]">
              <button
                type="button"
                onClick={() => setIsQuickScheduleModalOpen(false)}
                className="bg-[#161619] hover:bg-[#202024] text-gray-300 px-4 py-2.5 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteQuickSchedule}
                className="bg-[#059669] hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Confirmar e Agendar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CONTACT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#0E0E10] border border-[#262629] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 my-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#262629] pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-[#A88B4B]" />
                <span>{editingContact ? 'Editar Contato' : 'Novo Contato'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContactForm} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Nome Completo: *
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestSingleWithAi}
                    disabled={isAiSuggestingSingle || !formName.trim()}
                    className="text-[10px] text-[#A88B4B] hover:text-[#C5A059] font-bold flex items-center gap-1 transition-colors disabled:opacity-40"
                  >
                    <Sparkles className={`w-3 h-3 ${isAiSuggestingSingle ? 'animate-spin' : ''}`} />
                    <span>{isAiSuggestingSingle ? 'Analisando IA...' : '✨ Sugerir com IA'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onBlur={() => {
                    if (formName.trim()) {
                      const { cleanName, detectedGroup } = processContactName(formName);
                      if (cleanName && cleanName !== formName) {
                        setFormName(cleanName);
                      }
                      if (detectedGroup && !isIgnoredSequenceTag(detectedGroup) && (!formGroup.trim() || formGroup === 'Agenda de Contatos' || formGroup === 'Geral' || formGroup === 'sem_campanha' || isIgnoredSequenceTag(formGroup))) {
                        setFormGroup(detectedGroup);
                      }
                    }
                  }}
                  placeholder="Ex: João Silva_Tx0_14/08 ou Pedro_CORR_50"
                  className="w-full bg-[#161619] border border-[#262629] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Telefone / WhatsApp: *
                </label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ex: 5511999998888"
                  className="w-full bg-[#161619] border border-[#262629] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Grupo / Categoria:
                  </label>
                  <input
                    type="text"
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value)}
                    placeholder="Ex: Taxa Zero (TX0) ou Correção"
                    className="w-full bg-[#161619] border border-[#262629] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Chip de Envio:
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormChipId(prev => prev === 'chip_1' ? 'chip_2' : 'chip_1')}
                    className={`w-full bg-[#161619] border rounded-xl px-3 py-2 text-xs font-bold transition-all flex items-center justify-between group ${
                      formChipId === 'chip_1'
                        ? 'border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/5'
                        : 'border-blue-500/60 text-blue-300 hover:bg-blue-500/5'
                    }`}
                  >
                    <span>{formChipId === 'chip_1' ? '💼 Business' : '🎧 Suporte'}</span>
                    <RefreshCcw className="w-3 h-3 text-gray-500 group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                </div>
              </div>

              {/* Dynamic Custom Fields Section */}
              <div className="bg-[#121418] border border-[#262629] p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-300/90 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3 text-[#A88B4B]" />
                    <span>Campos Personalizados (Taxas, Valores, Metas)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormCustomFields([...formCustomFields, { key: '', value: '' }])}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Campo</span>
                  </button>
                </div>

                {formCustomFields.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic">
                    Nenhum campo adicional. Clique em "+ Campo" ou "✨ Sugerir com IA" para extrair taxas ou valores.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {formCustomFields.map((cf, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nome do campo (ex: Taxa)"
                          value={cf.key}
                          onChange={(e) => {
                            const updated = [...formCustomFields];
                            updated[idx].key = e.target.value;
                            setFormCustomFields(updated);
                          }}
                          className="flex-1 bg-[#161619] border border-[#262629] rounded-lg px-2.5 py-1.5 text-xs text-amber-200 placeholder-gray-600 focus:outline-none focus:border-[#A88B4B]"
                        />
                        <input
                          type="text"
                          placeholder="Valor (ex: 0% ou R$ 50)"
                          value={cf.value}
                          onChange={(e) => {
                            const updated = [...formCustomFields];
                            updated[idx].value = e.target.value;
                            setFormCustomFields(updated);
                          }}
                          className="flex-1 bg-[#161619] border border-[#262629] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#A88B4B]"
                        />
                        <button
                          type="button"
                          onClick={() => setFormCustomFields(formCustomFields.filter((_, i) => i !== idx))}
                          className="p-1.5 text-gray-500 hover:text-red-400 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Observações / Notas:
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Notas adicionais sobre o contato..."
                  className="w-full bg-[#161619] border border-[#262629] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#A88B4B] resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#262629]">
                {editingContact && (
                  <>
                    {isDeletingContact ? (
                      <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-500/30 p-1 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                        <span className="text-[10px] font-black text-red-200 uppercase px-2">Excluir?</span>
                        <button
                          type="button"
                          onClick={() => setIsDeletingContact(false)}
                          className="px-2.5 py-1.5 bg-[#161619] hover:bg-[#1C1C1F] text-gray-400 rounded-lg text-[10px] font-bold transition-all"
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteContact(editingContact.id);
                            setIsDeletingContact(false);
                            setIsAddModalOpen(false);
                            showNotification(`🗑️ Contato "${editingContact.name}" excluído.`);
                          }}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-red-600/30"
                        >
                          Sim
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeletingContact(true)}
                        className="bg-red-950/50 hover:bg-red-900/70 border border-red-500/40 text-red-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    )}
                  </>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="bg-[#161619] hover:bg-[#202024] text-gray-300 px-4 py-2.5 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#A88B4B] hover:bg-[#C5A968] text-black font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors shadow cursor-pointer"
                  >
                    Salvar Contato
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASTE CONTACTS MODAL */}
      {isPasteModalOpen && (
        <PasteContactsModal
          isOpen={isPasteModalOpen}
          onClose={() => setIsPasteModalOpen(false)}
          onAddContacts={(newOnes) => {
            if (onAddMultipleContacts) onAddMultipleContacts(newOnes);
            else newOnes.forEach(c => onAddContact(c));
            showNotification(`✅ ${newOnes.length} contatos adicionados com sucesso!`);
          }}
          groups={groups}
          defaultCountryCode={defaultCountryCode}
        />
      )}

      {/* SCAN CONTACTS MODAL */}
      {isScanModalOpen && (
        <ScanContactsModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          contacts={contacts}
          groups={groups}
          campaigns={campaigns}
          onUpdateContacts={(updated) => {
            if (onReplaceAllContacts) {
              onReplaceAllContacts(updated);
            }
          }}
        />
      )}

      {/* AI CATEGORIZE MODAL */}
      {isAiCategorizeModalOpen && (
        <AiCategorizeModal
          isOpen={isAiCategorizeModalOpen}
          onClose={() => setIsAiCategorizeModalOpen(false)}
          contacts={contacts}
          groups={groups}
          selectedContactIds={selectedIds}
          onApplyResults={(updatedContacts, newCategories) => {
            if (onReplaceAllContacts) {
              onReplaceAllContacts(updatedContacts);
            } else if (onUpdateMultipleContacts) {
              onUpdateMultipleContacts(updatedContacts);
            }
            const catMsg = newCategories.length > 0 ? ` (${newCategories.length} novas categorias descobertas: ${newCategories.join(', ')})` : '';
            showNotification(`✨ ${updatedContacts.length} contatos classificados com IA!${catMsg}`);
          }}
        />
      )}

      {/* MANAGE GROUPS MODAL */}
      {isManageGroupsModalOpen && (
        <ManageGroupsModal
          isOpen={isManageGroupsModalOpen}
          onClose={() => setIsManageGroupsModalOpen(false)}
          groups={groups}
          onAddGroup={onAddGroup || (() => {})}
          onDeleteGroup={onDeleteGroup}
          onUpdateGroup={onUpdateGroup || (() => {})}
          contactCounts={contactCounts}
        />
      )}
    </div>
  );
});
