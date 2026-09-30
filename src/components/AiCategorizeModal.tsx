import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  Layers, 
  Smartphone, 
  Briefcase, 
  Headphones, 
  ArrowRight, 
  Plus, 
  Check, 
  RefreshCw, 
  SlidersHorizontal,
  DollarSign,
  Percent,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { Contact, ContactGroup } from '../types';
import { formatPhoneDisplay } from '../utils/vcfParser';

interface AiCategorizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  groups: ContactGroup[];
  selectedContactIds?: string[];
  onApplyResults: (updatedContacts: Contact[], newCategories: string[]) => void;
}

interface CategorizedItem {
  id: string;
  originalName: string;
  phone: string;
  originalGroup: string;
  cleanName: string;
  category: string;
  isNewCategory: boolean;
  chipId: string;
  chipName: string;
  gender: 'homem' | 'mulher';
  notes: string;
  customFields?: Record<string, string>;
  categoryDetails?: {
    type?: string;
    value?: string;
    target?: string;
    deadline?: string;
    tag?: string;
  };
  selectedForApply: boolean;
}

export const AiCategorizeModal: React.FC<AiCategorizeModalProps> = ({
  isOpen,
  onClose,
  contacts,
  groups,
  selectedContactIds = [],
  onApplyResults,
}) => {
  if (!isOpen) return null;

  const [scope, setScope] = useState<'all' | 'unassigned' | 'selected'>(
    selectedContactIds.length > 0 ? 'selected' : 'all'
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [categorizedItems, setCategorizedItems] = useState<CategorizedItem[]>([]);
  const [newDiscoveredCategories, setNewDiscoveredCategories] = useState<string[]>([]);
  const [isAnalyzed, setIsAnalyzed] = useState<boolean>(false);

  const targetContacts = contacts.filter((c) => {
    if (scope === 'selected' && selectedContactIds.length > 0) {
      return selectedContactIds.includes(c.id);
    }
    if (scope === 'unassigned') {
      const g = (c.group || '').toLowerCase();
      return !c.group || g === 'geral' || g.includes('sem campanha') || g.includes('agenda de contatos');
    }
    return true;
  });

  const handleRunAiAnalysis = async () => {
    if (targetContacts.length === 0) {
      setError('Nenhum contato encontrado para o escopo selecionado.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payloadItems = targetContacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        currentGroup: c.group || 'Agenda de Contatos',
        notes: c.notes || '',
      }));

      const knownCategories = groups.map((g) => g.name);

      const res = await fetch('/api/ai/categorize-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: payloadItems,
          knownCategories,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro do servidor (${res.status})`);
      }

      const data = await res.json();
      const results = data.results || [];
      const discovered = data.newCategoriesDiscovered || [];

      const resultMap = new Map<string, any>();
      results.forEach((r: any) => {
        resultMap.set(String(r.id), r);
      });

      const processedItems: CategorizedItem[] = targetContacts.map((c) => {
        const aiResult = resultMap.get(c.id) || {};
        return {
          id: c.id,
          originalName: c.name,
          phone: c.phone,
          originalGroup: c.group || 'Agenda de Contatos',
          cleanName: aiResult.cleanName || c.name,
          category: aiResult.category || c.group || 'Agenda de Contatos',
          isNewCategory: Boolean(aiResult.isNewCategory),
          chipId: undefined,
          chipName: undefined,
          gender: aiResult.gender || c.gender || 'homem',
          notes: aiResult.notes || c.notes || '',
          customFields: aiResult.customFields || {},
          categoryDetails: aiResult.categoryDetails || {},
          selectedForApply: true,
        };
      });

      setCategorizedItems(processedItems);
      setNewDiscoveredCategories(discovered);
      setIsAnalyzed(true);
    } catch (err: any) {
      console.error('Falha na análise de IA:', err);
      setError(err.message || 'Ocorreu um erro ao comunicar com a inteligência artificial.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelectAll = (select: boolean) => {
    setCategorizedItems((prev) =>
      prev.map((item) => ({ ...item, selectedForApply: select }))
    );
  };

  const handleToggleItem = (id: string) => {
    setCategorizedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selectedForApply: !item.selectedForApply } : item
      )
    );
  };

  const handleApply = () => {
    const selectedToApply = categorizedItems.filter((i) => i.selectedForApply);
    if (selectedToApply.length === 0) {
      setError('Selecione pelo menos um contato para aplicar a categorização.');
      return;
    }

    const appliedMap = new Map<string, CategorizedItem>(
      selectedToApply.map((item) => [item.id, item])
    );

    const updatedContacts = contacts.map((c) => {
      const item = appliedMap.get(c.id);
      if (!item) return c;

      return {
        ...c,
        name: item.cleanName,
        group: item.category,
        chipId: item.chipId,
        chipName: item.chipName,
        gender: item.gender,
        notes: item.notes || c.notes,
        customFields: {
          ...(c.customFields || {}),
          ...(item.customFields || {}),
        },
        categoryDetails: item.categoryDetails || c.categoryDetails,
      };
    });

    onApplyResults(updatedContacts, newDiscoveredCategories);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl w-full max-w-4xl text-gray-100 shadow-2xl overflow-hidden my-6 p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2229] pb-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#A88B4B]/15 border border-[#A88B4B]/40 rounded-xl text-[#A88B4B]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif italic text-white text-lg sm:text-xl flex items-center gap-2">
                <span>Categorização Inteligente com IA</span>
                <span className="text-[10px] not-italic font-sans font-extrabold bg-[#A88B4B]/20 text-[#A88B4B] border border-[#A88B4B]/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Gemini 3.7
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Detecta categorias automaticamente (Taxa Zero, Correção de Valores, Corre e Ganhe) e extrai campos dinâmicos customizados.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1A1D23] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Scope Selector */}
          {!isAnalyzed && (
            <div className="space-y-3 bg-[#0A0C10] p-4 rounded-xl border border-[#1F2229]">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                Selecione o Escopo da Análise por IA:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    scope === 'all'
                      ? 'bg-[#A88B4B]/15 border-[#A88B4B] text-white shadow-lg'
                      : 'bg-[#15181E] border-[#1F2229] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold block">Toda a Lista</span>
                    <span className="text-[11px] font-mono text-[#A88B4B]">{contacts.length}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Classifica e higieniza todos os contatos.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('unassigned')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    scope === 'unassigned'
                      ? 'bg-[#A88B4B]/15 border-[#A88B4B] text-white shadow-lg'
                      : 'bg-[#15181E] border-[#1F2229] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold block">Sem Categoria</span>
                    <span className="text-[11px] font-mono text-amber-400">
                      {contacts.filter((c) => {
                        const g = (c.group || '').toLowerCase();
                        return !c.group || g === 'geral' || g.includes('sem campanha') || g.includes('agenda de contatos');
                      }).length}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Apenas contatos em "Agenda" ou sem campanha.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  disabled={selectedContactIds.length === 0}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    scope === 'selected'
                      ? 'bg-[#A88B4B]/15 border-[#A88B4B] text-white shadow-lg'
                      : 'bg-[#15181E] border-[#1F2229] text-gray-400 hover:text-gray-200 disabled:opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold block">Selecionados</span>
                    <span className="text-[11px] font-mono text-emerald-400">{selectedContactIds.length}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Apenas contatos marcados na tabela.</p>
                </button>
              </div>

              {/* Supported AI Categories Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/25 rounded-lg text-blue-200">
                  <div className="font-bold flex items-center gap-1.5 text-blue-300">
                    <Percent className="w-3.5 h-3.5" />
                    <span>Taxa Zero (Tx0)</span>
                  </div>
                  <p className="text-[11px] text-blue-200/80 mt-0.5">
                    Extrai taxa (0%), vigência e encaminha para o <strong>Chip Suporte</strong>.
                  </p>
                </div>

                <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-200">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Correção de Valores</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    Identifica valores (R$ 30, R$ 50, R$ 80, R$ 100, etc.) e cria campos customizados.
                  </p>
                </div>

                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-emerald-200">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Novas Categorias Dinâmicas</span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">
                    Cria automaticamente novos campos e novas categorias descobertas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center space-x-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results View */}
          {isAnalyzed && categorizedItems.length > 0 && (
            <div className="space-y-3">
              {/* Summary Bar */}
              <div className="bg-[#0F1115] border border-[#1F2229] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#A88B4B]" />
                  <span className="text-xs font-bold text-white">
                    {categorizedItems.length} contatos processados pela IA
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-[11px] text-[#A88B4B] hover:underline"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-[11px] text-gray-400 hover:text-white"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {/* Discovered New Categories Banner */}
              {newDiscoveredCategories.length > 0 && (
                <div className="p-3 bg-[#A88B4B]/10 border border-[#A88B4B]/30 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                  <Tag className="w-4 h-4 text-[#A88B4B] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-[#A88B4B]">
                      ✨ Novas categorias identificadas automaticamente ({newDiscoveredCategories.length}):
                    </strong>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {newDiscoveredCategories.map((nc) => (
                        <span
                          key={nc}
                          className="bg-[#A88B4B]/20 border border-[#A88B4B]/40 text-[#C5A968] px-2 py-0.5 rounded-md text-[11px] font-bold"
                        >
                          + {nc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Items List / Table */}
              <div className="max-h-72 overflow-y-auto border border-[#1F2229] rounded-xl bg-[#0A0C10] divide-y divide-[#1F2229]">
                {categorizedItems.map((item, idx) => {
                  const hasCustomFields = item.customFields && Object.keys(item.customFields).length > 0;
                  const isBusiness = item.chipId === 'chip_1';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(item.id)}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                        item.selectedForApply
                          ? 'bg-[#15181E]/90 hover:bg-[#1A1D23]'
                          : 'opacity-50 hover:opacity-80 bg-transparent'
                      }`}
                    >
                      {/* Left: Checkbox + Name */}
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={item.selectedForApply}
                          onChange={() => handleToggleItem(item.id)}
                          className="mt-1 rounded border-gray-700 bg-gray-900 text-[#A88B4B] focus:ring-[#A88B4B] h-4 w-4"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-200 block truncate">{item.cleanName}</span>
                            {item.cleanName !== item.originalName && (
                              <span className="text-[10px] text-gray-500 font-mono line-through truncate max-w-[120px]">
                                {item.originalName}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#A88B4B] font-mono block">
                            {formatPhoneDisplay(item.phone)}
                          </span>

                          {/* Dynamic Custom Fields Badges */}
                          {hasCustomFields && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {Object.entries(item.customFields!).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1 bg-[#1A1D23] border border-[#2A2D35] text-amber-300/90 px-2 py-0.5 rounded text-[10px] font-mono"
                                >
                                  <span className="text-gray-400">{key}:</span>
                                  <strong>{val}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Category + Chip */}
                      <div className="flex items-center space-x-2 shrink-0 sm:self-center">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            {item.isNewCategory && (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">
                                NOVA
                              </span>
                            )}
                            <span className="bg-[#15181E] border border-[#2A2D35] text-gray-200 px-2.5 py-1 rounded-md text-[11px] font-semibold max-w-[190px] truncate block">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-bold border ${
                            isBusiness
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {isBusiness ? <Briefcase className="w-2.5 h-2.5" /> : <Headphones className="w-2.5 h-2.5" />}
                          <span>{isBusiness ? 'Business' : 'Suporte'}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1F2229] shrink-0">
          <div>
            {isAnalyzed ? (
              <button
                type="button"
                onClick={() => {
                  setIsAnalyzed(false);
                  setCategorizedItems([]);
                }}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refazer Seleção</span>
              </button>
            ) : (
              <span className="text-[11px] text-gray-500 font-mono">
                {targetContacts.length} contatos prontos para análise
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-gray-400 text-xs hover:bg-[#1A1D23] font-medium uppercase tracking-wider transition-colors"
            >
              Cancelar
            </button>

            {!isAnalyzed ? (
              <button
                type="button"
                onClick={handleRunAiAnalysis}
                disabled={isLoading || targetContacts.length === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#A88B4B] to-[#C5A059] hover:opacity-90 disabled:opacity-40 text-[#0A0C10] font-extrabold text-xs uppercase tracking-widest shadow-lg shadow-[#A88B4B]/20 flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Analisando com IA...' : 'Classificar com IA'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                disabled={categorizedItems.filter((i) => i.selectedForApply).length === 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/30 flex items-center space-x-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Aplicar em {categorizedItems.filter((i) => i.selectedForApply).length} Contatos
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
