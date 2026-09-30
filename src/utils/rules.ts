import { Contact, DispatchLogItem, AppSettings } from '../types';
import { getTodayDateString } from './storage';

export interface SendingRuleCheckResult {
  allowed: boolean;
  blockedReason?: string;
  message?: string;
  requiresConfirmation?: boolean;
  confirmationType?: 'sunday' | 'double_message' | 'both';
}

export function checkSendingRules(
  contact: Contact,
  logs: DispatchLogItem[],
  settings: AppSettings,
  chipId?: string
): SendingRuleCheckResult {
  if (settings.enableSendingRules === false) {
    return { allowed: true };
  }

  const now = new Date();
  const currentHour = now.getHours();
  const isSunday = now.getDay() === 0;

  const ruleNighttimeActive = settings.ruleNighttime ?? true;
  const ruleDailyLimitActive = settings.ruleDailyLimit ?? true;
  const ruleSundayActive = settings.ruleSundayAlert ?? true;
  const ruleDoubleMsgActive = settings.ruleDoubleMessage ?? true;

  // 1. Nighttime restriction: 21h to 06h
  if (ruleNighttimeActive && (currentHour >= 21 || currentHour < 6)) {
    return {
      allowed: false,
      blockedReason: 'night_time',
      message: '⚠️ Regra de Envio Ativa (21h às 06h):\nNão é permitido enviar mensagens das 21h até às 6h da manhã.'
    };
  }

  // 2. Daily volume limit
  let chipObj = chipId && settings.chips ? settings.chips.find(c => c.id === chipId) : undefined;
  if (!chipObj && settings.activeChipId && settings.chips) {
    chipObj = settings.chips.find(c => c.id === settings.activeChipId);
  }
  
  const maxLimit = chipObj?.dailyLimit || settings.maxMessagesPer24Hours || 50;
  
  const nowMs = Date.now();
  const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000;

  const sentLast24H = logs.filter((l) => {
    if (l.status !== 'enviado' || !l.sentAt) return false;
    // se temos chip, filtra as mensagens por ele
    if (chipObj && l.chipId && l.chipId !== chipObj.id) return false;
    const sentTime = new Date(l.sentAt).getTime();
    return !isNaN(sentTime) && sentTime >= twentyFourHoursAgoMs;
  }).length;

  if (ruleDailyLimitActive && sentLast24H >= maxLimit) {
    return {
      allowed: false,
      blockedReason: 'daily_limit',
      message: `⚠️ Regra de Envio Ativa (Limite das Últimas 24h Corridas):\nVocê atingiu o limite de ${sentLast24H}/${maxLimit} mensagens enviadas nas últimas 24h corridas.`
    };
  }

  // 3. Double messaging check & Sunday check
  const todayStr = getTodayDateString();
  const alreadySentToday = contact.lastContactedDate === todayStr || logs.some(l => {
    if (l.contactId !== contact.id || l.status !== 'enviado' || !l.sentAt) return false;
    const lDate = getTodayDateString(new Date(l.sentAt));
    return lDate === todayStr;
  });

  const checkSunday = ruleSundayActive && isSunday;
  const checkDouble = ruleDoubleMsgActive && alreadySentToday;

  if (checkSunday && checkDouble) {
    return {
      allowed: true,
      requiresConfirmation: true,
      confirmationType: 'both',
      message: '⚠️ Regras de Envio Ativas (Domingo & Dupla Mensagem):\n1. Hoje é domingo! Deseja realmente enviar a mensagem no domingo?\n2. Já foi enviada uma mensagem para esta pessoa hoje!\n\nDeseja realmente prosseguir com o envio?'
    };
  }

  if (checkSunday) {
    return {
      allowed: true,
      requiresConfirmation: true,
      confirmationType: 'sunday',
      message: '⚠️ Regra de Envio Ativa (Alerta de Domingo):\nHoje é domingo! Deseja realmente enviar a mensagem hoje?'
    };
  }

  if (checkDouble) {
    return {
      allowed: true,
      requiresConfirmation: true,
      confirmationType: 'double_message',
      message: '⚠️ Regra de Envio Ativa (Segunda Mensagem do Dia):\nJá foi enviada uma mensagem para esta pessoa hoje. Deseja prosseguir?'
    };
  }

  return { allowed: true };
}

