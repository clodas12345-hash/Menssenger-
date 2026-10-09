import { Contact } from '../types';
import { formatPhoneDisplay } from './vcfParser';
import { getSettings, getDispatchLogs } from './storage';
import { detectGenderFromName, adaptApproachForGender, extractCleanFirstName, extractCleanFullName, isGenericOrInvalidName } from './gender';

export { formatPhoneDisplay, detectGenderFromName, adaptApproachForGender, extractCleanFirstName, extractCleanFullName, isGenericOrInvalidName };

export function getTimeBasedGreeting(dateObj: Date = new Date()): string {
  const hour = dateObj.getHours();
  if (hour >= 6 && hour < 12) {
    return 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

// Helper functions for message count tracking (combines localStorage counter + dispatch history logs)
export function getMessageCount(contactId: string, phone?: string): number {
  const rawStored = contactId ? localStorage.getItem(`sentCount_${contactId}`) : null;
  const storedCount = rawStored ? parseInt(rawStored, 10) || 0 : 0;

  let logsSentCount = 0;
  try {
    const logs = getDispatchLogs();
    if (logs && logs.length > 0) {
      logsSentCount = logs.filter(
        (l) =>
          l.status === 'enviado' &&
          ((contactId && l.contactId === contactId) || (phone && l.phone === phone))
      ).length;
    }
  } catch {
    // ignore storage read error
  }

  return Math.max(storedCount, logsSentCount);
}

export function incrementMessageCount(contactId: string): void {
  const count = getMessageCount(contactId);
  localStorage.setItem(`sentCount_${contactId}`, (count + 1).toString());
}

export function replaceTemplateVariables(
  templateText: string,
  contact: Partial<Contact>,
  targetDate: Date = new Date(),
  customMentorName?: string
): string {
  if (!templateText) return '';

  const rawName = contact.name?.trim() || '';
  const cleanFirstName = extractCleanFirstName(rawName);
  const cleanFullName = extractCleanFullName(rawName) || cleanFirstName;

  // Regra 1ª, 3ª, 5ª... mensagem (count = 0, 2, 4... antes do envio -> ímpar): chama por Nome e Sobrenome (cleanFullName)
  // Regra 2ª, 4ª, 6ª... mensagem (count = 1, 3, 5... antes do envio -> par): chama apenas pelo Primeiro Nome (cleanFirstName)
  const count = getMessageCount(contact.id || '', contact.phone);
  const isOddSendOrder = count % 2 === 0;
  const firstNameToUse = isOddSendOrder
    ? (cleanFullName || cleanFirstName)
    : (cleanFirstName || cleanFullName);
  const fullNameToUse = cleanFullName || cleanFirstName;

  const company = contact.company?.trim() || 'sua empresa';
  const greeting = getTimeBasedGreeting(targetDate);
  const formattedDate = targetDate.toLocaleDateString('pt-BR');
  const formattedTime = targetDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Intelligent gender identification (checks contact.gender or auto-detects from name)
  const gender = contact.gender || detectGenderFromName(rawName);
  const tratarGenero = gender === 'mulher' ? 'amiga' : 'amigo';
  const parceiroGenero = gender === 'mulher' ? 'parceira' : 'parceiro';
  const bemVindoGenero = gender === 'mulher' ? 'bem-vinda' : 'bem-vindo';
  const preparadoGenero = gender === 'mulher' ? 'preparada' : 'preparado';
  const prontoGenero = gender === 'mulher' ? 'pronta' : 'pronto';
  const artigoGenero = gender === 'mulher' ? 'a' : 'o';

  const tratarVeiculo = 'veículo';

  let mentorName = customMentorName || 'Cláudio';
  if (!customMentorName) {
    try {
      const settings = getSettings();
      if (settings && settings.mentorName) {
        mentorName = settings.mentorName;
      }
    } catch (e) {
      console.warn('Could not load settings in replaceTemplateVariables', e);
    }
  }

  let processed = templateText;

  // Fix legacy templates where greeting was placed at the bottom instead of the top
  const bottomGreetingRegex = /^([\s\S]+?)\n+\s*(\{saudacao\}|\{saudação\}|Bom dia|Boa tarde|Boa noite),\s*(\{primeiro_nome\}|\{nome\}|\[Nome\])!\s*(Se precisar de suporte[^\n]*)$/i;
  const bottomMatch = processed.match(bottomGreetingRegex);
  if (bottomMatch) {
    const mainBody = bottomMatch[1].replace(/^🚀\s*/, '').trim();
    const greetToken = bottomMatch[2];
    const nameToken = bottomMatch[3];
    const closingText = bottomMatch[4].trim();
    processed = `${greetToken}, ${nameToken}! 🚀\n\n${mainBody}\n\n${closingText}`;
  }

  // 1. Replace Full Name variables: {{nome_completo}}, {nome_completo}, [nome_completo], [Nome Completo], {full_name}, etc.
  const fullNamePattern = /\{\{\s*(nome_completo|nomecompleto|full_name|fullname)\s*\}\}|\{\s*(nome_completo|nomecompleto|full_name|fullname)\s*\}|\[\s*(nome_completo|nomecompleto|nome\s+completo|full_name|fullname)\s*\]|<\s*(nome_completo|nomecompleto|full_name|fullname)\s*>|%\s*(nome_completo|nomecompleto|full_name|fullname)\s*%/gi;
  processed = processed.replace(fullNamePattern, fullNameToUse);

  // 2. Replace First Name / Name variables: {{nome}}, {nome}, {{primeiro_nome}}, {primeiro_nome}, [nome], [Nome], [primeiro_nome], [Primeiro Nome], [Nome do Contato], [Nome do Motorista], {name}, {{name}}, {first_name}, etc.
  const firstNamePattern = /\{\{\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*\}\}|\{\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*\}|\[\s*(primeiro_nome|primeironome|primeiro\s+nome|nome|name|first_name|firstname|nome\s+do\s+contato|nome\s+do\s+motorista|contato|motorista)\s*\]|<\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*>|%\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*%/gi;
  processed = processed.replace(firstNamePattern, firstNameToUse);

  // 3. Replace Phone: {{telefone}}, {telefone}, [telefone], {phone}
  const phonePattern = /\{\{\s*(telefone|phone)\s*\}\}|\{\s*(telefone|phone)\s*\}|\[\s*(telefone|phone)\s*\]/gi;
  processed = processed.replace(phonePattern, contact.phone || '');

  // 4. Replace Company: {{empresa}}, {empresa}, [empresa]
  const companyPattern = /\{\{\s*empresa\s*\}\}|\{\s*empresa\s*\}|\[\s*empresa\s*\]/gi;
  processed = processed.replace(companyPattern, company);

  // 5. Replace Greeting: {{saudacao}}, {saudacao}, [saudacao], {saudação}, [Saudação], [Saudação do Horário], etc.
  const greetingPattern = /\{\{\s*sauda[çc][ãa]o(?:_horario)?\s*\}\}|\{\s*sauda[çc][ãa]o(?:_horario)?\s*\}|\[\s*sauda[çc][ãa]o(?:\s+do\s+hor[áa]rio)?\s*\]|<\s*sauda[çc][ãa]o(?:_horario)?\s*>|%\s*sauda[çc][ãa]o(?:_horario)?\s*%/gi;
  processed = processed.replace(greetingPattern, greeting);

  // 6. Replace Date, Time, Email, Group, Gender, Mentor, Vehicle
  processed = processed
    .replace(/\{\{\s*data\s*\}\}|\{\s*data\s*\}|\[\s*data\s*\]/gi, formattedDate)
    .replace(/\{\{\s*horario\s*\}\}|\{\s*horario\s*\}|\[\s*horario\s*\]/gi, formattedTime)
    .replace(/\{\{\s*email\s*\}\}|\{\s*email\s*\}|\[\s*email\s*\]/gi, contact.email || '')
    .replace(/\{\{\s*grupo\s*\}\}|\{\s*grupo\s*\}|\[\s*grupo\s*\]/gi, contact.group || 'Geral')
    .replace(/\{\{\s*genero\s*\}\}|\{\s*genero\s*\}|\[\s*genero\s*\]/gi, gender)
    .replace(/\{\{\s*tratar_genero\s*\}\}|\{\s*tratar_genero\s*\}|\[\s*tratar_genero\s*\]/gi, tratarGenero)
    .replace(/\{\{\s*parceiro_genero\s*\}\}|\{\s*parceiro_genero\s*\}|\[\s*parceiro_genero\s*\]/gi, parceiroGenero)
    .replace(/\{\{\s*bem_vindo\s*\}\}|\{\s*bem_vindo\s*\}|\[\s*bem_vindo\s*\]/gi, bemVindoGenero)
    .replace(/\{\{\s*preparado\s*\}\}|\{\s*preparado\s*\}|\[\s*preparado\s*\]/gi, preparadoGenero)
    .replace(/\{\{\s*pronto\s*\}\}|\{\s*pronto\s*\}|\[\s*pronto\s*\]/gi, prontoGenero)
    .replace(/\{\{\s*artigo_genero\s*\}\}|\{\s*artigo_genero\s*\}|\[\s*artigo_genero\s*\]/gi, artigoGenero)
    .replace(/\{\{\s*camarada\s*\}\}|\{\s*camarada\s*\}|\[\s*camarada\s*\]/gi, tratarGenero)
    .replace(/\{\{\s*veiculo\s*\}\}|\{\s*veiculo\s*\}|\[\s*veiculo\s*\]/gi, 'carro')
    .replace(/\{\{\s*tratar_veiculo\s*\}\}|\{\s*tratar_veiculo\s*\}|\[\s*tratar_veiculo\s*\]/gi, tratarVeiculo)
    .replace(/\[\s*Nome do Anjo\s*\]|\{\{\s*nome_do_anjo\s*\}\}|\{\s*nome_do_anjo\s*\}|\[\s*Nome do Mentor\s*\]|\{\{\s*nome_do_mentor\s*\}\}|\{\s*nome_do_mentor\s*\}|\[\s*Mentor\s*\]|\{\{\s*mentor\s*\}\}|\{\s*mentor\s*\}|\[\s*Anjo\s*\]|\{\{\s*anjo\s*\}\}|\{\s*anjo\s*\}/gi, mentorName);

  // Dynamic custom fields replacement (e.g. {{taxa}}, {taxa}, [taxa], {{valor}}, etc.)
  if (contact.customFields) {
    Object.entries(contact.customFields).forEach(([key, val]) => {
      const sanitizedKey = key.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const regexCustom = new RegExp(`\\{\\{\\s*(${key}|${sanitizedKey})\\s*\\}\\}|\\{\\s*(${key}|${sanitizedKey})\\s*\\\}|\\[\\s*(${key}|${sanitizedKey})\\s*\\]`, 'gi');
      processed = processed.replace(regexCustom, String(val));
    });
  }

  if (contact.categoryDetails) {
    if (contact.categoryDetails.rate) {
      processed = processed.replace(/\{\{\s*taxa\s*\}\}|\{\s*taxa\s*\}|\[\s*taxa\s*\]/gi, contact.categoryDetails.rate);
    }
    if (contact.categoryDetails.correctionValue) {
      processed = processed.replace(/\{\{\s*valor_correcao\s*\}\}|\{\s*valor_correcao\s*\}|\[\s*valor_correcao\s*\]|\{\{\s*valor\s*\}\}|\{\s*valor\s*\}|\[\s*valor\s*\]/gi, contact.categoryDetails.correctionValue);
    }
    if (contact.categoryDetails.bonusAmount) {
      processed = processed.replace(/\{\{\s*bonus\s*\}\}|\{\s*bonus\s*\}|\[\s*bonus\s*\]|\{\{\s*valor_bonus\s*\}\}|\{\s*valor_bonus\s*\}|\[\s*valor_bonus\s*\]/gi, contact.categoryDetails.bonusAmount);
    }
    if (contact.categoryDetails.targetTrips) {
      processed = processed.replace(/\{\{\s*meta\s*\}\}|\{\s*meta\s*\}|\[\s*meta\s*\]|\{\{\s*corridas\s*\}\}|\{\s*corridas\s*\}|\[\s*corridas\s*\]/gi, contact.categoryDetails.targetTrips);
    }
  }

  // Enforce 1st person singular (since user works alone) & fix awkward auto-replacements
  processed = processed
    .replace(/\bConte com (o )?nosso time\b/gi, 'Pode contar comigo')
    .replace(/\bconte com (o )?nosso time\b/gi, 'pode contar comigo')
    .replace(/\bnosso time\b/gi, 'eu')
    .replace(/\bnossa equipe\b/gi, 'eu')
    .replace(/\bConte conosco\b/g, 'Pode contar comigo')
    .replace(/\bconte conosco\b/gi, 'pode contar comigo')
    .replace(/\bEstamos (100% )?à disposição\b/g, 'Estou $1à disposição')
    .replace(/\bestamos (100% )?à disposição\b/gi, 'estou $1à disposição')
    .replace(/\bGostaríamos de compartilhar\b/g, 'Gostaria de compartilhar')
    .replace(/\bgostaríamos de compartilhar\b/gi, 'gostaria de compartilhar')
    .replace(/\bseparamos para você\b/gi, 'está disponível para você')
    .replace(/\bSepamos para você\b/gi, 'Está disponível para você')
    .replace(/\bviagens realizadas\s+(nas?\s+próximas?)/gi, 'corridas $1');

  // Auto-correct weekdays based on targetDate
  const todayIndex = targetDate.getDay();
  const daysPt = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sábado'];
  const daysFullPt = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const allDaysPt = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const todayNamePt = allDaysPt[todayIndex];
  const todayFullPt = daysFullPt[todayIndex];

  for (let i = 0; i < 7; i++) {
    if (i === todayIndex) continue;
    const otherDay = allDaysPt[i];
    const otherDayFull = daysFullPt[i];
    
    const regexFull = new RegExp(otherDayFull, 'gi');
    const regexShort = new RegExp(otherDay, 'gi');
    
    if (processed.toLowerCase().includes(otherDay)) {
      processed = processed
        .replace(regexFull, todayFullPt)
        .replace(regexShort, todayNamePt);
    }
  }

  if (todayIndex > 1 && todayIndex < 5) {
    processed = processed
      .replace(/monday/gi, todayFullPt)
      .replace(/início de semana|início da semana|nova semana/gi, 'meio de semana');
  }

  // Cleanup awkward punctuation and spacing if name was empty/removed
  if (!firstNameToUse) {
    processed = processed
      .replace(/,\s*([!?.])/g, '$1')
      .replace(/\b(Olá|Oi|Fala)\s*,\s*,\s*/gi, '$1, ')
      .replace(/\b(Olá|Oi|Fala)\s*,\s*([!?.])/gi, '$1$2')
      .replace(/\b(Olá|Oi|Fala)\s*,\s*/gi, '$1, ')
      .replace(/,\s*,/g, ',')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([!?,.])/g, '$1');
  }

  // Soften and adapt approach based on identified gender (e.g. changing rough slang like "cara" to gentle tone for women)
  processed = adaptApproachForGender(processed, gender, firstNameToUse);

  return processed.trim();
}

export function buildWhatsAppLink(
  phone: string,
  messageText: string,
  mode: 'whatsapp_desktop' | 'webhook' | string = 'whatsapp_desktop'
): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(messageText);

  if (mode === 'webhook') {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
  }

  if (cleanPhone) {
    return `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`;
  }
  return `whatsapp://send?text=${encodedMsg}`;
}

