import React, { useState } from 'react';
import { Sparkles, X, Check, Loader2, Bot, MessageSquare } from 'lucide-react';
import { MessageTemplate } from '../types';

interface AiTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGeneratedTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt'>) => void;
}

export const AiTemplateModal: React.FC<AiTemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectGeneratedTemplate,
}) => {
  const [category, setCategory] = useState<string>('Lembrete de Agendamento');
  const [tone, setTone] = useState<string>('Cordial e Amigável');
  const [businessType, setBusinessType] = useState<string>('Serviços / Geral');
  const [context, setContext] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [generatedResults, setGeneratedResults] = useState<
    { title: string; content: string; category: string }[]
  >([]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/generate-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, tone, context, businessType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao comunicar com a IA');
      }
      if (data.templates && Array.isArray(data.templates)) {
        setGeneratedResults(data.templates);
      } else {
        throw new Error('Resposta da IA em formato inesperado');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao gerar modelos com a IA Gemini.');
    } finally {
      setLoading(false);
    }
  };

  const handleChoose = (tmpl: { title: string; content: string; category: string }) => {
    onSelectGeneratedTemplate({
      title: tmpl.title,
      content: tmpl.content,
      category: tmpl.category || category,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0C10]/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl w-full max-w-2xl text-gray-100 shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1F2229] flex items-center justify-between bg-[#0F1115] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500/10 text-purple-400 p-2 rounded-xl border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">IA Gemini</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">GKD Mobility</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-[#1F2229] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Objetivo da Mensagem
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-all"
              >
                <option value="Lembrete de Agendamento">Lembrete de Agendamento/Reunião</option>
                <option value="Aniversário e Comemoração">Aniversário e Felicitações</option>
                <option value="Vendas e Promoções">Vendas / Oferta Exclusiva</option>
                <option value="Cobrança Amigável">Cobrança e Lembrete de Fatura</option>
                <option value="Pós-venda e Pesquisa">Pós-venda e Avaliação</option>
                <option value="Boas-vindas">Boas-vindas a Novo Cliente</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Tom de Voz
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-all"
              >
                <option value="Cordial e Amigável">Cordial e Amigável</option>
                <option value="Profissional e Formal">Profissional e Formal</option>
                <option value="Persuasivo e Vendedor">Persuasivo e Vendedor</option>
                <option value="Descontraído com Emojis">Descontraído com Emojis</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Detalhes ou Contexto Adicional (Opcional)
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Clínica Odontológica..."
              className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando Opções com Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Gerar 3 Modelos Prontos</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded">
              {errorMsg}
            </div>
          )}

          {/* Results list */}
          {generatedResults.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">
                Escolha um dos modelos sugeridos:
              </span>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {generatedResults.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#0A0C10] border border-[#1F2229] rounded hover:border-[#A88B4B]/50 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      <h4 className="text-sm font-serif italic text-[#A88B4B] flex items-center justify-between">
                        <span>{tmpl.title}</span>
                        <span className="text-[9px] bg-[#15181E] text-gray-400 px-2 py-0.5 rounded font-sans uppercase tracking-wider">
                          {tmpl.category || category}
                        </span>
                      </h4>
                      <p className="text-xs text-gray-300 mt-2 whitespace-pre-wrap font-sans leading-relaxed bg-[#15181E]/60 p-2.5 rounded border border-[#1F2229]">
                        {tmpl.content}
                      </p>
                    </div>
                    <button
                      onClick={() => handleChoose(tmpl)}
                      className="self-end bg-[#A88B4B]/10 hover:bg-[#A88B4B] text-[#A88B4B] hover:text-[#0A0C10] border border-[#A88B4B]/30 px-3 py-1.5 rounded text-xs font-bold transition-all uppercase tracking-wider flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Usar Este Modelo</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#0F1115] border-t border-[#1F2229] mt-auto">
          <button
            onClick={onClose}
            className="w-full sm:hidden py-3.5 bg-[#1F2229] text-gray-400 font-bold rounded-xl text-[10px] uppercase tracking-widest border border-[#2A2D35]"
          >
            Voltar para o App
          </button>
        </div>
      </div>
    </div>
  );
};
