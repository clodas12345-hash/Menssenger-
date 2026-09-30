var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var callGemini = async (prompt, config = {}) => {
  const ai = getGeminiClient();
  if (!ai) return null;
  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config
        });
        if (response && response.text) {
          return response.text;
        }
      } catch (err) {
        const msg = String(err?.message || err);
        const isTemporaryHighDemand = msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE") || msg.includes("429");
        if (isTemporaryHighDemand && attempt === 0) {
          await sleep(750);
          continue;
        }
        break;
      }
    }
  }
  return null;
};
function generateFallbackTopicTemplates(topicName, hook, presentation, quantity = 5) {
  const cleanTopic = topicName?.trim() || "T\xF3pico Estrat\xE9gico";
  const cleanHook = hook?.trim() || "Aproveite esta condi\xE7\xE3o especial!";
  const intro = presentation?.trim() ? `${presentation.trim()}: ` : "";
  const originalMessage = cleanHook.includes("{primeiro_nome}") || cleanHook.includes("{nome}") ? `${intro}${cleanHook}` : `{saudacao}, {primeiro_nome}! ${intro}${cleanHook}`;
  const cleanBody = cleanHook.replace(/^(\{saudacao\}|\{primeiro_nome\}|\{nome\}|olá|oi|bom dia|boa tarde|boa noite)[,!\s]*/i, "").trim();
  const pool = [
    {
      title: `${cleanTopic} - Mensagem 1 (Original)`,
      content: originalMessage,
      category: cleanTopic
    },
    {
      title: `${cleanTopic} - Op\xE7\xE3o 2 (Direta e Objetiva)`,
      content: `Ol\xE1, {primeiro_nome}! {saudacao}! ${intro}Passando para te avisar: ${cleanBody || cleanHook} Se precisar de qualquer ajuda, conte comigo!`,
      category: cleanTopic
    },
    {
      title: `${cleanTopic} - Op\xE7\xE3o 3 (Cordial e Preventiva)`,
      content: `{saudacao}, {primeiro_nome}! Tudo bem? ${intro}Gostaria de compartilhar uma informa\xE7\xE3o importante: ${cleanBody || cleanHook} Estamos 100% \xE0 disposi\xE7\xE3o por aqui!`,
      category: cleanTopic
    },
    {
      title: `${cleanTopic} - Op\xE7\xE3o 4 (\xC1gil e Pr\xE1tica)`,
      content: `{primeiro_nome}, {saudacao}! ${intro}Lembrete r\xE1pido para voc\xEA: ${cleanBody || cleanHook} Qualquer d\xFAvida \xE9 s\xF3 me chamar!`,
      category: cleanTopic
    },
    {
      title: `${cleanTopic} - Op\xE7\xE3o 5 (Conversacional)`,
      content: `Oi, {primeiro_nome}! {saudacao}! ${intro}Espero que esteja tudo bem. Queria te passar este comunicado: ${cleanBody || cleanHook} Conte com nosso suporte sempre!`,
      category: cleanTopic
    }
  ];
  return pool.slice(0, Math.max(1, Math.min(quantity, pool.length)));
}
function generateFallbackTemplates(category, businessType) {
  const cat = category || "Geral";
  return [
    {
      title: `Modelo 1 - ${cat}`,
      content: `{saudacao}, {primeiro_nome}! Passando para informar sobre ${cat}. Se precisar de suporte, estamos \xE0 disposi\xE7\xE3o!`,
      category: cat
    },
    {
      title: `Modelo 2 - ${cat}`,
      content: `Ol\xE1, {nome}! Tudo bem com voc\xEA? {saudacao}! Gostar\xEDamos de compartilhar uma atualiza\xE7\xE3o sobre ${cat}. Conte conosco!`,
      category: cat
    },
    {
      title: `Modelo 3 - ${cat}`,
      content: `{saudacao}, {primeiro_nome}! Aqui \xE9 da ${businessType || "nossa equipe"}. Lembramos que ${cat} est\xE1 dispon\xEDvel para voc\xEA.`,
      category: cat
    }
  ];
}
function classifyContactsLocally(items, knownCategories = []) {
  const newCategoriesSet = /* @__PURE__ */ new Set();
  const results = items.map((item, idx) => {
    const raw = String(item.rawName || item.name || "");
    const id = item.id !== void 0 ? item.id : idx;
    let cleanName = raw.trim();
    cleanName = cleanName.replace(/^[.\s_-]+/, "");
    cleanName = cleanName.replace(/(?:^|[\s\.\-_\|\[\(])T[\_\-\s]?\d{1,3}(?:$|[\s\.\-_\|\]\)])/gi, " ").trim();
    let category = item.currentGroup || "Agenda de Contatos";
    if (/^T[\_\-\s]?\d{1,3}$/i.test(category)) {
      category = "Agenda de Contatos";
    }
    let isNewCategory = false;
    let chipId = "chip_2";
    let chipName = "WhatsApp Suporte";
    const customFields = {};
    const categoryDetails = {};
    const upper = raw.toUpperCase();
    if (upper.includes("TX0") || upper.includes("TXO") || upper.includes("TAXA ZERO") || upper.includes("TAXAZERO")) {
      const dateMatch = raw.match(/(\d{1,2}\/\d{1,2})/);
      category = dateMatch ? `Taxa Zero (${dateMatch[1]})` : "Taxa Zero";
      customFields["Taxa"] = "0%";
      if (dateMatch) customFields["Data Validade"] = dateMatch[1];
      customFields["Tipo"] = "Isen\xE7\xE3o de Taxa";
      chipId = "chip_2";
      chipName = "WhatsApp Suporte";
      categoryDetails["type"] = "taxa_zero";
      categoryDetails["value"] = "0%";
      cleanName = cleanName.replace(/[-_]?(TX0|TXO|TAXA\s*ZERO)[-_]?(.*)$/i, "").trim();
    } else if (/CG|CORRE\s*E\s*GANHE/i.test(raw)) {
      const cgMatch = upper.match(/CG\s*(\d+)(?:\s*[_\/\-\$]*\s*(\d+))?/i);
      const num = cgMatch ? cgMatch[1] : "";
      const val = cgMatch ? cgMatch[2] : "";
      if (num === "10") {
        const value = val || "150";
        category = `CG 10/${value}`;
        customFields["Meta Corridas"] = "10 corridas";
        customFields["B\xF4nus"] = `R$ ${value}`;
      } else if (num === "05" || num === "5") {
        const value = val || "100";
        category = `CG 05/${value}`;
        customFields["Meta Corridas"] = "5 corridas";
        customFields["B\xF4nus"] = `R$ ${value}`;
      } else {
        category = "Corre e Ganhe";
        customFields["Campanha"] = "Corre e Ganhe";
      }
      customFields["Campanha"] = "Corre e Ganhe";
      chipId = "chip_1";
      chipName = "WhatsApp Business";
      categoryDetails["type"] = "corre_e_ganhe";
      cleanName = cleanName.replace(/[-_]?(CG\s*\d*[\/\-\_\$\s]*\d*|CORRE\s*E\s*GANHE)[-_]?(.*)$/i, "").trim();
    } else if (/CORR|CORRECAO|R\$\s*\d+/i.test(raw)) {
      const valMatch = raw.match(/R\$\s*(\d+)/i) || raw.match(/CORR(?:ECAO)?[_-]?(\d+)/i);
      const val = valMatch ? `R$ ${valMatch[1]}` : "R$ 50";
      category = `Corre\xE7\xE3o: ${val}`;
      customFields["Valor Corre\xE7\xE3o"] = val;
      customFields["Tipo"] = "Ajuste / Cr\xE9dito em Conta";
      customFields["Motivo"] = "Corre\xE7\xE3o de Saldo";
      chipId = "chip_2";
      chipName = "WhatsApp Suporte";
      categoryDetails["type"] = "correcao";
      categoryDetails["value"] = val;
      cleanName = cleanName.replace(/[-_]?(CORR(?:ECAO)?|R\$\s*\d+)[-_]?(.*)$/i, "").trim();
    }
    cleanName = cleanName.replace(/[-_][\w\d\/$]+$/i, "").trim();
    if (!cleanName) cleanName = raw;
    const firstName = cleanName.split(/\s+/)[0]?.toLowerCase() || "";
    const femaleEndings = ["a", "eide", "elly", "elle", "ane", "any", "ice", "is", "ete"];
    const maleNames = ["lucas", "marcos", "felipe", "gabriel", "rafael", "daniel", "alexandre", "jorge", "andre", "filipe", "pedro", "paulo", "jose", "joao", "carlos"];
    const femaleNames = ["beatriz", "alice", "ines", "raquel", "carmen", "miriam", "ester", "ruth"];
    let gender = "homem";
    if (femaleNames.includes(firstName) || femaleEndings.some((e) => firstName.endsWith(e))) {
      gender = "mulher";
    }
    if (maleNames.includes(firstName)) {
      gender = "homem";
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
      categoryDetails
    };
  });
  return {
    results,
    newCategoriesDiscovered: Array.from(newCategoriesSet)
  };
}
function generateFallbackVariations(originalMessage) {
  const cleanBody = originalMessage.replace(/^(\{saudacao\}|\{primeiro_nome\}|\{nome\}|olá|oi|bom dia|boa tarde|boa noite)[,!\s]*/i, "").trim();
  const body = cleanBody || originalMessage;
  return [
    `Ol\xE1, {primeiro_nome}! {saudacao}! Passando para te avisar: ${body} Se precisar de qualquer ajuda, conte comigo!`,
    `{saudacao}, {primeiro_nome}! Tudo bem? Gostaria de compartilhar uma informa\xE7\xE3o importante: ${body} Estamos 100% \xE0 disposi\xE7\xE3o por aqui!`,
    `{primeiro_nome}, {saudacao}! Lembrete r\xE1pido para voc\xEA: ${body} Qualquer d\xFAvida \xE9 s\xF3 me chamar!`
  ];
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/ai/generate-templates", async (req, res) => {
  const { category, tone, context, businessType } = req.body;
  try {
    const prompt = `Voc\xEA \xE9 um especialista em marketing e comunica\xE7\xE3o profissional via WhatsApp em portugu\xEAs.
Crie 3 op\xE7\xF5es de modelos de mensagens curtas, amig\xE1veis e diretas para WhatsApp.
Categoria: ${category || "Lembrete / Notifica\xE7\xE3o"}
Tom de Voz: ${tone || "Profissional e Cordial"}
Neg\xF3cio/Contexto: ${businessType || "Geral"}
Instru\xE7\xF5es adicionais: ${context || "Nenhuma"}

Regras:
1. Use vari\xE1veis din\xE2micas no formato {nome}, {primeiro_nome}, {empresa}, {saudacao}, {data}, {horario}.
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
  } catch (error) {
    console.warn("Usando fallback de templates devido a erro na IA:", error?.message || error);
    return res.json({ templates: generateFallbackTemplates(category, businessType) });
  }
});
app.post("/api/ai/generate-variations", async (req, res) => {
  const { originalMessage } = req.body;
  try {
    const prompt = `Voc\xEA \xE9 um copywriter profissional especialista em mensagens de WhatsApp e prote\xE7\xE3o anti-spam.
Dada a mensagem original abaixo, crie 3 varia\xE7\xF5es REAIS E DISTINTAS do texto, reescrevendo as frases com naturalidade, variando conectivos, ordem e vocabul\xE1rio, para que o WhatsApp n\xE3o detecte repeti\xE7\xE3o durante envios em massa.

MENSAGEM ORIGINAL:
"${originalMessage}"

DIRETRIZES OBRIGAT\xD3RIAS:
1. Mantenha 100% fiel ao assunto, sentido e informa\xE7\xF5es que o usu\xE1rio escreveu. N\xC3O invente novos brindes, valores ou prazos que n\xE3o estavam no original.
2. Mantenha EXATAMENTE as vari\xE1veis do sistema presentes na mensagem ({nome}, {primeiro_nome}, {saudacao}, {empresa}, etc.).
3. Estilos das varia\xE7\xF5es:
   - Varia\xE7\xE3o 1: Tom direto, \xE1gil e claro.
   - Varia\xE7\xE3o 2: Tom cordial, emp\xE1tico e prestativo.
   - Varia\xE7\xE3o 3: Tom conversacional e din\xE2mico, focado em facilidade.

Responda EXCLUSIVAMENTE no formato JSON:
{
  "variations": [
    "Varia\xE7\xE3o 1...",
    "Varia\xE7\xE3o 2...",
    "Varia\xE7\xE3o 3..."
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
  } catch (error) {
    console.warn("Usando fallback de varia\xE7\xF5es devido a erro na IA:", error?.message || error);
    return res.json({ variations: generateFallbackVariations(originalMessage) });
  }
});
app.post("/api/ai/generate-topic-templates", async (req, res) => {
  const { topicName, hook, presentation, quantity = 5 } = req.body;
  try {
    const prompt = `Voc\xEA \xE9 um consultor e redator profissional de comunica\xE7\xE3o estrat\xE9gica para WhatsApp.
O usu\xE1rio informou o t\xF3pico da campanha e uma mensagem/frase de impacto. Sua tarefa \xE9 gerar ${quantity} op\xE7\xF5es de mensagens prontas para envio.

CONTEXTO:
- T\xF3pico / Campanha: "${topicName}"
- Texto Original do Usu\xE1rio: "${hook}"
- Apresenta\xE7\xE3o do Remetente: "${presentation || "N\xE3o informada"}"

DIRETRIZES RIGOROSAS:
1. OP\xC7\xC3O 1 (Mensagem 1): DEVE SER RIGOROSAMENTE A MENSAGEM ORIGINAL DO USU\xC1RIO, preservando 100% das suas palavras e sentido, apenas adicionando a sauda\xE7\xE3o inicial ({saudacao}, {primeiro_nome}!) e a apresenta\xE7\xE3o se informada.
2. OP\xC7\xD5ES SEGUINTES (Op\xE7\xE3o 2 at\xE9 Op\xE7\xE3o ${quantity}): DEVEM SER VARIA\xC7\xD5ES REAIS DE COPYWRITING DA MENSAGEM DO USU\xC1RIO!
   - REESCREVA a estrutura com vocabul\xE1rio diferente, aberturas variadas e ordem de frases alternada (para prote\xE7\xE3o anti-spam).
   - Mantenha 100% a fidelidade aos fatos, valores e termos que o usu\xE1rio escreveu (N\xC3O invente promo\xE7\xF5es ou valores n\xE3o mencionados).
   - Use vari\xE1veis adequadas: {saudacao} e {primeiro_nome}.
   - Cada op\xE7\xE3o deve ser um texto diferente, persuasivo, profissional e pronto para envio.

Responda EXCLUSIVAMENTE no formato JSON:
{
  "templates": [
    {
      "title": "${topicName} - Mensagem 1 (Original)",
      "content": "...",
      "category": "${topicName}"
    },
    {
      "title": "${topicName} - Op\xE7\xE3o 2 (Direta)",
      "content": "...",
      "category": "${topicName}"
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
    const fallbackTemplates = generateFallbackTopicTemplates(topicName, hook, presentation, quantity);
    return res.json({ templates: fallbackTemplates });
  } catch (error) {
    console.warn("Usando fallback de t\xF3picos estrat\xE9gicos devido a erro na IA:", error?.message || error);
    const fallbackTemplates = generateFallbackTopicTemplates(topicName, hook, presentation, quantity);
    return res.json({ templates: fallbackTemplates });
  }
});
app.post("/api/ai/categorize-contacts", async (req, res) => {
  try {
    const { items, knownCategories = [] } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: "Chave GEMINI_API_KEY n\xE3o configurada no servidor."
      });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json({ results: [], newCategoriesDiscovered: [] });
    }
    const prompt = `Voc\xEA \xE9 um especialista em processamento de dados e classifica\xE7\xE3o inteligente de contatos/campanhas de WhatsApp no Brasil.
Sua miss\xE3o \xE9 analisar cada contato fornecido, identificar com precis\xE3o a categoria/campanha correta e extrair novos campos din\xE2micos customizados baseados na categoria detectada.

Categorias j\xE1 cadastradas no sistema:
${JSON.stringify(knownCategories)}

Lista de contatos/itens a serem analisados:
${JSON.stringify(items)}

REGRAS DE CLASSIFICA\xC7\xC3O E EXTRA\xC7\xC3O DE NOVOS CAMPOS:
1. **Taxa Zero** (tags como TX0, Tx0, Taxa Zero, TXO, etc.):
   - Categoria: "Taxa Zero" (ou com data caso haja, ex: "Taxa Zero (14/08)").
   - Extrair campos din\xE2micos (customFields):
     - "Taxa": "0%"
     - "Data Validade": se houver data na tag (ex: "14/08")
     - "Tipo": "Isen\xE7\xE3o de Taxa"
   - Chip recomendado: "chip_2" (WhatsApp Suporte).

2. **Corre\xE7\xE3o / Outros Valores** (tags como CORR, CORRECAO, CORR_50, CORRECAO_30, R$ ..., etc.):
   - Categoria: Mapear para a categoria CG correspondente (ex: se for R$ 50, categorizar como "CG 50"; se for R$ 100, categorizar como "CG 100"; se for 10/150, "CG 10/150"; se houver padr\xE3o CG como CG 05/50, usar "CG 05/50").
   - Extrair campos din\xE2micos (customFields):
     - "Valor Corre\xE7\xE3o": valor identificado (ex: "R$ 50", "R$ 30", "R$ 80", "R$ 100", etc.)
     - "Tipo": "Ajuste / Cr\xE9dito em Conta"
     - "Motivo": "Corre\xE7\xE3o de Saldo"
     - "Corre\xE7\xE3o": "Sim"
   - Chip recomendado: "chip_1" (WhatsApp Business).

3. **Corre e Ganhe** (tags como CG05, CG5, CG10, CG, CORRE E GANHE, etc.):
   - Se for CG05/CG5 com b\xF4nus de R$ 50: Categoria "CG05/50"
   - Se for CG05/CG5 com b\xF4nus de R$ 100: Categoria "CG05/100"
   - Se for CG10 (10 corridas): Categoria "CG10"
   - Extrair campos din\xE2micos (customFields):
     - "Meta Corridas": ex: "5 corridas" ou "10 corridas"
     - "B\xF4nus": ex: "R$ 50" ou "R$ 100"
     - "Campanha": "Corre e Ganhe"
   - Chip recomendado: "chip_1" (WhatsApp Business).

4. **Novas Categorias / Categorias Diferentes**:
   - Caso apare\xE7a qualquer nova categoria diferente (ex: "Desconto de Taxa", "B\xF4nus Indica\xE7\xE3o", "Reativa\xE7\xE3o", "Incentivo Semanal", etc.):
     - Crie um nome claro e elegante para a categoria.
     - Marque "isNewCategory": true se n\xE3o estiver na lista de categorias conhecidas.
     - Crie campos din\xE2micos espec\xEDficos no objeto "customFields" com os atributos relevantes encontrados (ex: {"Desconto": "20%", "Prazo": "7 dias"}).

5. **Sem Promo\xE7\xE3o / Agenda Comum**:
   - Se o contato for apenas um nome comum sem sufixos de promo\xE7\xE3o: Categoria: "Agenda de Contatos", customFields: {}, chip: "chip_2".

6. **Higieniza\xE7\xE3o do Nome**:
   - Limpe o nome removendo pontos no in\xEDcio, underscores e tags promocionais (ex: ".Adalberto Francisco_CG10_$100_P" -> "Adalberto Francisco", "Jaqueline Silva_Tx0_14/08" -> "Jaqueline Silva").

7. **Detec\xE7\xE3o de G\xEAnero**:
   - "homem" ou "mulher" baseado no primeiro nome brasileiro.

8. **Desconsiderar C\xF3digos de Lote/Turma/Sequ\xEAncia (T18, T19, T20, T01, T02, etc.)**:
   - C\xF3digos no formato T18, T19, T20, T01, T02 s\xE3o apenas n\xFAmeros de sequ\xEAncia/lote e N\xC3O devem ser usados como nome de categoria nem criados como grupos.
   - Remova esse prefixo/sufixo do nome limpo (ex: ".T18_Aline Alves" -> "Aline Alves").
   - Se o contato n\xE3o possuir outra tag promocional (como CG ou TX0), a categoria DEVE SER "Agenda de Contatos".

9. **CIDADES, NOMES PR\xD3PRIOS E 'IMPORTADOS' N\xC3O S\xC3O CATEGORIAS**:
   - Nomes de cidades (Aparecida de Goi\xE2nia, Goi\xE2nia, Trindade, Guap\xF3, An\xE1polis, Senador Canedo, etc.), nomes de pessoas (Glauber, Fabricio, etc.) ou r\xF3tulos de importa\xE7\xE3o ("Importados", "VCF") NUNCA devem ser usados como categoria.
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
      "notes": "Observa\xE7\xE3o curta sobre a categoria/benef\xEDcio",
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
  "newCategoriesDiscovered": ["Lista de nomes das novas categorias encontradas que n\xE3o estavam em knownCategories"]
}`;
    const text = await callGemini(prompt, { responseMimeType: "application/json" });
    if (text) {
      try {
        const data = JSON.parse(text);
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          return res.json(data);
        }
      } catch {
      }
    }
    const fallbackData = classifyContactsLocally(items, knownCategories);
    return res.json(fallbackData);
  } catch {
    const { items = [], knownCategories = [] } = req.body || {};
    const fallbackData = classifyContactsLocally(items, knownCategories);
    return res.json(fallbackData);
  }
});
app.post("/api/ai/assistant", async (req, res) => {
  try {
    const { message, history, contextData } = req.body;
    const recentHistory = Array.isArray(history) ? history.slice(-4) : [];
    const formattedHistory = recentHistory.map((h) => `${h.role === "user" ? "Usu\xE1rio" : "Assistente"}: ${h.content}`).join("\n");
    const prompt = `Voc\xEA \xE9 o assistente virtual de resposta ultrarr\xE1pida do GKD Messenger (sistema de disparo de WhatsApp).
Responda de forma direta, concisa e prestativa em portugu\xEAs (m\xE1x. 2 a 3 frases).

Comando do usu\xE1rio: "${message}"

${formattedHistory ? `Hist\xF3rico recente:
${formattedHistory}
` : ""}
Contexto do sistema:
- Total de contatos: ${contextData?.totalContacts || 0}
- Categorias: ${JSON.stringify((contextData?.categories || []).slice(0, 8))}
- Modelos: ${JSON.stringify((contextData?.templates || []).slice(0, 5))}

A\xE7\xF5es dispon\xEDveis no payload "actions":
- ADD_CONTACT: { "type": "ADD_CONTACT", "payload": { "name": "Nome", "phone": "5511999999999", "group": "Categoria" } }
- EDIT_TEMPLATE: { "type": "EDIT_TEMPLATE", "payload": { "id": "id_ou_nome", "title": "Titulo", "content": "Texto", "category": "Geral" } }
- CREATE_TEMPLATE: { "type": "CREATE_TEMPLATE", "payload": { "title": "Titulo", "content": "Texto", "category": "Geral" } }
- CREATE_CATEGORY: { "type": "CREATE_CATEGORY", "payload": { "name": "Nome da Categoria" } }
- NAVIGATE: { "type": "NAVIGATE", "payload": { "view": "contacts" | "campaigns" | "history" | "dashboard" | "templates" } }

Retorne EXCLUSIVAMENTE um JSON:
{
  "response": "Resposta r\xE1pida e amig\xE1vel.",
  "actions": []
}`;
    const text = await callGemini(prompt, {
      responseMimeType: "application/json",
      maxOutputTokens: 600
    });
    if (text) {
      try {
        const data = JSON.parse(text);
        if (data && data.response) {
          return res.json(data);
        }
      } catch {
      }
    }
    return res.json({ response: "Ol\xE1! Posso ajudar com a gest\xE3o de contatos, cria\xE7\xE3o de mensagens prontas e agendamento de disparos. Como prefere come\xE7ar?", actions: [] });
  } catch {
    return res.json({
      response: "Ol\xE1! O assistente est\xE1 pronto. Como posso auxiliar voc\xEA no ZapAgendador hoje?",
      actions: []
    });
  }
});
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      try {
        if (req.path.startsWith("/api")) {
          return next();
        }
        const indexPath = import_path.default.join(process.cwd(), "index.html");
        let template = import_fs.default.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(req.url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor ZapAgendador rodando em http://0.0.0.0:${PORT}`);
  });
}
start();
//# sourceMappingURL=server.cjs.map
