const fs = require('fs');
const path = 'src/components/DispatcherModal.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldHeader = `        <div className="p-4 border-b border-[#262629] flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-lg border border-[#A88B4B]/40 flex items-center justify-center shrink-0">
               <Send className="w-5 h-5 text-[#A88B4B] transform -rotate-12" />
            </div>
            <div>
              <h2 className="text-[17px] font-serif italic text-white font-semibold leading-tight">{campaign.title || "CG 5/50 SUP"}</h2>
              <p className="text-[11px] text-gray-500 mt-1">{campaign.categoryName || 'Acompanhamento e envio de WhatsApp'}</p>
            </div>
          </div>
                  </div>`;

const newHeader = `        <div className="p-4 border-b border-[#262629] flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-lg border border-[#A88B4B]/40 flex items-center justify-center shrink-0">
                 <Send className="w-5 h-5 text-[#A88B4B] transform -rotate-12" />
              </div>
              <div>
                <h2 className="text-[17px] font-serif italic text-white font-semibold leading-tight">{campaign.title || "CG 5/50 SUP"}</h2>
                <p className="text-[11px] text-gray-500 mt-1">{campaign.categoryName || 'Acompanhamento e envio de WhatsApp'}</p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-white p-1 rounded hover:bg-[#1F2229] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>`;

if (code.includes(oldHeader)) {
    code = code.replace(oldHeader, newHeader);
    console.log("Restored close button in header.");
} else {
    console.log("Could not find header.");
}

fs.writeFileSync(path, code);
