import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  PhoneCall, 
  UserCheck, 
  Trash2, 
  RefreshCw, 
  X, 
  Sparkles,
  Tag,
  Check
} from 'lucide-react';
import { Contact, ContactGroup, ScheduledCampaign } from '../types';
import { cleanPhoneNumber, formatPhoneDisplay } from '../utils/vcfParser';
import { processContactName } from '../utils/contactProcessor';

interface ScanContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  groups: ContactGroup[];
  campaigns?: ScheduledCampaign[];
  onUpdateContacts: (updatedContacts: Contact[]) => void;
}

export const ScanContactsModal: React.FC<ScanContactsModalProps> = ({
  isOpen,
  onClose,
  contacts,
  groups,
  campaigns = [],
  onUpdateContacts,
}) => {
  if (!isOpen) return null;

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(100);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Perform Analysis
  const analysis = useMemo(() => {
    const missingCountryCode: Contact[] = [];
    const duplicates: Contact[] = [];
    const invalidFormat: Contact[] = [];
    const missingName: Contact[] = [];
    const unassignedGroup: Contact[] = [];
    const mismatchedCategory: Contact[] = [];
    const needsOptimization: Contact[] = [];
    const cleanContacts: Contact[] = [];

    const validCategorySet = new Set<string>();
    groups.forEach(g => validCategorySet.add(g.name.toLowerCase()));
    campaigns.forEach(c => {
      if (c.categoryName) validCategorySet.add(c.categoryName.toLowerCase());
    });

    const seenPhones = new Set<string>();

    contacts.forEach((contact) => {
      const rawDigits = cleanPhoneNumber(contact.phone);
      let isProblematic = false;

      // 1. Check duplicate
      if (seenPhones.has(rawDigits)) {
        duplicates.push(contact);
        isProblematic = true;
      } else {
        seenPhones.add(rawDigits);
      }

      // 2. Check invalid length/format
      if (!rawDigits || rawDigits.length < 10 || rawDigits.length > 14) {
        invalidFormat.push(contact);
        isProblematic = true;
      }

      // 3. Check missing country code '55' (Brazil standard format: 10 or 11 digits without 55)
      if (rawDigits.length === 10 || rawDigits.length === 11) {
        if (!rawDigits.startsWith('55')) {
          missingCountryCode.push(contact);
          isProblematic = true;
        }
      }

      // 4. Check missing or default name
      if (!contact.name || contact.name.trim().toLowerCase().startsWith('sem nome') || contact.name.trim() === contact.phone) {
        missingName.push(contact);
        isProblematic = true;
      }

      // 5. Check if name can be optimized (contains tags or is messy)
      const { cleanName, detectedGroup } = processContactName(contact.name);
      if (cleanName !== contact.name || (detectedGroup && detectedGroup !== contact.group)) {
        needsOptimization.push(contact);
        if (cleanName !== contact.name) isProblematic = true;
      }

      // 6. Check unassigned or default group
      if (!contact.group || contact.group === 'Geral' || contact.group === 'geral') {
        unassignedGroup.push(contact);
      }

      // 7. Check category / group matching dispatch categories
      const contactGroup = (contact.group || 'Geral').toLowerCase();
      if (validCategorySet.size > 0 && !validCategorySet.has(contactGroup) && contactGroup !== 'geral') {
        mismatchedCategory.push(contact);
      }

      if (!isProblematic) {
        cleanContacts.push(contact);
      }
    });

    const totalProblems = missingCountryCode.length + duplicates.length + invalidFormat.length + missingName.length + mismatchedCategory.length + needsOptimization.length;
    const healthScore = contacts.length > 0 ? Math.round(((contacts.length - totalProblems) / contacts.length) * 100) : 100;

    return {
      missingCountryCode,
      duplicates,
      invalidFormat,
      missingName,
      unassignedGroup,
      mismatchedCategory,
      needsOptimization,
      cleanContacts,
      totalProblems,
      healthScore: Math.max(0, healthScore)
    };
  }, [contacts, groups, campaigns]);

  const handleRunScanAnimation = () => {
    setIsScanning(true);
    setScanProgress(0);
    setSuccessMessage(null);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        setScanProgress(100);
        setIsScanning(false);
        clearInterval(interval);
      } else {
        setScanProgress(progress);
      }
    }, 100);
  };

  // 1. Auto fix missing country code '55'
  const handleFixCountryCodes = () => {
    const updated = contacts.map((c) => {
      const rawDigits = cleanPhoneNumber(c.phone);
      if ((rawDigits.length === 10 || rawDigits.length === 11) && !rawDigits.startsWith('55')) {
        return { ...c, phone: `55${rawDigits}` };
      }
      return c;
    });
    onUpdateContacts(updated);
    setSuccessMessage(`✅ Prefixo '55' adicionado a ${analysis.missingCountryCode.length} contato(s)!`);
  };

  // 2. Auto fix duplicates
  const handleRemoveDuplicates = () => {
    const seen = new Set<string>();
    const uniqueList: Contact[] = [];

    contacts.forEach((c) => {
      const rawDigits = cleanPhoneNumber(c.phone);
      if (!seen.has(rawDigits)) {
        seen.add(rawDigits);
        uniqueList.push(c);
      }
    });

    onUpdateContacts(uniqueList);
    setSuccessMessage(`✅ ${analysis.duplicates.length} contato(s) duplicado(s) removido(s)!`);
  };

  // 3. Auto fix invalid formats
  const handleRemoveInvalidFormat = () => {
    const validList = contacts.filter((c) => {
      const rawDigits = cleanPhoneNumber(c.phone);
      return rawDigits && rawDigits.length >= 10 && rawDigits.length <= 14;
    });

    onUpdateContacts(validList);
    setSuccessMessage(`✅ ${analysis.invalidFormat.length} telefone(s) inválido(s) removido(s)!`);
  };

  // 4. Auto fix names
  const handleFixNames = () => {
    const updated = contacts.map((c) => {
      if (!c.name || c.name.trim().toLowerCase().startsWith('sem nome') || c.name.trim() === c.phone) {
        const rawDigits = cleanPhoneNumber(c.phone);
        const shortPhone = rawDigits.slice(-4);
        return { ...c, name: `Contato ${shortPhone || c.id.slice(0, 4)}` };
      }
      return c;
    });

    onUpdateContacts(updated);
    setSuccessMessage(`✅ Nomes de ${analysis.missingName.length} contato(s) padronizados com sucesso!`);
  };

  // 5. Fix categories / align with dispatch categories
  const handleFixCategories = () => {
    const defaultCategory = 'Agenda de Contatos';
    const updated = contacts.map((c) => {
      const g = (c.group || 'Agenda de Contatos').toLowerCase();
      if (!c.group || g === 'geral' || (groups.length > 0 && !groups.some(gr => gr.name.toLowerCase() === g))) {
        return { ...c, group: defaultCategory };
      }
      return c;
    });
    onUpdateContacts(updated);
    setSuccessMessage(`✅ Categorias sem envio alinhadas com sucesso para Agenda de Contatos!`);
  };

  // 5. Auto optimize names and groups
  const handleOptimizeNamesAndGroups = () => {
    const validGroupSet = new Set(groups.map(g => g.name.toLowerCase()));
    validGroupSet.add('agenda de contatos');

    const updated = contacts.map((c) => {
      const { cleanName, detectedGroup } = processContactName(c.name);
      let targetGroup = detectedGroup || c.group || 'Agenda de Contatos';
      if (!validGroupSet.has(targetGroup.toLowerCase()) || targetGroup.toLowerCase() === 'geral') {
        targetGroup = 'Agenda de Contatos';
      }
      return {
        ...c,
        name: cleanName || c.name,
        group: targetGroup
      };
    });

    onUpdateContacts(updated);
    setSuccessMessage(`✅ Nomes e Grupos de ${analysis.needsOptimization.length} contato(s) otimizados com sucesso!`);
  };

  // 6. Master Auto-Sanitize
  const handleSanitizeAll = () => {
    const seen = new Set<string>();
    const sanitizedList: Contact[] = [];
    const validGroupSet = new Set(groups.map(g => g.name.toLowerCase()));
    validGroupSet.add('agenda de contatos');

    contacts.forEach((c) => {
      let rawDigits = cleanPhoneNumber(c.phone);

      // Check valid length
      if (!rawDigits || rawDigits.length < 10 || rawDigits.length > 14) {
        return; // Skip invalid
      }

      // Add missing 55
      if ((rawDigits.length === 10 || rawDigits.length === 11) && !rawDigits.startsWith('55')) {
        rawDigits = `55${rawDigits}`;
      }

      // Check duplicate
      if (seen.has(rawDigits)) {
        return; // Skip duplicate
      }
      seen.add(rawDigits);

      // Optimize name and group
      const { cleanName, detectedGroup } = processContactName(c.name);
      let finalName = cleanName || c.name;

      if (!finalName || finalName.toLowerCase().startsWith('sem nome') || finalName === c.phone) {
        const shortPhone = rawDigits.slice(-4);
        finalName = `Contato ${shortPhone}`;
      }

      let targetGroup = detectedGroup || c.group || 'Agenda de Contatos';
      if (!validGroupSet.has(targetGroup.toLowerCase()) || targetGroup.toLowerCase() === 'geral') {
        targetGroup = 'Agenda de Contatos';
      }

      sanitizedList.push({
        ...c,
        phone: rawDigits,
        name: finalName,
        group: targetGroup
      });
    });

    onUpdateContacts(sanitizedList);
    setSuccessMessage(`🎉 Varredura Completa e Higienização Aplicadas com Sucesso em Toda a Lista!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div className="bg-[#0F1115] border border-[#2A2D35] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-6 text-gray-200 relative overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2229] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#A88B4B]/10 border border-[#A88B4B]/30 text-[#A88B4B] rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-white">Varredura e Diagnóstico da Lista</h3>
              <p className="text-xs text-gray-400">Verificação avançada de saúde dos contatos e higienização automática</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1A1D23] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto space-y-6 pr-1 custom-scrollbar flex-1">

          {/* Success Banner */}
          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold p-3.5 rounded-lg flex items-center justify-between animate-fadeIn">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Health Gauge & Trigger */}
          <div className="bg-[#15181E] border border-[#1F2229] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Índice de Saúde da Lista</span>
                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className={`text-3xl font-extrabold ${analysis.healthScore >= 90 ? 'text-emerald-400' : analysis.healthScore >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                    {analysis.healthScore}%
                  </span>
                  <span className="text-xs text-gray-400">
                    ({analysis.totalProblems === 0 ? 'Lista 100% Saudável' : `${analysis.totalProblems} alerta(s) pendente(s)`})
                  </span>
                </div>
              </div>

              <button
                onClick={handleRunScanAnimation}
                disabled={isScanning}
                className="bg-[#1F2229] hover:bg-[#2A2D35] text-gray-200 border border-[#3A3D45] px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-[#A88B4B] ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Varrendo...' : 'Refazer Varredura'}</span>
              </button>
            </div>

            {/* Scan Progress Bar */}
            {isScanning && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-widest">
                  <span>Analisando telefones e duplicados...</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full bg-[#0A0C10] h-2 rounded-full overflow-hidden border border-[#2A2D35]">
                  <div 
                    className="bg-gradient-to-r from-[#A88B4B] to-emerald-400 h-full transition-all duration-200"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-[#0A0C10] p-3 rounded-lg border border-[#1F2229]">
                <p className="text-[10px] text-gray-400 uppercase">Total Auditado</p>
                <p className="text-lg font-bold text-white mt-0.5">{contacts.length}</p>
              </div>

              <div className="bg-[#0A0C10] p-3 rounded-lg border border-[#1F2229]">
                <p className="text-[10px] text-gray-400 uppercase">Sem DDI (55)</p>
                <p className={`text-lg font-bold mt-0.5 ${analysis.missingCountryCode.length > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                  {analysis.missingCountryCode.length}
                </p>
              </div>

              <div className="bg-[#0A0C10] p-3 rounded-lg border border-[#1F2229]">
                <p className="text-[10px] text-gray-400 uppercase">Duplicados</p>
                <p className={`text-lg font-bold mt-0.5 ${analysis.duplicates.length > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                  {analysis.duplicates.length}
                </p>
              </div>

              <div className="bg-[#0A0C10] p-3 rounded-lg border border-[#1F2229]">
                <p className="text-[10px] text-gray-400 uppercase">Otimizáveis</p>
                <p className={`text-lg font-bold mt-0.5 ${analysis.needsOptimization.length > 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                  {analysis.needsOptimization.length}
                </p>
              </div>

              <div className="bg-[#0A0C10] p-3 rounded-lg border border-[#1F2229]">
                <p className="text-[10px] text-gray-400 uppercase">Inválidos</p>
                <p className={`text-lg font-bold mt-0.5 ${analysis.invalidFormat.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {analysis.invalidFormat.length}
                </p>
              </div>
            </div>
          </div>

          {/* Action List Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#A88B4B] flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>Ações de Higienização Recomendadas</span>
            </h4>

            {/* Item 1: Missing Country Code */}
            <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <PhoneCall className={`w-5 h-5 mt-0.5 shrink-0 ${analysis.missingCountryCode.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                <div>
                  <p className="font-bold text-sm text-white">Adicionar Prefixo Nacional (55)</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {analysis.missingCountryCode.length > 0 
                      ? `${analysis.missingCountryCode.length} contato(s) sem o prefixo 55. Necessário para WhatsApp!`
                      : 'Todos os contatos possuem o prefixo de país 55 correto.'}
                  </p>
                </div>
              </div>
              {analysis.missingCountryCode.length > 0 && (
                <button
                  onClick={handleFixCountryCodes}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                >
                  Corrigir (+55)
                </button>
              )}
            </div>

            {/* Item 2: Duplicates */}
            <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <Copy className={`w-5 h-5 mt-0.5 shrink-0 ${analysis.duplicates.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                <div>
                  <p className="font-bold text-sm text-white">Remover Contatos Duplicados</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {analysis.duplicates.length > 0 
                      ? `${analysis.duplicates.length} contato(s) possuem número idêntico a outro cadastro.`
                      : 'Nenhum contato duplicado encontrado na lista.'}
                  </p>
                </div>
              </div>
              {analysis.duplicates.length > 0 && (
                <button
                  onClick={handleRemoveDuplicates}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                >
                  Remover ({analysis.duplicates.length})
                </button>
              )}
            </div>

            {/* Item 3: Invalid Numbers */}
            <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${analysis.invalidFormat.length > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                <div>
                  <p className="font-bold text-sm text-white">Excluir Telefones Inválidos</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {analysis.invalidFormat.length > 0 
                      ? `${analysis.invalidFormat.length} telefone(s) com menos de 10 dígitos ou formato corrompido.`
                      : 'Nenhum telefone com formato corrompido encontrado.'}
                  </p>
                </div>
              </div>
              {analysis.invalidFormat.length > 0 && (
                <button
                  onClick={handleRemoveInvalidFormat}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                >
                  Excluir Inválidos
                </button>
              )}
            </div>

            {/* Item 4: Generic / Missing Names */}
            <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <UserCheck className={`w-5 h-5 mt-0.5 shrink-0 ${analysis.missingName.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                <div>
                  <p className="font-bold text-sm text-white">Padronizar Nomes em Branco</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {analysis.missingName.length > 0 
                      ? `${analysis.missingName.length} contato(s) sem nome definido ou com "Sem Nome".`
                      : 'Todos os contatos possuem nomes preenchidos.'}
                  </p>
                </div>
              </div>
              {analysis.missingName.length > 0 && (
                <button
                  onClick={handleFixNames}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                >
                  Padronizar
                </button>
              )}
            </div>

            {/* Item 5: Name and Group Optimization */}
            <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <Sparkles className={`w-5 h-5 mt-0.5 shrink-0 ${analysis.needsOptimization.length > 0 ? 'text-blue-400' : 'text-emerald-400'}`} />
                <div>
                  <p className="font-bold text-sm text-white">Otimizar Nomes e Agrupar (CG 05/50, etc.)</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {analysis.needsOptimization.length > 0 
                      ? `Detectamos ${analysis.needsOptimization.length} contato(s) que podem ter o nome corrigido e serem agrupados por semelhança.`
                      : 'Todos os nomes e grupos parecem estar bem estruturados.'}
                  </p>
                </div>
              </div>
              {analysis.needsOptimization.length > 0 && (
                <button
                  onClick={handleOptimizeNamesAndGroups}
                  className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                >
                  Otimizar Nomes
                </button>
              )}
            </div>

            {/* Item 5: Dispatch Categories Verification */}
            <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <Tag className={`w-5 h-5 mt-0.5 shrink-0 ${analysis.mismatchedCategory.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                <div>
                  <p className="font-bold text-sm text-white">Verificação de Categorias de Envio (Campanhas)</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {analysis.mismatchedCategory.length > 0 
                      ? `${analysis.mismatchedCategory.length} contato(s) fora das categorias correspondentes aos envios agendados.`
                      : 'Todos os contatos estão alinhados com as categorias de envio das campanhas.'}
                  </p>
                </div>
              </div>
              {analysis.mismatchedCategory.length > 0 && (
                <button
                  onClick={handleFixCategories}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                >
                  Alinhar Categorias
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#1F2229] pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
          >
            Fechar
          </button>

          {analysis.totalProblems > 0 && (
            <button
              type="button"
              onClick={handleSanitizeAll}
              className="w-full sm:w-auto bg-gradient-to-r from-[#A88B4B] to-[#C5A059] hover:opacity-90 text-[#0A0C10] font-extrabold px-6 py-2.5 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>⚡ Executar Higienização Completa ({analysis.totalProblems})</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
