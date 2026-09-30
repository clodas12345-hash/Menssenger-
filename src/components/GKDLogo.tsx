import React from 'react';

interface GKDLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'badge';
  size?: 'sm' | 'md' | 'lg';
}

export const GKDLogo: React.FC<GKDLogoProps> = ({ className = '', variant = 'compact' }) => {
  if (variant === 'compact') {
    return (
      <div className={`relative flex items-center gap-2 p-0 m-0 bg-white transition-colors rounded-lg border border-slate-200/60 shrink-0 select-none overflow-hidden ${className}`}>
        <img 
          src="/logo.jpg" 
          alt="GKD Mobility Logo" 
          className="w-8 h-8 object-cover block" 
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.triedFallback) {
              target.dataset.triedFallback = 'true';
              target.src = '/Mensseger.png';
            }
          }}
          referrerPolicy="no-referrer" 
        />
        <span className="text-[11px] font-bold text-slate-800 tracking-wider uppercase pr-2">GKD Mobility</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-0 m-0 shadow-sm border border-slate-200/80 text-slate-900 flex flex-col items-center text-center select-none overflow-hidden ${className}`}>
      <img 
        src="/logo.jpg" 
        alt="GKD Mobility Logo" 
        className="w-full h-24 object-cover block" 
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.dataset.triedFallback) {
            target.dataset.triedFallback = 'true';
            target.src = '/Mensseger.png';
          }
        }}
        referrerPolicy="no-referrer" 
      />
      <div className="p-4 flex flex-col items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-slate-900">GKD Mobility</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-medium italic">Sua solução em mensagens.</p>
      </div>
    </div>
  );
};

export const GkbLogo = GKDLogo;
export default GKDLogo;