export function isContactSkipped(contact: Contact, logs: DispatchLogItem[]): boolean {
  if (!logs || logs.length === 0) return false;
  
  const contactLogs = logs.filter(
    (l) => l.contactId === contact.id || l.phone === contact.phone
  );
  if (contactLogs.length === 0) return false;

  const latestLog = contactLogs.reduce((latest, current) => {
    const getTime = (log: DispatchLogItem) => {
      if (log.sentAt) return new Date(log.sentAt).getTime();
      const match = log.id.match(/log_(\d+)/);
      if (match) return parseInt(match[1]);
      return 0;
    };
    return getTime(current) > getTime(latest) ? current : latest;
  }, contactLogs[0]);

  return latestLog.status === 'pulado';
}

export function isNotSentInLastThreeDays(contact: Contact, logs: DispatchLogItem[]): boolean {
  if (!logs || logs.length === 0) return true; // Never sent anything, so definitely true

  const contactLogs = logs.filter(
    (l) => l.status === 'enviado' && l.sentAt && (l.contactId === contact.id || l.phone === contact.phone)
  );
  if (contactLogs.length === 0) return true; // No successful 'enviado' log, so true

  const latestLog = contactLogs.reduce((latest, current) => {
    const timeCurrent = current.sentAt ? new Date(current.sentAt).getTime() : 0;
    const timeLatest = latest.sentAt ? new Date(latest.sentAt).getTime() : 0;
    return timeCurrent > timeLatest ? current : latest;
  }, contactLogs[0]);

  if (!latestLog.sentAt) return true;

  const sentDate = new Date(latestLog.sentAt);
  const now = new Date();

  const startOfSent = new Date(sentDate.getFullYear(), sentDate.getMonth(), sentDate.getDate());
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = startOfNow.getTime() - startOfSent.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 3;
}

export function getRegisteredChipForGroup(groupName: string, contacts: Contact[]): string {
  if (!groupName || groupName === 'all') return 'all';

  const cleanForMatch = (s: string) => s.toLowerCase().replace(/[\-\s\/]/g, '').trim();
  const targetClean = cleanForMatch(groupName);
  
  // 1. Filter contacts matching this group
  const groupContacts = contacts.filter((c) => {
    const grp = c.group || '';
    if (targetClean === 'semcampanha') {
      const gLower = grp.toLowerCase();
      return gLower.includes('sem campanha') || gLower.includes('agenda de contatos') || !grp;
    }
    return cleanForMatch(grp) === targetClean || (targetClean === 'agendadecontatos' && (!grp || grp === 'agenda de contatos'));
  });

  // 2. Count chip occurrences among these contacts
  const chipCounts: Record<string, number> = {};
  groupContacts.forEach((c) => {
    if (c.chipId) {
      chipCounts[c.chipId] = (chipCounts[c.chipId] || 0) + 1;
    }
  });

  let dominantChipId = '';
  let maxCount = 0;
  Object.entries(chipCounts).forEach(([cId, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantChipId = cId;
    }
  });

  if (dominantChipId) {
    return dominantChipId;
  }

  // Fallback: Check standard naming patterns in the group name
  const gUpper = groupName.toUpperCase().replace(/[\-\s\/]/g, '');
  
  // Specific check for CG-10/150 to avoid confusion with CG-05/50 if needed
  if (gUpper === 'CG10150' || gUpper === 'CG10') {
    return 'chip_1'; // Business
  }
  if (gUpper === 'CG0550' || gUpper === 'CG05') {
    return 'chip_2'; // Suporte
  }

  if (gUpper.includes('SUPORTE') || gUpper.includes('SUPPORT') || gUpper.includes('CG05')) {
    return 'chip_2'; // Suporte
  }
  if (gUpper.includes('BUSINESS') || gUpper.includes('PRINCIPAL') || gUpper.includes('CG10')) {
    return 'chip_1'; // Business
  }

  return 'all';
}



