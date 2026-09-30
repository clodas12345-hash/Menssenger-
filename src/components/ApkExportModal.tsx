import React, { useState } from 'react';
import { Smartphone, Download, Terminal, CheckCircle2, Copy, Check, X, ExternalLink, ShieldCheck } from 'lucide-react';

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ isOpen, onClose }) => {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const steps = [
    {
      id: 'step1',
      title: '1. Instalar o Capacitor (CLI e Core)',
      description: 'Adicione o Capacitor ao projeto para transformar a aplicação web React/Vite em um aplicativo nativo Android.',
      code: 'npm install @capacitor/core @capacitor/cli\nnpm install @capacitor/android'
    },
    {
      id: 'step2',
      title: '2. Inicializar o Capacitor',
      description: 'Configure o projeto Capacitor com o nome e ID do pacote para a Google Play Store (ex: com.gkd.messenger).',
      code: 'npx cap init "GKD Messenger" "com.gkd.messenger" --web-dir dist'
    },
    {
      id: 'step3',
      title: '3. Adicionar a Plataforma Android',
      description: 'Cria a pasta nativa do Android no seu projeto.',
      code: 'npx cap add android'
    },
    {
      id: 'step4',
      title: '4. Gerar Build de Produção e Sincronizar',
      description: 'Compila a aplicação web e copia os arquivos gerados para o projeto Android nativo.',
      code: 'npm run build\nnpx cap sync android'
    },
    {
      id: 'step5',
      title: '5. Abrir no Android Studio e Gerar APK/AAB',
      description: 'Abre o projeto no Android Studio para compilar o APK de testes ou o arquivo .aab assinado para publicação oficial na Google Play Console.',
      code: 'npx cap open android'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0C10]/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl w-full max-w-2xl text-gray-100 shadow-2xl overflow-hidden my-8 p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2229] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif italic text-white text-lg">Guia de Exportação APK / Google Play</h3>
              <p className="text-xs text-gray-400">Transforme este aplicativo em um arquivo APK nativo usando o <strong className="text-emerald-400 font-bold">Ionic Capacitor</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#1A1D23] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Intro Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5 text-emerald-200">
            <p className="font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>O que é o Capacitor?</span>
              <a
                href="https://capacitorjs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center space-x-1 font-mono text-[11px]"
              >
                <span>capacitorjs.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <p>
              O <strong>Capacitor NÃO é um aplicativo da Google Play Store</strong>. Ele é uma ferramenta de desenvolvimento open-source (pacote NPM) criada pela equipe do Ionic para transformar sites e apps web (React/Vite) em aplicativos nativos Android e iOS.
            </p>
          </div>
        </div>

        {/* FAQ & Answers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#0A0C10] border border-[#1F2229] rounded-xl p-4">
          <div className="space-y-1 border-r border-[#1F2229] pr-3">
            <p className="font-bold text-[#A88B4B] uppercase tracking-wider">💰 É pago?</p>
            <p className="text-gray-300">
              O <strong>Capacitor é 100% gratuito e open-source</strong>. Você gera quantos APKs quiser sem pagar nada. A única taxa opcional é a da Google Play Console (taxa única de US$ 25 para abrir sua conta de desenvolvedor e publicar na loja oficial).
            </p>
          </div>
          <div className="space-y-1 pl-1">
            <p className="font-bold text-[#A88B4B] uppercase tracking-wider">🔄 Consigo atualizar o APK?</p>
            <p className="text-gray-300">
              <strong>Sim!</strong> Sempre que alterar o código, basta rodar <code className="text-emerald-300">npm run build && npx cap sync android</code> e gerar um novo APK no Android Studio com uma versão atualizada (`versionCode`).
            </p>
          </div>
        </div>

        {/* WhatsApp Photo sharing in Android APK note */}
        <div className="bg-[#0A0C10] border border-blue-500/30 rounded-xl p-3.5 space-y-1 text-xs">
          <p className="font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>📸 Como funciona o Envio de Fotos no APK Android:</span>
          </p>
          <p className="text-gray-300 leading-relaxed">
            O protocolo padrão do WhatsApp (<code className="text-blue-300">whatsapp://send?text=...</code>) transporta automaticamente <strong>apenas o texto</strong> da mensagem. No Android/APK, a foto do card é <strong>baixada automaticamente na galeria</strong> do dispositivo e fica disponível no topo do menu de compartilhamento nativo. Para enviar no WhatsApp: toque no ícone do clipe 📎 &gt; Galeria e escolha a foto recente!
          </p>
        </div>

        {/* Can I do it from mobile? */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
          <p className="font-bold text-amber-400 uppercase tracking-wider text-xs flex items-center space-x-2">
            <Smartphone className="w-4 h-4" />
            <span>Não posso fazer pelo celular? (Alternativa Instantânea)</span>
          </p>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            Para <strong>compilar o arquivo físico (.apk)</strong> usando o Android Studio, você precisa de um computador. No entanto, se o seu objetivo é apenas <strong>usar o aplicativo direto no seu celular Android</strong> como um app nativo (com ícone na tela, tela cheia e acesso rápido), você <strong>já pode fazer isso agora mesmo</strong>!
          </p>
          <div className="bg-[#0A0C10] border border-amber-500/20 rounded-lg p-3 text-xs text-gray-300 space-y-1">
            <p className="font-bold text-white">Como instalar agora mesmo no Android:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Procure pelo botão <strong className="text-[#A88B4B]">"INSTALAR"</strong> no topo do menu lateral ou no cabeçalho do app.</li>
              <li>Toque nele e confirme a instalação.</li>
              <li>Pronto! O ícone aparecerá na sua tela inicial e o app rodará em tela cheia como um APK nativo.</li>
            </ol>
            <p className="text-[11px] text-amber-300/80 pt-1">Esta é a tecnologia PWA (Progressive Web App), aceita por todos os Androids modernos.</p>
          </div>
        </div>

        {/* Sharing with Brother / Friends */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-2.5">
          <p className="font-bold text-blue-400 uppercase tracking-wider text-xs flex items-center space-x-2">
            <ExternalLink className="w-4 h-4" />
            <span>Como configurar o Compartilhamento para seu irmão usar</span>
          </p>
          <p className="text-xs text-blue-200/90 leading-relaxed">
            Na tela de compartilhamento que apareceu na foto, faça o seguinte para liberar o acesso sem erro:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-blue-100/90 bg-[#0A0C10] border border-blue-500/20 rounded-lg p-3">
            <li>Onde está escrito <strong className="text-white">"Restricted: Only people you specify can access"</strong>, clique na setinha para mudar para <strong className="text-emerald-400">"Anyone with the link"</strong> (Qualquer pessoa com o link).</li>
            <li>Em seguida, clique no botão inferior <strong className="text-white">"Copy link"</strong>.</li>
            <li>Envie esse link copiado para o seu irmão. Assim ele abrirá direto no celular ou PC sem pedir login ou dar erro!</li>
          </ol>
        </div>

        {/* Steps List */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {steps.map((step, idx) => (
            <div key={step.id} className="bg-[#0A0C10] border border-[#1F2229] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A88B4B] uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#A88B4B]/20 text-[#A88B4B] flex items-center justify-center text-[10px] font-mono">
                    {idx + 1}
                  </span>
                  <span>{step.title}</span>
                </span>
                <button
                  onClick={() => copyToClipboard(step.code, step.id)}
                  className="flex items-center space-x-1 text-[11px] font-mono bg-[#1A1D23] hover:bg-[#252830] text-gray-300 px-2.5 py-1 rounded border border-[#2A2D35] transition-colors"
                  title="Copiar comando"
                >
                  {copiedStep === step.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      <span>Copiar Comando</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400">{step.description}</p>
              <div className="bg-[#15181E] border border-[#2A2D35] rounded-lg p-2.5 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre">
                {step.code}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="border-t border-[#1F2229] pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-[11px] text-gray-400">
            <Terminal className="w-4 h-4 text-[#A88B4B]" />
            <span>Execute os comandos acima no terminal do seu projeto.</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#A88B4B]/20 transition-all"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
