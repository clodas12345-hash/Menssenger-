const fs = require('fs');
const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /if \(scheduledTime <= now && !autoOpenedCampaignsRef.current.has\(camp.id\)\) \{/g;
if (regex.test(code)) {
    code = code.replace(regex, `if (scheduledTime <= now + 5 * 60 * 1000 && !autoOpenedCampaignsRef.current.has(camp.id)) {`);
    console.log("Patched popup trigger time.");
} else {
    console.log("Could not find popup trigger time.");
}

const statusUpdateRegex = /if \(scheduledTime <= now\) \{\s*changed = true;\s*return \{ \.\.\.camp, status: 'em_andamento' as const \};\s*\}/g;
if (statusUpdateRegex.test(code)) {
    code = code.replace(statusUpdateRegex, `if (scheduledTime <= now + 5 * 60 * 1000) {\n              changed = true;\n              return { ...camp, status: 'em_andamento' as const };\n            }`);
    console.log("Patched status update time.");
} else {
    console.log("Could not find status update time.");
}

fs.writeFileSync(path, code);
