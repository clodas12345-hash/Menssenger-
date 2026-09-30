/**
 * Gender Detection and Soft Tone Adaptation for Brazilian WhatsApp Outreach
 */

// Comprehensive set of common female first names in Brazil (lowercase, accent-normalized)
const FEMALE_NAMES_SET = new Set<string>([
  'ada', 'adriana', 'agatha', 'agnes', 'aida', 'ailana', 'aimê', 'aimee', 'aina', 'alda',
  'alessandra', 'alexa', 'alexandra', 'alice', 'alicia', 'aline', 'alana', 'alanna',
  'amalia', 'amanda', 'amelia', 'ana', 'analice', 'anamaria', 'ananda', 'andreia', 'andrea',
  'andressa', 'andreza', 'anete', 'angela', 'angelica', 'angelina', 'anita', 'antonia',
  'aparecida', 'ariana', 'ariane', 'ariela', 'arlete', 'astrid', 'aurora', 'ayesha',
  'barbara', 'beatriz', 'berenice', 'bernadete', 'bertha', 'beth', 'betania', 'betina',
  'bianca', 'bruna', 'brunna', 'cacilda', 'camila', 'camilla', 'carina', 'carla',
  'carlota', 'carmem', 'carmen', 'carol', 'carolina', 'caroline', 'cassia', 'catarina',
  'catia', 'cecilia', 'celeste', 'celia', 'celina', 'charlene', 'cibele', 'cileide',
  'cintia', 'cinthia', 'clara', 'clarice', 'clarissa', 'claudete', 'claudia', 'cleide',
  'clelia', 'cleonice', 'cleusa', 'clo', 'cloe', 'conceicao', 'cora', 'corina',
  'creusa', 'cris', 'cristiana', 'cristiane', 'cristina', 'cyntia',
  'daiana', 'daiane', 'dalila', 'dalva', 'damaris', 'daniela', 'daniella', 'danielle',
  'danila', 'danusa', 'dara', 'darci', 'darlene', 'debora', 'deborah', 'deise',
  'dejanira', 'denise', 'deolinda', 'desiree', 'diana', 'diane', 'dinah', 'dinora',
  'diva', 'dolores', 'dora', 'doris', 'doroteia', 'dulce', 'dulcineia',
  'edileuza', 'edina', 'edith', 'edite', 'edna', 'edneia', 'elaine', 'elana',
  'elba', 'elena', 'eleonora', 'eliana', 'eliane', 'elida', 'elis', 'elisa',
  'elisabete', 'elisabeth', 'elisangela', 'eliza', 'elizabeth', 'ellen', 'eloa',
  'eloisa', 'elza', 'emanuela', 'emanuelle', 'emilia', 'emily', 'emilly', 'eneida',
  'erica', 'erika', 'estela', 'ester', 'esther', 'eugenia', 'eunice', 'eva',
  'evangelina', 'evelin', 'eveline', 'evelyn',
  'fabia', 'fabiana', 'fabiane', 'fabiola', 'fatima', 'felipa', 'fernanda', 'filomena',
  'flavia', 'flaviana', 'flora', 'franciele', 'francielle', 'francisca', 'francine',
  'gabriela', 'gabriella', 'gabriele', 'gabrielle', 'geisa', 'geisiane', 'geni',
  'geovana', 'geovanna', 'geralda', 'gertrudes', 'gilda', 'gilmara', 'gina', 'giovana',
  'giovanna', 'gisele', 'giselle', 'gislaine', 'gislene', 'glauce', 'glaucia', 'gleice',
  'gleiciane', 'gloria', 'graca', 'graciela', 'graciele', 'grazi', 'graziela', 'graziele',
  'guilhermina',
  'haydee', 'hebe', 'heidi', 'helen', 'helena', 'heloisa', 'heloise', 'henriqueta',
  'ilda', 'ines', 'inez', 'ingrid', 'iara', 'ione', 'iracema', 'iraci', 'irene',
  'iris', 'isabel', 'isabela', 'isabella', 'isabele', 'isabelle', 'isadora', 'isaura',
  'isolda', 'ivana', 'ivanete', 'ivanilde', 'ivete', 'ivone', 'ivonete', 'izabel',
  'izabela', 'izabella', 'izadora',
  'jaci', 'jacira', 'jacqueline', 'jacyara', 'jadir', 'jana', 'janaina', 'jandira',
  'jane', 'janete', 'janice', 'janine', 'jaqueline', 'jeane', 'jenifer', 'jennifer',
  'jessica', 'jessika', 'joana', 'joanita', 'joelma', 'jordana', 'jorgea', 'josefa',
  'josefina', 'joselita', 'josiane', 'josie', 'josilene', 'joyce', 'jucara', 'jucelia',
  'jucilene', 'judite', 'julia', 'juliana', 'juliane', 'julieta', 'jurema', 'jussara',
  'karen', 'karin', 'karina', 'karine', 'karla', 'karolina', 'kassia', 'katia',
  'kathleen', 'katiuscia', 'keila', 'kelly', 'keli', 'kelen', 'kerolyn', 'ketlyn',
  'kika', 'kyara',
  'laiana', 'laiane', 'laide', 'laila', 'laire', 'lais', 'laissa', 'lara',
  'larissa', 'laura', 'lauren', 'lavinia', 'layla', 'lea', 'leandra', 'leda',
  'leila', 'leilah', 'leilane', 'lenia', 'lenice', 'lenira', 'leona', 'leonor',
  'leticia', 'lia', 'liana', 'lidia', 'lidiane', 'ligia', 'lilia', 'lilian',
  'liliane', 'lina', 'linda', 'lindalva', 'lis', 'lisa', 'lisandra', 'livia',
  'lorena', 'lorrane', 'lourdes', 'luana', 'luara', 'lucelia', 'lucia', 'luciana',
  'luciane', 'luciene', 'lucila', 'lucilene', 'lucimar', 'lucimara', 'lucinda', 'lucy',
  'ludmila', 'ludmilla', 'luisa', 'luiza', 'luma', 'luna', 'lurde', 'lurdes', 'luzia',
  'mabel', 'madalena', 'magali', 'magda', 'maiara', 'maira', 'maisa', 'malu',
  'manoela', 'manuela', 'manuella', 'mara', 'marcela', 'marcella', 'marcia', 'margarete',
  'margarida', 'mari', 'maria', 'mariah', 'mariana', 'mariane', 'marianne', 'maribel',
  'mariele', 'marieta', 'marilene', 'marilia', 'marilza', 'marina', 'marinara', 'marineide',
  'maris', 'marisa', 'maristela', 'mariza', 'marize', 'marlene', 'marli', 'marluce',
  'marta', 'mathilde', 'matilde', 'maura', 'mayara', 'mayra', 'maysa', 'mel',
  'melania', 'melina', 'melinda', 'melissa', 'mercedes', 'michele', 'michelle', 'milena',
  'mirela', 'mirella', 'miriam', 'mirian', 'moema', 'mona', 'monica', 'monika',
  'monique',
  'nadir', 'naia', 'naiara', 'nair', 'nanci', 'nancy', 'nara', 'natacha',
  'natalia', 'nathalia', 'natasha', 'nauana', 'nayara', 'nazare', 'neide', 'neila',
  'nelia', 'neuza', 'neusa', 'nicole', 'nicolle', 'nilce', 'nilma', 'nilza',
  'nivia', 'noeli', 'noemia', 'noemi', 'nora', 'norma', 'nubia',
  'olga', 'olivia', 'ondina', 'oriana', 'orlanda', 'otavia',
  'paloma', 'pamela', 'paola', 'patricia', 'paula', 'paulina', 'pedrina', 'perla',
  'petra', 'piedade', 'poliana', 'pollyana', 'priscila', 'priscilla',
  'quenia', 'queren',
  'rafaela', 'rafaella', 'raiane', 'raissa', 'raquel', 'rayssa', 'rebeca', 'rebecca',
  'regiane', 'regina', 'renata', 'ritinha', 'rita', 'riva', 'roberta', 'rosana',
  'rosane', 'rosangela', 'rose', 'roseli', 'rosely', 'rosemary', 'rosicleide', 'rosilda',
  'rosilene', 'rosimere', 'rosinha', 'rossana', 'rute', 'ruth',
  'sabrina', 'safira', 'samanta', 'samantha', 'samara', 'samira', 'sandra', 'sara',
  'sarah', 'saula', 'scarlet', 'selma', 'serena', 'sharon', 'sheila', 'shirlei',
  'shirley', 'silmara', 'silvana', 'silvia', 'silviane', 'simone', 'simony', 'sirlei',
  'socorro', 'sofia', 'solange', 'sonia', 'sonja', 'sophia', 'stacy', 'stela',
  'stella', 'stephanie', 'stephany', 'sueli', 'suely', 'suelen', 'suellen', 'suzana',
  'suzane', 'suzy',
  'tabata', 'taciana', 'taina', 'tainara', 'tais', 'taissa', 'talita', 'tamara',
  'tamires', 'tamyres', 'tania', 'tatiana', 'tatiane', 'telma', 'teresa', 'terezinha',
  'thais', 'thaissa', 'thalita', 'thamires', 'thamyres', 'theresa', 'tiara',
  'ursula',
  'valdete', 'valdice', 'valdimira', 'valdirene', 'valeria', 'valesca', 'valeska', 'valquiria',
  'vanda', 'vanessa', 'vania', 'vanusa', 'vera', 'verena', 'veridiana', 'veronica',
  'vicentina', 'victoria', 'vilma', 'violeta', 'virginia', 'vitoria', 'vivian', 'viviane',
  'vivianne',
  'waleska', 'walquiria', 'wanda', 'wanessa', 'wilda', 'wilma',
  'xuxa',
  'yane', 'yara', 'yasmin', 'yasmim', 'yeda', 'yolanda', 'yvone',
  'zaira', 'zelia', 'zelia', 'zelinda', 'zenaide', 'zenilda', 'zilba', 'zilda',
  'zilma', 'zina', 'zita', 'zoe', 'zoraide', 'zuleica', 'zuleide', 'zulmira'
]);

