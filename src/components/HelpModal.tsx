import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  ShieldAlert, 
  Clock, 
  Users, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Send, 
  CheckCircle2, 
  Smartphone, 
  Cpu, 
  Sparkles, 
  Bot, 
  Save, 
  Download, 
  Printer, 
  Heart, 
  FolderCheck,
  Check,
  Layers,
  Database,
  Upload
} from 'lucide-react';
import { Contact, DispatchLogItem, ScheduledCampaign, MessageTemplate, AppSettings, ContactGroup } from '../types';
import { restoreFromBackup } from '../utils/storage';
import { downloadFileSafely, handleDownloadBackup } from '../utils/downloadHelper';
import { BackupDownloadModal } from './BackupDownloadModal';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts?: Contact[];
  logs?: DispatchLogItem[];
  campaigns?: ScheduledCampaign[];
  templates?: MessageTemplate[];
  groups?: ContactGroup[];
  settings?: AppSettings;
  onOpenSaveAndReset?: () => void;
  onRefreshData?: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ 
  isOpen, 
  onClose,
  contacts = [],
  logs = [],
  campaigns = [],
  templates = [],
  groups = [],
  settings,
  onOpenSaveAndReset,
  onRefreshData,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const womenCount = contacts.filter(c => c.gender === 'mulher').length;
  const menCount = contacts.filter(c => c.gender === 'homem' || !c.gender).length;

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = restoreFromBackup(json);
        if (result.success) {
          setDownloadSuccess('Dados restaurados com sucesso! Recarregando...');
          setTimeout(() => {
            if (onRefreshData) onRefreshData();
            window.location.reload();
          }, 1500);
        } else {
          alert(`Erro ao restaurar: ${result.error}`);
        }
      } catch (err) {
        alert('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAllJson = () => {
    setIsBackupModalOpen(true);
  };

  const handleExportCsv = () => {
    try {
      if (logs.length === 0 && contacts.length === 0) return;

      const headers = ['Campanha/Origem', 'Contato', 'Telefone', 'Gênero', 'Status', 'Data', 'Mensagem/Notas'];
      const rows: string[][] = [];

      if (logs.length > 0) {
        logs.forEach(l => {
          const contact = contacts.find(c => c.id === l.contactId || c.phone === l.phone);
          rows.push([
            `"${l.campaignTitle || 'Envio Avulso'}"`,
            `"${l.contactName || ''}"`,
            `"${l.phone || ''}"`,
            `"${contact?.gender === 'mulher' ? 'Mulher (Suave)' : 'Homem'}"`,
            `"${l.status || ''}"`,
            `"${l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR') : '—'}"`,
            `"${(l.messageText || '').replace(/"/g, '""')}"`,
          ]);
        });
      } else {
        contacts.forEach(c => {
          rows.push([
            `"${c.group || 'Agenda'}"`,
            `"${c.name || ''}"`,
            `"${c.phone || ''}"`,
            `"${c.gender === 'mulher' ? 'Mulher (Suave)' : 'Homem'}"`,
            `"Cadastrado"`,
            `"${c.createdAt ? new Date(c.createdAt).toLocaleString('pt-BR') : '—'}"`,
            `"${(c.notes || '').replace(/"/g, '""')}"`,
          ]);
        });
      }

      const csvContent = [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8' });
      downloadFileSafely(blob, `relatorio_geral_gkd_${new Date().toISOString().slice(0, 10)}.csv`);

      setDownloadSuccess('Planilha CSV gerada e baixada com sucesso!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
    }
  };

  const handlePrintPdf = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Relatório Geral e Histórico - GKD Messenger</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #111; }
              h1 { color: #A88B4B; font-size: 20px; margin-bottom: 4px; }
              .meta { font-size: 11px; color: #666; margin-bottom: 16px; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
              .summary-box { display: flex; gap: 16px; margin-bottom: 16px; background: #f7f7f7; padding: 12px; border-radius: 6px; }
              .summary-item { font-size: 12px; }
              .summary-item strong { display: block; font-size: 15px; color: #222; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
              th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
              th { background-color: #f0f0f0; font-weight: bold; }
              tr:nth-child(even) { background-color: #fafafa; }
              .badge-fem { color: #c026d3; font-weight: bold; }
              .badge-masc { color: #0284c7; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>GKD Messenger • Relatório Geral de Disparos e Contatos</h1>
            <div class="meta">
              Gerado em: ${new Date().toLocaleString('pt-BR')} | Total de Registros: ${logs.length} disparos, ${contacts.length} contatos
            </div>

            <div class="summary-box">
              <div class="summary-item">Total Contatos: <strong>${contacts.length}</strong></div>
              <div class="summary-item">Mulheres (Abordagem Suave): <strong style="color: #c026d3">${womenCount}</strong></div>
              <div class="summary-item">Homens: <strong style="color: #0284c7">${menCount}</strong></div>
              <div class="summary-item">Disparos no Histórico: <strong>${logs.length}</strong></div>
              <div class="summary-item">Campanhas / Agendamentos: <strong>${campaigns.length}</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Contato</th>
                  <th>Gênero</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th>Data Envio</th>
                  <th>Mensagem</th>
                </tr>
              </thead>
              <tbody>
                ${(logs.length > 0 ? logs : contacts).map(item => {
                  const isLog = 'sentAt' in item;
                  const contact = isLog ? contacts.find(c => c.id === (item as DispatchLogItem).contactId || c.phone === (item as DispatchLogItem).phone) : (item as Contact);
                  const isFem = contact?.gender === 'mulher';
                  return `
                    <tr>
                      <td>${isLog ? (item as DispatchLogItem).campaignTitle : (item as Contact).group}</td>
                      <td><strong>${isLog ? (item as DispatchLogItem).contactName : (item as Contact).name}</strong></td>
                      <td><span class="${isFem ? 'badge-fem' : 'badge-masc'}">${isFem ? 'Mulher' : 'Homem'}</span></td>
                      <td>${item.phone || '—'}</td>
                      <td><strong>${isLog ? (item as DispatchLogItem).status : 'Cadastrado'}</strong></td>
                      <td>${isLog && (item as DispatchLogItem).sentAt ? new Date((item as DispatchLogItem).sentAt!).toLocaleString('pt-BR') : '—'}</td>
                      <td>${isLog ? (item as DispatchLogItem).messageText : ((item as Contact).notes || '—')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
          </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Erro ao gerar impressão PDF:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-[#12151C] border border-[#1F2229] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1F2229] bg-[#0F1115] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-[#A88B4B]/10 p-2.5 rounded-xl border border-[#A88B4B]/30 text-[#A88B4B]">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-serif">Central de Ajuda, Manual & Backup Geral</h2>
              <p className="text-xs text-gray-400">Guia definitivo, abordagem por gênero, regras de envio e ferramentas para salvar tudo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#1A1D23] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar: Salvar Tudo / Backup Geral */}
        <div className="bg-[#181B22] border-b border-[#1F2229] p-3 sm:p-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2 text-[#A88B4B] text-xs font-bold uppercase tracking-wider">
                <Database className="w-4 h-4" />
                <span>Salvar Tudo • Cópia de Segurança & Relatórios Gerais</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Faça o download do backup completo com 1 clique para manter seus contatos, modelos, configurações e histórico sempre seguros.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportJson}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#15181E] hover:bg-[#1F2229] text-gray-200 border border-[#2A2E39] px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                title="Importa um arquivo de backup JSON salvo anteriormente"
              >
                <Upload className="w-3.5 h-3.5 text-[#A88B4B] shrink-0" />
                <span className="truncate">Importar</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllJson}
                className="bg-[#A88B4B] hover:bg-[#C5A968] text-slate-950 px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md transition-all cursor-pointer col-span-2 sm:col-span-1"
                title="Baixa todos os contatos, histórico, campanhas, modelos e configurações em formato JSON"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Salvar Tudo (JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="bg-[#15181E] hover:bg-[#1F2229] text-gray-200 border border-[#2A2E39] px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                title="Exporta dados em planilha CSV"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="bg-[#15181E] hover:bg-[#1F2229] text-gray-200 border border-[#2A2E39] px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                title="Gera relatório para imprimir ou salvar em PDF"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">PDF</span>
              </button>

              {onOpenSaveAndReset && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSaveAndReset();
                  }}
                  className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer col-span-2"
                  title="Abrir Central de Salvamento e Redefinição de Ciclos"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Salvar & Zerar Ciclo</span>
                </button>
              )}
            </div>
          </div>

          {/* Success Banner */}
          {downloadSuccess && (
            <div className="mt-2.5 p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg flex items-center space-x-2 text-emerald-300 text-xs animate-fade-in font-medium">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* Realtime Stats Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-2.5 border-t border-[#1F2229]/60 text-[11px]">
            <div className="bg-[#0A0C10] p-2 rounded-lg border border-[#1F2229]">
              <span className="text-gray-400 block text-[10px]">Contatos Totais:</span>
              <strong className="text-white text-xs">{contacts.length}</strong>
            </div>
            <div className="bg-[#0A0C10] p-2 rounded-lg border border-pink-500/20">
              <span className="text-pink-300 block text-[10px]">👩 Mulheres (Suave):</span>
              <strong className="text-pink-400 text-xs">{womenCount}</strong>
            </div>
            <div className="bg-[#0A0C10] p-2 rounded-lg border border-sky-500/20">
              <span className="text-sky-300 block text-[10px]">👨 Homens:</span>
              <strong className="text-sky-400 text-xs">{menCount}</strong>
            </div>
            <div className="bg-[#0A0C10] p-2 rounded-lg border border-[#1F2229]">
              <span className="text-gray-400 block text-[10px]">Histórico de Envios:</span>
              <strong className="text-emerald-400 text-xs">{logs.length}</strong>
            </div>
            <div className="bg-[#0A0C10] p-2 rounded-lg border border-[#1F2229]">
              <span className="text-gray-400 block text-[10px]">Campanhas / Modelos:</span>
              <strong className="text-amber-400 text-xs">{campaigns.length} / {templates.length}</strong>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-gray-300 text-xs sm:text-sm">
          
          {/* Section: Abordagem Inteligente por Gênero & Suavização de Tom */}
          <div className="space-y-3 bg-[#181B22] p-4.5 rounded-xl border border-pink-500/30 shadow-sm">
            <div className="flex items-center space-x-2 text-pink-400 font-bold uppercase tracking-wider text-xs">
              <Heart className="w-4 h-4 text-pink-400" />
              <span>1. Abordagem Inteligente por Gênero & Suavização Automática de Tom</span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              O sistema possui um mecanismo exclusivo de inteligência contextual para abordagem no WhatsApp que identifica contatos femininos e masculinos:
            </p>
            <ul className="space-y-2 pl-4 list-disc text-gray-300">
              <li>
                <strong className="text-pink-300">Suavização de Gírias e Expressões Ríspidas:</strong> Para contatos do gênero feminino, expressões como <code className="text-rose-300 font-mono">"CARA"</code>, <code className="text-rose-300 font-mono">"Fala cara"</code>, <code className="text-rose-300 font-mono">"E aí cara"</code> e <code className="text-rose-300 font-mono">"Mano"</code> são convertidas automaticamente para saudações elegantes e acolhedoras (ex: <span className="text-emerald-300">"Olá, tudo bem?"</span>, <span className="text-emerald-300">"Oi, [Nome]!"</span>, <span className="text-pink-300">"amiga"</span>, <span className="text-pink-300">"parceira"</span>).
              </li>
              <li>
                <strong className="text-white">Ajuste Gramatical Automático:</strong> Termos como <code className="text-amber-300 font-mono">bem-vindo</code>, <code className="text-amber-300 font-mono">preparado</code>, <code className="text-amber-300 font-mono">pronto</code>, <code className="text-amber-300 font-mono">cadastrado</code> e <code className="text-amber-300 font-mono">motorista parceiro</code> são flexionados no feminino (<span className="text-pink-300 font-semibold">bem-vinda, preparada, pronta, cadastrada, parceira</span>).
              </li>
              <li>
                <strong className="text-white">Preservação da Apresentação do Mentor:</strong> Quando a mensagem apresenta você como remetente (ex: <em>"Aqui é o Cláudio, motorista parceiro e seu mentor..."</em>), a forma masculina é preservada com exatidão, adaptando apenas o tratamento ao destinatário.
              </li>
              <li>
                <strong className="text-white">Filtro de Gênero & Alternância Rápida:</strong> Na aba <strong>Contatos</strong>, utilize os botões <span className="text-pink-300 font-bold">👩 Mulheres (Abordagem Suave)</span> e <span className="text-sky-300 font-bold">👨 Homens</span>. Em cada contato, a etiqueta de gênero é clicável e permite alternar o gênero com 1 toque caso deseje ajustar manualmente.
              </li>
            </ul>
          </div>

          {/* Section: Como Salvar Tudo e Manter Seus Dados Seguros */}
          <div className="space-y-3 bg-[#181B22] p-4.5 rounded-xl border border-[#A88B4B]/30">
            <div className="flex items-center space-x-2 text-[#A88B4B] font-bold uppercase tracking-wider text-xs">
              <Save className="w-4 h-4" />
              <span>2. Como Salvar Tudo & Segurança Permanente dos Seus Dados</span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Todos os seus contatos, agendamentos, histórico de disparos, modelos de mensagem e configurações ficam salvos na memória do seu navegador:
            </p>
            <ul className="space-y-2 pl-4 list-disc text-gray-300">
              <li>
                <strong className="text-white">Salvamento Instantâneo (JSON):</strong> Use o botão <span className="text-[#A88B4B] font-bold">"Salvar Tudo (JSON)"</span> nesta tela para baixar um arquivo completo de segurança. Esse arquivo contém todos os dados do sistema.
              </li>
              <li>
                <strong className="text-white">Ciclos de 15 Dias e Redefinição Segura:</strong> Ao final de uma campanha de 15 dias, use a <span className="text-amber-300 font-semibold">Central Salvar & Zerar</span> para arquivar o ciclo com segurança e zerar os disparos para o próximo período sem perder nada.
              </li>
              <li>
                <strong className="text-white">Troca de Dispositivo / Limpeza:</strong> Caso precise formatar seu computador ou trocar de celular/navegador, sempre baixe o backup JSON para restaurar tudo facilmente.
              </li>
            </ul>
          </div>

          {/* Section: Regras de Envio & Segurança */}
          <div className="space-y-3 bg-[#181B22] p-4.5 rounded-xl border border-[#1F2229]">
            <div className="flex items-center space-x-2 text-[#A88B4B] font-bold uppercase tracking-wider text-xs">
              <ShieldAlert className="w-4 h-4" />
              <span>3. Regras Inteligentes de Envio e Proteção Anti-Ban</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              O GKD Messenger possui um sistema robusto de conformidade com as diretrizes do WhatsApp para proteger seus números e chips contra bloqueios:
            </p>
            <ul className="space-y-2 pl-4 list-disc text-gray-300">
              <li><strong className="text-white">Horário Restrito (20h às 09h):</strong> Mensagens não podem ser disparadas automaticamente neste período noturno para evitar incômodo e denúncias.</li>
              <li><strong className="text-white">Atenção aos Domingos:</strong> Alerta de confirmação obrigatória antes de realizar disparos aos domingos.</li>
              <li><strong className="text-white">Limite Diário por Chip:</strong> Proteção de até 50 a 60 mensagens por dia por chip com alerta visual detalhado quando o limite estiver próximo.</li>
              <li><strong className="text-white">Dupla Mensagem no Mesmo Dia:</strong> O sistema avisa e protege se você tentar enviar mais de uma mensagem para o mesmo contato no mesmo dia.</li>
            </ul>
          </div>

          {/* Section: Gestão de Múltiplos Chips & Memória */}
          <div className="space-y-3 bg-[#181B22] p-4.5 rounded-xl border border-[#1F2229]">
            <div className="flex items-center space-x-2 text-[#A88B4B] font-bold uppercase tracking-wider text-xs">
              <Smartphone className="w-4 h-4" />
              <span>4. Gestão de Chips (Business vs Suporte) e Campanhas CG</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              O sistema organiza automaticamente os chips de acordo com o tipo de campanha:
            </p>
            <ul className="space-y-2 pl-4 list-disc text-gray-300">
              <li><strong className="text-white">Business (Chip 1):</strong> Direcionado automaticamente para contatos de campanhas promocionais de alto valor (<span className="text-emerald-400 font-semibold">CG 100 / CG05_$100 / CG10_$100</span>).</li>
              <li><strong className="text-white">Suporte (Chip 2):</strong> Direcionado para contatos da campanha de R$ 50 (<span className="text-amber-400 font-semibold">CG05_$50</span>), atendimento padrão, suporte e contatos da agenda comum.</li>
              <li><strong className="text-white">Memória de Histórico:</strong> O sistema analisa automaticamente qual chip foi utilizado anteriormente com cada contato e exibe a opção <span className="text-amber-300 font-semibold">"Reutilizar Este Chip"</span> para manter o mesmo canal de conversa.</li>
            </ul>
          </div>

          {/* Section: Gestão de Contatos, Importação & Auditoria */}
          <div className="space-y-3 bg-[#181B22] p-4.5 rounded-xl border border-[#1F2229]">
            <div className="flex items-center space-x-2 text-[#A88B4B] font-bold uppercase tracking-wider text-xs">
              <Users className="w-4 h-4" />
              <span>5. Gestão de Contatos, Importação VCF e Auditoria</span>
            </div>
            <ul className="space-y-2 pl-4 list-disc text-gray-300">
              <li><strong className="text-white">Importação VCF / Colar Contatos:</strong> Importe listas de contatos via arquivo `.vcf` ou colando texto diretamente. O gênero e chip são atribuídos na hora.</li>
              <li><strong className="text-white">Auditoria por Contato (Aba no Histórico):</strong> Monitore exatamente quantos envios cada contato recebeu para balancear a comunicação sem sobrecarregar ninguém.</li>
            </ul>
          </div>

          {/* Section: Assistente de Inteligência Artificial */}
          <div className="space-y-3 bg-[#181B22] p-4.5 rounded-xl border border-[#1F2229]">
            <div className="flex items-center space-x-2 text-[#A88B4B] font-bold uppercase tracking-wider text-xs">
              <Bot className="w-4 h-4" />
              <span>6. Assistente de Inteligência Artificial (Chat)</span>
            </div>
            <ul className="space-y-2 pl-4 list-disc text-gray-300">
              <li><strong className="text-white">Chat Interativo:</strong> Utilize o botão flutuante no canto inferior direito para conversar com o assistente inteligente do GKD Messenger.</li>
              <li><strong className="text-white">Criação de Mensagens:</strong> Peça à IA para redigir novos modelos de mensagem para diferentes momentos (primeiro contato, incentivo, lembrete de último dia).</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1F2229] bg-[#0F1115] flex flex-wrap justify-between items-center gap-2 shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>GKD Messenger • Sistema de Disparos e Gestão v2.5</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveAllJson}
              className="bg-[#1F2229] hover:bg-gray-800 text-gray-200 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#A88B4B]" />
              <span>Salvar Backup</span>
            </button>
            <button
              onClick={onClose}
              className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer"
            >
              Fechar Ajuda
            </button>
          </div>
        </div>

      </div>

      <BackupDownloadModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        data={{
          contacts,
          logs,
          campaigns,
          templates,
          groups,
          settings,
        }}
        onSuccess={(savedName) => {
          setDownloadSuccess(`Backup 100% completo salvo com sucesso! (${savedName})`);
          setTimeout(() => setDownloadSuccess(null), 4000);
        }}
      />
    </div>
  );
};
