import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Users, 
  MessageSquare, 
  CalendarClock, 
  Smartphone,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  FileText,
  Sliders,
  User,
  Edit3
} from 'lucide-react';

interface WelcomeTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorName?: string;
  onSaveMentorName?: (name: string) => void;
}

export const WelcomeTutorialModal: React.FC<WelcomeTutorialModalProps> = ({
  isOpen,
  onClose,
  mentorName = 'Cláudio',
  onSaveMentorName,
}) => {
  const [activeTab, setActiveTab] = useState<'flow' | 'contacts' | 'messages' | 'campaigns' | 'safety' | 'variables'>('flow');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>(mentorName || 'Cláudio');
  const [isConfiguringName, setIsConfiguringName] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gkd_user_name_configured') !== 'true';
    } catch {
      return false;
    }
  });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveNameAndContinue = () => {
    const finalName = userName.trim() || 'Cláudio';
    try {
      localStorage.setItem('gkd_user_name_configured', 'true');
    } catch {
      // ignore
    }
    if (onSaveMentorName) {
      onSaveMentorName(finalName);
    }
    setIsConfiguringName(false);
    setIsEditingName(false);
  };

  const handleFinishOrClose = () => {
    try {
      localStorage.setItem('gkd_has_seen_tutorial_v1', 'true');
      localStorage.setItem('gkd_user_name_configured', 'true');
    } catch {
      // ignore
    }
    if (userName.trim() && onSaveMentorName) {
      onSaveMentorName(userName.trim());
    }
    onClose();
  };

  const copyVariable = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(text);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const tabs = [
    { id: 'flow', label: '1. O Ciclo Completo', icon: Zap },
    { id: 'contacts', label: '2. Contatos & Grupos', icon: Users },
    { id: 'messages', label: '3. Mensagens & IA', icon: MessageSquare },
    { id: 'campaigns', label: '4. Agendamento', icon: CalendarClock },
    { id: 'safety', label: '5. Proteção de Chip', icon: ShieldCheck },
    { id: 'variables', label: '6. Variáveis Prontas', icon: Sliders },
  ] as const;

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div 
        className="bg-[#0F1115] w-full max-w-3xl rounded-2xl border border-[#2A2D35] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1F2229] bg-[#0A0C10] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D23] flex items-center justify-center text-black shadow-lg shadow-[#D4AF37]/20">
              <BookOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Prefácio & Manual do Usuário
                </h2>
                <span className="bg-[#A88B4B]/20 text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#A88B4B]/30 uppercase">
                  Guia Oficial
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Tudo o que você precisa saber para disparar com alta conversão e zero bloqueios.
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isConfiguringName && !isEditingName && (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="hidden sm:flex items-center space-x-1.5 bg-[#15181E] hover:bg-[#1F2229] border border-[#2A2D35] px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                title="Alterar seu nome ou nome da empresa"
              >
                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-[11px] text-gray-400">Assinatura:</span>
                <span className="font-bold text-[#D4AF37] max-w-[90px] truncate">{userName || 'Cláudio'}</span>
                <Edit3 className="w-3 h-3 text-gray-400" />
              </button>
            )}
            <button
              onClick={handleFinishOrClose}
              className="p-2 text-gray-400 hover:text-white bg-[#15181E] hover:bg-[#1F2229] rounded-xl transition-all border border-[#1F2229] cursor-pointer"
              title="Fechar guia"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar (only visible when not configuring name) */}
        {!isConfiguringName && !isEditingName && (
          <div className="bg-[#12141A] border-b border-[#1F2229] px-2 sm:px-4 flex space-x-1 overflow-x-auto no-scrollbar py-2 shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#A88B4B] text-black shadow-md shadow-[#A88B4B]/20 font-bold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1D24]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content Body */}
        {isConfiguringName || isEditingName ? (
          <div className="p-6 sm:p-10 flex-1 flex flex-col justify-center max-w-xl mx-auto text-center space-y-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto custom-scrollbar">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D23] flex items-center justify-center text-black mx-auto shadow-xl shadow-[#D4AF37]/20">
              <User className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                {isEditingName ? 'Alterar Assinatura do Remetente' : 'Boas-vindas ao ZapAgendador!'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-300">
                {isEditingName
                  ? 'Atualize o nome pessoal ou empresarial usado nos disparos.'
                  : 'Para começarmos, informe como devemos te chamar:'}
              </p>
            </div>

            <div className="bg-[#14171E] border border-[#232732] rounded-2xl p-5 space-y-3 text-left shadow-lg">
              <label className="block text-xs font-bold text-gray-200">
                Seu Nome / Nome da Empresa ou Mentoria
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveNameAndContinue();
                    }
                  }}
                  placeholder="Ex: Cláudio ou Minha Empresa"
                  className="w-full bg-[#0A0C10] border border-[#303644] focus:border-[#D4AF37] rounded-xl px-4 py-3 text-sm text-white font-semibold focus:outline-none transition-all shadow-inner"
                />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Este nome será inserido automaticamente como a sua assinatura ao utilizar as variáveis <code className="text-[#D4AF37] bg-black/40 px-1.5 py-0.5 rounded border border-[#D4AF37]/20">[Nome do Mentor]</code> ou <code className="text-[#D4AF37] bg-black/40 px-1.5 py-0.5 rounded border border-[#D4AF37]/20">[Mentor]</code>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveNameAndContinue}
                className="w-full sm:w-auto bg-gradient-to-r from-[#D4AF37] to-[#B38F2C] hover:from-[#E5C365] hover:to-[#C9A238] text-black font-bold py-3 px-8 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
              >
                <span>{isEditingName ? 'Salvar Alteração' : 'Salvar Nome & Abrir Guia'}</span>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              </button>

              {isEditingName && (
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="w-full sm:w-auto bg-[#1A1D24] hover:bg-[#252932] text-gray-300 font-semibold py-3 px-6 rounded-xl text-xs transition-all border border-[#2A2D35] cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6 text-gray-300 text-xs sm:text-sm leading-relaxed">
          {/* TAB 1: O CICLO COMPLETO */}
          {activeTab === 'flow' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-gradient-to-r from-[#A88B4B]/10 via-transparent to-emerald-500/10 border border-[#A88B4B]/30 rounded-xl p-4">
                <h3 className="text-base font-bold text-white mb-2 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-[#D4AF37]" />
                  <span>Como o ZapAgendador Funciona na Prática?</span>
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed">
                  O sistema foi desenhado para ser um <strong>disparador semi-automático e humanizado</strong> via WhatsApp Web ou Aplicativo Desktop. Ao invés de usar robôs invasivos que causam banimentos instantâneos, ele utiliza um fluxo seguro de 4 etapas:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-[#D4AF37] font-bold text-xs">
                    <span className="w-6 h-6 rounded-full bg-[#A88B4B]/20 flex items-center justify-center font-mono">1</span>
                    <span>Importar Contatos</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Adicione clientes em massa ou por grupos (ex: Leads Quentes, Clientes Antigos, VIP). O app limpa DDDs e telefones automaticamente.
                  </p>
                </div>

                <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center font-mono">2</span>
                    <span>Criar Mensagens & IA</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Escreva textos com variáveis como <code>{`{primeiro_nome}`}</code> e <code>{`{saudacao}`}</code>. Use a <strong>IA</strong> para gerar variações sem mudar o sentido.
                  </p>
                </div>

                <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center font-mono">3</span>
                    <span>Agendar Campanhas</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Defina o horário e a divisão em lotes (ex: 20 pessoas por hora com 15 a 30 segundos de intervalo entre cada mensagem).
                  </p>
                </div>

                <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center font-mono">4</span>
                    <span>Disparo Assistido</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    No momento agendado, o disparador abre a conversa de cada contato no WhatsApp com o texto já pronto e sorteado. Você confere e confirma com 1 clique!
                  </p>
                </div>
              </div>

              <div className="bg-[#0A0C10] border-l-4 border-amber-500 p-3.5 rounded-r-xl text-xs text-gray-300">
                <span className="font-bold text-amber-400">💡 Por que esse modelo é o melhor?</span> Porque o WhatsApp reconhece que as ações partem do seu próprio dispositivo, garantindo <strong>taxa de entrega de 100%</strong> e sem risco de banimento por API pirata.
              </div>
            </div>
          )}

          {/* TAB 2: CONTATOS & GRUPOS */}
          {activeTab === 'contacts' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Gestão Inteligente de Contatos</span>
              </h3>

              <div className="space-y-3">
                <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl space-y-2">
                  <h4 className="text-white font-bold text-xs">📋 Como importar seus contatos:</h4>
                  <ul className="list-disc list-inside space-y-1.5 text-gray-400 text-xs">
                    <li>
                      <strong>Colar Lista de Texto:</strong> Você pode colar diretamente de um bloco de notas ou planilha no formato <code>Nome - (11) 99999-9999</code> ou apenas os telefones linha por linha.
                    </li>
                    <li>
                      <strong>Importar CSV ou Excel:</strong> Suba arquivos com colunas de Nome e Telefone. O sistema mapeia os campos automaticamente.
                    </li>
                    <li>
                      <strong>Higienização Automática:</strong> O aplicativo remove parênteses, traços, espaços e adiciona o DDI do Brasil (<code>+55</code>) e o 9º dígito onde for necessário.
                    </li>
                  </ul>
                </div>

                <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl space-y-2">
                  <h4 className="text-white font-bold text-xs">🏷️ Organização por Grupos e Segmentos:</h4>
                  <p className="text-gray-400 text-xs">
                    Agrupe seus clientes por tags como <em>"Compradores VIP"</em>, <em>"Novos Leads"</em> ou <em>"Orçamentos Pendentes"</em>. Ao agendar uma campanha, você pode disparar para um grupo inteiro com apenas um clique.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MENSAGENS & INTELIGÊNCIA ARTIFICIAL */}
          {activeTab === 'messages' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-[#A88B4B]/10 border border-[#A88B4B]/30 p-4 rounded-xl flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-bold text-xs mb-1">O Segredo Anti-Bloqueio: Variações com IA</h4>
                  <p className="text-gray-300 text-xs">
                    Se você enviar a <strong>mesma mensagem idêntica</strong> para 100 pessoas seguidas, os filtros de spam do WhatsApp podem desconfiar. A nossa Inteligência Artificial resolve isso criando <strong>variações sinônimas</strong> automáticas!
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl space-y-2">
                  <h4 className="text-white font-bold text-xs">🤖 Como usar o Gerador de Variações:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400 text-xs">
                    <li>Vá na aba <strong>Mensagens</strong> e clique em <strong>Criar com IA</strong> ou <strong>Gerar Tópico</strong>.</li>
                    <li>Informe seu objetivo (Ex: <em>"Avisar clientes sobre promoção de troca de óleo"</em>).</li>
                    <li>A IA criará um conjunto de mensagens diferentes, com abordagens formais, amigáveis e diretas.</li>
                    <li>Ao criar a campanha, ative a opção <strong>"Variações de Mensagem"</strong>: o sistema sorteará um texto diferente para cada contato!</li>
                  </ol>
                </div>

                <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl space-y-2">
                  <h4 className="text-white font-bold text-xs">🖼️ Cards e Encartes Visuais:</h4>
                  <p className="text-gray-400 text-xs">
                    Na aba <strong>Cards</strong>, cadastre fotos de produtos, banners de eventos ou encartes. No momento do disparo, você pode enviar o texto acompanhado da imagem perfeita.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AGENDAMENTO DE CAMPANHAS */}
          {activeTab === 'campaigns' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <CalendarClock className="w-4 h-4 text-[#D4AF37]" />
                <span>Estratégia de Agendamento Inteligente</span>
              </h3>

              <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl space-y-3">
                <h4 className="text-white font-bold text-xs">⏱️ Distribuição em Lotes e Intervalos:</h4>
                <p className="text-gray-400 text-xs">
                  Para uma campanha com 60 clientes, nunca dispare tudo em 1 minuto. Utilize a divisão de horários:
                </p>
                <div className="bg-[#0A0C10] p-3 rounded-lg border border-[#1F2229] space-y-1.5 font-mono text-[11px] text-gray-300">
                  <p className="text-[#D4AF37] font-bold">Exemplo recomendado:</p>
                  <p>• Lote 1: 20 contatos às 10:00 (Intervalo de 20s entre mensagens)</p>
                  <p>• Lote 2: 20 contatos às 14:00 (Intervalo de 20s entre mensagens)</p>
                  <p>• Lote 3: 20 contatos às 16:30 (Intervalo de 20s entre mensagens)</p>
                </div>
                <p className="text-gray-400 text-xs">
                  O aplicativo avisa com um sinal sonoro e notificação quando cada lote estiver pronto para ser enviado!
                </p>
              </div>

              <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl space-y-2">
                <h4 className="text-white font-bold text-xs">📱 Modo de Disparo (Desktop vs Web):</h4>
                <p className="text-gray-400 text-xs">
                  Na tela de configurações (engrenagem), escolha entre abrir o <strong>WhatsApp Desktop</strong> (aplicativo instalado no computador) ou <strong>WhatsApp Web</strong> no navegador. Ambos funcionam perfeitamente.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: SEGURANÇA & PROTEÇÃO DE CHIP */}
          {activeTab === 'safety' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-bold text-xs mb-1">As 4 Regras de Ouro para Nunca Tomar Ban</h4>
                  <p className="text-gray-300 text-xs">
                    Siga estas regras ativadas no app para manter seu número 100% protegido:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#15181E] border border-[#1F2229] p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                    <Clock className="w-4 h-4" />
                    <span>1. Horário Comercial Protegido</span>
                  </div>
                  <p className="text-gray-400 text-[11px]">
                    Envios somente das <strong>09h às 19h</strong>. Mensagens programadas à noite ou madrugada são automaticamente protegidas para a manhã seguinte.
                  </p>
                </div>

                <div className="bg-[#15181E] border border-[#1F2229] p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>2. Anti-Duplicidade</span>
                  </div>
                  <p className="text-gray-400 text-[11px]">
                    O sistema impede que você envie mensagens repetidas para o mesmo contato em menos de 24 horas por engano.
                  </p>
                </div>

                <div className="bg-[#15181E] border border-[#1F2229] p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                    <Smartphone className="w-4 h-4" />
                    <span>3. Alternância de Chips</span>
                  </div>
                  <p className="text-gray-400 text-[11px]">
                    Cadastre mais de um chip (ex: Chip Principal, Chip 2). O sistema divide os envios entre os números para não sobrecarregar nenhum.
                  </p>
                </div>

                <div className="bg-[#15181E] border border-[#1F2229] p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
                    <Zap className="w-4 h-4" />
                    <span>4. Intervalo Mínimo</span>
                  </div>
                  <p className="text-gray-400 text-[11px]">
                    Nunca dispare em intervalos menores que 15 segundos. Recomendamos de <strong>15s a 30s</strong> entre cada mensagem.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: VARIÁVEIS PRONTAS */}
          {activeTab === 'variables' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 mb-1">
                  <Sliders className="w-4 h-4 text-[#D4AF37]" />
                  <span>Dicionário de Variáveis Dinâmicas</span>
                </h3>
                <p className="text-gray-400 text-xs">
                  Copie e cole essas variáveis no corpo das suas mensagens. O app preenche cada uma automaticamente na hora do disparo!
                </p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    variable: '{primeiro_nome}',
                    desc: 'Extrai apenas o primeiro nome do cliente (Ex: "Cláudio")',
                    example: 'Olá {primeiro_nome}, como vai?'
                  },
                  {
                    variable: '{nome}',
                    desc: 'Nome completo do contato conforme cadastrado na sua agenda.',
                    example: 'Prezado(a) {nome},'
                  },
                  {
                    variable: '{saudacao}',
                    desc: 'Insere automaticamente "Bom dia", "Boa tarde" ou "Boa noite" de acordo com o horário do disparo.',
                    example: '{saudacao}, tudo bem com você?'
                  },
                  {
                    variable: '{data}',
                    desc: 'Insere a data de hoje (Ex: 17/09/2026).',
                    example: 'Agendamento confirmado para o dia {data}.'
                  },
                  {
                    variable: '[Mentor]',
                    desc: 'Substitui pelo Nome do Mentor/Remetente cadastrado na Engrenagem.',
                    example: 'Abraços, [Mentor] da Equipe GKD.'
                  }
                ].map((item) => (
                  <div 
                    key={item.variable}
                    className="bg-[#15181E] border border-[#1F2229] p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-amber-300 bg-[#0A0C10] px-2 py-0.5 rounded border border-[#A88B4B]/30 text-xs">
                          {item.variable}
                        </span>
                        <span className="text-gray-300 text-xs font-semibold">{item.desc}</span>
                      </div>
                      <p className="text-gray-500 font-mono text-[11px] italic">
                        Exemplo: "{item.example}"
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyVariable(item.variable)}
                      className="shrink-0 bg-[#1A1D24] hover:bg-[#252932] text-gray-200 hover:text-white px-3 py-1.5 rounded-lg border border-[#2A2D35] text-xs font-semibold flex items-center space-x-1.5 transition-all self-start sm:self-center cursor-pointer"
                    >
                      {copiedVar === item.variable ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Footer Controls (only visible when not configuring name) */}
        {!isConfiguringName && !isEditingName && (
          <div className="p-4 border-t border-[#1F2229] bg-[#0A0C10] flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <HelpCircle className="w-4 h-4 text-[#A88B4B]" />
              <span>Você pode reabrir este manual e gerenciar o nome a qualquer momento na <strong>Engrenagem</strong>.</span>
            </div>

            <button
              onClick={handleFinishOrClose}
              className="w-full sm:w-auto bg-gradient-to-r from-[#D4AF37] to-[#B38F2C] hover:from-[#E5C365] hover:to-[#C9A238] text-black font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <span>Entendi, Começar a Usar</span>
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