// Names that end in 'a' but are typically male in Brazil/Portuguese
const MALE_NAMES_WITH_A_SUFFIX = new Set<string>([
  'luca', 'lucca', 'luka', 'jean', 'joshua', 'elias', 'matias', 'lucas', 'jonas',
  'alex', 'alexandre', 'alexandro', 'alexsandro', 'alessandro', 'andre', 'allyson',
  'adalberto', 'adriano', 'anderson', 'antonio', 'barnabe', 'dimas', 'tobias',
  'isaia', 'isaias', 'jeremias', 'zacarias', 'uriel', 'ariel', 'mikael', 'elisha'
]);

/**
 * Checks if a name string is a generic non-name, phone number, or invalid placeholder.
 */
export function isGenericOrInvalidName(rawName?: string): boolean {
  if (!rawName) return true;
  const clean = rawName.trim().toLowerCase();
  if (!clean) return true;

  // Check if it's a phone number or dominated by digits
  const digitsOnly = clean.replace(/\D/g, '');
  const letterCount = (clean.match(/[\p{L}]/gu) || []).length;
  if (digitsOnly.length >= 8 && digitsOnly.length >= (clean.replace(/[^a-z0-9]/g, '').length || 1) * 0.5) {
    return true;
  }
  if (clean.startsWith('55') && digitsOnly.length >= 10) return true;
  if (clean.startsWith('+')) return true;

  const genericTokens = [
    'sem nome', 'sem_nome', 'sem-nome', '[sem nome]', 'sem', 'contato', 'contatos',
    'desconhecido', 'motorista', 'cliente', 'usuario', 'usuário', 'lead', 'leads',
    'me', 'eu', 'mim', 'admin', 'suporte', 'null', 'undefined', 'semnome', 'sem_nome_importado'
  ];

  if (genericTokens.includes(clean)) return true;
  if (clean.startsWith('sem nome') || clean.startsWith('sem_nome') || clean.startsWith('contato ')) return true;

  return false;
}

