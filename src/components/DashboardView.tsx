import React, { useMemo } from 'react';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Send, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Trash2,
  Sparkles,
  ArrowRight,
  Edit3,
  FastForward,
  Smartphone,
  ChevronDown,
  Bell,
  Activity
} from 'lucide-react';
import { Contact, MessageTemplate, ScheduledCampaign, DispatchLogItem, AppSettings } from '../types';
import { replaceTemplateVariables, safeConfirm, cleanChipName } from '../utils/whatsapp';
import { getSettings } from '../utils/storage';
import { RealTimeCounter } from './RealTimeCounter';

interface DashboardViewProps {
  contacts: Contact[];
  templates: MessageTemplate[];
  campaigns: ScheduledCampaign[];
  logs: DispatchLogItem[];
  settings: AppSettings;
  isAppReady?: boolean;
  onNavigate: (tab: string) => void;
  onOpenNewCampaign: () => void;
  onOpenAiModal: () => void;
  onLaunchCampaign: (campaign: ScheduledCampaign) => void;
  onDeleteCampaign: (id: string) => void;
  onEditCampaign: (campaign: ScheduledCampaign) => void;
  onAdvanceCampaign?: (campaignId: string, minutes?: number) => void;
  onUpdateCampaign?: (campaign: ScheduledCampaign) => void;
  onResetChipLogs?: (chipId: string) => void;
  onResetAllChips?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = React.memo(({
  contacts,
  templates,
  campaigns,
  logs,
  settings,
  isAppReady = true,
  onNavigate,
  onOpenNewCampaign,
  onOpenAiModal,
  onLaunchCampaign,
  onDeleteCampaign,
  onEditCampaign,
  onAdvanceCampaign,
  onUpdateCampaign,
  onResetChipLogs,
  onResetAllChips,
}) => {
  const activeCampaigns = useMemo(() => {
    if (!isAppReady) return [];
    return campaigns.filter((c) => c.status === 'agendado' || c.status === 'em_andamento');
  }, [campaigns, isAppReady]);
  
  const sortedCampaigns = useMemo(() => {
    if (!isAppReady) return [];
    return [...campaigns].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }, [campaigns, isAppReady]);
  
  const vcfContactsCount = useMemo(() => {
    if (!isAppReady) return 0;
    return contacts.filter((c) => c.source === 'vcf').length;
  }, [contacts, isAppReady]);
  
  const totalSent = useMemo(() => {
    if (!isAppReady) return 0;
    const currentSent = logs.filter((l) => l.status === 'enviado').length;
    const calculatedTotal = currentSent + (settings.historicalSentCount || 0);
    return Math.max(settings.totalSentCount || 0, calculatedTotal);
  }, [logs, settings.historicalSentCount, settings.totalSentCount, isAppReady]);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteMessagesChecked, setDeleteMessagesChecked] = React.useState<boolean>(true);

  const getChipColor = (chipId?: string, chipName?: string) => {
    const chips = settings.chips || [];
    const chip = chips.find(c => c.id === chipId || (chipName && c.name && cleanChipName(c.name).toLowerCase() === cleanChipName(chipName).toLowerCase()));
    if (chip) {
      if (chip.color && chip.color !== '#D4AF37' && chip.color !== '#A88B4B') {
        return chip.color;
      }
      const idx = chips.indexOf(chip);
      const clean = cleanChipName(chip.name).toLowerCase();
      if (clean.includes('suporte') || clean.includes('support')) return '#3B82F6'; // Blue
      if (clean.includes('business') || clean.includes('principal') || idx === 0) return '#10B981'; // Green
      const fallbackPalette = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
      return fallbackPalette[idx % fallbackPalette.length];
    }
    
    const cleanName = cleanChipName(chipName || '').toLowerCase();
    if (cleanName.includes('suporte') || cleanName.includes('support')) return '#3B82F6';
    if (cleanName.includes('business') || cleanName.includes('principal')) return '#10B981';
    
    return '#A88B4B'; // Default gold/brown theme color
  };

  return (
    <div className="space-y-6">
      {/* Real Time Counter for Chips */}
      <div className="bg-[#15181E] border border-[#1F2229] rounded-xl p-4 shadow-xl">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="w-4 h-4 text-[#A88B4B]" />
          <h3 className="text-xs font-black text-white uppercase tracking-widest">Contador de Disparos em Tempo Real</h3>
        </div>
        <RealTimeCounter 
          logs={logs} 
          settings={settings} 
          onResetChip={onResetChipLogs}
          onResetAll={onResetAllChips}
        />
      </div>

      {activeCampaigns.length === 0 && (
        <div className="bg-[#15181E] border border-[#1F2229] rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-[#0A0C10] text-[#A88B4B] border border-[#A88B4B]/30 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif italic text-white">Nenhum envio agendado pendente</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Agende suas mensagens para serem disparadas no horário certo para seus contatos ou grupos.
          </p>
          <button
            onClick={onOpenNewCampaign}
            className="inline-flex items-center space-x-2 bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] font-bold px-5 py-2.5 rounded text-xs uppercase tracking-widest transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeiro Agendamento</span>
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigate('contacts')}
          className="bg-[#15181E] border border-[#1F2229] rounded-xl p-5 hover:border-[#A88B4B]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Total Contatos</span>
            <div className="p-2 rounded bg-[#0A0C10] text-[#A88B4B] border border-[#1F2229] group-hover:border-[#A88B4B]/40 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-serif italic text-white mt-2">{contacts.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-[#A88B4B] font-medium">{vcfContactsCount}</span> via importação rápida
          </p>
        </div>

        <div 
          onClick={() => onNavigate('templates')}
          className="bg-[#15181E] border border-[#1F2229] rounded-xl p-5 hover:border-[#A88B4B]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Modelos Prontos</span>
            <div className="p-2 rounded bg-[#0A0C10] text-[#A88B4B] border border-[#1F2229] group-hover:border-[#A88B4B]/40 transition-colors">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-serif italic text-white mt-2">{templates.length}</p>
          <p className="text-xs text-gray-500 mt-1">Mensagens personalizáveis</p>
        </div>

        <div 
          onClick={() => onNavigate('campaigns')}
          className="bg-[#15181E] border border-[#1F2229] rounded-xl p-5 hover:border-[#A88B4B]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Agendados</span>
            <div className="p-2 rounded bg-[#0A0C10] text-[#A88B4B] border border-[#1F2229] group-hover:border-[#A88B4B]/40 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-serif italic text-white mt-2">{activeCampaigns.length}</p>
          <p className="text-xs text-gray-500 mt-1">Campanhas ativas</p>
        </div>

        <div 
          onClick={() => onNavigate('history')}
          className="bg-[#15181E] border border-[#1F2229] rounded-xl p-5 hover:border-[#A88B4B]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Enviadas</span>
            <div className="p-2 rounded bg-[#0A0C10] text-emerald-400 border border-[#1F2229] group-hover:border-emerald-500/40 transition-colors">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-serif italic text-white mt-2">{totalSent}</p>
          <p className="text-xs text-gray-500 mt-1">Total disparado com sucesso</p>
        </div>
      </div>



      {/* Campaigns List Table */}
      <div className="bg-[#15181E] border border-[#1F2229] rounded-xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#1F2229] flex items-center justify-between bg-[#0F1115]">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#A88B4B]" />
            <h3 className="font-serif italic text-white text-lg">Todos os Agendamentos ({campaigns.length})</h3>
          </div>
          <button
            onClick={() => onNavigate('campaigns')}
            className="text-xs text-[#A88B4B] hover:text-[#C5A968] font-bold uppercase tracking-wider flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#0A0C10] border border-[#1F2229] hover:border-[#A88B4B]/40 transition-all cursor-pointer shadow-sm"
          >
            <span>Ver Todos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {sortedCampaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            Nenhuma campanha cadastrada até o momento.
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-5 bg-[#0F1115]/40">
            {sortedCampaigns.map((camp, index) => {
              const total = camp.contactIds.length;
              const sent = camp.progress?.sent || 0;
              const percent = total > 0 ? Math.round((sent / total) * 100) : 0;
              const chipColor = getChipColor(camp.chipId, camp.chipName);

              return (
                <div 
                  key={camp.id} 
                  onDoubleClick={() => onEditCampaign(camp)}
                  title="Clique 2 vezes para editar este agendamento"
                  className="p-5 bg-[#15181E] border border-[#1F2229] hover:border-opacity-100 rounded-2xl transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-5 cursor-pointer select-none group shadow-lg"
                  style={{ borderLeft: `6px solid ${chipColor}` }}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                      <span 
                        className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#0A0C10] border text-xs font-mono"
                        style={{ borderColor: `${chipColor}33`, color: chipColor }}
                      >
                        #{index + 1}
                      </span>
                      <span className="font-bold text-white text-base group-hover:text-[#A88B4B] transition-colors">{camp.title}</span>
                      <span
                        className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest border"
                        style={{
                          backgroundColor: `${chipColor}15`,
                          color: chipColor,
                          borderColor: `${chipColor}40`
                        }}
                      >
                        {camp.status === 'agendado'
                          ? 'Agendado'
                          : camp.status === 'em_andamento'
                          ? 'Em Andamento'
                          : camp.status === 'concluido'
                          ? 'Concluído'
                          : 'Cancelado'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-1 italic bg-[#0A0C10]/40 p-2.5 rounded-lg border border-[#1F2229]/40">
                      "{camp.templateContent}"
                    </p>

                    <div className="flex items-center space-x-4 text-[11px] text-gray-500 pt-1 flex-wrap gap-y-1">
                      <span>Horário: <strong className="text-gray-300 font-mono">{new Date(camp.scheduledAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
                      <span>Destinatários: <strong className="text-gray-300">{total} contatos</strong></span>
                      <span>Enviadas: <strong className="text-emerald-400">{sent}</strong></span>
                      <span>Faltam: <strong className="text-amber-400">{Math.max(0, total - sent)}</strong></span>
                      {(camp.cardImageUrl || (camp.cardImageUrls && camp.cardImageUrls.length > 0)) && (
                        <span className="flex items-center space-x-1.5 bg-[#A88B4B]/10 text-[#A88B4B] px-2 py-0.5 rounded border border-[#A88B4B]/30 font-semibold">
                          <img src={camp.cardImageUrls?.[0] || camp.cardImageUrl} alt="" className="w-3.5 h-3.5 object-cover rounded" />
                          <span>{camp.cardImageUrls && camp.cardImageUrls.length > 1 ? `🎲 ${camp.cardImageUrls.length} Cards` : camp.cardTitle || 'Card'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 pt-2 lg:pt-0" onClick={(e) => e.stopPropagation()}>
                    {deletingId === camp.id ? (
                                              <div className="flex flex-col gap-2">
                          <label className="flex items-center space-x-2 text-xs text-red-200 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={deleteMessagesChecked} 
                              onChange={(e) => setDeleteMessagesChecked(e.target.checked)}
                              className="accent-red-500"
                            />
                            <span>Excluir mensagens salvas</span>
                          </label>
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(null);
                              }}
                              className="flex-1 h-11 bg-[#0A0C10] hover:bg-[#1A1D23] text-gray-200 border border-[#2A2E39] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow"
                            >
                              Não
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCampaign(camp.id, deleteMessagesChecked);
                                setDeletingId(null);
                              }}
                              className="flex-1 h-11 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-red-600/40 active:scale-95 cursor-pointer flex items-center justify-center"
                            >
                              Sim
                            </button>
                          </div>
                        </div>
                    ) : (
                      <>
                        <div className="w-full sm:w-36 mr-0 sm:mr-1">
                          <div className="flex justify-between text-[11px] text-gray-400 mb-1.5 font-mono">
                            <span>Progresso</span>
                            <span className="font-bold" style={{ color: chipColor }}>{sent}/{total} ({percent}%)</span>
                          </div>
                          <div className="w-full bg-[#0A0C10] h-2.5 rounded-full overflow-hidden border border-[#1F2229]">
                            <div
                              className="h-full transition-all duration-300 rounded-full"
                              style={{ width: `${percent}%`, backgroundColor: chipColor }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {onAdvanceCampaign && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAdvanceCampaign(camp.id, 60);
                              }}
                              className="h-11 px-3 bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer"
                              style={{ borderColor: `${chipColor}33`, color: chipColor }}
                              title="Adiantar envio em 1 hora (este e agendamentos subsequentes)"
                            >
                              <FastForward className="w-4 h-4" style={{ color: chipColor }} />
                              <span className="hidden sm:inline">Adiantar 1h</span>
                            </button>
                          )}

                          <button
                            onClick={() => onEditCampaign(camp)}
                            className="h-11 px-3 bg-[#0A0C10] hover:bg-[#1A1D23] text-gray-200 border border-[#1F2229] rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer"
                            title="Editar Agendamento (ou clique 2 vezes no item)"
                          >
                            <Edit3 className="w-4 h-4 text-gray-400" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          <button
                            onClick={() => onLaunchCampaign(camp)}
                            className="h-11 px-4 text-[#0A0C10] rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 uppercase tracking-wider shadow-md active:scale-95 cursor-pointer"
                            style={{ backgroundColor: chipColor, color: '#0A0C10', boxShadow: `0 4px 12px ${chipColor}33` }}
                            title={camp.status === 'em_andamento' ? "Continuar Disparos" : "Abrir Disparador"}
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span className="hidden sm:inline">{camp.status === 'em_andamento' ? 'Continuar' : 'Disparar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setDeletingId(camp.id); 
                            }}
                            className="h-11 px-3 text-gray-400 hover:text-red-400 bg-[#0A0C10] hover:bg-red-950/30 border border-[#1F2229] hover:border-red-500/40 rounded-xl transition-all flex items-center justify-center shadow-sm active:scale-95 cursor-pointer"
                            title="Excluir Agendamento"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
