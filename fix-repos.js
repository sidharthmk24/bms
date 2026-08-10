const fs = require('fs');
const path = require('path');
const dir = 'frontend/lib/services';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/getRepository<([A-Za-z]+)>\(["']\1["']\)/g, 'getRepository($1)');
  content = content.replace(/getRepository\(["']([A-Za-z]+)["']\)/g, 'getRepository($1)');
  
  fs.writeFileSync(filePath, content);
});

['frontend/quick-seed.ts', 'frontend/app/api/v1/seed/route.ts'].forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/getRepository\(["']([A-Za-z]+)["']\)/g, 'getRepository($1)');
    fs.writeFileSync(f, content);
  }
});
