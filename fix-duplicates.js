const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('frontend/lib/api-backend');
let totalFixed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Fix { type: 'varchar', type: 'varchar' ... }
  content = content.replace(/type:\s*'varchar',\s*type:\s*'varchar'/g, "type: 'varchar'");
  
  // Fix { type: 'varchar', name: '...', type: 'varchar' ... }
  content = content.replace(/type:\s*'varchar',\s*name:\s*'([^']+)',\s*type:\s*'varchar'/g, "name: '$1', type: 'varchar'");
  
  // Also check for 'enum'
  content = content.replace(/type:\s*'enum',\s*name:\s*'([^']+)',\s*type:\s*'enum'/g, "name: '$1', type: 'enum'");
  content = content.replace(/type:\s*'enum',\s*type:\s*'enum'/g, "type: 'enum'");

  // Also check for 'int' or other types if they exist
  content = content.replace(/type:\s*'int',\s*name:\s*'([^']+)',\s*type:\s*'int'/g, "name: '$1', type: 'int'");

  // General catch-all for duplicate type properties in decorators
  // Match @Column({ ..., type: 'X', ..., type: 'X', ... })
  // We'll just run a regex that captures everything before and after if it's the exact same type:
  // Since regex might be tricky, we'll parse line by line
  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
     let line = lines[i];
     if (line.includes('@Column(')) {
        // Quick string manipulations to remove duplicate `type: 'foo'`
        const typeMatch = line.match(/type:\s*'([^']+)'/g);
        if (typeMatch && typeMatch.length > 1) {
            // keep the first one, remove the others
            let first = true;
            line = line.replace(/type:\s*'([^']+)'(,\s*)?/g, (match) => {
                if (first) {
                    first = false;
                    return match;
                }
                return ''; // remove subsequent
            });
            // fix trailing commas inside the object
            line = line.replace(/,\s*}/g, ' }');
            lines[i] = line;
        }
     }
  }
  content = lines.join('\n');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
    totalFixed++;
  }
}
console.log('Total files fixed:', totalFixed);
