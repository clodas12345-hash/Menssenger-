const fs = require('fs');
const path = 'src/components/SettingsModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Update imports
if(!code.includes("DispatchLogItem")) {
  code = code.replace(
    "import { AppSettings, WhatsAppChip } from '../types';",
    "import { AppSettings, WhatsAppChip, DispatchLogItem } from '../types';"
  );
}

if(!code.includes("AlertTriangle")) {
  code = code.replace(
    "import { Settings, X, Check, Globe, Volume2, ShieldCheck, Link2, Smartphone, Plus, Trash2, MessageCircle, Save } from 'lucide-react';",
    "import { Settings, X, Check, Globe, Volume2, ShieldCheck, Link2, Smartphone, Plus, Trash2, MessageCircle, Save, AlertTriangle, Lock, Unlock, ShieldAlert } from 'lucide-react';"
  );
}

// 2. Update interface
code = code.replace(
  "interface SettingsModalProps {",
  `interface SettingsModalProps {
  logs?: DispatchLogItem[];
  onReportBlocked24h?: () => void;
  onUnblockWhatsApp?: () => void;`
);

// 3. Update component props
code = code.replace(
  "  onOpenSaveAndReset,\n}) => {",
  "  onOpenSaveAndReset,\n  logs = [],\n  onReportBlocked24h,\n  onUnblockWhatsApp,\n}) => {"
);

// 4. Add logic for 24h limits inside the component
const logicString = `
  const activeChip = settings.chips?.find(c => c.id === activeChipId);
  const maxLimit = activeChip?.dailyLimit || settings.maxMessagesPer24Hours || 100;
  
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
`;

code = code.replace(
  "  const [newChipName, setNewChipName] = useState<string>('');",
  "  const [newChipName, setNewChipName] = useState<string>('');\n" + logicString
);

// 5. Replace the "Limitador de Mensagens" section with the new widget content inside the modal.
// We will replace this specific block:
const limitadorRegex = /<div>\s*<label className="block text-\[10px\] font-semibold text-gray-400 uppercase tracking-widest mb-1">\s*Limitador de Mensagens \(Dentro de 24 Horas\)[\s\S]*?<\/div>/m;

const limitadorNewUI = `
          {/* LIMITADOR E GESTÃO (24H) - Integrated Widget */}
          <div className={\`border rounded-xl p-4 transition-all shadow-md \${
            isBlocked24h
              ? 'bg-red-950/40 border-red-600/60'
              : isLimitReached
               ? 'bg-red-950/20 border-red-500/40'
               : 'bg-[#0A0C10] border-[#1F2229]'
          }\`}>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={\`p-2.5 rounded-lg shrink-0 \${
                  isBlocked24h ? 'bg-red-500/30 text-red-300' : isLimitReached ? 'bg-red-500/20 text-red-400' : 'bg-[#A88B4B]/10 text-[#A88B4B]'
                }\`}>
                  {isBlocked24h ? <ShieldAlert className="w-5 h-5" /> : isLimitReached ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Limitador e Gestão (24h)
                  </h4>
                  <span className={\`inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase \${
                    isBlocked24h ? 'bg-red-600 text-white' : isLimitReached ? 'bg-red-500 text-white animate-pulse' : 'bg-[#A88B4B] text-[#0A0C10]'
                  }\`}>
                    {isBlocked24h ? '🚫 Bloqueado 24h' : isLimitReached ? 'Limite Atingido!' : \`\${remaining} restantes\`}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 mb-4">
              {isBlocked24h
                ? \`🚫 A rotina de disparos está pausada por 24 horas para proteção do chip. Libera em \${blockedDateStr} às \${blockedTimeStr}.\`
                : isLimitReached
                 ? \`⚠️ Você atingiu o limite de \${maxLimit} mensagens nas últimas 24 horas. Para evitar bloqueios no WhatsApp, os envios estão pausados.\`
                 : \`Você já enviou \${sentLast24H} de \${maxLimit} mensagens permitidas nas últimas 24h.\`}
            </div>

            <div className="flex flex-col gap-3">
              {isBlocked24h && onUnblockWhatsApp && (
                <button
                  type="button"
                  onClick={onUnblockWhatsApp}
                  className="w-full bg-red-950 hover:bg-red-900 text-white font-bold py-2.5 rounded border border-red-500 text-xs transition-all flex items-center justify-center space-x-2"
                >
                  <Unlock className="w-4 h-4 text-emerald-400" />
                  <span>Desbloquear Manualmente Agora</span>
                </button>
              )}

              {onReportBlocked24h && !isBlocked24h && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Marcar que seu WhatsApp foi bloqueado? O sistema pausará todos os envios por 24 horas.')) {
                      onReportBlocked24h();
                    }
                  }}
                  className="w-full bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/80 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-md"
                >
                  <Lock className="w-4 h-4 text-red-400" />
                  <span>Fui Bloqueado (Pausar Envios 24h)</span>
                </button>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                  Limite de Envios a cada 24 horas
                </label>
                <select
                  value={maxMessagesPer24Hours}
                  onChange={(e) => setMaxMessagesPer24Hours(Number(e.target.value))}
                  className="w-full bg-[#15181E] border border-[#2A2D35] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B] font-mono font-bold"
                >
                  <option value={50}>50 mensagens dentro de 24 horas</option>
                  <option value={60}>60 mensagens dentro de 24 horas</option>
                  <option value={70}>70 mensagens dentro de 24 horas</option>
                  <option value={80}>80 mensagens dentro de 24 horas</option>
                  <option value={90}>90 mensagens dentro de 24 horas</option>
                  <option value={100}>100 mensagens dentro de 24 horas</option>
                  <option value={120}>120 mensagens dentro de 24 horas</option>
                  <option value={150}>150 mensagens dentro de 24 horas</option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  O sistema pausará os disparos automaticamente se este limite for atingido.
                </p>
              </div>
            </div>
          </div>
`;

if (limitadorRegex.test(code)) {
  code = code.replace(limitadorRegex, limitadorNewUI);
  console.log("Successfully replaced limitador in SettingsModal.");
} else {
  console.log("Failed to find limitador block.");
}

fs.writeFileSync(path, code);
