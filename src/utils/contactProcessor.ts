import { Contact } from '../types';
import { extractCleanNameComponents, isGenericOrInvalidName, detectGenderFromName } from './gender';

/**
 * Checks if a string is a sequence/turma tag like T18, T19, T20, T01, etc.
 * These are list sequence codes and must NOT be treated as promotional campaigns.
 */
export function isIgnoredSequenceTag(str: string): boolean {
  if (!str) return false;
  const s = str.trim().toUpperCase();
  return /^T[\_\-\s]?\d{1,3}$/i.test(s);
}

/**
 * Checks if a category name is generic, a city, an import label, or invalid as a campaign group.
 */
export function isInvalidCategoryName(str: string): boolean {
  if (!str) return true;
  const s = str.trim().toLowerCase();
  
  if (s === 'agenda de contatos' || s === 'sem campanha' || s === 'agenda de contatos (sem campanha)') return false;
  if (s === 'geral' || s === 'importados' || s === 'sem_campanha' || s === 'sem promoção' || s === 'sem promocao') return true;
  if (/^T[\_\-\s]?\d{1,3}$/i.test(s)) return true;

  // Cities/Locations are NOT campaign categories
  const cities = ['aparecida', 'aparecida de goiânia', 'aparecida de goiania', 'goiânia', 'goiania', 'trindade', 'guapó', 'guapo', 'anápolis', 'anapolis', 'senador canedo'];
  if (cities.includes(s) || cities.some(c => s === c)) return true;

  // Virtual counters
  const virtualWords = ['0º', '1º', '2º', '3º', '4º', '5º', '6+', '0°', '1°', '2°', 'envio'];
  if (virtualWords.some(w => s.includes(w))) return true;

  return false;
}

/**
 * Known common tag prefixes for Brazilian driver campaigns
 */
const COMMON_TAG_PREFIXES = [
  'CG', 'TX', 'TX0', 'TXO', 'CORR', 'CORRECAO', 'CORREÇÃO', 'AJUSTE', 'BONUS', 'PREMIO', 
  'PROM', 'PROMO', 'VOUCHER', 'INDI', 'INDICACAO', 'INDICAÇÃO'
];

/**
 * Normalizes detected tags into clean, human-readable category names.
 */