/**
 * Known tag words or patterns to filter out when extracting human names.
 */
const KNOWN_TAG_PATTERNS = /^(cg\d*|r?\$?\d+|\d+\$|moto|carro|pop|99moto|99pop|99|elegivel|inativo|ativo|novo|falta\d*|sem_?nome|contato\d*|lead\d*|grupo\d*|p|m|g|sp|rj|mg|ba|df|pr|rs|sc|pe|ce|go|am|es|ma|pb|pa|rn|pi|al|se|to|ro|ac|ap|rr|ms|mt)$/i;

function isTagToken(token: string): boolean {
  if (!token) return true;
  const t = token.trim();
  if (!t) return true;
  if (/^\d+$/.test(t)) return true; // purely digits like 01, 05, 10, 50, 100
  if (/^[\$\#\@\*\+\~\!\?\d\/\:\\\=\|\_\-]+$/.test(t)) return true; // pure symbols/digits
  if (/^55\d{8,}$/.test(t) || /^\+\d+$/.test(t)) return true; // phone numbers
  if (KNOWN_TAG_PATTERNS.test(t)) return true;
  return false;
}

/**
 * Clean and isolate candidate first name and full name from any contact line.
 * Correctly handles prepended or appended tags like "CG05 - Marcos Antonio", "50 - Ana", ".Aline Alves_CG05_$50", etc.
 */
export function extractCleanNameComponents(rawName: string): { firstName: string; fullName: string } {
  if (!rawName || isGenericOrInvalidName(rawName)) {
    return { firstName: '', fullName: '' };
  }

  // 1. Remove URLs, emails, bracketed/parenthetical tags, and leading noise
  let cleaned = rawName
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\[[^\]]*\]|\([^\)]*\)|\{[^\}]*\}/g, ' ')
    .replace(/^[\s\.\-_#@*+~!?\d\/\\:=|]+/, '')
    .trim();

  if (!cleaned || isGenericOrInvalidName(cleaned)) {
    return { firstName: '', fullName: '' };
  }

  // 2. Split string into major blocks using common separators: _, -, |, /, :, ;, ,
  const blocks = cleaned.split(/[\_\-\|\/\:\;\,]+/).map(b => b.trim()).filter(Boolean);

  const candidateBlocks: string[][] = [];

  for (const block of blocks) {
    const words = block.split(/\s+/).filter(Boolean);
    const validWordsInBlock: string[] = [];

    for (const word of words) {
      const cleanWord = word.replace(/[^\p{L}]/gu, '');
      if (cleanWord.length >= 2 || (words.length === 1 && cleanWord.length > 0)) {
        if (!isTagToken(cleanWord) && !isGenericOrInvalidName(cleanWord)) {
          // Capitalize properly
          const formatted = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
          validWordsInBlock.push(formatted);
        }
      }
    }

    if (validWordsInBlock.length > 0) {
      candidateBlocks.push(validWordsInBlock);
    }
  }

  // Pick the best candidate block (the block with the most valid name words, or first valid block)
  let bestWords: string[] = [];
  if (candidateBlocks.length > 0) {
    // Sort candidate blocks by word count descending so "Marcos Antonio" is preferred over "M"
    candidateBlocks.sort((a, b) => b.length - a.length);
    bestWords = candidateBlocks[0];
  }

  // Fallback: if no block worked, extract any non-tag words from the entire cleaned string
  if (bestWords.length === 0) {
    const allWords = cleaned.split(/\s+/).filter(Boolean);
    for (const w of allWords) {
      const cleanW = w.replace(/[^\p{L}]/gu, '');
      if (cleanW.length >= 2) {
        if (!isTagToken(cleanW) && !isGenericOrInvalidName(cleanW)) {
          const formatted = cleanW.charAt(0).toUpperCase() + cleanW.slice(1).toLowerCase();
          bestWords.push(formatted);
        }
      }
    }
  }

  if (bestWords.length === 0) {
    return { firstName: '', fullName: '' };
  }

  const firstName = bestWords[0];
  const fullName = bestWords.join(' ');

  return { firstName, fullName };
}

/**
 * Clean and isolate the candidate first name from any contact line, tag, or full name.
 * e.g., "CG05 - Marcos Antonio" -> "Marcos"
 * e.g., ".Aline Alves_CG05_$50_P" -> "Aline"
 */
export function extractCleanFirstName(rawName: string): string {
  const components = extractCleanNameComponents(rawName);
  return components.firstName;
}

/**
 * Clean and isolate full name from tags or symbols.
 */
export function extractCleanFullName(rawName: string): string {
  const components = extractCleanNameComponents(rawName);
  return components.fullName;
}

/**
 * Detect gender ('mulher' | 'homem') based on Brazilian Portuguese name conventions.
 */
export function detectGenderFromName(rawName: string): 'mulher' | 'homem' {
  const firstName = extractCleanFirstName(rawName);
  if (!firstName) return 'homem';

  // Normalize: remove accents and lowercase
  const normalized = firstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (!normalized) return 'homem';

  // 1. Direct match in male exception list (e.g. Luca, Elias)
  if (MALE_NAMES_WITH_A_SUFFIX.has(normalized)) {
    return 'homem';
  }

  // 2. Direct match in female dictionary
  if (FEMALE_NAMES_SET.has(normalized)) {
    return 'mulher';
  }

  // 3. Brazilian compound female name check (e.g. "Ana Paula", "Maria Eduarda")
  const fullClean = rawName
    .replace(/^[\s\.\-_#@*+~]+/, '')
    .split('_')[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (fullClean.startsWith('ana ') || fullClean.startsWith('maria ') || fullClean.startsWith('elis ')) {
    return 'mulher';
  }

  // 4. Suffix heuristic rules for female names in Portuguese:
  // Names ending with typical feminine suffixes: -a, -ia, -ina, -ana, -ara, -ete, -ice, -ele, -elly, -ise, -y
  if (
    normalized.endsWith('a') ||
    normalized.endsWith('ete') ||
    normalized.endsWith('ice') ||
    normalized.endsWith('ele') ||
    normalized.endsWith('elly') ||
    normalized.endsWith('ise') ||
    normalized.endsWith('iane') ||
    normalized.endsWith('elle')
  ) {
    return 'mulher';
  }

  return 'homem';
}

/**
 * Adapts approach and softens language for women or applies appropriate masculine inflections for men.
 * Examples requested by user:
 * - "CARA" / "Fala cara" / "E aí cara" -> transformed to gentle, pleasant, and polite greeting (e.g. "Olá, tudo bem?", "amiga", "parceira")
 * - "Fala, [Nome]" -> "Oi, [Nome]!" / "Olá, [Nome]!"
 * - "parceiro" / "amigo" -> "parceira" / "amiga"
 * - "bem-vindo" -> "bem-vinda"
 * - "preparado" -> "preparada"
 * - "pronto" -> "pronta"
 * - "cadastrado" (when referring to the person) -> "cadastrada"
 */
export function adaptApproachForGender(
  text: string,
  gender: 'mulher' | 'homem' | string,
  firstName: string = ''
): string {
  if (!text) return '';

  const isFemale = gender === 'mulher';

  let result = text;

  if (isFemale) {
    // 1. Soften rough slang like "CARA", "mano", "brother"
    // "Fala cara" / "Fala, cara" -> "Olá, tudo bem?" / "Oi, amiga!"
    result = result
      .replace(/\bfala\s*,?\s*cara\b/gi, 'Olá, tudo bem?')
      .replace(/\be\s+aí\s*,?\s*cara\b/gi, 'Olá, tudo bem?')
      .replace(/\be\s+ai\s*,?\s*cara\b/gi, 'Olá, tudo bem?')
      .replace(/\bo\s+cara\b/gi, 'a parceira')
      .replace(/\bmeu\s+caro\b/gi, 'minha amiga')
      .replace(/\bmeu\s+mano\b/gi, 'minha amiga')
      .replace(/\bmeu\s+brother\b/gi, 'minha parceira')
      .replace(/\bmano\b/gi, 'amiga')
      .replace(/\bbrother\b/gi, 'parceira')
      .replace(/\bcara\s*,\s*/gi, 'amiga, ')
      .replace(/\bcara\s*!\s*/gi, 'amiga! ')
      .replace(/\s+cara\s+/gi, ' amiga ');

    // 2. Soften initial greetings ("Fala, [Nome]" -> "Oi, [Nome]!" / "Olá, [Nome]!")
    result = result
      .replace(/\bFala\s*,\s*([^\n!?,]+)[\s!?,]*\s*Beleza\s*\?/gi, 'Olá, $1, tudo bem?')
      .replace(/\bFala\s*,\s*([^\n!?,]+)[\s!?,]*\s*Tudo bem\s*\?/gi, 'Oi, $1, tudo bem?')
      .replace(/\bFala\s*,\s*([^\n!?,]+)!/gi, 'Oi, $1! Tudo bem?')
      .replace(/\bFala\s+([^\n!?,]+)!/gi, 'Oi, $1! Tudo bem?')
      .replace(/\bFala\s*,\s*([^\n!?,]+)/gi, 'Oi, $1');

    // 3. Gender adjective & noun inflections for women
    result = result
      // Bem-vindo / Bem vindo
      .replace(/\bseja\s+(muito\s+)?bem-vindo\(a\)/gi, 'seja $1bem-vinda')
      .replace(/\bseja\s+(muito\s+)?bem\s+vindo\(a\)/gi, 'seja $1bem-vinda')
      .replace(/\bseja\s+(muito\s+)?bem-vindo\b/gi, 'seja $1bem-vinda')
      .replace(/\bseja\s+(muito\s+)?bem\s+vindo\b/gi, 'seja $1bem-vinda')
      .replace(/\bSeja\s+(muito\s+)?Bem-vindo\b/gi, 'Seja $1Bem-vinda')
      .replace(/\bbem-vindo\(a\)\b/gi, 'bem-vinda')
      .replace(/\bbem-vindo\b/gi, 'bem-vinda')
      // Amigo(a)
      .replace(/\bamigo\(a\)\b/gi, 'amiga')
      .replace(/\bmeu\s+amigo\b/gi, 'minha amiga')
      .replace(/\bum\s+amigo\b/gi, 'uma amiga')
      // Parceiro(a) (when referring to the driver / recipient)
      .replace(/\bparceiro\(a\)\b/gi, 'parceira')
      .replace(/\bvocê\s*,?\s*motorista\s+parceiro\b/gi, 'você, motorista parceira')
      .replace(/\bcomo\s+motorista\s+parceiro\b/gi, 'como motorista parceira')
      .replace(/\bcomo\s+parceiro\b/gi, 'como parceira')
      .replace(/\bnovo\s+parceiro\b/gi, 'nova parceira')
      .replace(/\bnova\s+parceira\(a\)\b/gi, 'nova parceira')
      .replace(/\bparceiro\s+da\s+99\b(?<!Cláudio[^\n]*)/gi, 'parceira da 99')
      // Preparado / Pronto / Animado
      .replace(/\bpreparado\(a\)\b/gi, 'preparada')
      .replace(/\bestá\s+preparado\b/gi, 'está preparada')
      .replace(/\btá\s+preparado\b/gi, 'tá preparada')
      .replace(/\bpronto\(a\)\b/gi, 'pronta')
      .replace(/\bestá\s+pronto\b/gi, 'está pronta')
      .replace(/\btá\s+pronto\b/gi, 'tá pronta')
      .replace(/\banimado\(a\)\b/gi, 'animada')
      .replace(/\bestá\s+animado\b/gi, 'está animada')
      .replace(/\btá\s+animado\b/gi, 'tá animada')
      // Cadastrado / Aprovado (when applied to person)
      .replace(/\bvocê\s+está\s+cadastrado\b/gi, 'você está cadastrada')
      .replace(/\bvocê\s+já\s+está\s+cadastrado\b/gi, 'você já está cadastrada')
      .replace(/\bvocê\s+foi\s+aprovado\b/gi, 'você foi aprovada')
      .replace(/\bficar\s+tranquilo\b/gi, 'ficar tranquila')
      .replace(/\bfique\s+tranquilo\b/gi, 'fique tranquila')
      // Neutralize dual forms like (a), (o)
      .replace(/\(a\)/gi, 'a')
      .replace(/\/a\b/gi, 'a');

    // Keep Cláudio's own presentation consistent as male mentor:
    result = result
      .replace(/Aqui é o Cláudio, motorista parceira/gi, 'Aqui é o Cláudio, motorista parceiro')
      .replace(/Sou o Cláudio, motorista parceira/gi, 'Sou o Cláudio, motorista parceiro')
      .replace(/Sou o Cláudio, seu ponto de apoio/gi, 'Sou o Cláudio, seu ponto de apoio')
      .replace(/Aqui é o Cláudio, seu mentor/gi, 'Aqui é o Cláudio, seu mentor');

  } else {
    // Male recipient: standardize dual slashes to masculine
    result = result
      .replace(/\(a\)/gi, '')
      .replace(/\(o\)/gi, '')
      .replace(/\/a\b/gi, '')
      .replace(/\bparceiro\(a\)\b/gi, 'parceiro')
      .replace(/\bamigo\(a\)\b/gi, 'amigo')
      .replace(/\bbem-vindo\(a\)\b/gi, 'bem-vindo')
      .replace(/\bpreparado\(a\)\b/gi, 'preparado')
      .replace(/\bpronto\(a\)\b/gi, 'pronto')
      .replace(/\banimado\(a\)\b/gi, 'animado');
  }

  return result;
}
