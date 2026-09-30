import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily/safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Resilient Gemini runner: tries gemini-3.8-flash first with brief retry on 503 high demand, then falls back to gemini-3.1-flash-lite and gemini-flash-latest
const callGemini = async (prompt: string, config: any = {}) => {
  const ai = getGeminiClient();
  if (!ai) return null;

  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config,
        });
        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        const msg = String(err?.message || err);
        const isTemporaryHighDemand =
          msg.includes("503") ||
          msg.includes("high demand") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("429");

        if (isTemporaryHighDemand && attempt === 0) {
          // Brief pause for temporary demand spike then retry this model
          await sleep(750);
          continue;
        }
        // Move quietly to next fallback candidate model
        break;
      }
    }
  }

  return null;
};

// Strategic Templates Fallback Generator
function generateFallbackTopicTemplates(
  topicName: string,
  hook: string,
  presentation?: string,
  quantity: number = 5
) {
  const cleanTopic = topicName?.trim() || 'Tópico Estratégico';
  const cleanHook = hook?.trim() || 'Aproveite esta condição especial!';
  const intro = presentation?.trim() ? `${presentation.trim()}: ` : '';

  // 1. Mensagem Original Fiel
  const originalMessage = cleanHook.includes('{primeiro_nome}') || cleanHook.includes('{nome}')
    ? `${intro}${cleanHook}`
    : `{saudacao}, {primeiro_nome}! ${intro}${cleanHook}`;

  // Criar variações reais e naturais do texto do usuário
  const cleanBody = cleanHook
    .replace(/^(\{saudacao\}|\{primeiro_nome\}|\{nome\}|olá|oi|bom dia|boa tarde|boa noite)[,!\s]*/i, '')
    .trim();

  const pool = [
    {
      title: `${cleanTopic} - Mensagem 1 (Original)`,
      content: originalMessage,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 2 (Direta e Objetiva)`,
      content: `Olá, {primeiro_nome}! {saudacao}! ${intro}Passando para te avisar: ${cleanBody || cleanHook} Se precisar de qualquer ajuda, conte comigo!`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 3 (Cordial e Preventiva)`,
      content: `{saudacao}, {primeiro_nome}! Tudo bem? ${intro}Gostaria de compartilhar uma informação importante: ${cleanBody || cleanHook} Estamos 100% à disposição por aqui!`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 4 (Ágil e Prática)`,
      content: `{primeiro_nome}, {saudacao}! ${intro}Lembrete rápido para você: ${cleanBody || cleanHook} Qualquer dúvida é só me chamar!`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 5 (Conversacional)`,
      content: `Oi, {primeiro_nome}! {saudacao}! ${intro}Espero que esteja tudo bem. Queria te passar este comunicado: ${cleanBody || cleanHook} Conte com nosso suporte sempre!`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 6 (Entusiasta)`,
      content: `Ei, {primeiro_nome}! {saudacao}! ${intro}Tenho uma novidade imperdível: ${cleanBody || cleanHook} Estamos ansiosos pelo seu contato!`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 7 (Profissional)`,
      content: `Prezado(a) {primeiro_nome}, {saudacao}. ${intro}Este é um comunicado importante sobre: ${cleanBody || cleanHook} À disposição para esclarecimentos.`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 8 (Curta e Direta)`,
      content: `Olá, {primeiro_nome}. ${intro}${cleanBody || cleanHook} Qualquer coisa, é só dar um alô!`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 9 (Informativa)`,
      content: `{saudacao}! {primeiro_nome}, ${intro}aproveito o momento para informar: ${cleanBody || cleanHook} Se preferir, agendamos um horário!`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 10 (Foco em Benefício)`,
      content: `Ei, {primeiro_nome}! {saudacao}! ${intro}Você não pode perder esta oportunidade: ${cleanBody || cleanHook} Vamos conversar?`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 11 (Urgente)`,
      content: `Atenção, {primeiro_nome}! {saudacao}! ${intro}Preciso te atualizar sobre: ${cleanBody || cleanHook} Aguardo seu retorno!`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 12 (Personalizada)`,
      content: `Como vai, {primeiro_nome}? {saudacao}! ${intro}Queria destacar isso para você: ${cleanBody || cleanHook} Fico no aguardo de notícias.`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 13 (Amigável)`,
      content: `Oi, {primeiro_nome}! ${intro}Tudo certo por aqui, queria só te lembrar: ${cleanBody || cleanHook} Abraços!`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 14 (Exclusiva)`,
      content: `Olá, {primeiro_nome}! {saudacao}! ${intro}Preparamos isso especialmente para você: ${cleanBody || cleanHook} Que tal aproveitar?`,
      category: cleanTopic,
    },
    {
      title: `${cleanTopic} - Opção 15 (Conexão)`,
      content: `Ei, {primeiro_nome}! {saudacao}! ${intro}Notei esse ponto importante: ${cleanBody || cleanHook} Seguimos juntos!`,
      category: cleanTopic,
    },
  ];

  return pool.slice(0, Math.max(1, Math.min(quantity, pool.length)));
}

// Fallback General Templates
function generateFallbackTemplates(category: string, businessType?: string) {
  const cat = category || 'Geral';
  return [
    {
      title: `Modelo 1 - ${cat}`,
      content: `{saudacao}, {primeiro_nome}! Passando para informar sobre ${cat}. Se precisar de suporte, estamos à disposição!`,
      category: cat,
    },
    {
      title: `Modelo 2 - ${cat}`,
      content: `Olá, {nome}! Tudo bem com você? {saudacao}! Gostaríamos de compartilhar uma atualização sobre ${cat}. Conte conosco!`,
      category: cat,
    },
    {
      title: `Modelo 3 - ${cat}`,
      content: `{saudacao}, {primeiro_nome}! Aqui é da ${businessType || 'nossa equipe'}. Lembramos que ${cat} está disponível para você.`,
      category: cat,
    },
  ];
}

// Fallback Local Contact Classifier (used when IA is unavailable or high demand)
function classifyContactsLocally(items: any[], knownCategories: string[] = []) {
  const newCategoriesSet = new Set<string>();

  const results = items.map((item, idx) => {
    const raw = String(item.rawName || item.name || '');
    const id = item.id !== undefined ? item.id : idx;

    let cleanName = raw.trim();
    // Remove dots and sequence tags like T18, T19, T20, .T18_
    cleanName = cleanName.replace(/^[.\s_-]+/, '');
    cleanName = cleanName.replace(/(?:^|[\s\.\-_\|\[\(])T[\_\-\s]?\d{1,3}(?:$|[\s\.\-_\|\]\)])/gi, ' ').trim();

    let category = item.currentGroup || 'Agenda de Contatos';
    if (/^T[\_\-\s]?\d{1,3}$/i.test(category)) {
      category = 'Agenda de Contatos';
    }
    let isNewCategory = false;
    let chipId = 'chip_2';
    let chipName = 'WhatsApp Suporte';
    const customFields: Record<string, string> = {};
    const categoryDetails: Record<string, string> = {};

    const upper = raw.toUpperCase();

    // 1. Taxa Zero
    if (upper.includes('TX0') || upper.includes('TXO') || upper.includes('TAXA ZERO') || upper.includes('TAXAZERO')) {
      const dateMatch = raw.match(/(\d{1,2}\/\d{1,2})/);
      category = dateMatch ? `Taxa Zero (${dateMatch[1]})` : 'Taxa Zero';
      customFields['Taxa'] = '0%';
      if (dateMatch) customFields['Data Validade'] = dateMatch[1];
      customFields['Tipo'] = 'Isenção de Taxa';
      chipId = 'chip_2';
      chipName = 'WhatsApp Suporte';
      categoryDetails['type'] = 'taxa_zero';
      categoryDetails['value'] = '0%';
      cleanName = cleanName.replace(/[-_]?(TX0|TXO|TAXA\s*ZERO)[-_]?(.*)$/i, '').trim();
    }
    // 2. Corre e Ganhe (CG05/50, CG05/100, CG10/150, CG10/100, etc.)
    else if (/CG|CORRE\s*E\s*GANHE/i.test(raw)) {
      const cgMatch = upper.match(/CG\s*(\d+)(?:\s*[_\/\-\$]*\s*(\d+))?/i);
      const num = cgMatch ? cgMatch[1] : '';
      const val = cgMatch ? cgMatch[2] : '';

      if (num === '10') {
        const value = val || '150';
        category = `CG 10/${value}`;
        customFields['Meta Corridas'] = '10 corridas';
        customFields['Bônus'] = `R$ ${value}`;
      } else if (num === '05' || num === '5') {
        const value = val || '100';
        category = `CG 05/${value}`;
        customFields['Meta Corridas'] = '5 corridas';
        customFields['Bônus'] = `R$ ${value}`;
      } else {
        category = 'Corre e Ganhe';
        customFields['Campanha'] = 'Corre e Ganhe';
      }
      customFields['Campanha'] = 'Corre e Ganhe';
      chipId = 'chip_1';
      chipName = 'WhatsApp Business';
      categoryDetails['type'] = 'corre_e_ganhe';
      cleanName = cleanName.replace(/[-_]?(CG\s*\d*[\/\-\_\$\s]*\d*|CORRE\s*E\s*GANHE)[-_]?(.*)$/i, '').trim();
    }
    // 3. Correção / Valores
    else if (/CORR|CORRECAO|R\$\s*\d+/i.test(raw)) {
      const valMatch = raw.match(/R\$\s*(\d+)/i) || raw.match(/CORR(?:ECAO)?[_-]?(\d+)/i);
      const val = valMatch ? `R$ ${valMatch[1]}` : 'R$ 50';
      category = `Correção: ${val}`;
      customFields['Valor Correção'] = val;
      customFields['Tipo'] = 'Ajuste / Crédito em Conta';
      customFields['Motivo'] = 'Correção de Saldo';
      chipId = 'chip_2';
      chipName = 'WhatsApp Suporte';
      categoryDetails['type'] = 'correcao';
      categoryDetails['value'] = val;
      cleanName = cleanName.replace(/[-_]?(CORR(?:ECAO)?|R\$\s*\d+)[-_]?(.*)$/i, '').trim();
    }

    cleanName = cleanName.replace(/[-_][\w\d\/$]+$/i, '').trim();
    if (!cleanName) cleanName = raw;

    // Detecção simplificada de gênero
    const firstName = cleanName.split(/\s+/)[0]?.toLowerCase() || '';
    const femaleEndings = ['a', 'eide', 'elly', 'elle', 'ane', 'any', 'ice', 'is', 'ete'];
    const maleNames = ['lucas', 'marcos', 'felipe', 'gabriel', 'rafael', 'daniel', 'alexandre', 'jorge', 'andre', 'filipe', 'pedro', 'paulo', 'jose', 'joao', 'carlos'];
    const femaleNames = ['beatriz', 'alice', 'ines', 'raquel', 'carmen', 'miriam', 'ester', 'ruth'];

    let gender: 'homem' | 'mulher' = 'homem';
    if (femaleNames.includes(firstName) || femaleEndings.some((e) => firstName.endsWith(e))) {
      gender = 'mulher';
    }
    if (maleNames.includes(firstName)) {
      gender = 'homem';
    }

    if (knownCategories.length > 0 && !knownCategories.some((k) => k.toLowerCase() === category.toLowerCase())) {
      isNewCategory = true;
      newCategoriesSet.add(category);
    }

    return {
      id,
      cleanName,
      category,
      isNewCategory,
      chipId,
      chipName,
      gender,
      notes: `Classificado como ${category}`,
      customFields,
      categoryDetails,
    };
  });

  return {
    results,
    newCategoriesDiscovered: Array.from(newCategoriesSet),
  };
}

// Fallback Message Variations (Anti-spam)
function generateFallbackVariations(originalMessage: string) {
  const cleanBody = originalMessage
    .replace(/^(\{saudacao\}|\{primeiro_nome\}|\{nome\}|olá|oi|bom dia|boa tarde|boa noite)[,!\s]*/i, '')
    .trim();

  const body = cleanBody || originalMessage;

  return [
    `Olá, {primeiro_nome}! {saudacao}! Passando para te avisar: ${body} Se precisar de qualquer ajuda, conte comigo!`,
    `{saudacao}, {primeiro_nome}! Tudo bem? Gostaria de compartilhar uma informação importante: ${body} Estamos 100% à disposição por aqui!`,
    `{primeiro_nome}, {saudacao}! Lembrete rápido para você: ${body} Qualquer dúvida é só me chamar!`
  ];
}

// API Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Template Generator
app.post("/api/ai/generate-templates", async (req, res) => {
  const { category, tone, context, businessType } = req.body;
  try {
    const prompt = `Você é um especialista em marketing e comunicação profissional via WhatsApp em português.
Crie 3 opções de modelos de mensagens curtas, amigáveis e diretas para WhatsApp.
Categoria: ${category || 'Lembrete / Notificação'}
Tom de Voz: ${tone || 'Profissional e Cordial'}
Negócio/Contexto: ${businessType || 'Geral'}
Instruções adicionais: ${context || 'Nenhuma'}

Regras:
1. Use variáveis dinâmicas no formato {nome}, {primeiro_nome}, {empresa}, {saudacao}, {data}, {horario}.
2. Mantenha a mensagem engajadora, clara e pronta para envio no WhatsApp (pode usar emojis de forma moderada).
3. Formate a resposta EXCLUSIVAMENTE em formato JSON com o seguinte formato:
{
  "templates": [
    {
      "title": "Nome do Modelo 1",
      "content": "Texto do modelo com {nome}...",
      "category": "Categoria"
    }
  ]
}`;

    const text = await callGemini(prompt, { responseMimeType: "application/json" });
    if (text) {
      const data = JSON.parse(text);
      if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
        return res.json(data);
      }
    }
    return res.json({ templates: generateFallbackTemplates(category, businessType) });
  } catch (error: any) {
    console.warn("Usando fallback de templates devido a erro na IA:", error?.message || error);
    return res.json({ templates: generateFallbackTemplates(category, businessType) });
  }
});

// AI Message Variations (Anti-spam / Variation Generator)
app.post("/api/ai/generate-variations", async (req, res) => {
  const { originalMessage } = req.body;
  try {
    const prompt = `Você é um copywriter profissional especialista em mensagens de WhatsApp e proteção anti-spam.
Dada a mensagem original abaixo, crie 3 variações REAIS E DISTINTAS do texto, reescrevendo as frases com naturalidade, variando conectivos, ordem e vocabulário, para que o WhatsApp não detecte repetição durante envios em massa.

MENSAGEM ORIGINAL:
"${originalMessage}"

DIRETRIZES OBRIGATÓRIAS:
1. Mantenha 100% fiel ao assunto, sentido e informações que o usuário escreveu. NÃO invente novos brindes, valores ou prazos que não estavam no original.
2. Mantenha EXATAMENTE as variáveis do sistema presentes na mensagem ({nome}, {primeiro_nome}, {saudacao}, {empresa}, etc.).
3. Estilos das variações:
   - Variação 1: Tom direto, ágil e claro.
   - Variação 2: Tom cordial, empático e prestativo.
   - Variação 3: Tom conversacional e dinâmico, focado em facilidade.

Responda EXCLUSIVAMENTE no formato JSON:
{
  "variations": [
    "Variação 1...",
    "Variação 2...",
    "Variação 3..."
  ]
}`;

    const text = await callGemini(prompt, { responseMimeType: "application/json" });
    if (text) {
      const data = JSON.parse(text);
      if (data.variations && Array.isArray(data.variations) && data.variations.length > 0) {
        return res.json(data);
      }
    }
    return res.json({ variations: generateFallbackVariations(originalMessage) });
  } catch (error: any) {
    console.warn("Usando fallback de variações devido a erro na IA:", error?.message || error);
    return res.json({ variations: generateFallbackVariations(originalMessage) });
  }
});

// AI Strategic Topic Generator
app.post("/api/ai/generate-topic-templates", async (req, res) => {
  const { topicName, hook, presentation, quantity = 5 } = req.body;
  try {
    const prompt = `Você é um consultor e redator profissional de comunicação estratégica para WhatsApp.
O usuário informou o tópico da campanha e uma mensagem/frase de impacto. Sua tarefa é gerar EXATAMENTE ${quantity} opções de mensagens prontas para envio.

CONTEXTO:
- Tópico / Campanha: "${topicName}"
- Texto Original do Usuário: "${hook}"
- Apresentação do Remetente: "${presentation || 'Não informada'}"

DIRETRIZES RIGOROSAS:
1. GERE EXATAMENTE ${quantity} OPÇÕES DE MENSAGENS!
2. GERE TODAS AS OPÇÕES COMO VARIAÇÕES REAIS DE COPYWRITING DA MENSAGEM DO USUÁRIO!
   - REESCREVA a estrutura com vocabulário diferente, aberturas variadas e ordem de frases alternada (para proteção anti-spam).
   - Mantenha 100% a fidelidade aos fatos, valores e termos que o usuário escreveu (NÃO invente promoções ou valores não mencionados).
   - Use variáveis adequadas: {saudacao} e {primeiro_nome}.
   - Cada opção deve ser um texto diferente, persuasivo, profissional e pronto para envio.

Responda EXCLUSIVAMENTE no formato JSON:
{
  "templates": [
    {
      "title": "${topicName} - Opção 1",
      "content": "...",
      "category": "${topicName}"
    },
    ... (devem ter exatamente ${quantity} itens aqui)
  ]
}`;

    const text = await callGemini(prompt, { responseMimeType: "application/json" });
    if (text) {
      const data = JSON.parse(text);
      if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
        return res.json(data);
      }
    }

    const fallbackTemplates = generateFallbackTopicTemplates(topicName, hook, presentation, quantity);
    return res.json({ templates: fallbackTemplates });
  } catch (error: any) {
    console.warn("Usando fallback de tópicos estratégicos devido a erro na IA:", error?.message || error);
    const fallbackTemplates = generateFallbackTopicTemplates(topicName, hook, presentation, quantity);
    return res.json({ templates: fallbackTemplates });
  }
});

// AI Contact Categorization & Dynamic Custom Fields Extractor
app.post("/api/ai/categorize-contacts", async (req, res) => {
  try {
    const { items, knownCategories = [] } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(400).json({
        error: "Chave GEMINI_API_KEY não configurada no servidor."
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json({ results: [], newCategoriesDiscovered: [] });
    }

    const prompt = `Você é um especialista em processamento de dados e classificação inteligente de contatos/campanhas de WhatsApp no Brasil.
Sua missão é analisar cada contato fornecido, identificar com precisão a categoria/campanha correta e extrair novos campos dinâmicos customizados baseados na categoria detectada.

Categorias já cadastradas no sistema:
${JSON.stringify(knownCategories)}

Lista de contatos/itens a serem analisados:
${JSON.stringify(items)}

REGRAS DE CLASSIFICAÇÃO E EXTRAÇÃO DE NOVOS CAMPOS:
1. **Taxa Zero** (tags como TX0, Tx0, Taxa Zero, TXO, etc.):
   - Categoria: "Taxa Zero" (ou com data caso haja, ex: "Taxa Zero (14/08)").
   - Extrair campos dinâmicos (customFields):
     - "Taxa": "0%"
     - "Data Validade": se houver data na tag (ex: "14/08")
     - "Tipo": "Isenção de Taxa"
   - Chip recomendado: "chip_2" (WhatsApp Suporte).

2. **Correção / Outros Valores** (tags como CORR, CORRECAO, CORR_50, CORRECAO_30, R$ ..., etc.):
   - Categoria: Mapear para a categoria CG correspondente (ex: se for R$ 50, categorizar como "CG 50"; se for R$ 100, categorizar como "CG 100"; se for 10/150, "CG 10/150"; se houver padrão CG como CG 05/50, usar "CG 05/50").
   - Extrair campos dinâmicos (customFields):
     - "Valor Correção": valor identificado (ex: "R$ 50", "R$ 30", "R$ 80", "R$ 100", etc.)
     - "Tipo": "Ajuste / Crédito em Conta"
     - "Motivo": "Correção de Saldo"
     - "Correção": "Sim"
   - Chip recomendado: "chip_1" (WhatsApp Business).

3. **Corre e Ganhe** (tags como CG05, CG5, CG10, CG, CORRE E GANHE, etc.):
   - Se for CG05/CG5 com bônus de R$ 50: Categoria "CG05/50"
   - Se for CG05/CG5 com bônus de R$ 100: Categoria "CG05/100"
   - Se for CG10 (10 corridas): Categoria "CG10"
   - Extrair campos dinâmicos (customFields):
     - "Meta Corridas": ex: "5 corridas" ou "10 corridas"
     - "Bônus": ex: "R$ 50" ou "R$ 100"
     - "Campanha": "Corre e Ganhe"
   - Chip recomendado: "chip_1" (WhatsApp Business).

4. **Novas Categorias / Categorias Diferentes**:
   - Caso apareça qualquer nova categoria diferente (ex: "Desconto de Taxa", "Bônus Indicação", "Reativação", "Incentivo Semanal", etc.):
     - Crie um nome claro e elegante para a categoria.
     - Marque "isNewCategory": true se não estiver na lista de categorias conhecidas.
     - Crie campos dinâmicos específicos no objeto "customFields" com os atributos relevantes encontrados (ex: {"Desconto": "20%", "Prazo": "7 dias"}).

5. **Sem Promoção / Agenda Comum**:
   - Se o contato for apenas um nome comum sem sufixos de promoção: Categoria: "Agenda de Contatos", customFields: {}, chip: "chip_2".

6. **Higienização do Nome**:
   - Limpe o nome removendo pontos no início, underscores e tags promocionais (ex: ".Adalberto Francisco_CG10_$100_P" -> "Adalberto Francisco", "Jaqueline Silva_Tx0_14/08" -> "Jaqueline Silva").

7. **Detecção de Gênero**:
   - "homem" ou "mulher" baseado no primeiro nome brasileiro.

8. **Desconsiderar Códigos de Lote/Turma/Sequência (T18, T19, T20, T01, T02, etc.)**:
   - Códigos no formato T18, T19, T20, T01, T02 são apenas números de sequência/lote e NÃO devem ser usados como nome de categoria nem criados como grupos.
   - Remova esse prefixo/sufixo do nome limpo (ex: ".T18_Aline Alves" -> "Aline Alves").
   - Se o contato não possuir outra tag promocional (como CG ou TX0), a categoria DEVE SER "Agenda de Contatos".

9. **CIDADES, NOMES PRÓPRIOS E 'IMPORTADOS' NÃO SÃO CATEGORIAS**:
   - Nomes de cidades (Aparecida de Goiânia, Goiânia, Trindade, Guapó, Anápolis, Senador Canedo, etc.), nomes de pessoas (Glauber, Fabricio, etc.) ou rótulos de importação ("Importados", "VCF") NUNCA devem ser usados como categoria.
   - Se o contato contiver apenas uma cidade ou nome de pessoa na tag, remova do nome limpo e atribua a categoria "Agenda de Contatos".

Retorne EXCLUSIVAMENTE um JSON no seguinte formato:
{
  "results": [
    {
      "id": "id do contato original ou index",
      "cleanName": "Nome limpo",
      "category": "Nome da Categoria",
      "isNewCategory": true/false,
      "chipId": "chip_1" ou "chip_2",
      "chipName": "WhatsApp Business" ou "WhatsApp Suporte",
      "gender": "homem" ou "mulher",
      "notes": "Observação curta sobre a categoria/benefício",
      "customFields": {
        "Campo 1": "Valor",
        "Campo 2": "Valor"
      },
      "categoryDetails": {
        "type": "taxa_zero" | "correcao" | "corre_e_ganhe" | "outros",
        "value": "R$ 50" ou "0%",
        "target": "5 corridas",
        "deadline": "14/08",
        "tag": "tag original"
      }
    }
  ],
  "newCategoriesDiscovered": ["Lista de nomes das novas categorias encontradas que não estavam em knownCategories"]
}`;

    const text = await callGemini(prompt, { responseMimeType: "application/json" });
    if (text) {
      try {
        const data = JSON.parse(text);
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          return res.json(data);
        }
      } catch {}
    }

    // Fallback gracioso para classificador local inteligente
    const fallbackData = classifyContactsLocally(items, knownCategories);
    return res.json(fallbackData);
  } catch {
    const { items = [], knownCategories = [] } = req.body || {};
    const fallbackData = classifyContactsLocally(items, knownCategories);
    return res.json(fallbackData);
  }
});

// AI Chat Assistant (with actions - optimized for high-speed response)
app.post("/api/ai/assistant", async (req, res) => {
  try {
    const { message, history, contextData } = req.body;

    const recentHistory = Array.isArray(history) ? history.slice(-4) : [];
    const formattedHistory = recentHistory
      .map((h: any) => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.content}`)
      .join('\n');

    const prompt = `Você é o assistente virtual de resposta ultrarrápida do GKD Messenger (sistema de disparo de WhatsApp).
Responda de forma direta, concisa e prestativa em português (máx. 2 a 3 frases).

Comando do usuário: "${message}"

${formattedHistory ? `Histórico recente:\n${formattedHistory}\n` : ''}
Contexto do sistema:
- Total de contatos: ${contextData?.totalContacts || 0}
- Categorias: ${JSON.stringify((contextData?.categories || []).slice(0, 8))}
- Modelos: ${JSON.stringify((contextData?.templates || []).slice(0, 5))}

Ações disponíveis no payload "actions":
- ADD_CONTACT: { "type": "ADD_CONTACT", "payload": { "name": "Nome", "phone": "5511999999999", "group": "Categoria" } }
- EDIT_TEMPLATE: { "type": "EDIT_TEMPLATE", "payload": { "id": "id_ou_nome", "title": "Titulo", "content": "Texto", "category": "Geral" } }
- CREATE_TEMPLATE: { "type": "CREATE_TEMPLATE", "payload": { "title": "Titulo", "content": "Texto", "category": "Geral" } }
- CREATE_CATEGORY: { "type": "CREATE_CATEGORY", "payload": { "name": "Nome da Categoria" } }
- NAVIGATE: { "type": "NAVIGATE", "payload": { "view": "contacts" | "campaigns" | "history" | "dashboard" | "templates" } }

Retorne EXCLUSIVAMENTE um JSON:
{
  "response": "Resposta rápida e amigável.",
  "actions": []
}`;

    const text = await callGemini(prompt, {
      responseMimeType: "application/json",
      maxOutputTokens: 600,
    });

    if (text) {
      try {
        const data = JSON.parse(text);
        if (data && data.response) {
          return res.json(data);
        }
      } catch {}
    }

    return res.json({ response: "Olá! Posso ajudar com a gestão de contatos, criação de mensagens prontas e agendamento de disparos. Como prefere começar?", actions: [] });
  } catch {
    return res.json({ 
      response: "Olá! O assistente está pronto. Como posso auxiliar você no ZapAgendador hoje?",
      actions: []
    });
  }
});

async function start() {
  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      try {
        if (req.path.startsWith("/api")) {
          return next();
        }
        const indexPath = path.join(process.cwd(), "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(req.url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor ZapAgendador rodando em http://0.0.0.0:${PORT}`);
  });
}

start();
