import React from 'react';
import { 
  MessageSquare, 
  Users, 
  Calendar, 
  FileText, 
  Clock, 
  Settings, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  Send,
  Sparkles,
  Mic,
  Image as ImageIcon,
  HelpCircle,
  Smartphone,
  BarChart3,
  MessageCircle,
  Save,
  Activity
} from 'lucide-react';
import { ScheduledCampaign, DispatchLogItem, AppSettings } from '../types';
import { GKDLogo } from './GKDLogo';
import { RealTimeCounter } from './RealTimeCounter';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeCampaignsCount: number;
  dueCampaignsCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onOpenNewCampaign: () => void;
  onOpenSettings: () => void;
  onOpenActiveDispatcher: () => void;
  onOpenHelp: () => void;
  onOpenApkExport: () => void;
  onOpenLogoInfo?: () => void;
  onOpenSaveAndReset?: () => void;
  onOpenPermissions?: () => void;
  logs: DispatchLogItem[];
  settings: AppSettings;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  activeTab,
  setActiveTab,
  activeCampaignsCount,
  dueCampaignsCount,
  soundEnabled,
  setSoundEnabled,
  onOpenNewCampaign,
  onOpenSettings,
  onOpenActiveDispatcher,
  onOpenHelp,
  onOpenApkExport,
  onOpenLogoInfo,
  onOpenSaveAndReset,
  onOpenPermissions,
  logs,
  settings,
}) => {
  return (
    <header className="bg-[#0F1115] text-[#D1D5DB] border-b border-[#1F2229] sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div 
            className="flex items-center gap-3.5 sm:gap-4 cursor-pointer group hover:opacity-95 transition-opacity select-none py-1" 
            onClick={() => {
              if (onOpenLogoInfo) onOpenLogoInfo();
            }} 
            title="Clique para ampliar o logo"
          >
            <div className="bg-white rounded-xl shadow-md border border-slate-200/50 flex items-center justify-center shrink-0 w-12 h-12 sm:w-13 sm:h-13 overflow-hidden active:scale-90 transition-transform">
              <img 
                src="/logo.jpg" 
                alt="GKD Mobility Logo" 
                className="w-full h-full object-cover block" 
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
            <div className="flex flex-col justify-center">
              <span className="text-white font-bold text-base sm:text-lg tracking-wide leading-tight">
                GKD Mobility
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-normal mt-0.5 leading-snug">
                Soluções em Mensagens
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#1A1D23] text-[#A88B4B] border border-[#A88B4B]/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#15181E]'
              }`}
            >
              <Clock className="w-4.5 h-4.5" />
              <span>Painel</span>
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'contacts'
                  ? 'bg-[#1A1D23] text-[#A88B4B] border border-[#A88B4B]/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#15181E]'
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              <span>Contatos</span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'templates'
                  ? 'bg-[#1A1D23] text-[#A88B4B] border border-[#A88B4B]/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#15181E]'
              }`}
            >
              <MessageSquare className="w-4.5 h-4.5" />
              <span>Modelos</span>
            </button>

            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'cards'
                  ? 'bg-[#1A1D23] text-[#A88B4B] border border-[#A88B4B]/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#15181E]'
              }`}
            >
              <ImageIcon className="w-4.5 h-4.5 text-[#A88B4B]" />
              <span>Cards</span>
            </button>

            <button
              onClick={() => setActiveTab('voice')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'voice'
                  ? 'bg-[#1A1D23] text-[#A88B4B] border border-[#A88B4B]/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#15181E]'
              }`}
            >
              <Mic className="w-4.5 h-4.5 text-purple-400" />
              <span>Simulador de Voz</span>
            </button>

            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-[#1A1D23] text-[#A88B4B] border border-[#A88B4B]/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#15181E]'
              }`}
            >
              <Calendar className="w-4.5 h-4.5" />
              <span>Agendamentos</span>
              {activeCampaignsCount > 0 && (
                <span className="bg-[#A88B4B] text-[#0A0C10] text-[10px] px-1.5 py-0.2 rounded font-bold">
                  {activeCampaignsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'history'
                  ? 'bg-[#1A1D23] text-[#A88B4B] border border-[#A88B4B]/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#15181E]'
              }`}
            >
              <FileText className="w-4.5 h-4.5" />
              <span>Histórico</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'analytics'
                  ? 'bg-[#1A1D23] text-[#A88B4B] border border-[#A88B4B]/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#15181E]'
              }`}
            >
              <BarChart3 className="w-4.5 h-4.5 text-[#A88B4B]" />
              <span>Análise</span>
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2">

            {dueCampaignsCount > 0 && (
              <button
                onClick={onOpenActiveDispatcher}
                className="animate-pulse bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-2.5 sm:px-3.5 py-2 rounded font-bold text-xs uppercase tracking-widest flex items-center space-x-1 sm:space-x-1.5 shadow-lg shadow-[#A88B4B]/20 transition-all"
              >
                <Send className="w-4.5 h-4.5" />
                <span className="hidden sm:inline">Disparar ({dueCampaignsCount})</span>
                <span className="sm:hidden">{dueCampaignsCount}</span>
              </button>
            )}

            {/* PLUS BUTTON WAS HERE */}
            
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Sons Ativados' : 'Sons Mutos'}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-[#15181E] rounded transition-colors hidden sm:flex"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-[#A88B4B]" /> : <VolumeX className="w-5 h-5 text-gray-600" />}
            </button>

            <button
              onClick={onOpenHelp}
              title="Ajuda e Manual"
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-[#15181E] rounded transition-colors hidden sm:flex"
            >
              <HelpCircle className="w-5 h-5 text-[#A88B4B]" />
            </button>

            <PWAInstallButton />

            {/* FALE CONOSCO AND SAVE WERE HERE, USER WANTS THEM REMOVED AND MOVED TO SETTINGS */}
            
            <button
              onClick={onOpenSettings}
              title="Configurações do App"
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-[#15181E] rounded transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden grid grid-cols-4 gap-1 bg-[#0A0C10] border-t border-[#1F2229] py-2 px-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-2 px-1 text-[10px] font-semibold uppercase tracking-wider rounded ${
            activeTab === 'dashboard' ? 'bg-[#1A1D23] text-[#A88B4B]' : 'text-gray-500 hover:bg-[#15181E]'
          }`}
        >
          <Clock className="w-5 h-5 mb-1" />
          <span>Painel</span>
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex flex-col items-center justify-center py-2 px-1 text-[10px] font-semibold uppercase tracking-wider rounded ${
            activeTab === 'contacts' ? 'bg-[#1A1D23] text-[#A88B4B]' : 'text-gray-500 hover:bg-[#15181E]'
          }`}
        >
          <Users className="w-5 h-5 mb-1" />
          <span>Contatos</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex flex-col items-center justify-center py-2 px-1 text-[10px] font-semibold uppercase tracking-wider rounded ${
            activeTab === 'templates' ? 'bg-[#1A1D23] text-[#A88B4B]' : 'text-gray-500 hover:bg-[#15181E]'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-1" />
          <span>Modelos</span>
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex flex-col items-center justify-center py-2 px-1 text-[10px] font-semibold uppercase tracking-wider rounded ${
            activeTab === 'cards' ? 'bg-[#1A1D23] text-[#A88B4B]' : 'text-gray-500 hover:bg-[#15181E]'
          }`}
        >
          <ImageIcon className="w-5 h-5 mb-1 text-[#A88B4B]" />
          <span>Cards</span>
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex flex-col items-center justify-center py-2 px-1 text-[10px] font-semibold uppercase tracking-wider rounded ${
            activeTab === 'voice' ? 'bg-[#1A1D23] text-[#A88B4B]' : 'text-gray-500 hover:bg-[#15181E]'
          }`}
        >
          <Mic className="w-5 h-5 mb-1 text-purple-400" />
          <span>Voz</span>
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex flex-col items-center justify-center py-2 px-1 text-[10px] font-semibold uppercase tracking-wider rounded ${
            activeTab === 'campaigns' ? 'bg-[#1A1D23] text-[#A88B4B]' : 'text-gray-500 hover:bg-[#15181E]'
          }`}
        >
          <Calendar className="w-5 h-5 mb-1" />
          <span>Agenda</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center py-2 px-1 text-[10px] font-semibold uppercase tracking-wider rounded ${
            activeTab === 'history' ? 'bg-[#1A1D23] text-[#A88B4B]' : 'text-gray-500 hover:bg-[#15181E]'
          }`}
        >
          <FileText className="w-5 h-5 mb-1" />
          <span>Histórico</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center justify-center py-2 px-1 text-[10px] font-semibold uppercase tracking-wider rounded ${
            activeTab === 'analytics' ? 'bg-[#1A1D23] text-[#A88B4B]' : 'text-gray-500 hover:bg-[#15181E]'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-1 text-[#A88B4B]" />
          <span>Análise</span>
        </button>
      </div>
    </header>
  );
});
