const fs = require('fs');
let code = fs.readFileSync('src/components/NewCampaignView.tsx', 'utf8');

const intervalUIRegex = /<div>\s*<label className="block text-\[10px\] font-semibold text-gray-400 uppercase tracking-widest mb-2">Intervalo \(seg\):<\/label>\s*<input[\s\S]*?onChange=\{\(e\) => setIntervalSeconds\(Number\(e\.target\.value\)\)\}\s*\/>\s*<\/div>/m;
if (intervalUIRegex.test(code)) {
    code = code.replace(intervalUIRegex, '');
    console.log("Removed interval UI block");
} else {
    console.log("Could not find interval UI block");
}

fs.writeFileSync('src/components/NewCampaignView.tsx', code);
