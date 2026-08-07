const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const newContent = content.replace(/\(\s*([A-Za-z0-9_]+)\.name\s*\)/g, '("$1")');
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Updated', fullPath);
      }
    }
  }
}
replaceInDir('frontend/lib/services');
