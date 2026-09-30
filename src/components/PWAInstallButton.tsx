import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Smartphone, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 bg-[#A88B4B] hover:bg-[#C5A968] text-slate-950 px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider shadow-lg transition-all animate-in fade-in slide-in-from-right-4"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar Aplicativo</span>
        <span className="sm:hidden">Instalar</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 bg-[#1A1D23] hover:bg-[#252A33] text-[#A88B4B] border border-[#A88B4B]/30 px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider shadow-lg transition-all"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#12151C] border border-[#1F2229] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-[#A88B4B]/10 p-2 rounded-xl border border-[#A88B4B]/30">
                  <Smartphone className="w-5 h-5 text-[#A88B4B]" />
                </div>
                <button onClick={() => setShowIOSGuide(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2">Instalar no iPhone / iPad</h3>
              <p className="text-sm text-gray-400 leading-relaxed space-y-3">
                Para instalar o GKD Mobility no seu dispositivo iOS:
              </p>
              
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1F2229] flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">1</div>
                  <p className="text-sm text-gray-300">Toque no botão de <strong>Compartilhar</strong> na barra de ferramentas do Safari.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1F2229] flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">2</div>
                  <p className="text-sm text-gray-300">Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-[#A88B4B] py-3 text-sm font-bold text-slate-950 hover:bg-[#C5A968] transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
