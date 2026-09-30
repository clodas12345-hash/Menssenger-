import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, EyeOff, Settings, AlertTriangle, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';
import { AppSettings, DispatchLogItem } from '../types';
import { getTodayDateString } from '../utils/storage';

interface DailyLimitWidgetProps {
  settings: AppSettings;
  logs: DispatchLogItem[];
  onUpdateSettings: (newSettings: AppSettings) => void;
  onOpenSettings: () => void;
  onReportBlocked24h?: () => void;
  onUnblockWhatsApp?: () => void;
}

export const DailyLimitWidget: React.FC<DailyLimitWidgetProps> = ({
  settings,
  logs,
  onUpdateSettings,
  onOpenSettings,
  onReportBlocked24h,
  onUnblockWhatsApp,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(settings.hideLimitBanner || false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const todayStr = getTodayDateString();

  const activeChip = settings.chips?.find(c => c.id === settings.activeChipId);
  const maxLimit = activeChip?.dailyLimit || settings.maxMessagesPer24Hours || 50;

  const isBlocked24h = !!(settings.blockedUntil && new Date(settings.blockedUntil).getTime() > Date.now());
  const blockedUntilDate = settings.blockedUntil ? new Date(settings.blockedUntil) : null;
  const blockedTimeStr = blockedUntilDate ? blockedUntilDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const blockedDateStr = blockedUntilDate ? blockedUntilDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';

  const nowMs = Date.now();
  const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000;

  const sentLast24H = logs.filter((l) => {
    if (l.status !== 'enviado' || !l.sentAt) return false;
    if (activeChip && l.chipId && l.chipId !== activeChip.id) return false;
    const sentTime = new Date(l.sentAt).getTime();
    return !isNaN(sentTime) && sentTime >= twentyFourHoursAgoMs;
  }).length;

  const remaining = Math.max(0, maxLimit - sentLast24H);
  const isLimitReached = sentLast24H >= maxLimit;

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    
    // Update both global and specific chip limit if active
    const newChips = settings.chips ? [...settings.chips] : [];
    if (activeChip) {
      const idx = newChips.findIndex(c => c.id === activeChip.id);
      if (idx !== -1) {
        newChips[idx] = { ...newChips[idx], dailyLimit: val };
      }
    }
    
    onUpdateSettings({
      ...settings,
      maxMessagesPer24Hours: val,
      chips: newChips
    });
  };

  const handleToggleHide = () => {
    const nextVal = !isDismissed;
    setIsDismissed(nextVal);
    onUpdateSettings({
      ...settings,
      hideLimitBanner: nextVal,
    });
  };

  const options = [50, 60, 70, 80, 90, 100, 120, 150];

  if (isDismissed) {
    return null;
  }

  return (
    <div className={`mx-4 mt-4 p-4 rounded-xl transition-all shadow-lg ${
      isBlocked24h
        ? 'bg-red-950/80 border border-red-600/80 text-red-100 animate-pulse'
        : isLimitReached 
        ? 'bg-red-950/40 border border-red-500/40 text-red-200' 
        : 'bg-[#15181E] border border-transparent text-gray-200'
    }`}>
      {/* 24h Block Active Alert Banner */}
      {isBlocked24h && (
        <div className="bg-red-900/60 border border-red-500/50 p-3 rounded-lg mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <strong className="text-white font-bold uppercase tracking-wider block">
                🚫 Fui Bloqueado no WhatsApp (Pausa de 24 Horas Ativa)
              </strong>
              <p className="text-[11px] text-red-200">
                Os disparos estão temporariamente pausados. Liberação automática em <strong className="text-white font-mono">{blockedDateStr} às {blockedTimeStr}</strong>.
              </p>
            </div>
          </div>

          {onUnblockWhatsApp && (
            <button
              type="button"
              onClick={onUnblockWhatsApp}
              className="bg-red-950 hover:bg-red-900 text-white font-bold px-3 py-1.5 rounded border border-red-500 text-xs transition-all shrink-0 flex items-center space-x-1 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Desbloquear Manualmente</span>
            </button>
          )}
        </div>
      )}

      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-lg shrink-0 ${
            isBlocked24h ? 'bg-red-500/30 text-red-300' : isLimitReached ? 'bg-red-500/20 text-red-400' : 'bg-[#A88B4B]/10 text-[#A88B4B]'
          }`}>
            {isBlocked24h ? <ShieldAlert className="w-5 h-5 text-red-400" /> : isLimitReached ? <ShieldAlert className="w-5 h-5 animate-bounce" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-[#A88B4B] transition-colors">
                Limitador e Gestão (24h)
              </h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                isBlocked24h ? 'bg-red-600 text-white font-extrabold' : isLimitReached ? 'bg-red-500 text-white animate-pulse' : 'bg-[#A88B4B] text-[#0A0C10]'
              }`}>
                {isBlocked24h ? '🚫 Bloqueado 24h' : isLimitReached ? 'Limite Atingido!' : `${remaining} restantes`}
              </span>
            </div>
            {!isExpanded && (
              <p className="text-[10px] text-gray-400 mt-1 hidden sm:block">
                Clique para expandir as opções, reportar bloqueios ou alterar a meta.
              </p>
            )}
          </div>
        </div>
        
        <div className="text-gray-500 group-hover:text-[#A88B4B] transition-colors bg-[#0A0C10] p-1.5 rounded-md">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#1F2229] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="text-xs text-gray-400 max-w-lg">
            {isBlocked24h
              ? `🚫 A rotina de disparos está pausada por 24 horas para proteção do chip. Libera em ${blockedDateStr} às ${blockedTimeStr}.`
              : isLimitReached 
              ? `⚠️ Você atingiu o limite de ${maxLimit} mensagens nas últimas 24 horas. Para evitar bloqueios no WhatsApp, os envios estão pausados.`
              : `Você já enviou ${sentLast24H} de ${maxLimit} mensagens permitidas nas últimas 24h. Cuidado para seu WhatsApp não ser bloqueado.`}
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Report 24h Block Button */}
            {onReportBlocked24h && !isBlocked24h && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Marcar que seu WhatsApp foi bloqueado? O sistema pausará todos os envios por 24 horas.')) {
                    onReportBlocked24h();
                  }
                }}
                className="bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/80 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
                title="Sinalizar que seu WhatsApp foi bloqueado para pausar envios por 24h"
              >
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>Já enviei</span>
              </button>
            )}

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                Meta Diária:
              </span>
              <select
                value={maxLimit}
                onClick={(e) => e.stopPropagation()}
                onChange={handleLimitChange}
                className="bg-[#0A0C10] border border-[#1F2229] hover:border-[#A88B4B] rounded px-3 py-1.5 text-xs text-[#A88B4B] font-mono font-bold focus:outline-none transition-all cursor-pointer"
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} mensagens
                  </option>
                ))}
              </select>
            </div>
            
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToggleHide(); }}
              className="bg-[#0A0C10] hover:bg-[#1F2229] text-gray-400 hover:text-white border border-[#1F2229] px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Ocultar este aviso (continuará aplicando o limite em segundo plano)"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Ocultar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
