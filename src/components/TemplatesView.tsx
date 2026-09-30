import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Sparkles, 
  Trash2, 
  Pencil, 
  Copy, 
  Check, 
  Eye, 
  X,
  RefreshCw,
  Search,
  Send,
  Car,
  Bike,
  Star,
  ListFilter,
  ChevronDown,
  CheckSquare
} from 'lucide-react';
import { MessageTemplate, Contact } from '../types';
import { AVAILABLE_VARIABLES, replaceTemplateVariables, safeConfirm, matchPhoneNumber, matchContact } from '../utils/whatsapp';
import { TOPICS_LIST } from '../data/topics';
import { getSettings, saveSettings } from '../utils/storage';

interface TemplatesViewProps {
  templates: MessageTemplate[];
  contacts: Contact[];
  onAddTemplate: (tmpl: MessageTemplate) => void;
  onUpdateTemplate: (tmpl: MessageTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onDeleteTemplates: (ids: string[]) => void;
  onRenameTopic?: (oldTopic: string, newTopic: string) => void;
  onDeleteTopic?: (category: string) => void;
  onDeleteAllTemplates?: () => void;
  onRestoreDefaultTemplates?: () => void;
  onOpenAiModal: () => void;
  onOpenTopicGenerator: () => void;
  onSendWhatsAppToContact: (contact: Contact, customMsg?: string) => void;
  onNavigate?: (tab: string) => void;
}

interface TemplateCardProps {
  tmpl: MessageTemplate;
  sampleContact: Partial<Contact>;
  isExpanded: boolean;
  isSelected: boolean;
  isHighlighted?: boolean;
  copiedId: string | null;
  onToggleExpanded: (id: string) => void;
  onCopyText: (text: string, id: string) => void;
  onToggleSelect: (id: string) => void;
  onOpenEdit: (tmpl: MessageTemplate) => void;
  onDelete: (id: string) => void;
  onDispatch: (tmpl: MessageTemplate) => void;
  onUpdateTemplate: (tmpl: MessageTemplate) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = React.memo(({
  tmpl,
  sampleContact,
  isExpanded,
  isSelected,
  isHighlighted,
  copiedId,
  onToggleExpanded,
  onCopyText,
  onToggleSelect,
  onOpenEdit,
  onDelete,
  onDispatch,
  onUpdateTemplate,
}) => {
  const renderedText = useMemo(
    () => replaceTemplateVariables(tmpl.content, sampleContact),
    [tmpl.content, sampleContact]
  );

  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  return (
    <div
      id={`template-card-${tmpl.id}`}
      className={`bg-[#15181E] border rounded-xl p-5 transition-all flex flex-col justify-between space-y-4 shadow-xl group ${
        isHighlighted
          ? 'border-purple-400 ring-2 ring-purple-400 shadow-2xl shadow-purple-500/40 animate-pulse'
          : isSelected
          ? 'border-amber-500/80 ring-1 ring-amber-500/50 bg-[#15181E]/90'
          : 'border-[#1F2229] hover:border-[#A88B4B]/40'
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-serif italic text-white text-base group-hover:text-amber-400 transition-colors">
            {tmpl.title}
          </h4>
          <div className="flex items-center space-x-1.5">
            <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded font-bold border border-amber-500/20">
              🚗 Carro
            </span>
          </div>
        </div>

        <div className="bg-[#0A0C10] p-3.5 rounded-lg border border-[#1F2229] group-hover:border-[#1F2229]/80 transition-all">
          <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
            {tmpl.content}
          </p>
        </div>

        <div className="bg-[#A88B4B]/5 border border-[#A88B4B]/20 p-3.5 rounded-lg">
          <span className="text-[10px] text-[#A88B4B] font-bold uppercase tracking-widest flex items-center space-x-1 mb-1">
            <Eye className="w-3 h-3" />
            <span>Prévia:</span>
          </span>
          <p className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed italic">
            "{renderedText}"
          </p>
        </div>

        {tmpl.variations && tmpl.variations.length > 0 ? (
          <div className="bg-[#0A0C10] border border-purple-500/30 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="bg-purple-500/10 text-purple-400 text-[10px] px-2 py-0.5 rounded font-bold border border-purple-500/30 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{tmpl.variations.length} Variações Extras</span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onToggleExpanded(tmpl.id)}
                  className="text-[11px] text-purple-300 hover:text-white font-bold flex items-center space-x-1 transition-colors px-2 py-1 rounded bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/30 cursor-pointer"
                >
                  <span>{isExpanded ? 'Ocultar Variações' : 'Ver Variações'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja remover todas as variações extras desta mensagem e deixar apenas a original?')) {
                      onUpdateTemplate({ ...tmpl, variations: [] });
                    }
                  }}
                  className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider underline cursor-pointer"
                  title="Remover todas as variações extras desta mensagem e manter apenas a original"
                >
                  Deixar Só Original
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-2 pt-2 border-t border-purple-500/20">
                {tmpl.variations.map((vText, vIdx) => {
                  const renderedVar = replaceTemplateVariables(vText, sampleContact);
                  const varCopyId = `${tmpl.id}_var_${vIdx}`;
                  return (
                    <div key={vIdx} className="bg-[#15181E] border border-[#1F2229] p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                          Variação {vIdx + 1}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => onCopyText(renderedVar, varCopyId)}
                            className="text-[10px] text-gray-400 hover:text-purple-300 flex items-center space-x-1 font-medium"
                          >
                            {copiedId === varCopyId ? (
                              <Check className="w-3 h-3 text-purple-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedId === varCopyId ? 'Copiado' : 'Copiar'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newVars = tmpl.variations!.filter((_, i) => i !== vIdx);
                              onUpdateTemplate({ ...tmpl, variations: newVars });
                            }}
                            className="text-gray-500 hover:text-red-400 p-0.5"
                            title="Excluir esta variação"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                        {vText}
                      </p>
                      <div className="bg-[#A88B4B]/5 border border-[#A88B4B]/10 p-2 rounded text-[11px] text-gray-400 italic">
                        "{renderedVar}"
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
            <span>Sem variações extras cadastradas</span>
            <button
              type="button"
              onClick={() => onOpenEdit(tmpl)}
              className="text-purple-400 hover:text-purple-300 font-bold flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>+ Criar Variações</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#1F2229]">
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1.5 cursor-pointer bg-[#0A0C10] px-2 py-1 rounded-lg border border-[#1F2229] hover:border-amber-400/50">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(tmpl.id)}
              className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 bg-[#0A0C10] border-[#1F2229]"
            />
            <span className="text-[10px] text-amber-400 font-bold" title="Selecionar mensagem para envio combinado ou sorteio aleatório">Selecionar</span>
          </label>

          <button
            onClick={() => onCopyText(renderedText, tmpl.id)}
            className="text-xs text-gray-400 hover:text-[#A88B4B] flex items-center space-x-1.5 font-medium uppercase tracking-wider pl-2"
          >
            {copiedId === tmpl.id ? (
              <Check className="w-4 h-4 text-[#A88B4B]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copiedId === tmpl.id ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onDispatch(tmpl)}
            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border border-emerald-500/30 shadow-lg shadow-emerald-500/5"
          >
            <Send className="w-4 h-4" />
            <span>Enviar</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenEdit(tmpl)}
            className="px-2.5 py-1.5 min-h-[36px] bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border border-blue-500/30 cursor-pointer"
            title="Editar mensagem"
            aria-label="Editar mensagem"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editar</span>
          </button>
          
          {isDeleting ? (
            <div className="flex items-center gap-2 bg-red-950/90 border border-red-500/60 p-1.5 rounded-xl animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-black text-red-200 uppercase px-1.5">Excluir?</span>
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="px-3.5 py-1.5 min-h-[36px] bg-[#0A0C10] hover:bg-[#1A1D23] text-gray-200 rounded-lg text-xs font-bold border border-[#1F2229] transition-all cursor-pointer active:scale-95"
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(tmpl.id);
                  setIsDeleting(false);
                }}
                className="px-4 py-1.5 min-h-[36px] bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-extrabold transition-all shadow-lg shadow-red-600/40 cursor-pointer active:scale-95"
              >
                Sim
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsDeleting(true)}
              className="px-3.5 py-2 min-h-[40px] bg-red-500/15 hover:bg-red-600 text-red-400 hover:text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 border border-red-500/40 shadow-sm cursor-pointer active:scale-95"
              title="Excluir mensagem"
              aria-label="Excluir mensagem"
            >
              <Trash2 className="w-4 h-4" />
              <span className="font-bold">Excluir</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export const TemplatesView: React.FC<TemplatesViewProps> = React.memo(({
  templates,
  contacts,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onDeleteTemplates,
  onRenameTopic,
  onDeleteTopic,
  onDeleteAllTemplates,
  onRestoreDefaultTemplates,
  onOpenAiModal,
  onOpenTopicGenerator,
  onSendWhatsAppToContact,
  onNavigate,
}) => {
  const [settings, setSettingsState] = useState(() => getSettings());
  const [activeVehicle, setActiveVehicle] = useState<'carro'>(() => 'carro');
  
  const [activeTopic, setActiveTopicState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('zap_active_topic_v1') || null;
    } catch {
      return null;
    }
  });

  const setActiveTopic = (topic: string | null) => {
    setActiveTopicState(topic);
    try {
      if (topic) {
        localStorage.setItem('zap_active_topic_v1', topic);
      } else {
        localStorage.removeItem('zap_active_topic_v1');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'topics' | 'all'>('all');

  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [confirmDeleteAllModal, setConfirmDeleteAllModal] = useState<boolean>(false);
  const [topicToDelete, setTopicToDelete] = useState<{ category: string; count: number; ids: string[] } | null>(null);
  const [topicToDeleteInline, setTopicToDeleteInline] = useState<string | null>(null);

  const handleConfirmDeleteTopicInline = (category: string) => {
    const lower = category.trim().toLowerCase();
    const matchingTemplates = templates.filter(
      (t) => (t.category || '').trim().toLowerCase() === lower
    );
    const ids = matchingTemplates.map((t) => t.id);
    
    if (onDeleteTopic) {
      onDeleteTopic(category);
    } else {
      onDeleteTemplates(ids);
    }
    if (activeTopic && activeTopic.trim().toLowerCase() === category.trim().toLowerCase()) {
      setActiveTopic(null);
    }
  };
  const isMobile = window.innerWidth < 768;

  // Single message instant send states
  const [dispatchingTemplate, setDispatchingTemplate] = useState<MessageTemplate | null>(null);
  const [showContactPickerModal, setShowContactPickerModal] = useState<boolean>(false);
  const [contactSearchTermModal, setContactSearchTermModal] = useState<string>('');

  // Multi-select templates state
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [highlightedTemplateId, setHighlightedTemplateId] = useState<string | null>(null);
  const [dispatchingRandomCandidates, setDispatchingRandomCandidates] = useState<string[]>([]);

  const toggleSelectTemplate = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendRandomFromSelected = () => {
    const selectedTemplatesList = templates.filter((t) => selectedTemplateIds.includes(t.id));
    if (selectedTemplatesList.length === 0) return;

    const candidateTexts: string[] = [];
    selectedTemplatesList.forEach((t) => {
      if (t.content && t.content.trim()) candidateTexts.push(t.content.trim());
      if (t.variations && t.variations.length > 0) {
        t.variations.forEach((v) => {
          if (v && v.trim()) candidateTexts.push(v.trim());
        });
      }
    });

    if (candidateTexts.length === 0) {
      alert('Nenhum texto válido encontrado nas mensagens selecionadas.');
      return;
    }

    setDispatchingRandomCandidates(candidateTexts);
    setDispatchingTemplate({
      id: 'random_dispatch',
      title: `🎲 Sorteio Aleatório (${selectedTemplateIds.length} Mensagens Selecionadas)`,
      category: 'Sorteio Aleatório',
      content: candidateTexts[0] || '',
      createdAt: new Date().toISOString(),
    });
    setContactSearchTermModal('');
    setShowContactPickerModal(true);
  };

  const handleScheduleRandomFromSelected = () => {
    const selectedTemplatesList = templates.filter((t) => selectedTemplateIds.includes(t.id));
    if (selectedTemplatesList.length === 0) return;

    const candidateTexts: string[] = [];
    selectedTemplatesList.forEach((t) => {
      if (t.content && t.content.trim()) candidateTexts.push(t.content.trim());
      if (t.variations && t.variations.length > 0) {
        t.variations.forEach((v) => {
          if (v && v.trim()) candidateTexts.push(v.trim());
        });
      }
    });

    try {
      const rawDraft = localStorage.getItem('zap_campaign_draft_v1');
      const draft = rawDraft ? JSON.parse(rawDraft) : {};
      draft.selectedTemplateIds = selectedTemplateIds;
      draft.selectedTemplateId = `multi_rand_${Date.now()}`;
      draft.selectedCategoryName = `${selectedTemplateIds.length} Mensagens Selecionadas`;
      draft.randomTopicTemplates = candidateTexts;
      draft.customContent = `🎲 [ENVIO ALEATÓRIO: ${selectedTemplateIds.length} MENSAGENS SELECIONADAS]\nSerá enviada uma mensagem sorteada das ${candidateTexts.length} opções cadastradas nestes modelos para cada destinatário.`;
      localStorage.setItem('zap_campaign_draft_v1', JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save draft for random campaign:', e);
    }

    if (onNavigate) {
      onNavigate('campaigns');
    }
  };

  const handleScheduleTopicCampaign = (catName: string, catTemplates: MessageTemplate[]) => {
    const candidateTexts: string[] = [];
    catTemplates.forEach((t) => {
      if (t.content && t.content.trim()) candidateTexts.push(t.content.trim());
      if (t.variations && t.variations.length > 0) {
        t.variations.forEach((v) => {
          if (v && v.trim()) candidateTexts.push(v.trim());
        });
      }
    });

    if (candidateTexts.length === 0) {
      alert('Nenhuma mensagem com conteúdo válido encontrada nesta campanha/tópico.');
      return;
    }

    try {
      const rawDraft = localStorage.getItem('zap_campaign_draft_v1');
      const draft = rawDraft ? JSON.parse(rawDraft) : {};
      draft.selectedTemplateId = `topic_cat_${catName}`;
      draft.selectedCategoryName = catName;
      draft.randomTopicTemplates = candidateTexts;
      draft.selectedTemplateIds = catTemplates.map(t => t.id);
      draft.customContent = `🎲 [ENVIO ALEATÓRIO DA CAMPANHA: ${catName}]\nSerá enviada uma mensagem sorteada das ${candidateTexts.length} opções cadastradas nesta campanha para cada destinatário.`;
      draft.title = `Campanha ${catName}`;
      localStorage.setItem('zap_campaign_draft_v1', JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save draft for topic campaign:', e);
    }

    if (onNavigate) {
      onNavigate('campaigns');
    }
  };

  const handleSendRandomFromTopic = (catName: string, catTemplates: MessageTemplate[]) => {
    const candidateTexts: string[] = [];
    catTemplates.forEach((t) => {
      if (t.content && t.content.trim()) candidateTexts.push(t.content.trim());
      if (t.variations && t.variations.length > 0) {
        t.variations.forEach((v) => {
          if (v && v.trim()) candidateTexts.push(v.trim());
        });
      }
    });

    if (candidateTexts.length === 0) {
      alert('Nenhuma mensagem com conteúdo válido encontrada nesta campanha/tópico.');
      return;
    }

    setDispatchingRandomCandidates(candidateTexts);
    setDispatchingTemplate({
      id: `topic_cat_${catName}`,
      title: `🎲 Sorteio Aleatório (${catName})`,
      category: catName,
      content: candidateTexts[0] || '',
      createdAt: new Date().toISOString(),
    });
    setContactSearchTermModal('');
    setShowContactPickerModal(true);
  };

  // Form states
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('Primeira Abordagem');
  const [vehicleType, setVehicleType] = useState<'carro' | 'moto' | 'ambos'>('carro');
  const [content, setContent] = useState<string>('');
  const [variations, setVariations] = useState<string[]>([]);
  const [expandedVariations, setExpandedVariations] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingVariations, setGeneratingVariations] = useState<boolean>(false);

  const toggleExpandedVariations = (id: string) => {
    setExpandedVariations((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const [editingTopic, setEditingTopic] = useState<{ oldName: string; currentName: string } | null>(null);

  const handleSaveRenameTopic = () => {
    if (!editingTopic) return;
    const oldName = editingTopic.oldName.trim();
    const newName = editingTopic.currentName.trim();
    if (!newName) {
      alert('O nome do tópico não pode ficar vazio.');
      return;
    }
    if (oldName === newName) {
      setEditingTopic(null);
      return;
    }
    if (onRenameTopic) {
      onRenameTopic(oldName, newName);
    } else {
      const lower = oldName.toLowerCase();
      templates.forEach((t) => {
        if (t.category && t.category.trim().toLowerCase() === lower) {
          onUpdateTemplate({ ...t, category: newName });
        }
      });
    }
    setEditingTopic(null);
  };

  // Sample contact for live preview
  const sampleContact: Partial<Contact> = {
    name: 'Ana Souza',
    company: 'TechCorp Brasil',
    email: 'ana@techcorp.com',
    group: 'Clientes VIP',
  };

  const handleSetFeaturedVehicle = (v: 'carro') => {
    const updated = { ...settings, featuredVehicle: v };
    saveSettings(updated);
    setSettingsState(updated);
  };

  const matchesVehicle = (tmpl: MessageTemplate, vehicle: 'carro') => {
    return !tmpl.vehicleType || tmpl.vehicleType === 'carro';
  };

  const handleOpenCreate = () => {
    setTitle('');
    setCategory(activeTopic || '');
    setVehicleType('carro');
    setContent('');
    setVariations([]);
    setEditingTemplate(null);
    setIsCreating(true);
  };

  const handleOpenEdit = (tmpl: MessageTemplate) => {
    setTitle(tmpl.title);
    setCategory(tmpl.category);
    setContent(tmpl.content);
    setVehicleType(tmpl.vehicleType || 'carro');
    setVariations(tmpl.variations || []);
    setEditingTemplate(tmpl);
    setIsCreating(true);
  };

  const handleInsertVariable = (varKey: string) => {
    setContent((prev) => prev + ' ' + varKey);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (editingTemplate) {
      onUpdateTemplate({
        ...editingTemplate,
        title: title.trim(),
        category: category.trim(),
        content: content.trim(),
        vehicleType: vehicleType,
        variations: variations.filter((v) => v.trim().length > 0),
      });
    } else {
      const newTmpl: MessageTemplate = {
        id: `custom_tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        category: category.trim(),
        content: content.trim(),
        vehicleType: vehicleType,
        variations: variations.filter((v) => v.trim().length > 0),
        createdAt: new Date().toISOString(),
      };
      onAddTemplate(newTmpl);
    }

    setIsCreating(false);
    setEditingTemplate(null);
  };

  const handleSaveOriginalOnly = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (editingTemplate) {
      onUpdateTemplate({
        ...editingTemplate,
        title: title.trim(),
        category: category.trim(),
        content: content.trim(),
        vehicleType: vehicleType,
        variations: [], // Salva exclusivamente o texto original, descartando variações
      });
    } else {
      const newTmpl: MessageTemplate = {
        id: `custom_tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        category: category.trim(),
        content: content.trim(),
        vehicleType: vehicleType,
        variations: [], // Salva exclusivamente o texto original, descartando variações
        createdAt: new Date().toISOString(),
      };
      onAddTemplate(newTmpl);
    }

    setIsCreating(false);
    setEditingTemplate(null);
  };

  const handleGenerateVariationsAi = async () => {
    if (!content.trim()) return;
    setGeneratingVariations(true);
    try {
      const res = await fetch('/api/ai/generate-variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalMessage: content }),
      });
      const data = await res.json();
      if (data.variations && Array.isArray(data.variations)) {
        setVariations(data.variations);
      }
    } catch (err) {
      console.error('Erro ao gerar variações:', err);
    } finally {
      setGeneratingVariations(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeakText = (text: string, female: boolean = true) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.pitch = female ? 1.2 : 0.85;
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.includes('pt') || v.lang.includes('BR'));
    if (voices.length > 0) {
      if (female) {
        const fVoice = voices.find((v) => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('luciana') || 
          v.name.toLowerCase().includes('maria') || 
          v.name.toLowerCase().includes('google português do brasil')
        );
        if (fVoice) utterance.voice = fVoice;
      } else {
        const mVoice = voices.find((v) => 
          v.name.toLowerCase().includes('male') || 
          v.name.toLowerCase().includes('felipe') || 
          v.name.toLowerCase().includes('thiago')
        );
        if (mVoice) utterance.voice = mVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  };

  // Clear all messages from Aba Moto leaving only topics
  const handleClearMotoMessages = () => {
    if (confirm('Deseja apagar todas as mensagens da Aba Moto e deixar apenas os Tópicos vazios?') || (window.self !== window.top)) {
      templates.forEach((t) => {
        if (t.vehicleType === 'moto') {
          onDeleteTemplate(t.id);
        } else if (t.vehicleType === 'ambos' || !t.vehicleType) {
          onUpdateTemplate({ ...t, vehicleType: 'carro' });
        }
      });
    }
  };

  const handleInitiateDeleteTopic = (category: string) => {
    const lower = category.trim().toLowerCase();
    const matchingTemplates = templates.filter(
      (t) => (t.category || '').trim().toLowerCase() === lower
    );
    setTopicToDelete({
      category,
      count: matchingTemplates.length,
      ids: matchingTemplates.map((t) => t.id),
    });
  };

  const handleConfirmDeleteTopic = () => {
    if (!topicToDelete) return;
    const { category, ids } = topicToDelete;
    if (onDeleteTopic) {
      onDeleteTopic(category);
    } else {
      onDeleteTemplates(ids);
    }
    if (activeTopic && activeTopic.trim().toLowerCase() === category.trim().toLowerCase()) {
      setActiveTopic(null);
    }
    setTopicToDelete(null);
  };

  // Filter templates for active vehicle
  const vehicleFilteredTemplates = useMemo(() => {
    return templates.filter((t) => t && matchesVehicle(t, activeVehicle));
  }, [templates, activeVehicle]);

  const handleSelectRandomTemplate = useCallback((categoryFilter?: string) => {
    const pool = vehicleFilteredTemplates.filter((t) => {
      if (!t || !t.content) return false;
      if (categoryFilter) return (t.category || '').trim().toLowerCase() === categoryFilter.trim().toLowerCase();
      if (activeTopic) return (t.category || '').trim().toLowerCase() === activeTopic.trim().toLowerCase();
      return true;
    });

    if (pool.length === 0) {
      alert('Nenhuma mensagem criada encontrada para sorteio.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];

    setHighlightedTemplateId(chosen.id);
    setSelectedTemplateIds([chosen.id]);

    setTimeout(() => {
      const el = document.getElementById(`template-card-${chosen.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    setTimeout(() => {
      setHighlightedTemplateId(null);
    }, 3500);
  }, [vehicleFilteredTemplates, activeTopic]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    vehicleFilteredTemplates.forEach((t) => {
      if (t && t.category && t.category.trim()) {
        cats.add(t.category.trim());
      }
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [vehicleFilteredTemplates]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < vehicleFilteredTemplates.length; i++) {
      const cat = vehicleFilteredTemplates[i]?.category?.trim();
      if (cat) {
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    }
    return map;
  }, [vehicleFilteredTemplates]);

  // If activeTopic no longer exists in available categories, reset to all
  useEffect(() => {
    if (activeTopic && allCategories.length > 0) {
      const exists = allCategories.some(
        (c) => c.toLowerCase() === activeTopic.toLowerCase()
      );
      if (!exists) {
        setActiveTopic(null);
      }
    }
  }, [activeTopic, allCategories]);

  const groupedTemplates = useMemo(() => {
    const filtered = vehicleFilteredTemplates.filter((t) => {
      if (!t) return false;
      const titleStr = (t.title || '').toLowerCase();
      const contentStr = (t.content || '').toLowerCase();
      const catStr = (t.category || '').toLowerCase();
      const variationsStr = (t.variations || []).join(' ').toLowerCase();
      const search = (searchTerm || '').trim().toLowerCase();

      const matchesSearch =
        !search ||
        titleStr.includes(search) ||
        contentStr.includes(search) ||
        catStr.includes(search) ||
        variationsStr.includes(search);

      const matchesTopic =
        !activeTopic || catStr === activeTopic.trim().toLowerCase();

      return matchesSearch && matchesTopic;
    });

    const groups: Record<string, MessageTemplate[]> = {};
    filtered.forEach((tmpl) => {
      if (!tmpl) return;
      const cat = tmpl.category?.trim() || 'Geral';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tmpl);
    });

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [vehicleFilteredTemplates, searchTerm, activeTopic]);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#15181E] border border-[#1F2229] p-6 rounded-xl shadow-xl">
        <div>
          <h2 className="text-2xl font-serif italic text-white flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-[#A88B4B]" />
            <span>Modelos de Mensagens</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Organize e envie suas mensagens de forma rápida e eficiente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSelectRandomTemplate()}
            className="bg-[#0A0C10] hover:bg-purple-950/50 text-purple-300 hover:text-white border border-purple-500/40 px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center space-x-2 shadow-md cursor-pointer"
            title="Sortear e selecionar uma mensagem aleatória dentre as criadas"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>🎲 Selecionar Aleatória</span>
          </button>

          <button
            onClick={onOpenTopicGenerator}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center space-x-2 shadow-lg shadow-purple-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerador Estratégico</span>
          </button>

          <button
            onClick={onOpenAiModal}
            className="bg-[#0A0C10] hover:bg-[#1A1D23] text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Gerar com IA</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all flex items-center space-x-2 shadow-md shadow-[#A88B4B]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Mensagem</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SIDEBAR: TOPICS LIST */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#15181E] border border-[#1F2229] rounded-xl overflow-hidden shadow-xl">
            <div className="bg-[#0A0C10] border-b border-[#1F2229] px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] font-black text-[#A88B4B] uppercase tracking-widest flex items-center space-x-2">
                <ListFilter className="w-3.5 h-3.5" />
                <span>Tópicos</span>
              </span>
              <span className="bg-[#A88B4B]/10 text-[#A88B4B] text-[10px] px-2 py-0.5 rounded-full border border-[#A88B4B]/20 font-bold">
                {allCategories.length}
              </span>
            </div>
            
            <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => setActiveTopic(null)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all ${
                  activeTopic === null
                    ? 'bg-[#A88B4B] text-[#0A0C10] font-bold shadow-lg shadow-[#A88B4B]/10'
                    : 'text-gray-400 hover:bg-[#1A1D23] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MessageSquare className={`w-3.5 h-3.5 ${activeTopic === null ? 'text-[#0A0C10]' : 'text-[#A88B4B]'}`} />
                  <span>Todos os Modelos</span>
                </div>
                <span className={`text-[10px] ${activeTopic === null ? 'bg-[#0A0C10]/20' : 'bg-[#0A0C10]'} px-1.5 py-0.5 rounded min-w-[20px] text-center`}>
                  {vehicleFilteredTemplates.length}
                </span>
              </button>

              {allCategories.map((cat) => {
                const count = categoryCounts.get(cat) || 0;
                const isActive = activeTopic === cat;
                return (
                  <div
                    key={cat}
                    className={`group/topic flex items-center justify-between rounded-lg transition-all p-1 ${
                      isActive
                        ? 'bg-[#A88B4B] shadow-md shadow-[#A88B4B]/10'
                        : 'hover:bg-[#1A1D23] bg-[#111318] border border-[#1F2229]/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTopic(cat)}
                      className="flex-1 flex items-center justify-between px-2 py-1.5 text-xs text-left min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 min-w-0 mr-1.5">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isActive ? 'bg-[#0A0C10]' : 'bg-[#A88B4B]'
                          }`}
                        />
                        <span
                          className={`truncate text-xs font-semibold ${
                            isActive ? 'text-[#0A0C10]' : 'text-gray-200 group-hover/topic:text-white'
                          }`}
                        >
                          {cat}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          isActive ? 'bg-[#0A0C10]/25 text-[#0A0C10]' : 'bg-[#0A0C10] text-gray-400 border border-[#1F2229]'
                        } px-1.5 py-0.5 rounded shrink-0 min-w-[20px] text-center`}
                      >
                        {count}
                      </span>
                    </button>

                    {/* Botões de Ação Organizadores em Flex sem Sobreposição */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {/* Agendar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const catTemplates = templates.filter((t) => t && (t.category || '').trim().toLowerCase() === cat.trim().toLowerCase());
                          handleScheduleTopicCampaign(cat, catTemplates);
                        }}
                        className={`p-2 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                          isActive
                            ? 'text-[#0A0C10] hover:bg-[#0A0C10]/20'
                            : 'text-amber-400 hover:text-white hover:bg-amber-500/30 bg-amber-500/10 border border-amber-500/20'
                        }`}
                        title={`Agendar campanha "${cat}" com escolha aleatória`}
                        aria-label={`Agendar campanha ${cat}`}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>

                      {/* Editar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setEditingTopic({ oldName: cat, currentName: cat });
                        }}
                        className={`p-2 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                          isActive
                            ? 'text-[#0A0C10] hover:bg-[#0A0C10]/20'
                            : 'text-blue-400 hover:text-white hover:bg-blue-500/30 bg-blue-500/10 border border-blue-500/20'
                        }`}
                        title={`Editar nome do tópico "${cat}"`}
                        aria-label={`Editar tópico ${cat}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Excluir */}
                      {topicToDeleteInline === cat ? (
                        <div className="flex items-center gap-1.5 bg-red-950 border border-red-500/60 p-1.5 rounded-md shadow-lg animate-in fade-in zoom-in-95 duration-150 z-30">
                          <span className="text-[10px] font-black text-red-200 uppercase px-1">Excluir?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTopicToDeleteInline(null);
                            }}
                            className="px-2 py-1 bg-[#0A0C10] hover:bg-[#1A1D23] text-gray-300 rounded text-xs font-bold cursor-pointer"
                          >
                            Não
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmDeleteTopicInline(cat);
                              setTopicToDeleteInline(null);
                            }}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-extrabold shadow cursor-pointer"
                          >
                            Sim
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setTopicToDeleteInline(cat);
                          }}
                          className={`p-2 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                            isActive
                              ? 'text-red-950 hover:bg-red-900/40 hover:text-red-100'
                              : 'text-red-400 hover:text-white hover:bg-red-600 bg-red-500/10 border border-red-500/20'
                          }`}
                          title={`Excluir tópico "${cat}"`}
                          aria-label={`Excluir tópico ${cat}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT: TEMPLATES LIST */}
        <div className="lg:col-span-9 space-y-6">
          {/* Navigation & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#15181E] border border-[#1F2229] p-3 rounded-xl shadow-lg">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <div className="bg-[#0A0C10] border border-[#1F2229] px-4 py-2 rounded text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                <Star className="w-4 h-4 text-[#A88B4B]" />
                <span>{activeTopic || 'Todas as Mensagens'}</span>
              </div>

              <button
                type="button"
                onClick={() => handleSelectRandomTemplate(activeTopic || undefined)}
                className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                title="Sortear e selecionar uma mensagem criada aleatoriamente"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>🎲 Selecionar Aleatória</span>
              </button>

              {activeTopic && (
                <button
                  type="button"
                  onClick={() => handleInitiateDeleteTopic(activeTopic)}
                  className="bg-red-500/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Excluir este tópico definitivamente"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Tópico</span>
                </button>
              )}
            </div>

            {/* Search Input for Messages */}
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-[#A88B4B] absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por título ou conteúdo..."
                className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-lg pl-10 pr-4 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B] placeholder-gray-500 font-medium"
              />
            </div>
          </div>

          {/* MULTI-SELECT FLOATING ACTION BAR FOR COMBINED SENDING OR RANDOM DISPATCH */}
          {selectedTemplateIds.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/20 via-[#15181E] to-purple-500/20 border-2 border-amber-500/60 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-4 z-40 shadow-2xl backdrop-blur-md">
              <div className="flex items-center space-x-2">
                <span className="bg-amber-500 text-[#0A0C10] font-black text-xs px-2.5 py-1 rounded-lg">
                  {selectedTemplateIds.length} selecionada(s)
                </span>
                <span className="text-xs text-white font-medium">
                  Envie juntas ou sorteie aleatoriamente entre as mensagens selecionadas!
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendRandomFromSelected}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5 shadow-md shadow-purple-600/30 cursor-pointer"
                  title="Sortear uma mensagem aleatória dentre as selecionadas para enviar ao contato"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🎲 Enviar Aleatória</span>
                </button>

                <button
                  type="button"
                  onClick={handleScheduleRandomFromSelected}
                  className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5 shadow-md cursor-pointer"
                  title="Agendar disparo no qual as mensagens selecionadas serão sorteadas a cada envio"
                >
                  <span>🚀 Agendar (Envio Aleatório)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const combinedContent = selectedTemplateIds
                      .map((id) => templates.find((t) => t.id === id)?.content)
                      .filter(Boolean)
                      .join('\n\n');
                    setDispatchingRandomCandidates([]);
                    setDispatchingTemplate({
                      id: 'combined',
                      title: `${selectedTemplateIds.length} Mensagens Combinadas`,
                      category: 'Envio Conjunto',
                      content: combinedContent,
                      createdAt: new Date().toISOString(),
                    });
                    setContactSearchTermModal('');
                    setShowContactPickerModal(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-[#0A0C10] px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1 shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Juntas</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const combined = selectedTemplateIds
                      .map((id) => templates.find((t) => t.id === id)?.content)
                      .filter(Boolean)
                      .join('\n\n');
                    navigator.clipboard.writeText(replaceTemplateVariables(combined, sampleContact));
                    setCopiedId('combined');
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="bg-[#0A0C10] hover:bg-[#1F2229] text-amber-400 border border-amber-500/30 px-3 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  {copiedId === 'combined' ? 'Copiadas Combinadas!' : 'Copiar Juntas'}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplateIds([])}
                  className="bg-[#0A0C10] hover:bg-red-500/20 text-gray-300 hover:text-red-300 px-3 py-2 rounded-xl font-bold text-xs border border-[#1F2229] cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}

          {/* MESSAGES GROUPED BY CATEGORY */}
          <div className="space-y-8 pb-20">
            {groupedTemplates.map(([category, catTemplates]) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center space-x-3 px-1">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#A88B4B]/30 to-transparent" />
                  {editingTopic && editingTopic.oldName.trim().toLowerCase() === category.trim().toLowerCase() ? (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#15181E] border border-[#A88B4B] rounded-xl shadow-lg">
                      <input
                        type="text"
                        value={editingTopic.currentName}
                        onChange={(e) => setEditingTopic({ ...editingTopic, currentName: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveRenameTopic();
                          } else if (e.key === 'Escape') {
                            setEditingTopic(null);
                          }
                        }}
                        autoFocus
                        placeholder="Nome do tópico..."
                        className="bg-[#0A0C10] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#A88B4B] min-w-[200px]"
                      />
                      <button
                        type="button"
                        onClick={handleSaveRenameTopic}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                        title="Salvar novo nome do tópico"
                      >
                        <Check className="w-4 h-4" />
                        <span>Salvar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTopic(null)}
                        className="p-1.5 bg-[#1F2229] hover:bg-[#2A2D35] text-gray-400 hover:text-white rounded-lg transition-all"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 px-4 border border-[#A88B4B]/30 rounded-2xl py-1.5 bg-[#A88B4B]/10 shadow-sm">
                      <h3 className="text-[#A88B4B] font-serif italic text-lg sm:text-xl whitespace-nowrap font-medium">
                        {category}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 ml-1">
                        {/* Botão Agendar Campanha com Escolha Aleatória Fixa */}
                        <button
                          type="button"
                          onClick={() => handleScheduleTopicCampaign(category, catTemplates)}
                          className="px-3 py-1 bg-gradient-to-r from-[#A88B4B] to-[#C5A968] hover:from-[#C5A968] hover:to-[#A88B4B] text-[#0A0C10] rounded-lg transition-all shadow-md flex items-center space-x-1.5 cursor-pointer text-xs font-black uppercase tracking-wider"
                          title={`Agendar esta campanha "${category}" com envio aleatório permanente fixo`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>🚀 Agendar Campanha (Aleatório Fixo)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendRandomFromTopic(category, catTemplates)}
                          className="px-2.5 py-1 text-emerald-400 hover:text-white hover:bg-emerald-600 bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer text-xs font-bold"
                          title={`Disparar agora sorteando mensagens aleatórias deste tópico`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Disparo Rápido (Aleatório)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingTopic({ oldName: category, currentName: category })}
                          className="p-1.5 text-[#A88B4B] hover:text-white hover:bg-[#A88B4B] bg-[#A88B4B]/15 border border-[#A88B4B]/30 rounded-lg transition-all shadow-sm flex items-center justify-center cursor-pointer"
                          title={`Editar nome do tópico "${category}"`}
                          aria-label={`Editar tópico ${category}`}
                        >
                          <Pencil className="w-4.5 h-4.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInitiateDeleteTopic(category)}
                          className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-500/10 border border-red-500/20 rounded-lg transition-all shadow-sm flex items-center justify-center cursor-pointer"
                          title={`Excluir tópico "${category}" e todas as suas mensagens`}
                          aria-label={`Excluir tópico ${category}`}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#A88B4B]/30 to-transparent" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {catTemplates.map((tmpl) => (
                    <TemplateCard
                      key={tmpl.id}
                      tmpl={tmpl}
                      sampleContact={sampleContact}
                      isExpanded={!!expandedVariations[tmpl.id]}
                      isSelected={selectedTemplateIds.includes(tmpl.id)}
                      isHighlighted={highlightedTemplateId === tmpl.id}
                      copiedId={copiedId}
                      onToggleExpanded={toggleExpandedVariations}
                      onCopyText={handleCopyText}
                      onToggleSelect={toggleSelectTemplate}
                      onOpenEdit={handleOpenEdit}
                      onDelete={onDeleteTemplate}
                      onDispatch={(t) => {
                        setDispatchingTemplate(t);
                        setContactSearchTermModal('');
                        setShowContactPickerModal(true);
                      }}
                      onUpdateTemplate={onUpdateTemplate}
                    />
                  ))}
                </div>
              </div>
            ))}

            {groupedTemplates.length === 0 && (
              <div className="bg-[#15181E] border border-[#1F2229] p-12 text-center rounded-xl text-gray-400 flex flex-col items-center space-y-3">
                <MessageSquare className="w-10 h-10 text-gray-600" />
                <p className="text-sm text-gray-300 font-medium">Nenhuma mensagem encontrada para esta seleção.</p>
                {activeTopic && (
                  <button
                    type="button"
                    onClick={() => setActiveTopic(null)}
                    className="mt-2 bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] font-bold text-xs px-4 py-2 rounded-lg uppercase tracking-wider transition-all shadow-md"
                  >
                    Ver Todos os Tópicos
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0C10]/95 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl w-full max-w-2xl text-gray-100 shadow-2xl overflow-hidden my-auto flex flex-col">
            <div className="px-6 py-4 border-b border-[#1F2229] flex items-center justify-between bg-[#0F1115] shrink-0">
              <h3 className="font-bold text-white text-lg">
                {editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-[#1F2229] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto custom-scrollbar pb-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Título do Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Mensagem Início de Semana"
                    className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Tópico / Categoria
                  </label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Digite o tópico (ex: Promoção, Novidades...)"
                    className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-all"
                  />
                  <datalist id="category-suggestions">
                    {allCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Vehicle Type Selection */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                  Aba / Categoria de Veículo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVehicleType('carro')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 ${
                      vehicleType === 'carro'
                        ? 'bg-amber-500 text-[#0A0C10] border-amber-400 shadow-md'
                        : 'bg-[#0A0C10] text-gray-400 border-[#1F2229] hover:text-white'
                    }`}
                  >
                    <span>🚗</span>
                    <span>Aba Carro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleType('moto')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 ${
                      vehicleType === 'moto'
                        ? 'bg-amber-500 text-[#0A0C10] border-amber-400 shadow-md'
                        : 'bg-[#0A0C10] text-gray-400 border-[#1F2229] hover:text-white'
                    }`}
                  >
                    <span>🏍️</span>
                    <span>Aba Motos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleType('ambos')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 ${
                      vehicleType === 'ambos'
                        ? 'bg-amber-500 text-[#0A0C10] border-amber-400 shadow-md'
                        : 'bg-[#0A0C10] text-gray-400 border-[#1F2229] hover:text-white'
                    }`}
                  >
                    <span>🚗🏍️</span>
                    <span>Ambos os Veículos</span>
                  </button>
                </div>
              </div>

