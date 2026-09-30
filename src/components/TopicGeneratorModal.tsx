import React, { useState } from 'react';
import { Sparkles, X, Loader2, MessageSquare, Megaphone, User, Hash, Plus, Trash2, Bot, Check, CheckSquare } from 'lucide-react';
import { MessageTemplate } from '../types';

interface TopicGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTopic: (topicName: string, templates: Omit<MessageTemplate, 'id' | 'createdAt'>[]) => void;
}

export const TopicGeneratorModal: React.FC<TopicGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSaveTopic,
}) => {
  const [topicName, setTopicName] = useState<string>('');
  const [hook, setHook] = useState<string>('');
  const [presentation, setPresentation] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [generatedResults, setGeneratedResults] = useState<
    { title: string; content: string; category: string }[]
  >([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  if (!isOpen) return null;

  const generateLocalVariations = (
    cleanTopic: string,
    cleanHook: string,
    presentation: string,
    reqQty: number
  ) => {
    const intro = presentation.trim() ? `${presentation.trim()}: ` : '';
    const cleanBody = cleanHook
      .replace(/^(\{saudacao\}|\{saudação\}|\{primeiro_nome\}|\{nome\}|olá|oi|bom dia|boa tarde|boa noite)[,!\s]*/i, '')
      .trim() || cleanHook;

    const variationTemplates = [
      {
        tag: 'Direta e Objetiva',
        content: `Olá, {primeiro_nome}! {saudacao}! ${intro}Passando para te avisar: ${cleanBody} Se precisar de qualquer ajuda, conte comigo!`
      },
      {
        tag: 'Cordial e Preventiva',
        content: `{saudacao}, {primeiro_nome}! Tudo bem? ${intro}Gostaria de compartilhar uma informação importante: ${cleanBody} Estamos 100% à disposição por aqui!`
      },
      {
        tag: 'Ágil e Prática',
        content: `{primeiro_nome}, {saudacao}! ${intro}Lembrete rápido para você: ${cleanBody} Qualquer dúvida é só me chamar!`
      },
      {
        tag: 'Conversacional e Atenciosa',
        content: `Oi, {primeiro_nome}! {saudacao}! ${intro}Espero que esteja tudo bem. Queria te passar este comunicado: ${cleanBody} Conte com nosso suporte sempre!`
      },
      {
        tag: 'Foco na Oportunidade',
        content: `{saudacao}, {primeiro_nome}! ${intro}Atenção para esta oportunidade incrível: ${cleanBody} Não deixe de aproveitar hoje mesmo!`
      },
      {
        tag: 'Informativa e Clara',
        content: `Olá {primeiro_nome}, {saudacao}! ${intro}Aviso importante para você: ${cleanBody} Se precisar de orientação, estou à disposição.`
      },
      {
        tag: 'Lembrete Amigável',
        content: `Oi {primeiro_nome}! {saudacao}! ${intro}Passando rápido para lembrar: ${cleanBody} Dúvidas? Fale comigo!`
      },
      {
        tag: 'Estratégica e Prioritária',
        content: `{saudacao}, {primeiro_nome}! ${intro}Recado prioritário: ${cleanBody} Bora aproveitar essa oportunidade?`
      },
      {
        tag: 'Motivacional e Positiva',
        content: `Olá, {primeiro_nome}! {saudacao}! ${intro}Excelente dia pra você! Olha só: ${cleanBody} Sucesso e ótimos resultados!`
      },
      {
        tag: 'Exclusiva e Personalizada',
        content: `{saudacao}, {primeiro_nome}! ${intro}Selecionamos esta mensagem especial para você: ${cleanBody} Qualquer ajuda extra, me avise!`
      },
      {
        tag: 'Urgente e Relevante',
        content: `Atenção, {primeiro_nome}! {saudacao}! ${intro}Informação relevante: ${cleanBody} Aproveite enquanto está disponível!`
      },
      {
        tag: 'Proativa e Direta',
        content: `Oi, {primeiro_nome}! {saudacao}! ${intro}Estou passando para te manter atualizado: ${cleanBody} Conte comigo no que precisar!`
      },
      {
        tag: 'Suporte e Parceria',
        content: `{saudacao}, {primeiro_nome}! ${intro}Como seu parceiro por aqui, venho te lembrar: ${cleanBody} Qualquer dúvida, estou online!`
      },
      {
        tag: 'Ação Rápida',
        content: `Olá {primeiro_nome}! {saudacao}! ${intro}Recado de ação rápida: ${cleanBody} Vamos em frente?`
      },
      {
        tag: 'Fechamento Eficiente',
        content: `{saudacao}, {primeiro_nome}! ${intro}Último lembrete: ${cleanBody} Fico no seu aguardo para te ajudar!`
      }
    ];

    return variationTemplates.slice(0, Math.max(1, Math.min(15, reqQty))).map((vt, i) => ({
      title: `${cleanTopic} - Opção ${i + 1} (${vt.tag})`,
      content: vt.content,
      category: cleanTopic,
    }));
  };

  const normalizePlaceholders = (text: string, originalHook: string): string => {
    if (!text) return '';
    let processed = text;

    // 1. First, normalize common placeholders
    // Name placeholders
    const namePattern = /\{\{\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*\}\}|\{\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*\}|\[\s*(primeiro_nome|primeironome|primeiro\s+nome|nome|name|first_name|firstname|nome\s+do\s+contato|nome\s+do\s+motorista|contato|motorista)\s*\]|<\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*>|%\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*%/gi;
    processed = processed.replace(namePattern, '{primeiro_nome}');

    // Greeting placeholders
    const greetingPattern = /\{\{\s*sauda[çc][ãa]o(?:_horario)?\s*\}\}|\{\s*sauda[çc][ãa]o(?:_horario)?\s*\}|\[\s*sauda[çc][ãa]o(?:\s+do\s+hor[áa]rio)?\s*\]|<\s*sauda[çc][ãa]o(?:_horario)?\s*>|%\s*sauda[çc][ãa]o(?:_horario)?\s*%/gi;
    processed = processed.replace(greetingPattern, '{saudacao}');

    // 2. If the AI generated literal sample names, normalize them
    processed = processed.replace(/\b(Olá|Oi|Bom dia|Boa tarde|Boa noite)[,!\s]+(Fulano|Maria|João|Cláudio|Motorista|Parceiro|Amigo)\b/gi, '{saudacao}, {primeiro_nome}');
    
    // 3. Prevent duplicate placeholders
    processed = processed.replace(/\{saudacao\}[,!\s]*\{saudacao\}/gi, '{saudacao}');
    processed = processed.replace(/\{primeiro_nome\}[,!\s]*\{primeiro_nome\}/gi, '{primeiro_nome}');

    // 4. Ensure variables from original hook are kept
    const originalHasName = /\{primeiro_nome\}|\{nome\}|\[nome\]/i.test(originalHook);
    const originalHasGreeting = /\{saudacao\}|\{saudação\}|\[saudação\]|\[saudacao\]/i.test(originalHook);

    const processedHasName = processed.includes('{primeiro_nome}');
    const processedHasGreeting = processed.includes('{saudacao}');

    if (originalHasGreeting && !processedHasGreeting) {
      processed = `{saudacao}, ${processed}`;
    }
    if (originalHasName && !processedHasName) {
      if (processed.startsWith('{saudacao}')) {
        processed = processed.replace('{saudacao}', '{saudacao}, {primeiro_nome}');
      } else {
        processed = `{primeiro_nome}! ${processed}`;
      }
    }

    // Clean up punctuation caused by replacements
    processed = processed
      .replace(/,\s*,/g, ',')
      .replace(/!\s*!/g, '!')
      .replace(/\?\s*\?/g, '?')
      .replace(/,\s*!/g, '!')
      .replace(/;\s*;/g, ';');

    return processed;
  };

  const handleGenerate = async () => {
    if (!topicName.trim() || !hook.trim()) {
      setErrorMsg('Por favor, preencha o nome do tópico e a frase de impacto.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const cleanTopic = topicName.trim();
    const cleanHook = hook.trim();

    try {
      const res = await fetch('/api/ai/generate-topic-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topicName: cleanTopic, 
          hook: cleanHook, 
          presentation, 
          quantity 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao comunicar com a IA');
      }
      if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
        let adjustedTemplates = data.templates.map((t: any, i: number) => {
          return {
            ...t,
            title: t.title || `${cleanTopic} - Opção ${i + 1}`,
            content: normalizePlaceholders(t.content || '', cleanHook),
            category: cleanTopic,
          };
        });

        // If returned fewer than requested quantity, complement with local generator
        if (adjustedTemplates.length < quantity) {
          const localExtras = generateLocalVariations(cleanTopic, cleanHook, presentation, quantity);
          adjustedTemplates = [...adjustedTemplates, ...localExtras.slice(adjustedTemplates.length)];
        }

        setGeneratedResults(adjustedTemplates);
        setSelectedIndices(adjustedTemplates.map((_, i) => i));
      } else {
        throw new Error('Formato de resposta inesperado');
      }
    } catch (err: any) {
      console.warn('Usando gerador inteligente local:', err);
      const localFallback = generateLocalVariations(cleanTopic, cleanHook, presentation, quantity).map(t => ({
        ...t,
        content: normalizePlaceholders(t.content, cleanHook)
      }));
      setGeneratedResults(localFallback);
      setSelectedIndices(localFallback.map((_, i) => i));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectIndex = (idx: number) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleUpdateItemContent = (index: number, newText: string) => {
    setGeneratedResults((prev) =>
      prev.map((item, i) => (i === index ? { ...item, content: newText } : item))
    );
  };

  const handleSaveAll = () => {
    if (generatedResults.length === 0) return;
    onSaveTopic(topicName, generatedResults);
    handleReset();
    onClose();
  };

  const handleSaveSelected = () => {
    const chosen = generatedResults.filter((_, idx) => selectedIndices.includes(idx));
    if (chosen.length === 0) return;
    onSaveTopic(topicName, chosen);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setTopicName('');
    setHook('');
    setPresentation('');
    setQuantity(5);
    setGeneratedResults([]);
    setSelectedIndices([]);
    setErrorMsg('');
  };

  const removeResult = (index: number) => {
    setGeneratedResults((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndices((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0C10]/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl w-full max-w-3xl text-gray-100 shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1F2229] flex items-center justify-between bg-[#0F1115] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500/10 text-purple-400 p-2 rounded-xl border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gerador Estratégico</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">IA GKD Mobility</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-[#1F2229] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto custom-scrollbar pb-20">
          {/* Form Side */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center space-x-2">
                  <MessageSquare className="w-3 h-3 text-purple-400" />
                  <span>Nome do Tópico</span>
                </label>
                <input
                  type="text"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="Ex: Promoção 150"
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center space-x-2">
                  <Megaphone className="w-3 h-3 text-purple-400" />
                  <span>Frase de Impacto</span>
                </label>
                <textarea
                  rows={3}
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder="Ex: Corra e ganhe 150..."
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center space-x-2">
                  <User className="w-3 h-3 text-purple-400" />
                  <span>Apresentação (Opcional)</span>
                </label>
                <input
                  type="text"
                  value={presentation}
                  onChange={(e) => setPresentation(e.target.value)}
                  placeholder="Ex: Consultor GKD"
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-between bg-[#0A0C10] p-3 rounded-xl border border-[#1F2229]">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center space-x-2">
                  <Hash className="w-3 h-3 text-purple-400" />
                  <span>Quantidade</span>
                </label>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg bg-[#1F2229] hover:bg-[#2A2D35] flex items-center justify-center text-white"
                  >-</button>
                  <span className="text-sm font-bold text-white w-4 text-center">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(15, quantity + 1))}
                    className="w-8 h-8 rounded-lg bg-[#1F2229] hover:bg-[#2A2D35] flex items-center justify-center text-white"
                  >+</button>
                </div>
              </div>
            </div>

            <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3">
              <p className="text-[9px] text-purple-400 font-bold mb-2 uppercase">Automações Ativas:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-[#0A0C10] rounded text-[9px] text-gray-400"># Saudação</span>
                <span className="px-2 py-1 bg-[#0A0C10] rounded text-[9px] text-gray-400"># Nome</span>
                <span className="px-2 py-1 bg-[#0A0C10] rounded text-[9px] text-gray-400"># Gênero</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !topicName.trim() || !hook.trim()}
                className="w-full bg-[#A88B4B] hover:bg-[#C5A968] disabled:opacity-50 text-[#0A0C10] font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A0C10]" />
                    <span>Gerando Mensagens com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Gerar {quantity} Variações com IA</span>
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <p className="text-[10px] text-red-400 mt-2 text-center bg-red-400/5 py-2 rounded-lg border border-red-400/10">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Results Side */}
          <div className="bg-[#0A0C10]/50 rounded-2xl border border-[#1F2229] flex flex-col h-[440px]">
            <div className="p-4 border-b border-[#1F2229] flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Mensagens para Aprovação ({generatedResults.length})
                </span>
                <span className="text-[9px] text-gray-500">
                  {generatedResults.length > 0 
                    ? `${selectedIndices.length} de ${generatedResults.length} aprovadas para salvar`
                    : 'Gere ou carregue ao lado para revisar'}
                </span>
              </div>
              {generatedResults.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedIndices.length === generatedResults.length) {
                        setSelectedIndices([]);
                      } else {
                        setSelectedIndices(generatedResults.map((_, i) => i));
                      }
                    }}
                    className="text-[9px] text-[#A88B4B] hover:text-[#C5A968] font-bold uppercase tracking-wider underline"
                  >
                    {selectedIndices.length === generatedResults.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setGeneratedResults([]);
                      setSelectedIndices([]);
                    }}
                    className="text-[9px] text-red-400 hover:text-red-300 uppercase font-bold"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {generatedResults.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40 px-6">
                  <Bot className="w-10 h-10 text-[#A88B4B]" />
                  <p className="text-xs text-gray-300">
                    Preencha os campos ao lado e clique em <strong>"Gerar Mensagens para Revisão"</strong> para ver, aprovar e salvar as opções.
                  </p>
                </div>
              ) : (
                generatedResults.map((tmpl, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 bg-[#0A0C10] border rounded-xl transition-all ${
                        isSelected
                          ? 'border-purple-500/60 bg-purple-950/10'
                          : 'border-[#1F2229] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectIndex(idx)}
                            className="w-4 h-4 rounded border-gray-700 bg-[#0A0C10] text-amber-500 focus:ring-amber-400"
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                            Opção {idx + 1} (Variação IA)
                            {isSelected ? ' [Aprovada]' : ' [Não Selecionada]'}
                          </span>
                        </label>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => removeResult(idx)}
                            className="px-2.5 py-1 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-md transition-all flex items-center space-x-1 border border-red-500/20 cursor-pointer"
                            title="Excluir opção"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase">Excluir</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={tmpl.content}
                        onChange={(e) => handleUpdateItemContent(idx, e.target.value)}
                        rows={3}
                        placeholder="Texto da mensagem..."
                        className="w-full text-[11px] text-gray-200 leading-relaxed font-sans bg-[#15181E] border border-[#1F2229] rounded-lg p-2.5 focus:outline-none focus:border-purple-500 resize-y"
                      />
                    </div>
                  );
                })
              )}
            </div>

            {generatedResults.length > 0 && (
              <div className="p-3 border-t border-[#1F2229] bg-[#0F1115] flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleSaveSelected}
                    disabled={selectedIndices.length === 0}
                    className="w-full bg-[#A88B4B] hover:bg-[#C5A968] disabled:opacity-40 disabled:cursor-not-allowed text-[#0A0C10] font-bold py-2.5 px-3 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salvar Selecionadas ({selectedIndices.length})</span>
                  </button>
                </div>
                {selectedIndices.length < generatedResults.length && (
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="w-full bg-[#1F2229] hover:bg-[#2A2D35] text-gray-300 font-bold py-2 px-3 rounded-xl text-xs uppercase tracking-widest transition-all border border-[#2A2D35] flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Salvar Todas ({generatedResults.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-[#0F1115] border-t border-[#1F2229] flex flex-col items-center space-y-4">
          <p className="text-[10px] text-gray-500 italic text-center">
            A IA cria variações aleatórias para evitar bloqueios no WhatsApp, mantendo sua oferta principal.
          </p>
          <button
            onClick={onClose}
            className="w-full sm:hidden py-3 bg-[#1F2229] text-gray-400 font-bold rounded-xl text-[10px] uppercase tracking-widest border border-[#2A2D35]"
          >
            Voltar para o App
          </button>
        </div>
      </div>
    </div>
  );
};
