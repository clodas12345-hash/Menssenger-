import re

with open("src/components/DispatcherModal.tsx", "r") as f:
    content = f.read()

# I will find the options using regex to be safe
pattern = r"<button[^>]*handlePostponeMinutes\(60\)[^>]*>.*?</button>\s*<button[^>]*handlePostponeMinutes\(180\)[^>]*>.*?</button>\s*<button[^>]*handlePostponeTomorrowMorning[^>]*>.*?</button>"

new_adiar = """<button
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

content = re.sub(pattern, new_adiar, content, flags=re.DOTALL)

with open("src/components/DispatcherModal.tsx", "w") as f:
    f.write(content)
print("Patched dispatcher2")
