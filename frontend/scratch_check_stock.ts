import { getDataSource } from './lib/db/data-source';

async function main() {
  const ds = await getDataSource();
  
  const movements = await ds.manager.query('SELECT * FROM stock_movement ORDER BY created_at DESC LIMIT 5');
  console.log('Recent Movements:', movements);
  
  const stocks = await ds.manager.query('SELECT * FROM central_stock ORDER BY updated_at DESC LIMIT 5');
  console.log('Recent Central Stock updates:', stocks);
}

main().catch(console.error).finally(() => process.exit(0));
