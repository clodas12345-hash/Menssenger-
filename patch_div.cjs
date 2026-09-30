const fs = require('fs');
const path = 'src/components/DispatcherModal.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    /<div className="flex gap-2">\s*<\/div>\s*\{\/\* Chip Selector Section \*\/\}/m,
    `        </div>
        {/* Chip Selector Section */}`
);

fs.writeFileSync(path, code);
