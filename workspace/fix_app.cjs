const fs = require('fs');
const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

// Remove DailyLimitWidget
const dailyLimitRegex = /\{\/\*\s*Daily Message Limit Widget[^\}]*?\}\s*<DailyLimitWidget[\s\S]*?\/>/;
if (dailyLimitRegex.test(code)) {
    code = code.replace(dailyLimitRegex, '');
    console.log("Removed DailyLimitWidget correctly.");
} else {
    console.log("Failed to remove DailyLimitWidget.");
}

fs.writeFileSync(path, code);
