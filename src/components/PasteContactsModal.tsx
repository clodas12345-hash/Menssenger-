import React, { useState, useMemo } from 'react';
import { Clipboard, X, CheckCircle2, Users, AlertCircle, Sparkles, Tag, Smartphone, Briefcase, Headphones, Filter, Heart } from 'lucide-react';
import { Contact, ContactGroup } from '../types';
import { cleanPhoneNumber, formatPhoneDisplay } from '../utils/vcfParser';
import { safeConfirm, detectGenderFromName } from '../utils/whatsapp';
import { processContactName } from '../utils/contactProcessor';

interface PasteContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContacts: (contacts: Contact[]) => void;
  groups: ContactGroup[];
  defaultCountryCode: string;
}

interface ParsedPromoResult {
  cleanName: string;
  groupName: string;
  notes: string;
  chipId: string;
  chipName: string;
  promoCode: string;
  promoBadgeColor: string;
  customFields?: Record<string, string>;
  categoryDetails?: {
    type?: string;
    value?: string;
    target?: string;
    deadline?: string;
    tag?: string;
  };
}

export const PasteContactsModal: React.FC<PasteContactsModalProps> = ({
  isOpen,
  onClose,
  onAddContacts,
  groups,
  defaultCountryCode,
}) => {
  if (!isOpen) return null;

  const [rawText, setRawText] = useState<string>('');
  const [overrideGroup, setOverrideGroup] = useState<string>('auto');
  const [overrideChip, setOverrideChip] = useState<string>('auto');
  const [autoStandardizeChips, setAutoStandardizeChips] = useState<boolean>(true);
  const [notice, setNotice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiCustomResults, setAiCustomResults] = useState<Contact[] | null>(null);

  // Intelligent Promotion & Chip Parser for any contact line
  const analyzePromotionAndChip = (rawNameStr: string, fullLineStr: string): ParsedPromoResult => {
    const rawUpper = (rawNameStr + ' ' + fullLineStr).toUpperCase();
    
    // Use the super robust unified processContactName to extract the actual human name and eliminate tags perfectly!
    const processedInfo = processContactName(rawNameStr);
    let cleanName = processedInfo.cleanName;
    
    let groupName = 'Agenda de Contatos (Sem Campanha)';
    let notes = '⚠️ Sem campanha disponível. O motorista não possui benefício ativo. Confirmar nome antes de ofertar benefício.';
    let chipId = 'chip_1';
    let chipName = '';
    let promoCode = 'Sem Promoção';
    let promoBadgeColor = 'bg-slate-700 text-slate-300 border-slate-600';
    let customFields: Record<string, string> = {};
    let categoryDetails: any = {};

    // 1. Check Correção / Outros Valores (CORR, CORRECAO, CORREÇÃO, CORR_50, CORR$80, etc.)
    if (rawUpper.includes('CORR') || rawUpper.includes('CORRECAO') || rawUpper.includes('CORREÇÃO') || rawUpper.includes('AJUSTE') || rawUpper.includes('CREDITO')) {
      const valMatch = rawUpper.match(/(?:CORR[A-Z_]*|CORRECAO[A-Z_]*|R\$|\$)\s*(\d+)/i) || rawNameStr.match(/\$?(\d+)/);
      const valAmount = valMatch ? `R$ ${valMatch[1]}` : 'R$ 50';
      const numOnly = valMatch ? valMatch[1] : '50';
      
      let targetGroup = `CG ${numOnly}`;
      const cgMatch = rawUpper.match(/CG\s*(\d+)(?:\s*[_\/\-\$]*\s*(\d+))?/i);
      if (cgMatch) {
        if (cgMatch[2]) {
          targetGroup = `CG ${cgMatch[1].padStart(2, '0')}/${cgMatch[2]}`;
        } else {
          targetGroup = `CG ${cgMatch[1]}`;
        }
      } else if (numOnly === '150') {
        targetGroup = 'CG 10/150';
      }

      chipId = 'chip_1';
      chipName = 'Business';
      
      promoCode = `CG • Correção ${valAmount}`;
      groupName = targetGroup;
      notes = `Campanha: Correção de Saldo / Ajuste no valor de ${valAmount} direcionada para ${targetGroup}. Tag: ${rawNameStr}`;
      promoBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      customFields = {
        'Valor Correção': valAmount,
        'Tipo': 'Ajuste / Crédito em Conta',
        'Campanha': targetGroup,
        'Correção': 'Sim'
      };
      categoryDetails = {
        type: 'cg_correcao',
        value: valAmount,
        targetCg: targetGroup,
        tag: rawNameStr
      };
    }
    // 2. Check Corre e Ganhe (CG 05/50, CG 10/100, etc.)
    else if (rawUpper.includes('CG') || rawUpper.includes('CORRE E GANHE') || rawUpper.includes('CORRA E GANHE') || rawUpper.includes('CG$') || rawUpper.includes('_CG')) {
      // Improved regex to handle CG10_$150, CG05_$100 patterns
      const cgMatch = rawUpper.match(/CG\s*(\d+)(?:\s*[_\/\-\$]*\s*(\d+))?/i);
      
      const cgNum = cgMatch ? cgMatch[1] : '';
      const cgVal = cgMatch ? cgMatch[2] : '';

      // Specific sub-promotions logic
      if (cgNum === '10') {
        const value = cgVal || '150';
        chipId = 'chip_1';
        chipName = 'Business';
        promoCode = `CG-10 • R$${value}`;
        groupName = `CG 10/${value}`;
        notes = `Campanha: 10 corridas para ganhar R$${value} de bônus. Tag: ${rawNameStr}`;
        promoBadgeColor = 'bg-emerald-600/25 text-emerald-200 border-emerald-500/50';
        customFields = { 'Meta Corridas': '10 corridas', 'Bônus': `R$ ${value}`, 'Campanha': 'Corre e Ganhe' };
        categoryDetails = { type: 'corre_e_ganhe', value: `R$ ${value}`, target: '10 corridas', tag: rawNameStr };
      } else if (cgNum === '05') {
        const value = cgVal || '100';
        chipId = 'chip_1'; // Standardizing all CG to Business
        chipName = 'Business';
        promoCode = `CG-05 • R$${value}`;
        groupName = `CG 05/${value}`;
        notes = `Campanha: 5 corridas para ganhar R$${value} de bônus. Tag: ${rawNameStr}`;
        promoBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        customFields = { 'Meta Corridas': '5 corridas', 'Bônus': `R$ ${value}`, 'Campanha': 'Corre e Ganhe' };
        categoryDetails = { type: 'corre_e_ganhe', value: `R$ ${value}`, target: '5 corridas', tag: rawNameStr };
      } else {
        // Generic CG with date or value
        const dateMatch = rawNameStr.match(/(\d{2}\/\d{2})/);
        const valMatch = rawNameStr.match(/\$?(\d+)/);
        const dateStr = dateMatch ? ` (${dateMatch[1]})` : '';
        const valStr = (valMatch && valMatch[1] !== '0') ? ` R$ ${valMatch[1]}` : '';
        promoCode = `CG${valStr}`;
        groupName = `Corre e Ganhe${valStr}${dateStr}`;
        notes = `Campanha: Corre e Ganhe. Tag: ${rawNameStr}`;
        promoBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        customFields = { 'Campanha': 'Corre e Ganhe', 'Bônus': valStr ? `R$ ${valMatch![1]}` : 'Bônus' };
        categoryDetails = { type: 'corre_e_ganhe', value: valStr, tag: rawNameStr };
      }
    } 
    // 3. Check Taxa Zero (TX0 / Tx0 / Taxa Zero)
    else if (rawUpper.includes('TX0') || rawUpper.includes('TXO') || rawUpper.includes('TAXA ZERO') || rawUpper.includes('_TX0')) {
      const dateMatch = rawNameStr.match(/(\d{2}\/\d{2})/);
      const dateStr = dateMatch ? ` (${dateMatch[1]})` : '';
      promoCode = `Taxa Zero${dateStr}`;
      groupName = `Taxa Zero${dateStr}`;
      notes = `Campanha: Taxa Zero. Tag original: ${rawNameStr}`;
      promoBadgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      customFields = {
        'Taxa': '0%',
        'Vigência': dateMatch ? dateMatch[1] : 'Ativo',
        'Tipo': 'Isenção de Taxa'
      };
      categoryDetails = {
        type: 'taxa_zero',
        value: '0%',
        deadline: dateMatch ? dateMatch[1] : undefined,
        tag: rawNameStr
      };
    }
 
    // 4. Sem promoção (Agenda comum)
    else {
      chipId = 'chip_2';
      chipName = 'Suporte';
      promoCode = 'Sem Promoção';
      groupName = 'Agenda de Contatos';
      notes = '⚠️ Sem campanha disponível. O motorista não possui benefício ativo. Confirmar nome antes de ofertar benefício.';
      promoBadgeColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
      
      // Better name cleaning for .T18_Name_... format even when no promo
      const match = rawNameStr.match(/^\.?([^_]+)_([^_]+)/);
      if (match) {
        cleanName = match[2].replace(/_/g, ' ').trim();
      } else if (rawNameStr.includes('_')) {
        cleanName = rawNameStr.split('_')[0].trim();
      }
    }

    // Use intelligent processor for additional cleanup and grouping if still generic
    const proc = processContactName(rawNameStr);
    if (proc.cleanName && (cleanName === rawNameStr || cleanName.length > proc.cleanName.length)) {
      cleanName = proc.cleanName;
    }
    if (proc.detectedGroup && groupName === 'Agenda de Contatos (Sem Campanha)') {
      groupName = proc.detectedGroup;
    }

    // Clean up dot prefix if any
    cleanName = cleanName.replace(/^\.+/, '').trim();

    return {
      cleanName: cleanName || rawNameStr,
      groupName,
      notes,
      chipId,
      chipName,
      promoCode,
      promoBadgeColor,
      customFields,
      categoryDetails
    };
  };

  // Parse contacts from text
  const parseLines = (): Contact[] => {
    if (aiCustomResults && aiCustomResults.length > 0) {
      return aiCustomResults;
    }

    if (!rawText.trim()) return [];

    const lines = rawText.split('\n');
    const parsedList: Contact[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toLowerCase() === 'salva' || trimmed.toLowerCase() === 'salvar') return;

      let phone = '';
      let rawName = '';

      // Check if line contains a URL or wa.me/ link
      const urlRegex = /(https?:\/\/[^\s]+|wa\.me\/[^\s]+)/i;
      const urlMatch = trimmed.match(urlRegex);

      if (urlMatch) {
        const url = urlMatch[0];
        phone = url;
        rawName = trimmed.replace(url, '').trim();
      } else {
        // Match numbers: e.g. +55 11 91234-5678 or 5511912345678 or 11912345678
        const phoneMatch = trimmed.match(/(\+?\d[\d\s\-\(\)]{8,})/);
        if (phoneMatch) {
          phone = phoneMatch[0];
          rawName = trimmed.replace(phoneMatch[0], '').trim();
        }
      }

      // Clean up rawName separators
      if (rawName) {
        rawName = rawName
          .replace(/[\t\,\|]+/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/^[\s\-\:\,]+|[\s\-\:\,]+$/g, '')
          .trim();
      }

      if (phone) {
        const cleaned = cleanPhoneNumber(phone, defaultCountryCode);
        if (cleaned && cleaned.length >= 8) {
          const promoAnalysis = analyzePromotionAndChip(rawName || `Contato ${index + 1}`, trimmed);

          let finalGroup = promoAnalysis.groupName;
          if (overrideGroup !== 'auto') {
            finalGroup = overrideGroup;
          }

          let finalChipId = overrideChip !== 'auto' ? overrideChip : (autoStandardizeChips ? promoAnalysis.chipId : 'chip_1');
          let finalChipName = finalChipId === 'chip_1' ? 'Business' : 'Suporte';
          const detectedGender = detectGenderFromName(promoAnalysis.cleanName || rawName);

          parsedList.push({
            id: `pasted_${Date.now()}_${index}_${cleaned.slice(-4)}`,
            name: promoAnalysis.cleanName,
            phone: cleaned,
            group: finalGroup,
            notes: promoAnalysis.notes,
            chipId: finalChipId,
            chipName: finalChipName,
            gender: detectedGender,
            customFields: promoAnalysis.customFields,
            categoryDetails: promoAnalysis.categoryDetails,
            source: 'manual',
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    return parsedList;
  };

  // Run server-side Gemini AI categorization on pasted text
  const handleRunAiCategorization = async () => {
    if (!rawText.trim()) {
      setNotice('Cole texto com telefones antes de rodar a IA.');
      return;
    }

    const initialParsed = parseLines();
    if (initialParsed.length === 0) {
      setNotice('Nenhum telefone identificado no texto.');
      return;
    }

    setIsAiLoading(true);
    setNotice('');

    try {
      const payloadItems = initialParsed.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        notes: c.notes,
        currentGroup: c.group,
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
        throw new Error('Falha ao comunicar com o serviço de IA.');
      }

      const data = await res.json();
      const results = data.results || [];
      const resultMap = new Map<string, any>();
      results.forEach((r: any) => resultMap.set(String(r.id), r));

      const updated = initialParsed.map((c) => {
        const ai = resultMap.get(c.id);
        if (!ai) return c;
        return {
          ...c,
          name: ai.cleanName || c.name,
          group: ai.category || c.group,
          chipId: ai.chipId || c.chipId,
          chipName: ai.chipName || c.chipName,
          gender: ai.gender || c.gender,
          notes: ai.notes || c.notes,
          customFields: ai.customFields || c.customFields,
          categoryDetails: ai.categoryDetails || c.categoryDetails,
        };
      });

      setAiCustomResults(updated);
      setNotice(`✨ IA Categorizou ${updated.length} contatos com sucesso!`);
    } catch (err: any) {
      console.error(err);
      setNotice(err.message || 'Erro na categorização com IA.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const parsedContacts = parseLines();

  // Summary statistics of parsed contacts
  const stats = useMemo(() => {
    const total = parsedContacts.length;
    let businessCount = 0;
    let supportCount = 0;
    const groupCountMap = new Map<string, number>();

    parsedContacts.forEach(c => {
      if (c.chipId === 'chip_1') businessCount++;
      else supportCount++;

      const grp = c.group || 'Agenda de Contatos';
      groupCountMap.set(grp, (groupCountMap.get(grp) || 0) + 1);
    });

    return {
      total,
      businessCount,
      supportCount,
      groupsList: Array.from(groupCountMap.entries()).map(([name, count]) => ({ name, count })),
    };
  }, [parsedContacts]);

  const handleSave = () => {
    if (parsedContacts.length === 0) {
      setNotice('Nenhum telefone válido encontrado no texto colado.');
      return;
    }

    onAddContacts(parsedContacts);
    setRawText('');
    setNotice('');
    onClose();
  };

  const handlePasteExample = () => {
    const exampleText = `.Adalberto Francisco_CG10_$100_P\thttps://wa.me/5511985585570
.Adriano Cordeiro_CG05_$50_P\thttps://wa.me/5511961245564
.Alexandro Ferraz_CG05_$100_P\thttps://wa.me/5511983496609
.Jaqueline Silva_Tx0_14/08\thttps://wa.me/5511913213587
.Pedro Silveira_CORR_50\thttps://wa.me/5511981234567
.Marcos Souza_CORRECAO_80\thttps://wa.me/5511977665544
.Carlos Eduardo Santos\thttps://wa.me/5511999887766`;
    setRawText(exampleText);
    setAiCustomResults(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0C10]/85 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl w-full max-w-4xl text-gray-100 shadow-2xl overflow-hidden my-6 p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1F2229] pb-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#A88B4B]/10 border border-[#A88B4B]/30 rounded-xl text-[#A88B4B]">
              <Clipboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif italic text-white text-lg sm:text-xl flex items-center gap-2">
                <span>Copiar e Colar Contatos na Agenda</span>
                <span className="text-[10px] not-italic font-sans font-extrabold bg-[#A88B4B]/20 text-[#A88B4B] border border-[#A88B4B]/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Detecção Automática & IA
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Identifica e agrupa promoções (<strong className="text-emerald-400">CG05/CG10</strong>, <strong className="text-blue-400">TX0</strong> e <strong className="text-amber-400">Correções R$</strong>) com extração de novos campos dinâmicos.
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

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Rules Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#0A0C10] border border-[#1F2229] rounded-xl text-xs">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Forçar Categoria:</label>
              <select
                value={overrideGroup}
                onChange={(e) => setOverrideGroup(e.target.value)}
                className="w-full bg-[#15181E] border border-[#2A2D35] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
              >
                <option value="auto">✨ Detecção Automática</option>
                <option value="Agenda de Contatos">Sem Campanha</option>
                {groups.map(g => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Forçar Chip de Envio:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideChip('auto')}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                    overrideChip === 'auto'
                      ? 'bg-[#A88B4B]/20 border-[#A88B4B] text-[#A88B4B]'
                      : 'bg-[#15181E] border-[#2A2D35] text-gray-500 hover:border-gray-600'
                  }`}
                >
                  Automático
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideChip('chip_1')}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                    overrideChip === 'chip_1'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-[#15181E] border-[#2A2D35] text-gray-500 hover:border-gray-600'
                  }`}
                >
                  Business
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideChip('chip_2')}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                    overrideChip === 'chip_2'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-[#15181E] border-[#2A2D35] text-gray-500 hover:border-gray-600'
                  }`}
                >
                  Suporte
                </button>
              </div>
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center space-x-1.5">
                <span>Cole o texto com nomes, sufixos e links wa.me abaixo:</span>
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePasteExample}
                  className="text-[11px] text-[#A88B4B] hover:text-[#C5A968] hover:underline font-mono flex items-center space-x-1 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#A88B4B]" />
                  <span>Colar Exemplo (CG, Tx0, Correção)</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunAiCategorization}
                  disabled={isAiLoading || !rawText.trim()}
                  className="px-3 py-1 bg-gradient-to-r from-[#A88B4B] to-[#C5A059] text-black font-extrabold text-[11px] rounded-lg shadow flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                  <span>{isAiLoading ? 'Classificando...' : 'Identificar com IA'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setAiCustomResults(null);
                setNotice('');
              }}
              placeholder={`Cole aqui as linhas copiadas do WhatsApp ou planilha. Exemplo:

.Adalberto Francisco_CG10_$100_P\thttps://wa.me/5511985585570
.Adriano Cordeiro_CG05_$50_P\thttps://wa.me/5511961245564
.Jaqueline Silva_Tx0_14/08\thttps://wa.me/5511913213587
.Pedro Silveira_CORR_50\thttps://wa.me/5511981234567
.Carlos Eduardo Santos\thttps://wa.me/5511999887766`}
              className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3.5 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B] font-mono leading-relaxed placeholder-gray-600 transition-colors"
            />
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0A0C10] p-3.5 rounded-xl border border-[#1F2229]">
            {/* Category Selector */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center space-x-1">
                <Tag className="w-3 h-3 text-[#A88B4B]" />
                <span>Agrupamento de Categorias:</span>
              </label>
              <select
                value={overrideGroup}
                onChange={(e) => setOverrideGroup(e.target.value)}
                className="w-full bg-[#15181E] border border-[#1F2229] rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B] font-medium"
              >
                <option value="auto">✨ Agrupar Automaticamente por Promoção (CG05, CG10, TX0, etc.) [Recomendado]</option>
                {groups.map((g, idx) => (
                  <option key={`${g.id}_${idx}`} value={g.name}>
                    Forçar Categoria: {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chip Standardization Toggle */}
            <div className="flex flex-col justify-between">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center space-x-1">
                <Smartphone className="w-3 h-3 text-[#A88B4B]" />
                <span>Padronização de Chip de Disparo:</span>
              </label>
              <button
                type="button"
                onClick={() => setAutoStandardizeChips(!autoStandardizeChips)}
                className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-between ${
                  autoStandardizeChips
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-[#15181E] border-[#1F2229] text-gray-400'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-4 h-4 ${autoStandardizeChips ? 'text-emerald-400' : 'text-gray-600'}`} />
                  <span>Padronizar Chips (CG Business / Demais Suporte)</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${autoStandardizeChips ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#0A0C10] text-gray-500'}`}>
                  {autoStandardizeChips ? 'ATIVO' : 'MANUAL'}
                </span>
              </button>
            </div>
          </div>

          {/* Stats Bar if contacts detected */}
          {parsedContacts.length > 0 && (
            <div className="bg-[#0F1115] border border-[#1F2229] rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2229] pb-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-[#A88B4B]" />
                  <span className="text-xs font-bold text-white">
                    {stats.total} {stats.total === 1 ? 'contato identificado' : 'contatos identificados'}
                  </span>
                </div>

                {/* Chip Distribution Badges */}
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                    <Briefcase className="w-3 h-3" />
                    <span>Business (CG): {stats.businessCount}</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold">
                    <Headphones className="w-3 h-3" />
                    <span>Suporte (TX0/Demais): {stats.supportCount}</span>
                  </span>
                </div>
              </div>

              {/* Group Distribution Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Categorias:</span>
                {stats.groupsList.map(g => (
                  <span
                    key={g.name}
                    className="inline-flex items-center space-x-1 text-[10px] bg-[#15181E] border border-[#1F2229] px-2 py-0.5 rounded-md text-gray-300 font-mono"
                  >
                    <span>{g.name}</span>
                    <strong className="text-[#A88B4B]">({g.count})</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {notice && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center space-x-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Live Parsed Preview Table */}
          {parsedContacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  Prévia da Lista Estruturada ({parsedContacts.length}):
                </label>
                <span className="text-[10px] text-gray-500 font-mono">
                  Pronto para envio por grupo
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto border border-[#1F2229] rounded-xl bg-[#0A0C10] divide-y divide-[#1F2229]">
                {parsedContacts.map((c, idx) => {
                  const isBusiness = c.chipId === 'chip_1';
                  return (
                    <div key={idx} className="p-2.5 sm:p-3 flex items-center justify-between gap-3 text-xs hover:bg-[#15181E]/60 transition-colors">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <span className="text-[10px] text-gray-600 font-mono w-6 shrink-0">#{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-gray-200 block truncate">{c.name}</span>
                          <span className="text-[11px] text-[#A88B4B] font-mono block">
                            {formatPhoneDisplay(c.phone)}
                          </span>
                          {c.customFields && Object.keys(c.customFields).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(c.customFields).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1 bg-[#1A1D23] border border-[#2A2D35] text-amber-300/90 px-1.5 py-0.2 rounded text-[9px] font-mono"
                                >
                                  <span className="text-gray-400">{key}:</span>
                                  <strong>{val}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Group, Gender and Chip Badges */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {c.gender === 'mulher' ? (
                          <span className="bg-pink-500/15 border border-pink-500/30 text-pink-300 px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center space-x-1" title="Gênero: Mulher (Abordagem suave e personalizada)">
                            <span>👩</span>
                            <span>Mulher (Suave)</span>
                          </span>
                        ) : (
                          <span className="bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center space-x-1" title="Gênero: Homem">
                            <span>👨</span>
                            <span>Homem</span>
                          </span>
                        )}

                        <span className="bg-[#15181E] border border-[#1F2229] text-gray-300 px-2 py-1 rounded-md text-[10px] font-medium max-w-[170px] truncate" title={c.group}>
                          {c.group}
                        </span>

                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-bold border ${
                          isBusiness 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
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

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1F2229] shrink-0">
          <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">
            {parsedContacts.length > 0
              ? `✅ ${parsedContacts.length} contatos prontos para salvar com chips definidos`
              : 'Cole o texto para visualizar a separação por grupos e chips'}
          </span>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (parsedContacts.length > 0 && !safeConfirm('Deseja realmente cancelar a importação de contatos?')) {
                  return;
                }
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl text-gray-400 text-xs hover:bg-[#1A1D23] font-medium uppercase tracking-wider transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={parsedContacts.length === 0}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-[#A88B4B] hover:bg-[#C5A968] disabled:opacity-40 text-[#0A0C10] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#A88B4B]/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar {parsedContacts.length} Contatos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
