import { getDataSource } from './lib/db/data-source';
import { BranchesService } from './lib/services/branches.service';

async function main() {
  try {
    const ds = await getDataSource();
    const service = new BranchesService();
    const branch = await service.create({
      name: 'Central Warehouse Test',
      code: 'WH-TEST',
      type: 'WAREHOUSE' as any,
    }, 'user-uuid', '127.0.0.1');
    console.log('Created:', branch);
  } catch (e) {
    console.error('Failed:', e);
  }
}

main();
