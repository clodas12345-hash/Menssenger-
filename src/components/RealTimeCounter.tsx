import React, { useMemo, useState } from 'react';
import { Zap, Smartphone, History, CheckCircle2, AlertOctagon, Trash2, AlertTriangle, X } from 'lucide-react';
import { DispatchLogItem, AppSettings, WhatsAppChip } from '../types';
import { cleanChipName, calculateChipReleaseTimes } from '../utils/whatsapp';

interface RealTimeCounterProps {
  logs: DispatchLogItem[];
  settings: AppSettings;
  compact?: boolean;
  onResetChip?: (chipId: string) => void;
  onResetAll?: () => void;
}

export const RealTimeCounter: React.FC<RealTimeCounterProps> = React.memo(({ logs, settings, compact = false, onResetChip, onResetAll }) => {
  const allChips = useMemo(() => settings.chips || [], [settings.chips]);
  
  // Modal state for confirmation
  const [chipToReset, setChipToReset] = useState<{ id: string; name: string } | null>(null);
  
  // Update sliding window every 60s
  const [nowMs, setNowMs] = React.useState(Date.now());
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000;

  const getEffectiveColor = (chip: WhatsAppChip, index: number) => {
    if (chip.color && chip.color !== '#D4AF37' && chip.color !== '#A88B4B') {
      return chip.color;
    }
    const clean = cleanChipName(chip.name).toLowerCase();
    if (clean.includes('suporte') || clean.includes('support')) return '#3B82F6';
    if (clean.includes('business') || clean.includes('principal') || index === 0) return '#10B981';
    const fallbackPalette = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
    return fallbackPalette[index % fallbackPalette.length];
  };

  // Calculate metrics for each chip individually
  const chipMetrics = useMemo(() => {
    return allChips.map((chip, idx) => {
      const maxLimit = chip.dailyLimit || settings.maxMessagesPer24Hours || 50;
      const metrics = calculateChipReleaseTimes(logs, chip.id, chip.name, maxLimit, chip.lastResetAt);
      const sentCount = metrics.count;
      const percent = Math.min(100, Math.round((sentCount / maxLimit) * 100));
      const color = getEffectiveColor(chip, idx);

      return {
        ...chip,
        color,
        sentCount,
        maxLimit,
        percent,
        nextRelease: metrics.nextDecreaseTime,
        canSendTime: metrics.canSendTime
      };
    });
  }, [logs, allChips, twentyFourHoursAgoMs, settings.maxMessagesPer24Hours]);

  const formatReleaseDate = (date: Date | null) => {
    if (!date) return null;
    const diffMs = date.getTime() - nowMs;
    const diffMin = Math.ceil(diffMs / (60 * 1000));
    const diffHrs = Math.floor(diffMin / 60);
    const remMin = diffMin % 60;

    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
    const datePrefix = isToday ? 'hoje' : 'amanhã';

    let countdown = '';
    if (diffMs > 0) {
      if (diffHrs > 0) {
        countdown = `(em ${diffHrs}h ${remMin}m)`;
      } else {
        countdown = `(em ${diffMin} min)`;
      }
    }

    return (
      <span className="inline-flex items-center gap-1">
        <span className="font-medium text-gray-400">{datePrefix} às</span>
        <span className="font-bold text-white">{timeStr}</span>
        <span className="text-[9px] text-gray-500 font-medium">{countdown}</span>
      </span>
    );
  };

  const [expandedChipId, setExpandedChipId] = React.useState<string | null>(null);

  if (compact) {
    return (
      <div className="flex items-center flex-wrap gap-1.5">
        {chipMetrics.map(chip => {
          const color = chip.color;
          const isEstourado = chip.sentCount >= chip.maxLimit;
          return (
            <div 
              key={chip.id} 
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-all duration-500 ${isEstourado ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5'}`}
              style={{ borderColor: isEstourado ? '#EF444466' : `${color}44` }}
            >
              <div 
                className="w-2 h-2 rounded-full animate-pulse" 
                style={{ backgroundColor: isEstourado ? '#EF4444' : color }}
              />
              <span className="text-[9px] font-black font-mono text-white tracking-tighter">
                {cleanChipName(chip.name).substring(0, 3)}: {chip.sentCount}/{chip.maxLimit}
              </span>
              <span className={`text-[8px] font-bold uppercase tracking-wider ${isEstourado ? 'text-red-400 font-black' : 'text-emerald-400'}`}>
                {isEstourado ? 'Bloqueado' : 'Livre'}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chipMetrics.map(chip => {
          const color = chip.color;
          const isEstourado = chip.sentCount >= chip.maxLimit;
          const remaining = Math.max(0, chip.maxLimit - chip.sentCount);
          const nextReleaseDate = isEstourado ? (chip.canSendTime || chip.nextRelease) : chip.nextRelease;

          return (
            <div 
              key={chip.id} 
              className="p-4 rounded-2xl border transition-all duration-500 shadow-xl overflow-hidden relative group bg-[#15181E]"
              style={{ 
                borderColor: isEstourado ? '#EF444455' : `${color}44`,
                boxShadow: `0 4px 24px -2px ${isEstourado ? '#EF444415' : `${color}15`}`
              }}
            >
              {/* Trash icon for reset in top right */}
              {onResetChip && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChipToReset({ id: chip.id, name: cleanChipName(chip.name) });
                  }}
                  className="absolute top-3 right-3 z-30 p-2.5 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Zerar este contador"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <Zap 
                className="absolute -right-2 -bottom-2 w-24 h-24 opacity-5 rotate-12 transition-transform group-hover:scale-110 duration-700 pointer-events-none" 
                style={{ color: isEstourado ? '#EF4444' : color }}
              />
              
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg border-none shrink-0" style={{ backgroundColor: `${color}25` }}>
                      <Smartphone className="w-4 h-4" style={{ color: color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 leading-none">Chip</h3>
                      <p className="text-sm font-serif italic text-white leading-tight truncate">{cleanChipName(chip.name)}</p>
                    </div>
                    
                    {isEstourado ? (
                      <span 
                        className="ml-auto px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border bg-red-500/10 border-red-500/30 text-red-400 shrink-0"
                      >
                        BLOQUEADO (LIMITE)
                      </span>
                    ) : (
                      <span 
                        className="ml-auto px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border shrink-0 transition-colors"
                        style={{ 
                          backgroundColor: `${color}20`, 
                          borderColor: `${color}44`, 
                          color: color 
                        }}
                      >
                        {chip.percent === 0 ? 'LIVRE' : `LIVRE (${remaining} VAGAS)`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-3xl font-serif italic text-white tracking-tighter">{chip.sentCount}</span>
                      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        / {chip.maxLimit} <span className="lowercase font-normal">mensagens (24h)</span>
                      </span>
                    </div>
                  </div>

                {/* Status & Release Alert */}
                <div className="space-y-2 mt-1">
                  {isEstourado ? (
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20 w-full">
                      <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Limite 50/50 BLOQUEADO</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 w-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        {remaining === 0 ? 'Limite' : 'Chip Disponível'} ({remaining} vagas)
                      </span>
                    </div>
                  )}

                  {/* Discrete toggle for details */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedChipId(expandedChipId === chip.id ? null : chip.id);
                    }}
                    className="w-full flex items-center justify-between px-2 py-1 text-[9px] font-bold text-gray-500 hover:text-white transition-colors group/toggle"
                  >
                    <div className="flex items-center gap-1.5">
                      <History className="w-3 h-3" />
                      <span className="uppercase tracking-widest">Próximas liberações</span>
                    </div>
                    <span className="text-[10px] font-black transition-transform duration-300" style={{ transform: expandedChipId === chip.id ? 'rotate(180deg)' : 'none' }}>▼</span>
                  </button>

                  {expandedChipId === chip.id && (
                    <div className="space-y-1.5 p-2 bg-black/40 rounded-lg border border-white/5 animate-in slide-in-from-top-2 duration-300 max-h-60 overflow-y-auto no-scrollbar">
                      <div className="flex items-center justify-between text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1 pb-1 border-b border-white/5 sticky top-0 bg-black/90 backdrop-blur-sm z-10">
                        <span>Horário</span>
                        <span>Vaga</span>
                      </div>
                      {/* Show next 15 releases */}
                      {(() => {
                        const maxLimit = chip.maxLimit;
                        const chipCleanName = (chip.name || '').toLowerCase();
                        const nowMs = Date.now();
                        const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000;
                        const resetTimestampMs = chip.lastResetAt ? new Date(chip.lastResetAt).getTime() : 0;
                        
                        const relevantTimestamps = logs
                          .filter(l => {
                            const match = l.chipId === chip.id || (l.chipName && cleanChipName(l.chipName).toLowerCase() === chipCleanName);
                            if (!match) return false;
                            const ts = new Date(l.sentAt).getTime();
                            return ts >= twentyFourHoursAgoMs && ts >= resetTimestampMs;
                          })
                          .map(l => new Date(l.sentAt).getTime())
                          .sort((a, b) => a - b);

                        if (relevantTimestamps.length === 0) {
                          return <p className="text-[9px] text-gray-600 italic py-1 text-center">Nenhuma vaga agendada para liberar</p>;
                        }

                        return relevantTimestamps.slice(0, 15).map((ts, i) => (
                          <div key={i} className="flex items-center justify-between py-0.5 border-b border-white/5 last:border-0 hover:bg-white/5 px-1 rounded transition-colors">
                            <span className="text-[10px] text-gray-300 font-mono">{formatReleaseDate(new Date(ts + 24 * 60 * 60 * 1000))}</span>
                            <span className="text-[9px] font-black text-[#A88B4B]">#{i + 1}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                {/* Mini progress bar */}
                <div className="h-1.5 w-full bg-gray-800/80 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-1000 rounded-full" 
                    style={{ 
                      width: `${chip.percent}%`, 
                      backgroundColor: isEstourado ? '#EF4444' : color,
                      boxShadow: `0 0 8px ${isEstourado ? '#EF4444' : color}`
                    }}
                  />
                </div>
              </div>

              {/* Circular Indicator */}
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-[#0A0C10]" />
                  <circle
                    cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4"
                    strokeDasharray={176}
                    strokeDashoffset={176 - (176 * chip.percent) / 100}
                    strokeLinecap="round"
                    style={{ color: isEstourado ? '#EF4444' : color }}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className={`absolute text-[10px] font-black ${isEstourado ? 'text-red-400' : 'text-white'}`}>
                  {chip.percent}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {/* POP-UP MODAL DE CONFIRMAÇÃO DE ZERAR CONTADOR */}
      {chipToReset && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setChipToReset(null)}
        >
          <div 
            className="bg-[#15181E] border border-red-500/40 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setChipToReset(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/30 text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white tracking-tight">Zerar Contador?</h3>
                <p className="text-xs text-amber-400 font-semibold truncate">Chip: {chipToReset.name}</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-[#0A0C10] p-3.5 rounded-xl border border-white/5">
              Tem certeza que deseja zerar a contagem em tempo real deste chip? O limite de disparos efetuados nas últimas 24 horas será redefinido para zero.
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setChipToReset(null)}
                className="flex-1 py-2.5 px-4 bg-[#1C1F26] hover:bg-[#252932] text-gray-300 rounded-xl text-xs font-bold transition-all border border-white/10 active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResetChip) {
                    onResetChip(chipToReset.id);
                  }
                  setChipToReset(null);
                }}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Zerar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
});
