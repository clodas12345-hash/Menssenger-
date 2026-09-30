import React, { useState, useEffect, useMemo } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  Plus, 
  Download, 
  Sparkles, 
  Send,
  Search,
  Filter,
  CheckSquare,
  Square,
  X,
  Layers,
  Grid,
  Edit2,
  Link as LinkIcon,
  Save,
  RotateCcw,
  AlertTriangle,
  CopyCheck,
  Share2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { loadFromStorage, saveToStorage, getContacts, getSettings } from '../utils/storage';
import { Contact } from '../types';
import { buildWhatsAppLink, openWhatsAppLink, safeConfirm } from '../utils/whatsapp';
import { copyImageDataUrlToClipboard, shareImageFile, formatCardWhatsAppMessage } from '../utils/imageSharing';

export interface CardItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  createdAt: string;
}

const STORAGE_KEY_CARDS = 'gkd_cards_album_v1';

const DEFAULT_CARDS: CardItem[] = [
  {
    id: 'card_1',
    title: 'Bom Dia Especial',
    category: 'Saudações',
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80',
    createdAt: new Date().toLocaleDateString('pt-BR'),
  },
  {
    id: 'card_2',
    title: 'Proposta Comercial VIP',
    category: 'Vendas',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
    createdAt: new Date().toLocaleDateString('pt-BR'),
  },
  {
    id: 'card_3',
    title: 'Campanha de Primeira Corrida 99',
    category: 'Primeira Corrida',
    imageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&auto=format&fit=crop&q=80',
    createdAt: new Date().toLocaleDateString('pt-BR'),
  },
  {
    id: 'card_4',
    title: 'Simulação de Ganhos Semanais',
    category: 'Simulação',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    createdAt: new Date().toLocaleDateString('pt-BR'),
  },
];

// Canvas Image Compression Helper to keep Base64 strings under 40KB
const compressImageFile = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve((e.target?.result as string) || '');
        }
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

interface CardsViewProps {
  onNavigate?: (tab: string) => void;
}

