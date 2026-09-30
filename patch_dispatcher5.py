with open("src/components/DispatcherModal.tsx", "r") as f:
    lines = f.readlines()

new_adiar = """                <button
                  onClick={() => handlePostponeMinutes(15)}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5" /> Adiar +15 Minutos
                </button>
                <button
                  onClick={() => handlePostponeMinutes(45)}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5" /> Adiar +45 Minutos
                </button>
                <button
                  onClick={() => handlePostponeMinutes(60)}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5" /> Adiar +1 Hora
                </button>
                <button
                  onClick={() => handlePostponeMinutes(24 * 60)}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5" /> Adiar +24 Horas
                </button>
"""

lines = lines[:381] + [new_adiar] + lines[401:]

with open("src/components/DispatcherModal.tsx", "w") as f:
    f.writelines(lines)
