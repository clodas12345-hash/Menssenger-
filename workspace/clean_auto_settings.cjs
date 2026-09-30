const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const intervalRegex = /<div>\s*<label className="block text-\[10px\] font-semibold text-gray-400 uppercase tracking-widest mb-1">\s*Intervalo Padrão entre Envios \(Segundos\)[\s\S]*?<\/div>/m;
if (intervalRegex.test(code)) {
    code = code.replace(intervalRegex, '');
    console.log("Removed interval setting from SettingsModal");
}
fs.writeFileSync('src/components/SettingsModal.tsx', code);
