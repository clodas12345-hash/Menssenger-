const fs = require('fs');
const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldCode = `  const dueCampaigns = campaigns.filter((c) => {
    if (c.status === 'agendado' || c.status === 'em_andamento') {
      return new Date(c.scheduledAt).getTime() <= Date.now();
    }
    return false;
  });`;

const newCode = `  const dueCampaigns = campaigns.filter((c) => {
    if (c.status === 'agendado' || c.status === 'em_andamento') {
      // Show as due 5 minutes before the scheduled time
      return new Date(c.scheduledAt).getTime() <= Date.now() + 5 * 60 * 1000;
    }
    return false;
  });`;

if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    console.log("Updated dueCampaigns calculation.");
} else {
    console.log("Could not find dueCampaigns block.");
}

fs.writeFileSync(path, code);
