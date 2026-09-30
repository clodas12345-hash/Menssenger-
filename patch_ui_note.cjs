const fs = require('fs');
const path = 'src/components/DispatcherModal.tsx';
let code = fs.readFileSync(path, 'utf8');

const target = `<button onClick={handleSend} className="w-full bg-[#059669] hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-[11px]">`;

const note = `
                {campaign.cardImageUrl && (
                  <div className="bg-[#A88B4B]/10 border border-[#A88B4B]/30 rounded-lg p-2.5 text-center">
                    <p className="text-[#A88B4B] text-[10px] font-bold">
                      📸 A foto do agendamento será copiada automaticamente.<br/>
                      Cole (Ctrl+V) no WhatsApp antes de enviar!
                    </p>
                  </div>
                )}
`;

if (code.includes(target) && !code.includes("A foto do agendamento")) {
    code = code.replace(target, note + "                " + target);
    console.log("Added UI note for copied image");
}

fs.writeFileSync(path, code);
