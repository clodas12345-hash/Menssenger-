with open("src/components/DispatcherModal.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "onClick={() => handlePostponeMinutes(60)}" in line and not skip:
        # We start skipping
        skip = True
        
        # Add new lines
        new_lines.append('                <button onClick={() => handlePostponeMinutes(15)} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Adiar +15 Minutos</button>\n')
        new_lines.append('                <button onClick={() => handlePostponeMinutes(45)} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Adiar +45 Minutos</button>\n')
        new_lines.append('                <button onClick={() => handlePostponeMinutes(60)} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Adiar +1 Hora</button>\n')
        new_lines.append('                <button onClick={() => handlePostponeMinutes(24 * 60)} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Adiar +24 Horas</button>\n')
        continue
    
    if skip:
        if "Adiar p/ Amanhã" in line:
            # this is the last line of the block, plus the </button>
            pass
        elif "</button>" in line and skip:
            # If we see </button> and we know we've passed the Adiar p/ Amanha, or we just count buttons.
            pass

with open("src/components/DispatcherModal.tsx", "w") as f:
    f.writelines(new_lines)