export function openWhatsAppLink(url: string): void {
  try {
    localStorage.setItem('gkd_last_whatsapp_url', url);
    if (url.startsWith('whatsapp://')) {
      const a = document.createElement('a');
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) {
        try {
          win.focus();
        } catch (e) {
          console.warn('Child window.focus() failed:', e);
        }
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  } catch (err) {
    console.error('Failed to open WhatsApp link:', err);
    try {
      window.location.href = url;
    } catch (e) {
      console.error('Fallback location setting failed:', e);
    }
  }
}

export function safeConfirm(_message?: string): boolean {
  // Always return true to avoid window.confirm blocking/cancellation in iframe and web environments
  return true;
}

export function cleanChipName(name?: string): string {
  if (!name) return 'Business';
  
  let cleaned = name
    .replace(/whatsapp\s*/gi, '')
    .replace(/whats\s*/gi, '')
    .replace(/\s*chip\s*/gi, '')
    .replace(/\s*\(\+?[\d\s-]+\)/g, '')
    .replace(/\s*\+?\d{8,}/g, '')
    .trim();

  const lower = cleaned.toLowerCase();
  const isUpper = name.length > 3 && name === name.toUpperCase();
  
  if (lower.includes('business') || lower.includes('principal') || lower === '1' || lower === 'padrão' || lower === 'padrao') {
    return isUpper ? 'BUSINESS' : 'Business';
  }
  if (lower.includes('suporte') || lower.includes('support') || lower.includes('pessoal') || lower === '2') {
    return isUpper ? 'SUPORTE' : 'Suporte';
  }

  return cleaned || 'Business';
}

export interface ChipReleaseTimes {
  nextDecreaseTime: Date | null;
  canSendTime: Date | null;
  count: number;
}

export function formatReleaseTime(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const isToday = date.getDate() === now.getDate() &&
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear();
  
  const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).getDate() === date.getDate() &&
                     date.getMonth() === now.getMonth() &&
                     date.getFullYear() === now.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) {
    return `hoje às ${timeStr}`;
  } else if (isTomorrow) {
    return `amanhã às ${timeStr}`;
  } else {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month} às ${timeStr}`;
  }
}

export function calculateChipReleaseTimes(
  logs: any[],
  chipId: string,
  chipCleanName: string,
  limit: number,
  lastResetAt?: string
): ChipReleaseTimes {
  const nowMs = Date.now();
  const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000;
  const resetTimestampMs = lastResetAt ? new Date(lastResetAt).getTime() : 0;

  // Filter logs for this chip in the last 24 hours first, then map and sort only the relevant ones
  const cleanTargetName = (chipCleanName || '').toLowerCase();
  
  // Optimization: Iterate backwards as logs are generally chronological
  const filteredTimestamps: number[] = [];
  const limitPlusBuffer = 24 * 60 * 60 * 1000 + 3600000; // 24h + 1h buffer

  for (let i = logs.length - 1; i >= 0; i--) {
    const l = logs[i];
    if (l.status !== 'enviado' || !l.sentAt) continue;
    
    // Quick chip check before expensive date parsing
    let isTargetChip = false;
    if (l.chipId === chipId) isTargetChip = true;
    else if (cleanTargetName && l.chipName && cleanChipName(l.chipName).toLowerCase() === cleanTargetName) isTargetChip = true;
    else if (!l.chipId && !l.chipName && (chipId === 'chip_1' || cleanTargetName.includes('business'))) isTargetChip = true;
    
    if (!isTargetChip) continue;

    const timestamp = new Date(l.sentAt).getTime();
    
    if (timestamp < twentyFourHoursAgoMs) continue;
    
    // CRITICAL: Ignore logs sent before the last manual reset
    if (timestamp < resetTimestampMs) continue;
    
    filteredTimestamps.push(timestamp);
  }

  // Sort by timestamp ascending (oldest first)
  filteredTimestamps.sort((a, b) => a - b);

  const count = filteredTimestamps.length;
  if (count === 0) {
    return { nextDecreaseTime: null, canSendTime: null, count: 0 };
  }

  // Next decrease is when the first (oldest) message falls out of the 24-hour window
  const oldestTimestamp = filteredTimestamps[0];
  const nextDecreaseTime = oldestTimestamp ? new Date(oldestTimestamp + 24 * 60 * 60 * 1000) : null;

  // Time we can send is when the count drops below limit (i.e. to limit - 1)
  let canSendTime: Date | null = null;
  if (count >= limit) {
    const requiredFallouts = count - limit + 1;
    const targetTimestamp = filteredTimestamps[requiredFallouts - 1];
    if (targetTimestamp) {
      canSendTime = new Date(targetTimestamp + 24 * 60 * 60 * 1000);
    }
  }

  return {
    nextDecreaseTime,
    canSendTime,
    count
  };
}

/**
 * Removes diacritics/accents, converts to lowercase and trims whitespace.
 * Essential for robust search across Portuguese names and terms (e.g. João -> joao).
 */
export function normalizeSearchText(text?: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Intelligent phone number matching that handles:
 * - Direct formatted strings (e.g. "+55 (11) 98765-4321")
 * - Unformatted raw digits (e.g. "11987654321")
 * - Country code differences (with or without 55 / +55)
 * - Local number searches (with or without DDD, 8 or 9 digits, BR 9th digit flexibility)
 * - Leading zero / carrier codes (e.g. 011, 01511)
 * - Suffix matching (e.g. last 4 to 8 digits)
 */
export function matchPhoneNumber(contactPhone?: string, searchTerm?: string): boolean {
  if (!contactPhone || !searchTerm) return false;
  
  const rawContact = contactPhone.trim();
  const rawTerm = searchTerm.trim();
  if (!rawTerm) return false;

  // Direct case-insensitive string inclusion (formatted)
  if (rawContact.toLowerCase().includes(rawTerm.toLowerCase()) || rawTerm.toLowerCase().includes(rawContact.toLowerCase())) {
    return true;
  }

  // Pure digits comparison
  const digitsContact = rawContact.replace(/\D/g, '');
  const digitsTerm = rawTerm.replace(/\D/g, '');

  if (!digitsTerm) return false;

  // Direct digits inclusion
  if (digitsContact.includes(digitsTerm) || digitsTerm.includes(digitsContact)) {
    return true;
  }

  // Strip country code 55 if present
  const contactNo55 = digitsContact.startsWith('55') && digitsContact.length >= 10 ? digitsContact.slice(2) : digitsContact;
  const termNo55 = digitsTerm.startsWith('55') && digitsTerm.length >= 10 ? digitsTerm.slice(2) : digitsTerm;

  if (contactNo55.includes(termNo55) || termNo55.includes(contactNo55)) return true;
  if (digitsContact.includes(termNo55) || termNo55.includes(digitsContact)) return true;
  if (contactNo55.includes(digitsTerm) || digitsTerm.includes(contactNo55)) return true;

  // Strip leading zeros or carrier codes (e.g. 011 -> 11, 01511 -> 11)
  const contactClean = contactNo55.replace(/^0+/, '');
  const termClean = termNo55.replace(/^0+/, '');

  if (contactClean.includes(termClean) || termClean.includes(contactClean)) return true;

  // Generate 8-digit and 9-digit variations for Brazilian numbers
  const getVariants = (digits: string): string[] => {
    const variants = new Set<string>();
    if (!digits) return [];
    variants.add(digits);

    // If 11 digits: DDD(2) + 9 + 8 digits (e.g. 11 9 8765 4321)
    if (digits.length === 11) {
      const ddd = digits.slice(0, 2);
      const nine = digits.slice(2, 3);
      const eight = digits.slice(3);
      variants.add(ddd + eight); // 10 digits (without 9)
      variants.add(digits.slice(2)); // 9 digits local
      variants.add(eight); // 8 digits local
    }
    // If 10 digits: DDD(2) + 8 digits (e.g. 11 8765 4321)
    else if (digits.length === 10) {
      const ddd = digits.slice(0, 2);
      const eight = digits.slice(2);
      variants.add(ddd + '9' + eight); // 11 digits (with 9)
      variants.add('9' + eight); // 9 digits local
      variants.add(eight); // 8 digits local
    }
    // If 9 digits: 9 + 8 digits
    else if (digits.length === 9) {
      variants.add(digits.slice(1)); // 8 digits without 9
    }
    // If 8 digits:
    else if (digits.length === 8) {
      variants.add('9' + digits); // 9 digits with 9
    }

    return Array.from(variants);
  };

  const contactVariants = getVariants(contactClean);
  const termVariants = getVariants(termClean);

  for (const cVar of contactVariants) {
    for (const tVar of termVariants) {
      if (cVar.includes(tVar) || tVar.includes(cVar)) {
        return true;
      }
    }
  }

  // Check last digits or subsegments (searching 2 or more digits, e.g. DDD '11', '85', or suffix '4321')
  if (termClean.length >= 2) {
    for (const cVar of contactVariants) {
      if (cVar.endsWith(termClean) || cVar.includes(termClean) || cVar.startsWith(termClean)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Universal contact matching function:
 * Searches across name, phone, email, company, group, notes, custom fields, and sources.
 * Supports tokenized multi-word search, accent-insensitive search, and phone format flexibility.
 */
export function matchContact(contact?: any, searchTerm?: string): boolean {
  if (!contact) return false;
  if (!searchTerm || !searchTerm.trim()) return true;

  const rawTerm = searchTerm.trim();

  // 1. Phone number match
  if (matchPhoneNumber(contact.phone, rawTerm)) {
    return true;
  }

  // 2. Normalized text matching with tokenization
  const normTerm = normalizeSearchText(rawTerm);
  const tokens = normTerm.split(/[\s,.;:+\-/_]+/).filter(t => t.length > 0);

  const customFieldsText = contact.customFields
    ? Object.entries(contact.customFields).map(([k, v]) => `${k} ${v}`).join(' ')
    : '';

  const combinedSearchable = normalizeSearchText([
    contact.name || '',
    contact.phone || '',
    (contact.phone || '').replace(/\D/g, ''),
    contact.group || '',
    contact.company || '',
    contact.email || '',
    contact.notes || '',
    contact.source || '',
    customFieldsText,
  ].join(' '));

  // Direct substring of whole normalized term
  if (combinedSearchable.includes(normTerm)) {
    return true;
  }

  // If every token in the query matches something in the contact or contact's phone
  if (tokens.length > 0 && tokens.every(token => combinedSearchable.includes(token) || matchPhoneNumber(contact.phone, token))) {
    return true;
  }

  return false;
}

export function getExpectedGroup(successfulCount: number): string {
  if (successfulCount === 0) return '0º Envio';
  if (successfulCount === 1) return '1º Envio';
  if (successfulCount === 2) return '2º Envio';
  if (successfulCount === 3) return '3º Envio';
  if (successfulCount === 4) return '4º Envio';
  if (successfulCount === 5) return '5º Envios';
  return '6+ Envios';
}

export function normalizeCategory(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function isCategorySimilar(categoryCandidate: string, selectedGroupName: string): boolean {
  if (!categoryCandidate || !selectedGroupName) return false;
  const sgClean = selectedGroupName.trim();
  if (sgClean === 'all' || sgClean === 'sem_campanha' || sgClean === 'Agenda de Contatos (Sem Campanha)' || sgClean.toLowerCase() === 'agenda de contatos') return false;

  const targetNorm = normalizeCategory(categoryCandidate);
  const searchNorm = normalizeCategory(selectedGroupName);

  if (!targetNorm || !searchNorm) return false;

  // Exact normalized match (e.g. "cg05150" === "cg05150" or "1" === "1")
  if (targetNorm === searchNorm) return true;

  // Inclusion only when both strings have at least 3 characters (prevents "1" matching "cg10150")
  if (targetNorm.length >= 3 && searchNorm.length >= 3) {
    if (targetNorm.includes(searchNorm) || searchNorm.includes(targetNorm)) return true;
  }

  // Token based matching
  const targetTokens = categoryCandidate.toLowerCase().split(/[\s\-\/_]+/).filter(Boolean);
  const searchTokens = selectedGroupName.toLowerCase().split(/[\s\-\/_]+/).filter(Boolean);

  const keySearchTokens = searchTokens.filter(t => t.length >= 2);
  if (keySearchTokens.length > 0 && targetTokens.length > 0 && keySearchTokens.every(t => targetTokens.some(tt => normalizeCategory(tt) === normalizeCategory(t)))) {
    return true;
  }

  return false;
}

export const AVAILABLE_VARIABLES = [
  { key: '{nome}', label: 'Nome Completo', example: 'João Silva' },
  { key: '{primeiro_nome}', label: 'Primeiro Nome', example: 'João' },
  { key: '{saudacao}', label: 'Saudação do Horário', example: 'Bom dia / Boa tarde / Boa noite' },
  { key: '{tratar_genero}', label: 'Tratamento de Gênero', example: 'amigo / amiga' },
  { key: '{parceiro_genero}', label: 'Gênero Parceiro', example: 'parceiro / parceira' },
  { key: '{veiculo}', label: 'Veículo', example: 'carro / moto' },
  { key: '{tratar_veiculo}', label: 'Tratamento de Veículo', example: 'veículo / motocicleta' },
  { key: '{empresa}', label: 'Empresa', example: 'Minha Empresa Ltda' },
  { key: '{data}', label: 'Data do Envio', example: '28/07/2026' },
  { key: '{horario}', label: 'Horário do Envio', example: '15:30' },
  { key: '{email}', label: 'E-mail do Contato', example: 'joao@email.com' },
  { key: '{grupo}', label: 'Grupo/Categoria', example: 'Clientes VIP' },
];
