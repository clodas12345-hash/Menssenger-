import re

with open("src/components/DispatcherModal.tsx", "r") as f:
    content = f.read()

# Replace the "★ CHIP ATUAL" with "{`CHIP ${displayName.toUpperCase()}`}"
content = content.replace("★ CHIP ATUAL", "{`CHIP ${displayName.toUpperCase()}`}")

# Remove the auxiliary options "REABRIR WHATSAPP" and "JÁ ENVIADO"
aux_pattern = r"\{/\* Auxiliary options: Reopen and Already Sent \*/\}.*?</button>\s*</div>"
content = re.sub(aux_pattern, "", content, flags=re.DOTALL)

# Replace Adiar options
old_adiar = """                <button
                  onClick={() => handlePostponeMinutes(60)}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5" /> Adiar +1 Hora
                </button>
                <button
                  onClick={() => handlePostponeMinutes(180)}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5" /> Adiar +3 Horas
                </button>
                <button
                  onClick={handlePostponeTomorrowMorning}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-[#221A0F] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5" /> Adiar p/ Amanhã (08h)
                </button>"""

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
                </button>"""

content = content.replace(old_adiar, new_adiar)

with open("src/components/DispatcherModal.tsx", "w") as f:
    f.write(content)
print("Patched successfully")
