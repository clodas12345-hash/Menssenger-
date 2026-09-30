import React, { useMemo, useState } from 'react';
import { DispatchLogItem, AppSettings, WhatsAppChip } from '../types';
import { cleanChipName } from '../utils/whatsapp';
import { BarChart3, Smartphone, TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck, Calendar, Filter } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface AnalyticsViewProps {
  logs: DispatchLogItem[];
  settings: AppSettings;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = React.memo(({ logs, settings }) => {
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30);

  const chipsList = settings.chips || [
    { id: 'chip_1', name: 'Business', number: '', active: true },
    { id: 'chip_2', name: 'Support', number: '', active: false }
  ];

  // Filter logs for the selected time range (e.g. last 30 days)
  const filteredLogs = useMemo(() => {
    const cutoffTime = Date.now() - timeRangeDays * 24 * 60 * 60 * 1000;
    return logs.filter(l => {
      const itemTime = l.sentAt ? new Date(l.sentAt).getTime() : new Date(l.scheduledAt || Date.now()).getTime();
      return itemTime >= cutoffTime;
    });
  }, [logs, timeRangeDays]);

  // Compute stats per chip
  const chipAnalyticsData = useMemo(() => {
    const statsMap: Record<string, { chipId: string; name: string; success: number; failed: number; total: number }> = {};

    // Initialize with configured chips
    chipsList.forEach(chip => {
      const cleanName = cleanChipName(chip.name);
      statsMap[chip.id] = {
        chipId: chip.id,
        name: cleanName,
        success: 0,
        failed: 0,
        total: 0
      };
    });

    // Process logs
    filteredLogs.forEach(l => {
      const chipId = l.chipId || 'chip_1';
      const chipObj = chipsList.find(c => c.id === chipId);
      const name = l.chipName ? cleanChipName(l.chipName) : (chipObj ? cleanChipName(chipObj.name) : 'Business');

      if (!statsMap[chipId]) {
        statsMap[chipId] = {
          chipId,
          name,
          success: 0,
          failed: 0,
          total: 0
        };
      }

      statsMap[chipId].total += 1;
      if (l.status === 'enviado') {
        statsMap[chipId].success += 1;
      } else if (l.status === 'falha') {
        statsMap[chipId].failed += 1;
      } else {
        // default treatment for sent vs pending/pulado
        if (l.sentAt) {
          statsMap[chipId].success += 1;
        } else {
          statsMap[chipId].failed += 1;
        }
      }
    });

    return Object.values(statsMap).map(item => {
      const successRate = item.total > 0 ? Number(((item.success / item.total) * 100).toFixed(1)) : 0;
      return {
        ...item,
        successRate
      };
    });
  }, [filteredLogs, chipsList]);

  // Find best chip
  const bestChip = useMemo(() => {
    if (chipAnalyticsData.length === 0) return null;
    let best = chipAnalyticsData[0];
    chipAnalyticsData.forEach(c => {
      if (c.successRate > best.successRate || (c.successRate === best.successRate && c.success > best.success)) {
        best = c;
      }
    });
    return best;
  }, [chipAnalyticsData]);

  const totalFiltered = filteredLogs.length;
  const totalSuccess = chipAnalyticsData.reduce((acc, curr) => acc + curr.success, 0);
  const totalFailed = chipAnalyticsData.reduce((acc, curr) => acc + curr.failed, 0);
  const globalSuccessRate = totalFiltered > 0 ? ((totalSuccess / totalFiltered) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#15181E] border border-[#1F2229] p-6 rounded-xl shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-[#A88B4B]/10 border border-[#A88B4B]/30 rounded-xl text-[#A88B4B]">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-widest text-[#A88B4B] font-bold">Inteligência de Envio & Desempenho</span>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">Tempo Real</span>
            </div>
            <h1 className="text-2xl font-serif italic text-white mt-0.5">Análise de Desempenho Global</h1>
            <p className="text-xs text-gray-400 mt-1">
              Compare taxas de sucesso, volume de disparos e eficácia operacional nos últimos {timeRangeDays} dias.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-[#0A0C10] border border-[#1F2229] p-1 rounded-lg">
            <Calendar className="w-4 h-4 text-[#A88B4B] ml-2" />
            <select
              value={timeRangeDays}
              onChange={(e) => setTimeRangeDays(Number(e.target.value))}
              className="bg-transparent text-gray-200 text-xs px-2 py-1.5 focus:outline-none font-medium"
            >
              <option value={7} className="bg-[#15181E]">Últimos 7 dias</option>
              <option value={30} className="bg-[#15181E]">Últimos 30 dias</option>
              <option value={90} className="bg-[#15181E]">Últimos 90 dias</option>
              <option value={365} className="bg-[#15181E]">Último ano</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#15181E] border border-[#1F2229] p-5 rounded-xl shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Disparos ({timeRangeDays}d)</span>
            <div className="text-2xl font-bold text-white font-serif">{totalFiltered}</div>
            <div className="text-[11px] text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{totalSuccess} enviados com sucesso</span>
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#15181E] border border-[#1F2229] p-5 rounded-xl shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Taxa de Sucesso Global</span>
            <div className="text-2xl font-bold text-emerald-400 font-serif">{globalSuccessRate}%</div>
            <div className="text-[11px] text-gray-400">
              {totalFailed} falhas ou pendências
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Chart Section */}
      <div className="bg-[#15181E] border border-[#1F2229] rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2229] pb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-[#A88B4B]" />
              <span>Desempenho de Disparos</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Visualização gráfica das mensagens enviadas com sucesso em comparação com falhas registradas no período.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-medium">
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded bg-[#A88B4B]"></div>
              <span className="text-gray-300">Enviadas com Sucesso</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded bg-[#ef4444]"></div>
              <span className="text-gray-300">Falhas / Erros</span>
            </div>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          {chipAnalyticsData.length === 0 || chipAnalyticsData.every(c => c.total === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500/60" />
              <p className="text-sm font-medium">Nenhum registro de envio encontrado para o período selecionado.</p>
              <p className="text-xs text-gray-600">Realize disparos utilizando seus chips para visualizar as estatísticas aqui.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chipAnalyticsData}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2229" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tickLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F1115', borderColor: '#1F2229', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [
                    value, 
                    name === 'success' ? 'Sucesso' : name === 'failed' ? 'Falhas' : name
                  ]}
                  labelStyle={{ fontWeight: 'bold', color: '#A88B4B', marginBottom: '4px' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  formatter={(value) => value === 'success' ? 'Sucesso' : 'Falhas'}
                />
                <Bar dataKey="success" name="success" fill="#A88B4B" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="failed" name="failed" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed Table per Entity */}
      <div className="bg-[#15181E] border border-[#1F2229] rounded-xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#1F2229] flex items-center justify-between">
          <h3 className="font-bold text-white text-sm tracking-wide uppercase flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#A88B4B]" />
            <span>Detalhamento por Conta/Canal</span>
          </h3>
          <span className="text-xs text-gray-400">{chipAnalyticsData.length} canais ativos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0A0C10] text-gray-400 border-b border-[#1F2229] uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Canal / Identificador</th>
                <th className="py-3 px-4 text-center">Total Envios</th>
                <th className="py-3 px-4 text-center">Sucesso</th>
                <th className="py-3 px-4 text-center">Falhas</th>
                <th className="py-3 px-4 text-right">Taxa de Sucesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2229] text-gray-300">
              {chipAnalyticsData.map((chip) => {
                const isBest = bestChip && bestChip.chipId === chip.chipId && chip.total > 0;
                return (
                  <tr key={chip.chipId} className="hover:bg-[#1A1D23] transition-colors">
                    <td className="py-3.5 px-4 font-medium flex items-center space-x-2">
                      <span className="text-base">📱</span>
                      <span className="text-white font-bold">{chip.name}</span>
                      {isBest && (
                        <span className="bg-[#A88B4B]/20 text-[#A88B4B] border border-[#A88B4B]/40 text-[9px] uppercase px-1.5 py-0.5 rounded font-bold">
                          🥇 Melhor Desempenho
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-200">{chip.total}</td>
                    <td className="py-3.5 px-4 text-center text-emerald-400 font-semibold">{chip.success}</td>
                    <td className="py-3.5 px-4 text-center text-rose-400 font-semibold">{chip.failed}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center space-x-2">
                        <div className="w-20 bg-[#0A0C10] rounded-full h-2 overflow-hidden border border-[#1F2229]">
                          <div 
                            className={`h-full ${chip.successRate >= 80 ? 'bg-emerald-500' : chip.successRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${chip.successRate}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-white w-12 text-right">{chip.successRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
