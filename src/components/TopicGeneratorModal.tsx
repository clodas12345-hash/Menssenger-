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

  const rephraseBodyText = (text: string, idx: number): string => {
    let res = text.trim();
    // Apply subtle, natural lexical variations per index while keeping numbers/facts/tense 100% intact and singular
    const rules: Array<[RegExp, string[]]> = [
      [/\bvocê tem\b/gi, ['você conta com', 'está disponível para você', 'já está liberado no seu perfil', 'você possui', 'está liberado para você']],
      [/\baproveite\b/gi, ['garanta já', 'não deixe passar', 'aproveite ao máximo', 'tire proveito', 'vem garantir']],
      [/\bcorridas\b/gi, ['viagens', 'corridas', 'corridas no app', 'viagens pela 99', 'corridas pela plataforma']],
      [/\bganhar\b/gi, ['garantir', 'receber', 'faturar', 'conquistar', 'embolsar']],
      [/\bganhe\b/gi, ['garanta', 'receba', 'fature', 'conquiste', 'assegure']],
      [/\bbônus\b/gi, ['bônus', 'incentivo extra', 'recompensa', 'valor extra', 'premiação']],
      [/\bpromoção\b/gi, ['campanha', 'condição especial', 'oportunidade', 'oferta ativa', 'promoção']],
      [/\bdúvida\b/gi, ['dúvida', 'pergunta', 'questão', 'precisar de ajuda', 'qualquer ponto']],
      [/\bimportante\b/gi, ['essencial', 'especial', 'relevante', 'de destaque', 'importante']],
    ];

    if (idx > 0) {
      rules.forEach(([regex, replacements], rIdx) => {
        const chosen = replacements[(idx + rIdx) % replacements.length];
        res = res.replace(regex, (match) => {
          // Preserve initial capitalization if original word was capitalized
          if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
            return chosen.charAt(0).toUpperCase() + chosen.slice(1);
          }
          return chosen;
        });
      });
    }

    return res;
  };

  const generateLocalVariations = (
    cleanTopic: string,
    cleanHook: string,
    presentation: string,
    reqQty: number
  ) => {
    const cleanPres = presentation.trim().replace(/[.!?\s]+$/, '');
    const introLine = cleanPres ? ` ${cleanPres}.` : '';
    const cleanBody = cleanHook
      .replace(/^(\{saudacao\}|\{saudação\}|\{primeiro_nome\}|\{nome\}|olá|oi|bom dia|boa tarde|boa noite)[,!\s]*/i, '')
      .trim() || cleanHook;

    const b = (i: number) => rephraseBodyText(cleanBody, i);

    const firstOption = {
      tag: 'Original e Direta',
      content: `{saudacao}, {primeiro_nome}!${introLine}\n\n${b(0)}\n\nSe precisar de suporte com isso, conta comigo!`
    };

    const diversePool = [
      {
        tag: 'Pergunta Engajadora',
        content: `{saudacao}, {primeiro_nome}! Tudo certo por aí?${introLine}\n\n${b(1)}\n\nQualquer dúvida, me dá um alô!`
      },
      {
        tag: 'Destaque Rápido',
        content: `{saudacao}, {primeiro_nome}! 🚀${introLine}\n\n${b(2)}\n\nSe precisar de suporte com isso, conta comigo.`
      },
      {
        tag: 'Formato em Tópico',
        content: `Olá, {primeiro_nome}! {saudacao}!${introLine}\n\n📌 ${b(3)}\n\nBora aproveitar? Estou por aqui se precisar!`
      },
      {
        tag: 'Parceria e Próxima',
        content: `Fala, {primeiro_nome}! {saudacao}! Como estão os trabalhos hoje?${introLine}\n\n${b(4)}\n\nTamo junto, qualquer coisa me chama!`
      },
      {
        tag: 'Foco no Resultado',
        content: `{saudacao}, {primeiro_nome}!${introLine}\n\n${b(5)}\n\nAproveite para impulsionar seus ganhos! Conta comigo.`
      },
      {
        tag: 'Lembrete Prático',
        content: `Oi, {primeiro_nome}! 👋 {saudacao}!${introLine}\n\n${b(6)}\n\nPrecisando de orientação, é só me chamar.`
      },
      {
        tag: 'Exclusiva VIP',
        content: `{saudacao}, {primeiro_nome}!${introLine}\n\n✨ *${cleanTopic}:* ${b(7)}\n\nFico à disposição se quiser saber mais!`
      },
      {
        tag: 'Curta e Sem Rodeios',
        content: `{saudacao}, {primeiro_nome}!${introLine}\n\nRecado rápido para você: ${b(8)}\n\nQualquer coisa, me chama!`
      },
      {
        tag: 'Consultiva e Atenciosa',
        content: `{saudacao}, {primeiro_nome}! Espero que seu dia esteja ótimo!${introLine}\n\n${b(9)}\n\nPode contar comigo no que precisar!`
      },
      {
        tag: 'Alerta de Oportunidade',
        content: `{saudacao}, {primeiro_nome}! ⚡${introLine}\n\n${b(10)}\n\nQualquer dúvida estou online por aqui!`
      },
      {
        tag: 'Conversa Natural',
        content: `Oi, {primeiro_nome}, tudo bem? {saudacao}!${introLine}\n\n${b(11)}\n\nDepois me conta se deu tudo certo!`
      },
      {
        tag: 'Motivacional',
        content: `{saudacao}, {primeiro_nome}! Excelente jornada hoje!${introLine}\n\n${b(12)}\n\nÓtimas corridas e pode contar comigo!`
      },
      {
        tag: 'Check-in Rápido',
        content: `Olá, {primeiro_nome}! {saudacao}!${introLine}\n\n👉 ${b(13)}\n\nEstou à disposição para te ajudar!`
      },
      {
        tag: 'Fechamento de Meta',
        content: `{saudacao}, {primeiro_nome}! Bora fechar a meta com chave de ouro? 🎯${introLine}\n\n${b(14)}\n\nSe precisar de apoio, fala comigo!`
      }
    ];

    // Shuffle diversePool slightly on each call while keeping diversity so repeated clicks offer fresh combinations
    const shuffled = [...diversePool].sort(() => Math.random() - 0.5);
    const combined = [firstOption, ...shuffled];

    return combined.slice(0, Math.max(1, Math.min(15, reqQty))).map((vt, i) => ({
      title: `${cleanTopic} - Opção ${i + 1} (${vt.tag})`,
      content: vt.content,
      category: cleanTopic,
    }));
  };

  const normalizePlaceholders = (text: string, _originalHook: string): string => {
    if (!text) return '';
    let processed = text.trim();

    // 1. First, normalize common placeholders
    // Name placeholders
    const namePattern = /\{\{\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*\}\}|\{\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*\}|\[\s*(primeiro_nome|primeironome|primeiro\s+nome|nome|name|first_name|firstname|nome\s+do\s+contato|nome\s+do\s+motorista|contato|motorista)\s*\]|<\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*>|%\s*(primeiro_nome|primeironome|nome|name|first_name|firstname)\s*%/gi;
    processed = processed.replace(namePattern, '{primeiro_nome}');

    // Greeting placeholders
    const greetingPattern = /\{\{\s*sauda[çc][ãa]o(?:_horario)?\s*\}\}|\{\s*sauda[çc][ãa]o(?:_horario)?\s*\}|\[\s*sauda[çc][ãa]o(?:\s+do\s+hor[áa]rio)?\s*\]|<\s*sauda[çc][ãa]o(?:_horario)?\s*>|%\s*sauda[çc][ãa]o(?:_horario)?\s*%/gi;
    processed = processed.replace(greetingPattern, '{saudacao}');

    // 2. If the AI generated literal sample names or greetings at the start, normalize them
    processed = processed.replace(/\b(Olá|Oi|Bom dia|Boa tarde|Boa noite)[,!\s]+(Fulano|Maria|João|Cláudio|Motorista|Parceiro|Amigo)\b/gi, '{saudacao}, {primeiro_nome}');
    processed = processed.replace(/^(Bom dia|Boa tarde|Boa noite)\b/i, '{saudacao}');

    // 3. Enforce 1st person singular (never plural "nosso time", "nossa equipe", "estamos", "conosco")
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
      .replace(/\bviagens realizadas\s+(nas?\s+próximas?)/gi, 'corridas $1');

    // 4. Prevent duplicate placeholders
    processed = processed.replace(/\{saudacao\}[,!\s]*\{saudacao\}/gi, '{saudacao}');
    processed = processed.replace(/\{primeiro_nome\}[,!\s]*\{primeiro_nome\}/gi, '{primeiro_nome}');

    // 5. Ensure greeting and {primeiro_nome} are always at the beginning (never only at the bottom)
    const firstLine = processed.split('\n')[0] || '';
    const hasGreetingInFirstLine = /\{saudacao\}|\b(olá|oi|fala)\b/i.test(firstLine);
    const hasNameInFirstLine = firstLine.includes('{primeiro_nome}');

    if (!hasGreetingInFirstLine && !hasNameInFirstLine) {
      // Remove trailing "{saudacao}, {primeiro_nome}!" if it was placed at the bottom
      processed = processed.replace(/\n+\s*\{saudacao\}[,!\s]*\{primeiro_nome\}[,!\s]*/gi, '\n\n');
      processed = `{saudacao}, {primeiro_nome}!\n\n${processed.trim()}`;
    } else if (!hasNameInFirstLine) {
      processed = processed.replace(/\{primeiro_nome\}/g, '').trim();
      if (processed.startsWith('{saudacao}')) {
        processed = processed.replace(/^\{saudacao\}[,!\s]*/, '{saudacao}, {primeiro_nome}! ');
      } else {
        processed = `{saudacao}, {primeiro_nome}! ${processed}`;
      }
    } else if (! processed.includes('{saudacao}')) {
      processed = `{saudacao}, ${processed}`;
    }

    // Clean up punctuation caused by replacements
    processed = processed
      .replace(/,\s*,/g, ',')
      .replace(/!\s*!/g, '!')
      .replace(/\?\s*\?/g, '?')
      .replace(/,\s*!/g, '!')
      .replace(/;\s*;/g, ';');

    return processed.trim();
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
