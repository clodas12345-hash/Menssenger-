import { Contact } from '../types';
import { detectGenderFromName } from './gender';
import { processContactName } from './contactProcessor';

export function parseVcfContent(vcfText: string, defaultCountryCode: string = '55'): Contact[] {
  const contacts: Contact[] = [];
  // Split by BEGIN:VCARD
  const vcards = vcfText.split(/BEGIN:VCARD/i);

  vcards.forEach((vcardText, idx) => {
    if (!vcardText.trim()) return;

    let fullName = '';
    let phone = '';
    let email = '';
    let company = '';
    let group = '';
    let notes = '';

    const lines = vcardText.split(/\r?\n/);
    
    // Unfold folded lines in vCard (lines starting with space or tab)
    const unfoldedLines: string[] = [];
    for (const line of lines) {
      if (/^\s+/.test(line) && unfoldedLines.length > 0) {
        unfoldedLines[unfoldedLines.length - 1] += line.trim();
      } else {
        unfoldedLines.push(line);
      }
    }

    for (const line of unfoldedLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Extract Name (FN or N)
      if (trimmed.startsWith('FN:') || trimmed.startsWith('FN;')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) {
          fullName = decodeVcardValue(parts.slice(1).join(':')).trim();
        }
      } else if (!fullName && (trimmed.startsWith('N:') || trimmed.startsWith('N;'))) {
        const parts = trimmed.split(':');
        if (parts.length > 1) {
          const nVal = decodeVcardValue(parts.slice(1).join(':'));
          const nParts = nVal.split(';');
          // Structured name: Surname;GivenName;AdditionalNames;HonorificPrefixes;HonorificSuffixes
          const givenName = nParts[1] || '';
          const familyName = nParts[0] || '';
          fullName = `${givenName} ${familyName}`.trim();
        }
      }

      // Extract Phone (TEL)
      if (trimmed.toUpperCase().includes('TEL')) {
        const parts = trimmed.split(':');
        if (parts.length > 1 && !phone) {
          phone = cleanPhoneNumber(parts.slice(1).join(':'), defaultCountryCode);
        }
      }

      // Extract Company (ORG)
      if (trimmed.startsWith('ORG:') || trimmed.startsWith('ORG;')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) {
          company = decodeVcardValue(parts.slice(1).join(':')).replace(/;/g, ' ').trim();
        }
      }

      // Extract Email (EMAIL)
      if (trimmed.toUpperCase().includes('EMAIL')) {
        const parts = trimmed.split(':');
        if (parts.length > 1 && !email) {
          email = parts.slice(1).join(':').trim();
        }
      }

      // Extract Categories / Groups
      if (trimmed.startsWith('CATEGORIES:') || trimmed.startsWith('CATEGORIES;')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) {
          group = parts.slice(1).join(':').split(',')[0].trim();
        }
      }

      // Extract Notes
      if (trimmed.startsWith('NOTE:') || trimmed.startsWith('NOTE;')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) {
          notes = decodeVcardValue(parts.slice(1).join(':')).trim();
        }
      }
    }

    if (fullName || phone) {
      // Improve name and group detection
      const { cleanName, detectedGroup } = processContactName(fullName);
      
      contacts.push({
        id: `vcf_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName || fullName || 'Contato Sem Nome',
        phone: phone || '',
        email: email || undefined,
        company: company || undefined,
        group: detectedGroup || group || 'Importados',
        notes: (cleanName !== fullName && fullName) 
          ? `[Nome VCF: ${fullName}] ${notes || ''}`.trim() 
          : notes || undefined,
        gender: detectGenderFromName(cleanName || fullName),
        source: 'vcf',
        createdAt: new Date().toISOString(),
      });
    }
  });

  return contacts;
}

/**
 * Clean and format phone number for WhatsApp wa.me / web api compatibility
 */
export function cleanPhoneNumber(rawPhone: string, defaultCountryCode: string = '55'): string {
  if (!rawPhone) return '';

  // Remove non-digit characters except leading plus
  let digits = rawPhone.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    digits = digits.substring(1);
  }

  // If phone length is between 10 and 11 digits (e.g. Brazilian DDD + number like 11999998888 or 1133334444)
  // and doesn't have country code prefix
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith(defaultCountryCode)) {
    digits = defaultCountryCode + digits;
  }

  return digits;
}

/**
 * Basic decoding for vCard encoded strings (e.g. Quoted-Printable or UTF-8)
 */
function decodeVcardValue(val: string): string {
  if (!val) return '';
  
  let cleaned = val;
  // Handle QUOTED-PRINTABLE if present in line properties
  if (cleaned.includes('=20') || cleaned.includes('=3A') || /=[\DA-F]{2}/i.test(cleaned)) {
    try {
      cleaned = cleaned.replace(/=([\DA-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    } catch {
      // fallback if error
    }
  }
  
  return cleaned;
}

export function generateVcfContent(contacts: Contact[]): string {
  return contacts
    .map((c) => {
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${c.name}`,
        `N:;${c.name};;;`,
      ];
      if (c.phone) {
        const cleanP = c.phone.replace(/[^\d+]/g, '');
        const formattedP = cleanP.startsWith('+') ? cleanP : '+' + cleanP;
        lines.push(`TEL;TYPE=CELL:${formattedP}`);
      }
      if (c.email) {
        lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
      }
      if (c.company) {
        lines.push(`ORG:${c.company}`);
      }
      if (c.group) {
        lines.push(`CATEGORIES:${c.group}`);
      }
      if (c.notes) {
        lines.push(`NOTE:${c.notes}`);
      }
      lines.push('END:VCARD');
      return lines.join('\n');
    })
    .join('\n');
}

export function downloadVcfFile(contacts: Contact[], filename: string = 'agenda_contatos.vcf'): void {
  if (contacts.length === 0) return;
  const content = generateVcfContent(contacts);
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format phone number visually for display (e.g., +55 (11) 98888-7777)
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    // Brazil 55 + 2 digits DDD + 9 digits number
    return `+55 (${clean.substring(2, 4)}) ${clean.substring(4, 9)}-${clean.substring(9)}`;
  } else if (clean.length === 12 && clean.startsWith('55')) {
    // Brazil 55 + 2 digits DDD + 8 digits number
    return `+55 (${clean.substring(2, 4)}) ${clean.substring(4, 8)}-${clean.substring(8)}`;
  } else if (clean.length === 11) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
  }
  return `+${clean}`;
}
