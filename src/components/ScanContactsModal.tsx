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
  Check,
  Send
} from 'lucide-react';
import { Contact, ContactGroup, ScheduledCampaign, DispatchLogItem } from '../types';
import { cleanPhoneNumber, formatPhoneDisplay } from '../utils/vcfParser';
import { processContactName } from '../utils/contactProcessor';

interface ScanContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  groups: ContactGroup[];
  campaigns?: ScheduledCampaign[];
  logs?: DispatchLogItem[];
  onUpdateContacts: (updatedContacts: Contact[]) => void;
  onUpdateLogs?: (updatedLogs: DispatchLogItem[]) => void;
}

export function isRealPhoneNumber(phoneStr: string): boolean {
  const digits = cleanPhoneNumber(phoneStr);
  if (!digits || digits.length < 10 || digits.length > 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (/^123456/.test(digits) || /^012345/.test(digits)) return false;
  const normalized = digits.startsWith('55') ? digits.slice(2) : digits;
  if (normalized.length !== 10 && normalized.length !== 11) return false;
  const ddd = parseInt(normalized.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  return true;
}

export const ScanContactsModal: React.FC<ScanContactsModalProps> = ({
  isOpen,
  onClose,
  contacts,
  groups,
  campaigns = [],
  logs = [],
  onUpdateContacts,
  onUpdateLogs,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'contacts' | 'sent_audit'>('contacts');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(100);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sent logs analysis
  const sentLogs = useMemo(() => {
    return logs.filter(l => l.status === 'enviado');
  }, [logs]);

  const sentAuditAnalysis = useMemo(() => {
    const realNumbers: DispatchLogItem[] = [];
    const suspiciousNumbers: DispatchLogItem[] = [];

    sentLogs.forEach(log => {
      if (isRealPhoneNumber(log.phone)) {
        realNumbers.push(log);
      } else {
        suspiciousNumbers.push(log);
      }
    });

    const total = sentLogs.length;
    const realRate = total > 0 ? Math.round((realNumbers.length / total) * 100) : 100;

    return {
      realNumbers,
      suspiciousNumbers,
      total,
      realRate: Math.max(0, realRate)
    };
  }, [sentLogs]);

  // Perform Analysis for contacts
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

      // 3. Check missing country code '55'
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

      // 5. Check if name can be optimized
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

  // 5. Clean suspicious sent logs
  const handleRemoveSuspiciousSentLogs = () => {
    if (!onUpdateLogs) return;
    const validLogs = logs.filter(l => l.status !== 'enviado' || isRealPhoneNumber(l.phone));
    onUpdateLogs(validLogs);
    setSuccessMessage(`✅ ${sentAuditAnalysis.suspiciousNumbers.length} registro(s) suspeito(s) removido(s) do histórico de enviados!`);
  };

  const handleExportRealSentCsv = () => {
    const headers = "Nome,Telefone,Chip,DataEnvio\n";
    const rows = sentAuditAnalysis.realNumbers.map(l => `"${l.contactName || 'Contato'}","${l.phone}","${l.chipName || 'Geral'}","${l.sentAt || ''}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `numeros_reais_enviados_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setSuccessMessage(`📥 Relatório de números reais exportado com sucesso!`);
  };

  // 6. Master Auto-Sanitize
  const handleSanitizeAll = () => {
    const seen = new Set<string>();
    const sanitizedList: Contact[] = [];
    const validGroupSet = new Set(groups.map(g => g.name.toLowerCase()));
    validGroupSet.add('agenda de contatos');

    contacts.forEach((c) => {
      let rawDigits = cleanPhoneNumber(c.phone);

      if (!rawDigits || rawDigits.length < 10 || rawDigits.length > 14) {
        return;
      }

      if ((rawDigits.length === 10 || rawDigits.length === 11) && !rawDigits.startsWith('55')) {
        rawDigits = `55${rawDigits}`;
      }

      if (seen.has(rawDigits)) {
        return;
      }
      seen.add(rawDigits);

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
      <div className="bg-[#0F1115] border border-[#2A2D35] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-gray-200 relative overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2229] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#A88B4B]/10 border border-[#A88B4B]/30 text-[#A88B4B] rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-white">Varredura e Diagnóstico da Lista</h3>
              <p className="text-xs text-gray-400">Verificação avançada de saúde dos contatos e validação de números reais</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1A1D23] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#1F2229] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'contacts'
                ? 'bg-[#A88B4B] text-black shadow-md'
                : 'bg-[#15181E] text-gray-400 hover:text-white border border-[#1F2229]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Auditoria de Contatos ({contacts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sent_audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'sent_audit'
                ? 'bg-[#A88B4B] text-black shadow-md'
                : 'bg-[#15181E] text-gray-400 hover:text-white border border-[#1F2229]'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Varredura de Enviados ({sentLogs.length})</span>
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

          {activeTab === 'sent_audit' ? (
            /* SENT LOGS REAL NUMBERS AUDIT TAB */
            <div className="space-y-5">
              <div className="bg-[#15181E] border border-[#1F2229] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Taxa de Números Reais (Enviados)</span>
                    <div className="flex items-baseline space-x-2 mt-0.5">
                      <span className={`text-3xl font-extrabold ${sentAuditAnalysis.realRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {sentAuditAnalysis.realRate}%
                      </span>
                      <span className="text-xs text-gray-400">
                        ({sentAuditAnalysis.realNumbers.length} de {sentAuditAnalysis.total} números verificados como reais)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportRealSentCsv}
                      className="bg-[#1F2229] hover:bg-[#2A2D35] text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Exportar CSV Reais</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-[#0A0C10] p-3 rounded-lg border border-[#1F2229]">
                    <p className="text-[10px] text-gray-400 uppercase">Números Reais / Válidos</p>
                    <p className="text-lg font-bold text-emerald-400 mt-0.5">{sentAuditAnalysis.realNumbers.length}</p>
                  </div>

                  <div className="bg-[#0A0C10] p-3 rounded-lg border border-[#1F2229]">
                    <p className="text-[10px] text-gray-400 uppercase">Números Suspeitos / Testes</p>
                    <p className={`text-lg font-bold mt-0.5 ${sentAuditAnalysis.suspiciousNumbers.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {sentAuditAnalysis.suspiciousNumbers.length}
                    </p>
                  </div>
                </div>
              </div>

              {sentAuditAnalysis.suspiciousNumbers.length > 0 ? (
                <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Encontrados {sentAuditAnalysis.suspiciousNumbers.length} registros com números suspeitos ou testes no histórico.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveSuspiciousSentLogs}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-colors shrink-0"
                    >
                      Remover Suspeitos
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-red-500/10 text-xs">
                    {sentAuditAnalysis.suspiciousNumbers.map((log, i) => (
                      <div key={i} className="py-2 flex items-center justify-between text-gray-300">
                        <span>{log.contactName || 'Contato'} ({formatPhoneDisplay(log.phone)})</span>
                        <span className="text-red-400 font-mono text-[10px]">Formato Inválido / Teste</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-white font-bold text-sm">Todos os números enviados são reais e válidos!</p>
                  <p className="text-gray-400 text-xs">Nenhum número de teste ou formato inválido foi detectado no histórico de envios.</p>
                </div>
              )}
            </div>
          ) : (
            /* CONTACTS AUDIT TAB */
            <div className="space-y-6">
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
                      Remover Duplicados
                    </button>
                  )}
                </div>

                {/* Item 3: Invalid Format */}
                <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${analysis.invalidFormat.length > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                    <div>
                      <p className="font-bold text-sm text-white">Remover Telefones Inválidos</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {analysis.invalidFormat.length > 0 
                          ? `${analysis.invalidFormat.length} contato(s) com quantidade de dígitos incorreta.`
                          : 'Todos os telefones possuem formatação válida.'}
                      </p>
                    </div>
                  </div>
                  {analysis.invalidFormat.length > 0 && (
                    <button
                      onClick={handleRemoveInvalidFormat}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                    >
                      Remover Inválidos
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#1F2229] flex items-center justify-between">
          <button
            onClick={handleSanitizeAll}
            disabled={analysis.totalProblems === 0}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 flex items-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Higienizar Lista Automaticamente</span>
          </button>

          <button
            onClick={onClose}
            className="bg-[#1F2229] hover:bg-[#2A2D35] text-gray-300 font-bold px-5 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