export function normalizeCategoryName(rawTag: string): string {
  if (!rawTag || isIgnoredSequenceTag(rawTag) || isInvalidCategoryName(rawTag)) return 'Agenda de Contatos';
  const tagUpper = rawTag.trim().toUpperCase();

  // 1. Corre e Ganhe (CG)
  if (tagUpper.includes('CG') || tagUpper.includes('CORRE E GANHE') || tagUpper.includes('CORRA E GANHE')) {
    const numbers = tagUpper.match(/\d+/g) || [];
    if (numbers.length >= 2) {
      return `CG ${numbers[0].padStart(2, '0')}/${numbers[1]}`;
    } else if (numbers.length === 1) {
      const num = numbers[0];
      if (num === '5' || num === '05') return 'CG 05/100';
      if (num === '10') return 'CG 10/150';
      return `CG ${num.padStart(2, '0')}`;
    }
    return 'Corre e Ganhe';
  }

  // 2. Taxa Zero (TX0)
  if (tagUpper.includes('TX0') || tagUpper.includes('TXO') || tagUpper.includes('TAXA ZERO') || tagUpper.includes('TAXAZERO')) {
    const dateMatch = rawTag.match(/(\d{1,2}\/\d{1,2})/);
    return dateMatch ? `Taxa Zero (${dateMatch[1]})` : 'Taxa Zero';
  }

  // 3. Correção / Ajuste (CORR / CORRECAO / AJUSTE) -> Redireciona para a categoria CG correspondente
  if (tagUpper.includes('CORR') || tagUpper.includes('CORRECAO') || tagUpper.includes('CORREÇÃO') || tagUpper.includes('AJUSTE') || tagUpper.includes('CREDITO')) {
    const cgMatch = tagUpper.match(/CG\s*(\d+)(?:\s*[\/\-_$]\s*(\d+))?/i);
    if (cgMatch) {
      if (cgMatch[2]) {
        return `CG ${cgMatch[1].padStart(2, '0')}/${cgMatch[2]}`;
      } else {
        const num = cgMatch[1];
        if (num === '5' || num === '05') return 'CG 05/100';
        if (num === '10') return 'CG 10/150';
        return `CG ${num.padStart(2, '0')}`;
      }
    }
    const valMatch = rawTag.match(/(?:R\$|\$)?\s*(\d+)/i);
    const val = valMatch ? valMatch[1] : '50';
    if (val === '50') return 'CG 50';
    if (val === '100') return 'CG 100';
    if (val === '150') return 'CG 10/150';
    return `CG ${val}`;
  }

  // 4. Indicação (INDI)
  if (tagUpper.includes('INDI') || tagUpper.includes('INDICACAO') || tagUpper.includes('INDICAÇÃO')) {
    return 'Indicação';
  }

  // 5. Generic formatted tag
  let clean = rawTag.replace(/^[\s\.\-_\[\]\(\)\#\:]+/, '').replace(/[\s\.\-_\[\]\(\)\#\:]+$/, '').trim();
  if (clean.length > 0 && !isInvalidCategoryName(clean)) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return 'Agenda de Contatos';
}

/**
 * Extracts potential group tags from a raw name string.
 * e.g., "CG 05/50 Marcos Silva" -> "CG 05/50"
 * e.g., ".Aline Alves_CG 10/100" -> "CG 10/100"
 */
export function extractGroupTags(rawName: string): string | null {
  if (!rawName) return null;

  // Pattern 1: Look for CG patterns like "CG 05/50", "CG 10/100", "CG05_100", "CG10_$150", "CG 05"
  const cgMatch = rawName.match(/(?:^|[\s\.\-_\|\[\(])(CG\s*\d*(?:[\/\-\_\$\s]*\d+)?)(?:$|[\s\.\-_\|\]\)])/i);
  if (cgMatch && cgMatch[1]) {
    return normalizeCategoryName(cgMatch[1]);
  }

  // Pattern 2: Look for Taxa Zero patterns like "TX0 14/08", "TX0_14/08", "Tx0", "Taxa Zero"
  const txMatch = rawName.match(/(?:^|[\s\.\-_\|\[\(])((?:TX0|TXO|TAXA\s*ZERO)\s*(?:\d{1,2}\/\d{1,2})?)(?:$|[\s\.\-_\|\]\)])/i);
  if (txMatch && txMatch[1]) {
    return normalizeCategoryName(txMatch[1]);
  }

  // Pattern 3: Look for Correction patterns like "CORR_50", "CORR$80", "CORRECAO_30", "CORR 50"
  const corrMatch = rawName.match(/(?:^|[\s\.\-_\|\[\(])((?:CORR|CORRECAO|CORREÇÃO|AJUSTE)\s*(?:R\$|\$)?\s*\d*)(?:$|[\s\.\-_\|\]\)])/i);
  if (corrMatch && corrMatch[1]) {
    return normalizeCategoryName(corrMatch[1]);
  }

  // Pattern 4: Look for Indicação / Cities / Known prefixes
  for (const prefix of COMMON_TAG_PREFIXES) {
    const reg = new RegExp(`(?:^|[\\s\\.\\-_\\|\\[\\(])${prefix}(?:$|[\\s\\.\\-_\\|\\]\\)])`, 'i');
    if (reg.test(rawName)) {
      return normalizeCategoryName(prefix);
    }
  }

  // Pattern 5: Look for brackets or parentheses like [CG 10/150] or (Taxa Zero)
  const bracketMatch = rawName.match(/[\[\(]([^\]\)]+)[\]\)]/);
  if (bracketMatch && bracketMatch[1]) {
    const inside = bracketMatch[1].trim();
    if (inside.length >= 2 && inside.length <= 25) {
      return normalizeCategoryName(inside);
    }
  }

  // Pattern 6: Look for separated segments with _ or - like "Marcos_CG10_100" or ".T18_Marcos_CG05"
  const parts = rawName.split(/[\_\-\|]+/).map(p => p.trim());
  for (const part of parts) {
    if (isTagLike(part)) {
      return normalizeCategoryName(part);
    }
  }

  return null;
}

function isTagLike(str: string): boolean {
  if (isIgnoredSequenceTag(str)) return false;
  const s = str.toUpperCase();
  if (s.length < 2) return false;
  if (COMMON_TAG_PREFIXES.some(pre => s.includes(pre))) return true;
  if (s.length <= 15 && /\d/.test(s) && !/^[A-Z][a-z]+$/.test(str)) return true;
  return false;
}

/**
 * Processes a raw name to separate the actual human name from group tags.
 */
