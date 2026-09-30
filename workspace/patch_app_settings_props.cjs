const fs = require('fs');
const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

// Remove DailyLimitWidget
const dailyLimitRegex = /\{\/\*\s*Daily Message Limit Widget[\s\S]*?<DailyLimitWidget[\s\S]*?\/>\s*\}/m;
if (dailyLimitRegex.test(code)) {
    code = code.replace(dailyLimitRegex, '');
    console.log("Removed DailyLimitWidget from App.tsx");
}

// Add props to SettingsModal
const settingsModalProps = `<SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={updateSettingsState}
        onOpenSaveAndReset={() => setIsSaveResetModalOpen(true)}
        logs={logs}
        onReportBlocked24h={handleReportWhatsAppBlocked}
        onUnblockWhatsApp={handleUnblockWhatsApp}
      />`;

code = code.replace(/<SettingsModal[\s\S]*?onOpenSaveAndReset[\s\S]*?\/>/, settingsModalProps);

fs.writeFileSync(path, code);
console.log("Updated SettingsModal in App.tsx");