              {/* Variable Insert Chips */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Inserir Variável Dinâmica:</span>
                  <span className="text-[10px] text-[#A88B4B]">Clique para adicionar</span>
                </label>
                <div className="flex flex-wrap gap-1.5 bg-[#0A0C10] p-3 rounded border border-[#1F2229]">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      className="bg-[#15181E] hover:bg-[#A88B4B]/20 text-[#A88B4B] border border-[#A88B4B]/30 hover:border-[#A88B4B] px-2.5 py-1 rounded text-xs font-mono transition-colors"
                      title={v.example}
                    >
                      + {v.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Texto da Mensagem *
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva sua mensagem original personalizada..."
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                />
              </div>

              {/* Anti-spam variations AI tool (OPCIONAL) */}
              <div className="bg-[#0A0C10] p-4 rounded-xl border border-[#1F2229] space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-purple-400 flex items-center space-x-1 uppercase tracking-widest">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Variações Extras Anti-Spam (Opcional)</span>
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Deixe vazio se quiser que o envio use rigorosamente apenas a mensagem original acima.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {variations.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setVariations([])}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 transition-all uppercase tracking-wider"
                      >
                        Limpar Variações
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleGenerateVariationsAi}
                      disabled={generatingVariations || !content.trim()}
                      className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center space-x-1.5 uppercase tracking-widest shadow-lg shadow-purple-600/20"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generatingVariations ? 'animate-spin' : ''}`} />
                      <span>Gerar IA</span>
                    </button>
                  </div>
                </div>

                {variations.length > 0 ? (
                  <div className="space-y-3 pt-2 border-t border-[#1F2229]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">
                        {variations.length} Variação(ões) Cadastrada(s):
                      </span>
                      <button
                        type="button"
                        onClick={() => setVariations([...variations, ''])}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar Manual</span>
                      </button>
                    </div>
                    {variations.map((varText, idx) => (
                      <div key={idx} className="bg-[#15181E] p-3 rounded-xl border border-purple-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                            Variação {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setVariations(variations.filter((_, i) => i !== idx))}
                            className="text-gray-500 hover:text-red-400 p-1 flex items-center space-x-1 text-[10px]"
                            title="Remover esta variação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={varText}
                          onChange={(e) => {
                            const newVars = [...variations];
                            newVars[idx] = e.target.value;
                            setVariations(newVars);
                          }}
                          placeholder="Texto da variação..."
                          className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500 font-sans"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#1F2229] flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Nenhuma variação extra adicionada (envio usará apenas o texto original).</span>
                    <button
                      type="button"
                      onClick={() => setVariations([''])}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Adicionar Manual</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[#1F2229] mt-auto pb-4">
                <button
                  type="button"
                  onClick={() => {
                    if (safeConfirm('Deseja realmente cancelar? As alterações não salvas serão perdidas.')) {
                      setIsCreating(false);
                      setEditingTemplate(null);
                    }
                  }}
                  className="px-4 py-3 sm:py-2 rounded-xl text-gray-400 text-[10px] hover:bg-[#0A0C10] font-bold uppercase tracking-widest border border-[#1F2229] sm:border-none cursor-pointer"
                >
                  {isMobile ? 'Voltar para o App' : 'Cancelar'}
                </button>
                {variations.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveOriginalOnly}
                    className="px-5 py-3 sm:py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                    title="Salva apenas a mensagem original digitada acima, descartando as variações criadas"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Salvar Apenas Original</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-4 sm:py-2 rounded-xl bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-[#A88B4B]/20 cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {variations.length > 0
                      ? 'Salvar com Variações'
                      : (editingTemplate ? 'Salvar Alterações' : 'Salvar Mensagem')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Delete All Templates */}
      {confirmDeleteAllModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-red-500/40 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Excluir Todas as Mensagens Salvas?</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Tem certeza de que deseja apagar todas as {templates.length} mensagens do sistema e começar do zero? Esta ação não poderá ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteAllModal(false)}
                className="px-4 py-2 rounded-lg text-gray-400 text-xs hover:bg-[#1A1D23] font-medium uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAllTemplates) {
                    onDeleteAllTemplates();
                  }
                  setConfirmDeleteAllModal(false);
                }}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-600/30"
              >
                Sim, Excluir Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Picker Modal for Instant Single Message Send */}
      {showContactPickerModal && dispatchingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#1F2229] bg-[#0A0C10] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif italic text-white text-lg">Enviar Mensagem Instantânea</h3>
                  <p className="text-xs text-gray-400">Escolha o contato que receberá: <strong className="text-white">"{dispatchingTemplate.title}"</strong></p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowContactPickerModal(false);
                  setDispatchingTemplate(null);
                  setDispatchingRandomCandidates([]);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1A1D23] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {dispatchingRandomCandidates.length > 0 && (
              <div className="bg-purple-950/40 border-b border-purple-500/30 px-4 py-2 flex items-center space-x-2 text-xs text-purple-200">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse shrink-0" />
                <span>
                  <strong>Sorteio Aleatório Ativo:</strong> A cada contato será sorteada aleatoriamente 1 das {dispatchingRandomCandidates.length} opções selecionadas!
                </span>
              </div>
            )}

            <div className="p-4 bg-[#0A0C10]/60 border-b border-[#1F2229]">
              <div className="relative">
                <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={contactSearchTermModal}
                  onChange={(e) => setContactSearchTermModal(e.target.value)}
                  placeholder="Pesquisar contato por nome, telefone ou empresa..."
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-medium placeholder-gray-500"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 max-h-[50vh]">
              {contacts
                .filter((c) => {
                  if (!contactSearchTermModal) return true;
                  return matchContact(c, contactSearchTermModal);
                })
                .map((contact) => {
                  const textToUse = dispatchingRandomCandidates.length > 0
                    ? dispatchingRandomCandidates[Math.floor(Math.random() * dispatchingRandomCandidates.length)]
                    : dispatchingTemplate.content;
                  const renderedText = replaceTemplateVariables(textToUse, contact);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => {
                        onSendWhatsAppToContact(contact, renderedText);
                        setShowContactPickerModal(false);
                        setDispatchingTemplate(null);
                        setDispatchingRandomCandidates([]);
                      }}
                      className="bg-[#0A0C10] hover:bg-emerald-500/10 border border-[#1F2229] hover:border-emerald-500/40 p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#15181E] border border-[#2A2D35] flex items-center justify-center font-bold text-emerald-400 text-sm group-hover:border-emerald-500">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm group-hover:text-emerald-300">{contact.name}</h4>
                          <p className="text-xs text-gray-400 font-mono">{contact.phone} {contact.company ? `• ${contact.company}` : ''}</p>
                        </div>
                      </div>

                      <div className="bg-emerald-500/20 group-hover:bg-emerald-500 text-emerald-400 group-hover:text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow">
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar Agora</span>
                      </div>
                    </div>
                  );
                })}

