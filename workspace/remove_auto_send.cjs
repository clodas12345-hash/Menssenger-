const fs = require('fs');
const path = 'src/components/DispatcherModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove isRunningAuto state
code = code.replace(/const \[isRunningAuto, setIsRunningAuto\] = useState\(false\);\n/, '');

// 2. Remove the Play/Pause button for auto-send
const buttonRegex = /<button[\s\S]*?onClick=\{\(\) => setIsRunningAuto\(!isRunningAuto\)\}[\s\S]*?<\/button>/m;
if (buttonRegex.test(code)) {
    code = code.replace(buttonRegex, '');
    console.log("Removed auto-send button");
}

// 3. Remove popup alert related to auto-send
const alertRegex = /if \(!newWindow && isRunningAuto\) \{[\s\S]*?return;\n\s*\}/m;
if (alertRegex.test(code)) {
    code = code.replace(alertRegex, '');
    console.log("Removed popup alert logic");
}

fs.writeFileSync(path, code);
