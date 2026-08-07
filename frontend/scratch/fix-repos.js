const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '..', 'lib', 'services');
const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(servicesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace ds.getRepository(Entity) with ds.getRepository<Entity>(Entity.name)
  // Ensure we don't replace if it already has <Entity>
  content = content.replace(/ds\.getRepository\(([A-Z][a-zA-Z0-9_]+)\)/g, 'ds.getRepository<$1>($1.name)');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed', file);
}
