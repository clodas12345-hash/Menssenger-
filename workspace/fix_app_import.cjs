const fs = require('fs');
const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace("import { DailyLimitWidget } from './components/DailyLimitWidget';\n", "");

fs.writeFileSync(path, code);