export function processContactName(rawName: string): { cleanName: string; detectedGroup: string | null } {
  if (!rawName) return { cleanName: 'Contato Sem Nome', detectedGroup: null };

  const rawDetectedGroup = extractGroupTags(rawName);
  const detectedGroup = (rawDetectedGroup && !isIgnoredSequenceTag(rawDetectedGroup)) ? rawDetectedGroup : null;
  
  let cleanName = rawName;

  // 1. Remove sequence codes like T18, T19, T20, .T18_, _T18_
  cleanName = cleanName.replace(/[\s\.\-_\|\[\(]*T[\_\-\s]?\d{1,3}[\s\.\-_\|\]\)]*/gi, ' ').trim();

  // 2. Remove common prefix codes like .T18_, T18_, .
  cleanName = cleanName.replace(/^\.?[A-Z]\d{1,3}[\_\-\s\.]*/i, '').trim();

  // 3. If a group tag was detected, surgically remove matching tag patterns from name
  if (detectedGroup) {
    // Remove CG patterns if CG
    if (detectedGroup.toLowerCase().includes('cg') || detectedGroup.toLowerCase().includes('corre e ganhe')) {
      cleanName = cleanName.replace(/[\s\.\-_\|\[\(]*CG\s*\d*(?:[\/\-\_\$\s]*\d+)?[\s\.\-_\|\]\)]*/gi, ' ');
    }
    // Remove TX0 patterns
    else if (detectedGroup.toLowerCase().includes('taxa zero') || detectedGroup.toLowerCase().includes('tx0')) {
      cleanName = cleanName.replace(/[\s\.\-_\|\[\(]*(?:TX0|TXO|TAXA\s*ZERO)\s*(?:\d{1,2}\/\d{1,2})?[\s\.\-_\|\]\)]*/gi, ' ');
    }
    // Remove CORR patterns
    else if (detectedGroup.toLowerCase().includes('correção') || detectedGroup.toLowerCase().includes('corr')) {
      cleanName = cleanName.replace(/[\s\.\-_\|\[\(]*(?:CORR|CORRECAO|CORREÇÃO|AJUSTE)\s*(?:R\$|\$)?\s*\d*[\s\.\-_\|\]\)]*/gi, ' ');
    }
    else {
      const escaped = detectedGroup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const removalRegex = new RegExp(`[\\s\\.\-_\\|\\[\\(]*${escaped}[\\s\\.\-_\\|\\]\\)]*`, 'gi');
      cleanName = cleanName.replace(removalRegex, ' ');
    }
  }

  // 4. Remove other noise symbols at beginning / end
  cleanName = cleanName.replace(/^[\s\.\-_#@*+~!?\d\/\\:=|]+|[\s\.\-_#@*+~!?\d\/\\:=|]+$/g, '').trim();

  // 5. Fallback if cleanName becomes empty
  if (!cleanName || cleanName.length < 2) {
    cleanName = rawName.replace(/^\.+/, '').trim() || 'Contato Sem Nome';
  }

  // 6. Proper capitalization for name
  if (cleanName !== 'Contato Sem Nome') {
    cleanName = cleanName.split(/\s+/).map(word => {
      if (word.length <= 1) return word.toLowerCase();
      if (word === word.toLowerCase() || word === word.toUpperCase()) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word;
    }).join(' ');
  }

  return {
    cleanName,
    detectedGroup
  };
}

/**
 * Enriches a list of contacts with better names and groups based on their raw input.
 */
export function enrichContacts(contacts: Contact[]): Contact[] {
  return contacts.map(contact => {
    const { cleanName, detectedGroup } = processContactName(contact.name);
    
    // Check if original group is missing, generic, city, or invalid
    const isInvalid = isInvalidCategoryName(contact.group || '');
    const isGenericGroup = isInvalid || 
                           !contact.group || 
                           contact.group === 'Geral' || 
                           contact.group === 'Agenda de Contatos' || 
                           contact.group === 'sem_campanha' ||
                           contact.group.toLowerCase().includes('sem campanha');

    let finalGroup = (detectedGroup && isGenericGroup) ? detectedGroup : (isInvalid ? 'Agenda de Contatos' : (contact.group || detectedGroup || 'Agenda de Contatos'));

    if (isInvalidCategoryName(finalGroup)) {
      finalGroup = 'Agenda de Contatos';
    }

    return {
      ...contact,
      name: cleanName,
      group: finalGroup,
      gender: detectGenderFromName(cleanName),
      notes: (cleanName !== contact.name && !contact.notes?.includes(contact.name))
        ? `[Nome original: ${contact.name}] ${contact.notes || ''}`.trim()
        : contact.notes
    };
  });
}
