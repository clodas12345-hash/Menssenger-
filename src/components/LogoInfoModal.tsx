import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface LogoInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoInfoModal: React.FC<LogoInfoModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative flex flex-col items-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-gray-300 hover:text-white bg-[#15181E]/90 hover:bg-[#1F2229] border border-[#2A2E39] rounded-full transition-all shadow-xl z-20 cursor-pointer active:scale-95"
          title="Fechar"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LOGO: Tamanho de 80% da tela do celular */}
        <div 
          className="w-[80vw] max-w-[80vw] sm:max-w-[500px] h-auto bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-4 border-[#A88B4B] overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center p-0 m-0"
          onClick={onClose}
          title="Toque para fechar"
        >
          <img 
            src="/logo.jpg" 
            alt="GKD Mobility Logo" 
            className="w-full h-auto object-contain block m-0 p-0 select-none" 
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.triedFallback) {
                target.dataset.triedFallback = 'true';
                target.src = '/Mensseger.png';
              }
            }}
            referrerPolicy="no-referrer" 
          />
        </div>

        {/* Legenda de identificação */}
        <div className="mt-3.5 flex flex-col items-center text-center">
          <span className="text-white font-bold text-base sm:text-lg tracking-wide leading-tight">
            GKD Mobility
          </span>
          <span className="text-xs text-[#A88B4B] font-medium mt-0.5 leading-snug">
            Soluções em Mensagens
          </span>
          <span className="text-[10px] text-gray-400 mt-1.5 uppercase tracking-wider font-semibold">
            Toque para fechar
          </span>
        </div>
      </div>
    </div>
  );
};