export const CardsView: React.FC<CardsViewProps> = React.memo(({ onNavigate }) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('Geral');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [addMode, setAddMode] = useState<'file' | 'url'>('file');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewModalCard, setPreviewModalCard] = useState<CardItem | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [isContactSendModalOpen, setIsContactSendModalOpen] = useState<boolean>(false);
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [targetContactName, setTargetContactName] = useState<string>('');
  const [cardLayout, setCardLayout] = useState<'grid' | 'compact' | 'list'>('grid');
  const [saveStatusMsg, setSaveStatusMsg] = useState<string | null>(null);
  const [onlyDuplicatesFilter, setOnlyDuplicatesFilter] = useState<boolean>(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState<boolean>(false);

  useEffect(() => {
    const loaded = loadFromStorage<CardItem[]>(STORAGE_KEY_CARDS, DEFAULT_CARDS);
    setCards(loaded);
  }, []);

  // Map of title and image duplicate frequencies
  const duplicateMaps = useMemo(() => {
    const titleMap = new Map<string, number>();
    const imageMap = new Map<string, number>();

    cards.forEach((c) => {
      const t = c.title.trim().toLowerCase();
      const img = c.imageUrl.trim();
      if (t) titleMap.set(t, (titleMap.get(t) || 0) + 1);
      if (img) imageMap.set(img, (imageMap.get(img) || 0) + 1);
    });

    return { titleMap, imageMap };
  }, [cards]);

  const getDuplicateInfo = (card: CardItem) => {
    const t = card.title.trim().toLowerCase();
    const img = card.imageUrl.trim();
    const tCount = duplicateMaps.titleMap.get(t) || 0;
    const imgCount = duplicateMaps.imageMap.get(img) || 0;

    const isDupTitle = tCount > 1;
    const isDupImage = imgCount > 1;
    const isDuplicate = isDupTitle || isDupImage;

    let label = '';
    if (isDupTitle && isDupImage) label = 'Título e imagem repetidos';
    else if (isDupTitle) label = `Título repetido (${tCount}x)`;
    else if (isDupImage) label = `Imagem repetida (${imgCount}x)`;

    return { isDuplicate, isDupTitle, isDupImage, count: Math.max(tCount, imgCount), label };
  };

  // Count total duplicate cards in entire collection
  const totalDuplicates = useMemo(() => {
    return cards.filter((c) => getDuplicateInfo(c).isDuplicate).length;
  }, [cards, duplicateMaps]);

  // Function to clean duplicates (keep first instance of each title/image pair)
  const handleRemoveDuplicates = () => {
    if (totalDuplicates === 0) return;
    const seenTitles = new Set<string>();
    const seenImages = new Set<string>();
    const uniqueCards: CardItem[] = [];

    cards.forEach((c) => {
      const t = c.title.trim().toLowerCase();
      const img = c.imageUrl.trim();

      const isDupTitle = Boolean(t && seenTitles.has(t));
      const isDupImg = Boolean(img && seenImages.has(img));

      if (!isDupTitle && !isDupImg) {
        if (t) seenTitles.add(t);
        if (img) seenImages.add(img);
        uniqueCards.push(c);
      }
    });

    saveCards(uniqueCards);
    setOnlyDuplicatesFilter(false);
    setSaveStatusMsg(`✅ Duplicados removidos! Sobraram ${uniqueCards.length} cards únicos.`);
    setTimeout(() => setSaveStatusMsg(null), 4000);
  };

  const saveCards = (updated: CardItem[]): boolean => {
    setCards(updated);
    const ok = saveToStorage(STORAGE_KEY_CARDS, updated);
    if (ok) {
      setSaveStatusMsg('✅ Cards salvos com sucesso!');
      setTimeout(() => setSaveStatusMsg(null), 3000);
    } else {
      setSaveStatusMsg('⚠️ Erro ao salvar no armazenamento local do navegador.');
    }
    return ok;
  };

  const handleAddByUrl = () => {
    if (!imageUrlInput.trim()) {
      alert('Por favor, informe o link/URL da imagem.');
      return;
    }

    const newCard: CardItem = {
      id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: title.trim() || 'Novo Card',
      category: category.trim() || 'Geral',
      imageUrl: imageUrlInput.trim(),
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };

    const updated = [newCard, ...cards];
    saveCards(updated);
    setTitle('');
    setImageUrlInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    const newCards: CardItem[] = [];

    for (const file of fileList) {
      const compressedDataUrl = await compressImageFile(file);
      newCards.push({
        id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: title.trim() || file.name.replace(/\.[^/.]+$/, ''),
        category: category.trim() || 'Geral',
        imageUrl: compressedDataUrl,
        createdAt: new Date().toLocaleDateString('pt-BR'),
      });
    }

    const updated = [...newCards, ...cards];
    saveCards(updated);
    setTitle('');
    e.target.value = '';
  };

  const handleSaveEdit = () => {
    if (!editingCard) return;
    const updated = cards.map((c) => (c.id === editingCard.id ? editingCard : c));
    saveCards(updated);
    setEditingCard(null);
  };

  const handleResetDefaults = () => {
    saveCards(DEFAULT_CARDS);
    setSaveStatusMsg('✅ Cards padrões restaurados com sucesso!');
    setTimeout(() => setSaveStatusMsg(null), 3000);
  };

  const handleDeleteCard = (id: string) => {
    const updated = cards.filter((c) => c.id !== id);
    setSelectedCardIds(prev => prev.filter(i => i !== id));
    saveCards(updated);
    setSaveStatusMsg('🗑️ Card excluído com sucesso!');
    setTimeout(() => setSaveStatusMsg(null), 3000);
  };

  const handleDeleteSelected = () => {
    if (selectedCardIds.length === 0) return;
    const count = selectedCardIds.length;
    const updated = cards.filter((c) => !selectedCardIds.includes(c.id));
    saveCards(updated);
    setSelectedCardIds([]);
    setSaveStatusMsg(`🗑️ ${count} card(s) excluído(s) com sucesso!`);
    setTimeout(() => setSaveStatusMsg(null), 3000);
  };

  const handleToggleSelectCard = (id: string) => {
    if (selectedCardIds.includes(id)) {
      setSelectedCardIds(selectedCardIds.filter((i) => i !== id));
    } else {
      setSelectedCardIds([...selectedCardIds, id]);
    }
  };

  const handleCopyImagePhoto = async (card: CardItem) => {
    const success = await copyImageDataUrlToClipboard(card.imageUrl);
    if (success) {
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 2500);
      setSaveStatusMsg(`📸 Foto do card "${card.title}" copiada! Pressione Ctrl+V no WhatsApp para colar.`);
      setTimeout(() => setSaveStatusMsg(null), 5000);
    } else {
      try {
        await navigator.clipboard.writeText(card.imageUrl);
        setCopiedId(card.id);
        setTimeout(() => setCopiedId(null), 2000);
        setSaveStatusMsg(`🔗 Link da imagem copiado!`);
        setTimeout(() => setSaveStatusMsg(null), 3000);
      } catch (e) {
        alert('Não foi possível copiar a imagem.');
      }
    }
  };

  const handleShareSingleCard = async (card: CardItem) => {
    // Attempt Web Share API first
    const shared = await shareImageFile(card.title, card.imageUrl);
    if (shared) return;

    // Otherwise copy image to clipboard and open WhatsApp
    await copyImageDataUrlToClipboard(card.imageUrl);
    const messageText = formatCardWhatsAppMessage([card]);
    const settings = getSettings();
    const url = buildWhatsAppLink('', messageText, settings.sendMode);
    openWhatsAppLink(url);

    setSaveStatusMsg(`📸 Foto do card copiada! Pressione Ctrl+V no WhatsApp para colar.`);
    setTimeout(() => setSaveStatusMsg(null), 6000);
  };

  const handleCopyAllSelectedLinks = async () => {
    const selectedCards = cards.filter((c) => selectedCardIds.includes(c.id));
    if (selectedCards.length === 0) return;

    // Copy first image as binary to clipboard if available
    if (selectedCards.length > 0) {
      await copyImageDataUrlToClipboard(selectedCards[0].imageUrl);
    }

    const text = formatCardWhatsAppMessage(selectedCards);
    try {
      await navigator.clipboard.writeText(text);
      setSaveStatusMsg(`✅ Texto e Foto do card copiados! Pressione Ctrl+V no WhatsApp para colar.`);
      setTimeout(() => setSaveStatusMsg(null), 5000);
    } catch (e) {
      alert('Erro ao copiar dados dos cards.');
    }
  };

  // Get all categories dynamically
  const categoriesList = ['Todos', ...Array.from(new Set(cards.map((c) => c.category || 'Geral')))];

  // Filtered cards according to search, category pill, and duplicate filter
  const filteredCards = cards.filter((card) => {
    const cardCat = card.category || 'Geral';
    const matchesCat = activeCategoryFilter === 'Todos' || cardCat === activeCategoryFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || card.title.toLowerCase().includes(term) || cardCat.toLowerCase().includes(term);
    const matchesDuplicates = !onlyDuplicatesFilter || getDuplicateInfo(card).isDuplicate;
    return matchesCat && matchesSearch && matchesDuplicates;
  });

  const isAllFilteredSelected = filteredCards.length > 0 && filteredCards.every((c) => selectedCardIds.includes(c.id));

  const handleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      const combined = new Set([...selectedCardIds, ...filteredCards.map((c) => c.id)]);
      setSelectedCardIds(Array.from(combined));
    } else {
      const filteredIds = new Set(filteredCards.map((c) => c.id));
      setSelectedCardIds(selectedCardIds.filter((id) => !filteredIds.has(id)));
    }
  };

  const savedContacts: Contact[] = getContacts();

  const handleSendSelectedToContact = async (contactPhone: string) => {
    const selectedCards = cards.filter((c) => selectedCardIds.includes(c.id));
    if (selectedCards.length === 0 || !contactPhone) return;

    const contact = savedContacts.find((c) => c.phone === contactPhone);
    const isMe = contact && (
      contact.name.toLowerCase() === 'me' ||
      contact.name.toLowerCase() === 'eu' ||
      contact.name.toLowerCase() === 'mim'
    );

    const messageText = formatCardWhatsAppMessage(selectedCards);
    const isMondayMsg = messageText.toLowerCase().includes('segunda') ||
                        messageText.toLowerCase().includes('monday');

    const isTodayMonday = new Date().getDay() === 1;

    if (isMe) {
      alert('⚠️ Envio bloqueado: Não é permitido enviar mensagens para si mesmo.');
      return;
    }

    if (isMondayMsg && !isTodayMonday) {
      alert('⚠️ Envio bloqueado: Esta é uma mensagem de segunda-feira, mas hoje não é segunda-feira.');
      return;
    }

    // Copy the primary selected card image to clipboard for easy Ctrl+V pasting
    if (selectedCards.length > 0) {
      await copyImageDataUrlToClipboard(selectedCards[0].imageUrl);
    }

    const settings = getSettings();
    const url = buildWhatsAppLink(contactPhone, messageText, settings.sendMode);
    openWhatsAppLink(url);
    setIsContactSendModalOpen(false);

    setSaveStatusMsg(`📸 Foto do card copiada para a área de transferência! Pressione Ctrl+V na conversa do WhatsApp para enviar a imagem.`);
    setTimeout(() => setSaveStatusMsg(null), 6000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-[#15181E] border border-[#1F2229] p-6 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-t-4 border-t-[#A88B4B]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-[#A88B4B] uppercase tracking-widest flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-[#A88B4B]" />
              <span>Grade de Escolha de Cards & Imagens</span>
            </span>
          </div>
          <h2 className="text-2xl font-serif italic text-white mt-1 flex items-center space-x-2">
            <Grid className="w-6 h-6 text-[#A88B4B]" />
            <span>Grade de Seleção de Cards</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Escolha os cards na grade abaixo para copiar, compartilhar ou enviar diretamente aos seus contatos no WhatsApp.
          </p>
          {saveStatusMsg && (
            <div className="mt-2 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded inline-block">
              {saveStatusMsg}
            </div>
          )}
        </div>

        {/* Upload / Add Box */}
        <div className={`bg-[#0A0C10] rounded-xl border border-[#1F2229] transition-all duration-300 flex flex-col overflow-hidden ${isAddCardOpen ? 'min-w-[320px] p-4' : 'min-w-[200px] p-2'}`}>
          <div className="flex items-center justify-between w-full">
            <button 
              type="button"
              onClick={() => setIsAddCardOpen(!isAddCardOpen)}
              className="flex items-center justify-between flex-1 group text-left cursor-pointer"
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isAddCardOpen ? 'text-[#A88B4B]' : 'text-gray-400 group-hover:text-white'}`}>
                {isAddCardOpen ? 'Adicionar Novo Card' : 'Cadastrar Novo Card'}
              </span>
              {!isAddCardOpen && (
                <div className="bg-[#A88B4B] p-1 rounded-md shadow-sm ml-2">
                  <Plus className="w-3 h-3 text-[#0A0C10]" />
                </div>
              )}
            </button>
            {isAddCardOpen && (
              <div className="flex items-center space-x-1 bg-[#15181E] p-0.5 rounded border border-[#1F2229] ml-2">
                <button
                  type="button"
                  onClick={() => setAddMode('file')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 ${
                    addMode === 'file' ? 'bg-[#A88B4B] text-[#0A0C10]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Arquivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('url')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 ${
                    addMode === 'url' ? 'bg-[#A88B4B] text-[#0A0C10]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Link URL</span>
                </button>
              </div>
            )}
          </div>

          {isAddCardOpen && (
            <div className="space-y-2 mt-3 pt-3 border-t border-[#1F2229] animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                type="text"
                placeholder="Título do Card..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#15181E] border border-[#1F2229] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A88B4B] w-full"
              />
              <input
                type="text"
                placeholder="Categoria (Ex: Saudações, Vendas)..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-[#15181E] border border-[#1F2229] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A88B4B] w-full"
              />

              {addMode === 'url' ? (
                <div className="flex space-x-2 pt-1">
                  <input
                    type="text"
                    placeholder="Link/URL da imagem (https://...)"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="bg-[#15181E] border border-[#1F2229] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A88B4B] flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddByUrl}
                    className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-3 py-1.5 rounded font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center space-x-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                </div>
              ) : (
                <label className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-4 py-2 rounded font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center justify-center space-x-2 w-full mt-1">
                  <Upload className="w-4 h-4" />
                  <span>Escolher do Computador</span>
                  <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DUPLICATES ALERT BAR */}
      {totalDuplicates > 0 && (
        <div className="bg-amber-950/40 border border-amber-600/50 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Identificamos <strong>{totalDuplicates} card(s) duplicado(s)</strong> (com título ou imagem repetida) na coleção.</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setOnlyDuplicatesFilter(!onlyDuplicatesFilter)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all border flex items-center space-x-1 ${
                onlyDuplicatesFilter
                  ? 'bg-amber-500 text-black border-amber-400 font-black'
                  : 'bg-[#0A0C10] text-amber-300 border-amber-700/60 hover:bg-amber-900/30'
              }`}
            >
              <CopyCheck className="w-3.5 h-3.5" />
              <span>{onlyDuplicatesFilter ? 'Exibindo Apenas Duplicados' : 'Filtrar Duplicados'}</span>
            </button>

            <button
              type="button"
              onClick={handleRemoveDuplicates}
              className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-700 px-3 py-1.5 rounded text-xs font-bold flex items-center space-x-1 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Duplicados</span>
            </button>
          </div>
        </div>
      )}

      {/* CATEGORY GRID FILTER PILLS */}
      <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-[#A88B4B]" />
            <span>Filtrar Categorias na Grade:</span>
          </span>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[10px] text-gray-400 hover:text-amber-400 flex items-center space-x-1"
              title="Restaurar cards padrões"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar Padrões</span>
            </button>
            <span className="text-xs text-[#A88B4B] font-mono font-bold">
              {filteredCards.length} card(s) disponível(is)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categoriesList.map((cat) => {
            const count = cat === 'Todos' ? cards.length : cards.filter((c) => (c.category || 'Geral') === cat).length;
            const isActive = activeCategoryFilter === cat;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                  isActive
                    ? 'bg-[#A88B4B] text-[#0A0C10] border-[#A88B4B] shadow-md shadow-[#A88B4B]/20'
                    : 'bg-[#0A0C10] text-gray-400 border-[#1F2229] hover:text-white hover:border-gray-700'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-[#0A0C10] text-[#A88B4B]' : 'bg-[#15181E] text-gray-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTION BAR & SEARCH BAR */}
      <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center space-x-2 text-xs font-bold text-gray-200 cursor-pointer bg-[#0A0C10] border border-[#1F2229] px-3.5 py-2 rounded-lg hover:border-[#A88B4B]">
            <input
              type="checkbox"
              checked={isAllFilteredSelected}
              onChange={(e) => handleSelectAllFiltered(e.target.checked)}
              className="rounded bg-[#15181E] border-[#1F2229] text-[#A88B4B] focus:ring-0 w-4 h-4"
            />
            <span className="uppercase tracking-wider">Selecionar Todos ({filteredCards.length})</span>
          </label>

          {selectedCardIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#A88B4B]/20 border border-[#A88B4B]/40 text-[#A88B4B] text-xs px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1">
                <CheckSquare className="w-4 h-4 text-[#A88B4B]" />
                <span>{selectedCardIds.length} card(s) escolhido(s)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  try {
                    const rawDraft = localStorage.getItem('zap_campaign_draft_v1');
                    const draft = rawDraft ? JSON.parse(rawDraft) : {};
                    draft.selectedCardIds = selectedCardIds;
                    draft.selectedCardId = selectedCardIds[0] || '';
                    localStorage.setItem('zap_campaign_draft_v1', JSON.stringify(draft));
                  } catch (e) {
                    console.error(e);
                  }
                  if (onNavigate) onNavigate('new_campaign');
                }}
                className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] text-xs font-black px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-all shadow-md flex items-center space-x-1.5"
              >
                <span>🚀 Agendar Disparo com estes {selectedCardIds.length} Cards (Envio Aleatório)</span>
              </button>
            </div>
          )}

          {/* Grid View Layout Selector */}
          <div className="flex items-center bg-[#0A0C10] border border-[#1F2229] p-1 rounded-lg space-x-1 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setCardLayout('grid')}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-all ${
                cardLayout === 'grid'
                  ? 'bg-[#A88B4B] text-[#0A0C10]'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Visualização em Grade Normal (4 Colunas)"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grade</span>
            </button>

            <button
              type="button"
              onClick={() => setCardLayout('compact')}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-all ${
                cardLayout === 'compact'
                  ? 'bg-[#A88B4B] text-[#0A0C10]'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Visualização em Grade Compacta (6 Colunas)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compacta</span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[#A88B4B] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar card por nome..."
            className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-lg pl-10 pr-4 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B]"
          />
        </div>
      </div>

      {/* BATCH ACTION BAR FOR SELECTED CARDS */}
      {selectedCardIds.length > 0 && (
        <div className="bg-gradient-to-r from-[#1A1D23] to-[#15181E] border-2 border-[#A88B4B] p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl animate-fade-in">
          <div className="flex items-center space-x-2 text-white text-xs font-bold">
            <span className="bg-[#A88B4B] text-[#0A0C10] p-1.5 rounded">
              <Check className="w-4 h-4" />
            </span>
            <span>Ações para os {selectedCardIds.length} cards escolhidos:</span>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            <button
              onClick={handleCopyAllSelectedLinks}
              className="bg-[#0A0C10] hover:bg-[#15181E] text-amber-400 border border-amber-500/30 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Links</span>
            </button>

            <button
              onClick={() => setIsContactSendModalOpen(true)}
              className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-4 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar via WhatsApp</span>
            </button>

            <button
              onClick={handleDeleteSelected}
              className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Escolhidos</span>
            </button>

            <button
              onClick={() => setSelectedCardIds([])}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 underline font-mono"
            >
              Limpar Seleção
            </button>
          </div>
        </div>
      )}

      {/* MAIN SELECTION GRID */}
      {filteredCards.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-[#1F2229] rounded-xl space-y-4 bg-[#15181E]">
          <ImageIcon className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-sm font-semibold text-gray-300">Nenhum card encontrado</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchTerm || activeCategoryFilter !== 'Todos'
              ? 'Tente mudar o filtro de categoria ou a busca acima.'
              : 'Clique em "Adicionar Card" para incluir imagens na sua grade de escolha.'}
          </p>
        </div>
      ) : (
        <div className={
          cardLayout === 'compact'
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
            : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        }>
          {filteredCards.map((card) => {
            const isSelected = selectedCardIds.includes(card.id);
            const isCopied = copiedId === card.id;
            const dupInfo = getDuplicateInfo(card);

            return (
              <div
                key={card.id}
                className={`relative rounded-xl overflow-hidden transition-all flex flex-col group cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1C1E26] border-[#A88B4B] shadow-2xl shadow-[#A88B4B]/20 ring-2 ring-[#A88B4B]'
                    : dupInfo.isDuplicate
                    ? 'bg-[#15181E] border-amber-600/70 hover:border-amber-400'
                    : 'bg-[#15181E] border-[#1F2229] hover:border-[#A88B4B]/50'
                }`}
                onClick={() => handleToggleSelectCard(card.id)}
              >
                {/* Image Thumbnail Container */}
                <div className="relative h-48 bg-[#0A0C10] overflow-hidden">
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      isSelected ? 'scale-105 filter brightness-105' : 'group-hover:scale-105'
                    }`}
                  />

                  {/* Selection Checkbox Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center space-x-1.5">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center border shadow-lg transition-all ${
                        isSelected
                          ? 'bg-[#A88B4B] border-[#A88B4B] text-[#0A0C10]'
                          : 'bg-[#0A0C10]/80 border-gray-600 text-transparent hover:border-white'
                      }`}
                    >
                      <Check className="w-4 h-4 font-black" />
                    </div>
                    {isSelected && (
                      <span className="bg-[#A88B4B] text-[#0A0C10] text-[9px] font-black uppercase px-2 py-0.5 rounded shadow tracking-wider">
                        ESCOLHIDO
                      </span>
                    )}
                  </div>

                  {/* Category Pill & Duplicate Badge */}
                  <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end space-y-1">
                    <div className="bg-[#0A0C10]/80 backdrop-blur-sm text-[#A88B4B] border border-[#A88B4B]/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                      {card.category}
                    </div>
                    {dupInfo.isDuplicate && (
                      <div 
                        className="bg-amber-500 text-[#0A0C10] font-black text-[9px] px-2 py-0.5 rounded-md shadow-lg border border-amber-300 flex items-center space-x-1 uppercase tracking-tight"
                        title={dupInfo.label}
                      >
                        <AlertTriangle className="w-3 h-3 text-[#0A0C10] fill-[#0A0C10]" />
                        <span>DUPLICADO ({dupInfo.count}x)</span>
                      </div>
                    )}
                  </div>

                  {/* Preview / Magnifying Glass Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewZoom(1);
                      setPreviewModalCard(card);
                    }}
                    className="absolute bottom-2 right-2 bg-[#A88B4B] text-[#0A0C10] font-bold text-[10px] px-2.5 py-1 rounded-md shadow-lg flex items-center space-x-1 border border-[#C5A968] hover:bg-[#C5A968] transition-all z-10"
                    title="Usar Lupa / Ver Imagem por Inteiro"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Lupa</span>
                  </button>
                </div>

                {/* Card Title & Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className={`text-sm font-bold line-clamp-1 ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                      {card.title}
                    </h4>
                    <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                      Cadastrado em {card.createdAt}
                    </span>

                    {dupInfo.isDuplicate && (
                      <div className="mt-2 inline-flex items-center space-x-1 text-[10px] font-bold text-amber-300 bg-amber-950/70 border border-amber-700/80 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{dupInfo.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Individual Action Buttons */}
                  <div 
                    className="flex items-center justify-between pt-3 border-t border-[#1F2229] gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSelectCard(card.id)}
                      className={`flex-1 py-1.5 px-2 rounded border text-[11px] font-bold uppercase tracking-wider flex items-center justify-center space-x-1 transition-all ${
                        isSelected
                          ? 'bg-[#A88B4B] text-[#0A0C10] border-[#A88B4B]'
                          : 'bg-[#0A0C10] text-gray-300 border-[#1F2229] hover:border-[#A88B4B] hover:text-[#A88B4B]'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{isSelected ? 'Escolhido' : 'Escolher'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingCard(card)}
                      className="p-1.5 bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-[#A88B4B] text-gray-300 hover:text-[#A88B4B] rounded transition-all"
                      title="Editar Card"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPreviewZoom(1);
                        setPreviewModalCard(card);
                      }}
                      className="p-1.5 bg-[#0A0C10] hover:bg-amber-950/70 border border-[#1F2229] hover:border-amber-500 text-amber-400 rounded transition-all"
                      title="Usar Lupa (Ver por Inteiro)"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareSingleCard(card)}
                      className="p-1.5 bg-[#0A0C10] hover:bg-emerald-950/70 border border-[#1F2229] hover:border-emerald-500 text-emerald-400 rounded transition-all"
                      title="Enviar Foto para WhatsApp (Copia Foto + Abre WhatsApp)"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyImagePhoto(card)}
                      className={`p-1.5 rounded border text-xs transition-all ${
                        isCopied 
                          ? 'bg-emerald-500 text-white border-emerald-500' 
                          : 'bg-[#0A0C10] text-gray-300 border-[#1F2229] hover:border-[#A88B4B] hover:text-[#A88B4B]'
                      }`}
                      title="Copiar Foto para Área de Transferência (Ctrl+V no WhatsApp)"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <a
                      href={card.imageUrl}
                      download={`${card.title.toLowerCase().replace(/\s+/g, '_')}.png`}
                      className="p-1.5 bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-[#A88B4B] text-gray-300 hover:text-[#A88B4B] rounded transition-all"
                      title="Baixar Foto no Computador"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 bg-[#0A0C10] hover:bg-red-500/20 border border-[#1F2229] hover:border-red-500 text-gray-500 hover:text-red-400 rounded transition-all"
                      title="Excluir Card"
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

      {/* Modal to Edit Card */}
      {editingCard && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2229] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-[#A88B4B]" />
                <span>Editar Card</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Título do Card:
                </label>
                <input
                  type="text"
                  value={editingCard.title}
                  onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Categoria:
                </label>
                <input
                  type="text"
                  value={editingCard.category}
                  onChange={(e) => setEditingCard({ ...editingCard, category: e.target.value })}
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Link / URL da Imagem:
                </label>
                <input
                  type="text"
                  value={editingCard.imageUrl}
                  onChange={(e) => setEditingCard({ ...editingCard, imageUrl: e.target.value })}
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1F2229]">
              <button
                type="button"
                onClick={() => {
                  if (safeConfirm('Deseja realmente cancelar?')) {
                    setEditingCard(null);
                  }
                }}
                className="px-4 py-2 rounded text-gray-400 text-xs font-medium uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-5 py-2 rounded font-bold text-xs uppercase tracking-widest flex items-center space-x-1.5 shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Send Selected Cards to Contact via WhatsApp */}
      {isContactSendModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2229] pb-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Send className="w-5 h-5 text-[#A88B4B]" />
                <span>Enviar {selectedCardIds.length} Card(s) Escolhido(s)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsContactSendModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Escolha um contato da sua agenda para abrir o WhatsApp com os links e títulos dos cards selecionados:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Selecione da Agenda:
                </label>
                <select
                  value={targetPhone}
                  onChange={(e) => {
                    setTargetPhone(e.target.value);
                    const found = savedContacts.find(c => c.phone === e.target.value);
                    if (found) setTargetContactName(found.name);
                  }}
                  className="w-full bg-[#0A0C10] border border-[#1F2229] text-gray-200 text-xs rounded p-2.5 focus:outline-none focus:border-[#A88B4B]"
                >
                  <option value="">-- Escolha um contato --</option>
                  {savedContacts.map(c => (
                    <option key={c.id} value={c.phone}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  OU Digite o Telefone do Destinatário:
                </label>
                <input
                  type="text"
                  placeholder="Ex: 5511999998888"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  className="w-full bg-[#0A0C10] border border-[#1F2229] rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#A88B4B]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1F2229]">
              <button
                type="button"
                onClick={() => {
                  if (safeConfirm('Deseja realmente cancelar?')) {
                    setIsContactSendModalOpen(false);
                  }
                }}
                className="px-4 py-2 rounded text-gray-400 text-xs font-medium uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!targetPhone.trim()}
                onClick={() => handleSendSelectedToContact(targetPhone)}
                className="bg-[#A88B4B] hover:bg-[#C5A968] disabled:opacity-50 text-[#0A0C10] px-5 py-2 rounded font-bold text-xs uppercase tracking-widest flex items-center space-x-1.5 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Abrir WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalCard && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewModalCard(null)}>
          <div className="bg-[#15181E] border border-[#2A2D35] rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F2229] pb-3 shrink-0 relative z-10 bg-[#15181E] gap-3">
              <div className="flex items-center space-x-2 w-full sm:w-auto overflow-hidden">
                <Search className="w-5 h-5 text-[#A88B4B] shrink-0" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider truncate">
                  {previewModalCard.title} — Lupa
                </h3>
              </div>
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-2">
                <div className="flex items-center bg-[#0A0C10] border border-[#1F2229] rounded p-1 space-x-1">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.25))}
                    className="p-1 text-gray-300 hover:text-white hover:bg-[#15181E] rounded"
                    title="Diminuir Zoom"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-amber-400 font-mono px-2 font-bold">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(Math.min(3, previewZoom + 0.25))}
                    className="p-1 text-gray-300 hover:text-white hover:bg-[#15181E] rounded"
                    title="Aumentar Zoom (Lupa)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(1)}
                    className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5 border-l border-[#1F2229]"
                  >
                    Reset
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewModalCard(null)}
                  className="text-gray-400 hover:text-white p-1 bg-[#0A0C10] rounded border border-[#1F2229]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-[#0A0C10] p-4 rounded-xl flex items-center justify-center overflow-auto flex-1 min-h-[400px] relative">
              <img
                src={previewModalCard.imageUrl}
                alt={previewModalCard.title}
                style={{ transform: `scale(${previewZoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
                className="max-h-[70vh] object-contain rounded-lg shadow-2xl cursor-zoom-in"
                onClick={() => setPreviewZoom(previewZoom === 1 ? 1.75 : 1)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 shrink-0 border-t border-[#1F2229] relative z-10 bg-[#15181E] gap-3">
              <span className="text-[11px] text-gray-400 text-center sm:text-left leading-tight">
                💡 Dica: Clique na imagem para zoom.
              </span>
              <div className="flex space-x-2 justify-center sm:justify-end w-full sm:w-auto">
                <a
                  href={previewModalCard.imageUrl}
                  download={`${previewModalCard.title.toLowerCase().replace(/\s+/g, '_')}.png`}
                  className="bg-[#A88B4B] hover:bg-[#C5A968] text-[#0A0C10] px-4 py-2 rounded font-bold text-xs uppercase tracking-widest flex items-center space-x-2 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Imagem</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
