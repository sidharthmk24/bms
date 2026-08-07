const fs = require('fs');
let content = fs.readFileSync('tests/flows/flows.test.ts', 'utf8');
content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('tests/flows/flows.test.ts', content);