              {contacts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">Nenhum contato cadastrado no sistema.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#0A0C10] border-t border-[#1F2229] flex items-center justify-between text-xs text-gray-400">
              <span>Total de contatos: <strong className="text-white">{contacts.length}</strong></span>
              <button
                type="button"
                onClick={() => {
                  setShowContactPickerModal(false);
                  setDispatchingTemplate(null);
                }}
                className="px-4 py-2 bg-[#1A1D23] hover:bg-[#2A2D35] text-gray-300 rounded-lg font-bold uppercase text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DEFINITIVA DE TÓPICO */}
      {topicToDelete && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
          onClick={() => setTopicToDelete(null)}
        >
          <div
            className="relative my-auto w-full max-w-md bg-[#15181E] border-2 border-red-500/50 rounded-2xl p-6 text-gray-100 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Excluir Tópico Definitivamente?</h3>
                  <p className="text-xs text-gray-400">Esta ação remove o tópico e todas as suas mensagens.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTopicToDelete(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1F2229] transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0A0C10] border border-[#1F2229] p-4 rounded-xl space-y-2">
              <div className="text-xs text-gray-300">
                <span className="text-gray-500">Tópico selecionado:</span>{' '}
                <strong className="text-amber-400 font-bold">{topicToDelete.category}</strong>
              </div>
              <div className="text-xs text-gray-400">
                Mensagens que serão excluídas:{' '}
                <strong className="text-white font-bold">{topicToDelete.count}</strong>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              O tópico será excluído permanentemente da memória local e não retornará mais após recarregar a página.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmDeleteTopic}
                className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-red-600/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>Forçar Exclusão</span>
              </button>
              <button
                type="button"
                onClick={() => setTopicToDelete(null)}
                className="flex-1 bg-[#1F2229] hover:bg-[#2A2D35] text-gray-300 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all border border-[#2A2D35]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
