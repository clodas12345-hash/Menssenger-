import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Play, 
  Square, 
  Volume2, 
  Download, 
  Sparkles, 
  UserCheck, 
  RefreshCw, 
  MessageSquare, 
  Share2, 
  Check, 
  Copy, 
  Sliders,
  Send,
  Trash2,
  Plus,
  Radio,
  FileAudio,
  Info
} from 'lucide-react';
import { MessageTemplate, Contact } from '../types';
import { replaceTemplateVariables, getTimeBasedGreeting, buildWhatsAppLink } from '../utils/whatsapp';

interface VoiceSimulatorViewProps {
  templates: MessageTemplate[];
  contacts: Contact[];
}

export interface RecordedVoicePhrase {
  id: string;
  title: string;
  text: string;
  audioDataUrl: string;
  createdAt: string;
  durationSeconds?: number;
}

const DEFAULT_TRAINING_PHRASES = [
  {
    title: 'Saudação Inicial',
    text: 'Olá {primeiro_nome}, {saudacao}! Tudo bem com você? Passando para te dar um oi.',
  },
  {
    title: 'Atendimento & Dúvidas',
    text: 'Oi, vi que você entrou em contato. Como posso te ajudar hoje?',
  },
  {
    title: 'Proposta Comercial',
    text: 'Temos uma condição super especial para você hoje! Gostaria de conferir os detalhes?',
  },
  {
    title: 'Agradecimento & Despedida',
    text: 'Qualquer dúvida que tiver, pode me chamar por aqui que estou à total disposição! Um abraço.',
  },
];

const LOCAL_STORAGE_KEY_VOICE_LIBRARY = 'gkd_recorded_voice_phrases_v1';

