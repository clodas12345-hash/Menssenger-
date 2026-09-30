import React, { useState } from 'react';
import { X, Plus, Trash2, Tag, Check, AlertCircle, Pencil } from 'lucide-react';
import { ContactGroup } from '../types';

interface ManageGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: ContactGroup[];
  onAddGroup: (name: string, color: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroup: (groupId: string, newName: string, color: string) => void;
  contactCounts: Record<string, number>;
}

export const ManageGroupsModal: React.FC<ManageGroupsModalProps> = ({
  isOpen,
  onClose,
  groups,
  onAddGroup,
  onDeleteGroup,
  onUpdateGroup,
  contactCounts
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState('bg-blue-600');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  
  if (!isOpen) return null;

  const colors = [
    'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 
    'bg-indigo-600', 'bg-purple-600', 'bg-pink-600', 'bg-slate-600',
    'bg-orange-600', 'bg-cyan-600'
  ];

  const handleAdd = () => {
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim(), selectedColor);
    setNewGroupName('');
  };

  const startEdit = (group: ContactGroup) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditColor(group.color || 'bg-blue-600');
  };

  const saveEdit = (groupId: string) => {
    if (!editName.trim()) return;
    onUpdateGroup(groupId, editName.trim(), editColor);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121215] border border-[#262629] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#262629] flex items-center justify-between bg-gradient-to-r from-[#121215] to-[#1a1a1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#A88B4B]/20 flex items-center justify-center">
              <Tag className="w-5 h-5 text-[#A88B4B]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Gerenciar Categorias</h2>
              <p className="text-xs text-gray-400 mt-0.5">Adicione, edite ou remova grupos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#1C1C20] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Add New Group */}
          <div className="space-y-3 bg-[#161619] p-4 rounded-2xl border border-[#262629]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nova Categoria</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: Novos Leads, VIP, etc."
                className="flex-1 bg-[#0A0A0C] border border-[#262629] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#A88B4B] transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <button
                onClick={handleAdd}
                disabled={!newGroupName.trim()}
                className="bg-[#A88B4B] hover:bg-[#C5A968] disabled:opacity-50 disabled:hover:bg-[#A88B4B] text-black font-bold px-4 rounded-xl transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full ${color} border-2 ${selectedColor === color ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'} transition-all`}
                />
              ))}
            </div>
          </div>

          {/* List Groups */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Categorias Atuais ({groups.length})</label>
            <div className="space-y-2">
              {groups.map((group) => {
                const count = contactCounts[group.name.toLowerCase()] || 0;
                const isCore = ['agenda de contatos', 'geral', 'sem campanha'].includes(group.name.toLowerCase());
                const isEditing = editingId === group.id;
                
                return (
                  <div 
                    key={group.id} 
                    className={`flex flex-col p-3 rounded-xl bg-[#161619] border transition-colors ${isEditing ? 'border-[#A88B4B]' : 'border-[#262629] hover:border-[#333338]'}`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 bg-[#0A0A0C] border border-[#333338] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#A88B4B]"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(group.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-[#262629] hover:bg-[#333338] text-white p-2 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {colors.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditColor(color)}
                              className={`w-5 h-5 rounded-full ${color} border-2 ${editColor === color ? 'border-white' : 'border-transparent opacity-60'}`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${group.color || 'bg-slate-500'}`} />
                          <div>
                            <p className="text-sm font-medium text-white">{group.name}</p>
                            <p className="text-[10px] text-gray-500">{count} {count === 1 ? 'contato' : 'contatos'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {deletingId === group.id ? (
                            <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/50 p-1.5 rounded-xl animate-in fade-in duration-200">
                              <span className="text-xs font-black text-red-200 uppercase px-1">Excluir?</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(null);
                                }}
                                className="px-3 py-1.5 min-h-[36px] bg-[#121215] hover:bg-[#1C1C20] text-gray-200 rounded-lg text-xs font-bold transition-all border border-[#333338] active:scale-95 cursor-pointer"
                              >
                                Não
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteGroup(group.id);
                                  setDeletingId(null);
                                }}
                                className="px-4 py-1.5 min-h-[36px] bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-extrabold transition-all shadow-lg shadow-red-600/40 active:scale-95 cursor-pointer"
                              >
                                Sim
                              </button>
                            </div>
                          ) : (
                            <>
                              {!isCore && (
                                <>
                                  <button
                                    onClick={() => startEdit(group)}
                                    className="p-2.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all min-w-[42px] min-h-[42px] flex items-center justify-center cursor-pointer"
                                    title="Editar Categoria"
                                  >
                                    <Pencil className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingId(group.id)}
                                    className="p-2.5 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 rounded-xl transition-all min-w-[42px] min-h-[42px] flex items-center justify-center border border-red-500/20 shadow-sm active:scale-95 cursor-pointer"
                                    title="Excluir Categoria"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                </>
                              )}
                              {isCore && (
                                <span className="text-[10px] text-gray-600 font-bold uppercase mr-2">Sistema</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Ao excluir uma categoria, os contatos não são apagados. Eles são movidos automaticamente para a <strong>Agenda de Contatos</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#161619] border-t border-[#262629] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#262629] hover:bg-[#333338] text-white font-bold text-sm transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