export const VoiceSimulatorView: React.FC<VoiceSimulatorViewProps> = React.memo(({
  templates,
  contacts,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'my_voice' | 'neural_tts'>('my_voice');

  // Recorded Voice Library State
  const [myVoicePhrases, setMyVoicePhrases] = useState<RecordedVoicePhrase[]>([]);
  const [recordingTitle, setRecordingTitle] = useState<string>('Minha Frase Personalizada');
  const [recordingText, setRecordingText] = useState<string>(
    'Olá {primeiro_nome}, {saudacao}! Esta é a gravação com a minha própria voz humana para os nossos clientes.'
  );

  // Active Microphone Recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Currently Playing Audio State
  const [playingPhraseId, setPlayingPhraseId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Audio Send Instructions Modal
  const [audioSendInfoModal, setAudioSendInfoModal] = useState<{
    isOpen: boolean;
    phraseTitle: string;
    contactName: string;
    phone: string;
  } | null>(null);

  const handleSendAudioToWhatsApp = async (phrase: RecordedVoicePhrase) => {
    if (!targetContact.phone) {
      alert('Selecione ou insira um contato com número de telefone para enviar.');
      return;
    }

    const processed = replaceTemplateVariables(phrase.text, targetContact);
    const fileName = `${phrase.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.webm`;

    // Try Web Share API first (opens WhatsApp directly with audio attached on supported devices/browsers)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const response = await fetch(phrase.audioDataUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type || 'audio/webm' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: phrase.title,
            text: processed,
          });
          return; // Sent directly via native WhatsApp share sheet!
        }
      } catch (err) {
        // User cancelled or browser fallback needed
        console.log('Web share not completed or cancelled:', err);
      }
    }

    // Fallback: Download audio file automatically & open WhatsApp with contact
    const downloadLink = document.createElement('a');
    downloadLink.href = phrase.audioDataUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Open WhatsApp Application with target phone number and transcribed text
    const waUrl = buildWhatsAppLink(targetContact.phone, processed, 'whatsapp_desktop');
    const a = document.createElement('a');
    a.href = waUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show informational modal explaining direct options and why browsers require this
    setAudioSendInfoModal({
      isOpen: true,
      phraseTitle: phrase.title,
      contactName: targetContact.name || targetContact.phone,
      phone: targetContact.phone,
    });
  };

  // TTS State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [textToRead, setTextToRead] = useState<string>(
    'Olá {primeiro_nome}, {saudacao}! Esta é uma demonstração de mensagem com tom humano e acolhedor. Como posso te ajudar hoje?'
  );
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [pitch, setPitch] = useState<number>(1.1);
  const [rate, setRate] = useState<number>(1.0);
  const [isPlayingTTS, setIsPlayingTTS] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Target contact for dynamic placeholders
  const targetContact = contacts.find((c) => c.id === selectedContactId) || {
    id: 'sample',
    name: 'Guilherme',
    company: 'Empresa Exemplo',
    group: 'Clientes VIP',
    phone: '11999998888',
    source: 'manual',
    createdAt: new Date().toISOString(),
  };

  const processedTTSText = replaceTemplateVariables(textToRead, targetContact);
  const processedRecordingText = replaceTemplateVariables(recordingText, targetContact);

  // Load saved voice library from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_VOICE_LIBRARY);
      if (saved) {
        setMyVoicePhrases(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading voice library:', e);
    }
  }, []);

  // Save voice library
  const saveVoiceLibrary = (phrases: RecordedVoicePhrase[]) => {
    setMyVoicePhrases(phrases);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_VOICE_LIBRARY, JSON.stringify(phrases));
    } catch (e) {
      console.error('Error saving voice library:', e);
    }
  };

  // Load browser TTS voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        const ptVoices = voices.filter((v) => v.lang.includes('pt') || v.lang.includes('BR'));
        setAvailableVoices(ptVoices.length > 0 ? ptVoices : voices);
        if (ptVoices.length > 0 && !selectedVoiceName) {
          setSelectedVoiceName(ptVoices[0].name);
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Mic level audio analyzer
  const startAudioAnalyzer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn('Could not initialize audio visualizer:', e);
    }
  };

  const stopAudioAnalyzer = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    setAudioLevel(0);
  };

  // Start recording custom voice phrase
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const newPhrase: RecordedVoicePhrase = {
            id: 'vphrase_' + Date.now(),
            title: recordingTitle.trim() || 'Minha Gravação de Voz',
            text: recordingText,
            audioDataUrl: base64data,
            createdAt: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            durationSeconds: recordingTime,
          };

          saveVoiceLibrary([newPhrase, ...myVoicePhrases]);
        };

        stopAudioAnalyzer();
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      startAudioAnalyzer(stream);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      alert('Permissão de microfone negada ou indisponível. Verifique as configurações do navegador.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Play audio phrase from library
  const handlePlayPhrase = (phrase: RecordedVoicePhrase) => {
    if (playingPhraseId === phrase.id && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingPhraseId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(phrase.audioDataUrl);
    audioPlayerRef.current = audio;
    setPlayingPhraseId(phrase.id);

    audio.play().catch((e) => console.error('Error playing phrase:', e));
    audio.onended = () => setPlayingPhraseId(null);
  };

  const handleDeletePhrase = (id: string) => {
    if (confirm('Deseja realmente excluir este áudio/frase salva?') || (window.self !== window.top)) {
      const updated = myVoicePhrases.filter((p) => p.id !== id);
      saveVoiceLibrary(updated);
    }
  };

  const handleSelectDefaultTraining = (item: { title: string; text: string }) => {
    setRecordingTitle(item.title);
    setRecordingText(item.text);
  };

  // Play Speech Synthesis
  const handlePlaySpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta reprodução por voz sintética.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(processedTTSText);
    utterance.lang = 'pt-BR';
    utterance.rate = rate;
    utterance.pitch = pitch;

    if (selectedVoiceName) {
      const v = availableVoices.find((voice) => voice.name === selectedVoiceName);
      if (v) utterance.voice = v;
    }

    utterance.onstart = () => setIsPlayingTTS(true);
    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTTS(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#15181E] border border-[#1F2229] p-6 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-t-4 border-t-[#A88B4B]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-[#A88B4B] uppercase tracking-widest flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-[#A88B4B]" />
              <span>Estúdio de Voz Humana e Áudios</span>
            </span>
          </div>
          <h2 className="text-2xl font-serif italic text-white mt-1 flex items-center space-x-2">
            <Mic className="w-6 h-6 text-[#A88B4B]" />
            <span>Grave Sua Voz Humana & Simulações</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Grave suas próprias frases humanas com voz real para mandar aos clientes no WhatsApp ou simule falas em alta fidelidade.
          </p>
        </div>

        {/* SubTab Toggle */}
        <div className="flex items-center bg-[#0A0C10] p-1 rounded-lg border border-[#1F2229] shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('my_voice')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all ${
              activeSubTab === 'my_voice'
                ? 'bg-[#A88B4B] text-[#0A0C10] shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Minha Voz Humana ({myVoicePhrases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('neural_tts')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all ${
              activeSubTab === 'neural_tts'
                ? 'bg-[#A88B4B] text-[#0A0C10] shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Simulador Neural</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: MINHA VOZ HUMANA */}
      {activeSubTab === 'my_voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Recording Studio */}
          <div className="lg:col-span-5 bg-[#15181E] border border-[#1F2229] p-5 rounded-xl space-y-5 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2229] pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  <span>Gravador de Frases (Voz Real)</span>
                </h3>
                <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  Microfone HD
                </span>
              </div>

              {/* Quick Training Sample Selector */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Sugestões de Frases para Gravar:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_TRAINING_PHRASES.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDefaultTraining(item)}
                      className="p-2 bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-[#A88B4B]/50 rounded text-left transition-all"
                    >
                      <span className="text-[10px] font-bold text-[#A88B4B] block">{item.title}</span>
                      <span className="text-[10px] text-gray-400 line-clamp-1">{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Text Input */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                    Título do Áudio:
                  </label>
                  <input
                    type="text"
                    value={recordingTitle}
                    onChange={(e) => setRecordingTitle(e.target.value)}
                    className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
                    placeholder="Ex: Apresentação para Clientes VIP"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                      Frase para Falar (Roteiro):
                    </label>
                  </div>

                  {/* Variable insertion buttons */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      { tag: '{primeiro_nome}', label: 'Nome' },
                      { tag: '{saudacao}', label: 'Saudação' },
                      { tag: '{tratar_genero}', label: 'Gênero' },
                      { tag: '{veiculo}', label: 'Veículo' },
                      { tag: '{tratar_veiculo}', label: 'Tratamento Veículo' },
                    ].map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => setRecordingText((prev) => prev + ' ' + v.tag)}
                        className="bg-[#15181E] hover:bg-[#A88B4B]/20 text-[#A88B4B] border border-[#A88B4B]/30 px-2 py-0.5 rounded text-[10px] font-mono transition-all"
                        title={`Inserir ${v.tag}`}
                      >
                        + {v.tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={recordingText}
                    onChange={(e) => setRecordingText(e.target.value)}
                    className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-2.5 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B] font-sans"
                    placeholder="Digite a frase que você lerá em voz alta..."
                  />
                </div>
              </div>

              {/* Contact Selector for Preview */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                  Testar com Contato / Perfil Exemplo:
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B]"
                >
                  <option value="">-- Exemplo Padrão (Guilherme, Carro, Homem) --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.gender === 'mulher' ? '👩 Mulher' : '👨 Homem'} • {c.vehicleType === 'moto' ? '🏍️ Moto' : '🚗 Carro'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Render Preview */}
              <div className="bg-[#0A0C10] p-3 rounded-lg border border-[#1F2229] space-y-1">
                <span className="text-[10px] text-[#A88B4B] font-bold uppercase tracking-widest block">
                  Roteiro com Variáveis Processadas Live:
                </span>
                <p className="text-xs text-gray-300 italic font-sans leading-relaxed">
                  "{processedRecordingText}"
                </p>
              </div>
            </div>

            {/* Recording Controls & Visualizer */}
            <div className="pt-4 border-t border-[#1F2229] space-y-4">
              {/* VU Meter Visualizer */}
              {isRecording && (
                <div className="space-y-1 bg-[#0A0C10] p-3 rounded-lg border border-red-500/30">
                  <div className="flex items-center justify-between text-[10px] text-red-400 font-mono font-bold">
                    <span className="flex items-center space-x-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span>GRAVANDO VOZ...</span>
                    </span>
                    <span>{recordingTime}s</span>
                  </div>

                  {/* Level Bar */}
                  <div className="w-full bg-[#15181E] h-2.5 rounded-full overflow-hidden border border-[#1F2229]">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full transition-all duration-75"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Record / Stop Button */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="w-full py-3.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center space-x-2"
                >
                  <Mic className="w-5 h-5 text-white" />
                  <span>Iniciar Gravação da Minha Voz</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="w-full py-3.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-600/30 transition-all flex items-center justify-center space-x-2 animate-pulse"
                >
                  <Square className="w-5 h-5 text-white" />
                  <span>Concluir Gravação & Salvar ({recordingTime}s)</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Voice Phrases Library */}
          <div className="lg:col-span-7 bg-[#15181E] border border-[#1F2229] p-5 rounded-xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1F2229] pb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center space-x-2">
                  <FileAudio className="w-4 h-4 text-[#A88B4B]" />
                  <span>Minha Biblioteca de Áudios Gravados</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Frases salvas na sua própria voz para ouvir, baixar ou enviar diretamente no WhatsApp.
                </p>
              </div>

              <span className="bg-[#A88B4B]/10 text-[#A88B4B] border border-[#A88B4B]/30 px-2.5 py-1 rounded text-xs font-mono font-bold">
                {myVoicePhrases.length} arquivo(s)
              </span>
            </div>

            {/* List of Phrases */}
            {myVoicePhrases.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-[#1F2229] rounded-xl space-y-3">
                <Mic className="w-10 h-10 text-gray-600 mx-auto" />
                <h4 className="text-sm font-semibold text-gray-300">Nenhum áudio gravado ainda</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Utilize o painel ao lado para gravar suas frases em voz alta. Seus áudios ficarão salvos aqui no seu navegador!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {myVoicePhrases.map((phrase) => {
                  const isPlayingThis = playingPhraseId === phrase.id;
                  return (
                    <div
                      key={phrase.id}
                      className="bg-[#0A0C10] border border-[#1F2229] hover:border-[#A88B4B]/30 p-4 rounded-xl transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3">
                          <button
                            type="button"
                            onClick={() => handlePlayPhrase(phrase)}
                            className={`p-3 rounded-lg font-bold transition-all shrink-0 ${
                              isPlayingThis
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10]'
                            }`}
                            title={isPlayingThis ? 'Pausar Áudio' : 'Ouvir Minha Voz'}
                          >
                            {isPlayingThis ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                          </button>

                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                              <span>{phrase.title}</span>
                              {phrase.durationSeconds !== undefined && (
                                <span className="text-[10px] bg-[#15181E] text-[#A88B4B] border border-[#1F2229] px-2 py-0.5 rounded font-mono">
                                  {phrase.durationSeconds}s
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-gray-400 mt-1 italic font-sans leading-relaxed">
                              "{phrase.text}"
                            </p>
                            <span className="text-[10px] text-gray-500 font-mono block mt-1">
                              Gravado em {phrase.createdAt}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSendAudioToWhatsApp(phrase)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow shadow-emerald-600/20"
                            title="Baixar Áudio e Abrir WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar Áudio</span>
                          </button>

                          <a
                            href={phrase.audioDataUrl}
                            download={`${phrase.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.webm`}
                            className="p-2 text-gray-400 hover:text-[#A88B4B] hover:bg-[#15181E] rounded-lg transition-all border border-[#1F2229]"
                            title="Baixar Arquivo de Áudio (.webm)"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeletePhrase(phrase.id)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-[#15181E] rounded-lg transition-all border border-[#1F2229]"
                            title="Excluir Áudio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SIMULADOR NEURAL TTS */}
      {activeSubTab === 'neural_tts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="md:col-span-1 bg-[#15181E] border border-[#1F2229] p-5 rounded-xl space-y-5 shadow-xl">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center space-x-1.5 border-b border-[#1F2229] pb-3">
              <Sliders className="w-4 h-4 text-[#A88B4B]" />
              <span>Ajustes da Voz Neural</span>
            </h3>

            {/* Voice Dropdown */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Vozes do Navegador / Sistema:
              </label>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
              >
                {availableVoices.length === 0 ? (
                  <option value="">Carregando vozes do sistema...</option>
                ) : (
                  availableVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Gender Preset Buttons */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Ajuste de Tom Por Gênero:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVoiceGender('female');
                    setPitch(1.2);
                  }}
                  className={`py-2.5 px-3 rounded border font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
                    voiceGender === 'female'
                      ? 'bg-[#A88B4B] text-[#0A0C10] border-[#A88B4B]'
                      : 'bg-[#0A0C10] text-gray-400 border-[#1F2229]'
                  }`}
                >
                  <span>👩 Agudo / Feminino</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVoiceGender('male');
                    setPitch(0.85);
                  }}
                  className={`py-2.5 px-3 rounded border font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
                    voiceGender === 'male'
                      ? 'bg-[#A88B4B] text-[#0A0C10] border-[#A88B4B]'
                      : 'bg-[#0A0C10] text-gray-400 border-[#1F2229]'
                  }`}
                >
                  <span>👨 Grave / Masculino</span>
                </button>
              </div>
            </div>

            {/* Speed Slider */}
            <div className="space-y-1.5 pt-2 border-t border-[#1F2229]">
              <div className="flex justify-between text-xs">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  Velocidade da Fala:
                </span>
                <span className="text-xs text-[#A88B4B] font-mono font-bold">{rate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-[#A88B4B] cursor-pointer bg-[#0A0C10]"
              />
            </div>

            {/* Pitch Slider */}
            <div className="space-y-1.5 pt-2 border-t border-[#1F2229]">
              <div className="flex justify-between text-xs">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  Grave / Agudo (Pitch):
                </span>
                <span className="text-xs text-[#A88B4B] font-mono font-bold">{pitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-[#A88B4B] cursor-pointer bg-[#0A0C10]"
              />
            </div>

            {/* Contact Selector */}
            <div className="pt-2 border-t border-[#1F2229]">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                Simular Variáveis do Contato:
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B]"
              >
                <option value="">-- Exemplo: Guilherme --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Player & Text Area */}
          <div className="md:col-span-2 bg-[#15181E] border border-[#1F2229] p-5 rounded-xl space-y-5 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-[#A88B4B]" />
                  <span>Selecione um Modelo de Texto:</span>
                </label>

                {templates.length > 0 && (
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTemplateId(id);
                      const tmpl = templates.find((t) => t.id === id);
                      if (tmpl) setTextToRead(tmpl.content);
                    }}
                    className="bg-[#0A0C10] border border-[#1F2229] rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B] max-w-[220px]"
                  >
                    <option value="">-- Selecionar da lista --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.category} - {t.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    Texto para Síntese Vocal:
                  </label>
                </div>

                {/* Variable insertion buttons */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { tag: '{primeiro_nome}', label: 'Nome' },
                    { tag: '{saudacao}', label: 'Saudação' },
                    { tag: '{tratar_genero}', label: 'Gênero' },
                    { tag: '{veiculo}', label: 'Veículo' },
                    { tag: '{tratar_veiculo}', label: 'Tratamento Veículo' },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => setTextToRead((prev) => prev + ' ' + v.tag)}
                      className="bg-[#0A0C10] hover:bg-[#A88B4B]/20 text-[#A88B4B] border border-[#A88B4B]/30 px-2 py-0.5 rounded text-[10px] font-mono transition-all"
                      title={`Inserir ${v.tag}`}
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={5}
                  value={textToRead}
                  onChange={(e) => setTextToRead(e.target.value)}
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-lg p-3.5 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B] leading-relaxed font-sans"
                />
              </div>

              {/* Render Preview */}
              <div className="bg-[#A88B4B]/5 border border-[#A88B4B]/20 p-4 rounded-lg space-y-1.5">
                <span className="text-[10px] text-[#A88B4B] font-bold uppercase tracking-widest flex items-center justify-between">
                  <span>Texto Final Processado (Saudação = {getTimeBasedGreeting()}):</span>
                </span>
                <p className="text-xs text-gray-200 font-sans italic leading-relaxed">
                  "{processedTTSText}"
                </p>
              </div>
            </div>

            {/* Play Button */}
            <div className="pt-4 border-t border-[#1F2229]">
              {isPlayingTTS ? (
                <button
                  type="button"
                  onClick={handleStopSpeech}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-3.5 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 shadow-lg shadow-red-600/20"
                >
                  <Square className="w-4 h-4" />
                  <span>Parar Leitura Sintética</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePlaySpeech}
                  className="w-full bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] py-3.5 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#A88B4B]/20"
                >
                  <Volume2 className="w-5 h-5" />
                  <span>Ouvir Leitura em Voz Alta (Tom {voiceGender === 'female' ? 'Feminino' : 'Masculino'})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AUDIO SEND INSTRUCTIONS MODAL */}
      {audioSendInfoModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#15181E] border border-emerald-500/40 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Volume2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Como Funciona o Envio de Áudio no WhatsApp</h3>
                <p className="text-xs text-emerald-400/90 font-medium">
                  Destinatário: {audioSendInfoModal.contactName} ({audioSendInfoModal.phone})
                </p>
              </div>
            </div>

            <div className="bg-[#0A0C10] border border-[#1F2229] p-4 rounded-xl space-y-3 text-xs text-gray-300">
              <p className="font-bold text-amber-400 flex items-center space-x-1.5">
                <span>⚠️ Por que o navegador abre a conversa com o áudio salvo?</span>
              </p>
              <p className="text-gray-300 leading-relaxed">
                Por regras rígidas de segurança de todos os navegadores (Chrome, Safari, Edge), nenhum site da web tem permissão de injetar arquivos de áudio diretamente dentro do aplicativo WhatsApp sem autorização do sistema operacional.
              </p>

              <div className="space-y-2 pt-1">
                <p className="font-bold text-white uppercase text-[10px] tracking-wider">Formas de Envio Direto Disponíveis:</p>
                <ul className="space-y-3 text-gray-200 font-medium bg-[#15181E] p-3.5 rounded-lg border border-[#1F2229] overflow-hidden">
                  <li className="flex flex-col sm:flex-row sm:items-start space-y-1 sm:space-y-0 sm:space-x-2">
                    <span className="text-emerald-400 font-bold shrink-0">📱 1. No Celular / Tablet:</span>
                    <span className="text-gray-300 break-words flex-1">O sistema usa o <strong>Compartilhamento Nativo (Web Share)</strong> — o WhatsApp abre direto com o áudio anexado sem salvar na galeria!</span>
                  </li>
                  <li className="flex flex-col sm:flex-row sm:items-start space-y-1 sm:space-y-0 sm:space-x-2 pt-2 border-t border-[#1F2229]/50">
                    <span className="text-amber-400 font-bold shrink-0">💻 2. No Computador:</span>
                    <span className="text-gray-300 break-words flex-1">O áudio é baixado instantaneamente e a conversa é aberta. Basta <strong>arrastar o arquivo para o WhatsApp</strong> ou clicar no clipe 📎 {'>'} Áudio.</span>
                  </li>
                  <li className="flex flex-col sm:flex-row sm:items-start space-y-1 sm:space-y-0 sm:space-x-2 pt-2 border-t border-[#1F2229]/50">
                    <span className="text-cyan-400 font-bold shrink-0">🤖 3. Envio Automático (Webhook):</span>
                    <span className="text-gray-300 break-words flex-1">Nas <strong>Configurações</strong>, conecte uma API de WhatsApp (Ex: Z-API / Evolution). O áudio é enviado sozinho direto para o contato!</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAudioSendInfoModal(null)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-[#0A0C10] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg"
            >
              Entendi! Ir para o WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
